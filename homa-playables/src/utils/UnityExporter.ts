import JSZip from 'jszip';
import { getMRAIDWrapper } from './MRAIDWrapper';

/**
 * Export Unity WebGL build as a single self-contained HTML file
 * Handles decompression of .gz files, base64 encoding, and loader patching
 */

async function blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}

/**
 * Find Unity build file by extension pattern
 */
async function findBuildFile(zip: JSZip, pattern: string): Promise<JSZip.JSZipObject | null> {
    let found: JSZip.JSZipObject | null = null;

    zip.forEach((relativePath, file) => {
        if (relativePath.includes('Build/') && relativePath.endsWith(pattern)) {
            found = file;
        }
    });

    return found;
}

/**
 * Export Unity WebGL build as a single self-contained HTML file
 * Handles decompression of .gz files, base64 encoding, and loader patching
 */
export async function exportUnityToSingleHTML(
    zip: JSZip,
    varsJson: string,
    projectName: string = 'playable'
): Promise<string> {
    console.log('[UnityExporter] Starting Unity WebGL export...');

    // 1. Find Unity build files
    const loaderFile = await findBuildFile(zip, '.loader.js');
    const frameworkFile = await findBuildFile(zip, '.framework.js.gz');
    const wasmFile = await findBuildFile(zip, '.wasm.gz');
    const dataFile = await findBuildFile(zip, '.data.gz');

    if (!loaderFile || !frameworkFile || !wasmFile || !dataFile) {
        throw new Error('Missing Unity build files. Expected: loader.js, framework.js.gz, wasm.gz, data.gz');
    }

    console.log('[UnityExporter] Found Unity build files');

    // 2. Load files (Keep compressed to save space!)
    const loaderJs = await loaderFile.async('string');
    // Read as blobs directly (no decompression)
    const frameworkBlob = await frameworkFile.async('blob');
    const wasmBlob = await wasmFile.async('blob');
    const dataBlob = await dataFile.async('blob');

    console.log('[UnityExporter] Compressed sizes:', {
        framework: `${(frameworkBlob.size / 1024).toFixed(2)} KB`,
        wasm: `${(wasmBlob.size / 1024 / 1024).toFixed(2)} MB`,
        data: `${(dataBlob.size / 1024 / 1024).toFixed(2)} MB`
    });

    // 3. Convert COMPRESSED content to base64
    const frameworkBase64Full = await blobToBase64(frameworkBlob);
    const wasmBase64Full = await blobToBase64(wasmBlob);
    const dataBase64Full = await blobToBase64(dataBlob);

    // Extract just the base64 part
    const frameworkBase64 = frameworkBase64Full.split(',')[1];
    const wasmBase64 = wasmBase64Full.split(',')[1];
    const dataBase64 = dataBase64Full.split(',')[1];

    console.log('[UnityExporter] Base64 compressed sizes:', {
        framework: `${(frameworkBase64.length / 1024 / 1024).toFixed(2)} MB`,
        wasm: `${(wasmBase64.length / 1024 / 1024).toFixed(2)} MB`,
        data: `${(dataBase64.length / 1024 / 1024).toFixed(2)} MB`
    });

    // 5. Build the final HTML
    const mraidScript = getMRAIDWrapper(varsJson);

    const html = `<!DOCTYPE html>
<html lang="en-us">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>${projectName}</title>
    ${mraidScript}
    <style>
        html, body { margin: 0; padding: 0; width: 100%; height: 100%; overflow: hidden; background: #000; }
        #unity-container { width: 100%; height: 100%; position: absolute; top: 0; left: 0; }
        #unity-canvas { width: 100% !important; height: 100% !important; display: block; }
    </style>
</head>
<body>
    <div id="unity-container">
        <canvas id="unity-canvas"></canvas>
    </div>
    
    <script>
        // 1. Inline Unity Loader
        ${loaderJs}

        // 2. Client-side Decompression Helper
        async function decompressAsset(base64Data, mimeType) {
            try {
                // Decode base64 to binary string
                const binaryString = atob(base64Data);
                const bytes = new Uint8Array(binaryString.length);
                for (let i = 0; i < binaryString.length; i++) {
                    bytes[i] = binaryString.charCodeAt(i);
                }
                
                // Decompress using browser native API
                const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
                const decompressedBlob = await new Response(stream).blob();
                
                // Create Blob URL with correct MIME type
                return URL.createObjectURL(decompressedBlob.slice(0, decompressedBlob.size, mimeType));
            } catch (e) {
                console.error("Decompression failed:", e);
                throw e;
            }
        }

        // 3. Initialize Unity with Decompressed Assets
        (async function() {
            try {
                console.log("Starting asset decompression...");
                
                const [frameworkUrl, codeUrl, dataUrl] = await Promise.all([
                    decompressAsset("${frameworkBase64}", "application/javascript"),
                    decompressAsset("${wasmBase64}", "application/wasm"),
                    decompressAsset("${dataBase64}", "application/octet-stream")
                ]);
                
                console.log("Assets decompressed. Initializing Unity...");

                var canvas = document.querySelector("#unity-canvas");
                var config = {
                    dataUrl: dataUrl,
                    frameworkUrl: frameworkUrl,
                    codeUrl: codeUrl,
                    streamingAssetsUrl: "StreamingAssets",
                    companyName: "Homa",
                    productName: "${projectName}",
                    productVersion: "1.0",
                };
                
                createUnityInstance(canvas, config, function(progress) {
                    // console.log('Loading:', progress);
                }).then(function(unityInstance) {
                    window.unityInstance = unityInstance;
                }).catch(function(message) {
                    alert('Unity Error: ' + message);
                });
                
            } catch (e) {
                alert("Failed to load playable: " + e.message);
            }
        })();
    </script>
</body>
</html>`;

    console.log('[UnityExporter] Export complete. HTML size:', (html.length / 1024 / 1024).toFixed(2), 'MB');

    return html;
}


