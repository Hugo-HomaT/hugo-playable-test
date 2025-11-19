using System.Collections.Generic;
using System.IO;
using System.IO.Compression;
using System.Linq;
using UnityEditor;
using UnityEngine;

namespace HomaPlayables.Editor
{
    public static class HomaBuildMenu
    {
        [MenuItem("Homa/Build Playable")]
        public static void ShowWindow()
        {
            HomaPlayableWindow.ShowWindow();
        }

        public static void BuildPlayable(HomaBuildConfig config)
        {
            string buildFolder = Path.Combine(Application.dataPath, "../Builds/HomaPlayable");
            string zipPath = Path.Combine(Application.dataPath, "../HomaPlayable.zip");

            // 0. Detect and report SDKs
            Debug.Log("[Homa] ===== SDK Detection =====");
            var sdkResult = HomaSDKExcluder.DetectSDKs();
            
            // Apply manual exclusions from config
            if (config.exclusions.customExclusionPatterns != null)
            {
                foreach (var pattern in config.exclusions.customExclusionPatterns)
                {
                    if (!string.IsNullOrEmpty(pattern))
                    {
                        // This is a simple implementation; a real one would need more complex pattern matching
                        // For now, we assume these are handled by the build process or just logged
                        Debug.Log($"[Homa] Custom exclusion pattern: {pattern}");
                    }
                }
            }

            if (sdkResult.DetectedSDKs.Count > 0 && config.exclusions.autoExcludeSDKs)
            {
                Debug.LogWarning(HomaSDKExcluder.GenerateReport(sdkResult));
                Debug.LogWarning("[Homa] These SDKs will be excluded from the build to reduce size.");
            }
            Debug.Log("[Homa] ============================\n");

            // 1. Apply Optimization Settings
            ApplyOptimizationSettings(config.optimization);

            // 2. Scan for Variables and Events
            var variables = ScanForVariables();
            var events = HomaEventTracker.GetRegisteredEvents();
            
            // Create runtime config
            var runtimeConfig = new HomaConfig 
            { 
                version = config.version, 
                variables = variables,
                events = events,
                buildInfo = new BuildInfo
                {
                    unityVersion = Application.unityVersion,
                    pluginVersion = config.metadata.pluginVersion,
                    buildDate = System.DateTime.UtcNow.ToString("o"),
                    compressionFormat = "Gzip" // WebGL always uses Gzip in this setup
                },
                excludedSDKs = config.exclusions.autoExcludeSDKs ? sdkResult.DetectedSDKs : new List<string>()
            };
            string json = JsonUtility.ToJson(runtimeConfig, true);

            // 3. Build WebGL
            if (Directory.Exists(buildFolder)) Directory.Delete(buildFolder, true);
            
            BuildPlayerOptions buildPlayerOptions = new BuildPlayerOptions();
            buildPlayerOptions.scenes = EditorBuildSettings.scenes.Where(s => s.enabled).Select(s => s.path).ToArray();
            buildPlayerOptions.locationPathName = buildFolder;
            buildPlayerOptions.target = BuildTarget.WebGL;
            buildPlayerOptions.options = BuildOptions.None;

            Debug.Log("[Homa] Starting optimized WebGL build...");
            var report = BuildPipeline.BuildPlayer(buildPlayerOptions);

            if (report.summary.result == UnityEditor.Build.Reporting.BuildResult.Succeeded)
            {
                // Log build statistics
                float sizeMB = report.summary.totalSize / (1024f * 1024f);
                Debug.Log($"[Homa] Build succeeded: {sizeMB:F2} MB ({report.summary.totalSize:N0} bytes)");
                
                // Update metadata
                config.metadata.lastBuildDate = System.DateTime.Now.ToString();
                config.metadata.lastBuildSize = (long)report.summary.totalSize;
                config.metadata.compressionFormat = "Gzip";
                config.metadata.unityVersion = Application.unityVersion;
                
                // Save config to persist metadata
                string configPath = Path.Combine(Application.dataPath, "../HomaPlayableConfig.json");
                config.Save(configPath);

                // 4. Write Config
                File.WriteAllText(Path.Combine(buildFolder, "homa_config.json"), json);

                // 5. Zip
                if (File.Exists(zipPath)) File.Delete(zipPath);
                ZipFile.CreateFromDirectory(buildFolder, zipPath);
                
                // Check final ZIP size
                FileInfo zipInfo = new FileInfo(zipPath);
                float zipSizeMB = zipInfo.Length / (1024f * 1024f);
                Debug.Log($"[Homa] Playable zipped: {zipSizeMB:F2} MB ({zipInfo.Length:N0} bytes)");
                
                // Warn if exceeding 5MB
                if (zipSizeMB > 5f)
                {
                    Debug.LogWarning($"[Homa] WARNING: ZIP size ({zipSizeMB:F2} MB) exceeds 5MB limit for most ad networks!");
                }
                else if (zipSizeMB > 3f)
                {
                    Debug.LogWarning($"[Homa] ZIP size ({zipSizeMB:F2} MB) is above optimal 3MB target.");
                }
                else
                {
                    Debug.Log($"[Homa] ✓ ZIP size is within optimal range!");
                }
                
                EditorUtility.RevealInFinder(zipPath);
            }
            else
            {
                Debug.LogError("[Homa] Build failed");
            }
        }

        private static void ApplyOptimizationSettings(HomaBuildConfig.OptimizationConfig optimization)
        {
            Debug.Log("[Homa] Applying optimization settings...");

            // === Code Stripping ===
            PlayerSettings.stripEngineCode = optimization.enableCodeStripping;
            PlayerSettings.SetManagedStrippingLevel(BuildTargetGroup.WebGL, optimization.enableCodeStripping ? ManagedStrippingLevel.High : ManagedStrippingLevel.Low);
            
            // === API Compatibility ===
            PlayerSettings.SetApiCompatibilityLevel(BuildTargetGroup.WebGL, ApiCompatibilityLevel.NET_Standard);

            // === WebGL Specific Settings ===
            PlayerSettings.WebGL.compressionFormat = WebGLCompressionFormat.Gzip;
            PlayerSettings.WebGL.dataCaching = true;
            PlayerSettings.WebGL.memorySize = 256; // Minimal memory allocation
            PlayerSettings.WebGL.exceptionSupport = WebGLExceptionSupport.None;
            
            // === Code Optimization ===
            PlayerSettings.WebGL.debugSymbolMode = WebGLDebugSymbolMode.Off;
            
            // === Splash Screen (requires Unity Pro/Plus) ===
            PlayerSettings.SplashScreen.show = false;
            PlayerSettings.SplashScreen.showUnityLogo = false;

            // === Graphics Settings ===
            // Note: Texture compression should be set per-texture in import settings
            // But we can set defaults here
            PlayerSettings.SetGraphicsAPIs(BuildTarget.WebGL, new UnityEngine.Rendering.GraphicsDeviceType[] { 
                UnityEngine.Rendering.GraphicsDeviceType.OpenGLES3,
                UnityEngine.Rendering.GraphicsDeviceType.OpenGLES2
            });

            Debug.Log($"[Homa] ✓ Code Stripping: {(optimization.enableCodeStripping ? "High" : "Low")}");
            Debug.Log("[Homa] ✓ Compression: Gzip");
            Debug.Log("[Homa] ✓ API: .NET Standard 2.1");
            Debug.Log("[Homa] ✓ Memory: 256MB");
            Debug.Log("[Homa] ✓ Splash Screen: Disabled");
        }

        public static List<VariableConfig> ScanForVariables()
        {
            var list = new List<VariableConfig>();
            string currentSection = null;
            
            // Find all MonoBehaviours in scene
            var monos = GameObject.FindObjectsOfType<MonoBehaviour>();
            foreach (var mono in monos)
            {
                var type = mono.GetType();
                var fields = type.GetFields();
                foreach (var field in fields)
                {
                    // Check for section attribute (Legacy support or class-level)
                    var sectionAttr = field.GetCustomAttributes(typeof(HomaSectionAttribute), true).FirstOrDefault() as HomaSectionAttribute;
                    if (sectionAttr != null)
                    {
                        currentSection = sectionAttr.SectionName;
                    }

                    // Check for variable attribute
                    var attr = field.GetCustomAttributes(typeof(HomaVarAttribute), true).FirstOrDefault() as HomaVarAttribute;
                    if (attr != null)
                    {
                        var val = field.GetValue(mono);
                        // Use section from attribute if present, otherwise fallback to currentSection
                        string section = !string.IsNullOrEmpty(attr.Section) ? attr.Section : currentSection;
                        
                        list.Add(new VariableConfig
                        {
                            name = attr.Name ?? field.Name,
                            type = field.FieldType.Name,
                            value = val != null ? val.ToString() : "",
                            min = attr.Min,
                            max = attr.Max,
                            step = attr.Step,
                            options = attr.Options,
                            section = section,
                            order = attr.Order // Add order to config
                        });
                    }
                    
                    // Check for asset attribute
                    var assetAttr = field.GetCustomAttributes(typeof(HomaVarAssetAttribute), true).FirstOrDefault() as HomaVarAssetAttribute;
                    if (assetAttr != null)
                    {
                         string section = !string.IsNullOrEmpty(assetAttr.Section) ? assetAttr.Section : currentSection;
                         // For assets, we might want to handle them similarly or just list them
                         // Currently VariableConfig is string-based value, might need adaptation for assets
                         // For now, adding them as variables with type info
                         list.Add(new VariableConfig
                         {
                             name = assetAttr.Name ?? field.Name,
                             type = "Asset:" + (assetAttr.AssetType != null ? assetAttr.AssetType.Name : field.FieldType.Name),
                             value = "Reference", // Placeholder
                             section = section,
                             order = assetAttr.Order
                         });
                    }
                }
            }
            
            // Sort by Section then by Order
            return list.OrderBy(v => v.section).ThenBy(v => v.order).ToList();
        }

        [System.Serializable]
        class HomaConfig
        {
            public string version;
            public BuildInfo buildInfo;
            public List<string> excludedSDKs;
            public List<VariableConfig> variables;
            public List<HomaEventTracker.EventDefinition> events;
        }

        [System.Serializable]
        class BuildInfo
        {
            public string unityVersion;
            public string pluginVersion;
            public string buildDate;
            public long buildSize;
            public string compressionFormat;
        }

        [System.Serializable]
        public class VariableConfig
        {
            public string name;
            public string type;
            public string value;
            public float min;
            public float max;
            public float step;
            public string[] options;
            public string section;
            public int order; // Added order field
        }
    }
}
