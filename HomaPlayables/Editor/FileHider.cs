using System.Collections.Generic;
using System.IO;
using UnityEngine;
using UnityEditor;

namespace HomaPlayables.Editor
{
    /// <summary>
    /// Utility to temporarily hide directories during build to force Unity to exclude them.
    /// Renames folders to "FolderName~" which Unity ignores.
    /// </summary>
    public class FileHider
    {
        private List<string> _hiddenPaths = new List<string>();

        /// <summary>
        /// Hides a directory by renaming it with a tilde suffix.
        /// </summary>
        public void HideDirectory(string path)
        {
            if (!Directory.Exists(path)) return;

            // Normalize path
            path = Path.GetFullPath(path);
            
            // Avoid double hiding
            if (path.EndsWith("~")) return;

            string hiddenPath = path + "~";

            try
            {
                // If hidden path already exists (e.g. from a crashed previous build), delete it or restore it?
                // Safest is to move content back if original is missing, or delete hidden if original exists.
                if (Directory.Exists(hiddenPath))
                {
                    // If both exist, we have a conflict. Assume original is truth and delete hidden.
                    Directory.Delete(hiddenPath, true);
                }

                Directory.Move(path, hiddenPath);
                
                // Store the ORIGINAL path so we know what to restore to
                _hiddenPaths.Add(path);
                
                // Hide corresponding .meta file if it exists
                string metaPath = path + ".meta";
                string hiddenMetaPath = hiddenPath + ".meta";
                
                if (File.Exists(metaPath))
                {
                    if (File.Exists(hiddenMetaPath)) File.Delete(hiddenMetaPath);
                    File.Move(metaPath, hiddenMetaPath);
                }
                
                Debug.Log($"[Homa] Hidden: {path}");
            }
            catch (System.Exception e)
            {
                Debug.LogError($"[Homa] Failed to hide {path}: {e.Message}");
            }
        }

        /// <summary>
        /// Restores all hidden directories to their original names.
        /// </summary>
        public void RestoreAll()
        {
            // Process in reverse order to handle nested paths correctly (though unlikely for SDKs)
            for (int i = _hiddenPaths.Count - 1; i >= 0; i--)
            {
                string originalPath = _hiddenPaths[i];
                string hiddenPath = originalPath + "~";

                try
                {
                    if (Directory.Exists(hiddenPath))
                    {
                        if (Directory.Exists(originalPath))
                        {
                            // Conflict! Original exists. Merge or delete hidden?
                            // Let's keep original and warn.
                            Debug.LogWarning($"[Homa] Could not restore {originalPath} because it already exists. Keeping current version.");
                        }
                        else
                        {
                            Directory.Move(hiddenPath, originalPath);
                        }
                    }

                    // Restore meta
                    string originalMeta = originalPath + ".meta";
                    string hiddenMeta = hiddenPath + ".meta";
                    
                    if (File.Exists(hiddenMeta))
                    {
                        if (!File.Exists(originalMeta))
                        {
                            File.Move(hiddenMeta, originalMeta);
                        }
                        else
                        {
                            File.Delete(hiddenMeta);
                        }
                    }
                }
                catch (System.Exception e)
                {
                    Debug.LogError($"[Homa] Failed to restore {originalPath}: {e.Message}");
                }
            }
            
            _hiddenPaths.Clear();
            
            // Refresh AssetDatabase to let Unity know files are back
            AssetDatabase.Refresh();
        }
    }
}
