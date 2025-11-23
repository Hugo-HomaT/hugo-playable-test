import React, { useState, useRef, useMemo } from 'react';

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
    safeArea?: { top: number; bottom: number; left: number; right: number };
}

const PRESETS: DevicePreset[] = [
    { id: 'iphone-14-pro', name: 'iPhone 14 Pro', width: 393, height: 852, safeArea: { top: 59, bottom: 34, left: 0, right: 0 } },
    { id: 'iphone-se-3', name: 'iPhone SE (3rd Gen)', width: 375, height: 667, safeArea: { top: 20, bottom: 0, left: 0, right: 0 } },
    { id: 'ipad-pro-11', name: 'iPad Pro 11"', width: 834, height: 1194, safeArea: { top: 24, bottom: 20, left: 0, right: 0 } },
    { id: 'generic-android', name: 'Generic Android', width: 360, height: 800, safeArea: { top: 24, bottom: 0, left: 0, right: 0 } },
];

const CUSTOM_PRESET_ID = 'custom';

// --- Components ---

interface PlayablePreviewProps {
    src: string;
}

export const PlayablePreview: React.FC<PlayablePreviewProps> = ({ src }) => {
    // State
    const [selectedPresetId, setSelectedPresetId] = useState<string>(PRESETS[0].id);
    const [customResolution, setCustomResolution] = useState<Resolution>({ width: 360, height: 800 });
    const [isLandscape, setIsLandscape] = useState(false);
    const [showSafeArea, setShowSafeArea] = useState(false);

    const containerRef = useRef<HTMLDivElement>(null);
    const iframeRef = useRef<HTMLIFrameElement>(null);

    // Derived State
    const currentResolution = useMemo((): Resolution => {
        if (selectedPresetId === CUSTOM_PRESET_ID) {
            return isLandscape
                ? { width: customResolution.height, height: customResolution.width }
                : customResolution;
        }
        const preset = PRESETS.find(p => p.id === selectedPresetId) || PRESETS[0];
        return isLandscape
            ? { width: preset.height, height: preset.width }
            : { width: preset.width, height: preset.height };
    }, [selectedPresetId, customResolution, isLandscape]);

    const currentSafeArea = useMemo(() => {
        if (selectedPresetId === CUSTOM_PRESET_ID) return null;
        const preset = PRESETS.find(p => p.id === selectedPresetId);
        if (!preset?.safeArea) return null;

        // Rotate safe area if landscape
        if (isLandscape) {
            return {
                top: preset.safeArea.left,
                bottom: preset.safeArea.right,
                left: preset.safeArea.top,
                right: preset.safeArea.bottom
            };
        }
        return preset.safeArea;
    }, [selectedPresetId, isLandscape]);

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
            // Fit to width first? No, usually height is the constraint on desktop.
            // Let's try to fit within the box.

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
        setSelectedPresetId(newId);
        if (newId === CUSTOM_PRESET_ID) {
            // Initialize custom with current preset values if switching to custom
            const currentPreset = PRESETS.find(p => p.id === selectedPresetId) || PRESETS[0];
            // Reset orientation to portrait for simplicity when switching to custom, or keep?
            // Let's reset custom res to portrait version of current
            setCustomResolution({
                width: isLandscape ? currentPreset.height : currentPreset.width,
                height: isLandscape ? currentPreset.width : currentPreset.height
            });
            setIsLandscape(false); // Reset to portrait base
        }
    };

    const handleCustomDimChange = (dim: 'width' | 'height', value: string) => {
        const numVal = parseInt(value) || 0;
        setCustomResolution(prev => ({ ...prev, [dim]: numVal }));
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
        boxShadow: '0 20px 50px -12px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255,255,255,0.1)',
        position: 'relative',
        boxSizing: 'content-box'
    };

    const screenStyle: React.CSSProperties = {
        width: '100%',
        height: '100%',
        backgroundColor: '#fff',
        borderRadius: '32px',
        overflow: 'hidden',
        position: 'relative'
    };

    const iframeContainerStyle: React.CSSProperties = {
        width: currentResolution.width,
        height: currentResolution.height,
        transform: `scale(${contentScale})`,
        transformOrigin: 'top left',
        position: 'absolute',
        top: 0,
        left: 0
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
                        <label style={{ fontSize: '11px', color: '#888', fontWeight: 600, textTransform: 'uppercase' }}>Device</label>
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
                                minWidth: '160px'
                            }}
                        >
                            {PRESETS.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                            <option value={CUSTOM_PRESET_ID}>Custom Resolution</option>
                        </select>
                    </div>

                    {/* Custom Inputs */}
                    {selectedPresetId === CUSTOM_PRESET_ID && (
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <label style={{ fontSize: '11px', color: '#888', fontWeight: 600, textTransform: 'uppercase' }}>Width</label>
                                <input
                                    type="number"
                                    value={customResolution.width}
                                    onChange={e => handleCustomDimChange('width', e.target.value)}
                                    style={{ width: '70px', padding: '8px', borderRadius: '8px', background: '#2a2a2a', color: '#fff', border: '1px solid #444' }}
                                />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <label style={{ fontSize: '11px', color: '#888', fontWeight: 600, textTransform: 'uppercase' }}>Height</label>
                                <input
                                    type="number"
                                    value={customResolution.height}
                                    onChange={e => handleCustomDimChange('height', e.target.value)}
                                    style={{ width: '70px', padding: '8px', borderRadius: '8px', background: '#2a2a2a', color: '#fff', border: '1px solid #444' }}
                                />
                            </div>
                        </div>
                    )}
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

                    {/* Tools */}
                    <button
                        onClick={() => setShowSafeArea(!showSafeArea)}
                        style={{
                            padding: '8px 12px',
                            borderRadius: '8px',
                            border: showSafeArea ? '1px solid #ef4444' : '1px solid #444',
                            background: showSafeArea ? 'rgba(239, 68, 68, 0.1)' : 'transparent',
                            color: showSafeArea ? '#ef4444' : '#aaa',
                            cursor: 'pointer',
                            fontSize: '13px',
                            transition: 'all 0.2s'
                        }}
                    >
                        Safe Area
                    </button>

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

                            {/* Safe Area Overlay */}
                            {showSafeArea && currentSafeArea && (
                                <div style={{
                                    position: 'absolute',
                                    top: 0, left: 0, right: 0, bottom: 0,
                                    borderTop: `${currentSafeArea.top}px solid rgba(255, 50, 50, 0.25)`,
                                    borderBottom: `${currentSafeArea.bottom}px solid rgba(255, 50, 50, 0.25)`,
                                    borderLeft: `${currentSafeArea.left}px solid rgba(255, 50, 50, 0.25)`,
                                    borderRight: `${currentSafeArea.right}px solid rgba(255, 50, 50, 0.25)`,
                                    pointerEvents: 'none',
                                    zIndex: 10
                                }} />
                            )}
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
        </div>
    );
};
