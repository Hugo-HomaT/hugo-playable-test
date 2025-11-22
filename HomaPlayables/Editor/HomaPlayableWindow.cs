using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using UnityEditor;
using UnityEngine;

namespace HomaPlayables.Editor
{
    public class HomaPlayableWindow : EditorWindow
    {
        private HomaBuildConfig _config;
        private AnalysisResult _analysis;
        private Vector2 _scrollPosition;
        private int _selectedTab = 0;
        private readonly string[] _tabs = { "Dashboard", "Build Settings", "Variables", "SDKs", "Analysis" };

        [MenuItem("Homa/Playable Window", false, 0)]
        public static void ShowWindow()
        {
            GetWindow<HomaPlayableWindow>("Homa Playables");
        }

        private void OnEnable()
        {
            LoadConfig();
            LoadAnalysis();
        }

        private void LoadConfig()
        {
            // Try to find existing config or create new one
            string configPath = Path.Combine(Application.dataPath, "../HomaPlayableConfig.json");
            _config = HomaBuildConfig.Load(configPath);
        }

        private void SaveConfig()
        {
            string configPath = Path.Combine(Application.dataPath, "../HomaPlayableConfig.json");
            _config.Save(configPath);
        }

        private void LoadAnalysis()
        {
            string analysisPath = Path.Combine(Application.dataPath, "../HomaAnalysis.json");
            if (File.Exists(analysisPath))
            {
                try
                {
                    string json = File.ReadAllText(analysisPath);
                    _analysis = JsonUtility.FromJson<AnalysisResult>(json);
                }
                catch (Exception e)
                {
                    Debug.LogWarning($"[Homa] Failed to load analysis: {e.Message}");
                }
            }
        }

        private void OnGUI()
        {
            if (_config == null) LoadConfig();

            EditorGUILayout.Space();
            GUILayout.Label("Homa Playables", EditorStyles.boldLabel);
            EditorGUILayout.Space();

            _selectedTab = GUILayout.Toolbar(_selectedTab, _tabs);
            EditorGUILayout.Space();

            _scrollPosition = EditorGUILayout.BeginScrollView(_scrollPosition);

            switch (_selectedTab)
            {
                case 0:
                    DrawDashboard();
                    break;
                case 1:
                    DrawBuildSettings();
                    break;
                case 2:
                    DrawVariables();
                    break;
                case 3:
                    DrawSDKs();
                    break;
                case 4:
                    DrawAnalysis();
                    break;
            }

            EditorGUILayout.EndScrollView();
            
            EditorGUILayout.Space();
            DrawFooter();
        }

        private void DrawDashboard()
        {
            EditorGUILayout.LabelField("Project Info", EditorStyles.boldLabel);
            EditorGUILayout.HelpBox($"Unity Version: {Application.unityVersion}\nPlugin Version: {_config.metadata.pluginVersion}", MessageType.Info);

            EditorGUILayout.Space();
            EditorGUILayout.LabelField("Last Build", EditorStyles.boldLabel);
            if (!string.IsNullOrEmpty(_config.metadata.lastBuildDate))
            {
                EditorGUILayout.LabelField("Date:", _config.metadata.lastBuildDate);
                EditorGUILayout.LabelField("Size:", EditorUtility.FormatBytes(_config.metadata.lastBuildSize));
                EditorGUILayout.LabelField("Compression:", _config.metadata.compressionFormat);
            }
            else
            {
                EditorGUILayout.LabelField("No builds yet.");
            }
        }

        private void DrawBuildSettings()
        {
            EditorGUILayout.LabelField("Build Configuration", EditorStyles.boldLabel);
            
            EditorGUI.BeginChangeCheck();

            _config.optimization.enableCodeStripping = EditorGUILayout.Toggle("Strip Engine Code", _config.optimization.enableCodeStripping);
            _config.optimization.enablePhysics2DStripping = EditorGUILayout.Toggle("Strip Physics 2D", _config.optimization.enablePhysics2DStripping);
            _config.optimization.enableTextureOptimization = EditorGUILayout.Toggle("Optimize Textures", _config.optimization.enableTextureOptimization);
            
            if (_config.optimization.enableTextureOptimization)
            {
                EditorGUI.indentLevel++;
                _config.optimization.maxTextureSize = EditorGUILayout.IntPopup("Max Texture Size", _config.optimization.maxTextureSize, 
                    new string[] { "512", "1024", "2048" }, new int[] { 512, 1024, 2048 });
                EditorGUI.indentLevel--;
            }

            _config.optimization.enableAudioOptimization = EditorGUILayout.Toggle("Optimize Audio", _config.optimization.enableAudioOptimization);
            if (_config.optimization.enableAudioOptimization)
            {
                EditorGUI.indentLevel++;
                _config.optimization.convertAudioToMono = EditorGUILayout.Toggle("Force Mono", _config.optimization.convertAudioToMono);
                EditorGUI.indentLevel--;
            }

            EditorGUILayout.Space();
            EditorGUILayout.LabelField("Advanced Compression", EditorStyles.boldLabel);
            _config.optimization.enableAssetOptimization = EditorGUILayout.Toggle("Optimize PNG Assets", _config.optimization.enableAssetOptimization);
            EditorGUILayout.HelpBox("Uses pngquant to compress PNG files in the build output. Requires external tools installed.", MessageType.Info);
            
            _config.optimization.useBrotliArchive = EditorGUILayout.Toggle("Use Brotli Archive (Experimental)", _config.optimization.useBrotliArchive);
            if (_config.optimization.useBrotliArchive)
            {
                EditorGUILayout.HelpBox("Brotli compression may not be compatible with all platforms. Use for testing only.", MessageType.Warning);
            }

            if (EditorGUI.EndChangeCheck())
            {
                SaveConfig();
            }

            EditorGUILayout.Space();
            EditorGUILayout.LabelField("Output Configuration", EditorStyles.boldLabel);
            EditorGUI.BeginChangeCheck();
            
            EditorGUILayout.BeginHorizontal();
            _config.outputDirectory = EditorGUILayout.TextField("Output Directory", _config.outputDirectory);
            if (GUILayout.Button("...", GUILayout.Width(30)))
            {
                string path = EditorUtility.OpenFolderPanel("Select Output Directory", _config.outputDirectory, "");
                if (!string.IsNullOrEmpty(path))
                {
                    // Make relative if possible
                    if (path.StartsWith(Application.dataPath))
                    {
                        path = FileUtil.GetProjectRelativePath(path);
                    }
                    _config.outputDirectory = path;
                }
            }
            EditorGUILayout.EndHorizontal();

            _config.outputFilename = EditorGUILayout.TextField("Output Filename", _config.outputFilename);
            EditorGUILayout.HelpBox($"Build will be saved to: {_config.outputDirectory}/{_config.outputFilename}.zip", MessageType.None);

            if (EditorGUI.EndChangeCheck())
            {
                SaveConfig();
            }
        }

        private List<HomaBuildMenu.VariableConfig> _detectedVariables;

        private void DrawVariables()
        {
            EditorGUILayout.LabelField("Playable Variables", EditorStyles.boldLabel);
            EditorGUILayout.HelpBox("Variables marked with [HomaVar] in your scripts will appear here during build.", MessageType.Info);
            
            if (GUILayout.Button("Scan for Variables Now"))
            {
                _detectedVariables = HomaBuildMenu.ScanForVariables();
            }

            if (_detectedVariables != null && _detectedVariables.Count > 0)
            {
                EditorGUILayout.Space();
                EditorGUILayout.LabelField($"Found {_detectedVariables.Count} variables:", EditorStyles.boldLabel);
                
                string currentSection = null;
                
                // Variables are already sorted by Section then Order from ScanForVariables
                foreach (var v in _detectedVariables)
                {
                    // Start new section group if needed
                    if (v.section != currentSection)
                    {
                        if (currentSection != null) EditorGUI.indentLevel--;
                        
                        currentSection = v.section;
                        EditorGUILayout.Space();
                        // Use a bold label for the section header
                        EditorGUILayout.LabelField(string.IsNullOrEmpty(currentSection) ? "Default" : currentSection, EditorStyles.boldLabel);
                        EditorGUI.indentLevel++;
                    }

                    EditorGUILayout.BeginHorizontal();
                    EditorGUILayout.LabelField($"{v.name}", GUILayout.Width(200));
                    EditorGUILayout.LabelField($"({v.type})", EditorStyles.miniLabel);
                    EditorGUILayout.EndHorizontal();
                }
                if (currentSection != null) EditorGUI.indentLevel--;
            }
            else if (_detectedVariables != null)
            {
                EditorGUILayout.LabelField("No variables found.");
            }
        }

        private void DrawSDKs()
        {
            EditorGUILayout.LabelField("SDK Management", EditorStyles.boldLabel);
            
            EditorGUI.BeginChangeCheck();
            _config.exclusions.autoExcludeSDKs = EditorGUILayout.Toggle("Auto-Exclude SDKs", _config.exclusions.autoExcludeSDKs);
            if (EditorGUI.EndChangeCheck()) SaveConfig();

            if (_config.exclusions.autoExcludeSDKs)
            {
                EditorGUILayout.HelpBox("Known ad network SDKs (Unity Ads, IronSource, etc.) will be automatically excluded from the build to save space.", MessageType.Info);
            }

            EditorGUILayout.Space();
            EditorGUILayout.LabelField("Custom Exclusions", EditorStyles.boldLabel);
            // Simple list for custom exclusions
            for (int i = 0; i < _config.exclusions.customExclusionPatterns.Count; i++)
            {
                EditorGUILayout.BeginHorizontal();
                _config.exclusions.customExclusionPatterns[i] = EditorGUILayout.TextField(_config.exclusions.customExclusionPatterns[i]);
                if (GUILayout.Button("X", GUILayout.Width(20)))
                {
                    _config.exclusions.customExclusionPatterns.RemoveAt(i);
                    SaveConfig();
                }
                EditorGUILayout.EndHorizontal();
            }

            if (GUILayout.Button("Add Exclusion Pattern"))
            {
                _config.exclusions.customExclusionPatterns.Add("");
                SaveConfig();
            }
        }

        private void DrawAnalysis()
        {
            if (_analysis == null)
            {
                EditorGUILayout.HelpBox("No build analysis available. Build your playable to see detailed analysis.", MessageType.Info);
                
                if (GUILayout.Button("Refresh Analysis"))
                {
                    LoadAnalysis();
                }
                return;
            }

            EditorGUILayout.LabelField("Build Analysis", EditorStyles.boldLabel);
            EditorGUILayout.LabelField($"Date: {_analysis.buildDate}");
            EditorGUILayout.LabelField($"Total Size: {EditorUtility.FormatBytes(_analysis.totalSize)}");
            EditorGUILayout.LabelField($"Duration: {_analysis.duration}");
            
            EditorGUILayout.Space();
            
            // Category Breakdown
            if (_analysis.categories != null && _analysis.categories.Count > 0)
            {
                EditorGUILayout.LabelField("📦 Asset Breakdown", EditorStyles.boldLabel);
                
                foreach (var category in _analysis.categories)
                {
                    EditorGUILayout.BeginHorizontal();
                    EditorGUILayout.LabelField(category.name, GUILayout.Width(150));
                    EditorGUILayout.LabelField(category.size, GUILayout.Width(80));
                    EditorGUILayout.LabelField(category.percent, GUILayout.Width(60));
                    
                    // Visual bar
                    float percentValue = 0;
                    if (float.TryParse(category.percent.Replace("%", "").Trim(), out percentValue))
                    {
                        Rect rect = GUILayoutUtility.GetRect(100, 18);
                        EditorGUI.ProgressBar(rect, percentValue / 100f, "");
                    }
                    
                    EditorGUILayout.EndHorizontal();
                }
                
                EditorGUILayout.Space();
            }
            
            // Top Assets
            if (_analysis.topAssets != null && _analysis.topAssets.Count > 0)
            {
                EditorGUILayout.LabelField($"🏆 Largest Assets ({_analysis.topAssets.Count} total)", EditorStyles.boldLabel);
                EditorGUILayout.HelpBox("Click any asset to select it in the Project window", MessageType.Info);
                
                // Table header
                EditorGUILayout.BeginHorizontal(EditorStyles.toolbar);
                EditorGUILayout.LabelField("Asset Name", EditorStyles.boldLabel, GUILayout.Width(300));
                EditorGUILayout.LabelField("Size", EditorStyles.boldLabel, GUILayout.Width(100));
                EditorGUILayout.EndHorizontal();
                
                // Scrollable list of ALL assets
                foreach (var asset in _analysis.topAssets)
                {
                    EditorGUILayout.BeginHorizontal();
                    
                    // Create a selectable label that acts like a button
                    GUIStyle style = new GUIStyle(GUI.skin.label);
                    style.normal.textColor = new Color(0.3f, 0.5f, 1f); // Blue color
                    style.hover.textColor = new Color(0.5f, 0.7f, 1f);  // Lighter blue on hover
                    style.active.textColor = Color.white;
                    
                    string displayName = asset.path;
                    if (displayName.StartsWith("Assets/"))
                    {
                        displayName = displayName.Substring(7); // Remove "Assets/" prefix for cleaner display
                    }
                    
                    if (GUILayout.Button(displayName, style, GUILayout.Width(300)))
                    {
                        // Select the asset in the Project window
                        UnityEngine.Object obj = AssetDatabase.LoadAssetAtPath<UnityEngine.Object>(asset.path);
                        if (obj != null)
                        {
                            Selection.activeObject = obj;
                            EditorGUIUtility.PingObject(obj);
                        }
                        else
                        {
                            Debug.LogWarning($"[Homa] Could not find asset: {asset.path}");
                        }
                    }
                    
                    EditorGUILayout.LabelField(asset.size, GUILayout.Width(100));
                    EditorGUILayout.EndHorizontal();
                }
                
                EditorGUILayout.Space();
            }
            
            // Tips
            if (_analysis.tips != null && _analysis.tips.Count > 0)
            {
                EditorGUILayout.LabelField("💡 Optimization Tips", EditorStyles.boldLabel);
                
                foreach (var tip in _analysis.tips)
                {
                    EditorGUILayout.HelpBox(tip, MessageType.Info);
                }
            }
            
            EditorGUILayout.Space();
            
            if (GUILayout.Button("Refresh Analysis"))
            {
                LoadAnalysis();
            }
        }

        private void DrawFooter()
        {
            EditorGUILayout.BeginHorizontal();
            
            if (GUILayout.Button("Open Build Folder", GUILayout.Height(30)))
            {
                string buildFolder = Path.Combine(Application.dataPath, "../Builds/HomaPlayable");
                if (Directory.Exists(buildFolder))
                {
                    EditorUtility.RevealInFinder(buildFolder);
                }
                else
                {
                    Debug.LogWarning("Build folder does not exist yet.");
                }
            }

            if (GUILayout.Button("Build Playable", GUILayout.Height(30)))
            {
                SaveConfig();
                HomaBuildMenu.BuildPlayable(_config);
                // Reload analysis after build
                EditorApplication.delayCall += LoadAnalysis;
            }

            EditorGUILayout.EndHorizontal();
        }
    }
}
