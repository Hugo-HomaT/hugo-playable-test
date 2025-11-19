# Homa Playables Unity Plugin

This Unity plugin creates optimized WebGL builds for playable ads, targeting a file size of **3-5MB** (well under the 5MB limit for most ad networks).

**Inspired by Luna Playworks** - Now with advanced SDK exclusion, enhanced variables, and event tracking!

## Features

### Build Optimization
- ✅ **Aggressive Code Stripping**: Removes unused Unity engine code
- ✅ **Gzip Compression**: Compatible with web applications
- ✅ **Optimized Settings**: Minimal memory, no exceptions, no debug symbols
- ✅ **No Unity Branding**: Splash screen and logo disabled (requires Unity Pro/Plus)
- ✅ **Build Size Reporting**: Detailed logs and warnings

### Luna-Inspired Enhancements (NEW!)
- ✅ **SDK Auto-Detection**: Automatically detects and excludes 40+ common SDKs
- ✅ **Enhanced Variables**: Sections, steps, arrays, and asset references
- ✅ **Event Tracking**: Built-in analytics event system
- ✅ **Build Metadata**: Comprehensive build information export
- ✅ **Configuration System**: JSON-based persistent settings

## Installation

1. Copy the `unity-plugin` folder into your Unity project's `Assets/` directory
2. The plugin will appear under `Homa` menu in Unity Editor

## Usage

### 1. Mark Variables for Export

The plugin now supports **enhanced variable attributes** inspired by Luna Playground:

#### Basic Variables
```csharp
using HomaPlayables;

public class GameController : MonoBehaviour
{
    [HomaVar("Player Speed", Min = 1f, Max = 10f, Step = 0.5f)]
    public float playerSpeed = 5f;
    
    [HomaVar("Difficulty", Options = new[] { "Easy", "Medium", "Hard" })]
    public string difficulty = "Medium";
}
```

#### Grouped Variables with Sections
```csharp
[HomaSection("Player Settings")]
[HomaVar("Speed", Min = 1f, Max = 10f)]
public float playerSpeed = 5f;

[HomaVar("Jump Height", Min = 1f, Max = 5f)]
public float jumpHeight = 2f;

[HomaSection("Enemy Settings")]
[HomaVar("Enemy Count", Min = 1f, Max = 20f)]
public int enemyCount = 5;
```

#### Array Variables
```csharp
[HomaVarArray("Enemy Types", MinLength = 1, MaxLength = 5)]
public GameObject[] enemyPrefabs;
```

#### Asset Variables
```csharp
[HomaVarAsset("Player Material")]
public Material playerMaterial;
```

### 2. Track Events

Use the event tracking system for analytics and A/B testing:

```csharp
using HomaPlayables;

public class GameManager : MonoBehaviour
{
    void Start()
    {
        HomaEventTracker.TrackEvent(HomaEventTracker.Events.GAMEPLAY_START);
    }

    void OnTutorialComplete()
    {
        HomaEventTracker.TrackEvent(HomaEventTracker.Events.TUTORIAL_COMPLETE);
    }

    void OnLevelComplete(int level, int score)
    {
        HomaEventTracker.TrackEvent(HomaEventTracker.Events.LEVEL_COMPLETE, 
            new { level = level, score = score, time = Time.time });
    }
}
```

**Available Events:**
- `TUTORIAL_START` / `TUTORIAL_COMPLETE`
- `GAMEPLAY_START`
- `LEVEL_START` / `LEVEL_COMPLETE` / `LEVEL_FAIL`
- `CLICK_ENDCARD`
- `FIRST_INTERACTION`

### 3. Build Playable

1. Open your Unity project
2. Go to **Homa > Build Playable**
3. The plugin will:
   - **Scan for SDKs** and report what will be excluded
   - Apply optimization settings
   - Build WebGL with Gzip compression
   - Export enhanced configuration with metadata
4. The ZIP file will be created at the project root: `HomaPlayable.zip`

### 4. Upload to Homa Playables App

Upload the generated ZIP to the Homa Playables web application to:
- Preview on different devices
- Customize variables (now with sections!)
- Monitor events in real-time
- Export for Mintegral/AppLovin

## SDK Auto-Exclusion

The plugin automatically detects and excludes **40+ common SDKs** to reduce build size:

### Automatically Excluded SDKs:
- **Ad SDKs**: Unity Ads, AdMob, IronSource, Vungle, Fyber, FairBid, InMobi, Facebook Audience Network
- **Analytics**: GameAnalytics, AppsFlyer, Firebase
- **Monetization**: Unity Purchasing, Unity Monetization
- **Tools**: Odin Inspector, SRDebugger, Nice Vibrations, UniWebView

The build console will show a detailed report of detected SDKs and estimated size savings.

## Build Optimization Details

The plugin automatically applies these optimizations:

### Code Optimization
- **Managed Stripping Level**: High (removes unused .NET code)
- **Strip Engine Code**: Enabled (removes unused Unity subsystems)
- **API Compatibility**: .NET Standard 2.1 (smaller than .NET 4.x)
- **Exception Support**: None (reduces code size)

### Compression
- **Format**: Gzip (compatible with web applications)
- **Data Caching**: Enabled (faster subsequent loads)

### Memory
- **Memory Size**: 256MB (minimal allocation)

### Branding
- **Splash Screen**: Disabled
- **Unity Logo**: Disabled

## Configuration Export

The plugin now exports a comprehensive `homa_config.json` with:

```json
{
  "version": "1.0",
  "buildInfo": {
    "unityVersion": "2021.3.0f1",
    "pluginVersion": "1.0.0",
    "buildDate": "2025-11-19T12:00:00Z",
    "compressionFormat": "Gzip"
  },
  "excludedSDKs": ["UnityAds", "GameAnalytics"],
  "variables": [...],
  "events": [...]
}
```

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
- Check the SDK detection report in the console
- Use Unity's Build Report to identify large assets
- Follow the optimization tips below

**Splash screen still appears?**
- Requires Unity Pro or Unity Plus license
- Free Unity versions cannot disable the splash screen

**Build fails?**
- Ensure all scenes are added to Build Settings
- Check for missing dependencies
- Verify WebGL platform is installed

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
- Create a standalone scene for the playable
- The plugin automatically excludes SDKs!

## What's New (Luna-Inspired Features)

This version includes major improvements inspired by **Luna Playworks**:

1. **SDK Auto-Detection** - Automatically finds and excludes 40+ SDKs
2. **Enhanced Variables** - Sections, steps, arrays, and asset references
3. **Event Tracking** - Built-in analytics system with WebGL integration
4. **Build Metadata** - Comprehensive build information export
5. **Configuration System** - JSON-based persistent settings

See `LUNA_COMPARISON.md` for a detailed feature comparison.
