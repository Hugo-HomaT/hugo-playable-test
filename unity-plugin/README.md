# Homa Playables Unity Plugin

This Unity plugin creates optimized WebGL builds for playable ads, targeting a file size of **3-5MB** (well under the 5MB limit for most ad networks).

## Features

- ✅ **Aggressive Code Stripping**: Removes unused Unity engine code
- ✅ **Brotli Compression**: 15-20% smaller than Gzip
- ✅ **Optimized Settings**: Minimal memory, no exceptions, no debug symbols
- ✅ **No Unity Branding**: Splash screen and logo disabled (requires Unity Pro/Plus)
- ✅ **Build Size Reporting**: Detailed logs and warnings
- ✅ **Variable System**: Expose game parameters for A/B testing

## Installation

1. Copy the `unity-plugin` folder into your Unity project's `Assets/` directory
2. The plugin will appear under `Homa` menu in Unity Editor

## Usage

### 1. Mark Variables for Export

Use the `[HomaVar]` attribute to expose variables:

```csharp
using HomaPlayables.Editor;

public class GameController : MonoBehaviour
{
    [HomaVar("Player Speed", Min = 1f, Max = 10f)]
    public float playerSpeed = 5f;
    
    [HomaVar("Difficulty", Options = new[] { "Easy", "Medium", "Hard" })]
    public string difficulty = "Medium";
}
```

### 2. Build Playable

1. Open your Unity project
2. Go to **Homa > Build Playable**
3. Wait for the build to complete
4. The ZIP file will be created at the project root: `HomaPlayable.zip`

### 3. Upload to Homa Playables App

Upload the generated ZIP to the Homa Playables web application to:
- Preview on different devices
- Customize variables
- Export for Mintegral/AppLovin

## Build Optimization Details

The plugin automatically applies these optimizations:

### Code Optimization
- **Managed Stripping Level**: High (removes unused .NET code)
- **Strip Engine Code**: Enabled (removes unused Unity subsystems)
- **API Compatibility**: .NET Standard 2.1 (smaller than .NET 4.x)
- **Exception Support**: None (reduces code size)

### Compression
- **Format**: Brotli (best compression for WebGL)
- **Data Caching**: Enabled (faster subsequent loads)

### Memory
- **Memory Size**: 256MB (minimal allocation)

### Branding
- **Splash Screen**: Disabled
- **Unity Logo**: Disabled

## Further Optimization Tips

If your build still exceeds 5MB, consider:

### Textures
- Use **Crunch compression** in texture import settings
- Set max texture size to **1024x1024** (or 512x512 for backgrounds)
- Use power-of-two resolutions (512, 1024, 2048)
- Remove mipmaps for UI elements

### Audio
- Convert stereo to **mono**
- Lower bitrate to **160 Kbit/sec**
- Use **Vorbis** or **MP3** compression

### Models
- Use low-poly models
- Enable **mesh compression** in import settings
- Combine meshes to reduce draw calls

### Code
- Remove unused scripts and assets
- Avoid including entire SDKs (analytics, ads, etc.)
- Create a standalone scene for the playable

## Build Size Targets

- **Optimal**: < 3MB
- **Good**: 3-5MB
- **Warning**: > 5MB (may be rejected by ad networks)

The plugin will log warnings if your build exceeds these thresholds.

## Requirements

- Unity 2020.3 or later
- WebGL build support installed
- Unity Pro or Plus (for splash screen removal)

## Troubleshooting

**Build is still too large?**
- Check the Unity Console for size breakdown
- Use Unity's Build Report to identify large assets
- Consider using Asset Bundles for heavy content

**Splash screen still appears?**
- Requires Unity Pro or Unity Plus license
- Free Unity versions cannot disable the splash screen

**Build fails?**
- Ensure all scenes are added to Build Settings
- Check for missing dependencies
- Verify WebGL platform is installed
