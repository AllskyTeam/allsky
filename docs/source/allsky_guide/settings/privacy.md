This page lists what Allsky sends to anyone other than the services you set up yourself, why, and how to stop it.

Nothing is sent unless you choose it.
The first time you open the WebUI after installing or upgrading, its **Privacy** page asks what, if anything, you want to share, before it shows any other page.
Nothing is pre-selected and every choice is optional.
It asks again only when what Allsky can send changes.

You can change your choices at any time on the WebUI's **Privacy** page or in the **Privacy & Sharing** tab of the WebUI's **Allsky Settings** page.
The **Privacy** page also shows exactly what your Pi sends, and has a button to delete everything the Allsky server has from your Pi.

The data go to the Allsky Team, the core developers of Allsky, at the Allsky Map server (`www.thomasjacquin.com`).
Everything is sent in one upload: when you change a choice, and then at the end of every other night.
If you have a question about your data, ask in the [Allsky Discussions](https://github.com/AllskyTeam/allsky/discussions){ target="_blank" rel="noopener" .external }.

!!! note
	Your remote Website, remote server, MQTT broker, the Allsky Sensor Server, and modules that use online services get the data you configure them with.
	Those are services you choose and set up yourself, so they aren't covered here.


## Allsky Map { data-toc-label="Allsky Map" id="Allsky-map" }
The ==Map Sharing== setting has three choices:

- ==Don't send== (the default): nothing about your camera is sent.
- ==Send to the Allsky Team only==: your camera's information is sent, but it doesn't appear on the map.
- ==Send and show on the Map==: your camera also appears on the public [Allsky Map](https://www.thomasjacquin.com/allsky-map/){ target="_blank" rel="noopener" .external }.

Sending your Map data, even without showing it, helps the Allsky Team decide where to spend development time.
See [The Allsky Map](/docs/allsky_guide/howtos/allsky_map.html) for how to set it up.

| What | Details |
|---|---|
| **What is sent** | Your ==Latitude== and ==Longitude==, the ==Location==, ==Owner==, ==Lens==, and ==Equipment Info== settings, your remote Website's ==Website URL== and ==Image URL== if set, the camera and computer model, the Allsky version, your Pi's machine ID, and a copy of your Allsky settings and Website configuration. Passwords, user names, and tokens aren't in those files and aren't sent, and neither is your ==Contact Email==. |
| **What is public** | Only with ==Send and show on the Map==: the location, owner, camera, lens, computer, equipment information, your Website's link, and its latest image. The other data is only used by the Allsky Team. |
| **Why** | To show your camera on the map, and so the Allsky Team knows how many cameras use Allsky and with which cameras and Pi models, so they know where to concentrate development. |
| **How to stop it** | Change ==Map Sharing==. ==Send to the Allsky Team only== removes your camera from the map. ==Don't send== also stops sending the data. To delete the data from the server, use the button on the WebUI's **Privacy** page. |

### Hiding your exact location
Users of the map can zoom in to see where your camera is.
If you enable ==Hide Exact Location==, the map and your local and remote Allsky Websites only get your ==Latitude== and ==Longitude== rounded to the nearest 0.02 degrees, so the location they show is at most about 1.3 km (0.8 miles) from your real one.
This also applies to the copy of your settings and Website configuration that is sent to the map server.
Allsky itself keeps using the exact values, which stay on your Pi.

Text overlays that show the latitude or longitude are not changed, so if your images show them and are public, remove those fields from your overlay.


## Usage Data { data-toc-label="Usage Data" id="Usage-data" }
When ==Share Usage Data== is enabled your Pi tells the Allsky Team how Allsky is used on it.

| What | Details |
|---|---|
| **What is sent** | The Pi OS version, the Pi model, the camera model, how many cameras are connected, the names of the enabled modules, how many times Allsky was started and the camera was changed, and on how many days the WebUI was used, all since the last upload. Also the Allsky version and your Pi's machine ID. No location, no images, no settings, and nothing about what you do in the WebUI. |
| **What is public** | Nothing. |
| **Why** | To know which Pi models, OS versions, cameras, and modules are in use, so the Allsky Team knows what to test and improve. A very high number of starts can also point to a problem. |
| **How to stop it** | Turn ==Share Usage Data== off. Allsky then tells the server to delete your Usage Data. |

Allsky keeps the counts on your Pi even when ==Share Usage Data== is off, so a future version can use them, for example to spot a problem.
They never leave your Pi unless you share them.

## Contact Email { data-toc-label="Contact Email" id="Contact-email" }
If you enter a ==Contact Email== the Allsky Team can contact you.

| What | Details |
|---|---|
| **What is sent** | The email address, the Allsky version, and your Pi's machine ID. |
| **What is public** | Nothing. The address isn't shown anywhere and isn't shared outside the Allsky Team. |
| **Why** | So the Allsky Team can contact you when something looks wrong with the data your Pi sends, about a security problem in Allsky, or rarely to ask for help testing a new release. It isn't used for advertising or for anything else. |
| **How to stop it** | Clear ==Contact Email==. Allsky then tells the server to delete the address. |

## When you agreed { data-toc-label="When you agreed" id="Consent" }
Each upload also says when you chose to share each item, and which version of these questions you answered.
That way the Allsky Team can show what you agreed to and when.

## Deleting your data { data-toc-label="Deleting your data" id="Delete" }
The **Delete my data from the Allsky server** button on the WebUI's **Privacy** page deletes everything the server has from your Pi: the Map data, the Usage Data, and the email address.
It also sets ==Map Sharing== to ==Don't send==, turns ==Share Usage Data== off, and clears ==Contact Email==.

Data from a Pi that hasn't sent anything for 12 months is deleted automatically.

## Seeing what is sent { data-toc-label="Seeing what is sent" id="Show" }
The WebUI's **Privacy** page shows the data your Pi sends.
You can also see it by running:

```
~/allsky/scripts/postToMap.sh --show
```
