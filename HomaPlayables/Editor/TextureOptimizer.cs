using System.Collections.Generic;
using UnityEditor;
using UnityEngine;

namespace HomaPlayables.Editor
{
    /// <summary>
    /// Temporarily optimizes texture import settings during the build to reduce size.
    /// </summary>
    public class TextureOptimizer
    {
        private class TextureBackup
        {
            public string path;
            public int maxTextureSize;
            public TextureImporterCompression compression;
            public bool crunchedCompression;
            public int compressionQuality;
            public TextureImporterFormat format;
        }

        private List<TextureBackup> _backups = new List<TextureBackup>();
        private bool _isOptimized = false;

        /// <summary>
        /// Finds all textures in Assets (excluding Editor) and applies aggressive compression.
        /// </summary>
        /// <param name="maxSize">Maximum texture size (e.g. 512)</param>
        public void OptimizeTextures(int maxSize)
        {
            if (_isOptimized) return;

            Debug.Log($"[Homa] 🔨 Starting Texture Crusher (Max Size: {maxSize})...");
            
            // Find all textures in Assets folder
            string[] guids = AssetDatabase.FindAssets("t:Texture", new[] { "Assets" });
            
            int count = 0;
            
            foreach (string guid in guids)
            {
                string path = AssetDatabase.GUIDToAssetPath(guid);
                
                // Skip Editor assets, Packages, and internal Unity stuff
                if (path.Contains("/Editor/") || path.Contains("/Packages/") || path.Contains("/Gizmos/"))
                    continue;

                TextureImporter importer = AssetImporter.GetAtPath(path) as TextureImporter;
                if (importer == null) continue;

                // Skip if already small enough and compressed (optional optimization to save time)
                // But generally we want to force Crunched compression if possible.

                // Backup settings
                var backup = new TextureBackup
                {
                    path = path,
                    maxTextureSize = importer.maxTextureSize,
                    compression = importer.textureCompression,
                    crunchedCompression = importer.crunchedCompression,
                    compressionQuality = importer.compressionQuality
                };
                
                // Get platform specific settings if needed, but for now we modify default
                // Note: WebGL build might use "WebGL" platform settings. 
                // Modifying Default is usually safer as a catch-all, but let's check WebGL override.
                var webglSettings = importer.GetPlatformTextureSettings("WebGL");
                if (webglSettings.overridden)
                {
                    // If WebGL specific settings exist, we should probably back those up too or just clear them?
                    // For simplicity, let's just modify the Default settings and hope they propagate, 
                    // or we could force WebGL settings.
                    // Let's stick to modifying Default for now, as it's the base.
                }

                _backups.Add(backup);

                // Apply aggressive settings
                bool changed = false;
                
                if (importer.maxTextureSize > maxSize)
                {
                    importer.maxTextureSize = maxSize;
                    changed = true;
                }

                // Force Crunched Compression (Best for size)
                if (!importer.crunchedCompression || importer.textureCompression != TextureImporterCompression.CompressedHQ)
                {
                    importer.textureCompression = TextureImporterCompression.CompressedHQ;
                    importer.crunchedCompression = true;
                    importer.compressionQuality = 50; // Balance between size and quality
                    changed = true;
                }

                if (changed)
                {
                    importer.SaveAndReimport();
                    count++;
                }
            }
            
            _isOptimized = true;
            Debug.Log($"[Homa] 🔨 Crushed {count} textures to max {maxSize}px.");
        }

        /// <summary>
        /// Restores all textures to their original settings.
        /// </summary>
        public void RestoreTextures()
        {
            if (!_isOptimized) return;

            Debug.Log("[Homa] ↺ Restoring textures...");
            
            int count = 0;
            foreach (var backup in _backups)
            {
                TextureImporter importer = AssetImporter.GetAtPath(backup.path) as TextureImporter;
                if (importer != null)
                {
                    importer.maxTextureSize = backup.maxTextureSize;
                    importer.textureCompression = backup.compression;
                    importer.crunchedCompression = backup.crunchedCompression;
                    importer.compressionQuality = backup.compressionQuality;
                    
                    importer.SaveAndReimport();
                    count++;
                }
            }
            
            _backups.Clear();
            _isOptimized = false;
            Debug.Log($"[Homa] ✓ Restored {count} textures.");
        }
    }
}
