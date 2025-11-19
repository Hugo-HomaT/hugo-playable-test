using System.Collections.Generic;
using System.IO;
using System.Linq;
using UnityEditor;
using UnityEngine;

namespace HomaPlayables.Editor
{
    /// <summary>
    /// Detects and excludes common SDKs from playable builds.
    /// Inspired by Luna Playworks SDK exclusion system.
    /// </summary>
    public static class HomaSDKExcluder
    {
        // Ad SDK patterns (from Luna Playworks)
        private static readonly string[] AD_SDK_PATTERNS = {
            "**/UnityAds/",
            "**/AdMobPlugin/",
            "**/GoogleMobileAds/",
            "**/IronSource/",
            "**/Vungle/",
            "**/Fyber/",
            "**/FairBid/",
            "**/InMobiAds/",
            "**/AudienceNetwork/",
            "**/YandexMobileAds/",
            "**/FacebookSDK/"
        };

        // Analytics SDK patterns
        private static readonly string[] ANALYTICS_PATTERNS = {
            "**/GameAnalytics/",
            "**/AppsFlyer/",
            "**/Firebase/",
            "**/Adjust/"
        };

        // Monetization SDK patterns
        private static readonly string[] MONETIZATION_PATTERNS = {
            "**/UnityPurchasing/",
            "**/UnityEngine.Monetization/",
            "**/UnityEngine.Advertisements/"
        };

        // Tool/Plugin patterns
        private static readonly string[] TOOL_PATTERNS = {
            "**/Sirenix/Odin Inspector/",
            "**/Sirenix/Assemblies/",
            "**/StompyRobot/SRDebugger/",
            "**/StompyRobot/SRF/",
            "**/NiceVibrations/",
            "**/MoreMountains.NiceVibrations/",
            "**/UniWebView/",
            "**/Obi/",
            "**/MeshCombiner/",
            "**/AnimationBaker/",
            "**/SupersonicWisdom/"
        };

        // Editor-only patterns (always exclude)
        private static readonly string[] EDITOR_PATTERNS = {
            "**/Editor/",
            "**/EditorTests/"
        };

        public class SDKDetectionResult
        {
            public List<string> DetectedSDKs = new List<string>();
            public List<string> ExclusionPatterns = new List<string>();
            public long EstimatedSizeSaved = 0;
        }

        /// <summary>
        /// Scans the project for common SDKs and returns detection results.
        /// </summary>
        public static SDKDetectionResult DetectSDKs()
        {
            var result = new SDKDetectionResult();
            var assetsPath = Application.dataPath;

            Debug.Log("[Homa] Scanning project for SDKs...");

            // Combine all patterns
            var allPatterns = new List<string>();
            allPatterns.AddRange(AD_SDK_PATTERNS);
            allPatterns.AddRange(ANALYTICS_PATTERNS);
            allPatterns.AddRange(MONETIZATION_PATTERNS);
            allPatterns.AddRange(TOOL_PATTERNS);
            allPatterns.AddRange(EDITOR_PATTERNS);

            // Scan for each pattern
            foreach (var pattern in allPatterns)
            {
                var cleanPattern = pattern.Replace("**/", "").Replace("/", "");
                var foundPaths = FindDirectoriesMatchingPattern(assetsPath, cleanPattern);

                if (foundPaths.Count > 0)
                {
                    result.DetectedSDKs.Add(cleanPattern);
                    result.ExclusionPatterns.Add(pattern);

                    // Estimate size
                    foreach (var path in foundPaths)
                    {
                        result.EstimatedSizeSaved += GetDirectorySize(path);
                    }
                }
            }

            if (result.DetectedSDKs.Count > 0)
            {
                Debug.Log($"[Homa] Detected {result.DetectedSDKs.Count} SDKs/Tools:");
                foreach (var sdk in result.DetectedSDKs)
                {
                    Debug.Log($"[Homa]   - {sdk}");
                }
                float sizeMB = result.EstimatedSizeSaved / (1024f * 1024f);
                Debug.Log($"[Homa] Estimated size to exclude: {sizeMB:F2} MB");
            }
            else
            {
                Debug.Log("[Homa] No common SDKs detected.");
            }

            return result;
        }

        /// <summary>
        /// Gets all exclusion patterns including custom ones from config.
        /// </summary>
        public static string[] GetAllExclusionPatterns(string[] customPatterns = null)
        {
            var patterns = new List<string>();
            patterns.AddRange(AD_SDK_PATTERNS);
            patterns.AddRange(ANALYTICS_PATTERNS);
            patterns.AddRange(MONETIZATION_PATTERNS);
            patterns.AddRange(TOOL_PATTERNS);
            patterns.AddRange(EDITOR_PATTERNS);

            if (customPatterns != null)
            {
                patterns.AddRange(customPatterns);
            }

            return patterns.ToArray();
        }

        /// <summary>
        /// Finds directories matching a pattern (simple wildcard support).
        /// </summary>
        private static List<string> FindDirectoriesMatchingPattern(string rootPath, string pattern)
        {
            var results = new List<string>();

            try
            {
                // Simple recursive search
                var directories = Directory.GetDirectories(rootPath, "*", SearchOption.AllDirectories);
                foreach (var dir in directories)
                {
                    if (dir.Contains(pattern))
                    {
                        results.Add(dir);
                    }
                }
            }
            catch (System.Exception e)
            {
                Debug.LogWarning($"[Homa] Error scanning directory: {e.Message}");
            }

            return results;
        }

        /// <summary>
        /// Gets the total size of a directory in bytes.
        /// </summary>
        private static long GetDirectorySize(string path)
        {
            if (!Directory.Exists(path))
                return 0;

            try
            {
                var dirInfo = new DirectoryInfo(path);
                var files = dirInfo.GetFiles("*", SearchOption.AllDirectories);
                return files.Sum(file => file.Length);
            }
            catch
            {
                return 0;
            }
        }

        /// <summary>
        /// Generates a human-readable report of detected SDKs.
        /// </summary>
        public static string GenerateReport(SDKDetectionResult result)
        {
            if (result.DetectedSDKs.Count == 0)
            {
                return "No SDKs detected in project.";
            }

            var report = "=== SDK Detection Report ===\n\n";
            report += $"Total SDKs/Tools detected: {result.DetectedSDKs.Count}\n";
            report += $"Estimated size to exclude: {result.EstimatedSizeSaved / (1024f * 1024f):F2} MB\n\n";

            // Group by category
            var adSDKs = result.DetectedSDKs.Where(s => AD_SDK_PATTERNS.Any(p => p.Contains(s))).ToList();
            var analyticsSDKs = result.DetectedSDKs.Where(s => ANALYTICS_PATTERNS.Any(p => p.Contains(s))).ToList();
            var monetizationSDKs = result.DetectedSDKs.Where(s => MONETIZATION_PATTERNS.Any(p => p.Contains(s))).ToList();
            var tools = result.DetectedSDKs.Where(s => TOOL_PATTERNS.Any(p => p.Contains(s))).ToList();

            if (adSDKs.Count > 0)
            {
                report += "Ad SDKs:\n";
                foreach (var sdk in adSDKs)
                    report += $"  - {sdk}\n";
                report += "\n";
            }

            if (analyticsSDKs.Count > 0)
            {
                report += "Analytics SDKs:\n";
                foreach (var sdk in analyticsSDKs)
                    report += $"  - {sdk}\n";
                report += "\n";
            }

            if (monetizationSDKs.Count > 0)
            {
                report += "Monetization SDKs:\n";
                foreach (var sdk in monetizationSDKs)
                    report += $"  - {sdk}\n";
                report += "\n";
            }

            if (tools.Count > 0)
            {
                report += "Tools/Plugins:\n";
                foreach (var sdk in tools)
                    report += $"  - {sdk}\n";
                report += "\n";
            }

            report += "These will be automatically excluded from the playable build.";

            return report;
        }
    }
}
