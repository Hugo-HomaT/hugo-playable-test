import JSZip from 'jszip';
import { getMRAIDWrapper } from './MRAIDWrapper';

async function blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            const result = reader.result as string;
            resolve(result.split(',')[1]); // Return only base64 part
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}

async function findBuildFile(zip: JSZip, pattern: string): Promise<JSZip.JSZipObject | null> {
    let found: JSZip.JSZipObject | null = null;
    zip.forEach((relativePath, file) => {
        if (relativePath.includes('Build/') && relativePath.endsWith(pattern)) {
            found = file;
        }
    });
    return found;
}

export async function exportUnityToSingleHTML(
    zip: JSZip,
    varsJson: string,
    projectName: string = 'playable'
): Promise<string> {
    console.log('[UnityExporter] Starting Unity WebGL export...');

    const loaderFile = await findBuildFile(zip, '.loader.js');
    const frameworkFile = await findBuildFile(zip, '.framework.js.gz');
    const wasmFile = await findBuildFile(zip, '.wasm.gz');
    const dataFile = await findBuildFile(zip, '.data.gz');

    if (!loaderFile || !frameworkFile || !wasmFile || !dataFile) {
        throw new Error('Missing Unity build files');
    }

    // Load loader.js
    let loaderJs = await loaderFile.async('string');
    // Trim whitespace but preserve the code structure
    loaderJs = loaderJs.trim();

    // Prevent premature script tag closing if it exists in the code (rare but possible)
    loaderJs = loaderJs.replace(/<\/script>/g, '<\\/script>');

    const frameworkBlob = await frameworkFile.async('blob');
    const wasmBlob = await wasmFile.async('blob');
    const dataBlob = await dataFile.async('blob');

    console.log('[UnityExporter] Compressed sizes:', {
        framework: `${(frameworkBlob.size / 1024).toFixed(2)} KB`,
        wasm: `${(wasmBlob.size / 1024 / 1024).toFixed(2)} MB`,
        data: `${(dataBlob.size / 1024 / 1024).toFixed(2)} MB`
    });

    const [f, w, d] = await Promise.all([
        blobToBase64(frameworkBlob),
        blobToBase64(wasmBlob),
        blobToBase64(dataBlob)
    ]);

    const mraidScript = getMRAIDWrapper(varsJson);

    // Minified HTML with loader.js in separate script tag to avoid conflicts
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,user-scalable=no"><title>${projectName}</title>${mraidScript}<style>*{margin:0;padding:0}html,body,#c{width:100%;height:100%;overflow:hidden;background:#000;display:block}</style></head><body><canvas id="c"></canvas><script>${loaderJs}</script><script>async function d(b,t){const s=atob(b),a=new Uint8Array(s.length);for(let i=0;i<s.length;i++)a[i]=s.charCodeAt(i);const r=await new Response(new Blob([a]).stream().pipeThrough(new DecompressionStream('gzip'))).blob();return URL.createObjectURL(new Blob([r],{type:t}));}(async()=>{try{const[u,v,w]=await Promise.all([d('${f}','application/javascript'),d('${w}','application/wasm'),d('${d}','application/octet-stream')]);createUnityInstance(document.getElementById('c'),{dataUrl:w,frameworkUrl:u,codeUrl:v,streamingAssetsUrl:"StreamingAssets",companyName:"Homa",productName:"${projectName}",productVersion:"1.0"},()=>{}).then(i=>{window.unityInstance=i;}).catch(e=>{alert(e);})}catch(e){alert(e.message);}})();</script></body></html>`;

    const finalSize = html.length / 1024 / 1024;
    console.log('[UnityExporter] Export complete. HTML size:', finalSize.toFixed(2), 'MB');

    return html;
}
