using System;
using System.Collections.Generic;
using System.Runtime.InteropServices;
using UnityEngine;

namespace HomaPlayables
{
    /// <summary>
    /// Event tracking system for playable ads (Luna-inspired).
    /// Tracks custom events and sends them to the parent window for analytics.
    /// </summary>
    public static class HomaEventTracker
    {
        [DllImport("__Internal")]
        private static extern void SendEventToParent(string eventName, string eventData);

        private static List<EventDefinition> registeredEvents = new List<EventDefinition>();

        [Serializable]
        public class EventDefinition
        {
            public string name;
            public string description;
            public List<string> parameters = new List<string>();
        }

        /// <summary>
        /// Tracks a simple event without parameters.
        /// </summary>
        public static void TrackEvent(string eventName)
        {
            TrackEvent(eventName, null);
        }

        /// <summary>
        /// Tracks an event with custom data.
        /// </summary>
        public static void TrackEvent(string eventName, object eventData)
        {
            string dataJson = eventData != null ? JsonUtility.ToJson(eventData) : "{}";
            
            Debug.Log($"[Homa Event] {eventName}: {dataJson}");

            // Send to parent window (only works in WebGL)
            #if UNITY_WEBGL && !UNITY_EDITOR
            try
            {
                SendEventToParent(eventName, dataJson);
            }
            catch (Exception e)
            {
                Debug.LogWarning($"[Homa Event] Failed to send event: {e.Message}");
            }
            #endif
        }

        /// <summary>
        /// Triggers the "Install Full Game" action (Luna compatibility).
        /// </summary>
        public static void InstallFullGame()
        {
            TrackEvent("install_full_game");
            // In a real playable, this would trigger the store redirect.
            // For now, we just track the event. The web wrapper handles the actual redirect
            // if it listens for this event, or we can add specific redirect logic here later.
        }

        /// <summary>
        /// Signals that the game has ended (Luna compatibility).
        /// </summary>
        public static void GameEnded()
        {
            TrackEvent("game_ended");
            TrackEvent(Events.LEVEL_COMPLETE); // Also track standard level complete
        }

        /// <summary>
        /// Registers an event definition for export to config.
        /// </summary>
        public static void RegisterEvent(string name, string description, params string[] parameters)
        {
            var eventDef = new EventDefinition
            {
                name = name,
                description = description,
                parameters = new List<string>(parameters)
            };

            registeredEvents.Add(eventDef);
        }

        /// <summary>
        /// Gets all registered event definitions.
        /// </summary>
        public static List<EventDefinition> GetRegisteredEvents()
        {
            return new List<EventDefinition>(registeredEvents);
        }

        /// <summary>
        /// Common preset events for playable ads.
        /// </summary>
        public static class Events
        {
            public const string TUTORIAL_START = "tutorial_start";
            public const string TUTORIAL_COMPLETE = "tutorial_complete";
            public const string GAMEPLAY_START = "gameplay_start";
            public const string LEVEL_START = "level_start";
            public const string LEVEL_COMPLETE = "level_complete";
            public const string LEVEL_FAIL = "level_fail";
            public const string CLICK_ENDCARD = "click_endcard";
            public const string FIRST_INTERACTION = "first_interaction";
        }

        /// <summary>
        /// Initializes common event definitions.
        /// </summary>
        [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.BeforeSceneLoad)]
        private static void Initialize()
        {
            RegisterEvent(Events.TUTORIAL_START, "Tutorial started");
            RegisterEvent(Events.TUTORIAL_COMPLETE, "Tutorial completed");
            RegisterEvent(Events.GAMEPLAY_START, "Gameplay started");
            RegisterEvent(Events.LEVEL_START, "Level started", "level");
            RegisterEvent(Events.LEVEL_COMPLETE, "Level completed", "level", "score", "time");
            RegisterEvent(Events.LEVEL_FAIL, "Level failed", "level", "reason");
            RegisterEvent(Events.CLICK_ENDCARD, "End card clicked");
            RegisterEvent(Events.FIRST_INTERACTION, "First user interaction");
        }
    }
}
