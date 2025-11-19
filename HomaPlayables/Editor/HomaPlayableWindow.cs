using System;
using System.Collections.Generic;
using System.IO;
using UnityEditor;
using UnityEngine;

namespace HomaPlayables.Editor
{
    public class HomaPlayableWindow : EditorWindow
    {
        private HomaBuildConfig _config;
        private Vector2 _scrollPosition;
        private int _selectedTab = 0;
        private readonly string[] _tabs = { "Dashboard", "Build Settings", "Variables", "SDKs" };

        [MenuItem("Homa/Playable Window", false, 0)]
        public static void ShowWindow()
        {
            GetWindow<HomaPlayableWindow>("Homa Playables");
        }

        private void OnEnable()
        {
            LoadConfig();
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
            }

            EditorGUILayout.EndHorizontal();
        }
    }
}
