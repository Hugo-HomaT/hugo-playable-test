import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getProject, updateProject } from '../db';
import type { Project, Concept } from '../types';
import {
    ArrowLeft,
    Plus,
    Copy,
    Trash2,
    Clock,
    Edit3
} from 'lucide-react';

export const ProjectHub: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [project, setProject] = useState<Project | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isCreating, setIsCreating] = useState(false);
    const [newConceptName, setNewConceptName] = useState('');
    const [sourceConcept, setSourceConcept] = useState<Concept | null>(null); // If duplicating

    useEffect(() => {
        const loadProject = async () => {
            if (!id) return;
            try {
                const proj = await getProject(id);
                if (!proj) {
                    setError('Project not found');
                    return;
                }
                setProject(proj);
            } catch (err) {
                console.error(err);
                setError('Failed to load project');
            } finally {
                setLoading(false);
            }
        };
        loadProject();
    }, [id]);

    const handleCreateConcept = async () => {
        if (!project || !newConceptName.trim()) return;

        const now = Date.now();

        // Determine initial values: from source concept (duplicate) or base project defaults
        let initialValues: Record<string, any> = {};

        if (sourceConcept) {
            initialValues = { ...sourceConcept.values };
        } else {
            // Start from base project variables
            initialValues = project.variables.reduce((acc, v) => ({ ...acc, [v.name]: v.value }), {});
        }

        const newConcept: Concept = {
            id: crypto.randomUUID(),
            projectId: project.id,
            name: newConceptName.trim(),
            createdAt: now,
            updatedAt: now,
            values: initialValues
        };

        const updatedConcepts = [...(project.concepts || []), newConcept];

        try {
            await updateProject(project.id, { concepts: updatedConcepts });
            setProject(prev => prev ? { ...prev, concepts: updatedConcepts } : null);
            setIsCreating(false);
            setNewConceptName('');
            setSourceConcept(null);
            // Navigate to the editor for the new concept
            navigate(`/project/${project.id}/concept/${newConcept.id}`);
        } catch (err) {
            console.error('Failed to create concept:', err);
            alert('Failed to create concept');
        }
    };

    const handleDeleteConcept = async (conceptId: string) => {
        if (!project) return;
        if (!confirm('Are you sure you want to delete this concept?')) return;

        const updatedConcepts = (project.concepts || []).filter(c => c.id !== conceptId);

        try {
            await updateProject(project.id, { concepts: updatedConcepts });
            setProject(prev => prev ? { ...prev, concepts: updatedConcepts } : null);
        } catch (err) {
            console.error('Failed to delete concept:', err);
            alert('Failed to delete concept');
        }
    };

    const startCreate = (source: Concept | null = null) => {
        setSourceConcept(source);
        setNewConceptName(source ? `${source.name} (Copy)` : '');
        setIsCreating(true);
    };

    const getModifiedCount = (concept: Concept) => {
        if (!project) return 0;
        let count = 0;
        project.variables.forEach(v => {
            // Check if the concept has a value for this variable AND it's different from the default
            if (concept.values[v.name] !== undefined && String(concept.values[v.name]) !== String(v.value)) {
                count++;
            }
        });
        return count;
    };

    if (loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                <div style={{ color: 'var(--color-text-secondary)' }}>Loading project...</div>
            </div>
        );
    }

    if (error || !project) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', flexDirection: 'column', gap: '16px' }}>
                <div style={{ color: 'var(--color-error)' }}>{error || 'Project not found'}</div>
                <button onClick={() => navigate('/')}>Back to Dashboard</button>
            </div>
        );
    }

    return (
        <div style={{ padding: '40px', maxWidth: '1200px', margin: '0 auto' }}>
            <div style={{ marginBottom: '32px' }}>
                <button
                    onClick={() => navigate('/')}
                    style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--color-text-secondary)',
                        cursor: 'pointer',
                        marginBottom: '16px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                    }}
                >
                    <ArrowLeft size={16} />
                    Back to Dashboard
                </button>
                <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
                    {project.thumbnailUrl && (
                        <img
                            src={project.thumbnailUrl}
                            alt={project.name}
                            style={{
                                width: '80px',
                                height: '80px',
                                objectFit: 'cover',
                                borderRadius: 'var(--radius-md)',
                                border: '1px solid var(--color-border)'
                            }}
                        />
                    )}
                    <div>
                        <div style={{
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                            fontSize: '12px',
                            fontWeight: 600,
                            color: 'var(--color-text-secondary)',
                            marginBottom: '4px'
                        }}>
                            Project Hub
                        </div>
                        <h1 style={{ fontSize: '32px', fontWeight: 'bold', marginBottom: '8px' }}>{project.name}</h1>
                        <div style={{ color: 'var(--color-text-secondary)', fontSize: '14px' }}>
                            Last modified: {new Date(project.lastModified).toLocaleDateString()}
                        </div>
                    </div>
                </div>
            </div>

            <div style={{
                backgroundColor: 'var(--color-bg-secondary)',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--color-border)',
                overflow: 'hidden'
            }}>
                <div style={{
                    padding: '24px',
                    borderBottom: '1px solid var(--color-border)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}>
                    <h2 style={{ fontSize: '20px', fontWeight: 600 }}>Concepts</h2>
                    <button
                        onClick={() => startCreate(null)}
                        style={{
                            backgroundColor: 'var(--color-accent)',
                            color: 'white',
                            border: 'none',
                            padding: '8px 16px',
                            borderRadius: 'var(--radius-sm)',
                            cursor: 'pointer',
                            fontWeight: 500,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                        }}
                    >
                        <Plus size={16} />
                        New Concept
                    </button>
                </div>

                {isCreating && (
                    <div style={{
                        padding: '24px',
                        backgroundColor: 'var(--color-bg-tertiary)',
                        borderBottom: '1px solid var(--color-border)'
                    }}>
                        <h3 style={{ fontSize: '16px', marginBottom: '16px' }}>
                            {sourceConcept ? `Duplicate "${sourceConcept.name}"` : 'Create New Concept'}
                        </h3>
                        <div style={{ display: 'flex', gap: '12px' }}>
                            <input
                                type="text"
                                placeholder="Concept Name"
                                value={newConceptName}
                                onChange={(e) => setNewConceptName(e.target.value)}
                                autoFocus
                                style={{
                                    flex: 1,
                                    padding: '8px 12px',
                                    borderRadius: 'var(--radius-sm)',
                                    border: '1px solid var(--color-border)',
                                    backgroundColor: 'var(--color-bg-primary)',
                                    color: 'var(--color-text-primary)'
                                }}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleCreateConcept();
                                    if (e.key === 'Escape') setIsCreating(false);
                                }}
                            />
                            <button
                                onClick={() => setIsCreating(false)}
                                style={{
                                    padding: '8px 16px',
                                    backgroundColor: 'transparent',
                                    border: '1px solid var(--color-border)',
                                    color: 'var(--color-text-primary)',
                                    borderRadius: 'var(--radius-sm)',
                                    cursor: 'pointer'
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleCreateConcept}
                                disabled={!newConceptName.trim()}
                                style={{
                                    padding: '8px 16px',
                                    backgroundColor: 'var(--color-accent)',
                                    border: 'none',
                                    color: 'white',
                                    borderRadius: 'var(--radius-sm)',
                                    cursor: 'pointer',
                                    opacity: newConceptName.trim() ? 1 : 0.5
                                }}
                            >
                                {sourceConcept ? 'Duplicate' : 'Create'}
                            </button>
                        </div>
                    </div>
                )}

                <div style={{ padding: '24px' }}>
                    {(!project.concepts || project.concepts.length === 0) ? (
                        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--color-text-secondary)' }}>
                            No concepts yet. Create one to start customizing your playable.
                        </div>
                    ) : (
                        <div style={{ display: 'grid', gap: '16px', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
                            {project.concepts.map(concept => (
                                <div
                                    key={concept.id}
                                    style={{
                                        backgroundColor: 'var(--color-bg-primary)',
                                        border: '1px solid var(--color-border)',
                                        borderRadius: 'var(--radius-md)',
                                        padding: '16px',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '12px',
                                        transition: 'transform 0.2s, box-shadow 0.2s',
                                        cursor: 'pointer'
                                    }}
                                    onClick={() => navigate(`/project/${project.id}/concept/${concept.id}`)}
                                    onMouseEnter={e => {
                                        e.currentTarget.style.transform = 'translateY(-2px)';
                                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
                                        e.currentTarget.style.borderColor = 'var(--color-accent)';
                                    }}
                                    onMouseLeave={e => {
                                        e.currentTarget.style.transform = 'none';
                                        e.currentTarget.style.boxShadow = 'none';
                                        e.currentTarget.style.borderColor = 'var(--color-border)';
                                    }}
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                                        <h3 style={{ fontWeight: 600, fontSize: '16px', margin: 0 }}>{concept.name}</h3>
                                        <div style={{ display: 'flex', gap: '4px' }} onClick={e => e.stopPropagation()}>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); startCreate(concept); }}
                                                title="Duplicate"
                                                style={{
                                                    background: 'transparent',
                                                    border: 'none',
                                                    cursor: 'pointer',
                                                    padding: '6px',
                                                    color: 'var(--color-text-secondary)',
                                                    borderRadius: '4px',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center'
                                                }}
                                                onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--color-bg-tertiary)'}
                                                onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                                            >
                                                <Copy size={16} />
                                            </button>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleDeleteConcept(concept.id); }}
                                                title="Delete"
                                                style={{
                                                    background: 'transparent',
                                                    border: 'none',
                                                    cursor: 'pointer',
                                                    padding: '6px',
                                                    color: '#ef4444',
                                                    borderRadius: '4px',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center'
                                                }}
                                                onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.1)'}
                                                onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>

                                    <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginTop: 'auto' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                                            <Clock size={14} />
                                            {new Date(concept.updatedAt || Date.now()).toLocaleDateString()}
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <Edit3 size={14} />
                                            {getModifiedCount(concept)} variables modified
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
