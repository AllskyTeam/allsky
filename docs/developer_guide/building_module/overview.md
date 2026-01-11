This section provides guides on building some example modules for Allsky. 

The following points should be considered when developing modules

- All module filenames must be prefixed with ```allsky_```
- All modules must be unique i.e. there can only be one ```allsky_example``` module
- The module manager is sensitive to errors in the meta_data structure. Please ensure the structure is valid JSON
- Modules must return a result, a text string indicating the outcome of the module. This is used in the module debug popup in the module manager
- All of the example modules here can be found in the allsky modules repository

### Tips when writing modules

- Ensure you limit the modules to the correct pipelines. Some modules make sense to run in the capture pipelines, dya and night and some don't
- Ensure you keen the version numbers and changelog updated when releasing new versions, this helps the module installer identify new versions
- DO NOT write modules that take a long time to execute and put them in the capture pipelines, this can cause delays in capturing imgages
- Make use of the functions available in the [Shared Module](../../allsky_shared.md){ target="_blank" rel="noopener" .external } module
- Make use of the env.json file, by setting ```"secret": "true"``` where required for module arguments, This ensures that sensitive data is never passed outside of Allsky