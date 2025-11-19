/**
 * MRAID v2.0 wrapper for AppLovin playable ads
 */

export function getMRAIDWrapper(variablesJson: string): string {
    return `
<script>
// MRAID v2.0 Integration for AppLovin
(function() {
    // Inject Homa variables
    window.HomaVars = ${variablesJson};
    
    // Wait for MRAID to be ready
    function onMRAIDReady() {
        console.log('[MRAID] Ready, state:', mraid.getState());
        
        // Set up orientation change listener
        mraid.addEventListener('orientationChange', function(orientation) {
            console.log('[MRAID] Orientation changed:', orientation);
        });
        
        // Set up size change listener
        mraid.addEventListener('sizeChange', function(width, height) {
            console.log('[MRAID] Size changed:', width, 'x', height);
        });
    }
    
    // Check if MRAID is available
    if (typeof mraid !== 'undefined') {
        if (mraid.getState() === 'loading') {
            mraid.addEventListener('ready', onMRAIDReady);
        } else {
            onMRAIDReady();
        }
    } else {
        console.warn('[MRAID] Not available - running in preview mode');
        // Still inject variables for testing
    }
    
    // Helper function for CTA clicks
    window.openAppStore = function() {
        if (typeof mraid !== 'undefined') {
            console.log('[MRAID] Opening app store');
            mraid.open('https://apps.apple.com/'); // Placeholder URL
        } else {
            console.log('[MRAID] Not available, would open app store');
        }
    };
})();
</script>
`;
}

/**
 * Mintegral SDK integration
 */
export function getMintegralSDK(variablesJson: string): string {
    return `
<script>
// Mintegral SDK Integration
(function() {
    // Inject Homa variables
    window.HomaVars = ${variablesJson};
    
    // Mintegral tracking
    window.install = function() {
        console.log('[Mintegral] Install clicked');
        if (typeof window.gameEnd !== 'undefined') {
            window.gameEnd();
        }
    };
    
    // Signal game end (required by Mintegral)
    window.gameEnd = function() {
        console.log('[Mintegral] Game ended');
        // Mintegral will handle the redirect
    };
})();
</script>
`;
}
