import Phaser from 'phaser';
import { ZoneConfig } from '../gameplay/zones';
import { GAME_CONFIG, FISH_DATA } from '../gameplay/phaser/data';
import { WaitingManager } from '../gameplay/phaser/WaitingManager';
import { ReelingManager } from '../gameplay/phaser/ReelingManager';

export type GamePhase = 'IDLE' | 'CASTING' | 'WAITING' | 'STRIKE' | 'REELING' | 'CAUGHT' | 'FAILED';

export interface MainSceneConfig {
    zone: ZoneConfig;
    boatUrl?: string;
    rodUrl?: string;
    onPhaseChange?: (phase: GamePhase) => void;
    onCatchSuccess?: (fishData: { name: string; rarity: string }) => void;
    onCatchFail?: () => void;
}

/**
 * MainScene - Phaser Scene with Sandwich Layering
 * 
 * Visual Approach:
 * - Shallow: Bright sky, green mountains at horizon, sun rays, no clouds
 * - Reef: Dark night sky with stars, open ocean
 * - Deep Sea: Twilight, rocks in water area, palm tree frame
 * - Abyssal: Mountains on sides, dark atmosphere
 */
export class MainScene extends Phaser.Scene {
    private config!: MainSceneConfig;
    private zone!: ZoneConfig;

    // Graphics layers
    private skyGradient!: Phaser.GameObjects.Graphics;
    private backgroundLayer!: Phaser.GameObjects.Image | null;
    private atmosphereGraphics!: Phaser.GameObjects.Graphics;
    private waterGraphics!: Phaser.GameObjects.Graphics;
    private waterSurfaceGraphics!: Phaser.GameObjects.Graphics;
    private foregroundLayer!: Phaser.GameObjects.Image | null;

    // Gameplay
    private boat!: Phaser.GameObjects.Image;
    private rod!: Phaser.GameObjects.Image;
    private bobber!: Phaser.GameObjects.Graphics;
    private fishingLine!: Phaser.GameObjects.Graphics;

    // Managers
    private waitingManager!: WaitingManager;
    private reelingManager!: ReelingManager;

    // State
    private currentPhase: GamePhase = 'IDLE';
    private strikeIndicator!: Phaser.GameObjects.Text;
    private horizonY: number = 0;

    constructor() {
        super({ key: 'MainScene' });
    }

    init(config: MainSceneConfig) {
        this.config = config;
        this.zone = config.zone;
    }

    preload() {
        const assets = this.zone.assets;

        if (assets.background) {
            this.load.image(assets.background, `/zone/${assets.background}.webp`);
        }
        if (assets.foreground) {
            this.load.image(assets.foreground, `/zone/${assets.foreground}.webp`);
        }

        this.load.image('boat', this.config.boatUrl || '/gameplay/kapal.webp');
        this.load.image('rod', this.config.rodUrl || '/gameplay/pancingan.webp');
    }

    create() {
        const { width, height } = this.scale;
        this.horizonY = height * 0.5; // 50% - horizon at middle

        // === LAYER 0: SKY ===
        this.createSky(width, height);

        // === LAYER 1: BACKGROUND (Mountains/Rocks) ===
        this.createBackground(width, height);

        // === LAYER 2: ATMOSPHERE (Stars/Clouds/Sun Rays) ===
        this.atmosphereGraphics = this.add.graphics();
        this.atmosphereGraphics.setDepth(2);

        // === LAYER 3: WATER ===
        this.waterGraphics = this.add.graphics();
        this.waterGraphics.setDepth(3);
        this.drawWater(width, height);

        // === LAYER 4: WATER SURFACE ===
        this.waterSurfaceGraphics = this.add.graphics();
        this.waterSurfaceGraphics.setDepth(4);

        // === LAYER 5: BOAT & ROD ===
        this.createBoatAndRod(width, height);

        // === LAYER 6: FOREGROUND ===
        this.createForeground(width, height);

        // === UI ===
        this.createUI(width, height);

        // === MANAGERS ===
        this.waitingManager = new WaitingManager(this);
        this.reelingManager = new ReelingManager(this);

        this.setPhase('IDLE');
        this.events.emit('game-ready');
    }

    // ==========================================
    // SKY LAYER
    // ==========================================

    private createSky(width: number, height: number) {
        const [topColor, bottomColor] = this.zone.colors.sky;

        this.skyGradient = this.add.graphics();
        this.skyGradient.setDepth(0);

        // Smooth gradient for entire sky area
        const steps = 50;
        for (let i = 0; i < steps; i++) {
            const t = i / steps;
            const y = t * this.horizonY;
            const h = this.horizonY / steps + 1;

            const color = Phaser.Display.Color.Interpolate.ColorWithColor(
                Phaser.Display.Color.ValueToColor(topColor),
                Phaser.Display.Color.ValueToColor(bottomColor),
                steps,
                i
            );
            const hexColor = Phaser.Display.Color.GetColor(color.r, color.g, color.b);

            this.skyGradient.fillStyle(hexColor, 1);
            this.skyGradient.fillRect(0, y, width, h);
        }
    }

    // ==========================================
    // BACKGROUND LAYER (Mountains/Rocks)
    // ==========================================

    private createBackground(width: number, height: number) {
        const bgKey = this.zone.assets.background;

        if (!bgKey || !this.textures.exists(bgKey)) {
            this.backgroundLayer = null;
            return;
        }

        this.backgroundLayer = this.add.image(width / 2, this.horizonY, bgKey);
        this.backgroundLayer.setDepth(1);

        // Different positioning based on zone
        const zoneId = this.zone.id;

        if (zoneId === 'shallow-waters') {
            // Mountains at horizon - stretch to full width, bottom aligned to horizon
            this.backgroundLayer.setOrigin(0.5, 1);
            const scale = width / this.backgroundLayer.width;
            this.backgroundLayer.setScale(scale);
            this.backgroundLayer.setY(this.horizonY + 10);
        }
        else if (zoneId === 'deep-sea') {
            // Rocks floating in water - position below horizon
            this.backgroundLayer.setOrigin(0.5, 0.5);
            const scale = (width * 0.7) / this.backgroundLayer.width;
            this.backgroundLayer.setScale(scale);
            this.backgroundLayer.setY(this.horizonY - 30); // Rocks at horizon level
            this.backgroundLayer.setAlpha(0.9);
        }
        else if (zoneId === 'abyssal-trench') {
            // Mountains on sides - stretch width, positioned at horizon
            this.backgroundLayer.setOrigin(0.5, 0.5);
            const scale = (width * 1.2) / this.backgroundLayer.width;
            this.backgroundLayer.setScale(scale);
            this.backgroundLayer.setY(this.horizonY);
            this.backgroundLayer.setAlpha(0.85);
        }
    }

    // ==========================================
    // ATMOSPHERE (Stars/Sun Rays)
    // ==========================================

    private drawAtmosphere(width: number, height: number, time: number) {
        this.atmosphereGraphics.clear();

        const zoneId = this.zone.id;

        if (zoneId === 'shallow-waters' && this.zone.assets.sunRays) {
            // SUN RAYS for bright day
            this.drawSunRays(width, height, time);
        }
        else if (zoneId === 'reef-zone' || zoneId === 'deep-sea' || zoneId === 'abyssal-trench') {
            // STARS for night/dark zones
            this.drawStars(width, time);
        }
    }

    private drawSunRays(width: number, height: number, time: number) {
        const sunX = width * 0.8;
        const sunY = this.horizonY * 0.2;

        // Sun glow
        this.atmosphereGraphics.fillStyle(0xFFFFCC, 0.2 + Math.sin(time / 2000) * 0.05);
        this.atmosphereGraphics.fillCircle(sunX, sunY, 60);
        this.atmosphereGraphics.fillStyle(0xFFFFFF, 0.15);
        this.atmosphereGraphics.fillCircle(sunX, sunY, 40);

        // Light rays
        this.atmosphereGraphics.setBlendMode(Phaser.BlendModes.ADD);
        for (let i = 0; i < 5; i++) {
            const angle = -0.5 + i * 0.25 + Math.sin(time / 3000 + i) * 0.02;
            const rayLength = height * 0.6;
            const alpha = 0.04 + Math.sin(time / 2000 + i * 0.5) * 0.02;

            const endX = sunX + Math.cos(angle) * rayLength;
            const endY = sunY + Math.sin(angle) * rayLength;

            this.atmosphereGraphics.fillStyle(0xFFFAE0, alpha);
            this.atmosphereGraphics.beginPath();
            this.atmosphereGraphics.moveTo(sunX - 15, sunY);
            this.atmosphereGraphics.lineTo(sunX + 15, sunY);
            this.atmosphereGraphics.lineTo(endX + 50, endY);
            this.atmosphereGraphics.lineTo(endX - 50, endY);
            this.atmosphereGraphics.closePath();
            this.atmosphereGraphics.fillPath();
        }
        this.atmosphereGraphics.setBlendMode(Phaser.BlendModes.NORMAL);
    }

    private drawStars(width: number, time: number) {
        // Create twinkling stars for night sky
        const starPositions = [
            { x: 0.1, y: 0.1, size: 2, twinkleSpeed: 400 },
            { x: 0.25, y: 0.05, size: 1.5, twinkleSpeed: 500 },
            { x: 0.35, y: 0.15, size: 2.5, twinkleSpeed: 350 },
            { x: 0.5, y: 0.08, size: 1.5, twinkleSpeed: 450 },
            { x: 0.6, y: 0.18, size: 2, twinkleSpeed: 380 },
            { x: 0.72, y: 0.06, size: 3, twinkleSpeed: 320 },
            { x: 0.8, y: 0.12, size: 1.5, twinkleSpeed: 420 },
            { x: 0.88, y: 0.03, size: 2, twinkleSpeed: 360 },
            { x: 0.15, y: 0.22, size: 1.5, twinkleSpeed: 440 },
            { x: 0.45, y: 0.2, size: 2, twinkleSpeed: 390 },
            { x: 0.68, y: 0.25, size: 1.5, twinkleSpeed: 410 },
            { x: 0.92, y: 0.2, size: 2.5, twinkleSpeed: 370 },
            { x: 0.3, y: 0.28, size: 1.5, twinkleSpeed: 430 },
            { x: 0.55, y: 0.3, size: 2, twinkleSpeed: 380 },
            { x: 0.78, y: 0.32, size: 1.5, twinkleSpeed: 400 },
        ];

        for (const star of starPositions) {
            const x = width * star.x;
            const y = this.horizonY * star.y;
            const twinkle = 0.4 + Math.sin(time / star.twinkleSpeed) * 0.4;
            const alpha = twinkle;

            // Star glow
            this.atmosphereGraphics.fillStyle(0xFFFFFF, alpha * 0.3);
            this.atmosphereGraphics.fillCircle(x, y, star.size * 2);

            // Star core
            this.atmosphereGraphics.fillStyle(0xFFFFFF, alpha);
            this.atmosphereGraphics.fillCircle(x, y, star.size);
        }
    }

    // ==========================================
    // WATER LAYER
    // ==========================================

    private drawWater(width: number, height: number) {
        const [surfaceColor, deepColor] = this.zone.colors.water;
        const waterHeight = height - this.horizonY;

        this.waterGraphics.clear();

        // Gradient from surface to deep
        const steps = 40;
        for (let i = 0; i < steps; i++) {
            const t = i / steps;
            const y = this.horizonY + t * waterHeight;
            const h = waterHeight / steps + 1;

            const color = Phaser.Display.Color.Interpolate.ColorWithColor(
                Phaser.Display.Color.ValueToColor(surfaceColor),
                Phaser.Display.Color.ValueToColor(deepColor),
                steps,
                i
            );
            const hexColor = Phaser.Display.Color.GetColor(color.r, color.g, color.b);

            this.waterGraphics.fillStyle(hexColor, 1);
            this.waterGraphics.fillRect(0, y, width, h);
        }
    }

    private drawWaterSurface(width: number, time: number) {
        this.waterSurfaceGraphics.clear();

        const [surfaceColor] = this.zone.colors.water;
        const colorObj = Phaser.Display.Color.ValueToColor(surfaceColor);
        const waveColor = Phaser.Display.Color.GetColor(
            Math.min(255, colorObj.red + 40),
            Math.min(255, colorObj.green + 40),
            Math.min(255, colorObj.blue + 40)
        );

        // Draw subtle wave lines at horizon
        for (let wave = 0; wave < 4; wave++) {
            const baseY = this.horizonY + 5 + wave * 15;
            const alpha = 0.2 - wave * 0.04;
            const amplitude = 2 - wave * 0.3;

            this.waterSurfaceGraphics.lineStyle(1.5 - wave * 0.2, waveColor, alpha);
            this.waterSurfaceGraphics.beginPath();

            for (let x = 0; x <= width; x += 6) {
                const y = baseY + Math.sin(x * 0.02 + time * 0.001 + wave * 0.5) * amplitude;
                if (x === 0) {
                    this.waterSurfaceGraphics.moveTo(x, y);
                } else {
                    this.waterSurfaceGraphics.lineTo(x, y);
                }
            }
            this.waterSurfaceGraphics.strokePath();
        }

        // Subtle light reflections (only for shallow, less for others)
        if (this.zone.id === 'shallow-waters') {
            for (let i = 0; i < 5; i++) {
                const sparkleX = ((time * 0.02 + i * 200) % (width + 100)) - 50;
                const sparkleY = this.horizonY + 30 + i * 20;
                const alpha = 0.2 + Math.sin(time / 300 + i * 2) * 0.15;

                this.waterSurfaceGraphics.fillStyle(0xFFFFFF, alpha);
                this.waterSurfaceGraphics.fillCircle(sparkleX, sparkleY, 1.5);
            }
        }
    }

    // ==========================================
    // FOREGROUND (Palm Trees Frame)
    // ==========================================

    private createForeground(width: number, height: number) {
        const fgKey = this.zone.assets.foreground;

        if (!fgKey || !this.textures.exists(fgKey)) {
            this.foregroundLayer = null;
            return;
        }

        this.foregroundLayer = this.add.image(width / 2, height, fgKey);
        this.foregroundLayer.setOrigin(0.5, 1);
        this.foregroundLayer.setDepth(7);

        // Scale to cover width, maintain aspect ratio
        const scale = width / this.foregroundLayer.width;
        this.foregroundLayer.setScale(scale * 1.1); // Slightly larger to ensure coverage
    }

    // ==========================================
    // BOAT & ROD
    // ==========================================

    private createBoatAndRod(width: number, height: number) {
        this.fishingLine = this.add.graphics();
        this.fishingLine.setDepth(5);

        // Boat
        this.boat = this.add.image(width / 2, height + GAME_CONFIG.BOAT.Y_OFFSET, 'boat');
        this.boat.setOrigin(0.5, 1);
        const boatTargetWidth = width * GAME_CONFIG.BOAT.SCALE;
        const boatScale = boatTargetWidth / this.boat.width;
        this.boat.setScale(boatScale);
        this.boat.setDepth(5);

        // Rod
        const rodX = width / 2 + GAME_CONFIG.ROD.X_OFFSET;
        const rodY = height + GAME_CONFIG.ROD.Y_OFFSET;
        this.rod = this.add.image(rodX, rodY, 'rod');
        this.rod.setOrigin(0.5, 1);
        const rodTargetHeight = height * GAME_CONFIG.ROD.HEIGHT_RATIO;
        const rodScale = rodTargetHeight / this.rod.height;
        this.rod.setScale(rodScale);
        this.rod.setRotation(GAME_CONFIG.ROD.ANGLE);
        this.rod.setDepth(5.5);

        // Bobber
        this.bobber = this.add.graphics();
        this.bobber.setDepth(5.5);
        this.bobber.setVisible(false);

        // Animations
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

    private drawFishingLine() {
        this.fishingLine.clear();
        if (!this.bobber.visible) return;

        const rodTipX = this.rod.x + Math.cos(this.rod.rotation - Math.PI / 2) * this.rod.displayHeight * 0.85;
        const rodTipY = this.rod.y - Math.sin(Math.PI / 2 - this.rod.rotation) * this.rod.displayHeight * 0.85;
        const bobberX = this.bobber.x;
        const bobberY = this.bobber.y;

        this.fishingLine.lineStyle(1.5, 0x444444, 0.7);
        this.fishingLine.beginPath();
        this.fishingLine.moveTo(rodTipX, rodTipY);

        const midX = (rodTipX + bobberX) / 2;
        const midY = (rodTipY + bobberY) / 2 + 15;

        const segments = 10;
        for (let i = 1; i <= segments; i++) {
            const t = i / segments;
            const x = (1 - t) * (1 - t) * rodTipX + 2 * (1 - t) * t * midX + t * t * bobberX;
            const y = (1 - t) * (1 - t) * rodTipY + 2 * (1 - t) * t * midY + t * t * bobberY;
            this.fishingLine.lineTo(x, y);
        }
        this.fishingLine.strokePath();
    }

    // ==========================================
    // UI
    // ==========================================

    private createUI(width: number, height: number) {
        this.strikeIndicator = this.add.text(width / 2, height / 2 - 100, '!', {
            fontSize: '84px',
            fontStyle: 'bold',
            color: '#FF0000',
            stroke: '#FFFFFF',
            strokeThickness: 6
        }).setOrigin(0.5).setDepth(20).setVisible(false);
    }

    // ==========================================
    // UPDATE
    // ==========================================

    update(time: number, delta: number) {
        const { width, height } = this.scale;

        this.drawAtmosphere(width, height, time);
        this.drawWaterSurface(width, time);
        this.drawFishingLine();

        if (this.currentPhase === 'WAITING') {
            this.waitingManager.update(time, delta);
        }

        if (this.currentPhase === 'REELING') {
            this.reelingManager.update(delta);
            this.updateReelingCheck();
        }
    }

    // ==========================================
    // GAMEPLAY
    // ==========================================

    private playSplash(x: number, y: number) {
        for (let i = 0; i < 3; i++) {
            const splash = this.add.circle(x, y, 4, 0xFFFFFF);
            splash.setDepth(5.5);
            this.tweens.add({
                targets: splash,
                scale: 2 + i,
                alpha: 0,
                duration: 350 + i * 80,
                delay: i * 40,
                onComplete: () => splash.destroy()
            });
        }
    }

    public castLine() {
        if (this.currentPhase !== 'IDLE') return;
        this.setPhase('CASTING');

        const { width } = this.scale;

        this.bobber.clear();
        this.bobber.fillStyle(0xff0000, 1);
        this.bobber.fillCircle(0, 0, 6);
        this.bobber.fillStyle(0xffffff, 1);
        this.bobber.fillCircle(0, -3, 3);
        this.bobber.setVisible(true);

        const startX = this.rod.x;
        const startY = this.rod.y - this.rod.displayHeight * 0.8;
        const targetX = width / 2;
        const targetY = this.horizonY + 50;

        this.bobber.setPosition(startX, startY);

        this.tweens.add({
            targets: this.rod,
            rotation: -0.4,
            duration: 150,
            yoyo: true,
            ease: 'Power2'
        });

        this.tweens.add({
            targets: this.bobber,
            x: targetX,
            y: targetY,
            duration: 700,
            ease: 'Back.easeOut',
            onComplete: () => {
                this.playSplash(targetX, targetY);
                this.time.delayedCall(400, () => this.startWaiting());
            }
        });
    }

    public lure() {
        if (this.currentPhase !== 'WAITING') return;
        this.waitingManager.lure();
    }

    private setPhase(phase: GamePhase) {
        this.currentPhase = phase;
        this.config.onPhaseChange?.(phase);
    }

    private startWaiting() {
        this.setPhase('WAITING');
        this.waitingManager.start(() => this.triggerStrike());
    }

    private triggerStrike() {
        this.waitingManager.stop();
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
                this.startReeling();
            }
        });
    }

    private startReeling() {
        this.setPhase('REELING');
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

        const fish = FISH_DATA[0];
        this.bobber.setVisible(false);
        this.config.onCatchSuccess?.({ name: fish.name, rarity: fish.rarity });

        this.time.delayedCall(3000, () => this.setPhase('IDLE'));
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
    }
}
