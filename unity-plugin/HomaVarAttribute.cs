using System;
using UnityEngine;

namespace HomaPlayables
{
    [AttributeUsage(AttributeTargets.Field)]
    public class HomaVarAttribute : PropertyAttribute
    {
        public string Name;
        public float Min;
        public float Max;
        public string[] Options;

        public HomaVarAttribute(string name = null, float min = 0, float max = 0, string[] options = null)
        {
            Name = name;
            Min = min;
            Max = max;
            Options = options;
        }
    }
}
