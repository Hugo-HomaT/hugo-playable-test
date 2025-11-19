import React, { useState } from 'react';
import type { Variable, Concept } from '../types';

interface VariableInspectorProps {
    variables: Variable[];
    concepts?: Concept[];
    onUpdate: (name: string, value: any) => void;
    onSaveConcept?: (name: string) => void;
    onLoadConcept?: (concept: Concept) => void;
}

export const VariableInspector: React.FC<VariableInspectorProps> = ({
    variables,
    concepts = [],
    onUpdate,
    onSaveConcept,
    onLoadConcept
}) => {
    const [newConceptName, setNewConceptName] = useState('');
    return (
        <div style={{
            padding: '20px',
            backgroundColor: 'var(--color-bg-secondary)',
            height: '100%',
            overflowY: 'auto',
            borderLeft: '1px solid var(--color-border)'
        }}>
            <h3 style={{ fontSize: '18px', marginBottom: '20px', fontWeight: 600 }}>Settings</h3>

            {variables.length === 0 ? (
                <p style={{ color: 'var(--color-text-secondary)', fontSize: '14px' }}>
                    No variables exposed in this build.
                </p>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {variables.map(variable => (
                        <div key={variable.name}>
                            <label style={{
                                display: 'block',
                                marginBottom: '8px',
                                fontSize: '14px',
                                color: 'var(--color-text-secondary)'
                            }}>
                                {variable.name}
                            </label>

                            {variable.type === 'int' || variable.type === 'float' ? (
                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                    <input
                                        type="range"
                                        min={variable.min ?? 0}
                                        max={variable.max ?? 100}
                                        step={variable.type === 'float' ? 0.1 : 1}
                                        value={variable.value}
                                        onChange={(e) => onUpdate(variable.name, Number(e.target.value))}
                                        style={{ flex: 1 }}
                                    />
                                    <input
                                        type="number"
                                        value={variable.value}
                                        onChange={(e) => onUpdate(variable.name, Number(e.target.value))}
                                        style={{
                                            width: '60px',
                                            padding: '4px',
                                            backgroundColor: 'var(--color-bg-tertiary)',
                                            border: '1px solid var(--color-border)',
                                            color: 'var(--color-text-primary)',
                                            borderRadius: 'var(--radius-sm)'
                                        }}
                                    />
                                </div>
                            ) : variable.type === 'bool' ? (
                                <input
                                    type="checkbox"
                                    checked={variable.value}
                                    onChange={(e) => onUpdate(variable.name, e.target.checked)}
                                    style={{ width: '20px', height: '20px' }}
                                />
                            ) : variable.type === 'enum' && variable.options ? (
                                <select
                                    value={variable.value}
                                    onChange={(e) => onUpdate(variable.name, e.target.value)}
                                    style={{
                                        width: '100%',
                                        padding: '8px',
                                        backgroundColor: 'var(--color-bg-tertiary)',
                                        border: '1px solid var(--color-border)',
                                        color: 'var(--color-text-primary)',
                                        borderRadius: 'var(--radius-sm)'
                                    }}
                                >
                                    {variable.options.map(opt => (
                                        <option key={opt} value={opt}>{opt}</option>
                                    ))}
                                </select>
                            ) : (
                                <input
                                    type="text"
                                    value={variable.value}
                                    onChange={(e) => onUpdate(variable.name, e.target.value)}
                                    style={{
                                        width: '100%',
                                        padding: '8px',
                                        backgroundColor: 'var(--color-bg-tertiary)',
                                        border: '1px solid var(--color-border)',
                                        color: 'var(--color-text-primary)',
                                        borderRadius: 'var(--radius-sm)'
                                    }}
                                />
                            )}
                        </div>
                    ))}
                </div>
            )}

            <div style={{ marginTop: '40px', paddingTop: '20px', borderTop: '1px solid var(--color-border)' }}>
                <h3 style={{ fontSize: '18px', marginBottom: '16px', fontWeight: 600 }}>Concepts</h3>

                <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                    <input
                        type="text"
                        placeholder="New Concept Name"
                        value={newConceptName}
                        onChange={(e) => setNewConceptName(e.target.value)}
                        style={{
                            flex: 1,
                            padding: '8px',
                            backgroundColor: 'var(--color-bg-tertiary)',
                            border: '1px solid var(--color-border)',
                            color: 'var(--color-text-primary)',
                            borderRadius: 'var(--radius-sm)'
                        }}
                    />
                    <button
                        onClick={() => {
                            if (newConceptName && onSaveConcept) {
                                onSaveConcept(newConceptName);
                                setNewConceptName('');
                            }
                        }}
                        disabled={!newConceptName}
                        style={{
                            padding: '8px 12px',
                            backgroundColor: 'var(--color-accent)',
                            color: 'white',
                            border: 'none',
                            borderRadius: 'var(--radius-sm)',
                            cursor: 'pointer',
                            opacity: newConceptName ? 1 : 0.5
                        }}
                    >
                        Save
                    </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {concepts.map(concept => (
                        <div
                            key={concept.id}
                            style={{
                                padding: '10px',
                                backgroundColor: 'var(--color-bg-tertiary)',
                                borderRadius: 'var(--radius-sm)',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center'
                            }}
                        >
                            <span style={{ fontSize: '14px' }}>{concept.name}</span>
                            <button
                                onClick={() => onLoadConcept?.(concept)}
                                style={{
                                    padding: '4px 8px',
                                    backgroundColor: 'transparent',
                                    border: '1px solid var(--color-border)',
                                    color: 'var(--color-text-secondary)',
                                    borderRadius: 'var(--radius-sm)',
                                    cursor: 'pointer',
                                    fontSize: '12px'
                                }}
                            >
                                Load
                            </button>
                        </div>
                    ))}
                    {concepts.length === 0 && (
                        <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>No concepts saved yet.</p>
                    )}
                </div>
            </div>
        </div>
    );
};
