import React, { useState, useEffect, useRef } from 'react';
import {
    Folder,
    FileAudio,
    Plus,
    Upload,
    X,
    ChevronRight,
    Search
} from 'lucide-react';
import {
    getAllFolders,
    saveFolder,
    getMediaInFolder,
    saveMedia
} from '../db';
import type { MediaFolder, MediaItem } from '../types';

interface MediaPickerModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (item: MediaItem) => void;
    allowedTypes?: string[]; // e.g., ['image', 'audio']
}

export const MediaPickerModal: React.FC<MediaPickerModalProps> = ({
    isOpen,
    onClose,
    onSelect,
    allowedTypes
}) => {
    const [folders, setFolders] = useState<MediaFolder[]>([]);
    const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
    const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [isCreatingFolder, setIsCreatingFolder] = useState(false);
    const [newFolderName, setNewFolderName] = useState('');
    const [isUploading, setIsUploading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isOpen) {
            loadFolders();
            loadMedia(currentFolderId);
        }
    }, [isOpen, currentFolderId]);

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
                else if (!file.type.startsWith('image/')) continue;

                // Check if type is allowed
                if (allowedTypes && !allowedTypes.includes(type)) continue;

                const newItem: MediaItem = {
                    id: crypto.randomUUID(),
                    name: file.name,
                    type,
                    blob: file,
                    folderId: currentFolderId,
                    createdAt: Date.now(),
                    size: file.size
                };

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
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
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

    const filteredItems = mediaItems.filter(item => {
        if (allowedTypes && !allowedTypes.includes(item.type)) return false;
        if (searchQuery && !item.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
        return true;
    });

    const currentSubfolders = folders.filter(f => f.parentId === currentFolderId);

    if (!isOpen) return null;

    return (
        <div style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.7)',
            zIndex: 1000,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center'
        }}>
            <div style={{
                width: '900px',
                height: '700px',
                backgroundColor: 'var(--color-bg-primary)',
                borderRadius: 'var(--radius-lg)',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                boxShadow: '0 20px 50px rgba(0,0,0,0.3)'
            }}>
                {/* Header */}
                <div style={{
                    padding: '16px 24px',
                    borderBottom: '1px solid var(--color-border)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}>
                    <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>Select Media</h2>
                    <button
                        onClick={onClose}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-secondary)' }}
                    >
                        <X size={20} />
                    </button>
                </div>

                <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
                    {/* Sidebar */}
                    <div style={{
                        width: '220px',
                        borderRight: '1px solid var(--color-border)',
                        padding: '16px',
                        display: 'flex',
                        flexDirection: 'column',
                        backgroundColor: 'var(--color-bg-secondary)'
                    }}>
                        <button
                            onClick={() => setIsCreatingFolder(true)}
                            style={{
                                width: '100%',
                                padding: '8px',
                                backgroundColor: 'var(--color-bg-tertiary)',
                                border: '1px solid var(--color-border)',
                                borderRadius: 'var(--radius-sm)',
                                color: 'var(--color-text-primary)',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px',
                                marginBottom: '16px',
                                fontSize: '13px'
                            }}
                        >
                            <Plus size={14} /> New Folder
                        </button>

                        {isCreatingFolder && (
                            <div style={{ marginBottom: '12px' }}>
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
                                        width: '100%',
                                        padding: '6px',
                                        borderRadius: 'var(--radius-sm)',
                                        border: '1px solid var(--color-border)',
                                        backgroundColor: 'var(--color-bg-primary)',
                                        color: 'var(--color-text-primary)',
                                        fontSize: '13px'
                                    }}
                                />
                            </div>
                        )}

                        <div style={{ flex: 1, overflowY: 'auto' }}>
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
                                    gap: '8px',
                                    fontSize: '14px',
                                    marginBottom: '4px'
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
                                        gap: '8px',
                                        fontSize: '14px',
                                        marginLeft: folder.parentId ? '16px' : '0',
                                        marginBottom: '4px'
                                    }}
                                >
                                    <Folder size={16} /> {folder.name}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Main Content */}
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '24px', overflowY: 'auto' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-text-secondary)', fontSize: '14px' }}>
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

                            <div style={{ display: 'flex', gap: '12px' }}>
                                <div style={{ position: 'relative' }}>
                                    <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-secondary)' }} />
                                    <input
                                        type="text"
                                        placeholder="Search..."
                                        value={searchQuery}
                                        onChange={e => setSearchQuery(e.target.value)}
                                        style={{
                                            padding: '8px 12px 8px 34px',
                                            borderRadius: 'var(--radius-md)',
                                            border: '1px solid var(--color-border)',
                                            backgroundColor: 'var(--color-bg-tertiary)',
                                            color: 'var(--color-text-primary)',
                                            fontSize: '14px'
                                        }}
                                    />
                                </div>
                                <input
                                    type="file"
                                    multiple
                                    ref={fileInputRef}
                                    onChange={handleFileUpload}
                                    style={{ display: 'none' }}
                                    accept={allowedTypes ? allowedTypes.map(t => `${t}/*`).join(',') : "image/*,video/*,audio/*"}
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
                                        fontSize: '14px'
                                    }}
                                >
                                    <Upload size={16} /> Upload
                                </button>
                            </div>
                        </div>

                        {/* Folders Grid */}
                        {currentSubfolders.length > 0 && !searchQuery && (
                            <div style={{ marginBottom: '24px' }}>
                                <h3 style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Folders</h3>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '16px' }}>
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
                                                gap: '8px',
                                                textAlign: 'center',
                                                transition: 'transform 0.1s'
                                            }}
                                            onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.02)'}
                                            onMouseLeave={e => e.currentTarget.style.transform = 'none'}
                                        >
                                            <Folder size={40} color="var(--color-accent)" fill="var(--color-accent)" fillOpacity={0.2} />
                                            <div style={{ fontWeight: 500, fontSize: '13px' }}>{folder.name}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Files Grid */}
                        <div>
                            <h3 style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Files</h3>
                            {loading ? (
                                <div style={{ color: 'var(--color-text-secondary)' }}>Loading...</div>
                            ) : filteredItems.length === 0 ? (
                                <div style={{
                                    padding: '40px',
                                    border: '2px dashed var(--color-border)',
                                    borderRadius: 'var(--radius-lg)',
                                    textAlign: 'center',
                                    color: 'var(--color-text-secondary)'
                                }}>
                                    No matching files found.
                                </div>
                            ) : (
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '16px' }}>
                                    {filteredItems.map(item => (
                                        <div
                                            key={item.id}
                                            onClick={() => onSelect(item)}
                                            style={{
                                                backgroundColor: 'var(--color-bg-secondary)',
                                                border: '1px solid var(--color-border)',
                                                borderRadius: 'var(--radius-md)',
                                                overflow: 'hidden',
                                                cursor: 'pointer',
                                                transition: 'border-color 0.2s'
                                            }}
                                            onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--color-accent)'}
                                            onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--color-border)'}
                                        >
                                            <div style={{
                                                height: '120px',
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
                                                    <FileAudio size={40} color="var(--color-text-secondary)" />
                                                )}
                                            </div>
                                            <div style={{ padding: '10px' }}>
                                                <div style={{ fontWeight: 500, fontSize: '13px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={item.name}>
                                                    {item.name}
                                                </div>
                                                <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)', marginTop: '4px' }}>
                                                    {(item.size / 1024 / 1024).toFixed(2)} MB
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
