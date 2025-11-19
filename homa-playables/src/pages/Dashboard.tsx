import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ProjectCard } from '../components/ProjectCard';
import { parseProjectZip } from '../utils/ZipUtils';
import { saveProject, getAllProjects, deleteProject } from '../db';
import type { Project } from '../types';

export const Dashboard: React.FC = () => {
    const navigate = useNavigate();
    const [projects, setProjects] = useState<Project[]>([]);
    const [isUploading, setIsUploading] = useState(false);

    useEffect(() => {
        loadProjects();
    }, []);

    const loadProjects = async () => {
        const loadedProjects = await getAllProjects();
        // Sort by newest first
        setProjects(loadedProjects.sort((a, b) => b.lastModified - a.lastModified));
    };

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        try {
            setIsUploading(true);
            const { config } = await parseProjectZip(file);

            const newProject: Project = {
                id: crypto.randomUUID(),
                name: file.name.replace('.zip', ''),
                lastModified: Date.now(),
                buildUrl: '', // Will be generated in Editor
                variables: config.variables
            };

            // Save to IndexedDB
            await saveProject(newProject, file);

            // Reload list
            await loadProjects();

            // Navigate to editor
            navigate(`/editor/${newProject.id}`);
        } catch (error) {
            console.error('Failed to parse project:', error);
            alert('Failed to load project. Please ensure it is a valid Homa Playable zip.');
        } finally {
            setIsUploading(false);
            // Reset input
            event.target.value = '';
        }
    };

    const handleDelete = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if (confirm('Are you sure you want to delete this project?')) {
            await deleteProject(id);
            await loadProjects();
        }
    };

    return (
        <div style={{ padding: '40px', maxWidth: '1200px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
                <h1 style={{ fontSize: '32px', fontWeight: 'bold' }}>My Projects</h1>

                <div style={{ position: 'relative' }}>
                    <input
                        type="file"
                        accept=".zip"
                        onChange={handleFileUpload}
                        style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: '100%',
                            height: '100%',
                            opacity: 0,
                            cursor: 'pointer'
                        }}
                        disabled={isUploading}
                    />
                    <button
                        style={{
                            padding: '12px 24px',
                            backgroundColor: 'var(--color-primary)',
                            color: 'white',
                            border: 'none',
                            borderRadius: 'var(--radius-md)',
                            fontWeight: 600,
                            cursor: 'pointer',
                            opacity: isUploading ? 0.7 : 1
                        }}
                    >
                        {isUploading ? 'Uploading...' : '+ New Project'}
                    </button>
                </div>
            </div>

            {projects.length === 0 ? (
                <div style={{
                    textAlign: 'center',
                    padding: '60px',
                    backgroundColor: 'var(--color-bg-secondary)',
                    borderRadius: 'var(--radius-lg)',
                    border: '2px dashed var(--color-border)'
                }}>
                    <p style={{ color: 'var(--color-text-secondary)', marginBottom: '16px' }}>No projects yet</p>
                    <p style={{ fontSize: '14px', color: 'var(--color-text-tertiary)' }}>Upload a .zip file to get started</p>
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '24px' }}>
                    {projects.map(project => (
                        <div key={project.id} style={{ position: 'relative' }}>
                            <ProjectCard
                                project={project}
                                onClick={() => navigate(`/editor/${project.id}`)}
                            />
                            <button
                                onClick={(e) => handleDelete(e, project.id)}
                                style={{
                                    position: 'absolute',
                                    top: '10px',
                                    right: '10px',
                                    background: 'rgba(0,0,0,0.5)',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '4px',
                                    padding: '4px 8px',
                                    cursor: 'pointer',
                                    zIndex: 10
                                }}
                            >
                                ✕
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
