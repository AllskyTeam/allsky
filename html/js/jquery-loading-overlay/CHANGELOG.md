# Change Log
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/) 
and this project adheres to [Semantic Versioning](https://semver.org/).


## v2.1.7 - 2020-03-20
### Fixed
- Bug affecting settings and in particular size when applied to multiple target elements using a single jQuery selector



## v2.1.6 - 2018-09-24
### Fixed
- Corner case when LoadingOverlay was being hidden with a long fade out time after the target element was resized and before `resizeInterval` was triggered



## v2.1.5 - 2018-07-03
### Fixed
- Toggle LoadingOverlay visibility according to target element
- Clear orphaned intervals when target element is arbitrary removed from DOM



## v2.1.4 - 2018-06-07
### Fixed
- Replaced the `.load()` method with a custom `ajax()` request to load external SVG images in order to prevent conflicts with `ajaxStart()` and `ajaxSend()` event handlers



## v2.1.3 - 2018-05-04
### Fixed
- package.json `main` path fix



## v2.1.2 - 2018-04-26
### Fixed
- Bug introduced in v2.1.1 causing multiple LoadingOverlays to be shown on a single element



## v2.1.1 - 2018-04-22
### Fixed
- Gracefully hides when target element is arbitrary removed from DOM



## v2.1.0 - 2018-04-04
### Added
- `Resize` *action*
- `progressFixedPosition` option
- Control over both SVG *fill* and *stroke* colors through `imageColor` option passed as two-elements array

### Changed
- Default SVG image uses `circle` elements instead of `ellipse` ones



## v2.0.2 - 2018-03-20
### Fixed
- Using `getBoundingClientRect()` instead of jQuery `.position()` when LoadingOverlay is displayed on an element with `position : fixed`



## v2.0.1 - 2018-03-16
### Fixed
- Changed value for overlay `justify-content` CSS property from `space-evenly` to `space-around`: Edge didn't like the former
- Set explicit `width` and `height` for SVG, addressing bug in Chrome



## v2.0.0 - 2018-03-16
### Added
- SVG images support
- CSS3 animations support
- 4 different built-in keyframes animations: `rotate_right`, `rotate_left`, `fadein` and `pulse`
- Text element support
- Progress Bar element support
- New *actions* `text` and `progress`
- Fixed size support
- Javascript sourcemaps
- New options:
  * `background`, `backgroundClass`
  * `imageAnimation`, `imageAutoResize`, `imageResizeFactor`, `imageColor`, `imageClass`, `imageOrder`
  * `fontawesomeAnimation`, `fontawesomeAutoResize`, `fontawesomeResizeFactor`, `fontawesomeColor`, `fontawesomeOrder`
  * `customAnimation`, `customAutoResize`, `customResizeFactor`, `customOrder`
  * `text`, `textAnimation`, `textAutoResize`, `textResizeFactor`, `textColor`, `textClass`, `textOrder`
  * `progress`, `progressAutoResize`, `progressResizeFactor`, `progressColor`, `progressClass`, `progressOrder`, `progressSpeed`, `progressMin`, `progressMax`
  * `direction`      

### Changed
- `color` option is now named `background`
- Default image is a modern, lightweight and customizable SVG instead of the old fashioned GIF
- Default `maxSize` increased to `120px`
- Folder structure has changed, with source files under `src/` and production files under `dist/`

### Removed
- `imagePosition` option
- *Extra Progress*

### Fixed
- Auto detection of container's CSS `position` change to/from `fixed`



## v1.6.0 - 2018-02-10
### Added
- AMD and CommonJS support
- Typings for TypeScript

### Changed
- Extra *Progress*: it is possible to disable shown text

### Fixed
- Extra *Progress*: jQuery is referenced through global `jQuery` variable instead of `$` directly
- Main path of Extra *Progress* in bower.json 



## v1.5.4 - 2017-09-29
### Changed
- Option `zIndex` defaults to the highests value allowed (2147483647) to prevent other elements to be displayed over LoadingOverlay

### Fixed
- Object keys always expressed as string literals instead of identifiers (fixes some weird Microsoft Edge behaviour)
- Minor code fixes and improvements
- Added `main` field to package.json according to jsDelivr recommendations



## v1.5.3 - 2017-01-27
### Fixed
- CSS positioning problem with Extra *Progress* when used with Font Awesome



## v1.5.2 - 2016-12-09
### Changed
- Option `zIndex` defaults to 9999



## v1.5.1 - 2016-11-11
### Added
- package.json fix



## v1.5.0 - 2016-11-11
### Added
- Bower and npm support
- Changelog



## v1.4.1 - 2016-08-05
### Changed
- LoadingOverlay is always attached to the body, even in *element overlay* mode
- `resizeInterval` option defaults to 50 milliseconds 

### Fixed
- A bug with positioning in *element overlay* mode
- Possible inconsistency with Javascript `parseInt()` function



## v1.4.0 - 2016-06-29
### Added
- `imagePosition` option
- Released on jsDelivr CDN

### Changed
- SemVer compliant
- loading.gif image is now embedded in the code as Data URI



## v1.3 - 2016-05-25
### Added
- `z-index` option



## v1.2 - 2016-04-22
### Added
- Fade In and Fade Out
- Extra *Progress*



## v1.1 - 2015-12-31
### Added
- Font Awesome support
- Custom element support



## v1.0 - 2015-02-15
*First public release*
