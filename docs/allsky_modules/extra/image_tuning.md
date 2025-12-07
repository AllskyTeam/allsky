This module allows for manipulating various aspects of the captured image;

  - Saturation
  - Contrast, including 'Smart Contrast'
  - Gamma
  - Sharpness
  - Noise Reduction

The module applies enhancements in this specific order for optimal results:

  - Noise Reduction - Clean the image first
  - Saturation - Adjust color intensity
  - Gamma - Correct brightness
  - Contrast - Enhance separation
  - Sharpening - Final detail enhancement

## Settings
The following settings are available in the module

  - **Saturation (level)**
    - Range: -10 to 10
    - Default: 0 (neutral)
    - Description: Controls color intensity
        - -10: Black & White
        - 0: Original colors
        - 10: Maximum color saturation
    - Use Case: Enhance nebulae, auroras, or reduce color noise in low-light images

  - **Contrast (contrast)**
    - Range: 0 to 5
    - Default: 1.0 (neutral)
    - Description: Controls separation between light and dark areas
        - 1.0: Original contrast
        - > 1.0: Increases contrast
        - < 1.0: Decreases contrast
    - Use Case: Make stars stand out more against the sky background

  - **Gamma (gamma)**
    - Range: 0.1 to 5.0
    - Default: 1.0 (neutral)
    - Description: Brightness control that preserves highlights
        - 1.0: Original brightness
        - > 1.0: Brightens dark areas (lifts shadows)
        - < 1.0: Darkens the image
    - Use Case: Reveal faint stars and detail in dark night skies

  - **Sharpness (sharpness)**
    - Range: 0 to 5
    - Default: 0 (off)
    - Description: Edge enhancement strength
        - 0: No sharpening
        - 1: Mild sharpening
        - 5: Very strong sharpening
    - Use Case: Make stars appear more defined and crisp
    - Note: Apply sparingly to avoid introducing artifacts

  - **Noise Reduction (denoise)**
    - Range: 0 to 5
    - Default: 0 (off)
    - Description: Removes grain and noise
        - 0: No denoising
        - 1-2: Light denoising (preserves faint stars)
        - 3-5: Strong denoising (may blur faint stars)
    - Use Case: Clean up noisy images from high ISO settings
    - Note: Uses bilateral filtering to preserve edges

  - **Smart Contrast (auto_anchor)**
    - Type: Checkbox
    - Default: Off (false)
    - Description: Automatically adjusts brightness when changing contrast
    - Effect: Maintains overall image brightness when contrast is increased/decreased
    - Use Case: Enable when you want to adjust contrast without making the image too bright or dark

## Tips

Tips and Best Practices when using the module

  - Start Small - Begin with subtle adjustments and increase gradually
  - Denoise First - If using noise reduction, the module applies it first automatically
  - Watch for Artifacts - Too much sharpening can introduce halos around bright objects
  - Balance Adjustments - Heavy denoising may require less sharpening
  - Use Smart Contrast - Enable auto_anchor when adjusting contrast to maintain brightness
  - Test Different Times - Settings that work at night may not work during the day


## Available in

=== "Pipelines available In"
    
    <div class="grid cards" markdown>

    -   :fontawesome-solid-sun:{ .lg .middle } __Daytime__

        ---

          - The Day time pipeline

    -   :fontawesome-solid-moon:{ .lg .middle } __Nighttime__

        ---

          - The Night time pipeline


    </div>