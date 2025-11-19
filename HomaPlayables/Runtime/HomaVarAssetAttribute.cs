using System;
using UnityEngine;

namespace HomaPlayables
{
    /// <summary>
    /// Attribute for asset reference variables (Luna Playground-inspired).
    /// Supports textures, materials, prefabs, audio clips, etc.
    /// </summary>
    [AttributeUsage(AttributeTargets.Field)]
    public class HomaVarAssetAttribute : PropertyAttribute
    {
        public string Name;
        public string Section;
        public int Order;
        public System.Type AssetType;

        public HomaVarAssetAttribute(string name, int order = 0, string section = null)
        {
            Name = name;
            Order = order;
            Section = section;
        }
    }
}
