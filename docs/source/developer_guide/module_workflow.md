# Module Workflow

This page describes the recommended workflow for creating a new Allsky module, packaging it for the `allsky-modules` repository, and testing the package manager installation before opening a pull request.

The important idea is to develop the module where Allsky can run it, then package that working module into the same folder structure that the module installer expects.

## 1. Develop The Module In Allsky

Start by developing and testing the module inside an Allsky installation. This gives you the fastest feedback because the module can be added to real flows, run by the Module Manager, and tested with the same environment that users will have.

Extra modules are loaded from:

```text
~/allsky/config/myfiles/modules
```

For a module called `allsky_your_module`, create:

```text
~/allsky/config/myfiles/modules/allsky_your_module.py
```

If the module needs support files during development, keep them under module data folders that match the installed layout:

```text
~/allsky/config/myfiles/modules/moduledata/
├── blocks/allsky_your_module/
├── charts/allsky_your_module/
├── data/allsky_your_module/
├── info/allsky_your_module/
└── logfiles/allsky_your_module/
```

Use the existing developer guide pages while building the module:

- [Module Structure](module_structure.md){ target="_blank" rel="noopener" .external }
- [The meta_data Structure](meta_data_structure.md){ target="_blank" rel="noopener" .external }
- [Available Fields](available_fields.md){ target="_blank" rel="noopener" .external }
- [Dependencies](dependencies.md){ target="_blank" rel="noopener" .external }
- [Charts](charts.md){ target="_blank" rel="noopener" .external }
- [Blocks](blocks.md){ target="_blank" rel="noopener" .external }

At this stage, concentrate on behavior rather than packaging. Check that the module:

- has an `allsky_` filename,
- has a matching module name in `meta_data`,
- exposes the expected run function,
- returns a useful result string,
- logs useful debug information,
- uses sensible default settings,
- handles missing hardware, missing files, missing credentials, or failed network calls cleanly,
- cleans up extra data if it creates any.

Test the module from the Module Manager by adding it to the relevant flow and using the module test button where possible. If the module writes extra data, confirm the variables appear where expected. If it writes database data, confirm the table and purge configuration are correct.

## 2. Fork `allsky-modules` And Create A Branch

When the module works inside Allsky, use GitHub to fork the `AllskyTeam/allsky-modules` repository.

In your fork on GitHub, create a branch for the module from the upstream `master` branch. New module work should normally use a branch name such as `module/allsky_your_module`.

Then clone that branch on your development machine:

```bash
git clone --branch module/allsky_your_module https://github.com/<your-github-user>/allsky-modules.git
cd allsky-modules
```

Keep one module change per branch. This makes review and testing simpler.

## 3. Create The Repository Folder Structure

In your `allsky-modules` checkout, create a top-level folder named after the module. The folder and Python file must use the same `allsky_` name:

```text
allsky_your_module/
├── allsky_your_module.py
├── installer.json
├── README.md
└── manifest.json
```

Only add optional folders when the module needs them:

```text
allsky_your_module/
├── allsky_your_module.py
├── allsky_your_module/
│   └── tools/
│       └── post_install_helper.py
├── blocks/
│   └── your_block.json
├── charts/
│   └── your_chart.json
├── db/
│   └── db_data.json
├── installer.json
├── README.md
└── manifest.json
```

The package manager copies these folders into the user's Allsky installation:

| Repository path | Installed destination |
| --- | --- |
| `allsky_your_module.py` | `~/allsky/config/myfiles/modules/allsky_your_module.py` |
| `blocks/` | `~/allsky/config/myfiles/modules/moduledata/blocks/allsky_your_module/` |
| `charts/` | `~/allsky/config/myfiles/modules/moduledata/charts/allsky_your_module/` |
| `allsky_your_module/` | `~/allsky/config/myfiles/modules/moduledata/data/allsky_your_module/` |
| `README.md` and other info files | `~/allsky/config/myfiles/modules/moduledata/info/allsky_your_module/` |
| `installer.json` and `manifest.json` | `~/allsky/config/myfiles/modules/moduledata/installer/allsky_your_module/` |

Copy the working module code from your Allsky installation into the repository folder. Then add any charts, blocks, database configuration, supporting data files, and documentation that the module needs.

Use `installer.json` for dependencies and post-install actions:

```json
{
    "requirements": [
        "example-python-package"
    ],
    "packages": [
        "example-apt-package"
    ],
    "post-install": {
        "run": "{install_data_dir}/tools/post_install_helper.py"
    }
}
```

If the module has no Python dependencies, apt packages, or post-install action, it can omit `installer.json`; the package manager will create empty installer metadata during installation. If you do include `installer.json`, keep all post-install helper scripts inside the module folder so they can be covered by the manifest.

Do not use `requirements.txt` or `packages.txt` for new modules. Those files are legacy dependency formats.

## 4. Generate The Manifest Checksum

The package manager requires a `manifest.json` file before it will install a module. The manifest records the module name, file list, SHA-256 checksums, file sizes, and file modes.

Generate it from inside the `allsky-modules` repository:

```bash
tools/create-module-manifest.sh allsky_your_module
```

To preview the manifest without writing it:

```bash
tools/create-module-manifest.sh --dry-run allsky_your_module
```

Do not edit `manifest.json` by hand. Regenerate it after any change inside the module folder, including changes to:

- the Python module,
- support files,
- `installer.json`,
- charts,
- blocks,
- database configuration,
- README or documentation files,
- post-install helper scripts.

Before committing, check the folder:

```bash
git status
git diff
```

Then commit and push the branch:

```bash
git add allsky_your_module
git commit -m "Add allsky_your_module module"
git push -u origin module/allsky_your_module
```

## 5. Enable Developer Mode In Allsky

On the Allsky system where you want to test the install, open the WebUI settings and enable developer mode.

Set:

| Setting | Value |
| --- | --- |
| `developermode` | Enabled |
| `developermodulerepo` | Your fork, for example `https://github.com/<your-github-user>/allsky-modules` |
| `developermodulerepobranch` | Your test branch, for example `module/allsky_your_module` |

If `developermodulerepo` is blank, Allsky uses the normal official module repository. If `developermodulerepobranch` is blank, the package manager uses the first branch available in the checked out developer repository. For repeatable testing, set the branch explicitly.

Open the Module Package Manager. The footer should show the developer module repository, highlighted to make it clear that the package manager is not using the official default source.

## 6. Test The Installation

Use the Module Package Manager to install the module from your developer repository and branch.

Test the installation as a user would:

- install the module from the package manager,
- confirm the install completes without manifest, dependency, or post-install errors,
- add the module to the relevant flow,
- open the module settings and confirm all fields render correctly,
- run the module test action where possible,
- run the flow under realistic conditions,
- check any generated variables, charts, blocks, files, logs, or database rows,
- uninstall and reinstall the module to prove the package is complete.

If installation fails with a manifest error, regenerate `manifest.json`, commit it, push the branch, refresh the package manager, and try again.

If the module installs but does not run correctly, fix the module in the repository branch, regenerate the manifest, push the update, then use the package manager to reinstall or update the module.

When the module installs cleanly and works from the Module Manager, open a pull request from your branch to the `AllskyTeam/allsky-modules` `master` branch.
