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

            var sb = new StringBuilder();
            sb.AppendLine("# Homa Playable Build Report");
            sb.AppendLine($"**Date:** {System.DateTime.Now}");
            sb.AppendLine($"**Total Size:** {EditorUtility.FormatBytes((long)report.summary.totalSize)}");
            sb.AppendLine($"**Duration:** {report.summary.totalTime}");
            sb.AppendLine();

            // 1. Parse Editor Log for Detailed Breakdown
            ParseEditorLog(sb);

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
                sb.AppendLine("- **Large Code Size**: Your `.wasm` file is over 2MB. Try enabling 'Strip Engine Code' or 'Strip Physics 2D'.");
            }
            
            bool hasLargeData = fileInfos.Any(f => f.Extension == ".data" && f.Length > 2 * 1024 * 1024);
            if (hasLargeData)
            {
                sb.AppendLine("- **Large Assets**: Your `.data` file is over 2MB. Check the 'Top Assets' list above.");
                sb.AppendLine("  - Use 'Optimize Textures' (Max 1024 or 512).");
                sb.AppendLine("  - Force Audio to Mono.");
            }

            // Save Report
            string reportPath = Path.Combine(outputFolder, "BuildReport.md");
            File.WriteAllText(reportPath, sb.ToString());
            
            Debug.Log($"[Homa] 📊 Build Analysis saved to: {reportPath}");
            
            // Open the report automatically
            EditorUtility.OpenWithDefaultApp(reportPath);
        }

        private static void ParseEditorLog(StringBuilder sb)
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
                // However, File.ReadAllLines might be locked or too slow.
                // Let's try reading with FileShare.ReadWrite
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
                        // Note: Format varies slightly by Unity version.
                        // Common format: " <size> <unit> <percent>% <path>"
                        
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
