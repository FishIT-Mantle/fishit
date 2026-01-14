import Phaser from 'phaser';
import { FishType } from './data';

/**
 * CelebrationManager - Handles catch celebration effects
 * 
 * Features:
 * - Vignette overlay with pulse effect
 * - "PERFECT CATCH!" text with animation
 * - Dummy fish card (placeholder for now)
 */
export class CelebrationManager {
    private scene: Phaser.Scene;

    // Visual Elements
    private overlay!: Phaser.GameObjects.Image;
    private textBox!: Phaser.GameObjects.Graphics;
    private catchText!: Phaser.GameObjects.Text;
    private fishCard!: Phaser.GameObjects.Container;
    private fishCardBg!: Phaser.GameObjects.Graphics;
    private fishCardText!: Phaser.GameObjects.Text;

    // State
    private isActive: boolean = false;
    private currentFish: FishType | null = null;
    private pulseTween: Phaser.Tweens.Tween | null = null;

    constructor(scene: Phaser.Scene) {
        this.scene = scene;
        this.setupVisuals();
    }

    private setupVisuals() {
        const { width, height } = this.scene.scale;

        // === OVERLAY (vignette effect) ===
        this.overlay = this.scene.add.image(width / 2, height / 2, 'celebration_overlay');
        this.overlay.setDepth(100);
        this.overlay.setDisplaySize(width, height);
        this.overlay.setAlpha(0);
        this.overlay.setVisible(false);

        // === TEXT BOX BACKGROUND ===
        this.textBox = this.scene.add.graphics();
        this.textBox.setDepth(101);
        this.textBox.setVisible(false);

        // === "PERFECT CATCH!" TEXT ===
        this.catchText = this.scene.add.text(width / 2, height * 0.35, 'PERFECT CATCH!', {
            fontSize: '32px',
            fontFamily: 'Arial',
            fontStyle: 'bold',
            color: '#FFFFFF',
        }).setOrigin(0.5).setDepth(102).setVisible(false);

        // === FISH CARD (dummy placeholder) ===
        this.fishCard = this.scene.add.container(width / 2, height * 0.55);
        this.fishCard.setDepth(102);
        this.fishCard.setVisible(false);

        // Card background
        this.fishCardBg = this.scene.add.graphics();
        this.fishCard.add(this.fishCardBg);

        // Card text
        this.fishCardText = this.scene.add.text(0, 0, '', {
            fontSize: '20px',
            fontFamily: 'Arial',
            fontStyle: 'bold',
            color: '#FFFFFF',
            align: 'center'
        }).setOrigin(0.5);
        this.fishCard.add(this.fishCardText);
    }

    public show(fish: FishType) {
        if (this.isActive) return;

        this.isActive = true;
        this.currentFish = fish;
        const { width, height } = this.scene.scale;

        // Reset positions
        this.overlay.setPosition(width / 2, height / 2);
        this.overlay.setDisplaySize(width * 1.2, height * 1.2);  // Slightly larger for pulse
        this.catchText.setPosition(width / 2, height * 0.35);
        this.fishCard.setPosition(width / 2, height * 0.55);

        // Draw text box background
        this.textBox.clear();
        const boxWidth = 280;
        const boxHeight = 50;
        const boxX = (width - boxWidth) / 2;
        const boxY = height * 0.35 - boxHeight / 2;
        this.textBox.fillStyle(0x2a2a5a, 0.85);
        this.textBox.fillRoundedRect(boxX, boxY, boxWidth, boxHeight, 25);

        // Draw fish card (dummy)
        this.fishCardBg.clear();
        const cardWidth = 220;
        const cardHeight = 120;
        this.fishCardBg.fillStyle(0x3a3a7a, 0.9);
        this.fishCardBg.fillRoundedRect(-cardWidth / 2, -cardHeight / 2, cardWidth, cardHeight, 16);
        this.fishCardBg.lineStyle(3, 0x6666cc, 1);
        this.fishCardBg.strokeRoundedRect(-cardWidth / 2, -cardHeight / 2, cardWidth, cardHeight, 16);

        this.fishCardText.setText(`🐟 ${fish.name}\n\nRarity: ${fish.rarity}\nValue: ${fish.value} coins`);

        // === ANIMATION SEQUENCE ===

        // 1. Show overlay with fade in
        this.overlay.setVisible(true);
        this.overlay.setAlpha(0);
        this.overlay.setScale(1.1);

        this.scene.tweens.add({
            targets: this.overlay,
            alpha: 1,
            scale: 1,
            duration: 300,
            ease: 'Power2.easeOut'
        });

        // 2. Start pulse effect on overlay
        this.pulseTween = this.scene.tweens.add({
            targets: this.overlay,
            scaleX: 1.02,
            scaleY: 1.02,
            duration: 1500,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        // 3. Show text with slight delay and scale up
        this.scene.time.delayedCall(200, () => {
            this.textBox.setVisible(true);
            this.catchText.setVisible(true);
            this.catchText.setScale(0.8);
            this.catchText.setAlpha(0);

            this.scene.tweens.add({
                targets: this.catchText,
                scale: 1,
                alpha: 1,
                duration: 300,
                ease: 'Back.easeOut'
            });
        });

        // 4. Show fish card with delay
        this.scene.time.delayedCall(500, () => {
            this.fishCard.setVisible(true);
            this.fishCard.setScale(0.8);
            this.fishCard.setAlpha(0);

            this.scene.tweens.add({
                targets: this.fishCard,
                scale: 1,
                alpha: 1,
                duration: 400,
                ease: 'Back.easeOut'
            });
        });
    }

    public hide(callback?: () => void) {
        if (!this.isActive) {
            if (callback) callback();
            return;
        }

        // Stop pulse
        if (this.pulseTween) {
            this.pulseTween.stop();
            this.pulseTween = null;
        }

        // Fade out all elements
        this.scene.tweens.add({
            targets: [this.overlay, this.catchText, this.fishCard],
            alpha: 0,
            duration: 300,
            ease: 'Power2.easeIn',
            onComplete: () => {
                this.overlay.setVisible(false);
                this.textBox.setVisible(false);
                this.catchText.setVisible(false);
                this.fishCard.setVisible(false);
                this.isActive = false;
                if (callback) callback();
            }
        });

        this.textBox.setVisible(false);
    }

    public isShowing(): boolean {
        return this.isActive;
    }
}
