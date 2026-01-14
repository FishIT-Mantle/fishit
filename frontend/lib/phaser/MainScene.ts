import Phaser from 'phaser';
import { ZoneConfig } from '../gameplay/zones';
import { GAME_CONFIG, FISH_DATA } from '../gameplay/phaser/data';
import { WaitingManager } from '../gameplay/phaser/WaitingManager';
import { ReelingManager } from '../gameplay/phaser/ReelingManager';
import { CelebrationManager } from '../gameplay/phaser/CelebrationManager';

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
 * MainScene - Asset-Based Water Rendering
 * 
 * Layer Architecture (3-Layer Sandwich):
 * - Layer 3: Base water gradient
 * - Layer 3.5: TileSprite water ripples (perspective-squashed)
 * - Layer 3.6: Sun/moon reflection image
 * - Layer 3.7: Fog overlay
 */
export class MainScene extends Phaser.Scene {
    private config!: MainSceneConfig;
    private zone!: ZoneConfig;

    // Graphics layers
    private skyGradient!: Phaser.GameObjects.Graphics;
    private backgroundLayer!: Phaser.GameObjects.Image | null;
    private atmosphereGraphics!: Phaser.GameObjects.Graphics;
    private fogSprite!: Phaser.GameObjects.Image;  // UPDATED: Texture-based fog (no banding)
    private waterGraphics!: Phaser.GameObjects.Graphics;
    private waterRipples!: Phaser.GameObjects.TileSprite;  // Asset-based ripples
    private sunReflection!: Phaser.GameObjects.Image;      // Sun/moon reflection
    private foregroundLayer!: Phaser.GameObjects.Image | null;

    // Gameplay
    private boat!: Phaser.GameObjects.Image;
    private rod!: Phaser.GameObjects.Image;
    private bobber!: Phaser.GameObjects.Graphics;
    private fishingLine!: Phaser.GameObjects.Graphics;

    // Managers
    private waitingManager!: WaitingManager;
    private reelingManager!: ReelingManager;
    private celebrationManager!: CelebrationManager;

    // State
    private currentPhase: GamePhase = 'IDLE';
    private strikeIndicator!: Phaser.GameObjects.Text;
    private horizonY: number = 0;

    // Effects state
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

        // Water assets (NEW: Asset-based water rendering)
        this.load.image('water_ripples', '/zone/water_ripples.webp');
        this.load.image('sun_reflection', '/zone/sun_reflection.webp');

        this.load.image('boat', this.config.boatUrl || '/gameplay/kapal.webp');
        this.load.image('rod', this.config.rodUrl || '/gameplay/pancingan.webp');

        // Reeling UI assets
        this.load.image('reeling_bar', '/gameplay/bar.webp');
        this.load.image('reeling_zone', '/gameplay/rel.webp');
        this.load.image('reeling_indicator', '/gameplay/indikator.webp');

        // Celebration overlay (from CDN)
        this.load.image('celebration_overlay', 'https://cdn.jsdelivr.net/gh/OfficialNovaAI/asset@main/substract.webp');
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

        // === LAYER 2.5: FOG (Texture-based - no banding) ===
        this.createFogTexture(width);
        this.createFog(width);

        // === LAYER 3: WATER BASE GRADIENT ===
        this.waterGraphics = this.add.graphics();
        this.waterGraphics.setDepth(3);
        this.drawWater(width, height);

        // === LAYER 3.5: WATER RIPPLES (TileSprite) ===
        this.createWaterRipples(width, height);

        // === LAYER 3.6: SUN/MOON REFLECTION ===
        this.createSunReflection(width, height);

        // === LAYER 5: BOAT & ROD ===
        this.createBoatAndRod(width, height);

        // === LAYER 6: FOREGROUND ===
        this.createForeground(width, height);

        // === UI ===
        this.createUI(width, height);

        // === MANAGERS ===
        this.waitingManager = new WaitingManager(this);
        this.reelingManager = new ReelingManager(this);
        this.celebrationManager = new CelebrationManager(this);

        // Initialize effects
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
    // FOG (Texture-based - Smooth, No Banding)
    // ==========================================

    private createFogTexture(width: number) {
        const [, bottomSkyColor] = this.zone.colors.sky;

        // Create a canvas for the gradient texture
        const fogHeight = 200;
        const canvas = document.createElement('canvas');
        canvas.width = 2;  // Minimal width, will be stretched
        canvas.height = fogHeight;
        const ctx = canvas.getContext('2d')!;

        // Convert hex color to CSS
        const r = (bottomSkyColor >> 16) & 0xFF;
        const g = (bottomSkyColor >> 8) & 0xFF;
        const b = bottomSkyColor & 0xFF;

        // Create smooth vertical gradient (top = opaque, bottom = transparent)
        const gradient = ctx.createLinearGradient(0, 0, 0, fogHeight);
        gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, 0)`);
        gradient.addColorStop(0.3, `rgba(${r}, ${g}, ${b}, 0.15)`);
        gradient.addColorStop(0.6, `rgba(${r}, ${g}, ${b}, 0.4)`);
        gradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0.7)`);

        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 2, fogHeight);

        // Add texture to Phaser
        if (this.textures.exists('fog_texture')) {
            this.textures.remove('fog_texture');
        }
        this.textures.addCanvas('fog_texture', canvas);
    }

    private createFog(width: number) {
        // Create sprite from generated texture
        this.fogSprite = this.add.image(width / 2, this.horizonY, 'fog_texture');
        this.fogSprite.setOrigin(0.5, 1);  // Bottom-centered (fog sits above horizon)
        this.fogSprite.setDisplaySize(width, 200);  // Stretch to full width
        this.fogSprite.setDepth(3.7);  // On top of water but behind boat
        this.fogSprite.setAlpha(0.6);  // Adjustable subtlety
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
            this.drawMoon(width, height, time);
            this.drawMoonReflection(width, height, time);
            this.drawStars(width, time);
        }
    }

    private drawMoon(width: number, height: number, time: number) {
        const moonX = width * 0.85;
        const moonY = this.horizonY * 0.15;
        const moonRadius = 28;

        // Outer glow layers
        for (let i = 5; i > 0; i--) {
            const glowAlpha = 0.04 + Math.sin(time / 3000) * 0.015;
            this.atmosphereGraphics.fillStyle(0xE6E6FA, glowAlpha);
            this.atmosphereGraphics.fillCircle(moonX, moonY, moonRadius + i * 18);
        }

        // Moon body
        this.atmosphereGraphics.fillStyle(0xFFFACD, 0.95);
        this.atmosphereGraphics.fillCircle(moonX, moonY, moonRadius);

        // Inner highlight
        this.atmosphereGraphics.fillStyle(0xFFFFFF, 0.6);
        this.atmosphereGraphics.fillCircle(moonX - 6, moonY - 6, moonRadius * 0.35);
    }

    private drawMoonReflection(width: number, height: number, time: number) {
        const moonX = width * 0.85;
        const reflectionStartY = this.horizonY + 10;
        const reflectionHeight = height * 0.35;

        // Vertical shimmer columns
        const columnCount = 5;
        for (let c = 0; c < columnCount; c++) {
            const offsetX = (c - 2) * 8;
            const shimmerX = moonX + offsetX + Math.sin(time / 800 + c) * 3;

            // Draw reflection segments
            const segments = 12;
            for (let i = 0; i < segments; i++) {
                const t = i / segments;
                const y = reflectionStartY + t * reflectionHeight;
                const segHeight = reflectionHeight / segments;

                // Alpha decreases with depth, oscillates for shimmer
                const baseAlpha = 0.15 * (1 - t * 0.8);
                const shimmerAlpha = baseAlpha * (0.5 + Math.sin(time / 300 + i * 0.8 + c) * 0.5);

                // Width narrows with depth
                const segWidth = (4 - c * 0.5) * (1 - t * 0.5);

                this.atmosphereGraphics.fillStyle(0xFFFACD, shimmerAlpha);
                this.atmosphereGraphics.fillRect(shimmerX - segWidth / 2, y, segWidth, segHeight + 1);
            }
        }
    }

    private drawSunRays(width: number, height: number, time: number) {
        const sunX = width * 0.8;
        const sunY = this.horizonY * 0.18;

        // === SUN GLOW (Very soft multi-layer) ===
        for (let i = 5; i > 0; i--) {
            const glowAlpha = 0.04 + Math.sin(time / 3000) * 0.015;
            this.atmosphereGraphics.fillStyle(0xFFFFF0, glowAlpha / i);
            this.atmosphereGraphics.fillCircle(sunX, sunY, 35 + i * 25);
        }

        // Sun core (soft, not harsh)
        this.atmosphereGraphics.fillStyle(0xFFFFF0, 0.2);
        this.atmosphereGraphics.fillCircle(sunX, sunY, 40);
        this.atmosphereGraphics.fillStyle(0xFFFFFF, 0.12);
        this.atmosphereGraphics.fillCircle(sunX, sunY, 28);

        // === GOD RAYS (Soft, gradient-like, breathing) ===
        this.atmosphereGraphics.setBlendMode(Phaser.BlendModes.ADD);

        const rayCount = 6;

        // Global breathing cycle (all rays breathe together + individual variation)
        const globalBreath = Math.sin(time / 5000) * 0.5 + 0.5;  // 0 to 1

        for (let i = 0; i < rayCount; i++) {
            // Very slow, subtle wobble (±3 degrees max)
            const baseAngle = -0.5 + i * 0.2;
            const wobble = Math.sin(time / 8000 + i * 1.2) * 0.05;  // Very slow wobble
            const angle = baseAngle + wobble;

            const rayLength = height * 0.7;

            // Individual breathing offset for each ray
            const individualBreath = Math.sin(time / 6000 + i * 0.7) * 0.5 + 0.5;
            const combinedBreath = (globalBreath * 0.6 + individualBreath * 0.4);

            // Very soft alpha range (0.02 - 0.06)
            const baseAlpha = 0.02 + combinedBreath * 0.04;

            const endX = sunX + Math.cos(angle) * rayLength;
            const endY = sunY + Math.sin(angle) * rayLength;

            // Draw MULTIPLE layers per ray to simulate soft edges (like gradient)
            // Layer 1: Outermost (widest, most transparent)
            this.atmosphereGraphics.fillStyle(0xFFFAE0, baseAlpha * 0.3);
            this.drawSingleRay(sunX, sunY, endX, endY, 35, 120);

            // Layer 2: Middle
            this.atmosphereGraphics.fillStyle(0xFFFAE0, baseAlpha * 0.6);
            this.drawSingleRay(sunX, sunY, endX, endY, 20, 70);

            // Layer 3: Core (narrowest, most visible)
            this.atmosphereGraphics.fillStyle(0xFFFFF0, baseAlpha);
            this.drawSingleRay(sunX, sunY, endX, endY, 10, 40);
        }

        this.atmosphereGraphics.setBlendMode(Phaser.BlendModes.NORMAL);
    }

    private drawSingleRay(sunX: number, sunY: number, endX: number, endY: number, sunWidth: number, endWidth: number) {
        this.atmosphereGraphics.beginPath();
        this.atmosphereGraphics.moveTo(sunX - sunWidth, sunY);
        this.atmosphereGraphics.lineTo(sunX + sunWidth, sunY);
        this.atmosphereGraphics.lineTo(endX + endWidth, endY);
        this.atmosphereGraphics.lineTo(endX - endWidth, endY);
        this.atmosphereGraphics.closePath();
        this.atmosphereGraphics.fillPath();
    }

    private drawStars(width: number, time: number) {
        const starPositions = [
            { x: 0.06, y: 0.06, size: 2, twinkleSpeed: 400 },
            { x: 0.18, y: 0.03, size: 1.5, twinkleSpeed: 500 },
            { x: 0.32, y: 0.10, size: 2.5, twinkleSpeed: 350 },
            { x: 0.45, y: 0.05, size: 1.5, twinkleSpeed: 450 },
            { x: 0.55, y: 0.14, size: 2, twinkleSpeed: 380 },
            { x: 0.68, y: 0.04, size: 2.5, twinkleSpeed: 320 },
            { x: 0.10, y: 0.18, size: 1.5, twinkleSpeed: 440 },
            { x: 0.38, y: 0.16, size: 2, twinkleSpeed: 390 },
            { x: 0.62, y: 0.20, size: 1.5, twinkleSpeed: 410 },
            { x: 0.25, y: 0.24, size: 1.5, twinkleSpeed: 430 },
            { x: 0.50, y: 0.26, size: 2, twinkleSpeed: 380 },
            { x: 0.72, y: 0.28, size: 1.5, twinkleSpeed: 400 },
            { x: 0.15, y: 0.30, size: 1.2, twinkleSpeed: 420 },
            { x: 0.42, y: 0.32, size: 1.8, twinkleSpeed: 360 },
        ];

        for (const star of starPositions) {
            const x = width * star.x;
            const y = this.horizonY * star.y;
            const twinkle = 0.5 + Math.sin(time / star.twinkleSpeed) * 0.45;

            // Star glow
            this.atmosphereGraphics.fillStyle(0xFFFFFF, twinkle * 0.2);
            this.atmosphereGraphics.fillCircle(x, y, star.size * 3);

            // Star core
            this.atmosphereGraphics.fillStyle(0xFFFFFF, twinkle);
            this.atmosphereGraphics.fillCircle(x, y, star.size);
        }

        this.updateShootingStar(width, time);
    }

    private updateShootingStar(width: number, time: number) {
        if (time < this.nextShootingStarTime) return;

        const startX = Phaser.Math.Between(width * 0.3, width * 0.9);
        const startY = Phaser.Math.Between(10, this.horizonY * 0.3);
        const endX = startX - Phaser.Math.Between(100, 200);
        const endY = startY + Phaser.Math.Between(80, 150);

        const star = this.add.graphics();
        star.setDepth(2);

        this.tweens.add({
            targets: { progress: 0 },
            progress: 1,
            duration: 400,
            onUpdate: (tween) => {
                const p = tween.getValue() as number;
                if (p === null) return;
                star.clear();

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

        this.nextShootingStarTime = time + Phaser.Math.Between(15000, 30000);
    }

    // ==========================================
    // WATER RIPPLES (Asset-based TileSprite)
    // ==========================================

    private createWaterRipples(width: number, height: number) {
        const waterHeight = height - this.horizonY;

        // Create TileSprite covering entire water area
        this.waterRipples = this.add.tileSprite(
            width / 2,                    // x: center
            this.horizonY + waterHeight / 2,  // y: center of water area
            width,                        // width: full screen
            waterHeight,                  // height: water area only
            'water_ripples'
        );

        this.waterRipples.setDepth(3.5);
        this.waterRipples.setBlendMode(Phaser.BlendModes.ADD);

        // CRITICAL: Squash Y scale to create perspective horizontal lines
        // Low Y scale (0.08-0.12) makes ripples appear as thin horizontal striations
        this.waterRipples.setTileScale(0.5, 0.1);

        // Subtle visibility - these should enhance, not overpower
        const isNightZone = this.zone.id !== 'shallow-waters';
        this.waterRipples.setAlpha(isNightZone ? 0.2 : 0.35);
    }

    // ==========================================
    // SUN/MOON REFLECTION (Image Layer)
    // ==========================================

    private createSunReflection(width: number, height: number) {
        // Position: centered horizontally, just below horizon
        this.sunReflection = this.add.image(
            width / 2,
            this.horizonY + 80,  // 80px below horizon
            'sun_reflection'
        );

        this.sunReflection.setOrigin(0.5, 0.5);
        this.sunReflection.setDepth(3.6);
        this.sunReflection.setBlendMode(Phaser.BlendModes.ADD);

        // Scale to fit nicely - adjust based on asset size
        const targetWidth = width * 0.6;
        const scale = targetWidth / this.sunReflection.width;
        this.sunReflection.setScale(scale, scale * 0.4);  // Squash vertically for water look

        // Day vs Night appearance
        const isNightZone = this.zone.id !== 'shallow-waters';
        if (isNightZone) {
            // Night: dim, cool-tinted glow (moon reflection)
            this.sunReflection.setAlpha(0.3);
            this.sunReflection.setTint(0xCCDDFF);  // Cool blue-white
        } else {
            // Day: bright, warm sun reflection
            this.sunReflection.setAlpha(0.6);
            this.sunReflection.setTint(0xFFFFDD);  // Warm white
        }
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

    // ==========================================
    // WATER SURFACE UPDATE (TileSprite Animation)
    // ==========================================

    private updateWaterSurface(time: number) {
        // Animate water ripples TileSprite
        // Horizontal drift: simulate gentle current
        this.waterRipples.tilePositionX += 0.3;

        // Vertical micro-bobbing
        this.waterRipples.tilePositionY = Math.sin(time * 0.001) * 3;

        // Subtle alpha pulsing for more life
        const isNightZone = this.zone.id !== 'shallow-waters';
        const baseAlpha = isNightZone ? 0.2 : 0.35;
        const pulseAlpha = baseAlpha + Math.sin(time * 0.0008) * 0.05;
        this.waterRipples.setAlpha(pulseAlpha);

        // Sun reflection subtle animation
        const reflectionPulse = 0.9 + Math.sin(time * 0.0006) * 0.1;
        this.sunReflection.setScale(
            this.sunReflection.scaleX,
            this.sunReflection.scaleY * reflectionPulse / (0.9 + Math.sin((time - 16) * 0.0006) * 0.1)
        );
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
    // GAME JUICE
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
        const colors = [0xFF6B6B, 0x4ECDC4, 0xFFE66D, 0x95E1D3, 0xF38181, 0x6C5CE7];

        for (let i = 0; i < 35; i++) {
            const color = Phaser.Utils.Array.GetRandom(colors);
            const particle = this.add.rectangle(centerX, centerY, 8, 8, color);
            particle.setDepth(15);

            const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
            const speed = Phaser.Math.Between(180, 420);
            const targetX = centerX + Math.cos(angle) * speed;
            const targetY = centerY + Math.sin(angle) * speed * 0.6 - 120;

            this.tweens.add({
                targets: particle,
                x: targetX,
                y: targetY + 350,
                rotation: Phaser.Math.FloatBetween(-4, 4),
                alpha: 0,
                scale: 0.2,
                duration: Phaser.Math.Between(900, 1400),
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
        this.updateWaterSurface(time);  // NEW: Asset-based water animation
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
        console.log('[MainScene] handleCatchSuccess called!');
        this.reelingManager.stop();
        this.setPhase('CAUGHT');

        // Get the caught fish
        const fish = FISH_DATA[Phaser.Math.Between(0, FISH_DATA.length - 1)];
        console.log('[MainScene] Caught fish:', fish);

        // Show celebration overlay
        console.log('[MainScene] Calling celebrationManager.show()');
        this.celebrationManager.show(fish);

        this.spawnConfetti();
        this.triggerHaptic([50, 30, 50, 30, 100]);

        this.bobber.setVisible(false);
        this.config.onCatchSuccess?.({ name: fish.name, rarity: fish.rarity });

        // Hide celebration and return to idle after delay
        this.time.delayedCall(3500, () => {
            this.celebrationManager.hide(() => {
                this.setPhase('IDLE');
            });
        });
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
