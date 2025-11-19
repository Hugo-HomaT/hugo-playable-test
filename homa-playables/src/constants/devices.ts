export interface SafeArea {
    top: number;
    bottom: number;
    left: number;
    right: number;
}

export interface Device {
    id: string;
    name: string;
    width: number;
    height: number;
    pixelRatio: number;
    safeArea: SafeArea;
    notch?: {
        width: number;
        height: number;
        radius: number;
        top: number; // Distance from top
    };
    frameColor: string;
    screenRadius: number;
}

export const DEVICES: Device[] = [
    {
        id: 'iphone-14-pro',
        name: 'iPhone 14 Pro',
        width: 393,
        height: 852,
        pixelRatio: 3,
        safeArea: { top: 59, bottom: 34, left: 0, right: 0 },
        notch: { width: 126, height: 37, radius: 18, top: 11 }, // Dynamic Island
        frameColor: '#1c1c1e',
        screenRadius: 55
    },
    {
        id: 'iphone-se-3',
        name: 'iPhone SE (3rd Gen)',
        width: 375,
        height: 667,
        pixelRatio: 2,
        safeArea: { top: 20, bottom: 0, left: 0, right: 0 },
        // No notch, but big bezels handled by frame styling in component
        frameColor: '#1c1c1e',
        screenRadius: 0
    },
    {
        id: 'samsung-s23',
        name: 'Samsung Galaxy S23',
        width: 360,
        height: 780,
        pixelRatio: 3,
        safeArea: { top: 35, bottom: 15, left: 0, right: 0 },
        notch: { width: 20, height: 20, radius: 10, top: 12 }, // Punch hole
        frameColor: '#1c1c1e',
        screenRadius: 24
    },
    {
        id: 'ipad-pro-11',
        name: 'iPad Pro 11"',
        width: 834,
        height: 1194,
        pixelRatio: 2,
        safeArea: { top: 24, bottom: 20, left: 0, right: 0 },
        frameColor: '#1c1c1e',
        screenRadius: 18
    },
    {
        id: 'generic-android',
        name: 'Generic Android',
        width: 360,
        height: 800,
        pixelRatio: 2,
        safeArea: { top: 24, bottom: 0, left: 0, right: 0 },
        frameColor: '#1c1c1e',
        screenRadius: 0
    }
];
