
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

### Image Manager

### Overlay Settings



