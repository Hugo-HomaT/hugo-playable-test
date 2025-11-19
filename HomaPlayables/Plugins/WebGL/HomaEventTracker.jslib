// JavaScript plugin for HomaEventTracker
// Place this file in Assets/Plugins/WebGL/

mergeInto(LibraryManager.library, {
    SendEventToParent: function(eventName, eventData) {
        var eventNameStr = UTF8ToString(eventName);
        var eventDataStr = UTF8ToString(eventData);
        
        console.log('[Homa Event]', eventNameStr, eventDataStr);
        
        // Send to parent window if in iframe
        if (window.parent && window.parent !== window) {
            try {
                var eventObj = JSON.parse(eventDataStr);
                window.parent.postMessage({
                    type: 'homa_event',
                    eventName: eventNameStr,
                    eventData: eventObj,
                    timestamp: Date.now()
                }, '*');
            } catch (e) {
                console.warn('[Homa Event] Failed to send to parent:', e);
            }
        }
        
        // Also dispatch as custom event for local listeners
        var customEvent = new CustomEvent('homa_event', {
            detail: {
                eventName: eventNameStr,
                eventData: JSON.parse(eventDataStr),
                timestamp: Date.now()
            }
        });
        window.dispatchEvent(customEvent);
    }
});
