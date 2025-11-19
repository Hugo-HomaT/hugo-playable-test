using System;
using UnityEditor;
using UnityEngine;
using UnityEngine.Rendering;

namespace HomaPlayables.Editor
{
    /// <summary>
    /// Helper class to snapshot and restore project settings during the build process.
    /// Ensures that the build optimization settings do not permanently alter the user's project.
    /// </summary>
    public class SettingsRestorer : IDisposable
    {
        // Player Settings
        private bool _stripEngineCode;
        private ManagedStrippingLevel _strippingLevel;
        private ApiCompatibilityLevel _apiCompatibilityLevel;
        
        // WebGL Settings
        private WebGLCompressionFormat _compressionFormat;
        private bool _dataCaching;
        private int _memorySize;
        private WebGLExceptionSupport _exceptionSupport;
        private WebGLDebugSymbolMode _debugSymbolMode;
        
        // Splash Screen
        private bool _showSplashScreen;
        private bool _showUnityLogo;
        
        // Graphics
        private GraphicsDeviceType[] _graphicsAPIs;

        public SettingsRestorer()
        {
            Snapshot();
        }

        private void Snapshot()
        {
            // Snapshot current settings
            _stripEngineCode = PlayerSettings.stripEngineCode;
            _strippingLevel = PlayerSettings.GetManagedStrippingLevel(BuildTargetGroup.WebGL);
            _apiCompatibilityLevel = PlayerSettings.GetApiCompatibilityLevel(BuildTargetGroup.WebGL);
            
            _compressionFormat = PlayerSettings.WebGL.compressionFormat;
            _dataCaching = PlayerSettings.WebGL.dataCaching;
            _memorySize = PlayerSettings.WebGL.memorySize;
            _exceptionSupport = PlayerSettings.WebGL.exceptionSupport;
            _debugSymbolMode = PlayerSettings.WebGL.debugSymbolMode;
            
            _showSplashScreen = PlayerSettings.SplashScreen.show;
            _showUnityLogo = PlayerSettings.SplashScreen.showUnityLogo;
            
            _graphicsAPIs = PlayerSettings.GetGraphicsAPIs(BuildTarget.WebGL);
        }

        public void Dispose()
        {
            Restore();
        }

        private void Restore()
        {
            // Restore original settings
            PlayerSettings.stripEngineCode = _stripEngineCode;
            PlayerSettings.SetManagedStrippingLevel(BuildTargetGroup.WebGL, _strippingLevel);
            PlayerSettings.SetApiCompatibilityLevel(BuildTargetGroup.WebGL, _apiCompatibilityLevel);
            
            PlayerSettings.WebGL.compressionFormat = _compressionFormat;
            PlayerSettings.WebGL.dataCaching = _dataCaching;
            PlayerSettings.WebGL.memorySize = _memorySize;
            PlayerSettings.WebGL.exceptionSupport = _exceptionSupport;
            PlayerSettings.WebGL.debugSymbolMode = _debugSymbolMode;
            
            PlayerSettings.SplashScreen.show = _showSplashScreen;
            PlayerSettings.SplashScreen.showUnityLogo = _showUnityLogo;
            
            PlayerSettings.SetGraphicsAPIs(BuildTarget.WebGL, _graphicsAPIs);
            
            AssetDatabase.SaveAssets();
            Debug.Log("[Homa] Project settings restored.");
        }
    }
}
