import React, { useRef, useState } from 'react';

interface PlayablePreviewProps {
    src: string;
}

export const PlayablePreview: React.FC<PlayablePreviewProps> = ({ src }) => {
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');

    // Standard mobile dimensions
    const dimensions = orientation === 'portrait'
        ? { width: 375, height: 667 }
        : { width: 667, height: 375 };

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
                justifyContent: 'center',
                gap: '12px',
                padding: '8px',
                backgroundColor: 'var(--color-bg-secondary)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--color-border)'
            }}>
                <button
                    onClick={() => setOrientation('portrait')}
                    style={{
                        padding: '8px 16px',
                        backgroundColor: orientation === 'portrait' ? 'var(--color-accent)' : 'transparent',
                        color: orientation === 'portrait' ? '#fff' : 'var(--color-text-primary)',
                        border: 'none',
                        borderRadius: 'var(--radius-sm)',
                        cursor: 'pointer',
                        fontWeight: '500',
                        transition: 'all 0.2s'
                    }}
                >
                    📱 Portrait
                </button>
                <button
                    onClick={() => setOrientation('landscape')}
                    style={{
                        padding: '8px 16px',
                        backgroundColor: orientation === 'landscape' ? 'var(--color-accent)' : 'transparent',
                        color: orientation === 'landscape' ? '#fff' : 'var(--color-text-primary)',
                        border: 'none',
                        borderRadius: 'var(--radius-sm)',
                        cursor: 'pointer',
                        fontWeight: '500',
                        transition: 'all 0.2s'
                    }}
                >
                    💻 Landscape
                </button>
                <div style={{ width: '1px', backgroundColor: 'var(--color-border)', margin: '0 8px' }} />
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
                        fontWeight: '500',
                        transition: 'all 0.2s'
                    }}
                >
                    ⛶ Fullscreen
                </button>
            </div>

            {/* Preview Area */}
            <div style={{
                flex: 1,
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                backgroundColor: '#1a1a1a', // Darker background for contrast
                borderRadius: 'var(--radius-lg)',
                overflow: 'hidden',
                boxShadow: 'inset 0 0 20px rgba(0,0,0,0.5)',
                padding: '20px'
            }}>
                <div style={{
                    width: `${dimensions.width}px`,
                    height: `${dimensions.height}px`,
                    backgroundColor: '#fff',
                    position: 'relative',
                    boxShadow: '0 0 0 10px #333, 0 20px 40px rgba(0,0,0,0.5)', // Phone bezel effect
                    borderRadius: '20px',
                    overflow: 'hidden',
                    transition: 'width 0.3s ease, height 0.3s ease'
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
                </div>
            </div>
        </div>
    );
};
