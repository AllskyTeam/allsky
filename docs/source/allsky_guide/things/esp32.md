# [ESP32-P4 AllSky Display](https://github.com/chvvkumar/ESP32-P4-Allsky-Display){ target="_blank" rel="noopener" .external }

Transform your ESP32-P4 display into an all-sky camera viewer with multi-image cycling, hardware acceleration, and seamless Home Assistant integration.

This is a great project that allows you to use the [Waveshare](https://www.waveshare.com/esp32-p4-wifi6-touch-lcd-3.4c.htm){ target="_blank" rel="noopener" .external } round displays to show images from your Allsky camera


- Multi-Image Display - Cycle through up to 10 image sources automatically or via API triggers
- Flexible Update Modes - Automatic cycling or API-triggered refresh for external control (v-snd-0.62+)
- Runtime Display Selection - Switch between 3.4" and 4.0" displays via Web UI without recompilation (v-snd-0.61+)
- Enhanced Brightness Control - Three modes: Manual, MQTT Auto, or Home Assistant with clear UI indication (v-snd-0.61+)
- Hardware Accelerated - ESP32-P4 PPA for fast scaling and rotation (385-507ms render time)
- High Resolution - Up to 1448×1448 pixel images with 2× scaling capability
- Per-Image Transforms - Individual scale, offset, and rotation settings for each image
- Touch Controls - Tap to navigate, double-tap to toggle modes
- Home Assistant Ready - Auto-discovery via MQTT with full control
- Web Configuration - Modern, responsive UI for all settings
- OTA Updates - Wireless firmware updates with automatic rollback
- Easy Setup - Captive portal WiFi configuration with QR code

![](/assets/things_images/esp32-p4-display.jpg)

/// caption
A running ESP32 P4 Display
///

The project supports both the 3.4 and 4 inch displays