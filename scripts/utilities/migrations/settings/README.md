# Settings migrations

Converts renamed or replaced settings in the settings files of all cameras
(`config/settings_*.json`; `settings.json` is a hard link to the current camera's file).
`install.sh` and `upgrade.sh` (In Place) run them with `run_settings_migrations()`
(see `scripts/migrations.sh`).  `install.sh` also still converts old settings in
`convert_settings_file()`, but "In Place" upgrades only run these migrations.

To add one, create `N.sh`, where `N` is one more than the highest existing number
(the first one is `2.sh`).  It defines one function, `migrate`, which gets the
settings file as `${1}`.  It must:
- only change what still needs changing, so running it again is safe
  (e.g., do nothing if the old setting isn't there);
- update the file **in place** (`cp`, not `mv`), so `settings.json` stays linked;
- return non-zero if it fails.

```bash
#!/bin/bash
# shellcheck disable=SC2034	# "source"d by run_migrations()

# Settings version 2 (v20XX.YY.ZZ): "oldname" was replaced by "newname".

function migrate()
{
	local FILE="${1}"  TEMP="${1}.migrating"

	jq --indent 4 'if has("oldname") then .newname = .oldname | del(.oldname) else . end' \
		"${FILE}" > "${TEMP}" || { rm -f "${TEMP}"; return 1; }
	if [[ "$( jq -S . "${TEMP}" )" != "$( jq -S . "${FILE}" )" ]]; then
		cp "${TEMP}" "${FILE}" || { rm -f "${TEMP}"; return 1; }
	fi
	rm -f "${TEMP}"
	return 0
}
```

The version reached is kept in `config/migrations.json` under `"settings"`.
