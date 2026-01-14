import Phaser from 'phaser';
import { GAME_CONFIG } from './data';

/**
 * WaitingManager - Handles the "Waiting for Bite" phase
 * 
 * Features:
 * - Visual "LURE" button that player can tap
 * - Moving button: slides to random position on tap
 * - Difficulty scaling: movement speed increases over time
 * - Tap-to-lure: reduces wait time and plays rod twitch animation
 * - Timer-based fish arrival (simulates VRF delay)
 * - Glow ring visual feedback
 */
export class WaitingManager {
    private scene: Phaser.Scene;

    // UI Elements
    private lureButton!: Phaser.GameObjects.Graphics;
    private lureText!: Phaser.GameObjects.Text;
    private glowRing!: Phaser.GameObjects.Graphics;
    private timerText!: Phaser.GameObjects.Text;

    // State
    private isActive: boolean = false;
    private waitTimer: number = 0;
    private maxWaitTime: number = 6000; // 6 seconds max
    private minWaitTime: number = 2000; // 2 seconds min
    private lureBonus: number = 500;    // 0.5 seconds per lure tap
    private lureCooldown: number = 0;
    private lureCooldownMax: number = 300; // 300ms between taps

    // Moving button state
    private buttonX: number = 0;
    private buttonY: number = 0;
    private targetX: number = 0;
    private targetY: number = 0;
    private isMoving: boolean = false;
    private moveSpeed: number = 0.08;        // Base lerp speed (0-1)
    private elapsedTime: number = 0;         // Time since start (for difficulty scaling)
    private readonly BUTTON_RADIUS: number = 70;
    private readonly MIN_MOVE_DISTANCE: number = 100;  // Min distance to move
    private readonly MAX_MOVE_SPEED: number = 0.25;    // Max lerp speed at hardest

    // Visual state
    private pulseIntensity: number = 0;
    private buttonScale: number = 1;

    // Callback
    private onStrike?: () => void;

    constructor(scene: Phaser.Scene) {
        this.scene = scene;
        this.setupVisuals();
    }

    private setupVisuals() {
        const { width, height } = this.scene.scale;
        const cx = width / 2;
        const cy = height * 0.75;

        // Initialize position
        this.buttonX = cx;
        this.buttonY = cy;
        this.targetX = cx;
        this.targetY = cy;

        // Glow Ring
        this.glowRing = this.scene.add.graphics();
        this.glowRing.setDepth(10);
        this.glowRing.setVisible(false);

        // Main Button
        this.lureButton = this.scene.add.graphics();
        this.lureButton.setDepth(11);
        this.lureButton.setVisible(false);

        // Button Text
        this.lureText = this.scene.add.text(cx, cy, 'LURE', {
            fontSize: '28px',
            fontFamily: 'Arial',
            fontStyle: 'bold',
            color: '#FFFFFF'
        }).setOrigin(0.5).setDepth(12).setVisible(false);

        // Timer Text (shows remaining time)
        this.timerText = this.scene.add.text(cx, cy + 60, '', {
            fontSize: '16px',
            fontFamily: 'Arial',
            color: '#FFFFFF'
        }).setOrigin(0.5).setDepth(12).setVisible(false).setAlpha(0.7);

        // Make button interactive (we'll update hitbox position in updateVisuals)
        this.lureButton.setInteractive(
            new Phaser.Geom.Circle(cx, cy, this.BUTTON_RADIUS),
            Phaser.Geom.Circle.Contains
        );

        this.lureButton.on('pointerdown', () => {
            this.lure();
        });
    }

    public start(onStrike?: () => void) {
        this.isActive = true;
        this.onStrike = onStrike;
        this.elapsedTime = 0;
        this.buttonScale = 1;
        this.isMoving = false;

        const { width, height } = this.scene.scale;

        // Reset button to center
        this.buttonX = width / 2;
        this.buttonY = height * 0.75;
        this.targetX = this.buttonX;
        this.targetY = this.buttonY;

        // Random wait time
        this.waitTimer = Phaser.Math.Between(this.minWaitTime, this.maxWaitTime);
        this.lureCooldown = 0;
        this.pulseIntensity = 0;

        // Show UI
        this.lureButton.setVisible(true);
        this.lureText.setVisible(true);
        this.glowRing.setVisible(true);
        this.timerText.setVisible(true);

        // Idle pulse animation
        this.scene.tweens.add({
            targets: { val: 0 },
            val: 1,
            duration: 1000,
            yoyo: true,
            repeat: -1,
            onUpdate: (tween) => {
                const val = tween.getValue();
                if (val !== null) {
                    this.pulseIntensity = val * 0.3;
                }
            }
        });
    }

    /**
     * Get a random position within safe bounds
     */
    private getRandomPosition(): { x: number; y: number } {
        const { width, height } = this.scene.scale;

        // Safe area margins
        const marginX = 120;
        const marginTop = height * 0.4;    // Don't go too high (avoid UI)
        const marginBottom = 120;

        let newX: number;
        let newY: number;
        let distance: number;
        let attempts = 0;

        // Keep trying until we get a position far enough away
        do {
            newX = Phaser.Math.Between(marginX, width - marginX);
            newY = Phaser.Math.Between(marginTop, height - marginBottom);
            distance = Phaser.Math.Distance.Between(this.buttonX, this.buttonY, newX, newY);
            attempts++;
        } while (distance < this.MIN_MOVE_DISTANCE && attempts < 10);

        return { x: newX, y: newY };
    }

    /**
     * Calculate current move speed based on elapsed time (difficulty scaling)
     */
    private getCurrentMoveSpeed(): number {
        // Speed increases over time: starts slow, gets faster
        const maxTime = 10000; // 10 seconds to reach max speed
        const progress = Math.min(this.elapsedTime / maxTime, 1);

        // Eased progression (slower at start, faster increase later)
        const easedProgress = progress * progress;

        return this.moveSpeed + (this.MAX_MOVE_SPEED - this.moveSpeed) * easedProgress;
    }

    /**
     * Tap-to-Lure: Called when player taps the lure button
     * - Moves button to new random position
     * - Reduces wait timer
     * - Plays rod twitch animation
     * - Emits splash particles
     */
    public lure() {
        if (!this.isActive || this.lureCooldown > 0) return;

        // Reduce wait time
        this.waitTimer -= this.lureBonus;
        if (this.waitTimer < 0) this.waitTimer = 0;

        // Set cooldown
        this.lureCooldown = this.lureCooldownMax;

        // === MOVING BUTTON FEATURE ===
        // 1. Shrink animation (anticipation)
        this.scene.tweens.add({
            targets: this,
            buttonScale: 0.7,
            duration: 80,
            ease: 'Power2.easeIn',
            onComplete: () => {
                // 2. Set new target position
                const newPos = this.getRandomPosition();
                this.targetX = newPos.x;
                this.targetY = newPos.y;
                this.isMoving = true;
            }
        });

        // Visual feedback - button pulse
        this.pulseIntensity = 1.5;
        this.scene.tweens.add({
            targets: { val: this.pulseIntensity },
            val: 0.3,
            duration: 200,
            onUpdate: (tween) => {
                const val = tween.getValue();
                if (val !== null) {
                    this.pulseIntensity = val;
                }
            }
        });

        // Rod twitch animation (find rod in scene)
        const rod = this.scene.children.getByName('rod') as Phaser.GameObjects.Image;
        if (rod) {
            this.scene.tweens.add({
                targets: rod,
                rotation: rod.rotation - 0.1,
                duration: 100,
                yoyo: true,
                ease: 'Power2'
            });
        }

        // Emit splash at bobber position
        this.emitSplash();

        // Camera shake for feedback
        this.scene.cameras.main.shake(50, 0.003);

        // Update text
        this.lureText.setText('LURE!');
        this.scene.time.delayedCall(200, () => {
            if (this.isActive) {
                this.lureText.setText('LURE');
            }
        });
    }

    private emitSplash() {
        const { width, height } = this.scene.scale;
        const splashX = width / 2;
        const splashY = height * 0.65;

        // Create ripple circles
        for (let i = 0; i < 2; i++) {
            const ripple = this.scene.add.circle(splashX, splashY, 5, 0xFFFFFF, 0.6);
            ripple.setDepth(6.5);
            this.scene.tweens.add({
                targets: ripple,
                scale: 2 + i,
                alpha: 0,
                duration: 300,
                delay: i * 50,
                onComplete: () => ripple.destroy()
            });
        }
    }

    public update(time: number, delta: number) {
        if (!this.isActive) return;

        // Track elapsed time for difficulty scaling
        this.elapsedTime += delta;

        // Update cooldown
        if (this.lureCooldown > 0) {
            this.lureCooldown -= delta;
        }

        // Countdown timer
        this.waitTimer -= delta;

        // Update timer display
        const remaining = Math.max(0, this.waitTimer / 1000);
        this.timerText.setText(`Waiting... ${remaining.toFixed(1)}s`);

        // Check if fish arrived
        if (this.waitTimer <= 0) {
            this.onStrike?.();
            return;
        }

        // === SMOOTH SLIDE MOVEMENT ===
        if (this.isMoving) {
            const speed = this.getCurrentMoveSpeed();

            // Lerp towards target
            this.buttonX = Phaser.Math.Linear(this.buttonX, this.targetX, speed);
            this.buttonY = Phaser.Math.Linear(this.buttonY, this.targetY, speed);

            // Check if arrived
            const distance = Phaser.Math.Distance.Between(
                this.buttonX, this.buttonY,
                this.targetX, this.targetY
            );

            if (distance < 2) {
                this.buttonX = this.targetX;
                this.buttonY = this.targetY;
                this.isMoving = false;

                // 3. Bounce scale on arrival
                this.scene.tweens.add({
                    targets: this,
                    buttonScale: 1.15,
                    duration: 100,
                    ease: 'Power2.easeOut',
                    yoyo: true,
                    onComplete: () => {
                        this.buttonScale = 1;
                    }
                });
            }
        }

        // Update interactive hitbox position
        this.lureButton.input!.hitArea = new Phaser.Geom.Circle(
            this.buttonX,
            this.buttonY,
            this.BUTTON_RADIUS * this.buttonScale
        );

        // Update visuals
        this.updateVisuals();
    }

    private updateVisuals() {
        const radius = this.BUTTON_RADIUS * this.buttonScale;

        // Clear and redraw
        this.glowRing.clear();
        this.lureButton.clear();

        // Glow ring
        const glowAlpha = 0.2 + this.pulseIntensity * 0.3;
        const glowSize = radius + this.pulseIntensity * 20;

        this.glowRing.fillStyle(GAME_CONFIG.SHAKE.RIPPLE_COLOR, glowAlpha);
        this.glowRing.fillCircle(this.buttonX, this.buttonY, glowSize);

        // Button background
        const buttonAlpha = 0.15 + this.pulseIntensity * 0.15;
        this.lureButton.fillStyle(0xFFFFFF, buttonAlpha);
        this.lureButton.fillCircle(this.buttonX, this.buttonY, radius);

        // Button border
        const borderWidth = 2 + this.pulseIntensity * 2;
        const borderAlpha = 0.5 + this.pulseIntensity * 0.3;
        this.lureButton.lineStyle(borderWidth, 0xFFFFFF, borderAlpha);
        this.lureButton.strokeCircle(this.buttonX, this.buttonY, radius);

        // Update text position (follows button)
        this.lureText.setPosition(this.buttonX, this.buttonY);
        this.lureText.setScale(this.buttonScale);

        // Timer stays at bottom center
        const { width, height } = this.scene.scale;
        this.timerText.setPosition(width / 2, height - 60);
    }

    public stop() {
        this.isActive = false;
        this.isMoving = false;
        this.lureButton.setVisible(false);
        this.lureText.setVisible(false);
        this.glowRing.setVisible(false);
        this.timerText.setVisible(false);

        // Kill tweens
        this.scene.tweens.killTweensOf(this.lureButton);
        this.scene.tweens.killTweensOf(this.lureText);
        this.scene.tweens.killTweensOf(this);
    }
}
