import JSZip from 'jszip';

import { validateFileSize, formatFileSize } from './AssetInliner';
import { getMintegralSDK } from './MRAIDWrapper';

export type ExportNetwork = 'mintegral' | 'applovin';

export async function exportProject(
    originalZipBlob: Blob,
    values: Record<string, any>,
    network: ExportNetwork,
    projectName: string = 'playable'
): Promise<Blob> {
    const zip = await JSZip.loadAsync(originalZipBlob);
    const varsJson = JSON.stringify(values);

    if (network === 'mintegral') {
        return await exportMintegral(zip, varsJson, projectName);
    } else if (network === 'applovin') {
        return await exportAppLovin(zip, varsJson, projectName);
    }

    throw new Error('Unknown network');
}

/**
 * Mintegral Export
 * Format: ZIP file with structure: name.zip > name/ > name.html
 * Max size: 5MB
 */
async function exportMintegral(
    zip: JSZip,
    varsJson: string,
    projectName: string
): Promise<Blob> {
    const indexFile = zip.file('index.html');
    if (!indexFile) throw new Error('index.html not found');

    let html = await indexFile.async('string');

    // Inject Mintegral SDK and variables
    const sdkScript = getMintegralSDK(varsJson);
    if (html.includes('</head>')) {
        html = html.replace('</head>', `${sdkScript}</head>`);
    } else {
        html = sdkScript + html;
    }

    // Create new ZIP with proper structure
    const exportZip = new JSZip();
    const folderName = projectName;

    // Add modified HTML
    exportZip.file(`${folderName}/${folderName}.html`, html);

    // Copy all other files to the folder
    const filePromises: Promise<void>[] = [];
    zip.forEach((relativePath, zipEntry) => {
        if (!zipEntry.dir && relativePath !== 'index.html') {
            const promise = (async () => {
                const content = await zipEntry.async('blob');
                exportZip.file(`${folderName}/${relativePath}`, content);
            })();
            filePromises.push(promise);
        }
    });

    await Promise.all(filePromises);

    // Generate ZIP
    const resultBlob = await exportZip.generateAsync({
        type: 'blob',
        compression: 'DEFLATE',
        compressionOptions: { level: 9 }
    });

    // Validate size
    if (!validateFileSize(resultBlob.size)) {
        throw new Error(
            `Mintegral export exceeds 5MB limit. Current size: ${formatFileSize(resultBlob.size)}`
        );
    }

    console.log(`[Mintegral] Export size: ${formatFileSize(resultBlob.size)}`);
    return resultBlob;
}

/**
 * AppLovin Export
 * Format: Single HTML file with ALL assets Base64-encoded
 * Max size: 5MB
 * CRITICAL: Must include MRAID v2.0 integration
 */
async function exportAppLovin(
    zip: JSZip,
    varsJson: string,
    projectName: string
): Promise<Blob> {
    // Use Unity-specific exporter
    const { exportUnityToSingleHTML } = await import('./UnityExporter');

    const finalHtml = await exportUnityToSingleHTML(zip, varsJson, projectName);

    // Create final blob
    const resultBlob = new Blob([finalHtml], { type: 'text/html' });

    // Validate size
    // if (!validateFileSize(resultBlob.size)) {
    //     throw new Error(
    //         `AppLovin export exceeds 5MB limit. Current size: ${formatFileSize(resultBlob.size)}. ` +
    //         `Try reducing texture quality or removing unused assets in Unity.`
    //     );
    // }

    console.log(`[AppLovin] Final export size: ${formatFileSize(resultBlob.size)}`);
    return resultBlob;
}
