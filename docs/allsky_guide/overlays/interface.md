
## Editor Interface

The Overlay Editor web page consists of two key areas:

- The toolbar contains icons that perform actions or bring up dialog boxes.  
- The working area contains the overlay and the current image in the background.

!!! warning  ""

    NOTE: The Overlay Editor will only start if Allsky is capturing images. If Allsky is not capturing a warning is displayed and the Overlay Editor will wait until Allsky start capturing.

!!! warning  ""

    New fields are initially added to the upper left corner of the overlay but can be moved anywhere you want - just drag and drop! If you added a field by mistake, delete it by clicking on the  icon (4) before doing anything else.

![Variable Dialog](/assets/overlay_images/toolbar.png)

/// caption
The Overlay Editor toolbar
///

| Number { .w-5p }| Function { .w-25p } | Description |
|--------|----------|-------------|
| 1 | Save The Current Configuration | This is enabled and turns green when any changes have been made that require saving. The word "Modified" is also appended to the tab label, i.e., "Overlay Editor - Modified". |
| 2 | Add New Text Field | Click to add a new field with text and/or variables to the overlay, including adding a variable |
| 3 | Add New Image Field | Click to add an existing image to the overlay. The image must have previously been uploaded using the Image Manager. |
| 4 | Delete selcted field | Click to delete the selected field. The "del" or "delete" keys on the keyboard can also be used. The icon is only enable turns green when a field is selected. |
| 5 | Variable manager |  Click to add a pre-defined field from the Variable Manager. See the [Variable Manager](#variable-manager) section for more details.
| 6 | Preview| Click to preview each of the fields. This is useful to see what actual data will look like on the overlay so you can better align fields.|
| 7 | Group Fields | Groups the selected fields |
| 8 | Un Group Fields | Ungroups the selected group |
| 9 | Left Align | Lest aligns the selected fields |
|10 | Equal Vertical Space | Equally distributes the selected fields between the first and last selected fields |
|11 | Equal Horizontal Space | Equally distributes the selected fields between the first and last selected fields |
|12 | Zoom In | Zooms into the overlay |
|13 | Zoom Out | Zooms out of the overlay |
|14 | Full Size | Views the overlay at full resolution |
|15 | Fit | Fits the overlay into the screen |
|16 | Overlay Manager | Displays the [Overlay Manager](#overlay-manager) |
|17 | Overlay Errors | Only displayed if any fields are detected that are off the screen. Selecting this icon will display the [Overlay Errors](#overlay-errors) dialog allowing the off-screen fields to be deleted or fixed. Fixing the field will move it into the visible portion of the overlay editor allowing you to move it to the exact position required. |
|18 | Font Manageer | Displays the [Font Manager](#font-manager) |
|19 | Image Manager | Displays the [Image Manager](#image-manager) |
|20 | Settings | Displays the [Overlay Settings](#overlay-settings) |
|21 | Help | Displays the overlay manager help |

### Keyboard/Mouse 
There are various keyboard and mouse shortcuts used by the overlay manager

- The Del or Delete key will delete a field if one is selected  
- A single mouse click will select the field
- Double clikcing a field will display its properties
- Once the properties window is visible clicking a field will switch to that fields properties
- Clicking the mouse and dragging around fields will select all of the fields
- Holding the alt key and dragging will draw a rectange

### Variable Manager
The variable manager allows you to select variables and add them to overlays as a field. I also allows block of fields to be added

![Variable Manager](/assets/overlay_images/variable-manager.png)

/// caption
The Variable Manager Dialog
///

1. Allows the columns displayed in the variable manager to be selected
2. The available variables that can be added
3. Display all variables, by default oly variables with a value are displayed

To add a variable either double click it or single click it and click the 'Select' button

![Variable Manager Blocks](/assets/overlay_images/variable-manager-blocks.png)

/// caption
The Variable Manager Blocks Dialog
///

This dialog allows blocks to be added to the overlay, blocks are a collection of fields in a predefined layout. 

1. Select he font details for the block. **NOTE** This must be selected BEFORE adding the block
2. Click the add button to add the block

### Overlay Manager
The Overlay Manager is used to create and enable overlays for day and nighttime capture.

![Overlay manager](/assets/overlay_images/overlay-manager-full.png)

/// caption
The Overlay Manager
///

The Overlay Manager comes pre installed with several overlays for common cameras. The Allsky team maintain these overlays. During installation the most appropriate overlay for your camera will have been selected, the Overlay Manager allows you to use these overlays or create a new one.

!!! warning  ""

    The Allsky maintained overlays cannot be edited, you must create a new overlay if you wish to edit it. The new overlay can be copied from any exising overlay.

During an upgrade from a previous version of Allsky the Module Manager will attempt to convert any of your customised overlays into the module manager format.

#### Main Tab

![Overlay manager main](/assets/overlay_images/overlay-manager.png)

**Field Details**

1. Selects the main overlay manager tab
2. Displays the tab to allow overlays to be activated
3. Selects the overlay to display/edit. When selecting an overlay the overlay will be displayed in the main overlay editor. If you select an overlay that cannot be edited then a warning is displayed in the main overlay editor.
4. Adds a new overlay
5. Deletes an overlay. NOTE: Allsky maintained overlays cannot be deleted
6. The name of the overlay, this is used to identify the overlay in a human readable format
7. The name of the overlay description
8. The camera brand the overlay applies to
9. The camera model the overlay applies to
10. The width of the captured image, after any cropping
11. The height of the captured image, after any cropping
12. The Time of Day the overlay should be used for

!!! warning  ""

     When making any changes in the overlay meta data section you must use the main save button on the Overlay Editor toolbar, this will be highlighted in green if there are any changes to save

#### Options Tab

![Overlay manager config](/assets/overlay_images/overlay-manager-config.png)

**Field Details**

1. Selects the overlay to use when capturing daytime images
2. Selects the overlay to use when capturing nightime images


#### Selecting Overlays

To select the overlays to use for day or night open the Overlay Manager and switch to the Options Tab. Here you can select the appropriate overlay to use.

Overlays can be limited to daytime, nighttime capture or both. Only the available overlays for day / nighttime capture will be displayed in the drop downs

#### Create New Overlay

To create a new overlay click the + icon (4). A new dialog will be displayed allowing you to create the new overlay.

![Overlay manager add](/assets/overlay_images/overlay-manager-add.png)

/// caption
Add new overlay main tab
///

1. Selects the overlay you wish to use as a starting point or select 'Blank Overlay' for an empty overlay
2. Enter a Human Readable name for the overlay
3. Enter a Human Readable name for the overlay
4. Select the time of day you wish this overlay to be used in
5. If selected then the overlay will be activated after it has been created. If not selected the overlay will be saved as a draft and you will have to manually activate it.

!!! warning  ""

    By default when an overlay is created it is activated for day/night or both as defined by the 'Available For' dropdown. If you DO NOT want the overlay to be activated by default then select 'No' in the 'Activate After Creation' option.


![Overlay manager add adv](/assets/overlay_images/overlay-manager-add-adv.png)

/// caption
Add new overlay advanced tab
///

!!! warning  ""

    You will only need to make changes on this tab if you are creating an empty overlay. If you are copying an existing overlay then all of the fields will be defaulted from the copied overlay.

1. This is for information only and is the filename of the overlay that will be used to store it on the Pi
2. The camera brand the overlay applies to
3. The camera model the overlay applies to
4. The width of image the overlay applies to. This will default to the width of the last captured image
5. The height of image the overlay applies to. This will default to the width of the last captured image

Once you have completed the required fields in the dialog select the 'Ok' button and the new overlay will be displayed allowing you to edit it.

#### Delete Overlay

To delete an overlay select the required overlay and click the delete buttton.

!!! warning  ""

    NOTE: You cannot delete an overlay if it is currenty active. You must activate another overlay before deleting it.



### Overlay Errors

### Font Manager
The Font Manager allows you to manage fonts used in overlays. It supports all mainstream browser fonts and allows you to upload any TrueType font for use in text fields. You only need to use the Font Manager if you intend to use any non built in fonts.

!!! info  ""

    In version 2024.12.06_06 and before you were required to add fonts to the overlay in the Fonat Manager before they could be used. This is no longer a requirement and the fonts used in an overlay are automatically managed


![Font Manager](/assets/overlay_images/font-manager.png)

/// caption
The Font Manager Dialog
///

1. Lists all the fonts that can be used. System Fonts are marked as such in the Path column.
2. Deletes a font.
3. Adds a font from daFont.com by entering a URL. See below.
4. Uploads a zip file to install fonts. See below.

!!! warning  ""
    
    - It is not possible to delete a System Font and they will not have a delete icon as shown for the first several fonts above.
    - If a font is in use when deleted then any fields using the font will revert to the default font as specified in the overlay settings.

#### Font Preview
The Font Preview dialog allows you to preview any installed font, including system fonts.

![Font Preview](/assets/overlay_images/font-manager-preview.png)

/// caption
The Font Manager Preview Dialog
///

1. Selects the font you wish to preview
2. Select the font size for the preview
3. Enter some text to preview
4. The previewd text

### Image Manager
The Image Manager allows you to upload images for use on overlays and create masks for certain functions such as star and meteor detection. Allsky comes with several basic images.

![Image manager](/assets/overlay_images/image-manager.png)

/// caption
The Image Manager Dialog
///

1. Adds the selected image to the overlay
2. Deleted the selected image
3. The image library
4. Area to drop images onto to upload them, clicking this area will present an upload dialog
5. Starte the Mask Editor


### The Mask Editor
Some modules with Allsky benefit from having a mask applied to them prior to running the module. The Starcount module us a good example of this. To prevent false positives a mask is applied that removes the areas of the image you are not interested in counting stars in.

Masks can also be used to mask out areas outside of the image circle thay mak have light leaks. This give syou a nice dark area to place th eoverlays on.

Masks consist of two colours

- **Black** - Any black areas will be masked out of the image i.e. set to black
- **White** - Any white areas will be preserved

For more complex masks its possible to blend the black to white transisiotn in the mask to prevent false positives in modules that may be looking for edges such as the Meteor detection module.

The Mask Editor has two modes, Easy and Expert, the default is Easy mode. In Easy mode all you do is draw a white ellipse to capture the areas you wish to keep, when you ssave the mask the bacl areas will be automatically added. In Expert mode you have a series of drawing tools you can use to create much more detailed masks including blended edges on shapes to help with false positives on edge detection.

![Mask editor](/assets/overlay_images/mask-editor.png)

/// caption
The Mask Editor Dialog
///

1. Start creating a new mask
2. Switch between easy and export mode
3. In Expert mode select the type of drawing tool to use
4. Undo and Redo buttons
5. Sets the opactity of the mask being created, useful for fine details work where you need to see thru the mask
6. Set the brightnedd of the background image
7. For the brush tool set the thickness of the brush
8. Zoom controls

Once you are happy with the mask click the 'Save' button and you will be prompted to give the mask a name and it will then be saved. There are a few rules around names

1. The name must be unique to all other images
2. Do not use spaces in the name


### Overlay Settings
The overlay Editor has three tabs for settings

- **Overlay Settings** Settings that affect new fields added to an Overlay
- **Editor Settings** Settings that apply the the Overlay Editor
- **Overlays** - Available overlays to edit

![Overlay Settings layout](/assets/overlay_images/overlay-settings-layout.png)

/// caption
The Overlay Settings
///

1. The default opacity for new images.
2. The default rotation for new images.
3. The default font for new text fields.
4. The default font size for new text fields.
5. The default font opacity for new text fields.
6. The default font color for new text fields.
7. The default rotation for new text fields.
8. The default colour used for the font stroke.
9. The default expiration time in seconds for "extra" data files that do not specify an expiry time. This applies to all variables in .txt files and entries in .json files that don't have an "expires" attribute.
10. The default text used when a field has expired.


![Overlay Settings editor](/assets/overlay_images/overlay-settings-editor.png)

/// caption
The Overlay Editor Settings
///

1. When enabled, displays a grid for easier alignment of fields on the overlay. The grid is used to 'snap' fields making their placement easier.
2. The size of the grid in pixels. **NOTE** Changing the grid size on an existin glayout will not adjust any fields
3. The colour to use for the grid.
4. The grid brightness. Values range from 0 (lowest brightness) to 100 (brightest).
5. When enabled, moving a field will cause a rectangle to be displayed showing where the field will snap to if dropped.
6. The number of variables to show per page in the Variable Manager.
7. When adding a new field all other fields will be set to this brightness to make the new field easier to see. Values range from 0 (darkest) to 100 (each field's full brightness).
8. When selecting a field all other fields will be set to this opacity to make the new field easier to see. Values range from 0 (darkest) to 100 (each field's full brightness).
9. When enabled, scrolling the mouse wheel will zoom the overlay.
10. Brightness of the captured image being overlayed. Lower this if the captured image is bright to make it easier to see the overlay fields. Values range from 0 (black background) to 100 (full brightness of captured image).

!!! info  ""
        
        When changing the brightness settings you may need to click somewhere in the overlay in order for the change to take affect.


![Overlay Settings overlays](/assets/overlay_images/overlay-settings-overlays.png)

/// caption
The Overlay Editor Overlays
///

1. Displays a table showing all of the overlays available.
2. This icon is displayed when the overlay is not editable, these are overlays provided by the Allsky team. Clicking the button will view the overlay but not allow it to be edited
3. This icon is displayed when the overlay is editable. Clicking the button will view the overlay and allow it to be edited