using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text;
using System.Text.RegularExpressions;
using UnityEditor;
using UnityEditor.Build.Reporting;
using UnityEngine;

namespace HomaPlayables.Editor
{
    /// <summary>
    /// Analyzes the build report and generates a detailed summary of what's inside the build.
    /// </summary>
    public static class BuildAnalyzer
    {
        public static void AnalyzeBuild(BuildReport report, string outputFolder)
        {
            if (report == null) return;

            var result = new AnalysisResult();
            result.buildDate = System.DateTime.Now.ToString();
            result.totalSize = (long)report.summary.totalSize;
            result.duration = report.summary.totalTime.ToString();

            var sb = new StringBuilder();
            sb.AppendLine("# Homa Playable Build Report");
            sb.AppendLine($"**Date:** {result.buildDate}");
            sb.AppendLine($"**Total Size:** {EditorUtility.FormatBytes(result.totalSize)}");
            sb.AppendLine($"**Duration:** {result.duration}");
            sb.AppendLine();

            // 1. Parse Editor Log for Detailed Breakdown
            ParseEditorLog(sb, result);

            // 2. Output Files
            sb.AppendLine("## 📂 Build Output Files");
            sb.AppendLine("| File | Size | Type |");
            sb.AppendLine("|------|------|------|");

            var files = Directory.GetFiles(outputFolder, "*", SearchOption.AllDirectories);
            var fileInfos = files.Select(f => new FileInfo(f))
                                 .OrderByDescending(f => f.Length)
                                 .Take(15);

            foreach (var file in fileInfos)
            {
                string relPath = file.FullName.Replace(outputFolder, "").TrimStart('/', '\\');
                sb.AppendLine($"| `{relPath}` | {EditorUtility.FormatBytes(file.Length)} | {file.Extension} |");
            }
            sb.AppendLine();

            // 3. Recommendations
            sb.AppendLine("## 💡 Optimization Tips");
            
            bool hasLargeWasm = fileInfos.Any(f => f.Extension == ".wasm" && f.Length > 2 * 1024 * 1024);
            if (hasLargeWasm)
            {
                string tip = "Large Code Size: Your .wasm file is over 2MB. Try enabling 'Strip Engine Code' or 'Strip Physics 2D'.";
                sb.AppendLine($"- {tip}");
                result.tips.Add(tip);
            }
            
            bool hasLargeData = fileInfos.Any(f => f.Extension == ".data" && f.Length > 2 * 1024 * 1024);
            if (hasLargeData)
            {
                string tip = "Large Assets: Your .data file is over 2MB. Check the 'Top Assets' list.";
                sb.AppendLine($"- {tip}");
                result.tips.Add(tip);
                result.tips.Add("Use 'Optimize Textures' (Max 1024 or 512).");
                result.tips.Add("Force Audio to Mono.");
            }

            // Save Markdown Report
            string reportPath = Path.Combine(outputFolder, "BuildReport.md");
            File.WriteAllText(reportPath, sb.ToString());
            
            // Save JSON Analysis for Window
            string jsonPath = Path.Combine(Application.dataPath, "../HomaAnalysis.json");
            try
            {
                File.WriteAllText(jsonPath, JsonUtility.ToJson(result, true));
                Debug.Log($"[Homa] 📊 Analysis JSON saved to: {jsonPath}");
            }
            catch (Exception e)
            {
                Debug.LogError($"[Homa] Failed to save analysis JSON: {e.Message}");
            }
            
            Debug.Log($"[Homa] 📊 Build Analysis saved to: {reportPath}");
            
            // Open the report automatically - DISABLED
            // EditorUtility.OpenWithDefaultApp(reportPath);
        }

        private static void ParseEditorLog(StringBuilder sb, AnalysisResult result)
        {
            string logPath = GetEditorLogPath();
            if (!File.Exists(logPath))
            {
                sb.AppendLine("> ⚠️ Could not find Editor.log to parse detailed asset breakdown.");
                return;
            }

            try
            {
                // Read the log file. It can be huge, but we only need the end.
                using (var fs = new FileStream(logPath, FileMode.Open, FileAccess.Read, FileShare.ReadWrite))
                using (var sr = new StreamReader(fs))
                {
                    string content = sr.ReadToEnd();
                    
                    // Find the last "Build Report" section
                    int reportIndex = content.LastIndexOf("Build Report");
                    if (reportIndex == -1)
                    {
                        sb.AppendLine("> ⚠️ Could not find 'Build Report' in Editor.log.");
                        return;
                    }

                    string reportContent = content.Substring(reportIndex);
                    
                    // Extract Category Breakdown
                    sb.AppendLine("## 📦 Asset Breakdown (Uncompressed)");
                    sb.AppendLine("| Category | Size | Percentage |");
                    sb.AppendLine("|----------|------|------------|");
                    
                    // Regex for lines like: "Textures      4.2 mb   50.0%"
                    var categoryRegex = new Regex(@"^\s*([A-Za-z\s]+)\s+([0-9.]+\s+[a-z]+)\s+([0-9.]+\s*%)", RegexOptions.Multiline);
                    var matches = categoryRegex.Matches(reportContent);
                    
                    foreach (Match match in matches)
                    {
                        string category = match.Groups[1].Value.Trim();
                        string size = match.Groups[2].Value.Trim();
                        string percent = match.Groups[3].Value.Trim();
                        
                        // Filter out header lines if regex catches them
                        if (category == "Complete size") continue;
                        
                        sb.AppendLine($"| {category} | {size} | {percent} |");
                        
                        result.categories.Add(new AnalysisResult.CategoryBreakdown
                        {
                            name = category,
                            size = size,
                            percent = percent
                        });
                    }
                    sb.AppendLine();

                    // Extract Top Assets
                    sb.AppendLine("## 🏆 Top Largest Assets");
                    sb.AppendLine("| Asset | Size |");
                    sb.AppendLine("|-------|------|");
                    
                    // Look for "Used Assets and files from the Resources folder, sorted by uncompressed size:"
                    int assetsIndex = reportContent.IndexOf("Used Assets and files from the Resources folder, sorted by uncompressed size:");
                    if (assetsIndex != -1)
                    {
                        string assetsContent = reportContent.Substring(assetsIndex);
                        // Regex for lines like: " 4.2 mb  50.0% Assets/Textures/BigBG.png"
                        
                        var assetRegex = new Regex(@"^\s*([0-9.]+\s+[a-z]+)\s+[0-9.]+\s*%\s+(.+)$", RegexOptions.Multiline);
                        var assetMatches = assetRegex.Matches(assetsContent);
                        
                        // Take top 20
                        int count = 0;
                        foreach (Match match in assetMatches)
                        {
                            if (count >= 20) break;
                            
                            string size = match.Groups[1].Value.Trim();
                            string path = match.Groups[2].Value.Trim();
                            
                            sb.AppendLine($"| `{path}` | {size} |");
                            
                            result.topAssets.Add(new AnalysisResult.AssetInfo
                            {
                                path = path,
                                size = size
                            });
                            
                            count++;
                        }
                    }
                }
            }
            catch (Exception e)
            {
                sb.AppendLine($"> ⚠️ Error parsing Editor.log: {e.Message}");
            }
        }

        private static string GetEditorLogPath()
        {
            // MacOS
            string logPath = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.Personal), "Library/Logs/Unity/Editor.log");
            if (File.Exists(logPath)) return logPath;

            // Windows
            logPath = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "Unity/Editor/Editor.log");
            if (File.Exists(logPath)) return logPath;

            return "";
        }
    }
}
