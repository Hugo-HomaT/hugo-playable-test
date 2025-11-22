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
        /// <param name="maxSize">Default maximum texture size (e.g. 512)</param>
        /// <param name="overrides">Per-texture size overrides</param>
        public void OptimizeTextures(int maxSize, List<HomaBuildConfig.TextureOverride> overrides = null)
        {
            if (_isOptimized) return;

            Debug.Log($"[Homa] 🔨 Starting Texture Crusher (Default Max Size: {maxSize})...");
            
            // Find all textures in Assets folder
            string[] guids = AssetDatabase.FindAssets("t:Texture", new[] { "Assets" });
            
            int count = 0;
            int overrideCount = 0;
            
            foreach (string guid in guids)
            {
                string path = AssetDatabase.GUIDToAssetPath(guid);
                
                // Skip Editor assets, Packages, and internal Unity stuff
                if (path.Contains("/Editor/") || path.Contains("/Packages/") || path.Contains("/Gizmos/"))
                    continue;

                TextureImporter importer = AssetImporter.GetAtPath(path) as TextureImporter;
                if (importer == null) continue;

                // Check for per-texture override
                int targetSize = maxSize;
                if (overrides != null)
                {
                    var textureOverride = overrides.Find(o => o.path == path);
                    if (textureOverride != null)
                    {
                        targetSize = textureOverride.maxSize;
                        overrideCount++;
                    }
                }

                // Backup settings
                var backup = new TextureBackup
                {
                    path = path,
                    maxTextureSize = importer.maxTextureSize,
                    compression = importer.textureCompression,
                    crunchedCompression = importer.crunchedCompression,
                    compressionQuality = importer.compressionQuality
                };

                _backups.Add(backup);

                // Apply aggressive settings
                bool changed = false;
                
                if (importer.maxTextureSize > targetSize)
                {
                    importer.maxTextureSize = targetSize;
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
            Debug.Log($"[Homa] 🔨 Crushed {count} textures (Default: {maxSize}px, {overrideCount} with custom sizes).");
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
