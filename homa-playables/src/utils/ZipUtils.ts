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
                let blob = await zipEntry.async('blob');

                // Determine mime type (check clean filename without compression extension)
                const cleanPath = relativePath.replace(/\.(gz|br)$/, '');
                let type = 'application/octet-stream';
                if (cleanPath.endsWith('.html')) type = 'text/html';
                else if (cleanPath.endsWith('.js')) type = 'application/javascript';
                else if (cleanPath.endsWith('.css')) type = 'text/css';
                else if (cleanPath.endsWith('.png')) type = 'image/png';
                else if (cleanPath.endsWith('.jpg')) type = 'image/jpeg';
                else if (cleanPath.endsWith('.wasm')) type = 'application/wasm';
                else if (cleanPath.endsWith('.json')) type = 'application/json';
                else if (cleanPath.endsWith('.data')) type = 'application/octet-stream';

                // Handle Gzip Decompression (.gz files)
                if (relativePath.endsWith('.gz')) {
                    console.log(`[ZipUtils] Decompressing gzip: ${relativePath}`);
                    try {
                        const ds = new DecompressionStream('gzip');
                        const decompressedStream = blob.stream().pipeThrough(ds);
                        blob = await new Response(decompressedStream).blob();
                    } catch (e) {
                        console.warn(`[ZipUtils] Failed to decompress gzip ${relativePath}, storing as is.`, e);
                    }
                }

                // Handle Brotli Decompression (.br files)
                if (relativePath.endsWith('.br')) {
                    console.log(`[ZipUtils] Decompressing brotli: ${relativePath}`);
                    try {
                        // Note: DecompressionStream with 'deflate-raw' is a workaround
                        // Browser support for 'br' in DecompressionStream is limited
                        // We'll try, but may need to serve compressed if it fails
                        const ds = new DecompressionStream('deflate-raw');
                        const decompressedStream = blob.stream().pipeThrough(ds);
                        blob = await new Response(decompressedStream).blob();
                    } catch (e) {
                        console.warn(`[ZipUtils] Brotli decompression not supported or failed for ${relativePath}. Serving compressed.`, e);
                        // If decompression fails, we'll serve the compressed file
                        // The browser will handle it if Content-Encoding is set properly
                    }
                }

                // Store with original name but decompressed content
                files[relativePath] = new Blob([blob], { type });

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
    if (files[entryPoint]) {
        let indexHtml = await new Response(files[entryPoint]).text();

        const styleFix = `
        <style>
            html, body { width: 100%; height: 100%; margin: 0; padding: 0; overflow: hidden; }
            #unity-container { width: 100% !important; height: 100% !important; position: absolute; top: 0; left: 0; }
            #unity-canvas { width: 100% !important; height: 100% !important; }
        </style>
        `;

        if (indexHtml.includes('</head>')) {
            indexHtml = indexHtml.replace('</head>', `${styleFix}</head>`);
        } else {
            indexHtml = styleFix + indexHtml;
        }

        files[entryPoint] = new Blob([indexHtml], { type: 'text/html' });
    }

    return { config, files, entryPoint };
}
