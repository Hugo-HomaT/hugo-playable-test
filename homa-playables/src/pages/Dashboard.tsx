import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ProjectCard } from '../components/ProjectCard';
import { parseProjectZip } from '../utils/ZipUtils';
import { saveProject, getAllProjects, deleteProject, updateProject } from '../db';
import type { Project } from '../types';

export const Dashboard: React.FC = () => {
    const navigate = useNavigate();
    const [projects, setProjects] = useState<Project[]>([]);
    const [filteredProjects, setFilteredProjects] = useState<Project[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [dragActive, setDragActive] = useState(false);

    useEffect(() => {
        loadProjects();
    }, []);

    useEffect(() => {
        if (!searchQuery) {
            setFilteredProjects(projects);
        } else {
            const lowerQuery = searchQuery.toLowerCase();
            setFilteredProjects(projects.filter(p =>
                p.name.toLowerCase().includes(lowerQuery)
            ));
        }
    }, [searchQuery, projects]);

    const loadProjects = async () => {
        const loadedProjects = await getAllProjects();
        // Sort by newest first
        const sorted = loadedProjects.sort((a, b) => b.lastModified - a.lastModified);
        setProjects(sorted);
        setFilteredProjects(sorted);
    };

    const handleFileUpload = async (file: File) => {
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
        }
    };

    const onDrag = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    };

    const onDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFileUpload(e.dataTransfer.files[0]);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        e.preventDefault();
        if (e.target.files && e.target.files[0]) {
            handleFileUpload(e.target.files[0]);
        }
    };

    const handleDelete = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if (confirm('Are you sure you want to delete this project?')) {
            await deleteProject(id);
            await loadProjects();
        }
    };

    const handleRename = async (id: string, newName: string) => {
        await updateProject(id, { name: newName });
        await loadProjects();
    };

    return (
        <div style={{
            minHeight: '100vh',
            padding: '40px',
            maxWidth: '1400px',
            margin: '0 auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '40px'
        }}>
            {/* Header Section */}
            <header style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                animation: 'fadeIn 0.5s ease-out'
            }}>
                <div>
                    <h1 style={{
                        fontSize: '36px',
                        fontWeight: '800',
                        background: 'var(--gradient-primary)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        marginBottom: '8px'
                    }}>
                        Homa Playables
                    </h1>
                    <p style={{ color: 'var(--color-text-secondary)' }}>
                        Manage and customize your playable ads
                    </p>
                </div>

                <div style={{ position: 'relative', width: '300px' }}>
                    <input
                        type="text"
                        placeholder="Search projects..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        style={{
                            width: '100%',
                            padding: '12px 16px',
                            paddingLeft: '40px',
                            borderRadius: 'var(--radius-lg)',
                            border: '1px solid var(--color-border)',
                            backgroundColor: 'var(--color-bg-secondary)',
                            color: 'var(--color-text-primary)',
                            fontSize: '14px',
                            outline: 'none',
                            transition: 'border-color 0.2s'
                        }}
                        onFocus={(e) => e.target.style.borderColor = 'var(--color-accent)'}
                        onBlur={(e) => e.target.style.borderColor = 'var(--color-border)'}
                    />
                    <span style={{
                        position: 'absolute',
                        left: '12px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        color: 'var(--color-text-muted)'
                    }}>🔍</span>
                </div>
            </header>

            {/* Upload Hero Section */}
            <div
                onDragEnter={onDrag}
                onDragLeave={onDrag}
                onDragOver={onDrag}
                onDrop={onDrop}
                style={{
                    position: 'relative',
                    padding: '60px',
                    borderRadius: 'var(--radius-lg)',
                    border: `2px dashed ${dragActive ? 'var(--color-accent)' : 'var(--color-border)'}`,
                    backgroundColor: dragActive ? 'rgba(99, 102, 241, 0.05)' : 'var(--color-bg-secondary)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.2s ease',
                    cursor: 'pointer',
                    animation: 'fadeIn 0.6s ease-out'
                }}
            >
                <input
                    type="file"
                    accept=".zip"
                    onChange={handleChange}
                    style={{
                        position: 'absolute',
                        width: '100%',
                        height: '100%',
                        top: 0,
                        left: 0,
                        opacity: 0,
                        cursor: 'pointer'
                    }}
                    disabled={isUploading}
                />

                <div style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '50%',
                    backgroundColor: 'var(--color-bg-tertiary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '16px',
                    color: 'var(--color-accent)',
                    fontSize: '24px'
                }}>
                    {isUploading ? '⏳' : '☁️'}
                </div>

                <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '8px' }}>
                    {isUploading ? 'Uploading Project...' : 'Upload New Project'}
                </h2>
                <p style={{ color: 'var(--color-text-secondary)', marginBottom: '24px' }}>
                    Drag & drop your Unity build .zip here, or click to browse
                </p>

                <button style={{
                    padding: '10px 24px',
                    background: 'var(--color-bg-tertiary)',
                    color: 'var(--color-text-primary)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-md)',
                    fontWeight: '500',
                    pointerEvents: 'none' // Let click pass through to input
                }}>
                    Select File
                </button>
            </div>

            {/* Projects Grid */}
            <div style={{ animation: 'fadeIn 0.7s ease-out' }}>
                <h2 style={{
                    fontSize: '18px',
                    fontWeight: '600',
                    marginBottom: '24px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                }}>
                    Recent Projects
                    <span style={{
                        fontSize: '12px',
                        backgroundColor: 'var(--color-bg-tertiary)',
                        padding: '2px 8px',
                        borderRadius: '12px',
                        color: 'var(--color-text-secondary)'
                    }}>
                        {filteredProjects.length}
                    </span>
                </h2>

                {filteredProjects.length === 0 ? (
                    <div style={{
                        textAlign: 'center',
                        padding: '40px',
                        color: 'var(--color-text-muted)'
                    }}>
                        {searchQuery ? 'No projects match your search' : 'No projects yet. Upload one above!'}
                    </div>
                ) : (
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                        gap: '24px'
                    }}>
                        {filteredProjects.map(project => (
                            <div key={project.id} className="project-card-wrapper" style={{ position: 'relative', height: '280px' }}>
                                <ProjectCard
                                    project={project}
                                    onClick={() => navigate(`/editor/${project.id}`)}
                                    onRename={handleRename}
                                />
                                <button
                                    onClick={(e) => handleDelete(e, project.id)}
                                    style={{
                                        position: 'absolute',
                                        top: '8px',
                                        right: '8px',
                                        width: '28px',
                                        height: '28px',
                                        borderRadius: '50%',
                                        background: 'rgba(15, 15, 25, 0.8)',
                                        color: 'white',
                                        border: '1px solid rgba(255, 255, 255, 0.1)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        cursor: 'pointer',
                                        zIndex: 10,
                                        opacity: 0,
                                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                        backdropFilter: 'blur(8px)',
                                        padding: 0
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.background = 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)';
                                        e.currentTarget.style.transform = 'scale(1.1) rotate(90deg)';
                                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(239, 68, 68, 0.4)';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.background = 'rgba(15, 15, 25, 0.8)';
                                        e.currentTarget.style.transform = 'scale(1) rotate(0deg)';
                                        e.currentTarget.style.boxShadow = 'none';
                                    }}
                                    className="delete-btn"
                                    title="Delete project"
                                >
                                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M12 4L4 12M4 4L12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                </button>
                                <style>
                                    {`
                                        .project-card-wrapper:hover .delete-btn {
                                            opacity: 1 !important;
                                        }
                                    `}
                                </style>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};
