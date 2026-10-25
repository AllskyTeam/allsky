This page lists what Allsky sends to anyone other than the services you set up yourself, why, and how to stop it.

Nothing is sent unless you turn it on.
The installation asks about the Allsky Map with ==No== as the default answer, and if you keep ==No== you won't be asked again for a year.
All these settings are in the **Privacy & Sharing** tab of the WebUI's **Allsky Settings** page, and you can turn any of them off at any time.

The data go to the Allsky Team, the core developers of Allsky.
If you have a question about your data, ask in the [Allsky Discussions](https://github.com/AllskyTeam/allsky/discussions){ target="_blank" rel="noopener" .external }.

!!! note
	Your remote Website, remote server, MQTT broker, the Allsky Sensor Server, and modules that use online services get the data you configure them with.
	Those are services you choose and set up yourself, so they aren't covered here.


## Allsky Map { data-toc-label="Allsky Map" id="Allsky-map" }
When ==Show on Map== is enabled your camera appears on the public [Allsky Map](https://www.thomasjacquin.com/allsky-map/){ target="_blank" rel="noopener" .external }.
See [The Allsky Map](/docs/allsky_guide/howtos/allsky_map.html) for how to set it up.

| What | Details |
|---|---|
| **What is sent** | Your ==Latitude== and ==Longitude==, the ==Location==, ==Owner==, ==Lens==, and ==Equipment Info== settings, your remote Website's ==Website URL== and ==Image URL== if set, the camera and computer model, the Allsky version, your Pi's machine ID, and a copy of your Allsky settings and Website configuration. Passwords, user names, and tokens aren't in those files and aren't sent. |
| **What is public** | The location, owner, camera, lens, computer, equipment information, your Website's link, and its latest image. The other data is only used by the Allsky team. |
| **Where it goes** | The Allsky Map server at `www.thomasjacquin.com`. |
| **Why** | To show your camera on the map, and so the Allsky team knows how many cameras use Allsky and with which cameras and Pi models, so they know where to concentrate development. |
| **When** | Whenever you change one of the map settings, and at the end of every other night. |
| **How to remove it** | Turn ==Show on Map== off. Allsky then tells the map server to delete your camera's entry. |

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
| **What is sent** | The Pi OS version, the Pi model, the camera model, how many cameras are connected, the names of the enabled modules, how many times Allsky was started and the camera was changed, and on how many days the WebUI was used, all since the last upload. Also the Allsky version and an ID made from your Pi's machine ID (see below). No location, no images, no settings, and nothing about what you do in the WebUI. |
| **What is public** | Nothing. |
| **Where it goes** | The Allsky Map server at `www.thomasjacquin.com`. |
| **Why** | To know which Pi models, OS versions, cameras, and modules are in use, so the Allsky Team knows what to test and improve. A very high number of starts can also point to a problem. |
| **When** | When you enable it, and then at the end of night once a week. Allsky only counts while the setting is enabled. |
| **How to remove it** | Turn ==Share Usage Data== off. Allsky then tells the server to delete your Usage Data and deletes its own counts. |

To see exactly what your Pi would send, run:

```
~/allsky/scripts/postToData.sh --show
```

## Contact Email { data-toc-label="Contact Email" id="Contact-email" }
If you enter a ==Contact Email== the Allsky Team can contact you.

| What | Details |
|---|---|
| **What is sent** | The email address, the Allsky version, and an ID made from your Pi's machine ID (see below). |
| **What is public** | Nothing. The address isn't shown anywhere and isn't shared outside the Allsky Team. |
| **Where it goes** | The Allsky Map server at `www.thomasjacquin.com`. |
| **Why** | So the Allsky Team can contact you when something looks wrong with the data your Pi sends, about a security problem in Allsky, or rarely to ask for help testing a new release. It isn't used for advertising or for anything else. |
| **When** | When you enter or change it, and then at the end of night once a week. |
| **How to remove it** | Clear ==Contact Email==. Allsky then tells the server to delete the address. |

## The ID of your Pi { data-toc-label="ID of your Pi" id="Pi-id" }
Usage Data and the Contact Email are stored under an ID so a later upload replaces the earlier one and the data can be deleted.
The ID is a hash of your Pi's machine ID (`/etc/machine-id`), not the machine ID itself, so it can't be used to find your Pi's machine ID.
The Allsky Map still uses the machine ID itself.

