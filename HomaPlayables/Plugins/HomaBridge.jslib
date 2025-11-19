mergeInto(LibraryManager.library, {
    HomaGetConfigJson: function () {
        // Check if HOMA_CONFIG exists in window
        if (typeof window.HOMA_CONFIG !== 'undefined') {
            var json = JSON.stringify(window.HOMA_CONFIG);
            var bufferSize = lengthBytesUTF8(json) + 1;
            var buffer = _malloc(bufferSize);
            stringToUTF8(json, buffer, bufferSize);
            return buffer;
        }
        return null;
    }
});
