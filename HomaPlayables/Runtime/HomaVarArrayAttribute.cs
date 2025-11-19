using System;
using UnityEngine;

namespace HomaPlayables
{
    /// <summary>
    /// Attribute for array variables with length control (Luna Playground-inspired).
    /// </summary>
    [AttributeUsage(AttributeTargets.Field)]
    public class HomaVarArrayAttribute : PropertyAttribute
    {
        public string Name;
        public int MinLength;
        public int MaxLength;

        public HomaVarArrayAttribute(string name = null, int minLength = 0, int maxLength = 10)
        {
            Name = name;
            MinLength = minLength;
            MaxLength = maxLength;
        }
    }
}
