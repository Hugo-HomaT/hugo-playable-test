/**
 * MRAID v2.0 wrapper for AppLovin playable ads
 */

export function getMRAIDWrapper(variablesJson: string): string {
    return `
<script>
// ===== MRAID v2.0 Integration for AppLovin =====
// Compliant with AppLovin HTML Playable Specifications
(function() {
    'use strict';
    
    // Inject Homa variables
    window.HomaVars = ${variablesJson};
    
    // Track first user interaction
    let hasUserInteracted = false;
    let gameStarted = false;
    
    // ===== Audio Auto-Play Prevention =====
    // Requirement: Audio must remain muted until first user interaction
    const audioElements = [];
    
    function setupAudioControl() {
        // Mute all existing audio/video elements
        document.querySelectorAll('audio, video').forEach(el => {
            el.muted = true;
            audioElements.push(el);
        });
        
        // Observe for dynamically added media elements
        const observer = new MutationObserver((mutations) => {
            mutations.forEach(mutation => {
                mutation.addedNodes.forEach(node => {
                    if (node.tagName === 'AUDIO' || node.tagName === 'VIDEO') {
                        node.muted = true;
                        audioElements.push(node);
                    }
                });
            });
        });
        observer.observe(document.body, { childList: true, subtree: true });
    }
    
    // ===== First Interaction Handler =====
    // Requirement: Timer and audio start only after first user interaction
    function onFirstInteraction(event) {
        if (hasUserInteracted) return;
        
        hasUserInteracted = true;
        console.log('[MRAID] First user interaction detected');
        
        // Unmute audio
        audioElements.forEach(el => {
            if (el && !el.paused) {
                el.muted = false;
            }
        });
        
        // Notify Unity/game to start timer and gameplay
        if (typeof window.onUserInteraction === 'function') {
            window.onUserInteraction();
        }
        
        // Remove listeners after first interaction
        document.removeEventListener('click', onFirstInteraction, true);
        document.removeEventListener('touchstart', onFirstInteraction, true);
        document.removeEventListener('touchend', onFirstInteraction, true);
    }
    
    // Register interaction listeners (capture phase to ensure early detection)
    document.addEventListener('click', onFirstInteraction, true);
    document.addEventListener('touchstart', onFirstInteraction, true);
    document.addEventListener('touchend', onFirstInteraction, true);
    
    // ===== MRAID Integration =====
    function onMRAIDReady() {
        console.log('[MRAID] Ready, state:', mraid.getState());
        
        // Set up orientation change listener
        mraid.addEventListener('orientationChange', function(orientation) {
            console.log('[MRAID] Orientation changed:', orientation);
            // Notify Unity if needed
            if (typeof window.onOrientationChange === 'function') {
                window.onOrientationChange(orientation);
            }
        });
        
        // Set up size change listener
        mraid.addEventListener('sizeChange', function(width, height) {
            console.log('[MRAID] Size changed:', width, 'x', height);
        });
        
        // Set up state change listener
        mraid.addEventListener('stateChange', function(state) {
            console.log('[MRAID] State changed:', state);
            // Pause/mute when hidden
            if (state === 'hidden') {
                audioElements.forEach(el => el.muted = true);
            }
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
    }
    
    // ===== CTA/Click-Through Helper =====
    // Requirement: Use mraid.open() for click-through actions
    window.openAppStore = function(url) {
        if (typeof mraid !== 'undefined' && mraid.getState() !== 'loading') {
            console.log('[MRAID] Opening app store:', url);
            mraid.open(url || 'https://apps.apple.com/');
        } else {
            console.log('[MRAID] Not available, opening URL directly:', url);
            window.open(url || 'https://apps.apple.com/', '_blank');
        }
    };
    
    // ===== Initialization =====
    // Set up audio control when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', setupAudioControl);
    } else {
        setupAudioControl();
    }
    
    console.log('[MRAID] Wrapper initialized');
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
