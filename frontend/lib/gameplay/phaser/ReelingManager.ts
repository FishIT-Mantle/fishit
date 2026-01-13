import Phaser from 'phaser';
import { GAME_CONFIG, FishType } from './data';

/**
 * ReelingManager - Handles the fishing/reeling phase
 * 
 * Features:
 * - Weighty physics with linear interpolation
 * - FPS-independent delta-based calculations
 * - Fish AI with erratic movement based on aggression
 * - Progress bar with color states
 */
export class ReelingManager {
    private scene: Phaser.Scene;

    // UI Elements
    private tensionBar!: Phaser.GameObjects.Graphics;
    private progressBar!: Phaser.GameObjects.Graphics;
    private fishIcon!: Phaser.GameObjects.Graphics;
    private reelZone!: Phaser.GameObjects.Graphics;
    private fishLabel!: Phaser.GameObjects.Text;

    // Game State
    private isActive: boolean = false;
    private catchProgress: number = 0;
    private currentFish: FishType | null = null;

    // Physics State
    private reelX: number = 0;
    private reelVelocity: number = 0;

    // Fish AI State
    private fishX: number = 0;
    private fishVelocity: number = 0;
    private fishTargetVelocity: number = 0;
    private directionChangeTimer: number = 0;

    // Config
    private readonly LERP_FACTOR = 0.08;        // Lower = heavier feel (0.05-0.15 range)
    private readonly FISH_LERP = 0.04;          // Fish movement smoothing
    private readonly ZONE_WIDTH = 100;          // Capture zone width
    private readonly FISH_RADIUS = 20;

    constructor(scene: Phaser.Scene) {
        this.scene = scene;
        this.setupVisuals();
    }

    private setupVisuals() {
        // All graphics hidden by default
        this.tensionBar = this.scene.add.graphics().setDepth(20).setVisible(false);
        this.progressBar = this.scene.add.graphics().setDepth(20).setVisible(false);
        this.fishIcon = this.scene.add.graphics().setDepth(21).setVisible(false);
        this.reelZone = this.scene.add.graphics().setDepth(21).setVisible(false);

        this.fishLabel = this.scene.add.text(0, 0, '', {
            fontSize: '14px',
            fontFamily: 'Arial',
            fontStyle: 'bold',
            color: '#FFFFFF'
        }).setOrigin(0.5).setDepth(22).setVisible(false);
    }

    public start(fish: FishType) {
        this.isActive = true;
        this.currentFish = fish;
        this.catchProgress = 30; // Start with 30% progress

        const { width } = this.scene.scale;

        // Reset positions - center
        this.reelX = width / 2;
        this.reelVelocity = 0;
        this.fishX = width / 2;
        this.fishVelocity = 0;
        this.fishTargetVelocity = 0;
        this.directionChangeTimer = 0;

        // Show UI
        this.tensionBar.setVisible(true);
        this.progressBar.setVisible(true);
        this.fishIcon.setVisible(true);
        this.reelZone.setVisible(true);
        this.fishLabel.setVisible(true);
        this.fishLabel.setText(fish.name);
    }

    public update(delta: number) {
        if (!this.isActive || !this.currentFish) return;

        const { width } = this.scene.scale;
        const deltaSeconds = delta / 1000; // Convert to seconds for FPS-independent physics

        // --- 1. FISH AI LOGIC ---
        this.updateFishAI(width, deltaSeconds);

        // --- 2. PLAYER PHYSICS (Weighty Lerp) ---
        this.updatePlayerPhysics(width);

        // --- 3. PROGRESS CALCULATION (Delta-based) ---
        this.updateProgress(deltaSeconds);

        // --- 4. DRAW UI ---
        this.drawUI(width);
    }

    private updateFishAI(screenWidth: number, deltaSeconds: number) {
        if (!this.currentFish) return;

        const fish = this.currentFish;
        const margin = 120;

        // Direction change timer
        this.directionChangeTimer -= deltaSeconds;

        if (this.directionChangeTimer <= 0) {
            // Time to change direction
            const baseSpeed = Phaser.Math.FloatBetween(fish.speedConfig[0], fish.speedConfig[1]);
            const direction = Math.random() > 0.5 ? 1 : -1;

            // Dash chance based on aggression
            let speed = baseSpeed;
            if (Math.random() < fish.aggression) {
                speed *= 2.5; // Dash!
            }

            this.fishTargetVelocity = direction * speed * 60; // Convert to pixels/second

            // Random time until next direction change
            this.directionChangeTimer = Phaser.Math.FloatBetween(0.3, 1.5);
        }

        // Smooth velocity change (fish has momentum)
        this.fishVelocity = Phaser.Math.Linear(this.fishVelocity, this.fishTargetVelocity, this.FISH_LERP);

        // Apply velocity
        this.fishX += this.fishVelocity * deltaSeconds;

        // Wall bounce with margin
        if (this.fishX < margin) {
            this.fishX = margin;
            this.fishTargetVelocity = Math.abs(this.fishTargetVelocity);
            this.fishVelocity = Math.abs(this.fishVelocity) * 0.5;
        } else if (this.fishX > screenWidth - margin) {
            this.fishX = screenWidth - margin;
            this.fishTargetVelocity = -Math.abs(this.fishTargetVelocity);
            this.fishVelocity = -Math.abs(this.fishVelocity) * 0.5;
        }
    }

    private updatePlayerPhysics(screenWidth: number) {
        const pointer = this.scene.input.activePointer;
        const mouseX = pointer.x;

        // Clamp target to valid range
        const margin = 80;
        const targetX = Phaser.Math.Clamp(mouseX, margin, screenWidth - margin);

        // Weighty lerp interpolation (heavier feel)
        // Lower LERP_FACTOR = more inertia/weight
        this.reelX = Phaser.Math.Linear(this.reelX, targetX, this.LERP_FACTOR);
    }

    private updateProgress(deltaSeconds: number) {
        // Check overlap between fish and reel zone
        const zoneLeft = this.reelX - this.ZONE_WIDTH / 2;
        const zoneRight = this.reelX + this.ZONE_WIDTH / 2;
        const fishLeft = this.fishX - this.FISH_RADIUS;
        const fishRight = this.fishX + this.FISH_RADIUS;

        const isOverlapping = fishRight > zoneLeft && fishLeft < zoneRight;

        // Delta-based progress (FPS-independent)
        const tensionGain = GAME_CONFIG.REEL.TENSION_GAIN * 60; // Per second
        const tensionLoss = GAME_CONFIG.REEL.TENSION_LOSS * 60; // Per second

        if (isOverlapping) {
            this.catchProgress += tensionGain * deltaSeconds;
        } else {
            this.catchProgress -= tensionLoss * deltaSeconds;
        }

        // Clamp progress
        this.catchProgress = Phaser.Math.Clamp(this.catchProgress, 0, 100);
    }

    private drawUI(screenWidth: number) {
        const { height } = this.scene.scale;
        const barY = 80;
        const barWidth = GAME_CONFIG.REEL.BAR_WIDTH;
        const barHeight = 24;
        const barX = (screenWidth - barWidth) / 2;

        // Clear previous frame
        this.tensionBar.clear();
        this.progressBar.clear();
        this.reelZone.clear();
        this.fishIcon.clear();

        // --- Progress Bar Background ---
        this.tensionBar.fillStyle(0x000000, 0.7);
        this.tensionBar.fillRoundedRect(barX - 4, barY - 4, barWidth + 8, barHeight + 8, 14);

        // --- Progress Bar Fill ---
        const fillWidth = (this.catchProgress / 100) * barWidth;
        let fillColor = GAME_CONFIG.COLORS.TENSION_SAFE;
        if (this.catchProgress < 30) {
            fillColor = GAME_CONFIG.COLORS.TENSION_CRIT;
        } else if (this.catchProgress < 60) {
            fillColor = GAME_CONFIG.COLORS.TENSION_WARN;
        }

        this.progressBar.fillStyle(fillColor, 1);
        this.progressBar.fillRoundedRect(barX, barY, fillWidth, barHeight, 12);

        // --- Progress percentage text ---
        this.fishLabel.setPosition(screenWidth / 2, barY + barHeight + 20);
        this.fishLabel.setText(`${this.currentFish?.name || 'Fish'} - ${Math.round(this.catchProgress)}%`);

        // --- Fishing Area (below progress bar) ---
        const fishingAreaY = barY + 70;
        const fishingAreaHeight = 60;

        // Background track
        this.tensionBar.fillStyle(0x000000, 0.4);
        this.tensionBar.fillRoundedRect(80, fishingAreaY, screenWidth - 160, fishingAreaHeight, 10);

        // --- Reel Zone (Player's capture bar) ---
        const zoneY = fishingAreaY + 5;
        const zoneHeight = fishingAreaHeight - 10;

        // Check if overlapping for color
        const zoneLeft = this.reelX - this.ZONE_WIDTH / 2;
        const zoneRight = this.reelX + this.ZONE_WIDTH / 2;
        const fishLeft = this.fishX - this.FISH_RADIUS;
        const fishRight = this.fishX + this.FISH_RADIUS;
        const isOverlapping = fishRight > zoneLeft && fishLeft < zoneRight;

        // Zone fill
        this.reelZone.fillStyle(isOverlapping ? 0x00FF00 : 0xFFFFFF, isOverlapping ? 0.4 : 0.2);
        this.reelZone.fillRoundedRect(this.reelX - this.ZONE_WIDTH / 2, zoneY, this.ZONE_WIDTH, zoneHeight, 8);

        // Zone border
        this.reelZone.lineStyle(3, isOverlapping ? 0x00FF00 : 0xFFFFFF, 0.8);
        this.reelZone.strokeRoundedRect(this.reelX - this.ZONE_WIDTH / 2, zoneY, this.ZONE_WIDTH, zoneHeight, 8);

        // --- Fish Icon ---
        const fishCenterY = fishingAreaY + fishingAreaHeight / 2;

        // Fish glow when caught
        if (isOverlapping) {
            this.fishIcon.fillStyle(0xFFD700, 0.3);
            this.fishIcon.fillCircle(this.fishX, fishCenterY, this.FISH_RADIUS + 8);
        }

        // Fish body
        this.fishIcon.fillStyle(0xFFD700, 1);
        this.fishIcon.fillCircle(this.fishX, fishCenterY, this.FISH_RADIUS);

        // Fish direction indicator
        const fishDir = this.fishVelocity > 0 ? 1 : -1;
        this.fishIcon.fillStyle(0xFFA500, 1);
        this.fishIcon.fillTriangle(
            this.fishX - fishDir * 25, fishCenterY,
            this.fishX - fishDir * 35, fishCenterY - 8,
            this.fishX - fishDir * 35, fishCenterY + 8
        );
    }

    public getProgress(): number {
        return this.catchProgress;
    }

    public stop() {
        this.isActive = false;
        this.tensionBar.setVisible(false);
        this.progressBar.setVisible(false);
        this.fishIcon.setVisible(false);
        this.reelZone.setVisible(false);
        this.fishLabel.setVisible(false);
    }
}
