import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PlayablePreview } from '../components/PlayablePreview';
import { VariableInspector } from '../components/VariableInspector';
import { exportProject, type ExportNetwork } from '../utils/ExportManager';
import { parseProjectZip } from '../utils/ZipUtils';
import { getProject, getProjectZip, savePreviewFile, clearPreviewFiles } from '../db';
import type { Project, Variable, Concept } from '../types';

export const Editor: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    const [project, setProject] = useState<Project | null>(null);
    const [variables, setVariables] = useState<Variable[]>([]);
    const [concepts, setConcepts] = useState<Concept[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadProject = async () => {
            if (!id) return;

            try {
                const dbProject = await getProject(id);
                const zipBlob = await getProjectZip(id);

                if (dbProject && zipBlob) {
                    // Parse zip
                    const { files, entryPoint } = await parseProjectZip(new File([zipBlob], 'project.zip'));

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

            const exportBlob = await exportProject(zipBlob, currentConcept, network);

            // Trigger download
            const url = URL.createObjectURL(exportBlob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${project.name}_${network}.${network === 'mintegral' ? 'html' : 'zip'}`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

        } catch (error) {
            console.error('Export failed:', error);
            alert('Export failed. See console for details.');
        }
    };

    if (loading) return <div style={{ padding: '20px' }}>Loading project...</div>;
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
                        <h2 style={{ fontSize: '20px', fontWeight: 'bold' }}>{project.name}</h2>
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
