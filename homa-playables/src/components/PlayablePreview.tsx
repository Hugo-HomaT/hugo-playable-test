import React, { useState, useRef, useMemo, useEffect } from 'react';

// --- Types & Constants ---

interface Resolution {
    width: number;
    height: number;
}

interface DevicePreset {
    id: string;
    name: string;
    width: number;
    height: number;
    isCustom?: boolean;
}

const DEFAULT_PRESETS: DevicePreset[] = [
    { id: 'iphone-14-pro', name: 'iPhone 14 Pro', width: 1179, height: 2556 },
];

const STORAGE_KEY = 'homa_playable_preview_presets';

// Helper function to load presets from localStorage
const loadPresetsFromStorage = (): DevicePreset[] => {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            const parsed = JSON.parse(saved);
            // Merge saved custom presets with defaults to ensure defaults are always fresh
            const customPresets = parsed.filter((p: DevicePreset) => p.isCustom);
            return [...DEFAULT_PRESETS, ...customPresets];
        }
    } catch (e) {
        console.error("Failed to load presets", e);
    }
    return DEFAULT_PRESETS;
};

// --- Components ---

interface PlayablePreviewProps {
    src: string;
}

export const PlayablePreview: React.FC<PlayablePreviewProps> = ({ src }) => {
    // State - Initialize presets from localStorage
    const [presets, setPresets] = useState<DevicePreset[]>(() => loadPresetsFromStorage());
    const [selectedPresetId, setSelectedPresetId] = useState<string>(() => {
        const loaded = loadPresetsFromStorage();
        return loaded[0]?.id || DEFAULT_PRESETS[0].id;
    });
    const [isLandscape, setIsLandscape] = useState(false);

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newPresetName, setNewPresetName] = useState('');
    const [newPresetWidth, setNewPresetWidth] = useState('393');
    const [newPresetHeight, setNewPresetHeight] = useState('852');

    const containerRef = useRef<HTMLDivElement>(null);
    const iframeRef = useRef<HTMLIFrameElement>(null);

    // Save presets to local storage whenever they change
    useEffect(() => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(presets));
    }, [presets]);

    // Derived State
    const currentResolution = useMemo((): Resolution => {
        const preset = presets.find(p => p.id === selectedPresetId) || presets[0];
        return isLandscape
            ? { width: preset.height, height: preset.width }
            : { width: preset.width, height: preset.height };
    }, [selectedPresetId, isLandscape, presets]);

    // Scaling Logic
    // We want the VISUAL size to be determined ONLY by the aspect ratio and the available space.
    // The actual resolution (e.g. 1000x2000 vs 2000x4000) should only affect the internal iframe scale, not the frame size.

    // Define the maximum bounding box for the phone on screen
    const MAX_DISPLAY_HEIGHT = 450;
    const MAX_DISPLAY_WIDTH = 300;

    const displayDims = useMemo(() => {
        const ratio = currentResolution.width / currentResolution.height;

        let dWidth, dHeight;

        if (ratio > 1) {
            // Landscape-ish
            // Try fitting to max width
            dWidth = Math.min(MAX_DISPLAY_WIDTH * 1.5, 450); // Allow wider for landscape
            dHeight = dWidth / ratio;

            // If height is too big, scale down
            if (dHeight > MAX_DISPLAY_HEIGHT) {
                dHeight = MAX_DISPLAY_HEIGHT;
                dWidth = dHeight * ratio;
            }
        } else {
            // Portrait-ish
            dHeight = MAX_DISPLAY_HEIGHT;
            dWidth = dHeight * ratio;

            // If width is too big (unlikely for phones), scale down
            if (dWidth > MAX_DISPLAY_WIDTH) {
                dWidth = MAX_DISPLAY_WIDTH;
                dHeight = dWidth / ratio;
            }
        }

        return { width: dWidth, height: dHeight };
    }, [currentResolution.width, currentResolution.height]);

    // Calculate the scale needed to fit the ACTUAL resolution into the DISPLAY dimensions
    const contentScale = displayDims.width / currentResolution.width;

    // Handlers
    const handlePresetChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newId = e.target.value;
        if (newId === 'create_new') {
            setIsModalOpen(true);
        } else {
            setSelectedPresetId(newId);
        }
    };

    const handleCreatePreset = () => {
        if (!newPresetName || !newPresetWidth || !newPresetHeight) return;

        const width = parseInt(newPresetWidth);
        const height = parseInt(newPresetHeight);

        if (isNaN(width) || isNaN(height)) return;

        const newPreset: DevicePreset = {
            id: `custom-${Date.now()}`,
            name: newPresetName,
            width,
            height,
            isCustom: true
        };

        setPresets(prev => [...prev, newPreset]);
        setSelectedPresetId(newPreset.id);
        setIsModalOpen(false);

        // Reset form
        setNewPresetName('');
        setNewPresetWidth('393');
        setNewPresetHeight('852');
    };

    const handleDeletePreset = (id: string, e: React.MouseEvent) => {
        e.stopPropagation(); // Prevent selection change if inside a complex component
        const newPresets = presets.filter(p => p.id !== id);
        setPresets(newPresets);
        if (selectedPresetId === id) {
            setSelectedPresetId(DEFAULT_PRESETS[0].id);
        }
    };

    const toggleFullscreen = () => {
        iframeRef.current?.requestFullscreen().catch(err => console.error(err));
    };

    // Styles
    const frameStyle: React.CSSProperties = {
        width: displayDims.width,
        height: displayDims.height,
        // No transform scale on the frame itself anymore, we size it explicitly
        // transition: 'all 0.4s cubic-bezier(0.25, 0.8, 0.25, 1)', // Removed for instant switch
        backgroundColor: '#1c1c1e',
        borderRadius: '44px',
        padding: '8px',
        boxShadow: '0 20px 50px -12px rgba(0, 0, 0, 0.5)',
        position: 'relative',
        boxSizing: 'border-box'
    };

    const screenStyle: React.CSSProperties = {
        width: '100%',
        height: '100%',
        backgroundColor: '#000',
        borderRadius: '36px',
        overflow: 'hidden',
        position: 'relative'
    };

    const iframeContainerStyle: React.CSSProperties = {
        width: '100%',
        height: '100%',
        position: 'relative'
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%', maxWidth: '1000px', margin: '0 auto' }}>

            {/* Toolbar */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '16px 24px',
                backgroundColor: '#1e1e1e',
                borderRadius: '16px',
                border: '1px solid #333',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
            }}>
                <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                    {/* Device Selector */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <label style={{ fontSize: '11px', color: '#888', fontWeight: 600, textTransform: 'uppercase' }}>Device Preset</label>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <select
                                value={selectedPresetId}
                                onChange={handlePresetChange}
                                style={{
                                    padding: '8px 12px',
                                    borderRadius: '8px',
                                    backgroundColor: '#2a2a2a',
                                    color: '#fff',
                                    border: '1px solid #444',
                                    outline: 'none',
                                    fontSize: '14px',
                                    minWidth: '200px',
                                    cursor: 'pointer'
                                }}
                            >
                                <optgroup label="Defaults">
                                    {presets.filter(p => !p.isCustom).map(p => (
                                        <option key={p.id} value={p.id}>{p.name} ({p.width}x{p.height})</option>
                                    ))}
                                </optgroup>
                                {presets.some(p => p.isCustom) && (
                                    <optgroup label="My Presets">
                                        {presets.filter(p => p.isCustom).map(p => (
                                            <option key={p.id} value={p.id}>{p.name} ({p.width}x{p.height})</option>
                                        ))}
                                    </optgroup>
                                )}
                                <option value="create_new" style={{ fontWeight: 'bold', color: '#4ade80' }}>+ Create New Preset...</option>
                            </select>

                            {/* Delete Button for Custom Presets */}
                            {presets.find(p => p.id === selectedPresetId)?.isCustom && (
                                <button
                                    onClick={(e) => handleDeletePreset(selectedPresetId, e)}
                                    style={{
                                        background: 'rgba(239, 68, 68, 0.2)',
                                        color: '#ef4444',
                                        border: 'none',
                                        borderRadius: '6px',
                                        padding: '8px',
                                        cursor: 'pointer',
                                        fontSize: '12px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}
                                    title="Delete Preset"
                                >
                                    🗑️
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    {/* Orientation Toggle */}
                    <div style={{ display: 'flex', background: '#2a2a2a', padding: '4px', borderRadius: '8px', border: '1px solid #444' }}>
                        <button
                            onClick={() => setIsLandscape(false)}
                            style={{
                                padding: '8px 16px',
                                borderRadius: '6px',
                                border: 'none',
                                background: !isLandscape ? '#444' : 'transparent',
                                color: !isLandscape ? '#fff' : '#888',
                                cursor: 'pointer',
                                fontWeight: 500,
                                fontSize: '13px',
                                transition: 'all 0.2s'
                            }}
                        >
                            Portrait
                        </button>
                        <button
                            onClick={() => setIsLandscape(true)}
                            style={{
                                padding: '8px 16px',
                                borderRadius: '6px',
                                border: 'none',
                                background: isLandscape ? '#444' : 'transparent',
                                color: isLandscape ? '#fff' : '#888',
                                cursor: 'pointer',
                                fontWeight: 500,
                                fontSize: '13px',
                                transition: 'all 0.2s'
                            }}
                        >
                            Landscape
                        </button>
                    </div>

                    <div style={{ width: '1px', height: '24px', background: '#444', margin: '0 8px' }} />

                    <button
                        onClick={toggleFullscreen}
                        style={{
                            padding: '8px 12px',
                            borderRadius: '8px',
                            border: '1px solid #444',
                            background: 'transparent',
                            color: '#fff',
                            cursor: 'pointer',
                            fontSize: '13px'
                        }}
                        title="Fullscreen"
                    >
                        ⛶
                    </button>
                </div>
            </div>

            {/* Preview Stage */}
            <div
                ref={containerRef}
                style={{
                    width: '100%',
                    height: '500px', // Fixed height container
                    margin: '0 auto',
                    background: 'radial-gradient(circle at center, #2a2a2a 0%, #111 100%)', // Premium gradient
                    borderRadius: '24px',
                    border: '1px solid #222',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    position: 'relative',
                    overflow: 'hidden',
                    boxShadow: 'inset 0 0 60px rgba(0,0,0,0.8)'
                }}
            >
                {/* Device Frame */}
                <div style={frameStyle}>
                    <div style={screenStyle}>
                        {/* Iframe Wrapper to handle scaling */}
                        <div style={iframeContainerStyle}>
                            <iframe
                                ref={iframeRef}
                                src={src}
                                style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
                                title="Preview"
                            />
                        </div>
                    </div>
                </div>

                {/* Scale Badge */}
                <div style={{
                    position: 'absolute',
                    bottom: '16px',
                    right: '16px',
                    background: 'rgba(0,0,0,0.6)',
                    padding: '4px 8px',
                    borderRadius: '6px',
                    color: '#666',
                    fontSize: '11px',
                    fontFamily: 'monospace'
                }}>
                    {Math.round(contentScale * 100)}%
                </div>
            </div>

            {/* Create Preset Modal */}
            {isModalOpen && (
                <div style={{
                    position: 'fixed',
                    top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.7)',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    zIndex: 1000,
                    backdropFilter: 'blur(5px)'
                }}>
                    <div style={{
                        backgroundColor: '#1e1e1e',
                        padding: '24px',
                        borderRadius: '16px',
                        width: '320px',
                        border: '1px solid #333',
                        boxShadow: '0 20px 50px rgba(0,0,0,0.5)'
                    }}>
                        <h3 style={{ margin: '0 0 16px 0', color: '#fff', fontSize: '18px' }}>Create New Preset</h3>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <label style={{ color: '#888', fontSize: '12px' }}>Preset Name</label>
                                <input
                                    type="text"
                                    placeholder="e.g. My iPhone"
                                    value={newPresetName}
                                    onChange={e => setNewPresetName(e.target.value)}
                                    style={{ padding: '10px', borderRadius: '8px', background: '#2a2a2a', border: '1px solid #444', color: '#fff', outline: 'none' }}
                                />
                            </div>
                            <div style={{ display: 'flex', gap: '12px' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
                                    <label style={{ color: '#888', fontSize: '12px' }}>Width</label>
                                    <input
                                        type="number"
                                        value={newPresetWidth}
                                        onChange={e => setNewPresetWidth(e.target.value)}
                                        style={{ padding: '10px', borderRadius: '8px', background: '#2a2a2a', border: '1px solid #444', color: '#fff', outline: 'none', width: '100%' }}
                                    />
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
                                    <label style={{ color: '#888', fontSize: '12px' }}>Height</label>
                                    <input
                                        type="number"
                                        value={newPresetHeight}
                                        onChange={e => setNewPresetHeight(e.target.value)}
                                        style={{ padding: '10px', borderRadius: '8px', background: '#2a2a2a', border: '1px solid #444', color: '#fff', outline: 'none', width: '100%' }}
                                    />
                                </div>
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #444', background: 'transparent', color: '#aaa', cursor: 'pointer' }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleCreatePreset}
                                style={{ flex: 1, padding: '10px', borderRadius: '8px', border: 'none', background: '#4ade80', color: '#000', fontWeight: 'bold', cursor: 'pointer' }}
                            >
                                Create
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
