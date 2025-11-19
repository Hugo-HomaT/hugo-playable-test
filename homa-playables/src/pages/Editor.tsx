import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PlayablePreview } from '../components/PlayablePreview';
import { VariableInspector } from '../components/VariableInspector';
import { exportProject, type ExportNetwork } from '../utils/ExportManager';
import { parseProjectZip } from '../utils/ZipUtils';
import { getProject, getProjectZip, savePreviewFile, clearPreviewFiles, updateProject } from '../db';
import type { Project, Variable, Concept } from '../types';

export const Editor: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    const [project, setProject] = useState<Project | null>(null);
    const [variables, setVariables] = useState<Variable[]>([]);
    const [concepts, setConcepts] = useState<Concept[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isEditingName, setIsEditingName] = useState(false);
    const [editedName, setEditedName] = useState('');
    const nameInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const loadProject = async () => {
            if (!id) return;

            try {
                const dbProject = await getProject(id);
                const zipBlob = await getProjectZip(id);

                if (dbProject && zipBlob) {
                    // Parse zip
                    const { files, entryPoint } = await parseProjectZip(new File([zipBlob], 'project.zip'));

                    // Check for Brotli-compressed files
                    const hasBrotliFiles = Object.keys(files).some(path => path.endsWith('.br'));
                    if (hasBrotliFiles) {
                        setError('This build uses Brotli compression (.br files) which is not supported. Please rebuild your Unity project with the updated plugin (it now uses Gzip compression).');
                        setLoading(false);
                        return;
                    }

                    // Clear old preview files for this project
                    await clearPreviewFiles(id);

                    // Save all files to IDB for Service Worker
                    const savePromises = Object.entries(files).map(([path, blob]) =>
                        savePreviewFile(id, path, blob)
                    );
                    await Promise.all(savePromises);

                    // Construct Service Worker URL
                    const buildUrl = `/preview/${id}/${entryPoint}`;

                    setProject({ ...dbProject, buildUrl });
                    setVariables(dbProject.variables);
                } else {
                    console.error('Project not found in DB');
                    navigate('/');
                }
            } catch (err) {
                console.error('Error loading project:', err);
                setError('Failed to load project. Please try re-uploading.');
            } finally {
                setLoading(false);
            }
        };

        loadProject();
    }, [id, navigate]);

    const handleVariableUpdate = (name: string, value: any) => {
        setVariables(prev => prev.map(v =>
            v.name === name ? { ...v, value } : v
        ));
    };

    const handleSaveConcept = (name: string) => {
        if (!project) return;

        const values = variables.reduce((acc, v) => ({ ...acc, [v.name]: v.value }), {});

        const newConcept: Concept = {
            id: crypto.randomUUID(),
            projectId: project.id,
            name,
            values
        };

        setConcepts(prev => [...prev, newConcept]);
    };

    const handleLoadConcept = (concept: Concept) => {
        setVariables(prev => prev.map(v => {
            if (concept.values[v.name] !== undefined) {
                return { ...v, value: concept.values[v.name] };
            }
            return v;
        }));
    };

    const handleExport = async (network: ExportNetwork) => {
        if (!project || !id) return;

        try {
            const zipBlob = await getProjectZip(id);
            if (!zipBlob) {
                alert('Error: Original project file not found.');
                return;
            }

            // Create a temporary concept from current variables
            const currentValues = variables.reduce((acc, v) => ({ ...acc, [v.name]: v.value }), {});
            const currentConcept: Concept = {
                id: 'temp',
                projectId: project.id,
                name: 'Current',
                values: currentValues
            };

            // Export with project name
            const exportBlob = await exportProject(zipBlob, currentConcept, network, project.name);

            // Trigger download with correct extension
            const url = URL.createObjectURL(exportBlob);
            const a = document.createElement('a');
            a.href = url;
            // Mintegral = ZIP, AppLovin = HTML
            a.download = `${project.name}_${network}.${network === 'mintegral' ? 'zip' : 'html'}`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

        } catch (error) {
            console.error('Export failed:', error);
            alert(`Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    };

    const handleNameDoubleClick = () => {
        if (project) {
            setIsEditingName(true);
            setEditedName(project.name);
            setTimeout(() => {
                if (nameInputRef.current) {
                    nameInputRef.current.focus();
                    nameInputRef.current.select();
                }
            }, 0);
        }
    };

    const handleNameSave = async () => {
        if (!project || !id) return;
        const trimmedName = editedName.trim();
        if (!trimmedName || trimmedName === project.name) {
            setIsEditingName(false);
            return;
        }
        try {
            await updateProject(id, { name: trimmedName });
            setProject({ ...project, name: trimmedName });
            setIsEditingName(false);
        } catch (error) {
            console.error('Failed to rename:', error);
            setIsEditingName(false);
        }
    };

    const handleNameKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleNameSave();
        } else if (e.key === 'Escape') {
            e.preventDefault();
            setIsEditingName(false);
        }
    };

    if (loading) return <div style={{ padding: '20px' }}>Loading project...</div>;
    if (error) return (
        <div style={{ padding: '40px', maxWidth: '600px', margin: '0 auto' }}>
            <h2 style={{ color: '#ef4444', marginBottom: '16px' }}>⚠️ Incompatible Build Format</h2>
            <p style={{ marginBottom: '16px', lineHeight: '1.6' }}>{error}</p>
            <div style={{ background: 'rgba(255, 145, 250, 0.1)', padding: '16px', borderRadius: '8px', border: '1px solid rgba(255, 145, 250, 0.2)' }}>
                <p style={{ margin: 0, fontSize: '14px' }}>
                    <strong>Solution:</strong> Rebuild your Unity project. The plugin has been updated to use Gzip compression instead of Brotli.
                </p>
            </div>
            <button
                onClick={() => navigate('/')}
                style={{
                    marginTop: '24px',
                    padding: '12px 24px',
                    background: 'var(--gradient-primary)',
                    border: 'none',
                    borderRadius: 'var(--radius-sm)',
                    color: 'white',
                    cursor: 'pointer',
                    fontWeight: 600
                }}
            >
                ← Back to Dashboard
            </button>
        </div>
    );
    if (!project) return <div style={{ padding: '20px' }}>Project not found</div>;

    return (
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

            <div style={{ width: '320px', height: '100%' }}>
                <VariableInspector
                    variables={variables}
                    concepts={concepts}
                    onUpdate={handleVariableUpdate}
                    onSaveConcept={handleSaveConcept}
                    onLoadConcept={handleLoadConcept}
                />
            </div>
        </div>
    );
};
