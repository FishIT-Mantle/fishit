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
            background: 'mountains_shallow',    // loads /zone/mountains_shallow.webp
            foreground: null,
            clouds: 'cloud_fluffy',             // loads /zone/cloud_fluffy.webp
            ripples: 'water_ripples',           // loads /zone/water_ripples.webp
            sunRays: true
        },
        colors: {
            sky: [0x0099FF, 0xA6E4FF],          // Bright blue sky
            water: [0x00C2FF, 0x00589F]         // Cyan to deep blue
        }
    },
    'reef-zone': {
        id: 'reef-zone',
        name: 'Reef Zone',
        description: 'Balanced drop rates. Essential for upgrades.',
        assets: {
            background: null,                   // Open ocean - no background
            foreground: null,
            clouds: 'cloud_fluffy',
            ripples: 'water_ripples',
            sunRays: false
        },
        colors: {
            sky: [0x0B1026, 0x2B3266],          // Dark purple night sky
            water: [0x1E3A8A, 0x0F172A]         // Deep ocean blue
        }
    },
    'deep-sea': {
        id: 'deep-sea',
        name: 'Deep Sea',
        description: 'Home of the Whales. Increased Epic chance.',
        assets: {
            background: 'rocks_deep',           // loads /zone/rocks_deep.webp
            foreground: 'palm_trees',           // loads /zone/palm_trees.webp (frame)
            clouds: 'cloud_fluffy',
            ripples: 'water_ripples',
            sunRays: false
        },
        colors: {
            sky: [0x1A2E35, 0x2C5F66],          // Teal twilight
            water: [0x0F282F, 0x06181C]         // Dark teal depths
        }
    },
    'abyssal-trench': {
        id: 'abyssal-trench',
        name: 'Abyssal Trench',
        description: 'The only source of Legendary Fish.',
        assets: {
            background: 'mountains_abyssal',    // loads /zone/mountains_abyssal.webp
            foreground: null,
            clouds: 'cloud_fluffy',
            ripples: 'water_ripples',
            sunRays: false
        },
        colors: {
            sky: [0x2C3E50, 0x4CA1AF],          // Slate to teal gradient
            water: [0x141E30, 0x243B55]         // Near-black ocean
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
