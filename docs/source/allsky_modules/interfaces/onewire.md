# 1-Wire Interface (One-Wire Bus)

**1-Wire** is a simple communication protocol developed by Maxim Integrated (Dallas Semiconductor) that allows data and power to be delivered over a **single data wire plus ground**. It is commonly used for low-speed sensors such as temperature probes.

Typical devices include:
- DS18B20 temperature sensors  
- iButton devices  
- EEPROM identification chips  

## Enabling 1-Wire on Raspberry Pi

- `raspi-config` → Interface Options → One Wire 

Raspberry Pi provides built-in support for 1-Wire using a kernel driver.

### Enable via `/boot/config.txt`

Edit the configuration file:

```bash
sudo nano /boot/config.txt
```

Add the following line:

```ini
dtoverlay=w1-gpio
```

By default this uses:
- GPIO4 (Pin 7) as the data pin

You can specify a different pin if required:

```ini
dtoverlay=w1-gpio,gpiopin=17
```

Reboot the Pi:

```bash
sudo reboot
```

## How 1-Wire Works

The bus uses:
- **DQ (Data line)** – carries both data and timing signals  
- **GND (Ground)**  
- Optional **VCC (3.3 V or 5 V)** if not using parasitic power

All devices share the same data line and are identified by a **unique 64-bit ID**, allowing many devices to exist on the same bus.

## Power Modes

1-Wire devices can operate in two ways:

| Mode | Description |
|------|--------------|
| Normal power | Device uses VCC, GND, and DATA |
| Parasitic power | Device steals power from the data line (DATA + GND only) |

> For reliability, **normal powered mode is recommended** instead of parasitic power.


## Verifying 1-Wire is Working

After reboot, check that the driver is loaded:

```bash
ls /sys/bus/w1/devices/
```

You should see folders like:

```text
28-00000abcdef0
w1_bus_master1
```

Each `28-xxxxxxxxxxxx` folder represents a detected 1-Wire device.


## Reading a DS18B20 Temperature Sensor

You can read the temperature directly from the system:

```bash
cat /sys/bus/w1/devices/28-xxxxxxxxxxxx/w1_slave
```

Example output:
```
aa 01 4b 46 7f ff 0c 10 5e : crc=5e YES
aa 01 4b 46 7f ff 0c 10 5e t=26000
```

The temperature is reported as:
- `t=26000` → **26.000°C**

