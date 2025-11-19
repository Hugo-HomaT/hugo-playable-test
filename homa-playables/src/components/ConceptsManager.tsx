import React, { useState } from 'react';
import type { Concept } from '../types';

interface ConceptsManagerProps {
    concepts: Concept[];
    currentConceptId?: string;
    onSaveConcept: (name: string) => void;
    onUpdateConcept: (id: string) => void;
    onLoadConcept: (concept: Concept) => void;
    onDeleteConcept: (id: string) => void;
}

export const ConceptsManager: React.FC<ConceptsManagerProps> = ({
    concepts,
    currentConceptId,
    onSaveConcept,
    onUpdateConcept,
    onLoadConcept,
    onDeleteConcept
}) => {
    const [newConceptName, setNewConceptName] = useState('');
    const [isCreating, setIsCreating] = useState(false);

    const handleCreate = () => {
        if (newConceptName.trim()) {
            onSaveConcept(newConceptName.trim());
            setNewConceptName('');
            setIsCreating(false);
        }
    };

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            backgroundColor: 'var(--color-bg-secondary)',
            borderLeft: '1px solid var(--color-border)'
        }}>
            <div style={{
                padding: '16px',
                borderBottom: '1px solid var(--color-border)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
            }}>
                <h3 style={{ fontSize: '16px', fontWeight: 600, margin: 0 }}>Concepts</h3>
                <button
                    onClick={() => setIsCreating(true)}
                    style={{
                        background: 'var(--color-accent)',
                        color: 'white',
                        border: 'none',
                        borderRadius: 'var(--radius-sm)',
                        padding: '6px 12px',
                        fontSize: '12px',
                        fontWeight: 500,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                    }}
                >
                    <span>+</span> New
                </button>
            </div>

            {isCreating && (
                <div style={{ padding: '12px', backgroundColor: 'var(--color-bg-tertiary)', borderBottom: '1px solid var(--color-border)' }}>
                    <input
                        type="text"
                        placeholder="Concept Name"
                        value={newConceptName}
                        onChange={(e) => setNewConceptName(e.target.value)}
                        autoFocus
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') handleCreate();
                            if (e.key === 'Escape') setIsCreating(false);
                        }}
                        style={{
                            width: '100%',
                            padding: '8px',
                            marginBottom: '8px',
                            borderRadius: 'var(--radius-sm)',
                            border: '1px solid var(--color-border)',
                            backgroundColor: 'var(--color-bg-primary)',
                            color: 'var(--color-text-primary)',
                            fontSize: '13px'
                        }}
                    />
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                        <button
                            onClick={() => setIsCreating(false)}
                            style={{
                                padding: '4px 12px',
                                background: 'transparent',
                                border: '1px solid var(--color-border)',
                                color: 'var(--color-text-secondary)',
                                borderRadius: 'var(--radius-sm)',
                                cursor: 'pointer',
                                fontSize: '12px'
                            }}
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleCreate}
                            disabled={!newConceptName.trim()}
                            style={{
                                padding: '4px 12px',
                                background: 'var(--color-accent)',
                                border: 'none',
                                color: 'white',
                                borderRadius: 'var(--radius-sm)',
                                cursor: 'pointer',
                                fontSize: '12px',
                                opacity: newConceptName.trim() ? 1 : 0.5
                            }}
                        >
                            Save
                        </button>
                    </div>
                </div>
            )}

            <div style={{ flex: 1, overflowY: 'auto', padding: '12px' }}>
                {concepts.length === 0 ? (
                    <div style={{
                        textAlign: 'center',
                        padding: '32px 16px',
                        color: 'var(--color-text-secondary)',
                        fontSize: '13px'
                    }}>
                        <p style={{ marginBottom: '8px' }}>No concepts yet.</p>
                        <p style={{ fontSize: '12px', opacity: 0.7 }}>Create a concept to save the current variable configuration.</p>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {concepts.map(concept => (
                            <div
                                key={concept.id}
                                style={{
                                    padding: '12px',
                                    backgroundColor: currentConceptId === concept.id ? 'rgba(255, 145, 250, 0.1)' : 'var(--color-bg-tertiary)',
                                    border: `1px solid ${currentConceptId === concept.id ? 'var(--color-accent)' : 'var(--color-border)'}`,
                                    borderRadius: 'var(--radius-sm)',
                                    transition: 'all 0.2s ease'
                                }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                                    <span style={{
                                        fontWeight: 600,
                                        fontSize: '14px',
                                        color: currentConceptId === concept.id ? 'var(--color-accent)' : 'var(--color-text-primary)'
                                    }}>
                                        {concept.name}
                                    </span>
                                    <div style={{ display: 'flex', gap: '4px' }}>
                                        <button
                                            onClick={() => onLoadConcept(concept)}
                                            title="Load Concept"
                                            style={{
                                                padding: '4px 8px',
                                                background: 'transparent',
                                                border: '1px solid var(--color-border)',
                                                color: 'var(--color-text-primary)',
                                                borderRadius: 'var(--radius-sm)',
                                                cursor: 'pointer',
                                                fontSize: '11px'
                                            }}
                                        >
                                            Load
                                        </button>
                                        <button
                                            onClick={() => onDeleteConcept(concept.id)}
                                            title="Delete Concept"
                                            style={{
                                                padding: '4px 8px',
                                                background: 'transparent',
                                                border: '1px solid var(--color-border)',
                                                color: '#ef4444',
                                                borderRadius: 'var(--radius-sm)',
                                                cursor: 'pointer',
                                                fontSize: '11px'
                                            }}
                                        >
                                            ×
                                        </button>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', color: 'var(--color-text-secondary)' }}>
                                    <span>{Object.keys(concept.values).length} variables</span>
                                    <button
                                        onClick={() => onUpdateConcept(concept.id)}
                                        style={{
                                            background: 'none',
                                            border: 'none',
                                            color: 'var(--color-accent)',
                                            cursor: 'pointer',
                                            padding: 0,
                                            fontSize: '11px',
                                            textDecoration: 'underline'
                                        }}
                                    >
                                        Update with current values
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};
