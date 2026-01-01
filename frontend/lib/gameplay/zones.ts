export interface Zone {
    id: string;
    name: string;
    background: string;
    description: string;
}

export const ZONES: Record<string, Zone> = {
    'shallow-waters': {
        id: 'shallow-waters',
        name: 'Shallow Waters',
        background: '/gameplay/shallow-water.webp',
        description: 'The ocean calls. Are you ready to cast your line?',
    },
    'reef-zone': {
        id: 'reef-zone',
        name: 'Reef Zone',
        background: '/gameplay/reef-zone.webp',
        description: 'Balanced drop rates. Essential for upgrades.',
    },
    'deep-sea': {
        id: 'deep-sea',
        name: 'Deep Sea',
        background: '/gameplay/deep-sea.webp',
        description: 'Home of the Whales. Increased Epic chance.',
    },
    'abyssal-trench': {
        id: 'abyssal-trench',
        name: 'Abyssal Trench',
        background: '/gameplay/abyssal-trench.webp',
        description: 'The only source of Legendary Fish.',
    },
};
