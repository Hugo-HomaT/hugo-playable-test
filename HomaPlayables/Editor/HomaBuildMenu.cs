using System.Collections.Generic;
using System.IO;
using System.IO.Compression;
using System.Linq;
using UnityEditor;
using UnityEngine;
using UnityEditor.Build.Reporting;

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
            // 2. Prepare build folder
            string buildFolder = Path.Combine(config.outputDirectory, config.outputFilename);
            if (!Path.IsPathRooted(buildFolder))
            {
                buildFolder = Path.Combine(Application.dataPath, "..", buildFolder);
            }
            
            string zipPath = buildFolder + ".zip";

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

            // Use SettingsRestorer to ensure project settings are reverted after build
            using (new SettingsRestorer())
            {
                var fileHider = new FileHider();
                var textureOptimizer = new TextureOptimizer();
                
                try
                {
                    // 0.5. Hide SDKs (Real Exclusion)
                    if (sdkResult.DetectedSDKs.Count > 0 && config.exclusions.autoExcludeSDKs)
                    {
                        Debug.Log("[Homa] Hiding SDK folders for build...");
                        foreach (var sdkPath in sdkResult.DetectedSDKs)
                        {
                            // sdkPath is relative to Assets, we need full path
                            // But wait, DetectSDKs returns paths found by Directory.GetDirectories which returns full paths?
                            // Let's check HomaSDKExcluder.DetectSDKs implementation.
                            // It returns full paths.
                            fileHider.HideDirectory(sdkPath);
                        }
                        
                        // Force asset database refresh to ensure Unity sees the changes
                        AssetDatabase.Refresh();
                    }

                    // 0.6. Strip Physics 2D
                    if (config.optimization.enablePhysics2DStripping)
                    {
                        PhysicsStripper.StripPhysics2D();
                    }

                    // 0.7. Optimize Textures (The Crusher)
                    if (config.optimization.enableTextureOptimization)
                    {
                        textureOptimizer.OptimizeTextures(config.optimization.maxTextureSize);
                    }

                    // 0.8. Optimize Fonts (DISABLED - needs proper atlas regeneration)
                    // fontOptimizer.OptimizeFonts();

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
                    // Ensure directory exists
                    if (Directory.Exists(buildFolder))
                    {
                        Directory.Delete(buildFolder, true);
                    }
                    Directory.CreateDirectory(buildFolder);
                    
                    BuildPlayerOptions buildPlayerOptions = new BuildPlayerOptions();
                    buildPlayerOptions.scenes = config.scenes.GetEnabledScenes();
                    buildPlayerOptions.locationPathName = buildFolder;
                    buildPlayerOptions.target = BuildTarget.WebGL;
                    buildPlayerOptions.options = BuildOptions.None;

                    Debug.Log("[Homa] Starting optimized WebGL build...");
                    var report = BuildPipeline.BuildPlayer(buildPlayerOptions);

                    if (report.summary.result == BuildResult.Succeeded)
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
                        if (File.Exists(configPath))
                        {
                            config.Save(configPath);
                        }

                        // 4. Write Config
                        File.WriteAllText(Path.Combine(buildFolder, "homa_config.json"), json);

                        // 4.5. Optimize Assets (if enabled)
                        if (config.optimization.enableAssetOptimization)
                        {
                            OptimizeAssets(buildFolder);
                        }

                        // 5. Zip
                        if (File.Exists(zipPath)) File.Delete(zipPath);
                        System.IO.Compression.ZipFile.CreateFromDirectory(buildFolder, zipPath);
                        
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

                        // 6. Analyze Build
                        BuildAnalyzer.AnalyzeBuild(report, buildFolder);
                    }
                    else
                    {
                        Debug.LogError("[Homa] Build failed");
                    }
                }
                finally
                {
                    // Restore everything
                    fileHider.RestoreAll();
                    textureOptimizer.RestoreTextures();
                    // fontOptimizer.RestoreFonts();
                    
                    if (config.optimization.enablePhysics2DStripping)
                    {
                        PhysicsStripper.RestorePhysics2D();
                    }
                }
            } 
        }

        /// <summary>
        /// Optimizes PNG assets in the build folder using pngquant.
        /// </summary>
        private static void OptimizeAssets(string buildFolder)
        {
            Debug.Log("[Homa] Starting asset optimization...");
            
            // Path to pngquant tool
            string pngquantPath = @"C:\Users\hugod\Desktop\6.4.0\tools\pngquant\win64\pngquant.exe";
            
            // Check if tool exists
            if (!System.IO.File.Exists(pngquantPath))
            {
                Debug.LogWarning($"[Homa] pngquant not found at {pngquantPath}. Skipping PNG optimization.");
                return;
            }
            
            // Find all PNG files in build folder
            string[] pngFiles = System.IO.Directory.GetFiles(buildFolder, "*.png", System.IO.SearchOption.AllDirectories);
            
            if (pngFiles.Length == 0)
            {
                Debug.Log("[Homa] No PNG files found to optimize.");
                return;
            }
            
            long totalOriginalSize = 0;
            long totalOptimizedSize = 0;
            int optimizedCount = 0;
            int failedCount = 0;
            
            foreach (string pngFile in pngFiles)
            {
                try
                {
                    // Get original size
                    System.IO.FileInfo originalFile = new System.IO.FileInfo(pngFile);
                    long originalSize = originalFile.Length;
                    totalOriginalSize += originalSize;
                    
                    // Run pngquant: --quality 65-80 --force --ext .png --skip-if-larger <file>
                    var startInfo = new System.Diagnostics.ProcessStartInfo
                    {
                        FileName = pngquantPath,
                        Arguments = $"--quality 65-80 --force --ext .png --skip-if-larger \"{pngFile}\"",
                        UseShellExecute = false,
                        CreateNoWindow = true,
                        RedirectStandardOutput = true,
                        RedirectStandardError = true
                    };
                    
                    using (var process = System.Diagnostics.Process.Start(startInfo))
                    {
                        process.WaitForExit(5000); // 5 second timeout per file
                        
                        // Check result
                        System.IO.FileInfo optimizedFile = new System.IO.FileInfo(pngFile);
                        long optimizedSize = optimizedFile.Length;
                        totalOptimizedSize += optimizedSize;
                        
                        if (optimizedSize < originalSize)
                        {
                            optimizedCount++;
                            float savedKB = (originalSize - optimizedSize) / 1024f;
                            Debug.Log($"[Homa] Optimized: {System.IO.Path.GetFileName(pngFile)} ({originalSize / 1024f:F1} KB → {optimizedSize / 1024f:F1} KB, saved {savedKB:F1} KB)");
                        }
                        else
                        {
                            // File was skipped or not optimized
                            Debug.Log($"[Homa] Skipped: {System.IO.Path.GetFileName(pngFile)} (already optimal)");
                        }
                    }
                }
                catch (System.Exception e)
                {
                    failedCount++;
                    Debug.LogWarning($"[Homa] Failed to optimize {System.IO.Path.GetFileName(pngFile)}: {e.Message}");
                }
            }
            
            // Summary
            float totalSavedMB = (totalOriginalSize - totalOptimizedSize) / (1024f * 1024f);
            Debug.Log($"[Homa] ✓ PNG Optimization Complete: {optimizedCount}/{pngFiles.Length} files optimized, saved {totalSavedMB:F2} MB");
            
            if (failedCount > 0)
            {
                Debug.LogWarning($"[Homa] {failedCount} file(s) failed to optimize.");
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
                        
                        // Determine type and serialize value
                        string typeName = "string";
                        string valueStr = "";
                        string[] options = attr.Options;
                        
                        if (field.FieldType == typeof(int)) 
                        { 
                            typeName = "int"; 
                            valueStr = val.ToString(); 
                        }
                        else if (field.FieldType == typeof(float)) 
                        { 
                            typeName = "float"; 
                            valueStr = ((float)val).ToString(System.Globalization.CultureInfo.InvariantCulture); 
                        }
                        else if (field.FieldType == typeof(bool)) 
                        { 
                            typeName = "bool"; 
                            valueStr = val != null ? ((bool)val).ToString().ToLower() : "false"; 
                        }
                        else if (field.FieldType == typeof(Vector3)) 
                        { 
                            typeName = "vector3"; 
                            valueStr = JsonUtility.ToJson((Vector3)val); 
                        }
                        else if (field.FieldType == typeof(Color)) 
                        { 
                            typeName = "color"; 
                            valueStr = "#" + ColorUtility.ToHtmlStringRGBA((Color)val); 
                        }
                        else if (field.FieldType.IsEnum) 
                        { 
                            typeName = "enum"; 
                            valueStr = val.ToString();
                            if (options == null || options.Length == 0)
                            {
                                options = System.Enum.GetNames(field.FieldType);
                            }
                        }
                        else
                        {
                            valueStr = val != null ? val.ToString() : "";
                        }

                        list.Add(new VariableConfig
                        {
                            name = attr.Name ?? field.Name,
                            type = typeName,
                            value = valueStr,
                            min = attr.Min,
                            max = attr.Max,
                            step = attr.Step,
                            options = options,
                            section = section,
                            order = attr.Order
                        });
                    }
                    
                    // Check for asset attribute
                    var assetAttr = field.GetCustomAttributes(typeof(HomaVarAssetAttribute), true).FirstOrDefault() as HomaVarAssetAttribute;
                    if (assetAttr != null)
                    {
                         string section = !string.IsNullOrEmpty(assetAttr.Section) ? assetAttr.Section : currentSection;
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
            public int order;
        }
    }
}
