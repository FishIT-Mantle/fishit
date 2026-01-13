import Phaser from 'phaser';
import { GAME_CONFIG } from './data';

/**
 * WaitingManager - Handles the "Waiting for Bite" phase
 * 
 * Features:
 * - Visual "LURE" button that player can tap
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

    // Visual state
    private pulseIntensity: number = 0;

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
        const radius = 70;

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

        // Make button interactive
        this.lureButton.setInteractive(
            new Phaser.Geom.Circle(cx, cy, radius),
            Phaser.Geom.Circle.Contains
        );

        this.lureButton.on('pointerdown', () => {
            this.lure();
        });
    }

    public start(onStrike?: () => void) {
        this.isActive = true;
        this.onStrike = onStrike;

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
     * Tap-to-Lure: Called when player taps the lure button
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

        const { width, height } = this.scene.scale;
        const cx = width / 2;
        const cy = height * 0.75;
        const radius = 70;

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

        // Update visuals
        this.updateVisuals(cx, cy, radius);
    }

    private updateVisuals(cx: number, cy: number, radius: number) {
        // Clear and redraw
        this.glowRing.clear();
        this.lureButton.clear();

        // Glow ring
        const glowAlpha = 0.2 + this.pulseIntensity * 0.3;
        const glowSize = radius + this.pulseIntensity * 20;

        this.glowRing.fillStyle(GAME_CONFIG.SHAKE.RIPPLE_COLOR, glowAlpha);
        this.glowRing.fillCircle(cx, cy, glowSize);

        // Button background
        const buttonAlpha = 0.15 + this.pulseIntensity * 0.15;
        this.lureButton.fillStyle(0xFFFFFF, buttonAlpha);
        this.lureButton.fillCircle(cx, cy, radius);

        // Button border
        const borderWidth = 2 + this.pulseIntensity * 2;
        const borderAlpha = 0.5 + this.pulseIntensity * 0.3;
        this.lureButton.lineStyle(borderWidth, 0xFFFFFF, borderAlpha);
        this.lureButton.strokeCircle(cx, cy, radius);

        // Update text position
        this.lureText.setPosition(cx, cy);
        this.timerText.setPosition(cx, cy + 55);
    }

    public stop() {
        this.isActive = false;
        this.lureButton.setVisible(false);
        this.lureText.setVisible(false);
        this.glowRing.setVisible(false);
        this.timerText.setVisible(false);

        // Kill tweens
        this.scene.tweens.killTweensOf(this.lureButton);
        this.scene.tweens.killTweensOf(this.lureText);
    }
}
