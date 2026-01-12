export type GamePhase = 'IDLE' | 'CASTING' | 'WAITING' | 'STRIKE' | 'REELING' | 'CAUGHT' | 'FAILED';

export interface FishType {
    name: string;
    rarity: 'Common' | 'Uncommon' | 'Rare' | 'Epic' | 'Legendary';
    weight?: number;
    // Gameplay stats
    speedConfig: [number, number]; // Min/Max speed
    aggression: number; // 0-1, how often it dashes
}

export const GAME_CONFIG = {
    // --- POSITIONING & SCALE ---
    BOAT: {
        SCALE: 0.55,
        Y_OFFSET: +30,
        BOB_Y: 4,
        BOB_DURATION: 2500
    },
    ROD: {
        HEIGHT_RATIO: 0.45,
        X_OFFSET: 50, // from center
        Y_OFFSET: -80, // from bottom
        ANGLE: -0.15,
        SWAY_ANGLE: -0.08,
        SWAY_DURATION: 2000
    },

    // --- SHAKE MECHANIC (WAITING) ---
    SHAKE: {
        THRESHOLD: 150, // Mouse movement delta to trigger update
        DECAY: 0.95, // Visual intensity decay
        MAX_INTENSITY: 1.5,
        RIPPLE_COLOR: 0x4F46E5, // Indigo ripple
        BUTTON_COLOR: 0xFFFFFF,
        BUTTON_ALPHA_IDLE: 0.1,
        BUTTON_ALPHA_ACTIVE: 0.8
    },

    // --- REELING MECHANIC (PHYSICS) ---
    REEL: {
        BAR_WIDTH: 300,
        BAR_HEIGHT: 30,
        INERTIA: 0.1, // Lower = heavier/slower (0.0 - 1.0)
        TENSION_GAIN: 0.05, // Progress per frame
        TENSION_LOSS: 0.03, // Loss per frame
        WIN_THRESHOLD: 100
    },

    // --- VISUALS ---
    COLORS: {
        TENSION_SAFE: 0x00FF00, // Green
        TENSION_WARN: 0xFFA500, // Orange
        TENSION_CRIT: 0xFF0000, // Red
        WATER_ZONE_START: 0.50, // 50% height
        WATER_ZONE_END: 0.75    // 75% height
    }
};

export const FISH_DATA: FishType[] = [
    { name: 'Common Trout', rarity: 'Common', speedConfig: [1.5, 3], aggression: 0.1 },
    { name: 'Silver Bass', rarity: 'Uncommon', speedConfig: [2, 4], aggression: 0.3 },
    { name: 'Golden Carp', rarity: 'Rare', speedConfig: [2.5, 5], aggression: 0.5 },
    { name: 'Crystal Swordfish', rarity: 'Epic', speedConfig: [3, 7], aggression: 0.8 }
];
