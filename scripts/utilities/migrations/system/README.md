# System migrations

One-time changes outside Allsky's configuration files, e.g., copying a file to
`/etc` and restarting a service.  `install.sh` and `upgrade.sh` run them with
`run_system_migrations()` (see `scripts/migrations.sh`).

To add one, create `N.sh`, where `N` is one more than the highest existing number
(the first one is `2.sh`).  It defines one function, `migrate`, which gets no file
(`${1}` is empty).  Like every migration it must only change what still needs
changing, so running it again is safe, and it must return non-zero if it fails.

```bash
#!/bin/bash
# shellcheck disable=SC2034	# "source"d by run_migrations()

# System version 2 (v20XX.YY.ZZ): what it changes and why.

function migrate()
{
	...
	return 0
}
```

The version reached is kept in `config/migrations.json` under `"system"`.
A fresh installation runs all of them, so they must also work on a new Pi.
