using System.Collections.Generic;
using System.IO;
using System.IO.Compression;
using System.Linq;
using UnityEditor;
using UnityEngine;

namespace HomaPlayables.Editor
{
    public static class HomaBuildMenu
    {
        [MenuItem("Homa/Build Playable")]
        public static void BuildPlayable()
        {
            string buildFolder = Path.Combine(Application.dataPath, "../Builds/HomaPlayable");
            string zipPath = Path.Combine(Application.dataPath, "../HomaPlayable.zip");

            // 1. Scan for Variables
            var variables = ScanForVariables();
            var config = new HomaConfig { version = "1.0", variables = variables };
            string json = JsonUtility.ToJson(config, true);

            // 2. Build WebGL
            if (Directory.Exists(buildFolder)) Directory.Delete(buildFolder, true);
            
            BuildPlayerOptions buildPlayerOptions = new BuildPlayerOptions();
            buildPlayerOptions.scenes = EditorBuildSettings.scenes.Where(s => s.enabled).Select(s => s.path).ToArray();
            buildPlayerOptions.locationPathName = buildFolder;
            buildPlayerOptions.target = BuildTarget.WebGL;
            buildPlayerOptions.options = BuildOptions.None;

            var report = BuildPipeline.BuildPlayer(buildPlayerOptions);

            if (report.summary.result == UnityEditor.Build.Reporting.BuildResult.Succeeded)
            {
                Debug.Log("Build succeeded: " + report.summary.totalSize + " bytes");

                // 3. Write Config
                File.WriteAllText(Path.Combine(buildFolder, "homa_config.json"), json);

                // 4. Zip
                if (File.Exists(zipPath)) File.Delete(zipPath);
                ZipFile.CreateFromDirectory(buildFolder, zipPath);
                
                Debug.Log($"Playable Zipped to: {zipPath}");
                EditorUtility.RevealInFinder(zipPath);
            }
            else
            {
                Debug.LogError("Build failed");
            }
        }

        private static List<VariableConfig> ScanForVariables()
        {
            var list = new List<VariableConfig>();
            
            // Find all MonoBehaviours in scene
            var monos = GameObject.FindObjectsOfType<MonoBehaviour>();
            foreach (var mono in monos)
            {
                var type = mono.GetType();
                var fields = type.GetFields();
                foreach (var field in fields)
                {
                    var attr = field.GetCustomAttributes(typeof(HomaVarAttribute), true).FirstOrDefault() as HomaVarAttribute;
                    if (attr != null)
                    {
                        var val = field.GetValue(mono);
                        list.Add(new VariableConfig
                        {
                            name = attr.Name ?? field.Name,
                            type = field.FieldType.Name,
                            value = val != null ? val.ToString() : "",
                            min = attr.Min,
                            max = attr.Max,
                            options = attr.Options
                        });
                    }
                }
            }
            return list;
        }

        [System.Serializable]
        class HomaConfig
        {
            public string version;
            public List<VariableConfig> variables;
        }

        [System.Serializable]
        class VariableConfig
        {
            public string name;
            public string type;
            public string value;
            public float min;
            public float max;
            public string[] options;
        }
    }
}
