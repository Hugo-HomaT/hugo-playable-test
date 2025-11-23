using System.Collections.Generic;
using System.IO;
using UnityEditor;
using UnityEngine;

namespace HomaPlayables.Editor
{
    /// <summary>
    /// Strips unused Unity modules from Packages/manifest.json during build
    /// </summary>
    public static class ModuleStripper
    {
        private static string _manifestPath;
        private static string _backupPath;
        private static bool _wasStripped = false;

        // Modules to remove (hardcoded safe list)
        // NOTE: com.unity.modules.director removed - Cinemachine depends on it
        // NOTE: com.unity.modules.unitywebrequest is NOT in manifest but required by HomaConfigLoader
        private static readonly string[] MODULES_TO_REMOVE = new string[]
        {
            "com.unity.modules.assetbundle",      // #2 - AssetBundle loading
            "com.unity.modules.screencapture",    // #10 - Screenshots
            "com.unity.modules.tilemap",          // #11 - Tilemaps
            "com.unity.modules.uielements",       // #13 - UI Toolkit
            "com.unity.modules.unityanalytics",   // #15 - Analytics
            "com.unity.modules.video"             // #16 - Video
        };

        public static void StripModules()
        {
            _manifestPath = Path.Combine(Application.dataPath, "../Packages/manifest.json");
            _backupPath = Path.Combine(Application.dataPath, "../Packages/manifest.json.backup");

            if (!File.Exists(_manifestPath))
            {
                Debug.LogWarning("[Homa] manifest.json not found. Skipping module stripping.");
                return;
            }

            // Backup original
            File.Copy(_manifestPath, _backupPath, true);

            // Read manifest
            string json = File.ReadAllText(_manifestPath);
            
            int removedCount = 0;
            bool needsUnityWebRequest = false;
            
            foreach (string module in MODULES_TO_REMOVE)
            {
                // Check if we're removing video module
                if (module == "com.unity.modules.video" && json.Contains($"\"{module}\""))
                {
                    needsUnityWebRequest = true;
                }
                
                // Remove lines containing this module (handles any version number)
                string[] lines = json.Split('\n');
                List<string> newLines = new List<string>();
                
                foreach (string line in lines)
                {
                    if (line.Contains($"\"{module}\""))
                    {
                        removedCount++;
                        Debug.Log($"[Homa] Removing module: {module}");
                        continue; // Skip this line
                    }
                    newLines.Add(line);
                }
                
                json = string.Join("\n", newLines);
            }

            // Add UnityWebRequest module if we removed video (video depends on it)
            if (needsUnityWebRequest && !json.Contains("com.unity.modules.unitywebrequest"))
            {
                // Find the last module line and add unitywebrequest before the closing brace
                int lastModuleLine = json.LastIndexOf("\"com.unity.modules.");
                if (lastModuleLine > 0)
                {
                    int endOfLine = json.IndexOf('\n', lastModuleLine);
                    if (endOfLine > 0)
                    {
                        // Insert after this line
                        string insertion = ",\n    \"com.unity.modules.unitywebrequest\": \"1.0.0\"";
                        json = json.Insert(endOfLine, insertion);
                        Debug.Log("[Homa] Added com.unity.modules.unitywebrequest (required by HomaConfigLoader)");
                    }
                }
            }

            if (removedCount > 0)
            {
                // Clean up trailing commas in JSON
                json = CleanupJson(json);
                
                File.WriteAllText(_manifestPath, json);
                _wasStripped = true;

                // Force Unity to reload packages
                UnityEditor.PackageManager.Client.Resolve();

                Debug.Log($"[Homa] ✓ Stripped {removedCount} unused modules from manifest.json");
            }
            else
            {
                Debug.Log("[Homa] No modules to strip (already removed or not present).");
            }
        }

        public static void RestoreModules()
        {
            if (!_wasStripped) return;

            _manifestPath = Path.Combine(Application.dataPath, "../Packages/manifest.json");
            _backupPath = Path.Combine(Application.dataPath, "../Packages/manifest.json.backup");

            if (File.Exists(_backupPath))
            {
                File.Copy(_backupPath, _manifestPath, true);
                File.Delete(_backupPath);

                // Force Unity to reload packages
                UnityEditor.PackageManager.Client.Resolve();

                Debug.Log("[Homa] ✓ Restored original manifest.json");
                _wasStripped = false;
            }
        }

        /// <summary>
        /// Clean up JSON formatting (remove trailing commas before closing braces)
        /// </summary>
        private static string CleanupJson(string json)
        {
            // Remove trailing comma before closing brace
            json = System.Text.RegularExpressions.Regex.Replace(json, @",(\s*})", "$1");
            return json;
        }
    }
}
