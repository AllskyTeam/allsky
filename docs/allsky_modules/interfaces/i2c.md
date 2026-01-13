# I²C Interface (Inter-Integrated Circuit)

**I²C (Inter-Integrated Circuit)** is a simple, low-speed communication bus used to connect sensors, displays, and other peripherals to a controller such as a Raspberry Pi using only two signal wires.

It is commonly used for devices such as temperature sensors, light sensors, RTC clocks, ADCs, DACs, OLED displays, and GPIO expanders.

## I²C on Raspberry Pi

Raspberry Pi exposes I²C on the following pins:

| GPIO | Pin | Function |
|------|-----|----------|
| GPIO2 | Pin 3 | SDA |
| GPIO3 | Pin 5 | SCL |

### Enabling I²C on the Pi

Before using any I²C devices you must enable the I²C interface as it is not enabled by default.

Enable I²C using:
- `raspi-config` → Interface Options → I²C  

or by adding to `/boot/config.txt`:

```ini
dtparam=i2c_arm=on
```

The bus will then appear as:
```
/dev/i2c-1
```

If I²C is not enabled most modules will warn you.

## The I²C Library

Allsky uses a library of I²C  devices that is provided by Adafruit on their [Github repository](https://github.com/adafruit/I²C_Addresses){ target="_blank" rel="noopener" .external }

When first selecting an I²C device use the button on the dialog to build the database.


## How I²C Works

I²C uses two shared lines:

| Signal | Name | Purpose |
|------|------|---------|
| SDA | Serial Data | Carries the data between devices |
| SCL | Serial Clock | Provides the clock signal for synchronization |

Both lines are **open-drain**, meaning devices can only pull the line low. **Pull-up resistors** (usually 1.8kΩ–10kΩ) are required to bring the lines high. Fortunately the Pi has these built in.

Devices connect in **parallel** on the same two wires.

## Master and Slave Devices

- The **master** (e.g. Raspberry Pi) controls communication and provides the clock.  
- **Slave devices** (e.g. sensors) each have a unique **I²C address**.

Example devices on a bus:
- Raspberry Pi → master  
- SHT40 sensor → slave at address `0x44`  
- TSL2591 sensor → slave at address `0x29`

## I²C Addresses

- Most devices use **7-bit addresses**, written as hexadecimal (e.g. `0x44`)  
- Some devices allow **address selection** using jumpers or pins  
- Two devices with the **same address cannot share the same bus** unless an I²C multiplexer is used  

You can scan the bus on Linux with:

```bash
i2cdetect -y 1
```

If the ```i2cdetect``` command cannot be found the install it as follows

```
sudo apt update
sudo apt install I²C-tools
```

## Typical Speed Modes

| Mode | Speed |
|------|--------|
| Standard mode | 100 kHz |
| Fast mode | 400 kHz |
| Fast mode+ | 1 MHz |
| High speed | 3.4 MHz |

Most sensors operate at **100 kHz or 400 kHz**.
