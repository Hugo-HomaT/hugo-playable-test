using System.IO;
using UnityEngine;
using UnityEditor;
using UnityEditor.PackageManager;

namespace HomaPlayables.Editor
{
    /// <summary>
    /// Utility to strip Physics 2D module from the project manifest during build.
    /// </summary>
    public static class PhysicsStripper
    {
        private const string PHYSICS_2D_PACKAGE = "com.unity.modules.physics2d";
        private static bool _wasStripped = false;

        /// <summary>
        /// Removes Physics 2D from manifest.json if present.
        /// </summary>
        public static void StripPhysics2D()
        {
            string manifestPath = Path.Combine(Application.dataPath, "..", "Packages", "manifest.json");
            if (!File.Exists(manifestPath))
            {
                Debug.LogError("[Homa] Packages/manifest.json not found!");
                return;
            }

            string json = File.ReadAllText(manifestPath);
            if (json.Contains(PHYSICS_2D_PACKAGE))
            {
                Debug.Log("[Homa] Stripping Physics 2D module...");
                
                // Simple string replacement to remove the line
                // Regex would be safer but this is usually robust enough for manifest.json
                // We look for the line with the package and remove it.
                
                var lines = new System.Collections.Generic.List<string>(File.ReadAllLines(manifestPath));
                int removedCount = lines.RemoveAll(line => line.Contains(PHYSICS_2D_PACKAGE));
                
                if (removedCount > 0)
                {
                    File.WriteAllLines(manifestPath, lines);
                    _wasStripped = true;
                    
                    // Force resolve to apply changes immediately
                    Client.Resolve();
                    
                    // Wait for file system to catch up?
                    // Let's verify it's actually gone
                    int safety = 0;
                    while (File.ReadAllText(manifestPath).Contains(PHYSICS_2D_PACKAGE) && safety < 10)
                    {
                        System.Threading.Thread.Sleep(100);
                        safety++;
                    }

                    Debug.Log("[Homa] Physics 2D module removed from manifest.");
                }
            }
        }

        /// <summary>
        /// Restores Physics 2D module if it was stripped.
        /// </summary>
        public static void RestorePhysics2D()
        {
            if (!_wasStripped) return;

            Debug.Log("[Homa] Restoring Physics 2D module...");
            
            // Re-add the package using Client API which is safer than editing JSON manually for addition
            Client.Add(PHYSICS_2D_PACKAGE);
            
            _wasStripped = false;
        }
    }
}
