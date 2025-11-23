using System.Collections.Generic;
using System.Linq;
using UnityEditor;
using UnityEngine;

namespace HomaPlayables.Editor
{
    /// <summary>
    /// Analyzes the project to detect which Unity modules are actually being used.
    /// </summary>
    public static class ModuleAnalyzer
    {
        [MenuItem("Homa/Analyze Used Modules")]
        public static void AnalyzeModules()
        {
            var usedModules = AnalyzeProject();
            GenerateReport(usedModules, showDialog: true);
        }
        
        /// <summary>
        /// Silent version for automatic execution during builds
        /// </summary>
        public static void AnalyzeAndGenerateLinkXml()
        {
            var usedModules = AnalyzeProject();
            GenerateReport(usedModules, showDialog: false);
        }
        
        private static HashSet<string> AnalyzeProject()
        {
            var usedModules = new HashSet<string>();
            
            // Scan all scripts in the project
            string[] scriptGuids = AssetDatabase.FindAssets("t:MonoScript", new[] { "Assets" });
            
            foreach (string guid in scriptGuids)
            {
                string path = AssetDatabase.GUIDToAssetPath(guid);
                if (path.Contains("/Editor/")) continue; // Skip editor scripts
                
                MonoScript script = AssetDatabase.LoadAssetAtPath<MonoScript>(path);
                if (script == null) continue;
                
                var scriptClass = script.GetClass();
                if (scriptClass == null) continue;
                
                // Check what the script inherits from and uses
                DetectModulesFromType(scriptClass, usedModules);
            }
            
            // Scan all prefabs and scene objects
            ScanPrefabsAndScenes(usedModules);
            
            return usedModules;
        }
        
        private static void DetectModulesFromType(System.Type type, HashSet<string> usedModules)
        {
            if (type == null) return;
            
            // Check base types
            var baseType = type.BaseType;
            while (baseType != null && baseType != typeof(object))
            {
                CheckTypeForModule(baseType, usedModules);
                baseType = baseType.BaseType;
            }
            
            // Check fields
            var fields = type.GetFields(System.Reflection.BindingFlags.Public | System.Reflection.BindingFlags.NonPublic | System.Reflection.BindingFlags.Instance);
            foreach (var field in fields)
            {
                CheckTypeForModule(field.FieldType, usedModules);
            }
        }
        
        private static void CheckTypeForModule(System.Type type, HashSet<string> usedModules)
        {
            if (type == null) return;
            
            string typeName = type.FullName ?? type.Name;
            
            // Map types to modules
            if (typeName.Contains("Rigidbody") || typeName.Contains("Collider") || typeName.Contains("Physics"))
                usedModules.Add("PhysicsModule");
            if (typeName.Contains("Rigidbody2D") || typeName.Contains("Collider2D") || typeName.Contains("Physics2D"))
                usedModules.Add("Physics2DModule");
            if (typeName.Contains("Animator") || typeName.Contains("Animation"))
                usedModules.Add("AnimationModule");
            if (typeName.Contains("ParticleSystem"))
                usedModules.Add("ParticleSystemModule");
            if (typeName.Contains("AudioSource") || typeName.Contains("AudioClip"))
                usedModules.Add("AudioModule");
            if (typeName.Contains("VideoPlayer"))
                usedModules.Add("VideoModule");
            if (typeName.Contains("Terrain"))
                usedModules.Add("TerrainModule");
            if (typeName.Contains("Tilemap"))
                usedModules.Add("TilemapModule");
            if (typeName.Contains("NavMesh") || typeName.Contains("AI."))
                usedModules.Add("AIModule");
            if (typeName.Contains("UI.") || typeName.Contains("Canvas") || typeName.Contains("Button"))
                usedModules.Add("UIModule");
        }
        
        private static void ScanPrefabsAndScenes(HashSet<string> usedModules)
        {
            // Scan prefabs
            string[] prefabGuids = AssetDatabase.FindAssets("t:Prefab", new[] { "Assets" });
            foreach (string guid in prefabGuids)
            {
                string path = AssetDatabase.GUIDToAssetPath(guid);
                GameObject prefab = AssetDatabase.LoadAssetAtPath<GameObject>(path);
                if (prefab != null)
                {
                    ScanGameObject(prefab, usedModules);
                }
            }
        }
        
        private static void ScanGameObject(GameObject go, HashSet<string> usedModules)
        {
            // Check all components
            var components = go.GetComponents<Component>();
            foreach (var comp in components)
            {
                if (comp == null) continue;
                CheckTypeForModule(comp.GetType(), usedModules);
            }
            
            // Recursively check children
            foreach (Transform child in go.transform)
            {
                ScanGameObject(child.gameObject, usedModules);
            }
        }
        
        private static void GenerateReport(HashSet<string> usedModules, bool showDialog)
        {
            string report = "# Unity Module Usage Analysis\n\n";
            report += "## Modules USED in Your Project:\n";
            
            if (usedModules.Count == 0)
            {
                report += "- None detected (only core modules)\n";
            }
            else
            {
                foreach (var module in usedModules.OrderBy(m => m))
                {
                    report += $"- ✓ {module}\n";
                }
            }
            
            report += "\n## Modules You Can SAFELY Strip:\n";
            
            var allModules = new List<string>
            {
                "AIModule", "AnimationModule", "AudioModule", "ClothModule",
                "DirectorModule", "GridModule", "ParticleSystemModule",
                "Physics2DModule", "PhysicsModule", "TerrainModule",
                "TerrainPhysicsModule", "TilemapModule", "UIModule",
                "VehiclesModule", "VideoModule", "VRModule", "WindModule", "XRModule"
            };
            
            var unusedModules = allModules.Except(usedModules).ToList();
            
            foreach (var module in unusedModules)
            {
                report += $"- ✗ {module}\n";
            }
            
            Debug.Log(report);
            
            // Auto-generate and save link.xml
            GenerateLinkXml(unusedModules);
            
            // Show dialog only if requested (manual run)
            if (showDialog)
            {
                EditorUtility.DisplayDialog("Module Analysis Complete", 
                    $"Used Modules: {usedModules.Count}\n" +
                    $"Unused Modules: {unusedModules.Count}\n\n" +
                    $"Generated link.xml with {unusedModules.Count} modules to strip.", 
                    "OK");
            }
        }
        
        public static void GenerateLinkXml(List<string> unusedModules)
        {
            string linkXmlPath = System.IO.Path.Combine(UnityEngine.Application.dataPath, "link.xml");
            
            var sb = new System.Text.StringBuilder();
            sb.AppendLine("<linker>");
            sb.AppendLine("  <!-- Auto-generated by Homa Module Analyzer -->");
            sb.AppendLine("  <!-- Strips unused Unity modules to reduce build size -->");
            sb.AppendLine();
            
            foreach (var module in unusedModules.OrderBy(m => m))
            {
                sb.AppendLine($"  <assembly fullname=\"UnityEngine.{module}\" preserve=\"nothing\"/>");
            }
            
            sb.AppendLine("</linker>");
            
            System.IO.File.WriteAllText(linkXmlPath, sb.ToString());
            AssetDatabase.Refresh();
            
            Debug.Log($"[Homa] ✓ Generated link.xml with {unusedModules.Count} modules to strip: {linkXmlPath}");
        }
    }
}
