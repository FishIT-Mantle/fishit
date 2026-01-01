import Phaser from 'phaser';

// Game States
export type GamePhase = 'IDLE' | 'CASTING' | 'WAITING' | 'STRIKE' | 'REELING' | 'CAUGHT' | 'FAILED';

export interface MainSceneConfig {
    backgroundUrl: string;
    boatUrl: string;
    rodUrl: string;
    onPhaseChange?: (phase: GamePhase) => void;
    onCatchSuccess?: (fishData: { name: string; rarity: string }) => void;
    onCatchFail?: () => void;
}

export class MainScene extends Phaser.Scene {
    private config!: MainSceneConfig;
    private currentPhase: GamePhase = 'IDLE';

    // Game Objects
    private boat!: Phaser.GameObjects.Image;
    private rod!: Phaser.GameObjects.Image;
    private bobber!: Phaser.GameObjects.Graphics;
    private strikeIndicator!: Phaser.GameObjects.Text;
    private waterOverlay!: Phaser.GameObjects.Graphics;
    private cloudsOverlay!: Phaser.GameObjects.Graphics;

    // Reeling Mini-game
    private tensionBar!: Phaser.GameObjects.Graphics;
    private fishIcon!: Phaser.GameObjects.Graphics;
    private reelZone!: Phaser.GameObjects.Graphics;
    private catchProgress: number = 0;
    private fishTargetX: number = 0;
    private fishDirection: number = 1;
    private fishSpeed: number = 2;

    // Timers
    private waitTimer?: Phaser.Time.TimerEvent;
    private strikeTimer?: Phaser.Time.TimerEvent;

    // Bobber position
    private bobberX: number = 0;
    private bobberY: number = 0;

    constructor() {
        super({ key: 'MainScene' });
    }

    init(data: MainSceneConfig) {
        this.config = data;
    }

    preload() {
        // Load assets dynamically from props
        this.load.image('background', this.config.backgroundUrl);
        this.load.image('boat', this.config.boatUrl);
        this.load.image('rod', this.config.rodUrl);
    }

    create() {
        const { width, height } = this.scale;

        // --- BACKGROUND (Layer 0) ---
        const bg = this.add.image(width / 2, height / 2, 'background');
        bg.setDisplaySize(width, height);
        bg.setDepth(0);

        // --- CLOUDS OVERLAY (Layer 0.5 - subtle parallax effect) ---
        this.createCloudsOverlay();

        // --- WATER SHIMMER EFFECT (Layer 1 - visible wave animation) ---
        this.createWaterShimmer();

        // --- BOAT (Layer 2 - Canoe view, moderate size at bottom) ---
        this.boat = this.add.image(width / 2, height + 30, 'boat');
        this.boat.setOrigin(0.5, 1);
        const boatTargetWidth = width * 0.55;
        const boatScale = boatTargetWidth / this.boat.width;
        this.boat.setScale(boatScale);
        this.boat.setDepth(2);

        // Boat gentle bobbing
        this.tweens.add({
            targets: this.boat,
            y: this.boat.y - 4,
            duration: 2500,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        // --- ROD (Layer 3 - CENTERED on top of boat) ---
        // Rod positioned center-right, above the boat deck
        const rodX = width / 2 + 50; // Slightly right of center
        const rodY = height - 80; // Above boat deck area
        this.rod = this.add.image(rodX, rodY, 'rod');
        this.rod.setOrigin(0.5, 1);
        // Scale rod to ~45% of viewport height
        const rodTargetHeight = height * 0.45;
        const rodScale = rodTargetHeight / this.rod.height;
        this.rod.setScale(rodScale);
        this.rod.setRotation(-0.15); // Angled slightly to the right
        this.rod.setDepth(3);

        // Rod gentle sway animation
        this.tweens.add({
            targets: this.rod,
            rotation: -0.08,
            duration: 2000,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        // --- PROCEDURAL BOBBER (Layer 4 - Hidden initially) ---
        this.bobber = this.add.graphics();
        this.bobber.setDepth(4);
        this.drawBobber(0, 0);
        this.bobber.setVisible(false);

        // --- STRIKE INDICATOR (Layer 5) ---
        this.strikeIndicator = this.add.text(0, 0, '!', {
            fontSize: '64px',
            fontFamily: 'Arial Black',
            color: '#FFD700',
            stroke: '#000000',
            strokeThickness: 6
        });
        this.strikeIndicator.setOrigin(0.5);
        this.strikeIndicator.setVisible(false);
        this.strikeIndicator.setDepth(5);

        // --- TENSION BAR GRAPHICS (Layer 6 - Hidden initially) ---
        this.tensionBar = this.add.graphics();
        this.fishIcon = this.add.graphics();
        this.reelZone = this.add.graphics();
        this.tensionBar.setDepth(6);
        this.fishIcon.setDepth(6);
        this.reelZone.setDepth(6);
        this.tensionBar.setVisible(false);
        this.fishIcon.setVisible(false);
        this.reelZone.setVisible(false);

        // --- INPUT ---
        this.input.on('pointerdown', this.handleClick, this);

        this.setPhase('IDLE');
    }

    private createCloudsOverlay() {
        const { width, height } = this.scale;
        this.cloudsOverlay = this.add.graphics();
        this.cloudsOverlay.setAlpha(0.15); // Very subtle
        this.cloudsOverlay.setDepth(0.5);
    }

    private createWaterShimmer() {
        const { width, height } = this.scale;
        this.waterOverlay = this.add.graphics();
        this.waterOverlay.setAlpha(0.6); // More visible
        this.waterOverlay.setDepth(1);
    }

    private drawBobber(x: number, y: number) {
        this.bobber.clear();

        // Red portion
        this.bobber.fillStyle(0xff0000);
        this.bobber.fillCircle(x, y - 8, 12);

        // White portion 
        this.bobber.fillStyle(0xffffff);
        this.bobber.fillCircle(x, y + 8, 12);

        // Center line
        this.bobber.fillStyle(0x000000);
        this.bobber.fillRect(x - 2, y - 20, 4, 10);
    }

    update(time: number, delta: number) {
        // Cloud parallax animation
        this.updateCloudsOverlay(time);

        // Water wave animation
        this.updateWaterShimmer(time);

        // Reeling mini-game logic
        if (this.currentPhase === 'REELING') {
            this.updateReelingMinigame(delta);
        }
    }

    private updateCloudsOverlay(time: number) {
        const { width, height } = this.scale;
        this.cloudsOverlay.clear();

        // Subtle moving cloud shadows/highlights
        const cloudLayerY = height * 0.15;
        const cloudSpeed = time * 0.008;

        for (let i = 0; i < 5; i++) {
            const x = ((i * 250 + cloudSpeed) % (width + 300)) - 150;
            const y = cloudLayerY + Math.sin(time / 4000 + i * 2) * 10;
            const size = 80 + i * 20;

            // Very subtle cloud highlight
            this.cloudsOverlay.fillStyle(0xFFFFFF, 0.08 + Math.sin(time / 3000 + i) * 0.03);
            this.cloudsOverlay.fillEllipse(x, y, size * 2, size * 0.5);
            this.cloudsOverlay.fillEllipse(x + size * 0.5, y + 8, size * 1.5, size * 0.4);
        }
    }

    private updateWaterShimmer(time: number) {
        const { width, height } = this.scale;
        // Water zone: from horizon (50%) to before boat (75%)
        const waterStartY = height * 0.50;
        const waterEndY = height * 0.75;

        this.waterOverlay.clear();

        // Draw visible wave ripples in water zone
        for (let i = 0; i < 8; i++) {
            const baseY = waterStartY + (i / 8) * (waterEndY - waterStartY);
            const yOffset = Math.sin((time / 800) + i * 0.7) * 4;
            const lineY = baseY + yOffset;

            if (lineY < waterStartY || lineY > waterEndY) continue;

            // Opacity increases toward bottom (perspective)
            const depthFactor = (lineY - waterStartY) / (waterEndY - waterStartY);
            const baseOpacity = 0.08 + depthFactor * 0.15;
            const opacity = baseOpacity + Math.sin(time / 600 + i * 0.4) * 0.05;

            // Primary wave - light blue
            this.waterOverlay.lineStyle(2 + depthFactor * 2, 0x87CEEB, opacity);
            this.waterOverlay.beginPath();

            for (let x = -50; x < width + 50; x += 15) {
                const waveAmplitude = 3 + depthFactor * 5;
                const waveFreq = 40 - depthFactor * 15;
                const waveY = lineY + Math.sin((x / waveFreq) + (time / 400) + i * 0.6) * waveAmplitude;
                if (x === -50) {
                    this.waterOverlay.moveTo(x, waveY);
                } else {
                    this.waterOverlay.lineTo(x, waveY);
                }
            }
            this.waterOverlay.strokePath();

            // Secondary wave highlight - white sparkle
            if (i % 2 === 0) {
                this.waterOverlay.lineStyle(1, 0xFFFFFF, opacity * 0.5);
                this.waterOverlay.beginPath();
                for (let x = -50; x < width + 50; x += 15) {
                    const waveY = lineY + 2 + Math.sin((x / 35) + (time / 350) + i * 0.8) * 3;
                    if (x === -50) {
                        this.waterOverlay.moveTo(x, waveY);
                    } else {
                        this.waterOverlay.lineTo(x, waveY);
                    }
                }
                this.waterOverlay.strokePath();
            }
        }
    }



    // --- PHASE MANAGEMENT ---
    private setPhase(phase: GamePhase) {
        this.currentPhase = phase;
        this.config.onPhaseChange?.(phase);
    }

    // --- PUBLIC: Trigger Cast from React ---
    public castLine() {
        if (this.currentPhase !== 'IDLE') return;
        this.startCasting();
    }

    private handleClick() {
        if (this.currentPhase === 'STRIKE') {
            // Player clicked in time! Start reeling.
            this.strikeTimer?.destroy();
            this.startReeling();
        }
    }

    // --- CASTING PHASE ---
    private startCasting() {
        this.setPhase('CASTING');
        const { width, height } = this.scale;

        // Rod swing animation
        this.tweens.add({
            targets: this.rod,
            rotation: 0.3,
            duration: 200,
            yoyo: true,
            onComplete: () => {
                this.launchBobber();
            }
        });
    }

    private launchBobber() {
        const { width, height } = this.scale;

        // Random landing spot in water area
        this.bobberX = Phaser.Math.Between(width * 0.2, width * 0.8);
        this.bobberY = Phaser.Math.Between(height * 0.6, height * 0.75);

        // Start position (from rod tip approximation)
        const startX = this.rod.x + 30;
        const startY = this.rod.y - 100;

        this.bobber.setPosition(startX, startY);
        this.bobber.setVisible(true);
        this.bobber.setAlpha(1);

        // Parabolic arc tween
        this.tweens.add({
            targets: this.bobber,
            x: this.bobberX,
            y: this.bobberY,
            duration: 800,
            ease: 'Quad.easeOut',
            onComplete: () => {
                this.createSplash();
                this.startWaiting();
            }
        });
    }

    private createSplash() {
        // Particle effect for splash
        const particles = this.add.particles(this.bobberX, this.bobberY, undefined, {
            speed: { min: 50, max: 150 },
            angle: { min: 220, max: 320 },
            lifespan: 400,
            quantity: 15,
            scale: { start: 0.5, end: 0 },
            tint: [0x87CEEB, 0xFFFFFF, 0x00CED1],
            emitting: false
        });

        particles.explode(15);

        // Auto destroy
        this.time.delayedCall(500, () => particles.destroy());
    }

    // --- WAITING PHASE ---
    private startWaiting() {
        this.setPhase('WAITING');

        // Bobber bobbing animation
        this.tweens.add({
            targets: this.bobber,
            y: this.bobberY - 5,
            duration: 600,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        // Random wait time 2-5 seconds
        const waitTime = Phaser.Math.Between(2000, 5000);
        this.waitTimer = this.time.delayedCall(waitTime, () => {
            this.triggerStrike();
        });
    }

    // --- STRIKE PHASE ---
    private triggerStrike() {
        this.setPhase('STRIKE');

        // Camera shake
        this.cameras.main.shake(200, 0.01);

        // Show "!" indicator
        this.strikeIndicator.setPosition(this.bobberX, this.bobberY - 50);
        this.strikeIndicator.setVisible(true);
        this.strikeIndicator.setScale(0);

        this.tweens.add({
            targets: this.strikeIndicator,
            scale: 1,
            duration: 150,
            ease: 'Back.easeOut'
        });

        // Bobber dunk animation
        this.tweens.killTweensOf(this.bobber);
        this.tweens.add({
            targets: this.bobber,
            y: this.bobberY + 20,
            duration: 100,
            yoyo: true,
            repeat: 3
        });

        // Player must click within 1.5 seconds
        this.strikeTimer = this.time.delayedCall(1500, () => {
            this.failCatch();
        });
    }

    // --- REELING PHASE (Mini-game) ---
    private startReeling() {
        this.setPhase('REELING');
        this.strikeIndicator.setVisible(false);

        this.catchProgress = 0;
        this.fishTargetX = this.scale.width / 2;
        this.fishDirection = 1;
        this.fishSpeed = Phaser.Math.Between(2, 4);

        // Show tension bar UI
        this.tensionBar.setVisible(true);
        this.fishIcon.setVisible(true);
        this.reelZone.setVisible(true);

        // Rod vibration
        this.tweens.add({
            targets: this.rod,
            rotation: { from: -0.1, to: 0.1 },
            duration: 50,
            yoyo: true,
            repeat: -1
        });
    }

    private updateReelingMinigame(delta: number) {
        const { width, height } = this.scale;
        const barWidth = 400;
        const barHeight = 40;
        const barX = (width - barWidth) / 2;
        const barY = 80;

        // Move fish randomly
        this.fishTargetX += this.fishDirection * this.fishSpeed;
        if (this.fishTargetX > barX + barWidth - 40) {
            this.fishDirection = -1;
            this.fishSpeed = Phaser.Math.Between(2, 5);
        } else if (this.fishTargetX < barX + 40) {
            this.fishDirection = 1;
            this.fishSpeed = Phaser.Math.Between(2, 5);
        }

        // Reel zone follows mouse X
        const pointer = this.input.activePointer;
        const reelX = Phaser.Math.Clamp(pointer.x, barX + 30, barX + barWidth - 30);

        // Check overlap
        const fishLeft = this.fishTargetX - 20;
        const fishRight = this.fishTargetX + 20;
        const reelLeft = reelX - 40;
        const reelRight = reelX + 40;

        const isOverlapping = fishRight > reelLeft && fishLeft < reelRight;

        if (isOverlapping) {
            this.catchProgress += delta * 0.05;
        } else {
            this.catchProgress -= delta * 0.03;
        }
        this.catchProgress = Phaser.Math.Clamp(this.catchProgress, 0, 100);

        // Draw tension bar
        this.tensionBar.clear();
        this.tensionBar.fillStyle(0x000000, 0.7);
        this.tensionBar.fillRoundedRect(barX, barY, barWidth, barHeight, 10);

        // Progress fill
        const progressWidth = (this.catchProgress / 100) * barWidth;
        this.tensionBar.fillStyle(isOverlapping ? 0x00FF00 : 0xFF6600, 0.8);
        this.tensionBar.fillRoundedRect(barX, barY, progressWidth, barHeight, 10);

        // Border
        this.tensionBar.lineStyle(3, 0xFFFFFF, 1);
        this.tensionBar.strokeRoundedRect(barX, barY, barWidth, barHeight, 10);

        // Draw fish icon
        this.fishIcon.clear();
        this.fishIcon.fillStyle(0xFFD700);
        this.fishIcon.fillCircle(this.fishTargetX, barY + barHeight / 2, 15);
        this.fishIcon.lineStyle(2, 0x000000);
        this.fishIcon.strokeCircle(this.fishTargetX, barY + barHeight / 2, 15);

        // Draw reel zone
        this.reelZone.clear();
        this.reelZone.lineStyle(4, isOverlapping ? 0x00FF00 : 0xFFFFFF, 1);
        this.reelZone.strokeRect(reelX - 40, barY - 5, 80, barHeight + 10);

        // Check win/lose
        if (this.catchProgress >= 100) {
            this.successCatch();
        }
    }

    // --- OUTCOMES ---
    private successCatch() {
        this.setPhase('CAUGHT');
        this.cleanupReelingUI();

        // Generate random fish
        const fishTypes = [
            { name: 'Common Trout', rarity: 'Common' },
            { name: 'Silver Bass', rarity: 'Uncommon' },
            { name: 'Golden Carp', rarity: 'Rare' },
            { name: 'Crystal Swordfish', rarity: 'Epic' }
        ];
        const fish = Phaser.Utils.Array.GetRandom(fishTypes);

        this.config.onCatchSuccess?.(fish);

        // Reset after delay
        this.time.delayedCall(1500, () => this.resetGame());
    }

    private failCatch() {
        this.setPhase('FAILED');
        this.strikeIndicator.setVisible(false);
        this.cleanupReelingUI();

        // Pull bobber back
        this.tweens.add({
            targets: this.bobber,
            x: this.rod.x,
            y: this.rod.y - 50,
            alpha: 0,
            duration: 500,
            onComplete: () => {
                this.bobber.setVisible(false);
            }
        });

        this.config.onCatchFail?.();

        // Reset after delay
        this.time.delayedCall(1000, () => this.resetGame());
    }

    private cleanupReelingUI() {
        this.tensionBar.setVisible(false);
        this.fishIcon.setVisible(false);
        this.reelZone.setVisible(false);
        this.tweens.killTweensOf(this.rod);

        // Reset rod
        this.tweens.add({
            targets: this.rod,
            rotation: -0.2,
            duration: 300
        });
    }

    private resetGame() {
        this.bobber.setVisible(false);
        this.strikeIndicator.setVisible(false);
        this.catchProgress = 0;
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
