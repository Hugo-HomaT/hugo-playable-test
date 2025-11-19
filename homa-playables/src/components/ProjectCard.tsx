import React, { useState, useRef, useEffect } from 'react';
import type { Project } from '../types';

interface ProjectCardProps {
    project: Project;
    onClick: (project: Project) => void;
    onRename: (id: string, newName: string) => Promise<void>;
}

export const ProjectCard: React.FC<ProjectCardProps> = ({ project, onClick, onRename }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editedName, setEditedName] = useState(project.name);
    const [isSaving, setIsSaving] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [isEditing]);

    const handleDoubleClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();
        setIsEditing(true);
        setEditedName(project.name);
    };

    const handleNameClick = (e: React.MouseEvent) => {
        e.stopPropagation();
    };

    const handleSave = async () => {
        const trimmedName = editedName.trim();
        if (!trimmedName || trimmedName === project.name) {
            setIsEditing(false);
            setEditedName(project.name);
            return;
        }

        setIsSaving(true);
        try {
            await onRename(project.id, trimmedName);
            setIsEditing(false);
        } catch (error) {
            console.error('Failed to rename:', error);
            setEditedName(project.name);
        } finally {
            setIsSaving(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleSave();
        } else if (e.key === 'Escape') {
            e.preventDefault();
            setIsEditing(false);
            setEditedName(project.name);
        }
    };

    const handleCardClick = () => {
        if (!isEditing) {
            onClick(project);
        }
    };

    return (
        <div
            onClick={handleCardClick}
            style={{
                background: 'var(--gradient-surface)',
                backdropFilter: 'var(--backdrop-blur)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--color-border)',
                overflow: 'hidden',
                cursor: isEditing ? 'default' : 'pointer',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                position: 'relative',
                boxShadow: 'var(--shadow-md)',
                height: '100%',
                display: 'flex',
                flexDirection: 'column'
            }}
            onMouseEnter={(e) => {
                if (isEditing) return;
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.borderColor = 'var(--color-accent)';
                e.currentTarget.style.boxShadow = 'var(--shadow-glow)';
                const overlay = e.currentTarget.querySelector('.play-overlay') as HTMLElement;
                if (overlay) overlay.style.opacity = '1';
            }}
            onMouseLeave={(e) => {
                if (isEditing) return;
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
                        backdropFilter: 'blur(2px)',
                        pointerEvents: 'none'
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
                {isEditing ? (
                    <input
                        ref={inputRef}
                        type="text"
                        value={editedName}
                        onChange={(e) => setEditedName(e.target.value)}
                        onBlur={handleSave}
                        onKeyDown={handleKeyDown}
                        disabled={isSaving}
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            fontSize: '16px',
                            fontWeight: 600,
                            marginBottom: '8px',
                            color: 'var(--color-text-primary)',
                            background: 'rgba(255, 145, 250, 0.05)',
                            border: '2px solid var(--color-accent)',
                            borderRadius: 'var(--radius-sm)',
                            padding: '4px 8px',
                            outline: 'none',
                            animation: 'fadeIn 0.2s ease',
                            boxShadow: '0 0 0 3px rgba(255, 145, 250, 0.1)'
                        }}
                    />
                ) : (
                    <h3
                        onClick={handleNameClick}
                        onDoubleClick={handleDoubleClick}
                        style={{
                            fontSize: '16px',
                            fontWeight: 600,
                            marginBottom: '8px',
                            color: 'var(--color-text-primary)',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            cursor: 'text',
                            padding: '4px 0',
                            transition: 'color 0.2s ease'
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.color = 'var(--color-accent)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.color = 'var(--color-text-primary)';
                        }}
                    >
                        {project.name}
                    </h3>
                )}

                <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                        {new Date(project.lastModified).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                        })}
                        {' '}
                        <span style={{ fontSize: '11px', opacity: 0.8 }}>
                            {new Date(project.lastModified).toLocaleTimeString(undefined, {
                                hour: '2-digit',
                                minute: '2-digit'
                            })}
                        </span>
                    </p>
                    <span style={{
                        fontSize: '10px',
                        padding: '2px 8px',
                        borderRadius: '10px',
                        background: 'rgba(255, 145, 250, 0.1)',
                        color: 'var(--color-accent)',
                        border: '1px solid rgba(255, 145, 250, 0.2)'
                    }}>
                        Playable
                    </span>
                </div>
            </div>
        </div>
    );
};
