using System;
using System.Collections.Generic;
using UnityEngine;

namespace HomaPlayables.Editor
{
    /// <summary>
    /// Build configuration system inspired by Luna Playworks.
    /// Stores persistent build settings in JSON format.
    /// </summary>
    [Serializable]
    public class HomaBuildConfig
    {
        public string version = "1.0";
        public SceneConfig scenes = new SceneConfig();
        public ExclusionConfig exclusions = new ExclusionConfig();
        public OptimizationConfig optimization = new OptimizationConfig();
        public BuildMetadata metadata = new BuildMetadata();

        [Serializable]
        public class SceneConfig
        {
            public List<string> scenePaths = new List<string>();
            public int startupSceneIndex = 0;
        }

        [Serializable]
        public class ExclusionConfig
        {
            public bool autoExcludeSDKs = true;
            public List<string> customExclusionPatterns = new List<string>();
            public List<string> forceIncludePatterns = new List<string>();
        }

        [Serializable]
        public class OptimizationConfig
        {
            public bool enableCodeStripping = true;
            public bool enableTextureOptimization = true;
            public bool enableAudioOptimization = true;
            public int maxTextureSize = 1024;
            public bool convertAudioToMono = true;
        }

        [Serializable]
        public class BuildMetadata
        {
            public string lastBuildDate;
            public string unityVersion;
            public string pluginVersion = "1.0.0";
            public long lastBuildSize;
            public string compressionFormat;
        }

        /// <summary>
        /// Loads config from JSON file or creates default.
        /// </summary>
        public static HomaBuildConfig Load(string path)
        {
            if (System.IO.File.Exists(path))
            {
                try
                {
                    string json = System.IO.File.ReadAllText(path);
                    return JsonUtility.FromJson<HomaBuildConfig>(json);
                }
                catch (Exception e)
                {
                    Debug.LogWarning($"[Homa] Failed to load config: {e.Message}. Using defaults.");
                }
            }

            return new HomaBuildConfig();
        }

        /// <summary>
        /// Saves config to JSON file.
        /// </summary>
        public void Save(string path)
        {
            try
            {
                string json = JsonUtility.ToJson(this, true);
                System.IO.File.WriteAllText(path, json);
                Debug.Log($"[Homa] Build config saved to: {path}");
            }
            catch (Exception e)
            {
                Debug.LogError($"[Homa] Failed to save config: {e.Message}");
            }
        }
    }
}
