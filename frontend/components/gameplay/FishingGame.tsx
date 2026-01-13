"use client";

import { useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import Phaser from 'phaser';
import { MainScene, GamePhase } from '@/lib/phaser/MainScene';
import { ZoneConfig } from '@/lib/gameplay/zones';

export interface FishingGameHandle {
    castLine: () => void;
    lure: () => void;
}

export interface FishingGameProps {
    zone: ZoneConfig;
    boatUrl?: string;
    rodUrl?: string;
    onPhaseChange?: (phase: GamePhase) => void;
    onCatchSuccess?: (fishData: { name: string; rarity: string }) => void;
    onCatchFail?: () => void;
}

const FishingGame = forwardRef<FishingGameHandle, FishingGameProps>((props, ref) => {
    const gameContainerRef = useRef<HTMLDivElement>(null);
    const gameRef = useRef<Phaser.Game | null>(null);
    const sceneRef = useRef<MainScene | null>(null);

    const {
        zone,
        boatUrl = '/gameplay/kapal.webp',
        rodUrl = '/gameplay/pancingan.webp',
        onPhaseChange,
        onCatchSuccess,
        onCatchFail
    } = props;

    // Expose methods to parent
    useImperativeHandle(ref, () => ({
        castLine: () => {
            if (sceneRef.current) {
                sceneRef.current.castLine();
            }
        },
        lure: () => {
            if (sceneRef.current) {
                sceneRef.current.lure();
            }
        }
    }));

    useEffect(() => {
        // Prevent SSR issues
        if (typeof window === 'undefined') return;

        // Prevent double initialization (React Strict Mode)
        if (gameRef.current) return;

        // Create custom scene class with config baked in
        class ConfiguredMainScene extends MainScene {
            constructor() {
                super();
            }

            init() {
                super.init({
                    zone,
                    boatUrl,
                    rodUrl,
                    onPhaseChange,
                    onCatchSuccess,
                    onCatchFail
                });
            }
        }

        const config: Phaser.Types.Core.GameConfig = {
            type: Phaser.AUTO,
            parent: gameContainerRef.current!,
            width: window.innerWidth,
            height: window.innerHeight,
            transparent: false,
            backgroundColor: '#000000',
            physics: {
                default: 'arcade',
                arcade: {
                    gravity: { x: 0, y: 0 },
                    debug: false
                }
            },
            scale: {
                mode: Phaser.Scale.RESIZE,
                autoCenter: Phaser.Scale.CENTER_BOTH
            },
            scene: ConfiguredMainScene
        };

        // Create game instance
        gameRef.current = new Phaser.Game(config);

        // Get scene reference after game is ready
        gameRef.current.events.once('ready', () => {
            const scene = gameRef.current?.scene.getScene('MainScene') as MainScene;
            if (scene) {
                sceneRef.current = scene;
            }
        });

        // Cleanup on unmount
        return () => {
            if (gameRef.current) {
                gameRef.current.destroy(true);
                gameRef.current = null;
                sceneRef.current = null;
            }
        };
    }, [zone, boatUrl, rodUrl, onPhaseChange, onCatchSuccess, onCatchFail]);

    return (
        <div
            ref={gameContainerRef}
            className="absolute inset-0 z-0"
            style={{
                width: '100%',
                height: '100%',
                overflow: 'hidden'
            }}
        />
    );
});

FishingGame.displayName = 'FishingGame';

export default FishingGame;
