from __future__ import annotations
from typing import Any, Mapping, Sequence, Optional, Union, Iterator
import sqlite3, re, time, logging
from contextlib import contextmanager

try:
    import mysql.connector
    from mysql.connector.connection import MySQLConnection
except ImportError:
    mysql = None
    MySQLConnection = None

ConnType = Union[sqlite3.Connection, "MySQLConnection", None]


class ALLSKYDATABASEMANAGER:
    """
    Unified DB manager supporting SQLite, MySQL, and MariaDB.
    Handles:
      - Automatic connection
      - Query execution with retries and named params (:param)
      - Auto table creation and schema synchronization
      - Upsert compatibility (MySQL, MariaDB, SQLite)
    """

    def __init__(self, driver: str, *, db_path: str | None = None, timeout: float = 10.0,
                host: str | None = None, user: str | None = None, password: str | None = None,
                database: str | None = None, log_queries: bool = False,
                logger: logging.Logger | None = None, retry_attempts: int = 5,
                retry_backoff: float = 0.15, autocommit: bool = True):
        self.driver = driver.lower()
        self.conn = None
        self._sqlite_db_path = db_path
        self._sqlite_timeout = timeout
        self._mysql_host = host
        self._mysql_user = user
        self._mysql_password = password
        self._mysql_database = database
        self.log_queries = log_queries
        self.logger = logger or logging.getLogger("ALLSKYDATABASEMANAGER")
        self.retry_attempts = retry_attempts
        self.retry_backoff = retry_backoff
        self.autocommit = autocommit

    # -------------------------------------------------------------------
    # CONNECTIONS
    # -------------------------------------------------------------------
    def connect(self) -> ConnType:
        if self.conn:
            return self.conn

        if self.driver == "sqlite":
            # autocommit when isolation_level=None
            self.conn = sqlite3.connect(
                self._sqlite_db_path,
                timeout=self._sqlite_timeout,
                isolation_level=None if self.autocommit else "",  # "" enables explicit transactions
            )
            self.conn.row_factory = sqlite3.Row
        elif self.driver == "mysql":
            if mysql is None:
                raise ImportError("mysql.connector not installed")
            self.conn = mysql.connector.connect(
                host=self._mysql_host,
                user=self._mysql_user,
                password=self._mysql_password,
                database=self._mysql_database,
            )
            try:
                self.conn.autocommit = bool(self.autocommit)
            except Exception:
                # very old connectors: ignore if not supported
                pass
        else:
            raise ValueError(f"Unsupported driver: {self.driver}")

        return self.conn

    def close(self):
        if self.conn:
            self.conn.close()
            self.conn = None

    def check_connection(self) -> bool:
        """Verify DB connectivity."""
        try:
            if not self.conn:
                self.connect()
            if self.driver == "sqlite":
                self.execute("SELECT 1")
                return True
            elif self.driver == "mysql":
                self.conn.ping(reconnect=True, attempts=1, delay=0)
                return True
            return False
        except Exception as e:
            self.logger.error("DB connection check failed: %s", e)
            return False

    def get_database_type(self) -> str:
        if self.driver == "sqlite":
            return "SQLite3"
        if self.driver == "mysql":
            if self._mysql_is_mariadb():
                return "MariaDB"
            return "MySQL"
        return "Unknown"

    # -------------------------------------------------------------------
    # INTERNAL HELPERS
    # -------------------------------------------------------------------
    _named_param_re = re.compile(r":([A-Za-z_][A-Za-z0-9_]*)")

    def _prepare(self, sql: str, params: Union[Mapping[str, Any], Sequence[Any], None]) -> tuple[str, tuple[Any, ...]]:
        """Convert :named placeholders into backend-specific syntax."""
        if isinstance(params, Mapping):
            names = self._named_param_re.findall(sql)
            norm_sql = self._named_param_re.sub("%s" if self.driver == "mysql" else "?", sql)
            ordered = tuple(params.get(n) for n in names)
            return norm_sql, ordered

        if isinstance(params, Sequence) and not isinstance(params, (str, bytes)):
            seq = tuple(params)
            norm_sql = re.sub(r"\?", "%s", sql) if self.driver == "mysql" else sql
            return norm_sql, seq

        norm_sql = self._named_param_re.sub("%s" if self.driver == "mysql" else "?", sql)
        return norm_sql, tuple()

    def _log(self, sql, params, elapsed, op="execute"):
        if self.log_queries:
            self.logger.info("[%s] %s (%.3fs)\nSQL: %s\nParams: %s", self.driver, op, elapsed, sql, params)

    def _should_retry(self, exc: Exception) -> bool:
        return self.driver == "sqlite" and ("locked" in str(exc).lower() or "busy" in str(exc).lower())

    def _run_with_retry(self, cur, fn: str, sql: str, params: tuple[Any, ...]):
        """Run a cursor operation (execute or executemany) with retry on transient SQLite locks."""
        delay = self.retry_backoff
        last_exception = None

        for attempt in range(self.retry_attempts):
            try:
                t0 = time.perf_counter()
                getattr(cur, fn)(sql, params)
                self._log(sql, params, time.perf_counter() - t0, fn)
                return cur
            except Exception as e:
                last_exception = e
                if self._should_retry(e) and attempt < self.retry_attempts - 1:
                    # transient lock — back off and retry
                    if self.log_queries:
                        self.logger.warning(
                            "Retry %d/%d after transient DB error: %s",
                            attempt + 1,
                            self.retry_attempts,
                            e,
                        )
                    time.sleep(delay)
                    delay *= 2
                    continue
                # Either non-retryable, or retries exhausted — re-raise
                break

        # if we reach here, retries exhausted or fatal error
        self.logger.error("Database operation failed after %d attempts: %s", self.retry_attempts, last_exception)
        raise last_exception

    # -------------------------------------------------------------------
    # EXECUTION
    # -------------------------------------------------------------------
    def execute(self, sql, params=None):
        if not self.conn:
            self.connect()
        sql, ordered = self._prepare(sql, params)
        cur = self.conn.cursor(dictionary=True) if self.driver == "mysql" else self.conn.cursor()
        return self._run_with_retry(cur, "execute", sql, ordered)

    def fetchall(self, sql, params=None) -> list[dict[str, Any]]:
        cur = self.execute(sql, params)
        rows = cur.fetchall()
        return [dict(r) for r in rows] if self.driver == "sqlite" else rows

    def fetchone(self, sql, params=None) -> Optional[dict[str, Any]]:
        cur = self.execute(sql, params)
        row = cur.fetchone()
        return dict(row) if row and self.driver == "sqlite" else row

    def commit(self):
        if self.conn:
            self.conn.commit()

    # -------------------------------------------------------------------
    # BASIC CRUD
    # -------------------------------------------------------------------
    def insert(self, table, data: Mapping[str, Any]):
        cols = list(data.keys())
        placeholders = ", ".join(f":{c}" for c in cols)
        sql = f"INSERT INTO {self._quote_ident(table)} ({', '.join(self._quote_ident(c) for c in cols)}) VALUES ({placeholders})"
        return self.execute(sql, data)

    def update(self, table, data: Mapping[str, Any], where: Mapping[str, Any]) -> int:
        set_clause = ", ".join(f"{self._quote_ident(k)} = :set_{k}" for k in data)
        where_clause = " AND ".join(f"{self._quote_ident(k)} = :where_{k}" for k in where)
        sql = f"UPDATE {self._quote_ident(table)} SET {set_clause} WHERE {where_clause}"
        params = {f"set_{k}": v for k, v in data.items()}
        params.update({f"where_{k}": v for k, v in where.items()})
        cur = self.execute(sql, params)
        return getattr(cur, "rowcount", 0)

    def delete(self, table, where: Mapping[str, Any]) -> int:
        where_clause = " AND ".join(f"{self._quote_ident(k)} = :{k}" for k in where)
        sql = f"DELETE FROM {self._quote_ident(table)} WHERE {where_clause}"
        cur = self.execute(sql, where)
        return getattr(cur, "rowcount", 0)

    # -------------------------------------------------------------------
    # UPSERT (MySQL, MariaDB, SQLite)
    # -------------------------------------------------------------------
    def _mysql_is_mariadb(self) -> bool:
        """Detect MariaDB server."""
        try:
            cur = self.execute("SELECT VERSION()")
            row = cur.fetchone()
            if isinstance(row, dict):
                ver = next(iter(row.values()))
            elif isinstance(row, (tuple, list)):
                ver = row[0]
            else:
                ver = str(row)
            return "mariadb" in str(ver).lower()
        except Exception:
            return False

    def _mysql_supports_insert_alias(self) -> bool:
        """Detect MySQL ≥ 8.0.20 (supports INSERT ... AS alias ... ON DUPLICATE KEY UPDATE)."""
        try:
            info = getattr(self.conn, "get_server_info", None)
            ver = str(info()) if info else ""
            if "mariadb" in ver.lower():
                return False
            parts = ver.split(".")
            major, minor = int(parts[0]), int(parts[1])
            return (major > 8) or (major == 8 and minor >= 20)
        except Exception:
            return False

    def upsert(
        self,
        table: str,
        data: Mapping[str, Any],
        unique_keys: Sequence[str],
        update_columns: Optional[Sequence[str]] = None,
    ):
        # columns to insert
        cols = list(data.keys())
        if update_columns is None:
            update_columns = [c for c in cols if c not in unique_keys]

        insert_cols = ", ".join(self._quote_ident(c) for c in cols)
        insert_vals = ", ".join(f":{c}" for c in cols)

        # SQLite path
        if self.driver == "sqlite":
            conflict_cols = ", ".join(self._quote_ident(c) for c in unique_keys)
            set_clause = ", ".join(
                f"{self._quote_ident(c)}=excluded.{self._quote_ident(c)}" for c in update_columns
            )
            sql = (
                f"INSERT INTO {self._quote_ident(table)} ({insert_cols}) VALUES ({insert_vals}) "
                f"ON CONFLICT({conflict_cols}) DO UPDATE SET {set_clause}"
            )
            return self.execute(sql, data)

        # MySQL / MariaDB path
        if self._mysql_is_mariadb():
            # MariaDB: use VALUES() form
            set_clause = ", ".join(
                f"{self._quote_ident(c)}=VALUES({self._quote_ident(c)})" for c in update_columns
            )
            sql = (
                f"INSERT INTO {self._quote_ident(table)} ({insert_cols}) VALUES ({insert_vals}) "
                f"ON DUPLICATE KEY UPDATE {set_clause}"
            )
            return self.execute(sql, data)

        # MySQL server
        if self._mysql_supports_insert_alias():
            # MySQL ≥ 8.0.20: alias form (VALUES() is deprecated there)
            alias = "new"
            set_clause = ", ".join(
                f"{self._quote_ident(c)}={alias}.{self._quote_ident(c)}" for c in update_columns
            )
            sql = (
                f"INSERT INTO {self._quote_ident(table)} ({insert_cols}) VALUES ({insert_vals}) "
                f"AS {alias} ON DUPLICATE KEY UPDATE {set_clause}"
            )
        else:
            # MySQL 5.7 / early 8.0: VALUES() form
            set_clause = ", ".join(
                f"{self._quote_ident(c)}=VALUES({self._quote_ident(c)})" for c in update_columns
            )
            sql = (
                f"INSERT INTO {self._quote_ident(table)} ({insert_cols}) VALUES ({insert_vals}) "
                f"ON DUPLICATE KEY UPDATE {set_clause}"
            )
        return self.execute(sql, data)

    # -------------------------------------------------------------------
    # SCHEMA HELPERS
    # -------------------------------------------------------------------
    def _quote_ident(self, name: str) -> str:
        if not re.match(r"^[A-Za-z_][A-Za-z0-9_]*$", name):
            raise ValueError(f"Invalid identifier: {name}")
        return f"`{name}`" if self.driver == "mysql" else f'"{name}"'

    def table_exists(self, table: str) -> bool:
        if not self.conn:
            self.connect()
        if self.driver == "sqlite":
            row = self.fetchone("SELECT name FROM sqlite_master WHERE type='table' AND name=:t", {"t": table})
            return row is not None
        row = self.fetchone("SHOW TABLES LIKE :t", {"t": table})
        return row is not None

    def get_columns(self, table: str) -> Optional[list[str]]:
        """Return list of column names, or None if table doesn't exist."""
        if not self.conn:
            self.connect()
        if not self.table_exists(table):
            return None
        if self.driver == "sqlite":
            cur = self.execute(f"PRAGMA table_info({self._quote_ident(table)})")
            rows = cur.fetchall()
            return [row["name"] if isinstance(row, dict) else row[1] for row in rows]
        else:
            cur = self.execute(f"SHOW COLUMNS FROM {self._quote_ident(table)}")
            rows = cur.fetchall()
            return [row["Field"] for row in rows]

    def ensure_columns(
        self,
        table: str,
        columns: dict[str, str],
        *,
        create_if_missing=True,
        primary_key: Optional[Sequence[str]] = None,
        auto_commit=True,
    ) -> list[str]:
        """Ensure table exists with all columns; create or alter as needed."""
        if not self.conn:
            self.connect()

        # create if missing
        if create_if_missing and not self.table_exists(table):
            self.create_table(table, columns, primary_key=primary_key)
            return list(columns.keys())

        existing = set(self.get_columns(table) or [])
        added = []
        q_table = self._quote_ident(table)
        for name, col_type in columns.items():
            if name in existing:
                continue
            sql = f"ALTER TABLE {q_table} ADD COLUMN {self._quote_ident(name)} {col_type}"
            self.execute(sql)
            added.append(name)
        if auto_commit and added:
            self.commit()
        return added

    def create_table(
        self,
        table: str,
        columns: dict[str, str],
        *,
        primary_key: Optional[Sequence[str]] = None,
        if_not_exists=True,
    ):
        if not self.conn:
            self.connect()
        col_defs = [f"{self._quote_ident(k)} {v}" for k, v in columns.items()]
        pk = ""
        if primary_key:
            pk_cols = ", ".join(self._quote_ident(c) for c in primary_key)
            pk = f", PRIMARY KEY ({pk_cols})"
        ine = "IF NOT EXISTS " if if_not_exists else ""
        sql = f"CREATE TABLE {ine}{self._quote_ident(table)} ({', '.join(col_defs)}{pk})"
        self.execute(sql)
        self.commit()

    # -------------------------------------------------------------------
    # TRANSACTION
    # -------------------------------------------------------------------
    @contextmanager
    def transaction(self) -> Iterator[None]:
        if not self.conn:
            self.connect()
        try:
            yield
            self.commit()
        except Exception:
            if self.conn:
                self.conn.rollback()
            raise