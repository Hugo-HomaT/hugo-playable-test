import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { Project } from './types';

interface HomaDB extends DBSchema {
    projects: {
        key: string;
        value: Project;
    };
    projectFiles: {
        key: string;
        value: {
            projectId: string;
            zipBlob: Blob;
        };
    };
    'preview-files': {
        key: [string, string]; // [projectId, filePath]
        value: Blob;
    };
}

const DB_NAME = 'homa-playables-db';
const DB_VERSION = 2;

let dbPromise: Promise<IDBPDatabase<HomaDB>>;

function getDB() {
    if (!dbPromise) {
        dbPromise = openDB<HomaDB>(DB_NAME, DB_VERSION, {
            upgrade(db) {
                if (!db.objectStoreNames.contains('projects')) {
                    db.createObjectStore('projects', { keyPath: 'id' });
                }
                if (!db.objectStoreNames.contains('projectFiles')) {
                    db.createObjectStore('projectFiles', { keyPath: 'projectId' });
                }
                if (!db.objectStoreNames.contains('preview-files')) {
                    db.createObjectStore('preview-files'); // Key is array [projectId, filePath]
                }
            },
        });
    }
    return dbPromise;
}

export async function saveProject(project: Project, zipBlob: Blob) {
    const db = await getDB();
    const tx = db.transaction(['projects', 'projectFiles'], 'readwrite');

    await Promise.all([
        tx.objectStore('projects').put(project),
        tx.objectStore('projectFiles').put({ projectId: project.id, zipBlob }),
        tx.done,
    ]);
}

export async function getAllProjects(): Promise<Project[]> {
    const db = await getDB();
    return db.getAll('projects');
}

export async function getProject(id: string): Promise<Project | undefined> {
    const db = await getDB();
    return db.get('projects', id);
}

export async function getProjectZip(id: string): Promise<Blob | undefined> {
    const db = await getDB();
    const record = await db.get('projectFiles', id);
    return record?.zipBlob;
}

export async function deleteProject(id: string) {
    const db = await getDB();
    const tx = db.transaction(['projects', 'projectFiles'], 'readwrite');

    await Promise.all([
        tx.objectStore('projects').delete(id),
        tx.objectStore('projectFiles').delete(id),
        tx.done,
    ]);
}

export async function updateProject(id: string, updates: Partial<Project>): Promise<Project> {
    const db = await getDB();
    const project = await db.get('projects', id);
    if (!project) throw new Error('Project not found');

    // Only update lastModified if explicitly provided in updates
    // This way renaming won't change the upload date
    const updatedProject = { ...project, ...updates };
    await db.put('projects', updatedProject);
    return updatedProject;
}

export async function savePreviewFile(projectId: string, filePath: string, file: Blob) {
    const db = await getDB();
    await db.put('preview-files', file, [projectId, filePath]);
}

export async function clearPreviewFiles(projectId: string) {
    const db = await getDB();
    const tx = db.transaction('preview-files', 'readwrite');
    const store = tx.objectStore('preview-files');

    // Iterate and delete (inefficient but works for prototype)
    let cursor = await store.openCursor();
    while (cursor) {
        if (cursor.key[0] === projectId) {
            await cursor.delete();
        }
        cursor = await cursor.continue();
    }
    await tx.done;
}
