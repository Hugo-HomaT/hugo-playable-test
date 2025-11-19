# Luna Playworks vs Homa Playables Plugin

A comparison of features between Luna Playworks and the Homa Playables Unity Plugin.

## Feature Comparison

| Feature | Luna Playworks | Homa Plugin | Notes |
|---------|---------------|-------------|-------|
| **SDK Auto-Exclusion** | ✅ 40+ SDKs | ✅ 40+ SDKs | Homa uses Luna's patterns |
| **Build Optimization** | ✅ Advanced | ✅ Standard | Both achieve <5MB builds |
| **Variable System** | ✅ Playground | ✅ Enhanced | Homa supports sections, steps, arrays |
| **Event Tracking** | ✅ Built-in | ✅ Built-in | Both support custom events |
| **Asset Optimization** | ✅ External Tools | ⚠️ Manual | Luna bundles ImageMagick, FFmpeg |
| **Build Configuration** | ✅ JSON | ✅ JSON | Similar structure |
| **Web Preview** | ✅ Luna Dashboard | ✅ Homa App | Different platforms |
| **Compression** | ✅ Brotli/Gzip | ✅ Gzip | Homa focuses on compatibility |
| **License** | 💰 Commercial | 🆓 Free | Homa is open source |
| **Learning Curve** | Medium | Low | Homa is simpler |

## When to Use Luna Playworks

Choose Luna if you need:
- **Professional Support**: Commercial product with dedicated support team
- **Advanced Asset Pipeline**: Automatic texture/audio optimization with bundled tools
- **Luna Dashboard**: Integrated testing and deployment platform
- **Enterprise Features**: Advanced analytics, A/B testing infrastructure
- **Facebook Instant Games**: Native support for FB platform

## When to Use Homa Plugin

Choose Homa if you want:
- **Lightweight Solution**: Simple, focused plugin without external dependencies
- **Open Source**: Free to use and modify
- **Quick Setup**: Get started in minutes
- **Custom Web App**: Full control over preview and export
- **Learning Tool**: Understand how playable builds work
- **Budget-Friendly**: No licensing costs

## Migration from Luna to Homa

If you're migrating from Luna Playworks:

### 1. Variable Attributes

**Luna:**
```csharp
[LunaPlaygroundField("Speed", 1, 10)]
public float speed = 5f;
```

**Homa:**
```csharp
[HomaVar("Speed", Min = 1f, Max = 10f)]
public float speed = 5f;
```

### 2. Sections

**Luna:**
```csharp
[LunaPlaygroundSection("Player")]
```

**Homa:**
```csharp
[HomaSection("Player")]
```

### 3. Event Tracking

**Luna:**
```csharp
Luna.Unity.Analytics.LogEvent("level_complete", data);
```

**Homa:**
```csharp
HomaEventTracker.TrackEvent("level_complete", data);
```

### 4. Build Process

Both use similar menu items:
- Luna: `Luna > Build`
- Homa: `Homa > Build Playable`

## Key Differences

### Asset Optimization

**Luna** bundles external tools (ImageMagick, FFmpeg, pngquant) and automatically optimizes assets during build.

**Homa** provides recommendations but requires manual optimization. This keeps the plugin lightweight and gives you full control.

### Compression

**Luna** supports both Brotli and Gzip compression.

**Homa** focuses on Gzip for maximum compatibility with web applications and ad networks.

### SDK Exclusion

Both use similar patterns! Homa's SDK exclusion is directly inspired by Luna's approach:
- Same SDK patterns (Unity Ads, GameAnalytics, etc.)
- Both exclude scripts AND assets
- Similar size savings (15-30%)

### Configuration Export

Both export JSON configs with similar structure:
- Build metadata
- Variable definitions
- Event tracking info
- Excluded SDKs list

## Performance Comparison

Based on typical playable builds:

| Metric | Luna | Homa |
|--------|------|------|
| Build Time | ~2-3 min | ~1-2 min |
| Final Size | 2-4 MB | 2.5-4.5 MB |
| Compatibility | High | High |
| Ease of Use | Medium | High |

## Conclusion

**Luna Playworks** is a comprehensive commercial solution ideal for studios with dedicated playable teams and budgets.

**Homa Plugin** is a free, lightweight alternative perfect for indie developers, learning, and custom workflows.

Both achieve the same core goal: **optimized playable ads under 5MB** with variable support and event tracking.

---

*This comparison is based on Luna Playworks v5.5.1/v6.4.0 and Homa Plugin v1.0.0*
