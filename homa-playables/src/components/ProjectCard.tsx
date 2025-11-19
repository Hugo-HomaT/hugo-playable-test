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
                backgroundColor: 'var(--color-bg-secondary)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--color-border)',
                overflow: 'hidden',
                cursor: 'pointer',
                transition: 'transform 0.2s ease, border-color 0.2s ease',
            }}
            onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.borderColor = 'var(--color-accent)';
            }}
            onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.borderColor = 'var(--color-border)';
            }}
        >
            <div style={{
                height: '140px',
                backgroundColor: '#000',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--color-text-muted)'
            }}>
                {project.thumbnailUrl ? (
                    <img src={project.thumbnailUrl} alt={project.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                    <span>No Preview</span>
                )}
            </div>
            <div style={{ padding: '12px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '4px' }}>{project.name}</h3>
                <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                    Last modified: {new Date(project.lastModified).toLocaleDateString()}
                </p>
            </div>
        </div>
    );
};
