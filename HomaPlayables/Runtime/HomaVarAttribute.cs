using System;
using UnityEngine;

namespace HomaPlayables
{
    [AttributeUsage(AttributeTargets.Field)]
    public class HomaVarAttribute : PropertyAttribute
    {
        public string Name;
        public string Section;
        public int Order;
        public float Min;
        public float Max;
        public float Step;
        public string[] Options;

        public HomaVarAttribute(string name, int order = 0, string section = null)
        {
            Name = name;
            Order = order;
            Section = section;
        }
    }
}
