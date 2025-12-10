This module can detect lightning using a AS3935 sensor

The AS3935 is a dedicated lightning detection integrated circuit designed to identify the characteristic electromagnetic signatures produced by lightning activity. Operating around the 500 kHz sferic band, it uses an internal tuned antenna and digital signal processing to distinguish real lightning strikes from man-made electrical noise and other transient RF events. The device can detect cloud-to-ground, cloud-to-cloud, and intra-cloud lightning and provides an estimated storm distance from approximately 40 km down to 1 km, allowing systems to track whether a storm is approaching or directly overhead. It features configurable sensitivity levels, automatic noise-floor adaptation, and “disturber” rejection to reduce false positives, while communicating via either I²C or SPI and signalling events through an interrupt pin. The AS3935 requires correct antenna calibration and should be positioned away from high-noise electronics to ensure reliable detection. Widely used in weather stations, outdoor monitoring systems, and IoT nodes, the AS3935 offers a compact and low-power method of adding accurate lightning detection capabilities to embedded applications.


!!! warning  "False Positives"

    Its very easy to get false positives from these devices. You will need to ensure the device is mounted away from other electrical sources that could cause interferance

!!! danger  "WARNING"

    The sensor used in this module will only estimate values. It must NEVER be used for any form of personal protection from storms

## Settings

### Basic

| Setting | Description |
|--------|-------------|
| i2c Address | The i2c address of the as3935, leave blank for the default |
| Input Pin | The pin the as3935 irq pin is connected to, this is set high when lightning is detected

### Advanced

| Setting | Description |
|--------|-------------|
| Mask Disturbers | Mask false positives |
| Noise Level | The ambient noise level, 1 being the lowest and 7 the highest |
| Watchdog Threshold | Minimum signal level to trigger the lightning verification algorithm (1-10) |
| Spike Rejection | The default setting is two. The shape of the spike is analyzed during the chip's validation routine. You can round this spike at the cost of sensitivity to distant events (1-11) |
| Strike Threshold | The number of strikes detected before an event is triggered |
| Expire Strikes | If a strike is detected then after this number of seconds of no strikes the strikes overlay variable and strike counter will be reset. Default is 600 seconds (10 minutes) |

## Available Variables

| Variable | Description |
|--------|-------------|
| AS_LIGHTNING_COUNT | Number of strikes detected |
| AS_LIGHTNING_LAST | Time of last strike |
| AS_LIGHTNING_DIST | Distance of last strike, this is an estimate |
| AS_LIGHTNING_ENERGY | Energy of the last strike |

## Schematics

![](/assets/module_images/as3935.png){ width="100%" }


/// caption
Example using the as3935
///