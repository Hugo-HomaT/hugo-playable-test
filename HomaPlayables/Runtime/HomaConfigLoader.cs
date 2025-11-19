using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using System.Linq;
using System.Reflection;

namespace HomaPlayables
{
    public static class HomaConfigLoader
    {
        [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.BeforeSceneLoad)]
        public static void Initialize()
        {
            LoadAndApplyConfig();
        }

        private static void LoadAndApplyConfig()
        {
            // Try to load homa_config.json
            // In WebGL, this file should be next to the index.html, but we can't read it via System.IO in WebGL easily if it's not in StreamingAssets.
            // However, for the "Live Reload" in the iframe, the file is served at the root.
            // Unity WebGL can read from StreamingAssets.
            // But the build process puts it in the build folder, not StreamingAssets.
            // Wait, if we want to read it at runtime in WebGL, we might need to use UnityWebRequest.
            // But [RuntimeInitializeOnLoadMethod] is synchronous-ish.
            // Actually, for WebGL, we might need a MonoBehaviour to run a coroutine.
            
            // Let's create a temporary GameObject to run the loading coroutine.
            GameObject loaderGo = new GameObject("HomaConfigLoader");
            Object.DontDestroyOnLoad(loaderGo);
            loaderGo.AddComponent<HomaConfigLoaderBehaviour>();
        }
    }

    public class HomaConfigLoaderBehaviour : MonoBehaviour
    {
        private void Start()
        {
            StartCoroutine(LoadConfigRoutine());
        }

        private IEnumerator LoadConfigRoutine()
        {
            string configUrl = "homa_config.json";
            
            // In Editor, we might want to read from a specific path for testing, 
            // but in WebGL build, it's relative to the index.html.
#if UNITY_EDITOR
            // For testing in Editor, maybe skip or read from a temp path?
            // Let's skip in Editor to avoid messing with dev workflow unless explicitly wanted.
            // yield break; 
#endif

            using (UnityEngine.Networking.UnityWebRequest www = UnityEngine.Networking.UnityWebRequest.Get(configUrl))
            {
                yield return www.SendWebRequest();

                if (www.result == UnityEngine.Networking.UnityWebRequest.Result.Success)
                {
                    string json = www.downloadHandler.text;
                    ApplyConfig(json);
                }
                else
                {
                    Debug.LogWarning($"[Homa] Could not load homa_config.json: {www.error}");
                }
            }
            
            // Destroy self after loading
            Destroy(gameObject);
        }

        private void ApplyConfig(string json)
        {
            try
            {
                HomaConfig config = JsonUtility.FromJson<HomaConfig>(json);
                if (config == null || config.variables == null) return;

                Debug.Log($"[Homa] Applying config with {config.variables.Count} variables...");

                var monos = FindObjectsOfType<MonoBehaviour>();
                foreach (var mono in monos)
                {
                    var type = mono.GetType();
                    var fields = type.GetFields();

                    foreach (var field in fields)
                    {
                        var attr = field.GetCustomAttributes(typeof(HomaVarAttribute), true).FirstOrDefault() as HomaVarAttribute;
                        if (attr != null)
                        {
                            string varName = attr.Name ?? field.Name;
                            var varConfig = config.variables.FirstOrDefault(v => v.name == varName);

                            if (varConfig != null)
                            {
                                ApplyValue(mono, field, varConfig);
                            }
                        }
                    }
                }
                
                Debug.Log("[Homa] Config applied successfully.");
            }
            catch (System.Exception e)
            {
                Debug.LogError($"[Homa] Error applying config: {e.Message}\n{e.StackTrace}");
            }
        }

        private void ApplyValue(object target, FieldInfo field, VariableConfig config)
        {
            try
            {
                if (field.FieldType == typeof(int))
                {
                    if (int.TryParse(config.value, out int result))
                        field.SetValue(target, result);
                }
                else if (field.FieldType == typeof(float))
                {
                    // Parse float with InvariantCulture to handle dots correctly
                    if (float.TryParse(config.value, System.Globalization.NumberStyles.Float, System.Globalization.CultureInfo.InvariantCulture, out float result))
                        field.SetValue(target, result);
                }
                else if (field.FieldType == typeof(bool))
                {
                    if (bool.TryParse(config.value, out bool result))
                        field.SetValue(target, result);
                }
                else if (field.FieldType == typeof(string))
                {
                    field.SetValue(target, config.value);
                }
                else if (field.FieldType == typeof(Vector3))
                {
                    Vector3 val = JsonUtility.FromJson<Vector3>(config.value);
                    field.SetValue(target, val);
                }
                else if (field.FieldType == typeof(Color))
                {
                    if (ColorUtility.TryParseHtmlString(config.value, out Color color))
                        field.SetValue(target, color);
                }
                else if (field.FieldType.IsEnum)
                {
                    try
                    {
                        object enumVal = System.Enum.Parse(field.FieldType, config.value);
                        field.SetValue(target, enumVal);
                    }
                    catch { /* Ignore invalid enum parse */ }
                }
            }
            catch (System.Exception e)
            {
                Debug.LogWarning($"[Homa] Failed to set value for {config.name}: {e.Message}");
            }
        }

        [System.Serializable]
        class HomaConfig
        {
            public List<VariableConfig> variables;
        }

        [System.Serializable]
        class VariableConfig
        {
            public string name;
            public string value;
        }
    }
}
