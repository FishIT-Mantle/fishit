import Phaser from 'phaser';
import { GAME_CONFIG } from './data';

export class WaitingManager {
    private scene: Phaser.Scene;
    private shakeButton!: Phaser.GameObjects.Graphics;
    private shakeText!: Phaser.GameObjects.Text;
    private glowRing!: Phaser.GameObjects.Graphics;
    private shakeIntensity: number = 0;
    private lastMouseX: number = 0;
    private lastMouseY: number = 0;
    private isActive: boolean = false;
    private onShakeComplete?: () => void;

    // Visual particles


    constructor(scene: Phaser.Scene) {
        this.scene = scene;
        this.setupVisuals();
    }

    private setupVisuals() {
        const { width, height } = this.scene.scale;
        const cx = width / 2;
        const cy = height / 2;
        const radius = 80;

        // 1. Glow Ring (Pulse Effect)
        this.glowRing = this.scene.add.graphics();
        this.glowRing.setDepth(10);
        this.glowRing.setVisible(false);

        // 2. Main Button Circle (Glassmorphism style)
        this.shakeButton = this.scene.add.graphics();
        this.shakeButton.fillStyle(GAME_CONFIG.SHAKE.BUTTON_COLOR, 0.15);
        this.shakeButton.fillCircle(cx, cy, radius);
        this.shakeButton.lineStyle(2, 0xFFFFFF, 0.5);
        this.shakeButton.strokeCircle(cx, cy, radius);
        this.shakeButton.setDepth(11);
        this.shakeButton.setVisible(false);

        // 3. Text
        this.shakeText = this.scene.add.text(cx, cy, 'SHAKE', {
            fontSize: '32px',
            fontFamily: 'Arial', // Will use custom font if loaded
            fontStyle: 'bold',
            color: '#FFFFFF'
        }).setOrigin(0.5).setDepth(12).setVisible(false);
    }

    public start(onComplete?: () => void) {
        this.isActive = true;
        this.shakeIntensity = 0;
        this.onShakeComplete = onComplete;

        // Show UI
        this.shakeButton.setVisible(true);
        this.shakeText.setVisible(true);
        this.glowRing.setVisible(true);

        // Reset mouse tracking
        this.lastMouseX = this.scene.input.x;
        this.lastMouseY = this.scene.input.y;

        // Pulse animation (Idle)
        this.scene.tweens.add({
            targets: [this.shakeButton, this.shakeText],
            scale: { from: 1, to: 1.05 },
            alpha: { from: 0.8, to: 1 },
            duration: 800,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
    }

    public update(time: number, delta: number) {
        if (!this.isActive) return;

        const { width, height } = this.scene.scale;

        // Use activePointer to support both mouse and touch
        const pointer = this.scene.input.activePointer;
        const mouseX = pointer.x;
        const mouseY = pointer.y;

        const dx = Math.abs(mouseX - this.lastMouseX);
        const dy = Math.abs(mouseY - this.lastMouseY);
        const movement = dx + dy;

        this.lastMouseX = mouseX;
        this.lastMouseY = mouseY;

        // 2. Accumulate Intensity if moving fast
        if (movement > 5) {
            this.shakeIntensity += movement * 0.008; // Increased sensitivity

            // Add subtle camera shake for "feel"
            if (Math.random() > 0.8) {
                this.scene.cameras.main.shake(50, 0.005);
            }
        }

        // 3. Decay Intensity automatically
        this.shakeIntensity *= GAME_CONFIG.SHAKE.DECAY;

        // Clamp
        if (this.shakeIntensity > GAME_CONFIG.SHAKE.MAX_INTENSITY) {
            this.shakeIntensity = GAME_CONFIG.SHAKE.MAX_INTENSITY;
        }

        // 4. Update Visuals based on Intensity
        // Move UI lower to avoid overlap (height * 0.75)
        this.updateVisuals(width / 2, height * 0.75);
    }

    private updateVisuals(cx: number, cy: number) {
        const radius = 80;

        // Update positions
        this.shakeButton.setPosition(0, 0); // Reset generic pos to draw relative or absolute
        // Actually graphics are drawn at 0,0 usually, we need to clear and redraw at cx, cy

        // Glow Intensity
        const alpha = Math.min(0.8, this.shakeIntensity * 0.6); // Increased glow alpha
        this.glowRing.clear();

        // Outer Glow
        this.glowRing.fillStyle(GAME_CONFIG.SHAKE.RIPPLE_COLOR, alpha * 0.5);
        this.glowRing.fillCircle(cx, cy, radius + (this.shakeIntensity * 30));

        // Inner Core
        this.glowRing.fillStyle(0xFFFFFF, alpha);
        this.glowRing.fillCircle(cx, cy, radius);

        this.shakeButton.clear();
        this.shakeButton.fillStyle(GAME_CONFIG.SHAKE.BUTTON_COLOR, 0.15 + (this.shakeIntensity * 0.2));
        this.shakeButton.fillCircle(cx, cy, radius);
        this.shakeButton.lineStyle(2 + (this.shakeIntensity * 2), 0xFFFFFF, 0.5 + (this.shakeIntensity * 0.5));
        this.shakeButton.strokeCircle(cx, cy, radius);

        // Shake Text Bounce
        if (this.shakeIntensity > 0.2) {
            const jitterX = (Math.random() - 0.5) * this.shakeIntensity * 10;
            const jitterY = (Math.random() - 0.5) * this.shakeIntensity * 10;
            this.shakeText.setPosition(cx + jitterX, cy + jitterY);
            this.shakeText.setScale(1 + this.shakeIntensity * 0.2);
            this.shakeText.setText("SHAKE IT!");
        } else {
            this.shakeText.setPosition(cx, cy);
            this.shakeText.setScale(1);
            this.shakeText.setText("SHAKE");
        }
    }

    public stop() {
        this.isActive = false;
        this.shakeButton.setVisible(false);
        this.shakeText.setVisible(false);
        this.glowRing.setVisible(false);

        // Cleanup tweens
        this.scene.tweens.killTweensOf(this.shakeButton);
        this.scene.tweens.killTweensOf(this.shakeText);
    }
}
