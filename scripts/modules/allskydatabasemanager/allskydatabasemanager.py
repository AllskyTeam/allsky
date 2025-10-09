from __future__ import annotations
from typing import Any, Mapping, Sequence, Optional, Union, Iterator
import sqlite3, re, time, logging
from contextlib import contextmanager

try:
    import mysql.connector
    from mysql.connector.connection import MySQLConnection
    from mysql.connector import errorcode as _MYSQL_ERRCODES
except ImportError:
    mysql = None
    MySQLConnection = None
    _MYSQL_ERRCODES = None

ConnType = Union[sqlite3.Connection, "MySQLConnection", None]


class ALLSKYDATABASEMANAGER:
    """
    Unified DB manager supporting SQLite, MySQL, and MariaDB.
    - Named params (:name) or positional params are accepted.
    - Translates MySQL-dialect SQL to SQLite when needed.
    - run_sql() returns a consistent dict with ok/error_code/message.
    - `silent=True` suppresses all logging from this class.
    """

    def __init__(
        self,
        driver: str,
        *,
        db_path: str | None = None,
        timeout: float = 10.0,
        host: str | None = None,
        user: str | None = None,
        password: str | None = None,
        database: str | None = None,
        log_queries: bool = False,
        silent: bool = False,            # <--- NEW
        logger: logging.Logger | None = None,
        retry_attempts: int = 5,
        retry_backoff: float = 0.15,
        autocommit: bool = True,
    ):
        self.driver = driver.lower()
        self.conn: ConnType = None
        self._sqlite_db_path = db_path
        self._sqlite_timeout = timeout
        self._mysql_host = host
        self._mysql_user = user
        self._mysql_password = password
        self._mysql_database = database
        self.log_queries = log_queries
        self.silent = silent             # <--- NEW
        self.logger = logger or logging.getLogger("ALLSKYDATABASEMANAGER")
        if self.silent:
            # Ensure the logger never emits anything from this class
            self.logger.disabled = True
        self.retry_attempts = retry_attempts
        self.retry_backoff = retry_backoff
        self.autocommit = autocommit

    # -------------------------------------------------------------------
    # INTERNAL LOGGING (respects self.silent)
    # -------------------------------------------------------------------
    def _log_safe(self, level: str, msg: str, *args):
        if self.silent:
            return
        fn = getattr(self.logger, level, None)
        if fn:
            fn(msg, *args)

    # -------------------------------------------------------------------
    # CONNECTIONS
    # -------------------------------------------------------------------
    def connect(self) -> ConnType:
        if self.conn:
            return self.conn

        if self.driver == "sqlite":
            # isolation_level=None enables autocommit for sqlite3
            self.conn = sqlite3.connect(
                self._sqlite_db_path,
                timeout=self._sqlite_timeout,
                isolation_level=None if self.autocommit else "",
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
                pass
        else:
            raise ValueError(f"Unsupported driver: {self.driver}")

        return self.conn

    def close(self):
        if self.conn:
            self.conn.close()
            self.conn = None

    def check_connection(self) -> bool:
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
            self._log_safe("error", "DB connection check failed: %s", e)
            return False

    def get_database_type(self) -> str:
        if self.driver == "sqlite":
            return "SQLite3"
        if self.driver == "mysql":
            return "MariaDB" if self._mysql_is_mariadb() else "MySQL"
        return "Unknown"

    # -------------------------------------------------------------------
    # INTERNAL HELPERS
    # -------------------------------------------------------------------
    _named_param_re = re.compile(r":([A-Za-z_][A-Za-z0-9_]*)")

    def _prepare(self, sql: str, params: Union[Mapping[str, Any], Sequence[Any], None]) -> tuple[str, tuple[Any, ...]]:
        """
        Convert :named placeholders into backend-specific syntax.
        Also supports positional '?' params.
        """
        # Normalize any MySQL-style %s to '?' so we can convert deterministically
        sql = sql.replace("%s", "?")

        if isinstance(params, Mapping):
            names = self._named_param_re.findall(sql)
            norm_sql = self._named_param_re.sub("%s" if self.driver == "mysql" else "?", sql)
            ordered = tuple(params.get(n) for n in names)
            return norm_sql, ordered

        if isinstance(params, Sequence) and not isinstance(params, (str, bytes)):
            seq = tuple(params)
            # For MySQL we need %s, SQLite uses '?'
            norm_sql = re.sub(r"\?", "%s", sql) if self.driver == "mysql" else sql
            return norm_sql, seq

        norm_sql = self._named_param_re.sub("%s" if self.driver == "mysql" else "?", sql)
        return norm_sql, tuple()

    def _log_query(self, sql, params, elapsed, op="execute"):
        if self.log_queries and not self.silent:
            self.logger.info("[%s] %s (%.3fs)\nSQL: %s\nParams: %s", self.driver, op, elapsed, sql, params)

    def _should_retry(self, exc: Exception) -> bool:
        return self.driver == "sqlite" and ("locked" in str(exc).lower() or "busy" in str(exc).lower())

    def _run_with_retry(self, cur, fn: str, sql: str, params: tuple[Any, ...]):
        delay = self.retry_backoff
        last_exception = None

        for attempt in range(self.retry_attempts):
            try:
                t0 = time.perf_counter()
                getattr(cur, fn)(sql, params)
                self._log_query(sql, params, time.perf_counter() - t0, fn)
                return cur
            except Exception as e:
                last_exception = e
                if self._should_retry(e) and attempt < self.retry_attempts - 1:
                    self._log_safe(
                        "warning",
                        "Retry %d/%d after transient DB error: %s",
                        attempt + 1, self.retry_attempts, e,
                    )
                    time.sleep(delay)
                    delay *= 2
                    continue
                break

        self._log_safe("error", "Database operation failed after %d attempts: %s", self.retry_attempts, last_exception)
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
        try:
            cur = self.execute("SELECT VERSION()")
            row = cur.fetchone()
            ver = next(iter(row.values())) if isinstance(row, dict) else (row[0] if isinstance(row, (tuple, list)) else str(row))
            return "mariadb" in str(ver).lower()
        except Exception:
            return False

    def _mysql_supports_insert_alias(self) -> bool:
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
        cols = list(data.keys())
        if update_columns is None:
            update_columns = [c for c in cols if c not in unique_keys]

        insert_cols = ", ".join(self._quote_ident(c) for c in cols)
        insert_vals = ", ".join(f":{c}" for c in cols)

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

        if self._mysql_is_mariadb():
            set_clause = ", ".join(
                f"{self._quote_ident(c)}=VALUES({self._quote_ident(c)})" for c in update_columns
            )
            sql = (
                f"INSERT INTO {self._quote_ident(table)} ({insert_cols}) VALUES ({insert_vals}) "
                f"ON DUPLICATE KEY UPDATE {set_clause}"
            )
            return self.execute(sql, data)

        if self._mysql_supports_insert_alias():
            alias = "new"
            set_clause = ", ".join(
                f"{self._quote_ident(c)}={alias}.{self._quote_ident(c)}" for c in update_columns
            )
            sql = (
                f"INSERT INTO {self._quote_ident(table)} ({insert_cols}) VALUES ({insert_vals}) "
                f"AS {alias} ON DUPLICATE KEY UPDATE {set_clause}"
            )
        else:
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
        if not self.conn:
            self.connect()
        if not self.table_exists(table):
            return None
        if self.driver == "sqlite":
            cur = self.execute(f"PRAGMA table_info({self._quote_ident(table)})")
            rows = cur.fetchall()
            return [row["name"] if isinstance(row, dict) else row[1] for row in rows]
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
        if not self.conn:
            self.connect()

        if create_if_missing and not self.table_exists(table):
            self.create_table(table, columns, primary_key=primary_key)
            return list(columns.keys())

        existing = set(self.get_columns(table) or [])
        added: list[str] = []
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

    # -------------------------------------------------------------------
    # ERROR CLASSIFIER (SQLite + MySQL/MariaDB)
    # -------------------------------------------------------------------
    def _classify_sql_error(self, exc: Exception) -> str:
        """
        Returns: 'INVALID_SQL' | 'TABLE_MISSING' | 'OTHER_ERROR'
        """
        msg = str(exc).lower()

        if self.driver == "sqlite":
            if "no such table" in msg:
                return "TABLE_MISSING"
            if "syntax error" in msg or ("near" in msg and "syntax" in msg):
                return "INVALID_SQL"
            return "OTHER_ERROR"

        if self.driver == "mysql":
            errno = getattr(exc, "errno", None)
            if errno is not None and _MYSQL_ERRCODES:
                if errno == _MYSQL_ERRCODES.ER_NO_SUCH_TABLE:
                    return "TABLE_MISSING"
                if errno in (
                    getattr(_MYSQL_ERRCODES, "ER_PARSE_ERROR", -1),
                    getattr(_MYSQL_ERRCODES, "ER_SYNTAX_ERROR", -1),
                ):
                    return "INVALID_SQL"
            # Fallback string checks
            if "doesn't exist" in msg and "table" in msg:
                return "TABLE_MISSING"
            if "you have an error in your sql syntax" in msg or "syntax" in msg:
                return "INVALID_SQL"
            return "OTHER_ERROR"

        return "OTHER_ERROR"

    def list_tables(
        self,
        *,
        schema: Optional[str] = None,
        include_views: bool = False,
        include_system: bool = False,
    ) -> list[str]:
        """
        Return a list of table names available to the current connection.

        Args:
            schema:   (MySQL/MariaDB only) override database/schema to inspect.
                    If None, uses the current database (DATABASE()).
            include_views: include views in the result (False = tables only).
            include_system:
                - SQLite: include internal 'sqlite_%' tables if True (default False).
                - MySQL/MariaDB: no effect (only current schema is queried).

        Returns:
            Sorted list of table (and optionally view) names.
        """
        if not self.conn:
            self.connect()

        # SQLite
        if self.driver == "sqlite":
            kinds = ["'table'"]
            if include_views:
                kinds.append("'view'")
            sql = f"SELECT name FROM sqlite_master WHERE type IN ({', '.join(kinds)})"
            if not include_system:
                sql += " AND name NOT LIKE 'sqlite_%'"
            sql += " ORDER BY name"
            rows = self.fetchall(sql)
            return [r["name"] for r in rows]

        # MySQL / MariaDB
        kinds = ["'BASE TABLE'"]
        if include_views:
            kinds.append("'VIEW'")
        type_clause = f"({', '.join(kinds)})"

        params: dict[str, Any] = {}
        if schema:
            where_schema = "TABLE_SCHEMA = :schema"
            params["schema"] = schema
        else:
            # use the active DB
            where_schema = "TABLE_SCHEMA = DATABASE()"

        sql = (
            "SELECT TABLE_NAME AS name "
            "FROM information_schema.tables "
            f"WHERE TABLE_TYPE IN {type_clause} AND {where_schema} "
            "ORDER BY TABLE_NAME"
        )
        rows = self.fetchall(sql, params or None)
        return [r["name"] for r in rows]


    # -------------------------------------------------------------------
    # run_sql WITH ERROR HANDLING (Works for MySQL & SQLite)
    # -------------------------------------------------------------------
    def run_sql(
        self,
        sql: str,
        params: Union[Mapping[str, Any], Sequence[Any], None] = None,
        *,
        conflict_columns: Optional[Sequence[str]] = None,
    ):
        """
        Execute a MySQL-dialect SQL string on the configured backend.

        Success:
          - SELECT  -> {"ok": True, "type": "select", "rows": [...]}
          - WRITE   -> {
                          "ok": True,
                          "type": "write",
                          "operation": "insert"|"update"|"delete"|"upsert"|"other",
                          "rowcount": int,
                          "lastrowid": int|None
                        }

        Error:
          {"ok": False, "error_code": "INVALID_SQL"|"TABLE_MISSING"|"OTHER_ERROR", "message": str}
        """
        try:
            if not self.conn:
                self.connect()

            translated = self._translate_mysql_sql_for_driver(sql, conflict_columns=conflict_columns)

            # Strip leading comments/whitespace to detect the primary keyword
            cleaned = re.sub(r"^\s*(/\*.*?\*/\s*)*(--[^\n]*\n\s*)*", "", translated, flags=re.S)
            head = cleaned.strip().upper()

            # Detect operation (also handles UPSERT forms)
            if head.startswith("SELECT"):
                rows = self.fetchall(translated, params)
                return {"ok": True, "type": "select", "rows": rows}

            # Determine write operation for consistent response
            if head.startswith("INSERT") or head.startswith("REPLACE"):
                op = "insert"
                # If it's an UPSERT flavor, relabel as upsert
                if "ON DUPLICATE KEY UPDATE" in head or "ON CONFLICT" in head:
                    op = "upsert"
            elif head.startswith("UPDATE"):
                op = "update"
            elif head.startswith("DELETE"):
                op = "delete"
            else:
                # CREATE/ALTER/DROP/etc.
                op = "other"
            
            cur = self.execute(translated, params)
            lastrowid = getattr(cur, "lastrowid", None)
            rowcount = getattr(cur, "rowcount", 0)

            return {
                "ok": True,
                "type": "write",
                "operation": op,         # <- always present for writes
                "rowcount": rowcount,
                "lastrowid": lastrowid,  # <- present for INSERT/UPSERT; None for UPDATE/DELETE
            }

        except Exception as e:
            code = self._classify_sql_error(e)
            self._log_safe("error", "run_sql() failed [%s]: %s\nSQL: %s\nParams: %s", code, e, sql, params)
            return {"ok": False, "error_code": code, "message": str(e)}

    # -------------------------------------------------------------------
    # SQL TRANSLATOR (MySQL → SQLite where needed)
    # -------------------------------------------------------------------
    def _translate_mysql_sql_for_driver(
        self,
        sql: str,
        *,
        conflict_columns: Optional[Sequence[str]] = None,
    ) -> str:
        """Translate a MySQL SQL string for the current backend (no-op on MySQL)."""
        if self.driver == "mysql":
            # Normalize %s → ? so binder can convert back if needed
            return sql.replace("%s", "?")

        # --- SQLite translations ---
        s = sql

        # Replace backticks with double-quotes for identifiers
        s = s.replace("`", '"')

        # Remove table options not supported by SQLite
        s = re.sub(r"\s+ENGINE=\w+\b", "", s, flags=re.I)
        s = re.sub(r"\s+DEFAULT\s+CHARSET=\w+\b", "", s, flags=re.I)
        s = re.sub(r"\s+AUTO_INCREMENT=\d+\b", "", s, flags=re.I)

        # Column-level AUTO_INCREMENT best-effort:
        # turn:  "col" <type> AUTO_INCREMENT  ->  "col" INTEGER PRIMARY KEY AUTOINCREMENT
        def _auto_inc_col(m):
            colname = m.group(1)
            return f'"{colname}" INTEGER PRIMARY KEY AUTOINCREMENT'
        s = re.sub(
            r'"([A-Za-z_][A-Za-z0-9_]*)"\s+[\w()]+\s+AUTO_INCREMENT',
            _auto_inc_col,
            s,
            flags=re.I,
        )

        # Strip UNSIGNED (SQLite ignores it)
        s = re.sub(r"\bUNSIGNED\b", "", s, flags=re.I)

        # Map booleans / tinyint(1) to INTEGER
        s = re.sub(r"\bTINYINT\s*$begin:math:text$\\s*1\\s*$end:math:text$", "INTEGER", s, flags=re.I)
        s = re.sub(r"\bBOOL(EAN)?\b", "INTEGER", s, flags=re.I)

        # Functions
        s = re.sub(r"\bNOW\s*$begin:math:text$\\s*$end:math:text$", "CURRENT_TIMESTAMP", s, flags=re.I)
        s = re.sub(r"\bLAST_INSERT_ID\s*$begin:math:text$\\s*$end:math:text$", "last_insert_rowid()", s, flags=re.I)

        # FROM DUAL (not in SQLite)
        s = re.sub(r"\s+FROM\s+DUAL\b", "", s, flags=re.I)

        # LIMIT offset, count  ->  LIMIT count OFFSET offset
        def _limit_swap(m):
            off = m.group(1)
            cnt = m.group(2)
            return f"LIMIT {cnt} OFFSET {off}"
        s = re.sub(r"\bLIMIT\s+(\d+)\s*,\s*(\d+)\b", _limit_swap, s, flags=re.I)

        # Handle ON DUPLICATE KEY UPDATE → SQLite UPSERT
        s = self._rewrite_mysql_upsert_to_sqlite(s, conflict_columns)

        # Placeholders normalization
        s = s.replace("%s", "?")

        return s

    def _rewrite_mysql_upsert_to_sqlite(
        self,
        sql: str,
        conflict_columns: Optional[Sequence[str]],
    ) -> str:
        """
        Convert:
          INSERT INTO t (c1,c2,...) VALUES (...),(...),... ON DUPLICATE KEY UPDATE cX=VALUES(cX), cY=...
        to:
          INSERT INTO t (c1,c2,...) VALUES (...),(...)
          ON CONFLICT (pk_or_unique_cols) DO UPDATE SET cX=excluded.cX, cY=excluded.cY

        Only applied when we can determine conflict target (via conflict_columns or pragma lookup).
        """
        # Simple parser for single-table INSERT ... ON DUPLICATE KEY UPDATE ...
        pattern = re.compile(
            r'^\s*INSERT\s+INTO\s+("?[A-Za-z_][A-Za-z0-9_]*"?)[\s]*'
            r'$begin:math:text$([^)]*)$end:math:text$\s*VALUES\s*($begin:math:text$[^)]+$end:math:text$(?:\s*,\s*$begin:math:text$[^)]+$end:math:text$)*)\s*'
            r'ON\s+DUPLICATE\s+KEY\s+UPDATE\s+(.+)$',
            re.I | re.S,
        )
        m = pattern.match(sql)
        if not m:
            return sql

        table = m.group(1).strip()
        cols_csv = m.group(2).strip()
        vals_csv = m.group(3).strip()
        updates = m.group(4).strip()

        # Resolve conflict target
        conflict = list(conflict_columns) if conflict_columns else self._infer_primary_key_columns_for_sqlite(table)
        if not conflict:
            # Can't safely translate without conflict target
            return sql

        # Rewrite VALUES(col) -> excluded."col"
        def _values_to_excluded(match):
            col = match.group(1).strip().strip('"')
            return f'excluded."{col}"'

        updates_sqlite = re.sub(
            r'\bVALUES\s*$begin:math:text$\\s*"?(.*?)"?\\s*$end:math:text$',
            _values_to_excluded,
            updates,
            flags=re.I,
        )

        conflict_clause = ", ".join(f'"{c}"' for c in conflict)
        rewritten = (
            f'INSERT INTO {table} ({cols_csv}) VALUES {vals_csv} '
            f'ON CONFLICT ({conflict_clause}) DO UPDATE SET {updates_sqlite}'
        )
        return rewritten

    def _infer_primary_key_columns_for_sqlite(self, quoted_table: str) -> list[str]:
        """Look up PK columns from SQLite schema; returns [] if unknown."""
        table = quoted_table.strip().strip('"')
        try:
            cur = self.execute(f'PRAGMA table_info("{table}")')
            rows = cur.fetchall()
            # rows fields: cid, name, type, notnull, dflt_value, pk
            pk_cols: list[str] = []
            for row in rows:
                name = row["name"] if isinstance(row, dict) else row[1]
                is_pk = row["pk"] if isinstance(row, dict) else row[5]
                if is_pk:
                    pk_cols.append(name)
            return pk_cols
        except Exception:
            return []