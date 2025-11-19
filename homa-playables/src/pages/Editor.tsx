import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PlayablePreview } from '../components/PlayablePreview';
import { ConceptsManager } from '../components/ConceptsManager';
import { VariableInspector } from '../components/VariableInspector';
import { exportProject, type ExportNetwork } from '../utils/ExportManager';
import { parseProjectZip } from '../utils/ZipUtils';
import { getProject, getProjectZip, savePreviewFile, clearPreviewFiles, updateProject } from '../db';
import type { Project, Variable, Concept } from '../types';

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean, error: any }> {
    constructor(props: { children: React.ReactNode }) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: any) {
        return { hasError: true, error };
    }

    componentDidCatch(error: any, errorInfo: any) {
        console.error("Editor Error Boundary caught error:", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div style={{ padding: '20px', color: 'red' }}>
                    <h2>Something went wrong.</h2>
                    <pre>{this.state.error?.toString()}</pre>
                </div>
            );
        }

        return this.props.children;
    }
}

export const Editor: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [project, setProject] = useState<Project | null>(null);
    const [variables, setVariables] = useState<Variable[]>([]);
    const [originalVariables, setOriginalVariables] = useState<Variable[]>([]);
    const [concepts, setConcepts] = useState<Concept[]>([]);
    const [currentConceptId, setCurrentConceptId] = useState<string | undefined>(undefined);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isEditingName, setIsEditingName] = useState(false);
    const [editedName, setEditedName] = useState('');
    const nameInputRef = useRef<HTMLInputElement>(null);
    const debounceTimerRef = useRef<number | null>(null);

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
                setEditedName(proj.name);
                setConcepts(proj.concepts || []);

                const zipBlob = await getProjectZip(id);
                if (zipBlob) {
                    await clearPreviewFiles(id);
                    // FIX: Destructure config correctly, variables are inside config
                    const { config, files, entryPoint } = await parseProjectZip(zipBlob);
                    const vars = config.variables;

                    // Save files for preview
                    for (const [path, content] of Object.entries(files)) {
                        await savePreviewFile(id, path, content);
                    }

                    setVariables(vars || []);
                    setOriginalVariables(vars || []); // Store original state

                    // Construct and update preview URL
                    const previewUrl = `/preview/${id}/${entryPoint}`;
                    console.log('Setting preview URL:', previewUrl);
                    setProject(prev => prev ? { ...prev, buildUrl: previewUrl } : null);
                }
            } catch (err) {
                console.error(err);
                setError('Failed to load project');
            } finally {
                setLoading(false);
            }
        };
        loadProject();
    }, [id]);

    useEffect(() => {
        if (isEditingName && nameInputRef.current) {
            nameInputRef.current.focus();
        }
    }, [isEditingName]);

    const updateLiveConfig = useCallback(async (newVariables: Variable[]) => {
        if (!id) return;

        if (debounceTimerRef.current) {
            window.clearTimeout(debounceTimerRef.current);
        }

        debounceTimerRef.current = window.setTimeout(async () => {
            // Unity expects: { variables: [{ name: "key", value: "val" }, ...] }
            const config = {
                variables: newVariables.map(v => ({
                    name: v.name,
                    value: String(v.value)
                }))
            };

            // Update config in IndexedDB for the service worker to pick up
            const configBlob = new Blob([JSON.stringify(config)], { type: 'application/json' });
            await savePreviewFile(id, 'homa_config.json', configBlob);

            // Reload iframe
            const iframe = document.querySelector('iframe');
            if (iframe) {
                iframe.src = iframe.src;
            }
        }, 500);
    }, [id]);

    const handleVariableUpdate = (name: string, value: any) => {
        const newVariables = variables.map(v =>
            v.name === name ? { ...v, value } : v
        );
        setVariables(newVariables);
        updateLiveConfig(newVariables);
    };

    const handleResetVariable = (name: string) => {
        const original = originalVariables.find(v => v.name === name);
        if (original) {
            handleVariableUpdate(name, original.value);
        }
    };

    const handleResetSection = (section: string) => {
        const newVariables = variables.map(v => {
            if ((v.section || 'Default') === section) {
                const original = originalVariables.find(ov => ov.name === v.name);
                return original ? { ...v, value: original.value } : v;
            }
            return v;
        });
        setVariables(newVariables);
        updateLiveConfig(newVariables);
    };

    const handleResetAll = () => {
        setVariables(originalVariables);
        updateLiveConfig(originalVariables);
    };

    const handleReload = () => {
        const iframe = document.querySelector('iframe');
        if (iframe) {
            iframe.src = iframe.src;
        }
    };

    const handleSaveConcept = async (name: string) => {
        if (!project) return;

        const values = variables.reduce((acc, v) => ({ ...acc, [v.name]: v.value }), {});

        const newConcept: Concept = {
            id: crypto.randomUUID(),
            projectId: project.id,
            name,
            values
        };

        const updatedConcepts = [...concepts, newConcept];
        setConcepts(updatedConcepts);
        setCurrentConceptId(newConcept.id);

        try {
            await updateProject(project.id, { concepts: updatedConcepts });
            setProject(prev => prev ? { ...prev, concepts: updatedConcepts } : null);
        } catch (err) {
            console.error('Failed to save concept:', err);
            alert('Failed to save concept');
        }
    };

    const handleUpdateConcept = async (id: string) => {
        if (!project) return;

        const values = variables.reduce((acc, v) => ({ ...acc, [v.name]: v.value }), {});

        const updatedConcepts = concepts.map(c =>
            c.id === id ? { ...c, values } : c
        );

        setConcepts(updatedConcepts);

        try {
            await updateProject(project.id, { concepts: updatedConcepts });
            setProject(prev => prev ? { ...prev, concepts: updatedConcepts } : null);
        } catch (err) {
            console.error('Failed to update concept:', err);
            alert('Failed to update concept');
        }
    };

    const handleDeleteConcept = async (id: string) => {
        if (!project) return;

        if (!confirm('Are you sure you want to delete this concept?')) return;

        const updatedConcepts = concepts.filter(c => c.id !== id);
        setConcepts(updatedConcepts);
        if (currentConceptId === id) setCurrentConceptId(undefined);

        try {
            await updateProject(project.id, { concepts: updatedConcepts });
            setProject(prev => prev ? { ...prev, concepts: updatedConcepts } : null);
        } catch (err) {
            console.error('Failed to delete concept:', err);
            alert('Failed to delete concept');
        }
    };

    const handleLoadConcept = (concept: Concept) => {
        const newVariables = variables.map(v => {
            if (concept.values[v.name] !== undefined) {
                return { ...v, value: concept.values[v.name] };
            }
            return v;
        });
        setVariables(newVariables);
        setCurrentConceptId(concept.id);
        updateLiveConfig(newVariables);
    };

    const handleNameDoubleClick = () => {
        setIsEditingName(true);
    };

    const handleNameSave = async () => {
        if (!project || !editedName.trim()) {
            setEditedName(project?.name || '');
            setIsEditingName(false);
            return;
        }

        if (editedName !== project.name) {
            try {
                await updateProject(project.id, { name: editedName });
                setProject(prev => prev ? { ...prev, name: editedName } : null);
            } catch (err) {
                console.error('Failed to update name:', err);
                setEditedName(project.name);
            }
        }
        setIsEditingName(false);
    };

    const handleNameKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleNameSave();
        } else if (e.key === 'Escape') {
            setEditedName(project?.name || '');
            setIsEditingName(false);
        }
    };

    const handleExport = async (network: ExportNetwork) => {
        if (!project) return;
        try {
            const zipBlob = await getProjectZip(project.id);
            if (!zipBlob) throw new Error('Project zip not found');

            await exportProject(zipBlob, variables, network, project.name);
        } catch (err) {
            console.error('Export failed:', err);
            alert('Export failed. See console for details.');
        }
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
        <ErrorBoundary>
            <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
                <div style={{ flex: 1, padding: '20px', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <button
                                onClick={() => navigate('/')}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    color: 'var(--color-text-secondary)',
                                    cursor: 'pointer',
                                    fontSize: '14px'
                                }}
                            >
                                ← Back
                            </button>
                            {isEditingName ? (
                                <input
                                    ref={nameInputRef}
                                    type="text"
                                    value={editedName}
                                    onChange={(e) => setEditedName(e.target.value)}
                                    onBlur={handleNameSave}
                                    onKeyDown={handleNameKeyDown}
                                    style={{
                                        fontSize: '20px',
                                        fontWeight: 'bold',
                                        color: 'var(--color-text-primary)',
                                        background: 'rgba(255, 145, 250, 0.05)',
                                        border: '2px solid var(--color-accent)',
                                        borderRadius: 'var(--radius-sm)',
                                        padding: '4px 8px',
                                        outline: 'none',
                                        minWidth: '200px',
                                        boxShadow: '0 0 0 3px rgba(255, 145, 250, 0.1)'
                                    }}
                                />
                            ) : (
                                <h2
                                    onDoubleClick={handleNameDoubleClick}
                                    style={{
                                        fontSize: '20px',
                                        fontWeight: 'bold',
                                        cursor: 'text',
                                        padding: '4px 8px',
                                        borderRadius: 'var(--radius-sm)',
                                        transition: 'all 0.2s ease'
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.color = 'var(--color-accent)';
                                        e.currentTarget.style.background = 'rgba(255, 145, 250, 0.05)';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.color = 'var(--color-text-primary)';
                                        e.currentTarget.style.background = 'transparent';
                                    }}
                                >
                                    {project.name}
                                </h2>
                            )}
                        </div>

                        <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                                onClick={() => handleExport('mintegral')}
                                style={{
                                    padding: '8px 16px',
                                    backgroundColor: 'var(--color-bg-tertiary)',
                                    border: '1px solid var(--color-border)',
                                    color: 'var(--color-text-primary)',
                                    borderRadius: 'var(--radius-sm)',
                                    cursor: 'pointer'
                                }}
                            >
                                Export Mintegral
                            </button>
                            <button
                                onClick={() => handleExport('applovin')}
                                style={{
                                    padding: '8px 16px',
                                    backgroundColor: 'var(--color-bg-tertiary)',
                                    border: '1px solid var(--color-border)',
                                    color: 'var(--color-text-primary)',
                                    borderRadius: 'var(--radius-sm)',
                                    cursor: 'pointer'
                                }}
                            >
                                Export AppLovin
                            </button>
                        </div>
                    </div>

                    <div style={{ flex: 1, minHeight: 0 }}>
                        <PlayablePreview src={project.buildUrl} />
                    </div>
                </div>

                <div style={{ width: '320px', height: '100%', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ flex: 2, minHeight: 0 }}>
                        <VariableInspector
                            variables={variables}
                            onUpdate={handleVariableUpdate}
                            onResetVariable={handleResetVariable}
                            onResetSection={handleResetSection}
                            onResetAll={handleResetAll}
                            onReload={handleReload}
                        />
                    </div>
                    <div style={{ flex: 1, minHeight: 0, borderTop: '1px solid var(--color-border)' }}>
                        <ConceptsManager
                            concepts={concepts}
                            currentConceptId={currentConceptId}
                            onSaveConcept={handleSaveConcept}
                            onUpdateConcept={handleUpdateConcept}
                            onLoadConcept={handleLoadConcept}
                            onDeleteConcept={handleDeleteConcept}
                        />
                    </div>
                </div>
            </div>
        </ErrorBoundary>
    );
};
