# CONTRIBUTING

Thank you for your interest in contributing to the Allsky Project.
This document explains how to contribute to the repositories within the AllskyTeam GitHub organisation, including:

- allsky (the core server, backend, UI, and processing pipeline)
- allsky-modules (the official library of Allsky extra modules)

Contributions of all kinds are welcome: bug fixes, new modules, documentation, UI improvements, or backend enhancements.

## 1. Repository Overview

### allsky
Contains core Allsky and core modules.

### allsky-modules
Contains individual processing modules used by Allsky (post-processing, device control, AI tools, weather sensors, ADS-B, MQTT, etc.)

If your contribution affects modules, submit it to allsky-modules.
If your contribution affects the core server, UI, or module runner, submit it to allsky.

## 2. How to Contribute

### Step 1: Fork the repository
Click "Fork" on GitHub, then clone your fork:

```
git clone https://github.com/<your-username>/<repo>.git
cd <repo>
```

### Step 2: Create a branch

```
git checkout -b feature/my-feature
```

### Step 3: Make your changes

### Step 4: Push and open a Pull Request

```
git push origin feature/my-feature
```

## 3. Coding Standards

### Python
- PEP8
- Type hints
- Google-style docstrings

### Bash
Use shellcheck to validate bash scripts

### JavaScript
- ES6+

## 4. Documentation Standards

All new features must update docs under /docs.

Example module README:

```
# Module Name

## Description
...

## Configuration
| Setting | Description | Default |
|--------|-------------|---------|

## Example Output
```

## 5. Testing

### allsky
- Server starts
- API responds
- Overlay works

### allsky-modules
```
python3 allsky_module_test.py --module <name>
```


## 6. Pull Request Requirements
- Description
- Linked Issue
- Screenshots for UI changes

## 7. Security Reporting
Do not open public issues for vulnerabilities.

## 8. Thank You
Thank you for contributing to Allsky.
