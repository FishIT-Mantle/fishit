import Phaser from 'phaser';

// Define Game Phase type
export type GamePhase = 'IDLE' | 'CASTING' | 'WAITING' | 'STRIKE' | 'REELING' | 'CAUGHT' | 'FAILED';

// Import new modular logic
import { GAME_CONFIG, FISH_DATA } from '../gameplay/phaser/data';
import { WaitingManager } from '../gameplay/phaser/WaitingManager';
import { ReelingManager } from '../gameplay/phaser/ReelingManager';

export interface MainSceneConfig {
    backgroundUrl?: string; // Optional custom background
    boatUrl?: string;
    rodUrl?: string;
    onPhaseChange?: (phase: GamePhase) => void;
    onCatchSuccess?: (fishData: { name: string; rarity: string }) => void;
    onCatchFail?: () => void;
}

export class MainScene extends Phaser.Scene {
    private config: MainSceneConfig = {};

    // --- ASSETS ---
    private background!: Phaser.GameObjects.Image;
    private cloudsOverlay!: Phaser.GameObjects.Graphics;
    private waterOverlay!: Phaser.GameObjects.Graphics; // For wave animation
    private boat!: Phaser.GameObjects.Image;
    private rod!: Phaser.GameObjects.Image;
    private bobber!: Phaser.GameObjects.Graphics;
    private splashEmitter!: Phaser.GameObjects.Particles.ParticleEmitter;

    // --- MANAGERS (New Architecture) ---
    private waitingManager!: WaitingManager;
    private reelingManager!: ReelingManager;

    // --- GAME STATE ---
    private currentPhase: GamePhase = 'IDLE';

    // --- LEGACY/TRANSITION VARIABLES (To be cleaned up) ---
    private strikeIndicator!: Phaser.GameObjects.Text;

    constructor() {
        super({ key: 'MainScene' });
    }

    init(config: MainSceneConfig) {
        this.config = config;
    }

    preload() {
        // Load assets from config or defaults
        this.load.image('background', this.config.backgroundUrl || '/assets/gameplay/lake-background.png');
        this.load.image('boat', this.config.boatUrl || '/assets/gameplay/boat-canoe.png');
        this.load.image('rod', this.config.rodUrl || '/assets/gameplay/fishing-rod.png');

        // Preload particles if needed
        this.load.image('sparkle', '/assets/particles/sparkle.png'); // You might need a dummy texture
    }

    create() {
        const { width, height } = this.scale;

        // --- BACKGROUND (Layer 0) ---
        this.background = this.add.image(width / 2, height / 2, 'background');
        this.background.setDisplaySize(width, height);
        this.background.setDepth(0);

        // --- CLOUDS OVERLAY (Layer 0.5 - subtle parallax effect) ---
        this.createCloudsOverlay();

        // --- WATER SHIMMER EFFECT (Layer 1 - visible wave animation) ---
        this.createWaterShimmer();

        // --- BOAT (Layer 2 - Canoe view, moderate size at bottom) ---
        this.boat = this.add.image(width / 2, height + GAME_CONFIG.BOAT.Y_OFFSET, 'boat');
        this.boat.setOrigin(0.5, 1);
        const boatTargetWidth = width * GAME_CONFIG.BOAT.SCALE;
        const boatScale = boatTargetWidth / this.boat.width;
        this.boat.setScale(boatScale);
        this.boat.setDepth(2);

        // --- ROD (Layer 3 - CENTERED on top of boat) ---
        const rodX = width / 2 + GAME_CONFIG.ROD.X_OFFSET;
        const rodY = height + GAME_CONFIG.ROD.Y_OFFSET;
        this.rod = this.add.image(rodX, rodY, 'rod');
        this.rod.setOrigin(0.5, 1);

        const rodTargetHeight = height * GAME_CONFIG.ROD.HEIGHT_RATIO;
        const rodScale = rodTargetHeight / this.rod.height;
        this.rod.setScale(rodScale);
        this.rod.setRotation(GAME_CONFIG.ROD.ANGLE);
        this.rod.setDepth(3);

        // --- BOBBER (Procedural) ---
        this.bobber = this.add.graphics();
        this.bobber.setDepth(4);
        this.bobber.setVisible(false);

        // --- SPLASH EFFECT ---
        // Basic particle manager replacement if texture missing, or use Graphics
        // For now, simpler splash using Graphics in update

        // --- STRIKE INDICATOR (Visual Only) ---
        this.strikeIndicator = this.add.text(width / 2, height / 2 - 100, '!', {
            fontSize: '84px',
            fontStyle: 'bold',
            color: '#FF0000',
            stroke: '#FFFFFF',
            strokeThickness: 6
        }).setOrigin(0.5).setDepth(20).setVisible(false);

        // --- ANIMATIONS ---
        this.addBoatAnimation();

        // --- INIT MANAGERS ---
        this.waitingManager = new WaitingManager(this);
        this.reelingManager = new ReelingManager(this);

        // --- START IDLE ---
        this.setPhase('IDLE');
        this.events.emit('game-ready');
    }

    private createCloudsOverlay() {
        this.cloudsOverlay = this.add.graphics();
        this.cloudsOverlay.setDepth(0.5);
    }

    private updateCloudsOverlay(time: number) {
        const { width, height } = this.scale;
        this.cloudsOverlay.clear();

        const cloudLayerY = height * 0.15;
        const cloudSpeed = time * 0.008;

        for (let i = 0; i < 5; i++) {
            const x = ((i * 250 + cloudSpeed) % (width + 300)) - 150;
            const y = cloudLayerY + Math.sin(time / 4000 + i * 2) * 10;
            const size = 80 + i * 20;

            this.cloudsOverlay.fillStyle(0xFFFFFF, 0.08 + Math.sin(time / 3000 + i) * 0.03);
            this.cloudsOverlay.fillEllipse(x, y, size * 2, size * 0.5);
            this.cloudsOverlay.fillEllipse(x + size * 0.5, y + 8, size * 1.5, size * 0.4);
        }
    }

    private createWaterShimmer() {
        this.waterOverlay = this.add.graphics();
        this.waterOverlay.setDepth(1); // Above background, below boat
    }

    private updateWaterShimmer(time: number) {
        const { width, height } = this.scale;
        const waterStartY = height * GAME_CONFIG.COLORS.WATER_ZONE_START;
        const waterEndY = height * GAME_CONFIG.COLORS.WATER_ZONE_END;

        this.waterOverlay.clear();

        for (let i = 0; i < 8; i++) {
            const baseY = waterStartY + (i / 8) * (waterEndY - waterStartY);
            const yOffset = Math.sin((time / 800) + i * 0.7) * 4;
            const lineY = baseY + yOffset;

            if (lineY < waterStartY || lineY > waterEndY) continue;

            const depthFactor = (lineY - waterStartY) / (waterEndY - waterStartY);
            const baseOpacity = 0.08 + depthFactor * 0.15;
            const opacity = baseOpacity + Math.sin(time / 600 + i * 0.4) * 0.05;

            this.waterOverlay.lineStyle(2 + depthFactor * 2, 0x87CEEB, opacity);
            this.waterOverlay.beginPath();

            for (let x = -50; x < width + 50; x += 15) {
                const waveAmplitude = 3 + depthFactor * 5;
                const waveFreq = 40 - depthFactor * 15;
                const waveY = lineY + Math.sin((x / waveFreq) + (time / 400) + i * 0.6) * waveAmplitude;
                if (x === -50) this.waterOverlay.moveTo(x, waveY);
                else this.waterOverlay.lineTo(x, waveY);
            }
            this.waterOverlay.strokePath();

            // Sparkles
            if (i % 2 === 0) {
                this.waterOverlay.lineStyle(1, 0xFFFFFF, opacity * 0.5);
                this.waterOverlay.beginPath();
                for (let x = -50; x < width + 50; x += 15) {
                    const waveY = lineY + 2 + Math.sin((x / 35) + (time / 350) + i * 0.8) * 3;
                    if (x === -50) this.waterOverlay.moveTo(x, waveY);
                    else this.waterOverlay.lineTo(x, waveY);
                }
                this.waterOverlay.strokePath();
            }
        }
    }

    private addBoatAnimation() {
        this.tweens.add({
            targets: this.boat,
            y: this.boat.y + GAME_CONFIG.BOAT.BOB_Y,
            duration: GAME_CONFIG.BOAT.BOB_DURATION,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        this.tweens.add({
            targets: this.rod,
            rotation: GAME_CONFIG.ROD.SWAY_ANGLE,
            duration: GAME_CONFIG.ROD.SWAY_DURATION,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
    }

    update(time: number, delta: number) {
        this.updateCloudsOverlay(time);
        this.updateWaterShimmer(time);

        if (this.currentPhase === 'WAITING') {
            this.waitingManager.update(time, delta);
        }

        if (this.currentPhase === 'REELING') {
            this.reelingManager.update(delta);
            this.updateReelingCheck();
        }
    }

    // --- COMPATIBILITY FIXES ---

    private playSplash(x: number, y: number) {
        const splash = this.add.circle(x, y, 5, 0xFFFFFF);
        this.tweens.add({
            targets: splash,
            scale: 4,
            alpha: 0,
            duration: 500,
            onComplete: () => splash.destroy()
        });
    }

    // --- PUBLIC METHODS (Called by React) ---

    public castLine() {
        if (this.currentPhase !== 'IDLE') return;

        this.setPhase('CASTING');

        const { width, height } = this.scale;

        // --- 1. Cast Animation ---
        this.bobber.clear();
        this.bobber.fillStyle(0xff0000, 1);
        this.bobber.fillCircle(0, 0, 8);
        this.bobber.fillStyle(0xffffff, 1);
        this.bobber.fillCircle(0, -4, 4);
        this.bobber.setVisible(true);

        const startX = this.rod.x;
        const startY = this.rod.y - this.rod.displayHeight * 0.8;
        const targetX = width / 2;
        const targetY = height * 0.65;

        this.bobber.setPosition(startX, startY);

        this.tweens.add({
            targets: this.bobber,
            x: targetX,
            y: targetY,
            duration: 800,
            ease: 'Back.easeOut',
            onComplete: () => {
                this.playSplash(targetX, targetY);
                this.time.delayedCall(500, () => {
                    this.startWaiting();
                });
            }
        });
    }

    // --- PHASE TRANSITIONS ---

    private setPhase(phase: GamePhase) {
        this.currentPhase = phase;
        this.config.onPhaseChange?.(phase);
    }

    private startWaiting() {
        this.setPhase('WAITING');

        // Start Shake Mechanic
        this.waitingManager.start(() => {
            // Optional: Auto-trigger strike if shake meter full? 
            // For now we simulate VRF returning after random time
            // Or wait for real VRF logic from backend
        });

        // SIMULATE VRF DELAY (Temporary fake "Network")
        const waitTime = Phaser.Math.Between(4000, 8000);
        this.time.delayedCall(waitTime, () => {
            this.triggerStrike();
        });
    }

    private triggerStrike() {
        this.waitingManager.stop(); // Stop shake
        this.setPhase('STRIKE');

        this.strikeIndicator.setVisible(true);
        this.strikeIndicator.setAlpha(0);
        this.tweens.add({
            targets: this.strikeIndicator,
            alpha: 1,
            scale: { from: 0.5, to: 1.2 },
            duration: 200,
            yoyo: true,
            repeat: 3,
            onComplete: () => {
                this.strikeIndicator.setVisible(false);
                // Auto transition to reeling logic for now
                // Ideally user has to Click "HOOK" here
                this.startReeling();
            }
        });
    }

    private startReeling() {
        this.setPhase('REELING');

        // Pick a fish (Simulation of VRF result)
        // In real integration, backend would pass this data
        const fish = FISH_DATA[Phaser.Math.Between(0, FISH_DATA.length - 1)];

        this.reelingManager.start(fish);
    }

    private updateReelingCheck() {
        const progress = this.reelingManager.getProgress();

        if (progress >= 100) {
            this.handleCatchSuccess();
        } else if (progress <= 0) {
            this.handleCatchFail();
        }
    }

    private handleCatchSuccess() {
        this.reelingManager.stop();
        this.setPhase('CAUGHT');

        const fish = FISH_DATA[0]; // Example

        // Visuals
        this.bobber.setVisible(false);
        this.config.onCatchSuccess?.({ name: fish.name, rarity: fish.rarity });

        // Reset
        this.time.delayedCall(3000, () => {
            this.setPhase('IDLE');
        });
    }

    private handleCatchFail() {
        this.reelingManager.stop();
        this.setPhase('FAILED');

        this.bobber.setVisible(false);
        this.config.onCatchFail?.();

        this.time.delayedCall(1000, () => this.resetGame());
    }



    private resetGame() {
        this.bobber.setVisible(false);
        this.strikeIndicator.setVisible(false);

        this.setPhase('IDLE');

        // Restart rod sway
        this.tweens.add({
            targets: this.rod,
            rotation: -0.15,
            duration: 2000,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
    }
}
