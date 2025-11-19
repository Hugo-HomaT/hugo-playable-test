import React, { useState, useEffect, useRef } from 'react';
import {
    Folder,
    FileAudio,
    Plus,
    Upload,
    Trash2,
    ChevronRight
} from 'lucide-react';
import {
    getAllFolders,
    saveFolder,
    deleteFolder,
    getMediaInFolder,
    saveMedia,
    deleteMedia
} from '../db';
import type { MediaFolder, MediaItem } from '../types';

export const MediaLibrary: React.FC = () => {
    const [folders, setFolders] = useState<MediaFolder[]>([]);
    const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
    const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [isCreatingFolder, setIsCreatingFolder] = useState(false);
    const [newFolderName, setNewFolderName] = useState('');
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        loadFolders();
    }, []);

    useEffect(() => {
        loadMedia(currentFolderId);
    }, [currentFolderId]);

    const loadFolders = async () => {
        try {
            const allFolders = await getAllFolders();
            setFolders(allFolders);
        } catch (err) {
            console.error('Failed to load folders:', err);
        }
    };

    const loadMedia = async (folderId: string | null) => {
        setLoading(true);
        try {
            const items = await getMediaInFolder(folderId);
            setMediaItems(items);
        } catch (err) {
            console.error('Failed to load media:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateFolder = async () => {
        if (!newFolderName.trim()) return;

        const newFolder: MediaFolder = {
            id: crypto.randomUUID(),
            name: newFolderName.trim(),
            parentId: currentFolderId,
            createdAt: Date.now()
        };

        try {
            await saveFolder(newFolder);
            setFolders([...folders, newFolder]);
            setNewFolderName('');
            setIsCreatingFolder(false);
        } catch (err) {
            console.error('Failed to create folder:', err);
            alert('Failed to create folder');
        }
    };

    const handleDeleteFolder = async (folderId: string) => {
        if (!confirm('Are you sure? This will delete the folder and its contents.')) return;
        try {
            await deleteFolder(folderId);
            setFolders(folders.filter(f => f.id !== folderId));
            if (currentFolderId === folderId) {
                setCurrentFolderId(null);
            }
        } catch (err) {
            console.error('Failed to delete folder:', err);
        }
    };

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (!files || files.length === 0) return;

        setIsUploading(true);
        try {
            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                let type: 'image' | 'video' | 'audio' = 'image';
                if (file.type.startsWith('video/')) type = 'video';
                else if (file.type.startsWith('audio/')) type = 'audio';
                else if (!file.type.startsWith('image/')) continue; // Skip unsupported

                const newItem: MediaItem = {
                    id: crypto.randomUUID(),
                    name: file.name,
                    type,
                    blob: file,
                    folderId: currentFolderId,
                    createdAt: Date.now(),
                    size: file.size
                };

                // Get dimensions for images/videos if possible (simplified for now)
                if (type === 'image') {
                    const img = new Image();
                    img.src = URL.createObjectURL(file);
                    await new Promise(resolve => img.onload = resolve);
                    newItem.dimensions = { width: img.width, height: img.height };
                }

                await saveMedia(newItem);
            }
            await loadMedia(currentFolderId);
        } catch (err) {
            console.error('Upload failed:', err);
            alert('Upload failed');
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleDeleteMedia = async (id: string) => {
        if (!confirm('Delete this file?')) return;
        try {
            await deleteMedia(id);
            setMediaItems(mediaItems.filter(item => item.id !== id));
        } catch (err) {
            console.error('Failed to delete media:', err);
        }
    };

    const getBreadcrumbs = () => {
        const crumbs = [{ id: null, name: 'All Media' }];
        let current = folders.find(f => f.id === currentFolderId);
        const path = [];
        while (current) {
            path.unshift({ id: current.id, name: current.name });
            const parentId = current.parentId;
            current = folders.find(f => f.id === parentId);
        }
        return [...crumbs, ...path];
    };

    const currentSubfolders = folders.filter(f => f.parentId === currentFolderId);

    return (
        <div style={{ display: 'flex', height: '100%', gap: '24px' }}>
            {/* Sidebar */}
            <div style={{
                width: '250px',
                display: 'flex',
                flexDirection: 'column',
                borderRight: '1px solid var(--color-border)',
                paddingRight: '24px'
            }}>
                <button
                    onClick={() => setIsCreatingFolder(true)}
                    style={{
                        width: '100%',
                        padding: '10px',
                        backgroundColor: 'var(--color-bg-tertiary)',
                        border: '1px solid var(--color-border)',
                        borderRadius: 'var(--radius-md)',
                        color: 'var(--color-text-primary)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        marginBottom: '16px'
                    }}
                >
                    <Plus size={16} /> New Folder
                </button>

                {isCreatingFolder && (
                    <div style={{ marginBottom: '16px', display: 'flex', gap: '8px' }}>
                        <input
                            autoFocus
                            placeholder="Folder Name"
                            value={newFolderName}
                            onChange={e => setNewFolderName(e.target.value)}
                            onKeyDown={e => {
                                if (e.key === 'Enter') handleCreateFolder();
                                if (e.key === 'Escape') setIsCreatingFolder(false);
                            }}
                            style={{
                                flex: 1,
                                padding: '6px',
                                borderRadius: 'var(--radius-sm)',
                                border: '1px solid var(--color-border)',
                                backgroundColor: 'var(--color-bg-primary)',
                                color: 'var(--color-text-primary)',
                                width: '100%'
                            }}
                        />
                    </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div
                        onClick={() => setCurrentFolderId(null)}
                        style={{
                            padding: '8px 12px',
                            borderRadius: 'var(--radius-sm)',
                            cursor: 'pointer',
                            backgroundColor: currentFolderId === null ? 'var(--color-accent)' : 'transparent',
                            color: currentFolderId === null ? 'white' : 'var(--color-text-secondary)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                        }}
                    >
                        <Folder size={16} /> All Media
                    </div>
                    {folders.map(folder => (
                        <div
                            key={folder.id}
                            onClick={() => setCurrentFolderId(folder.id)}
                            style={{
                                padding: '8px 12px',
                                borderRadius: 'var(--radius-sm)',
                                cursor: 'pointer',
                                backgroundColor: currentFolderId === folder.id ? 'var(--color-accent)' : 'transparent',
                                color: currentFolderId === folder.id ? 'white' : 'var(--color-text-secondary)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                marginLeft: folder.parentId ? '16px' : '0'
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Folder size={16} /> {folder.name}
                            </div>
                            {currentFolderId !== folder.id && (
                                <button
                                    onClick={(e) => { e.stopPropagation(); handleDeleteFolder(folder.id); }}
                                    style={{ background: 'none', border: 'none', color: 'inherit', opacity: 0.5, cursor: 'pointer' }}
                                >
                                    <Trash2 size={12} />
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Main Content */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-text-secondary)' }}>
                        {getBreadcrumbs().map((crumb, i) => (
                            <React.Fragment key={crumb.id || 'root'}>
                                {i > 0 && <ChevronRight size={14} />}
                                <span
                                    onClick={() => setCurrentFolderId(crumb.id)}
                                    style={{
                                        cursor: 'pointer',
                                        fontWeight: crumb.id === currentFolderId ? 600 : 400,
                                        color: crumb.id === currentFolderId ? 'var(--color-text-primary)' : 'inherit'
                                    }}
                                >
                                    {crumb.name}
                                </span>
                            </React.Fragment>
                        ))}
                    </div>

                    <div>
                        <input
                            type="file"
                            multiple
                            ref={fileInputRef}
                            onChange={handleFileUpload}
                            style={{ display: 'none' }}
                            accept="image/*,video/*,audio/*"
                        />
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isUploading}
                            style={{
                                padding: '8px 16px',
                                backgroundColor: 'var(--color-accent)',
                                color: 'white',
                                border: 'none',
                                borderRadius: 'var(--radius-sm)',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                opacity: isUploading ? 0.7 : 1
                            }}
                        >
                            <Upload size={16} /> {isUploading ? 'Uploading...' : 'Upload Media'}
                        </button>
                    </div>
                </div>

                {/* Subfolders Grid */}
                {currentSubfolders.length > 0 && (
                    <div style={{ marginBottom: '32px' }}>
                        <h3 style={{ fontSize: '14px', color: 'var(--color-text-secondary)', marginBottom: '12px' }}>Folders</h3>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '16px' }}>
                            {currentSubfolders.map(folder => (
                                <div
                                    key={folder.id}
                                    onClick={() => setCurrentFolderId(folder.id)}
                                    style={{
                                        padding: '16px',
                                        backgroundColor: 'var(--color-bg-secondary)',
                                        border: '1px solid var(--color-border)',
                                        borderRadius: 'var(--radius-md)',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        gap: '12px',
                                        textAlign: 'center'
                                    }}
                                >
                                    <Folder size={48} color="var(--color-accent)" fill="var(--color-accent)" fillOpacity={0.2} />
                                    <div style={{ fontWeight: 500 }}>{folder.name}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Media Grid */}
                <div>
                    <h3 style={{ fontSize: '14px', color: 'var(--color-text-secondary)', marginBottom: '12px' }}>Files</h3>
                    {loading ? (
                        <div>Loading...</div>
                    ) : mediaItems.length === 0 ? (
                        <div style={{
                            padding: '40px',
                            border: '2px dashed var(--color-border)',
                            borderRadius: 'var(--radius-lg)',
                            textAlign: 'center',
                            color: 'var(--color-text-secondary)'
                        }}>
                            No files in this folder. Upload something to get started.
                        </div>
                    ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '16px' }}>
                            {mediaItems.map(item => (
                                <div
                                    key={item.id}
                                    style={{
                                        backgroundColor: 'var(--color-bg-secondary)',
                                        border: '1px solid var(--color-border)',
                                        borderRadius: 'var(--radius-md)',
                                        overflow: 'hidden',
                                        position: 'relative'
                                    }}
                                >
                                    <div style={{
                                        height: '140px',
                                        backgroundColor: '#000',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        position: 'relative'
                                    }}>
                                        {item.type === 'image' ? (
                                            <img
                                                src={URL.createObjectURL(item.blob)}
                                                alt={item.name}
                                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                            />
                                        ) : item.type === 'video' ? (
                                            <video
                                                src={URL.createObjectURL(item.blob)}
                                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                            />
                                        ) : (
                                            <FileAudio size={48} color="var(--color-text-secondary)" />
                                        )}

                                        <div style={{
                                            position: 'absolute',
                                            top: '8px',
                                            right: '8px',
                                            backgroundColor: 'rgba(0,0,0,0.5)',
                                            borderRadius: '4px',
                                            padding: '4px'
                                        }}>
                                            <button
                                                onClick={() => handleDeleteMedia(item.id)}
                                                style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </div>
                                    <div style={{ padding: '12px' }}>
                                        <div style={{ fontWeight: 500, fontSize: '14px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={item.name}>
                                            {item.name}
                                        </div>
                                        <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '4px', display: 'flex', justifyContent: 'space-between' }}>
                                            <span>{(item.size / 1024 / 1024).toFixed(2)} MB</span>
                                            {item.dimensions && <span>{item.dimensions.width}x{item.dimensions.height}</span>}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
