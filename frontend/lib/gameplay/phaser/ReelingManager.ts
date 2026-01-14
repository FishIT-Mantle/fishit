import Phaser from 'phaser';
import { GAME_CONFIG, FishType } from './data';

/**
 * ReelingManager - Asset-Based Reeling UI
 * 
 * Correct Design:
 * - Bar positioned at BOTTOM of screen
 * - Player controls REL (blue box) with mouse to catch fish
 * - INDICATOR (white bar + fish icon) = fish AI that moves randomly
 * - Overlap = catching progress increases
 */
export class ReelingManager {
    private scene: Phaser.Scene;

    // Asset-based UI Elements
    private barBackground!: Phaser.GameObjects.Image;
    private playerZone!: Phaser.GameObjects.Image;     // rel.webp - PLAYER controls
    private fishIndicator!: Phaser.GameObjects.Image;  // indikator.webp - FISH AI

    // Progress UI (kept as graphics for dynamic fill)
    private progressBar!: Phaser.GameObjects.Graphics;
    private fishLabel!: Phaser.GameObjects.Text;
    private instructionText!: Phaser.GameObjects.Text;

    // Game State
    private isActive: boolean = false;
    private catchProgress: number = 0;
    private currentFish: FishType | null = null;

    // Physics State
    private playerX: number = 0;          // Player-controlled (rel.webp)
    private fishX: number = 0;            // Fish AI (indikator.webp)
    private fishVelocity: number = 0;
    private fishTargetVelocity: number = 0;
    private directionChangeTimer: number = 0;

    // Config
    private readonly LERP_FACTOR = 0.12;        // Player zone smoothing
    private readonly FISH_LERP = 0.04;          // Fish movement smoothing
    private readonly BAR_Y_OFFSET = 80;         // Distance from bottom
    private barWidth: number = 0;
    private barCenterY: number = 0;

    constructor(scene: Phaser.Scene) {
        this.scene = scene;
        this.setupVisuals();
    }

    private setupVisuals() {
        const { width, height } = this.scene.scale;

        // Calculate positions
        this.barCenterY = height - this.BAR_Y_OFFSET;

        // === BAR BACKGROUND (bottom layer) ===
        this.barBackground = this.scene.add.image(width / 2, this.barCenterY, 'reeling_bar');
        this.barBackground.setDepth(19);
        this.barBackground.setVisible(false);

        // Scale bar to fit ~85% of screen width
        const targetBarWidth = width * 0.85;
        const barScale = targetBarWidth / this.barBackground.width;
        this.barBackground.setScale(barScale);
        this.barWidth = targetBarWidth;

        // === PLAYER ZONE (rel.webp - blue box, player controls) ===
        this.playerZone = this.scene.add.image(width / 2, this.barCenterY, 'reeling_zone');
        this.playerZone.setDepth(20);
        this.playerZone.setVisible(false);

        // Scale player zone - shorter width for challenge
        const zoneScaleX = 0.15;  // Narrower
        const zoneScaleY = 0.25;
        this.playerZone.setScale(zoneScaleX, zoneScaleY);

        // === FISH INDICATOR (indikator.webp - fish AI) ===
        this.fishIndicator = this.scene.add.image(width / 2, this.barCenterY, 'reeling_indicator');
        this.fishIndicator.setDepth(21);
        this.fishIndicator.setVisible(false);

        // Scale fish indicator
        const indicatorScale = 0.35;
        this.fishIndicator.setScale(indicatorScale);

        // === PROGRESS BAR (top) ===
        this.progressBar = this.scene.add.graphics();
        this.progressBar.setDepth(22);
        this.progressBar.setVisible(false);

        // === FISH LABEL ===
        this.fishLabel = this.scene.add.text(width / 2, 0, '', {
            fontSize: '16px',
            fontFamily: 'Arial',
            fontStyle: 'bold',
            color: '#FFFFFF',
            stroke: '#000000',
            strokeThickness: 3
        }).setOrigin(0.5).setDepth(22).setVisible(false);

        // === INSTRUCTION TEXT ===
        this.instructionText = this.scene.add.text(width / 2, 0, '🎣 Keep the bar on the fish!', {
            fontSize: '18px',
            fontFamily: 'Arial',
            fontStyle: 'bold',
            color: '#FFFFFF',
            backgroundColor: '#00000088',
            padding: { x: 16, y: 8 }
        }).setOrigin(0.5).setDepth(22).setVisible(false);
    }

    public start(fish: FishType) {
        this.isActive = true;
        this.currentFish = fish;
        this.catchProgress = 30; // Start with 30% progress

        const { width, height } = this.scene.scale;
        this.barCenterY = height - this.BAR_Y_OFFSET;

        // Reset positions - center
        this.playerX = width / 2;
        this.fishX = width / 2;
        this.fishVelocity = 0;
        this.fishTargetVelocity = 0;
        this.directionChangeTimer = 0;

        // Update positions
        this.barBackground.setPosition(width / 2, this.barCenterY);
        this.playerZone.setPosition(this.playerX, this.barCenterY);
        this.fishIndicator.setPosition(this.fishX, this.barCenterY);

        // Position labels
        this.instructionText.setPosition(width / 2, this.barCenterY - 80);
        this.fishLabel.setPosition(width / 2, 60);
        this.fishLabel.setText(`${fish.name} - 30%`);

        // Show UI
        this.barBackground.setVisible(true);
        this.playerZone.setVisible(true);
        this.fishIndicator.setVisible(true);
        this.progressBar.setVisible(true);
        this.fishLabel.setVisible(true);
        this.instructionText.setVisible(true);
    }

    public update(delta: number) {
        if (!this.isActive || !this.currentFish) return;

        const { width } = this.scene.scale;
        const deltaSeconds = delta / 1000;

        // --- 1. FISH AI (indikator.webp moves randomly) ---
        this.updateFishAI(width, deltaSeconds);

        // --- 2. PLAYER INPUT (rel.webp follows mouse) ---
        this.updatePlayerInput(width);

        // --- 3. PROGRESS CALCULATION ---
        this.updateProgress(deltaSeconds);

        // --- 4. UPDATE UI POSITIONS ---
        this.updateUI(width);
    }

    private updateFishAI(screenWidth: number, deltaSeconds: number) {
        if (!this.currentFish) return;

        const fish = this.currentFish;

        // Calculate movement bounds based on bar width
        const barLeft = (screenWidth - this.barWidth) / 2 + 80;
        const barRight = screenWidth - (screenWidth - this.barWidth) / 2 - 80;

        // Direction change timer
        this.directionChangeTimer -= deltaSeconds;

        if (this.directionChangeTimer <= 0) {
            const baseSpeed = Phaser.Math.FloatBetween(fish.speedConfig[0], fish.speedConfig[1]);
            const direction = Math.random() > 0.5 ? 1 : -1;

            let speed = baseSpeed;
            if (Math.random() < fish.aggression) {
                speed *= 2.5; // Dash!
            }

            this.fishTargetVelocity = direction * speed * 60;
            this.directionChangeTimer = Phaser.Math.FloatBetween(0.4, 1.2);
        }

        // Smooth velocity
        this.fishVelocity = Phaser.Math.Linear(this.fishVelocity, this.fishTargetVelocity, this.FISH_LERP);
        this.fishX += this.fishVelocity * deltaSeconds;

        // Bounce at edges
        if (this.fishX < barLeft) {
            this.fishX = barLeft;
            this.fishTargetVelocity = Math.abs(this.fishTargetVelocity);
            this.fishVelocity = Math.abs(this.fishVelocity) * 0.5;
        } else if (this.fishX > barRight) {
            this.fishX = barRight;
            this.fishTargetVelocity = -Math.abs(this.fishTargetVelocity);
            this.fishVelocity = -Math.abs(this.fishVelocity) * 0.5;
        }
    }

    private updatePlayerInput(screenWidth: number) {
        const pointer = this.scene.input.activePointer;
        const mouseX = pointer.x;

        // Calculate bounds
        const barLeft = (screenWidth - this.barWidth) / 2 + 50;
        const barRight = screenWidth - (screenWidth - this.barWidth) / 2 - 50;
        const targetX = Phaser.Math.Clamp(mouseX, barLeft, barRight);

        // Smooth lerp
        this.playerX = Phaser.Math.Linear(this.playerX, targetX, this.LERP_FACTOR);
    }

    private updateProgress(deltaSeconds: number) {
        // Overlap detection: player zone should contain fish
        const playerHalfWidth = (this.playerZone.displayWidth / 2) * 0.8;

        const playerLeft = this.playerX - playerHalfWidth;
        const playerRight = this.playerX + playerHalfWidth;

        // Fish center should be within player zone for catching
        const isOverlapping = this.fishX > playerLeft && this.fishX < playerRight;

        // Progress rates
        const tensionGain = GAME_CONFIG.REEL.TENSION_GAIN * 60;
        const tensionLoss = GAME_CONFIG.REEL.TENSION_LOSS * 60;

        if (isOverlapping) {
            this.catchProgress += tensionGain * deltaSeconds;
            // No visual change on assets - progress bar provides feedback
        } else {
            this.catchProgress -= tensionLoss * deltaSeconds;
        }

        this.catchProgress = Phaser.Math.Clamp(this.catchProgress, 0, 100);
    }

    private updateUI(screenWidth: number) {
        // Update image positions
        this.playerZone.setPosition(this.playerX, this.barCenterY);
        this.fishIndicator.setPosition(this.fishX, this.barCenterY);

        // Update fish label
        this.fishLabel.setText(`${this.currentFish?.name || 'Fish'} - ${Math.round(this.catchProgress)}%`);

        // Draw progress bar at top
        this.progressBar.clear();

        const barWidth = 300;
        const barHeight = 20;
        const barX = (screenWidth - barWidth) / 2;
        const barY = 30;

        // Background
        this.progressBar.fillStyle(0x000000, 0.6);
        this.progressBar.fillRoundedRect(barX - 3, barY - 3, barWidth + 6, barHeight + 6, 12);

        // Fill
        const fillWidth = (this.catchProgress / 100) * barWidth;
        let fillColor = 0x00FF00;  // Green
        if (this.catchProgress < 30) {
            fillColor = 0xFF4444;  // Red - danger
        } else if (this.catchProgress < 60) {
            fillColor = 0xFFAA00;  // Orange - warning
        }

        this.progressBar.fillStyle(fillColor, 1);
        this.progressBar.fillRoundedRect(barX, barY, fillWidth, barHeight, 10);
    }

    public getProgress(): number {
        return this.catchProgress;
    }

    public stop() {
        this.isActive = false;
        this.barBackground.setVisible(false);
        this.playerZone.setVisible(false);
        this.fishIndicator.setVisible(false);
        this.progressBar.setVisible(false);
        this.fishLabel.setVisible(false);
        this.instructionText.setVisible(false);
    }
}
