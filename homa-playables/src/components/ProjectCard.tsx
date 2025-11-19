import React from 'react';
import type { Project } from '../types';

interface ProjectCardProps {
    project: Project;
    onClick: (project: Project) => void;
}

export const ProjectCard: React.FC<ProjectCardProps> = ({ project, onClick }) => {
    return (
        <div
            onClick={() => onClick(project)}
            style={{
                background: 'var(--gradient-surface)',
                backdropFilter: 'var(--backdrop-blur)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--color-border)',
                overflow: 'hidden',
                cursor: 'pointer',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                position: 'relative',
                boxShadow: 'var(--shadow-md)',
                height: '100%',
                display: 'flex',
                flexDirection: 'column'
            }}
            onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.borderColor = 'var(--color-accent)';
                e.currentTarget.style.boxShadow = 'var(--shadow-glow)';
                const overlay = e.currentTarget.querySelector('.play-overlay') as HTMLElement;
                if (overlay) overlay.style.opacity = '1';
            }}
            onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.borderColor = 'var(--color-border)';
                e.currentTarget.style.boxShadow = 'var(--shadow-md)';
                const overlay = e.currentTarget.querySelector('.play-overlay') as HTMLElement;
                if (overlay) overlay.style.opacity = '0';
            }}
        >
            {/* Thumbnail Section */}
            <div style={{
                height: '160px',
                backgroundColor: '#000',
                position: 'relative',
                overflow: 'hidden'
            }}>
                {project.thumbnailUrl ? (
                    <img 
                        src={project.thumbnailUrl} 
                        alt={project.name} 
                        style={{ 
                            width: '100%', 
                            height: '100%', 
                            objectFit: 'cover',
                            transition: 'transform 0.5s ease'
                        }} 
                    />
                ) : (
                    <div style={{
                        width: '100%',
                        height: '100%',
                        background: 'linear-gradient(45deg, var(--color-bg-secondary) 0%, var(--color-bg-tertiary) 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'var(--color-text-muted)',
                        fontSize: '2rem'
                    }}>
                        🎮
                    </div>
                )}

                {/* Play Overlay */}
                <div 
                    className="play-overlay"
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        background: 'rgba(0, 0, 0, 0.4)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        opacity: 0,
                        transition: 'opacity 0.3s ease',
                        backdropFilter: 'blur(2px)'
                    }}
                >
                    <div style={{
                        width: '48px',
                        height: '48px',
                        borderRadius: '50%',
                        background: 'var(--gradient-primary)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
                    }}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                            <path d="M8 5v14l11-7z" />
                        </svg>
                    </div>
                </div>
            </div>

            {/* Content Section */}
            <div style={{ padding: '16px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                <h3 style={{ 
                    fontSize: '16px', 
                    fontWeight: 600, 
                    marginBottom: '8px',
                    color: 'var(--color-text-primary)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                }}>
                    {project.name}
                </h3>
                
                <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                        {new Date(project.lastModified).toLocaleDateString(undefined, { 
                            month: 'short', 
                            day: 'numeric',
                            year: 'numeric'
                        })}
                    </p>
                    <span style={{
                        fontSize: '10px',
                        padding: '2px 8px',
                        borderRadius: '10px',
                        background: 'rgba(99, 102, 241, 0.1)',
                        color: 'var(--color-accent)',
                        border: '1px solid rgba(99, 102, 241, 0.2)'
                    }}>
                        Playable
                    </span>
                </div>
            </div>
        </div>
    );
};
