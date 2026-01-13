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
 * MainScene - Enhanced with Game Juice
 * Features: Fog overlay, Moon, Shooting stars, Screen shake, Confetti
 */
export class MainScene extends Phaser.Scene {
    private config!: MainSceneConfig;
    private zone!: ZoneConfig;

    // Graphics layers
    private skyGradient!: Phaser.GameObjects.Graphics;
    private backgroundLayer!: Phaser.GameObjects.Image | null;
    private atmosphereGraphics!: Phaser.GameObjects.Graphics;
    private fogGraphics!: Phaser.GameObjects.Graphics;
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

    // Shooting star state
    private nextShootingStarTime: number = 0;

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
        this.horizonY = height * 0.5;

        // === LAYER 0: SKY ===
        this.createSky(width, height);

        // === LAYER 1: BACKGROUND ===
        this.createBackground(width, height);

        // === LAYER 2: ATMOSPHERE ===
        this.atmosphereGraphics = this.add.graphics();
        this.atmosphereGraphics.setDepth(2);

        // === LAYER 2.5: FOG (Soft Horizon) ===
        this.fogGraphics = this.add.graphics();
        this.fogGraphics.setDepth(2.5);
        this.createFog(width);

        // === LAYER 3: WATER ===
        this.waterGraphics = this.add.graphics();
        this.waterGraphics.setDepth(3);
        this.drawWater(width, height);

        // === LAYER 4: WATER SURFACE ===
        this.waterSurfaceGraphics = this.add.graphics();
        this.waterSurfaceGraphics.setDepth(4);
        this.waterSurfaceGraphics.setBlendMode(Phaser.BlendModes.ADD);

        // === LAYER 5: BOAT & ROD ===
        this.createBoatAndRod(width, height);

        // === LAYER 6: FOREGROUND ===
        this.createForeground(width, height);

        // === UI ===
        this.createUI(width, height);

        // === MANAGERS ===
        this.waitingManager = new WaitingManager(this);
        this.reelingManager = new ReelingManager(this);

        // Initialize shooting star timer
        this.nextShootingStarTime = this.time.now + Phaser.Math.Between(5000, 15000);

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
    // BACKGROUND LAYER
    // ==========================================

    private createBackground(width: number, height: number) {
        const bgKey = this.zone.assets.background;

        if (!bgKey || !this.textures.exists(bgKey)) {
            this.backgroundLayer = null;
            return;
        }

        this.backgroundLayer = this.add.image(width / 2, this.horizonY, bgKey);
        this.backgroundLayer.setDepth(1);

        const zoneId = this.zone.id;

        if (zoneId === 'shallow-waters') {
            this.backgroundLayer.setOrigin(0.5, 1);
            const scale = width / this.backgroundLayer.width;
            this.backgroundLayer.setScale(scale);
            this.backgroundLayer.setY(this.horizonY + 10);
        }
        else if (zoneId === 'deep-sea') {
            this.backgroundLayer.setOrigin(0.5, 0.6);
            const visualScale = 0.8 * (width / this.backgroundLayer.width);
            const targetHeight = this.backgroundLayer.height * visualScale;
            this.backgroundLayer.setDisplaySize(width * 1.15, targetHeight);
            this.backgroundLayer.setY(this.horizonY);
            this.backgroundLayer.setAlpha(0.95);
        }
        else if (zoneId === 'abyssal-trench') {
            this.backgroundLayer.setOrigin(0.5, 0.55);
            const visualScale = 0.7 * (width / this.backgroundLayer.width);
            const targetHeight = this.backgroundLayer.height * visualScale;
            this.backgroundLayer.setDisplaySize(width * 1, targetHeight);
            this.backgroundLayer.setY(this.horizonY);
            this.backgroundLayer.setAlpha(0.9);
        }
    }

    // ==========================================
    // FOG (Soft Horizon)
    // ==========================================

    private createFog(width: number) {
        const [, bottomSkyColor] = this.zone.colors.sky;
        const fogHeight = 80;

        // Create gradient fog from transparent to sky color
        const steps = 20;
        for (let i = 0; i < steps; i++) {
            const t = i / steps;
            const y = this.horizonY - fogHeight + t * fogHeight;
            const h = fogHeight / steps + 1;
            const alpha = t * 0.4; // Fade in towards horizon

            this.fogGraphics.fillStyle(bottomSkyColor, alpha);
            this.fogGraphics.fillRect(0, y, width, h);
        }
    }

    // ==========================================
    // ATMOSPHERE (Stars/Moon/Sun Rays)
    // ==========================================

    private drawAtmosphere(width: number, height: number, time: number) {
        this.atmosphereGraphics.clear();

        const zoneId = this.zone.id;

        if (zoneId === 'shallow-waters' && this.zone.assets.sunRays) {
            this.drawSunRays(width, height, time);
        }
        else if (zoneId === 'reef-zone' || zoneId === 'deep-sea' || zoneId === 'abyssal-trench') {
            this.drawMoon(width, time);
            this.drawStars(width, time);
        }
    }

    private drawMoon(width: number, time: number) {
        const moonX = width * 0.85;
        const moonY = this.horizonY * 0.15;
        const moonRadius = 25;

        // Outer glow (multiple layers)
        for (let i = 4; i > 0; i--) {
            const glowAlpha = 0.03 + Math.sin(time / 3000) * 0.01;
            this.atmosphereGraphics.fillStyle(0xE6E6FA, glowAlpha);
            this.atmosphereGraphics.fillCircle(moonX, moonY, moonRadius + i * 15);
        }

        // Moon body
        this.atmosphereGraphics.fillStyle(0xFFF8DC, 0.9);
        this.atmosphereGraphics.fillCircle(moonX, moonY, moonRadius);

        // Inner highlight
        this.atmosphereGraphics.fillStyle(0xFFFFFF, 0.5);
        this.atmosphereGraphics.fillCircle(moonX - 5, moonY - 5, moonRadius * 0.4);
    }

    private drawSunRays(width: number, height: number, time: number) {
        const sunX = width * 0.8;
        const sunY = this.horizonY * 0.2;

        // Sun glow
        this.atmosphereGraphics.fillStyle(0xFFFFCC, 0.25 + Math.sin(time / 2000) * 0.08);
        this.atmosphereGraphics.fillCircle(sunX, sunY, 70);
        this.atmosphereGraphics.fillStyle(0xFFFFFF, 0.2);
        this.atmosphereGraphics.fillCircle(sunX, sunY, 45);

        // Light rays with ADD blend
        this.atmosphereGraphics.setBlendMode(Phaser.BlendModes.ADD);
        for (let i = 0; i < 6; i++) {
            const angle = -0.6 + i * 0.25 + Math.sin(time / 2500 + i) * 0.03;
            const rayLength = height * 0.7;
            const alpha = 0.06 + Math.sin(time / 1800 + i * 0.5) * 0.03;

            const endX = sunX + Math.cos(angle) * rayLength;
            const endY = sunY + Math.sin(angle) * rayLength;

            this.atmosphereGraphics.fillStyle(0xFFFAE0, alpha);
            this.atmosphereGraphics.beginPath();
            this.atmosphereGraphics.moveTo(sunX - 20, sunY);
            this.atmosphereGraphics.lineTo(sunX + 20, sunY);
            this.atmosphereGraphics.lineTo(endX + 60, endY);
            this.atmosphereGraphics.lineTo(endX - 60, endY);
            this.atmosphereGraphics.closePath();
            this.atmosphereGraphics.fillPath();
        }
        this.atmosphereGraphics.setBlendMode(Phaser.BlendModes.NORMAL);
    }

    private drawStars(width: number, time: number) {
        const starPositions = [
            { x: 0.08, y: 0.08, size: 2, twinkleSpeed: 400 },
            { x: 0.22, y: 0.04, size: 1.5, twinkleSpeed: 500 },
            { x: 0.35, y: 0.12, size: 2.5, twinkleSpeed: 350 },
            { x: 0.48, y: 0.06, size: 1.5, twinkleSpeed: 450 },
            { x: 0.58, y: 0.15, size: 2, twinkleSpeed: 380 },
            { x: 0.7, y: 0.05, size: 2.5, twinkleSpeed: 320 },
            { x: 0.12, y: 0.2, size: 1.5, twinkleSpeed: 440 },
            { x: 0.4, y: 0.18, size: 2, twinkleSpeed: 390 },
            { x: 0.65, y: 0.22, size: 1.5, twinkleSpeed: 410 },
            { x: 0.28, y: 0.26, size: 1.5, twinkleSpeed: 430 },
            { x: 0.52, y: 0.28, size: 2, twinkleSpeed: 380 },
            { x: 0.75, y: 0.3, size: 1.5, twinkleSpeed: 400 },
        ];

        for (const star of starPositions) {
            const x = width * star.x;
            const y = this.horizonY * star.y;
            const twinkle = 0.5 + Math.sin(time / star.twinkleSpeed) * 0.4;

            // Star glow
            this.atmosphereGraphics.fillStyle(0xFFFFFF, twinkle * 0.25);
            this.atmosphereGraphics.fillCircle(x, y, star.size * 2.5);

            // Star core
            this.atmosphereGraphics.fillStyle(0xFFFFFF, twinkle);
            this.atmosphereGraphics.fillCircle(x, y, star.size);
        }

        // Shooting star logic
        this.updateShootingStar(width, time);
    }

    private updateShootingStar(width: number, time: number) {
        if (time < this.nextShootingStarTime) return;

        // Spawn shooting star
        const startX = Phaser.Math.Between(width * 0.3, width * 0.9);
        const startY = Phaser.Math.Between(10, this.horizonY * 0.3);
        const endX = startX - Phaser.Math.Between(100, 200);
        const endY = startY + Phaser.Math.Between(80, 150);

        // Create shooting star line
        const star = this.add.graphics();
        star.setDepth(2);
        star.lineStyle(2, 0xFFFFFF, 0.8);
        star.lineBetween(startX, startY, startX, startY);

        // Animate shooting star
        this.tweens.add({
            targets: { progress: 0 },
            progress: 1,
            duration: 400,
            onUpdate: (tween) => {
                const p = tween.getValue() as number;
                if (p === null) return;
                star.clear();

                // Trail
                const trailLength = 0.3;
                const trailStart = Math.max(0, p - trailLength);

                const x1 = Phaser.Math.Linear(startX, endX, trailStart);
                const y1 = Phaser.Math.Linear(startY, endY, trailStart);
                const x2 = Phaser.Math.Linear(startX, endX, p);
                const y2 = Phaser.Math.Linear(startY, endY, p);

                star.lineStyle(2, 0xFFFFFF, 0.8 * (1 - p));
                star.lineBetween(x1, y1, x2, y2);
            },
            onComplete: () => star.destroy()
        });

        // Schedule next shooting star
        this.nextShootingStarTime = time + Phaser.Math.Between(15000, 30000);
    }

    // ==========================================
    // WATER LAYER
    // ==========================================

    private drawWater(width: number, height: number) {
        const [surfaceColor, deepColor] = this.zone.colors.water;
        const waterHeight = height - this.horizonY;

        this.waterGraphics.clear();

        const steps = 50;
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
            Math.min(255, colorObj.red + 60),
            Math.min(255, colorObj.green + 60),
            Math.min(255, colorObj.blue + 60)
        );

        // Animated wave lines with ADD blend (set in create)
        for (let wave = 0; wave < 5; wave++) {
            const baseY = this.horizonY + 8 + wave * 18;
            const alpha = 0.35 - wave * 0.06;
            const amplitude = 3 - wave * 0.4;

            this.waterSurfaceGraphics.lineStyle(2 - wave * 0.3, waveColor, alpha);
            this.waterSurfaceGraphics.beginPath();

            for (let x = 0; x <= width; x += 5) {
                const y = baseY + Math.sin(x * 0.015 + time * 0.0012 + wave * 0.7) * amplitude;
                if (x === 0) {
                    this.waterSurfaceGraphics.moveTo(x, y);
                } else {
                    this.waterSurfaceGraphics.lineTo(x, y);
                }
            }
            this.waterSurfaceGraphics.strokePath();
        }

        // Sparkles for all zones (more for shallow)
        const sparkleCount = this.zone.id === 'shallow-waters' ? 8 : 4;
        for (let i = 0; i < sparkleCount; i++) {
            const sparkleX = ((time * 0.025 + i * 180) % (width + 100)) - 50;
            const sparkleY = this.horizonY + 25 + i * 18;
            const alpha = 0.35 + Math.sin(time / 250 + i * 2) * 0.25;

            this.waterSurfaceGraphics.fillStyle(0xFFFFFF, alpha);
            this.waterSurfaceGraphics.fillCircle(sparkleX, sparkleY, 2);
        }
    }

    // ==========================================
    // FOREGROUND
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

        const visualScale = 0.8 * (width / this.foregroundLayer.width);
        const targetHeight = this.foregroundLayer.height * visualScale;
        this.foregroundLayer.setDisplaySize(width, targetHeight);
    }

    // ==========================================
    // BOAT & ROD
    // ==========================================

    private createBoatAndRod(width: number, height: number) {
        this.fishingLine = this.add.graphics();
        this.fishingLine.setDepth(5);

        this.boat = this.add.image(width / 2, height + GAME_CONFIG.BOAT.Y_OFFSET, 'boat');
        this.boat.setOrigin(0.5, 1);
        const boatTargetWidth = width * GAME_CONFIG.BOAT.SCALE;
        const boatScale = boatTargetWidth / this.boat.width;
        this.boat.setScale(boatScale);
        this.boat.setDepth(5);

        const rodX = width / 2 + GAME_CONFIG.ROD.X_OFFSET;
        const rodY = height + GAME_CONFIG.ROD.Y_OFFSET;
        this.rod = this.add.image(rodX, rodY, 'rod');
        this.rod.setOrigin(0.5, 1);
        const rodTargetHeight = height * GAME_CONFIG.ROD.HEIGHT_RATIO;
        const rodScale = rodTargetHeight / this.rod.height;
        this.rod.setScale(rodScale);
        this.rod.setRotation(GAME_CONFIG.ROD.ANGLE);
        this.rod.setDepth(5.5);

        this.bobber = this.add.graphics();
        this.bobber.setDepth(5.5);
        this.bobber.setVisible(false);

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
    // GAME JUICE METHODS
    // ==========================================

    private shakeCamera(intensity: number = 0.005, duration: number = 200) {
        this.cameras.main.shake(duration, intensity);
    }

    private triggerHaptic(pattern: number | number[]) {
        if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
            navigator.vibrate(pattern);
        }
    }

    private spawnConfetti() {
        const { width, height } = this.scale;
        const centerX = width / 2;
        const centerY = height * 0.6;
        const colors = [0xFF6B6B, 0x4ECDC4, 0xFFE66D, 0x95E1D3, 0xF38181];

        for (let i = 0; i < 30; i++) {
            const color = Phaser.Utils.Array.GetRandom(colors);
            const particle = this.add.rectangle(centerX, centerY, 8, 8, color);
            particle.setDepth(15);

            const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
            const speed = Phaser.Math.Between(200, 400);
            const targetX = centerX + Math.cos(angle) * speed;
            const targetY = centerY + Math.sin(angle) * speed * 0.6 - 100;

            this.tweens.add({
                targets: particle,
                x: targetX,
                y: targetY + 300,
                rotation: Phaser.Math.FloatBetween(-3, 3),
                alpha: 0,
                scale: 0.3,
                duration: Phaser.Math.Between(800, 1200),
                ease: 'Quad.easeOut',
                onComplete: () => particle.destroy()
            });
        }
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
        for (let i = 0; i < 4; i++) {
            const splash = this.add.circle(x, y, 5, 0xFFFFFF, 0.8);
            splash.setDepth(5.5);
            this.tweens.add({
                targets: splash,
                scale: 2.5 + i,
                alpha: 0,
                duration: 400 + i * 100,
                delay: i * 50,
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
                this.triggerHaptic(30);
                this.time.delayedCall(400, () => this.startWaiting());
            }
        });
    }

    public lure() {
        if (this.currentPhase !== 'WAITING') return;
        this.triggerHaptic(50);
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

        // GAME JUICE: Screen shake + haptic
        this.shakeCamera(0.008, 250);
        this.triggerHaptic([100, 50, 100]);

        this.strikeIndicator.setVisible(true);
        this.strikeIndicator.setAlpha(0);
        this.tweens.add({
            targets: this.strikeIndicator,
            alpha: 1,
            scale: { from: 0.5, to: 1.3 },
            duration: 180,
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

        // GAME JUICE: Confetti + haptic
        this.spawnConfetti();
        this.triggerHaptic([50, 30, 50, 30, 100]);

        const fish = FISH_DATA[0];
        this.bobber.setVisible(false);
        this.config.onCatchSuccess?.({ name: fish.name, rarity: fish.rarity });

        this.time.delayedCall(3000, () => this.setPhase('IDLE'));
    }

    private handleCatchFail() {
        this.reelingManager.stop();
        this.setPhase('FAILED');

        this.triggerHaptic([200]);
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
