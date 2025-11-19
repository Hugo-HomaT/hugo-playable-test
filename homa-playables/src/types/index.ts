export interface Project {
    id: string;
    name: string;
    thumbnailUrl?: string;
    lastModified: number;
    buildUrl: string; // URL to the uploaded build (blob or hosted)
    variables: Variable[];
    concepts: Concept[]; // Persisted concepts
}

export type VariableType = 'int' | 'float' | 'bool' | 'enum' | 'string' | 'vector3' | 'color';

export interface Variable {
    name: string;
    type: VariableType;
    defaultValue: any;
    value: any;
    min?: number;
    max?: number;
    step?: number;
    options?: string[]; // For enums
    section?: string; // Grouping
    order?: number; // Sorting order
}

export interface Concept {
    id: string;
    projectId: string;
    name: string;
    description?: string;
    createdAt: number;
    updatedAt: number;
    values: Record<string, any>; // Map variable name to value
}
