import React, { useRef, useState, useEffect } from 'react';
import { DEVICES } from '../constants/devices';

interface PlayablePreviewProps {
    src: string;
}

export const PlayablePreview: React.FC<PlayablePreviewProps> = ({ src }) => {
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');
    const [selectedDeviceId, setSelectedDeviceId] = useState<string>(DEVICES[0].id);
    const [showSafeArea, setShowSafeArea] = useState(false);
    const [scale, setScale] = useState(1);
    const containerRef = useRef<HTMLDivElement>(null);

    const device = DEVICES.find(d => d.id === selectedDeviceId) || DEVICES[0];

    // Calculate dimensions based on orientation
    const width = orientation === 'portrait' ? device.width : device.height;
    const height = orientation === 'portrait' ? device.height : device.width;

    // Auto-scale to fit container
    useEffect(() => {
        const updateScale = () => {
            if (containerRef.current) {
                const containerWidth = containerRef.current.clientWidth - 40; // padding
                const containerHeight = containerRef.current.clientHeight - 40;

                const scaleX = containerWidth / width;
                const scaleY = containerHeight / height;

                // Use the smaller scale to fit entirely, max 1
                setScale(Math.min(Math.min(scaleX, scaleY), 1));
            }
        };

        updateScale();
        window.addEventListener('resize', updateScale);
        return () => window.removeEventListener('resize', updateScale);
    }, [width, height]);

    // Safe Area Styles
    const safeAreaStyle: React.CSSProperties = {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        pointerEvents: 'none',
        zIndex: 10,
        borderTop: `${orientation === 'portrait' ? device.safeArea.top : device.safeArea.left}px solid rgba(255, 0, 0, 0.3)`,
        borderBottom: `${orientation === 'portrait' ? device.safeArea.bottom : device.safeArea.right}px solid rgba(255, 0, 0, 0.3)`,
        borderLeft: `${orientation === 'portrait' ? device.safeArea.left : device.safeArea.top}px solid rgba(255, 0, 0, 0.3)`,
        borderRight: `${orientation === 'portrait' ? device.safeArea.right : device.safeArea.bottom}px solid rgba(255, 0, 0, 0.3)`,
    };

    // Notch Style
    const notchStyle: React.CSSProperties | null = device.notch ? {
        position: 'absolute',
        top: orientation === 'portrait' ? `${device.notch.top}px` : '50%',
        left: orientation === 'portrait' ? '50%' : `${device.notch.top}px`,
        width: orientation === 'portrait' ? `${device.notch.width}px` : `${device.notch.height}px`,
        height: orientation === 'portrait' ? `${device.notch.height}px` : `${device.notch.width}px`,
        backgroundColor: '#000',
        borderRadius: `${device.notch.radius}px`,
        transform: orientation === 'portrait' ? 'translateX(-50%)' : 'translateY(-50%)',
        zIndex: 20,
        pointerEvents: 'none'
    } : null;

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            gap: '16px'
        }}>
            {/* Toolbar */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '12px 20px',
                backgroundColor: 'var(--color-bg-secondary)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--color-border)',
                flexWrap: 'wrap',
                gap: '12px'
            }}>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <select
                        value={selectedDeviceId}
                        onChange={(e) => setSelectedDeviceId(e.target.value)}
                        style={{
                            padding: '8px 12px',
                            backgroundColor: 'var(--color-bg-tertiary)',
                            color: 'var(--color-text-primary)',
                            border: '1px solid var(--color-border)',
                            borderRadius: 'var(--radius-sm)',
                            outline: 'none',
                            cursor: 'pointer'
                        }}
                    >
                        {DEVICES.map(d => (
                            <option key={d.id} value={d.id}>{d.name}</option>
                        ))}
                    </select>

                    <div style={{ display: 'flex', backgroundColor: 'var(--color-bg-tertiary)', borderRadius: 'var(--radius-sm)', padding: '2px' }}>
                        <button
                            onClick={() => setOrientation('portrait')}
                            style={{
                                padding: '6px 12px',
                                backgroundColor: orientation === 'portrait' ? 'var(--color-bg-primary)' : 'transparent',
                                color: orientation === 'portrait' ? 'var(--color-accent)' : 'var(--color-text-secondary)',
                                border: 'none',
                                borderRadius: 'var(--radius-sm)',
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                            }}
                            title="Portrait"
                        >
                            📱
                        </button>
                        <button
                            onClick={() => setOrientation('landscape')}
                            style={{
                                padding: '6px 12px',
                                backgroundColor: orientation === 'landscape' ? 'var(--color-bg-primary)' : 'transparent',
                                color: orientation === 'landscape' ? 'var(--color-accent)' : 'var(--color-text-secondary)',
                                border: 'none',
                                borderRadius: 'var(--radius-sm)',
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                            }}
                            title="Landscape"
                        >
                            💻
                        </button>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '12px' }}>
                    <button
                        onClick={() => setShowSafeArea(!showSafeArea)}
                        style={{
                            padding: '8px 16px',
                            backgroundColor: showSafeArea ? 'rgba(239, 68, 68, 0.1)' : 'transparent',
                            color: showSafeArea ? 'var(--color-danger)' : 'var(--color-text-secondary)',
                            border: `1px solid ${showSafeArea ? 'var(--color-danger)' : 'var(--color-border)'}`,
                            borderRadius: 'var(--radius-sm)',
                            cursor: 'pointer',
                            fontSize: '13px',
                            transition: 'all 0.2s'
                        }}
                    >
                        {showSafeArea ? 'Hide Safe Areas' : 'Show Safe Areas'}
                    </button>

                    <button
                        onClick={() => {
                            if (iframeRef.current) {
                                iframeRef.current.requestFullscreen().catch(err => {
                                    console.error("Error attempting to enable fullscreen:", err);
                                });
                            }
                        }}
                        style={{
                            padding: '8px 16px',
                            backgroundColor: 'transparent',
                            color: 'var(--color-text-primary)',
                            border: '1px solid var(--color-border)',
                            borderRadius: 'var(--radius-sm)',
                            cursor: 'pointer',
                            fontSize: '13px'
                        }}
                    >
                        ⛶ Fullscreen
                    </button>
                </div>
            </div>

            {/* Preview Area */}
            <div
                ref={containerRef}
                style={{
                    flex: 1,
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    backgroundColor: '#1a1a1a',
                    borderRadius: 'var(--radius-lg)',
                    overflow: 'hidden',
                    boxShadow: 'inset 0 0 40px rgba(0,0,0,0.5)',
                    padding: '20px',
                    position: 'relative'
                }}
            >
                <div style={{
                    width: `${width}px`,
                    height: `${height}px`,
                    backgroundColor: device.frameColor,
                    position: 'relative',
                    boxShadow: '0 0 0 2px #333, 0 20px 50px rgba(0,0,0,0.6)',
                    borderRadius: `${device.screenRadius + 4}px`, // Slightly larger for bezel
                    padding: '4px', // Bezel thickness
                    transform: `scale(${scale})`,
                    transformOrigin: 'center',
                    transition: 'width 0.3s ease, height 0.3s ease, transform 0.3s ease'
                }}>
                    {/* Screen Content */}
                    <div style={{
                        width: '100%',
                        height: '100%',
                        backgroundColor: '#fff',
                        borderRadius: `${device.screenRadius}px`,
                        overflow: 'hidden',
                        position: 'relative'
                    }}>
                        <iframe
                            ref={iframeRef}
                            src={src}
                            style={{
                                width: '100%',
                                height: '100%',
                                border: 'none'
                            }}
                            title="Playable Preview"
                        />

                        {/* Overlays */}
                        {showSafeArea && <div style={safeAreaStyle} />}
                        {notchStyle && <div style={notchStyle} />}
                    </div>
                </div>

                {/* Scale Indicator */}
                <div style={{
                    position: 'absolute',
                    bottom: '10px',
                    right: '10px',
                    color: 'rgba(255,255,255,0.3)',
                    fontSize: '12px',
                    pointerEvents: 'none'
                }}>
                    {Math.round(scale * 100)}%
                </div>
            </div>
        </div>
    );
};
