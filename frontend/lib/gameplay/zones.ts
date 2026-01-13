/**
 * Zone Configuration for FishIT Gameplay
 * Defines visual layers and colors for each fishing zone
 */

export interface ZoneAssets {
    background: string | null;  // Mountains/rocks layer (nullable for open ocean)
    foreground: string | null;  // Trees/plants frame overlay (nullable)
    clouds: string;             // Cloud texture key
    ripples: string;            // Water ripple texture key
    sunRays: boolean;           // Enable sun ray overlay effect
}

export interface ZoneColors {
    sky: [number, number];      // [Top gradient hex, Bottom gradient hex]
    water: [number, number];    // [Surface color hex, Deep color hex]
}

export interface ZoneConfig {
    id: string;
    name: string;
    description: string;
    assets: ZoneAssets;
    colors: ZoneColors;
}

// Legacy interface for backward compatibility
export interface Zone {
    id: string;
    name: string;
    background: string;
    description: string;
}

/**
 * Zone Configurations
 * Each zone has unique visual layers rendered using sandwich layering technique
 * 
 * Asset paths reference files in /public/zone/ folder
 */
export const ZONES: Record<string, ZoneConfig> = {
    'shallow-waters': {
        id: 'shallow-waters',
        name: 'Shallow Waters',
        description: 'The ocean calls. Are you ready to cast your line?',
        assets: {
            background: 'mountains_shallow',
            foreground: null,
            clouds: 'cloud_fluffy',
            ripples: 'water_ripples',
            sunRays: true
        },
        colors: {
            sky: [0x4FD3FF, 0x87CEEB],          // Bright cyan to sky blue
            water: [0x00B4D8, 0x005099]         // Vivid cyan to deep blue (high contrast)
        }
    },
    'reef-zone': {
        id: 'reef-zone',
        name: 'Reef Zone',
        description: 'Balanced drop rates. Essential for upgrades.',
        assets: {
            background: null,
            foreground: null,
            clouds: 'cloud_fluffy',
            ripples: 'water_ripples',
            sunRays: false
        },
        colors: {
            sky: [0x0F0C29, 0x302B63],          // Deep purple night sky
            water: [0x1E3A8A, 0x020617]         // Navy to almost black (high contrast)
        }
    },
    'deep-sea': {
        id: 'deep-sea',
        name: 'Deep Sea',
        description: 'Home of the Whales. Increased Epic chance.',
        assets: {
            background: 'rocks_deep',
            foreground: 'palm_trees',
            clouds: 'cloud_fluffy',
            ripples: 'water_ripples',
            sunRays: false
        },
        colors: {
            sky: [0x1A2E35, 0x3A6073],          // Teal twilight (brighter bottom)
            water: [0x0F4C5C, 0x020617]         // Teal surface to black depths
        }
    },
    'abyssal-trench': {
        id: 'abyssal-trench',
        name: 'Abyssal Trench',
        description: 'The only source of Legendary Fish.',
        assets: {
            background: 'mountains_abyssal',
            foreground: null,
            clouds: 'cloud_fluffy',
            ripples: 'water_ripples',
            sunRays: false
        },
        colors: {
            sky: [0x2C3E50, 0x4CA1AF],          // Slate to teal gradient
            water: [0x0D1B2A, 0x010409]         // Dark navy to pure black
        }
    }
};

/**
 * Helper function to get zone by ID
 */
export function getZoneById(zoneId: string): ZoneConfig | undefined {
    return ZONES[zoneId];
}

/**
 * Get all zone IDs for static params generation
 */
export function getAllZoneIds(): string[] {
    return Object.keys(ZONES);
}
