using System;
using UnityEngine;

namespace HomaPlayables
{
    /// <summary>
    /// Attribute to group variables into sections (Luna Playground-inspired).
    /// </summary>
    [AttributeUsage(AttributeTargets.Field, AllowMultiple = false)]
    public class HomaSectionAttribute : PropertyAttribute
    {
        public string SectionName;

        public HomaSectionAttribute(string sectionName)
        {
            SectionName = sectionName;
        }
    }
}
