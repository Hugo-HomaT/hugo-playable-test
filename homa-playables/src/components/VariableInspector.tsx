import React, { useState, useMemo } from 'react';
import type { Variable } from '../types';
import { Upload, FileAudio, Image as ImageIcon, Video } from 'lucide-react';

interface VariableInspectorProps {
    variables: Variable[];
    onUpdate: (name: string, value: any) => void;
    onResetVariable?: (name: string) => void;
    onResetSection?: (section: string) => void;
    onResetAll?: () => void;
    onReload?: () => void;
    onAssetSelect?: (variableName: string, assetType: string) => void;
}

export const VariableInspector: React.FC<VariableInspectorProps> = ({
    variables,
    onUpdate,
    onResetVariable,
    onResetSection,
    onResetAll,
    onReload,
    onAssetSelect
}) => {
    const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});

    // Group and sort variables
    const groupedVariables = useMemo(() => {
        const groups: Record<string, Variable[]> = {};

        // Sort by order first
        const sorted = [...variables].sort((a, b) => (a.order || 0) - (b.order || 0));

        sorted.forEach(v => {
            const section = v.section || 'Default';
            if (!groups[section]) groups[section] = [];
            groups[section].push(v);
        });

        // Sort sections (Default first, then alphabetical)
        return Object.entries(groups).sort(([a], [b]) => {
            if (a === 'Default') return -1;
            if (b === 'Default') return 1;
            return a.localeCompare(b);
        });
    }, [variables]);

    const toggleSection = (section: string) => {
        setExpandedSections(prev => ({
            ...prev,
            [section]: !prev[section]
        }));
    };

    // Initialize expanded state for all sections
    React.useEffect(() => {
        const initial: Record<string, boolean> = {};
        groupedVariables.forEach(([section]) => {
            initial[section] = true;
        });
        setExpandedSections(prev => ({ ...initial, ...prev }));
    }, [groupedVariables.length]); // Re-run only if number of groups changes roughly

    const renderInput = (variable: Variable) => {
        // Handle Asset Types
        if (variable.type.startsWith('Asset:')) {
            const assetType = variable.type.split(':')[1];
            const hasValue = variable.value && variable.value !== 'Reference' && variable.value !== '';

            return (
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', width: '100%' }}>
                    <button
                        onClick={() => onAssetSelect && onAssetSelect(variable.name, assetType)}
                        style={{
                            flex: 1,
                            padding: '8px',
                            backgroundColor: 'var(--color-bg-tertiary)',
                            border: '1px solid var(--color-border)',
                            borderRadius: 'var(--radius-sm)',
                            color: 'var(--color-text-primary)',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            fontSize: '13px',
                            textAlign: 'left',
                            overflow: 'hidden'
                        }}
                    >
                        {hasValue ? (
                            <>
                                {assetType === 'AudioClip' ? <FileAudio size={14} /> :
                                    assetType === 'Texture2D' || assetType === 'Sprite' ? <ImageIcon size={14} /> :
                                        assetType === 'VideoClip' ? <Video size={14} /> : <Upload size={14} />}
                                <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {variable.value.split('/').pop()}
                                </span>
                            </>
                        ) : (
                            <>
                                <Upload size={14} color="var(--color-text-secondary)" />
                                <span style={{ color: 'var(--color-text-secondary)' }}>Choose File...</span>
                            </>
                        )}
                    </button>
                </div>
            );
        }

        const input = (() => {
            switch (variable.type) {
                case 'int':
                case 'float':
                    // Only show slider if a valid range is defined (min != max)
                    const hasRange = variable.min !== undefined && variable.max !== undefined && variable.min !== variable.max;

                    return (
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flex: 1 }}>
                            {hasRange && (
                                <input
                                    type="range"
                                    min={variable.min}
                                    max={variable.max}
                                    step={variable.step || (variable.type === 'float' ? 0.1 : 1)}
                                    value={variable.value}
                                    onChange={(e) => onUpdate(variable.name, Number(e.target.value))}
                                    style={{ flex: 1, accentColor: 'var(--color-accent)' }}
                                />
                            )}
                            <input
                                type="number"
                                value={variable.value}
                                onChange={(e) => onUpdate(variable.name, Number(e.target.value))}
                                style={{
                                    width: hasRange ? '60px' : '100%',
                                    padding: '4px',
                                    backgroundColor: 'var(--color-bg-tertiary)',
                                    border: '1px solid var(--color-border)',
                                    color: 'var(--color-text-primary)',
                                    borderRadius: 'var(--radius-sm)',
                                    fontSize: '12px'
                                }}
                            />
                        </div>
                    );
                case 'bool':
                    return (
                        <div style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                            <label style={{
                                position: 'relative',
                                display: 'inline-block',
                                width: '40px',
                                height: '20px',
                                marginRight: '8px'
                            }}>
                                <input
                                    type="checkbox"
                                    checked={variable.value}
                                    onChange={(e) => onUpdate(variable.name, e.target.checked)}
                                    style={{ opacity: 0, width: 0, height: 0 }}
                                />
                                <span style={{
                                    position: 'absolute',
                                    cursor: 'pointer',
                                    top: 0, left: 0, right: 0, bottom: 0,
                                    backgroundColor: variable.value ? 'var(--color-accent)' : '#ccc',
                                    transition: '.4s',
                                    borderRadius: '34px'
                                }}>
                                    <span style={{
                                        position: 'absolute',
                                        content: '""',
                                        height: '16px',
                                        width: '16px',
                                        left: variable.value ? '22px' : '2px',
                                        bottom: '2px',
                                        backgroundColor: 'white',
                                        transition: '.4s',
                                        borderRadius: '50%'
                                    }} />
                                </span>
                            </label>
                            <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                                {variable.value ? 'On' : 'Off'}
                            </span>
                        </div>
                    );
                case 'enum':
                    return (
                        <select
                            value={variable.value}
                            onChange={(e) => onUpdate(variable.name, e.target.value)}
                            style={{
                                width: '100%',
                                padding: '6px',
                                backgroundColor: 'var(--color-bg-tertiary)',
                                border: '1px solid var(--color-border)',
                                color: 'var(--color-text-primary)',
                                borderRadius: 'var(--radius-sm)',
                                fontSize: '13px'
                            }}
                        >
                            {variable.options?.map(opt => (
                                <option key={opt} value={opt}>{opt}</option>
                            ))}
                        </select>
                    );
                case 'vector3':
                    let vec = { x: 0, y: 0, z: 0 };
                    try {
                        vec = typeof variable.value === 'string' ? JSON.parse(variable.value) : variable.value;
                    } catch (e) { /* ignore */ }

                    const updateVec = (axis: 'x' | 'y' | 'z', val: number) => {
                        const newVec = { ...vec, [axis]: val };
                        onUpdate(variable.name, newVec);
                    };

                    return (
                        <div style={{ display: 'flex', gap: '4px', flex: 1 }}>
                            {['x', 'y', 'z'].map(axis => (
                                <div key={axis} style={{ flex: 1, display: 'flex', alignItems: 'center', backgroundColor: 'var(--color-bg-tertiary)', borderRadius: 'var(--radius-sm)', padding: '2px 4px' }}>
                                    <span style={{
                                        color: axis === 'x' ? '#ff4d4d' : axis === 'y' ? '#4dff4d' : '#4d4dff',
                                        fontSize: '10px',
                                        fontWeight: 'bold',
                                        marginRight: '4px',
                                        textTransform: 'uppercase'
                                    }}>{axis}</span>
                                    <input
                                        type="number"
                                        value={vec[axis as keyof typeof vec]}
                                        onChange={(e) => updateVec(axis as 'x' | 'y' | 'z', Number(e.target.value))}
                                        style={{
                                            width: '100%',
                                            background: 'transparent',
                                            border: 'none',
                                            color: 'var(--color-text-primary)',
                                            fontSize: '12px',
                                            padding: 0
                                        }}
                                    />
                                </div>
                            ))}
                        </div>
                    );
                case 'color':
                    return (
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flex: 1 }}>
                            <input
                                type="color"
                                value={variable.value.substring(0, 7)}
                                onChange={(e) => onUpdate(variable.name, e.target.value + 'FF')}
                                style={{
                                    width: '30px',
                                    height: '30px',
                                    padding: 0,
                                    border: 'none',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                    backgroundColor: 'transparent'
                                }}
                            />
                            <input
                                type="text"
                                value={variable.value}
                                onChange={(e) => onUpdate(variable.name, e.target.value)}
                                style={{
                                    flex: 1,
                                    padding: '6px',
                                    backgroundColor: 'var(--color-bg-tertiary)',
                                    border: '1px solid var(--color-border)',
                                    color: 'var(--color-text-primary)',
                                    borderRadius: 'var(--radius-sm)',
                                    fontSize: '12px',
                                    fontFamily: 'monospace'
                                }}
                            />
                        </div>
                    );
                default:
                    return (
                        <input
                            type="text"
                            value={variable.value}
                            onChange={(e) => onUpdate(variable.name, e.target.value)}
                            style={{
                                width: '100%',
                                padding: '6px',
                                backgroundColor: 'var(--color-bg-tertiary)',
                                border: '1px solid var(--color-border)',
                                color: 'var(--color-text-primary)',
                                borderRadius: 'var(--radius-sm)',
                                fontSize: '13px'
                            }}
                        />
                    );
            }
        })();

        return (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ flex: 1 }}>{input}</div>
                {onResetVariable && (
                    <button
                        onClick={() => onResetVariable(variable.name)}
                        title="Reset to default"
                        style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            color: 'var(--color-text-secondary)',
                            padding: '4px',
                            opacity: 0.5,
                            transition: 'opacity 0.2s',
                            fontSize: '14px'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
                        onMouseLeave={(e) => e.currentTarget.style.opacity = '0.5'}
                    >
                        ↺
                    </button>
                )}
            </div>
        );
    };

    return (
        <div style={{
            padding: '0',
            backgroundColor: 'var(--color-bg-secondary)',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            borderLeft: '1px solid var(--color-border)'
        }}>
            <div style={{ padding: '16px', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 600, margin: 0 }}>Settings</h3>
                <div style={{ display: 'flex', gap: '8px' }}>
                    {onReload && (
                        <button
                            onClick={onReload}
                            title="Reload Preview"
                            style={{
                                background: 'none',
                                border: '1px solid var(--color-border)',
                                borderRadius: 'var(--radius-sm)',
                                cursor: 'pointer',
                                color: 'var(--color-text-secondary)',
                                padding: '4px 8px',
                                fontSize: '12px'
                            }}
                        >
                            Reload
                        </button>
                    )}
                    {onResetAll && (
                        <button
                            onClick={onResetAll}
                            title="Reset All Variables"
                            style={{
                                background: 'none',
                                border: '1px solid var(--color-border)',
                                borderRadius: 'var(--radius-sm)',
                                cursor: 'pointer',
                                color: 'var(--color-text-secondary)',
                                padding: '4px 8px',
                                fontSize: '12px'
                            }}
                        >
                            Reset All
                        </button>
                    )}
                </div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
                {variables.length === 0 ? (
                    <p style={{ color: 'var(--color-text-secondary)', fontSize: '14px' }}>
                        No variables exposed in this build.
                    </p>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        {groupedVariables.map(([section, vars]) => (
                            <div key={section} style={{
                                border: '1px solid var(--color-border)',
                                borderRadius: 'var(--radius-sm)',
                                overflow: 'hidden'
                            }}>
                                <div
                                    style={{
                                        padding: '8px 12px',
                                        backgroundColor: 'var(--color-bg-tertiary)',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        userSelect: 'none'
                                    }}
                                >
                                    <div
                                        onClick={() => toggleSection(section)}
                                        style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', flex: 1 }}
                                    >
                                        <span style={{ fontSize: '13px', fontWeight: 600 }}>{section}</span>
                                        <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                                            {expandedSections[section] ? '▼' : '▶'}
                                        </span>
                                    </div>
                                    {onResetSection && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onResetSection(section);
                                            }}
                                            title="Reset Section"
                                            style={{
                                                background: 'none',
                                                border: 'none',
                                                cursor: 'pointer',
                                                color: 'var(--color-text-secondary)',
                                                padding: '2px 6px',
                                                fontSize: '12px',
                                                opacity: 0.7
                                            }}
                                        >
                                            ↺
                                        </button>
                                    )}
                                </div>

                                {expandedSections[section] && (
                                    <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                        {vars.map(variable => (
                                            <div key={variable.name}>
                                                <label style={{
                                                    display: 'block',
                                                    marginBottom: '6px',
                                                    fontSize: '12px',
                                                    color: 'var(--color-text-secondary)',
                                                    fontWeight: 500
                                                }}>
                                                    {variable.name}
                                                </label>
                                                {renderInput(variable)}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};
