import JSZip from 'jszip';

/**
 * Utility to inline assets (images, CSS, JS) into HTML as Base64
 */

export interface InlineResult {
    html: string;
    totalSize: number;
}

/**
 * Convert a Blob to Base64 data URL
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
 * Inline all assets from a ZIP into a single HTML file
 * Returns the HTML string and total size in bytes
 */
export async function inlineAllAssets(
    zip: JSZip,
    indexHtmlPath: string = 'index.html'
): Promise<InlineResult> {
    const indexFile = zip.file(indexHtmlPath);
    if (!indexFile) {
        throw new Error(`${indexHtmlPath} not found in ZIP`);
    }

    let html = await indexFile.async('string');
    const assetMap = new Map<string, string>();

    // Extract all files and convert to Base64
    const filePromises: Promise<void>[] = [];

    zip.forEach((relativePath, zipEntry) => {
        if (!zipEntry.dir && relativePath !== indexHtmlPath) {
            const promise = (async () => {
                const blob = await zipEntry.async('blob');
                const base64 = await blobToBase64(blob);
                assetMap.set(relativePath, base64);
            })();
            filePromises.push(promise);
        }
    });

    await Promise.all(filePromises);

    // Replace asset references in HTML
    // Common patterns: src="...", href="...", url(...)
    for (const [path, base64] of assetMap.entries()) {
        // Handle different path formats
        const patterns = [
            new RegExp(`src=["']${escapeRegex(path)}["']`, 'g'),
            new RegExp(`href=["']${escapeRegex(path)}["']`, 'g'),
            new RegExp(`url\\(["']?${escapeRegex(path)}["']?\\)`, 'g'),
            // Also handle paths with ./ prefix
            new RegExp(`src=["']\\.\\/+${escapeRegex(path)}["']`, 'g'),
            new RegExp(`href=["']\\.\\/+${escapeRegex(path)}["']`, 'g'),
            new RegExp(`url\\(["']?\\.\\/+${escapeRegex(path)}["']?\\)`, 'g'),
        ];

        for (const pattern of patterns) {
            html = html.replace(pattern, (match) => {
                if (match.startsWith('src=')) return `src="${base64}"`;
                if (match.startsWith('href=')) return `href="${base64}"`;
                if (match.startsWith('url(')) return `url(${base64})`;
                return match;
            });
        }
    }

    // Calculate total size
    const totalSize = new Blob([html]).size;

    return { html, totalSize };
}

/**
 * Escape special regex characters in a string
 */
function escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Validate file size against platform limits (5MB)
 */
export function validateFileSize(sizeBytes: number): boolean {
    const MAX_SIZE = 5 * 1024 * 1024; // 5MB
    return sizeBytes <= MAX_SIZE;
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}
