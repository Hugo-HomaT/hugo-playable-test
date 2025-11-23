import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PlayablePreview } from '../components/PlayablePreview';
import { VariableInspector } from '../components/VariableInspector';
import { MediaPickerModal } from '../components/MediaPickerModal';
import { exportProject, type ExportNetwork } from '../utils/ExportManager';
import { parseProjectZip } from '../utils/ZipUtils';
import { getProject, getProjectZip, savePreviewFile, clearPreviewFiles, updateProject } from '../db';
import type { Project, Variable, Concept, MediaItem } from '../types';

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
    const { id, conceptId } = useParams<{ id: string; conceptId: string }>();
    const navigate = useNavigate();
    const [project, setProject] = useState<Project | null>(null);
    const [variables, setVariables] = useState<Variable[]>([]);
    const [originalVariables, setOriginalVariables] = useState<Variable[]>([]);
    const [currentConcept, setCurrentConcept] = useState<Concept | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [mediaPickerOpen, setMediaPickerOpen] = useState(false);
    const [activeAssetVariable, setActiveAssetVariable] = useState<{ name: string, type: string } | null>(null);
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

                // Find the concept
                const concept = (proj.concepts || []).find(c => c.id === conceptId);
                if (!concept) {
                    setError('Concept not found');
                    return;
                }
                setCurrentConcept(concept);

                const zipBlob = await getProjectZip(id);
                if (zipBlob) {
                    await clearPreviewFiles(id);
                    const { config, files, entryPoint } = await parseProjectZip(zipBlob as File);
                    const baseVars = config.variables || [];

                    // Save files for preview
                    for (const [path, content] of Object.entries(files)) {
                        await savePreviewFile(id, path, content);
                    }

                    // Merge base vars with concept values
                    const mergedVars = baseVars.map(v => {
                        if (concept.values[v.name] !== undefined) {
                            return { ...v, value: concept.values[v.name] };
                        }
                        return v;
                    });

                    setVariables(mergedVars);
                    setOriginalVariables(mergedVars); // Original for this session is the concept state
                    updateLiveConfig(mergedVars); // Initial load

                    // Construct and update preview URL
                    const previewUrl = `/preview/${id}/${entryPoint}`;
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
    }, [id, conceptId]);

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

            const configBlob = new Blob([JSON.stringify(config)], { type: 'application/json' });
            await savePreviewFile(id, 'homa_config.json', configBlob);

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
        setHasUnsavedChanges(true);
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
        setHasUnsavedChanges(true);
        updateLiveConfig(newVariables);
    };

    const handleResetAll = () => {
        setVariables(originalVariables);
        setHasUnsavedChanges(false);
        updateLiveConfig(originalVariables);
    };

    const handleReload = () => {
        const iframe = document.querySelector('iframe');
        if (iframe) {
            iframe.src = iframe.src;
        }
    };

    const handleSave = async () => {
        if (!project || !currentConcept) return;

        const values = variables.reduce((acc, v) => ({ ...acc, [v.name]: v.value }), {});
        const now = Date.now();

        const updatedConcept = {
            ...currentConcept,
            values,
            updatedAt: now
        };

        const updatedConcepts = (project.concepts || []).map(c =>
            c.id === currentConcept.id ? updatedConcept : c
        );

        try {
            await updateProject(project.id, { concepts: updatedConcepts });
            setCurrentConcept(updatedConcept);
            setProject(prev => prev ? { ...prev, concepts: updatedConcepts } : null);
            setHasUnsavedChanges(false);
            setOriginalVariables(variables); // Update "original" to current saved state
        } catch (err) {
            console.error('Failed to save concept:', err);
            alert('Failed to save concept');
        }
    };

    const handleExport = async (network: ExportNetwork) => {
        if (!project) return;
        try {
            const zipBlob = await getProjectZip(project.id);
            if (!zipBlob) throw new Error('Project zip not found');

            const values = variables.reduce((acc, v) => ({ ...acc, [v.name]: v.value }), {});
            const exportBlob = await exportProject(zipBlob as File, values, network, `${project.name}-${currentConcept?.name}`);

            // Download the exported file
            const filename = network === 'applovin'
                ? `${project.name}-${currentConcept?.name}-applovin.html`
                : `${project.name}-${currentConcept?.name}-mintegral.zip`;
            downloadBlob(exportBlob, filename);

            console.log(`[Export] Successfully exported ${filename}`);
        } catch (err) {
            console.error('Export failed:', err);
            alert(`Export failed: ${err instanceof Error ? err.message : 'See console for details.'}`);
        }
    };

    const downloadBlob = (blob: Blob, filename: string) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const openMediaPicker = (variableName: string, assetType: string) => {
        setActiveAssetVariable({ name: variableName, type: assetType });
        setMediaPickerOpen(true);
    };

    const handleAssetSelect = async (item: MediaItem) => {
        if (!activeAssetVariable || !id) return;

        try {
            // Save the file to the preview environment
            // We'll use a convention like 'assets/[filename]'
            const path = `assets/${item.name}`;
            await savePreviewFile(id, path, item.blob);

            // Update the variable with the path
            handleVariableUpdate(activeAssetVariable.name, path);
            setMediaPickerOpen(false);
            setActiveAssetVariable(null);
        } catch (err) {
            console.error('Failed to select asset:', err);
            alert('Failed to select asset');
        }
    };

    const getMediaTypesForAsset = (assetType: string) => {
        switch (assetType) {
            case 'AudioClip': return ['audio'];
            case 'Texture2D':
            case 'Sprite': return ['image'];
            case 'VideoClip': return ['video'];
            default: return undefined;
        }
    };

    const [isEditingName, setIsEditingName] = useState(false);
    const [editedName, setEditedName] = useState('');

    const handleNameClick = () => {
        if (currentConcept) {
            setEditedName(currentConcept.name);
            setIsEditingName(true);
        }
    };

    const handleNameSave = async () => {
        if (!project || !currentConcept || !editedName.trim() || editedName === currentConcept.name) {
            setIsEditingName(false);
            return;
        }

        const newName = editedName.trim();
        const updatedConcept = { ...currentConcept, name: newName, updatedAt: Date.now() };
        const updatedConcepts = (project.concepts || []).map(c =>
            c.id === currentConcept.id ? updatedConcept : c
        );

        try {
            await updateProject(project.id, { concepts: updatedConcepts });
            setCurrentConcept(updatedConcept);
            setProject(prev => prev ? { ...prev, concepts: updatedConcepts } : null);
            setIsEditingName(false);
        } catch (err) {
            console.error('Failed to rename concept:', err);
            alert('Failed to rename concept');
        }
    };

    const handleNameKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleNameSave();
        } else if (e.key === 'Escape') {
            setIsEditingName(false);
        }
    };

    if (loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                <div style={{ color: 'var(--color-text-secondary)' }}>Loading editor...</div>
            </div>
        );
    }

    if (error || !project || !currentConcept) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', flexDirection: 'column', gap: '16px' }}>
                <div style={{ color: 'var(--color-error)' }}>{error || 'Project or Concept not found'}</div>
                <button onClick={() => navigate(`/project/${id}`)}>Back to Hub</button>
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
                                onClick={() => navigate(`/project/${id}`)}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    color: 'var(--color-text-secondary)',
                                    cursor: 'pointer',
                                    fontSize: '14px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px'
                                }}
                            >
                                <span>←</span> Back
                            </button>
                            <div style={{ width: '1px', height: '24px', backgroundColor: 'var(--color-border)' }} />

                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                {isEditingName ? (
                                    <input
                                        autoFocus
                                        value={editedName}
                                        onChange={(e) => setEditedName(e.target.value)}
                                        onBlur={handleNameSave}
                                        onKeyDown={handleNameKeyDown}
                                        style={{
                                            fontSize: '20px',
                                            fontWeight: 'bold',
                                            background: 'var(--color-bg-tertiary)',
                                            border: '1px solid var(--color-accent)',
                                            borderRadius: 'var(--radius-sm)',
                                            color: 'var(--color-text-primary)',
                                            padding: '4px 8px',
                                            outline: 'none',
                                            minWidth: '200px'
                                        }}
                                    />
                                ) : (
                                    <div
                                        onClick={handleNameClick}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px',
                                            cursor: 'pointer',
                                            padding: '4px 8px',
                                            borderRadius: 'var(--radius-sm)',
                                            transition: 'background-color 0.2s'
                                        }}
                                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--color-bg-tertiary)'}
                                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                        title="Click to rename"
                                    >
                                        <h2 style={{ fontSize: '20px', fontWeight: 'bold', margin: 0 }}>{currentConcept.name}</h2>
                                        <span style={{ fontSize: '14px', opacity: 0.5 }}>✎</span>
                                    </div>
                                )}

                                {hasUnsavedChanges && (
                                    <span style={{
                                        fontSize: '12px',
                                        color: 'var(--color-accent)',
                                        backgroundColor: 'rgba(255, 145, 250, 0.1)',
                                        padding: '2px 8px',
                                        borderRadius: '12px',
                                        border: '1px solid rgba(255, 145, 250, 0.2)'
                                    }}>
                                        Unsaved Changes
                                    </span>
                                )}
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                                onClick={handleSave}
                                disabled={!hasUnsavedChanges}
                                style={{
                                    padding: '8px 24px',
                                    backgroundColor: 'var(--color-accent)',
                                    border: 'none',
                                    color: 'white',
                                    borderRadius: 'var(--radius-sm)',
                                    cursor: 'pointer',
                                    fontWeight: 600,
                                    opacity: hasUnsavedChanges ? 1 : 0.5
                                }}
                            >
                                Save Concept
                            </button>
                            <div style={{ width: '1px', backgroundColor: 'var(--color-border)', margin: '0 8px' }} />
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

                <div style={{ width: '320px', height: '100%', borderLeft: '1px solid var(--color-border)' }}>
                    <VariableInspector
                        variables={variables}
                        onUpdate={handleVariableUpdate}
                        onResetVariable={handleResetVariable}
                        onResetSection={handleResetSection}
                        onResetAll={handleResetAll}
                        onReload={handleReload}
                        onAssetSelect={openMediaPicker}
                    />
                </div>
            </div>

            <MediaPickerModal
                isOpen={mediaPickerOpen}
                onClose={() => setMediaPickerOpen(false)}
                onSelect={handleAssetSelect}
                allowedTypes={activeAssetVariable ? getMediaTypesForAsset(activeAssetVariable.type) : undefined}
            />
        </ErrorBoundary>
    );
};
