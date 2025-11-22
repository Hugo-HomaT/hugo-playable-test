using System;
using System.Collections.Generic;

namespace HomaPlayables.Editor
{
    [Serializable]
    public class AnalysisResult
    {
        public string buildDate;
        public long totalSize;
        public string duration;
        public List<CategoryBreakdown> categories = new List<CategoryBreakdown>();
        public List<AssetInfo> topAssets = new List<AssetInfo>();
        public List<string> tips = new List<string>();

        [Serializable]
        public class CategoryBreakdown
        {
            public string name;
            public string size;
            public string percent;
        }

        [Serializable]
        public class AssetInfo
        {
            public string path;
            public string size;
        }
    }
}
