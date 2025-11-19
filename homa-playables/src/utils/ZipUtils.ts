import JSZip from 'jszip';
import type { Variable } from '../types';

export interface ParsedProject {
    config: {
        version: string;
        variables: Variable[];
    };
    files: Record<string, Blob>;
    entryPoint: string;
}

export async function parseProjectZip(file: File): Promise<ParsedProject> {
    const zip = await JSZip.loadAsync(file);

    // 1. Find config
    const configFile = zip.file('homa_config.json');
    if (!configFile) {
        throw new Error('homa_config.json not found in zip');
    }

    const configText = await configFile.async('string');
    const config = JSON.parse(configText);

    // 2. Extract all files to Blobs
    const files: Record<string, Blob> = {};
    let entryPoint = '';

    const filePromises: Promise<void>[] = [];

    zip.forEach((relativePath, zipEntry) => {
        if (!zipEntry.dir) {
            const promise = (async () => {
                const blob = await zipEntry.async('blob');

                // Determine mime type
                let type = 'application/octet-stream';
                if (relativePath.endsWith('.html')) type = 'text/html';
                else if (relativePath.endsWith('.js') || relativePath.endsWith('.js.gz')) type = 'application/javascript';
                else if (relativePath.endsWith('.css')) type = 'text/css';
                else if (relativePath.endsWith('.png')) type = 'image/png';
                else if (relativePath.endsWith('.jpg')) type = 'image/jpeg';
                else if (relativePath.endsWith('.wasm') || relativePath.endsWith('.wasm.gz')) type = 'application/wasm';
                else if (relativePath.endsWith('.json')) type = 'application/json';

                // Handle Gzip Decompression
                if (relativePath.endsWith('.gz')) {
                    try {
                        // Decompress using native DecompressionStream
                        const ds = new DecompressionStream('gzip');
                        const decompressedStream = blob.stream().pipeThrough(ds);
                        const decompressedBlob = await new Response(decompressedStream).blob();

                        // Store with original name but decompressed content
                        files[relativePath] = new Blob([decompressedBlob], { type });
                    } catch (e) {
                        console.warn(`Failed to decompress ${relativePath}, storing as is.`, e);
                        files[relativePath] = new Blob([blob], { type });
                    }
                } else {
                    files[relativePath] = new Blob([blob], { type });
                }

                if (relativePath.endsWith('index.html')) {
                    entryPoint = relativePath;
                }
            })();
            filePromises.push(promise);
        }
    });

    await Promise.all(filePromises);

    if (!entryPoint) {
        const htmlFile = Object.keys(files).find(f => f.endsWith('.html'));
        if (htmlFile) entryPoint = htmlFile;
        else throw new Error('No index.html found');
    }

    // INJECT CSS FIX: Force Unity to fill the window
    // This overrides fixed resolution settings from the Unity template
    if (files[entryPoint]) {
        let indexHtml = await new Response(files[entryPoint]).text();

        const styleFix = `
        <style>
            html, body { width: 100%; height: 100%; margin: 0; padding: 0; overflow: hidden; }
            #unity-container { width: 100% !important; height: 100% !important; position: absolute; top: 0; left: 0; }
            #unity-canvas { width: 100% !important; height: 100% !important; }
        </style>
        `;

        // Inject before </head>
        if (indexHtml.includes('</head>')) {
            indexHtml = indexHtml.replace('</head>', `${styleFix}</head>`);
        } else {
            // Fallback if no head tag
            indexHtml = styleFix + indexHtml;
        }

        files[entryPoint] = new Blob([indexHtml], { type: 'text/html' });
    }

    return { config, files, entryPoint };
}
