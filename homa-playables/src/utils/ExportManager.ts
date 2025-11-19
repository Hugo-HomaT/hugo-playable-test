import JSZip from 'jszip';
import type { Concept } from '../types';

export type ExportNetwork = 'mintegral' | 'applovin';

export async function exportProject(
    originalZipBlob: Blob,
    concept: Concept,
    network: ExportNetwork
): Promise<Blob> {
    const zip = await JSZip.loadAsync(originalZipBlob);

    // 1. Prepare Variable Injection Script
    const varsJson = JSON.stringify(concept.values);
    const injectionScript = `
    <script>
      window.HomaVars = ${varsJson};
      // Override existing variables if they are global or in a known namespace
      // For this prototype, we assume the game reads window.HomaVars
    </script>
  `;

    // 2. Process based on network
    if (network === 'mintegral') {
        return await exportMintegral(zip, injectionScript);
    } else if (network === 'applovin') {
        return await exportAppLovin(zip, injectionScript);
    }

    throw new Error('Unknown network');
}

async function exportMintegral(zip: JSZip, injectionScript: string): Promise<Blob> {
    // Mintegral requires a single HTML file with everything inlined (usually).
    // For this prototype, we will just inject the script into index.html and return it.
    // In a real production tool, we would inline CSS, JS, and Images (base64).

    const indexFile = zip.file('index.html');
    if (!indexFile) throw new Error('index.html not found');

    let html = await indexFile.async('string');

    // Inject script before closing head or body
    if (html.includes('</head>')) {
        html = html.replace('</head>', `${injectionScript}</head>`);
    } else {
        html = html + injectionScript;
    }

    return new Blob([html], { type: 'text/html' });
}

async function exportAppLovin(zip: JSZip, injectionScript: string): Promise<Blob> {
    // AppLovin accepts a zip file.
    // We clone the zip, inject the script into index.html, and re-zip.

    const newZip = new JSZip();

    // Copy all files
    const filePromises: Promise<void>[] = [];

    zip.forEach((relativePath, zipEntry) => {
        if (!zipEntry.dir) {
            const promise = (async () => {
                if (relativePath === 'index.html') {
                    let html = await zipEntry.async('string');
                    if (html.includes('</head>')) {
                        html = html.replace('</head>', `${injectionScript}</head>`);
                    } else {
                        html = html + injectionScript;
                    }
                    newZip.file(relativePath, html);
                } else {
                    const content = await zipEntry.async('blob');
                    newZip.file(relativePath, content);
                }
            })();
            filePromises.push(promise);
        }
    });

    await Promise.all(filePromises);

    return await newZip.generateAsync({ type: 'blob' });
}
