const DB_NAME = 'homa-playables-db';
const STORE_NAME = 'preview-files';
const SW_VERSION = '1.4'; // Bump to ensure update

self.addEventListener('install', (event) => {
    console.log(`[SW] Installing version ${SW_VERSION}`);
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    console.log(`[SW] Activating version ${SW_VERSION}`);
    event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // Intercept requests to /preview/
    if (url.pathname.startsWith('/preview/')) {
        event.respondWith(handlePreviewRequest(url));
    }
});

async function handlePreviewRequest(url) {
    try {
        // Path format: /preview/<projectId>/<filePath>
        const pathParts = url.pathname.split('/');
        // ["", "preview", "projectId", ...filePathParts]

        if (pathParts.length < 4) {
            return new Response('Invalid preview URL', { status: 400 });
        }

        const projectId = pathParts[2];
        const filePath = pathParts.slice(3).join('/'); // Reconstruct file path

        console.log(`[SW] Fetching: ${filePath} for project ${projectId}`);

        const db = await openDB();
        const fileBlob = await getFile(db, projectId, filePath);

        if (!fileBlob) {
            console.error(`[SW] File not found: ${filePath}`);
            return new Response(`File not found: ${filePath}`, { status: 404 });
        }

        // Prepare headers
        const headers = new Headers();

        // Default type from Blob (set by ZipUtils)
        let contentType = fileBlob.type || 'application/octet-stream';

        // Override based on extension for Unity compatibility
        if (filePath.endsWith('.html')) {
            contentType = 'text/html';
        } else if (filePath.endsWith('.js') || filePath.endsWith('.js.gz') || filePath.endsWith('.js.br')) {
            contentType = 'application/javascript';
        } else if (filePath.endsWith('.wasm') || filePath.endsWith('.wasm.gz') || filePath.endsWith('.wasm.br')) {
            contentType = 'application/wasm';
        } else if (filePath.endsWith('.data') || filePath.endsWith('.data.gz') || filePath.endsWith('.data.br')) {
            contentType = 'application/octet-stream';
        } else if (filePath.endsWith('.json')) {
            contentType = 'application/json';
        } else if (filePath.endsWith('.css')) {
            contentType = 'text/css';
        }

        headers.set('Content-Type', contentType);

        // NOTE: We do NOT set Content-Encoding here.
        // The files are decompressed upon upload in ZipUtils.ts.
        // We serve them as plain files, even if the URL ends in .gz.
        // This avoids browser issues with synthetic responses and Content-Encoding.

        // INJECT CONFIG INTO HTML
        if (filePath.endsWith('.html')) {
            const configBlob = await getFile(db, projectId, 'homa_config.json');
            if (configBlob) {
                const configText = await configBlob.text();
                let htmlText = await fileBlob.text();

                // Parse to log variable count
                try {
                    const configObj = JSON.parse(configText);
                    console.log(`[SW] Injecting HOMA_CONFIG with ${configObj.variables?.length || 0} variables`);
                    console.log('[SW] Config variables:', configObj.variables?.map(v => `${v.name}=${v.value}`).join(', '));
                } catch (e) {
                    console.error('[SW] Failed to parse config for logging:', e);
                }

                // Inject config as global variable before any scripts
                const configScript = `<script>
                    window.HOMA_CONFIG = ${configText};
                    console.log('[HOMA] Config injected:', window.HOMA_CONFIG);
                    console.log('[HOMA] Variables:', window.HOMA_CONFIG.variables?.map(v => v.name + '=' + v.value).join(', '));
                </script>`;
                htmlText = htmlText.replace('<head>', '<head>' + configScript);

                console.log('[SW] Injected HOMA_CONFIG into HTML');

                return new Response(htmlText, {
                    status: 200,
                    headers: headers
                });
            } else {
                console.warn('[SW] No homa_config.json found for project:', projectId);
            }
        }

        console.log(`[SW] Serving ${filePath} as ${contentType}`);

        return new Response(fileBlob, {
            status: 200,
            headers: headers
        });

    } catch (error) {
        console.error('[SW] Error:', error);
        return new Response('Internal Server Error', { status: 500 });
    }
}

// Simple IDB wrapper
function openDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
    });
}

function getFile(db, projectId, filePath) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.get([projectId, filePath]);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
    });
}
