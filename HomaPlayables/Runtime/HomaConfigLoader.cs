using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using System.Linq;
using System.Reflection;
using System.Runtime.InteropServices;

namespace HomaPlayables
{
    public static class HomaConfigLoader
    {
        [DllImport("__Internal")]
        private static extern string HomaGetConfigJson();

        [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.AfterSceneLoad)]
        public static void Initialize()
        {
            LoadAndApplyConfig();
        }

        private static void LoadAndApplyConfig()
        {
#if UNITY_WEBGL && !UNITY_EDITOR
            try
            {
                // Try to get config from JavaScript bridge (synchronous)
                string configJson = HomaGetConfigJson();
                
                if (!string.IsNullOrEmpty(configJson))
                {
                    Debug.Log("[Homa] Loading config from window.HOMA_CONFIG...");
                    ApplyConfig(configJson);
                    return;
                }
            }
            catch (System.Exception e)
            {
                Debug.LogWarning($"[Homa] Could not load config from bridge: {e.Message}");
            }
#endif
            
            // Fallback: Use async loading for Editor or if bridge fails
            GameObject loaderGo = new GameObject("HomaConfigLoader");
            Object.DontDestroyOnLoad(loaderGo);
            loaderGo.AddComponent<HomaConfigLoaderBehaviour>();
        }

        public static void ApplyConfig(string json)
        {
            try
            {
                Debug.Log($"[Homa] Raw config JSON: {json}");
                
                HomaConfig config = JsonUtility.FromJson<HomaConfig>(json);
                if (config == null || config.variables == null)
                {
                    Debug.LogError("[Homa] Config is null or has no variables!");
                    return;
                }

                Debug.Log($"[Homa] Applying config with {config.variables.Count} variables...");
                
                // Log all variables in config
                foreach (var v in config.variables)
                {
                    Debug.Log($"[Homa] Config has: {v.name} = {v.value}");
                }

                var monos = Object.FindObjectsOfType<MonoBehaviour>();
                Debug.Log($"[Homa] Found {monos.Length} MonoBehaviours in scene");
                
                int appliedCount = 0;
                int skippedCount = 0;

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
                                Debug.Log($"[Homa] Matched field: {type.Name}.{field.Name} (attr name: {varName})");
                                Debug.Log($"[Homa]   Current value: {field.GetValue(mono)}");
                                Debug.Log($"[Homa]   Config value: {varConfig.value}");
                                
                                ApplyValue(mono, field, varConfig);
                                
                                Debug.Log($"[Homa]   New value: {field.GetValue(mono)}");
                                appliedCount++;
                            }
                            else
                            {
                                Debug.LogWarning($"[Homa] No config found for variable: {varName} (field: {type.Name}.{field.Name})");
                                skippedCount++;
                            }
                        }
                    }
                }
                
                Debug.Log($"[Homa] Config applied: {appliedCount} variables updated, {skippedCount} skipped");
            }
            catch (System.Exception e)
            {
                Debug.LogError($"[Homa] Error applying config: {e.Message}\n{e.StackTrace}");
            }
        }

        private static void ApplyValue(object target, FieldInfo field, VariableConfig config)
        {
            try
            {
                if (field.FieldType == typeof(int))
                {
                    if (int.TryParse(config.value, out int result))
                    {
                        field.SetValue(target, result);
                        Debug.Log($"[Homa]     ✓ Set int: {config.name} = {result}");
                    }
                    else
                    {
                        Debug.LogError($"[Homa]     ✗ Failed to parse int: {config.value}");
                    }
                }
                else if (field.FieldType == typeof(float))
                {
                    if (float.TryParse(config.value, System.Globalization.NumberStyles.Float, System.Globalization.CultureInfo.InvariantCulture, out float result))
                    {
                        field.SetValue(target, result);
                        Debug.Log($"[Homa]     ✓ Set float: {config.name} = {result}");
                    }
                    else
                    {
                        Debug.LogError($"[Homa]     ✗ Failed to parse float: {config.value}");
                    }
                }
                else if (field.FieldType == typeof(bool))
                {
                    if (bool.TryParse(config.value, out bool result))
                    {
                        field.SetValue(target, result);
                        Debug.Log($"[Homa]     ✓ Set bool: {config.name} = {result}");
                    }
                    else
                    {
                        Debug.LogError($"[Homa]     ✗ Failed to parse bool: {config.value}");
                    }
                }
                else if (field.FieldType == typeof(string))
                {
                    field.SetValue(target, config.value);
                    Debug.Log($"[Homa]     ✓ Set string: {config.name} = {config.value}");
                }
                else if (field.FieldType == typeof(Vector3))
                {
                    Vector3 val = JsonUtility.FromJson<Vector3>(config.value);
                    field.SetValue(target, val);
                    Debug.Log($"[Homa]     ✓ Set Vector3: {config.name} = {val}");
                }
                else if (field.FieldType == typeof(Color))
                {
                    if (ColorUtility.TryParseHtmlString(config.value, out Color color))
                    {
                        field.SetValue(target, color);
                        Debug.Log($"[Homa]     ✓ Set Color: {config.name} = {color}");
                    }
                    else
                    {
                        Debug.LogError($"[Homa]     ✗ Failed to parse color: {config.value}");
                    }
                }
                else if (field.FieldType.IsEnum)
                {
                    try
                    {
                        object enumVal = System.Enum.Parse(field.FieldType, config.value);
                        field.SetValue(target, enumVal);
                        Debug.Log($"[Homa]     ✓ Set enum: {config.name} = {enumVal}");
                    }
                    catch (System.Exception ex)
                    {
                        Debug.LogError($"[Homa]     ✗ Failed to parse enum: {config.value} - {ex.Message}");
                    }
                }
                else
                {
                    Debug.LogWarning($"[Homa]     ? Unsupported type: {field.FieldType.Name} for {config.name}");
                }
            }
            catch (System.Exception e)
            {
                Debug.LogError($"[Homa] Failed to set value for {config.name}: {e.Message}\n{e.StackTrace}");
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

    // Fallback async loader
    public class HomaConfigLoaderBehaviour : MonoBehaviour
    {
        private void Start()
        {
            StartCoroutine(LoadConfigRoutine());
        }

        private IEnumerator LoadConfigRoutine()
        {
            string configUrl = "homa_config.json";

            using (UnityEngine.Networking.UnityWebRequest www = UnityEngine.Networking.UnityWebRequest.Get(configUrl))
            {
                yield return www.SendWebRequest();

                if (www.result == UnityEngine.Networking.UnityWebRequest.Result.Success)
                {
                    string json = www.downloadHandler.text;
                    HomaConfigLoader.ApplyConfig(json);
                }
                else
                {
                    Debug.LogWarning($"[Homa] Could not load homa_config.json: {www.error}");
                }
            }
            
            Destroy(gameObject);
        }
    }
}
