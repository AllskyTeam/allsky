This page lists what Allsky sends to anyone other than the services you set up yourself, why, and how to stop it.

Nothing is sent unless you turn it on.
The installation asks about each item with ==No== as the default answer, and if you keep ==No== you won't be asked again for a year.
All these settings are in the **Privacy & Sharing** tab of the WebUI's **Allsky Settings** page, and you can turn any of them off at any time.

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
