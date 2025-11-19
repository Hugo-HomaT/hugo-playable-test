export interface Project {
    id: string;
    name: string;
    thumbnailUrl?: string;
    lastModified: number;
    buildUrl: string; // URL to the uploaded build (blob or hosted)
    variables: Variable[];
}

export type VariableType = 'int' | 'float' | 'bool' | 'enum' | 'string';

export interface Variable {
    name: string;
    type: VariableType;
    defaultValue: any;
    value: any;
    min?: number;
    max?: number;
    options?: string[]; // For enums
}

export interface Concept {
    id: string;
    projectId: string;
    name: string;
    values: Record<string, any>; // Map variable name to value
}
