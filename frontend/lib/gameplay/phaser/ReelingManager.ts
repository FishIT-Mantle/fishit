import Phaser from 'phaser';
import { GAME_CONFIG, FishType } from './data';

export class ReelingManager {
    private scene: Phaser.Scene;

    // UI Elements
    private tensionBar!: Phaser.GameObjects.Graphics;
    private fishIcon!: Phaser.GameObjects.Graphics;
    private reelZone!: Phaser.GameObjects.Graphics;

    // Game State
    private isActive: boolean = false;
    private catchProgress: number = 0;
    private currentFish: FishType | null = null;

    // Physics State (Cursor Loop)
    private reelX: number = 0;
    private reelVelocity: number = 0;

    // Fish AI State
    private fishX: number = 0;
    private fishVelocity: number = 0;
    private aiTimer: number = 0;

    constructor(scene: Phaser.Scene) {
        this.scene = scene;
        this.setupVisuals();
    }

    private setupVisuals() {
        // Init graphics objects (hidden by default)
        this.tensionBar = this.scene.add.graphics().setDepth(20).setVisible(false);
        this.fishIcon = this.scene.add.graphics().setDepth(21).setVisible(false);
        this.reelZone = this.scene.add.graphics().setDepth(21).setVisible(false);
    }

    public start(fish: FishType) {
        this.isActive = true;
        this.currentFish = fish;
        this.catchProgress = 30; // Start with some progress

        const { width } = this.scene.scale;

        // Reset positions
        this.reelX = width / 2;
        this.reelVelocity = 0;
        this.fishX = width / 2;
        this.fishVelocity = 1;

        // Show UI
        this.tensionBar.setVisible(true);
        this.fishIcon.setVisible(true);
        this.reelZone.setVisible(true);
    }

    public update(delta: number) {
        if (!this.isActive || !this.currentFish) return;

        const { width } = this.scene.scale;
        const config = GAME_CONFIG.REEL;

        // --- 1. FISH AI LOGIC ---
        this.updateFishAI(width);

        // --- 2. PLAYER PHYSICS (Responsive Reeling) ---
        // Use activePointer to ensure we catch mouse/touch even if not "moved"
        const pointer = this.scene.input.activePointer;
        const mouseX = pointer.x;
        const targetX = Phaser.Math.Clamp(mouseX, config.BAR_WIDTH / 2, width - config.BAR_WIDTH / 2);

        // More responsive movement (Higher force, less drag)
        // Previous: force 0.1, drag 0.85 -> Sluggish/Floaty
        // New: force 0.2, drag 0.80 -> Snappier
        // Or if user wants "instant", we can just set reelX = targetX, but inertia feels better.
        // Let's try "Tight" inertia.

        // DIRECT CONTROL CHECK:
        // If the user feels "click to move", it might be that inertia is too high.
        // Let's simply Lerp aggressively.
        this.reelX = Phaser.Math.Linear(this.reelX, targetX, 0.2);

        // Bounds check
        this.reelX = Phaser.Math.Clamp(this.reelX, 50, width - 50);

        // --- 3. PROGRESS LOGIC ---
        const zoneWidth = 80;
        const fishLeft = this.fishX - 20;
        const fishRight = this.fishX + 20;
        const reelLeft = this.reelX - zoneWidth / 2;
        const reelRight = this.reelX + zoneWidth / 2;

        const isOverlapping = fishRight > reelLeft && fishLeft < reelRight;

        if (isOverlapping) {
            this.catchProgress += GAME_CONFIG.REEL.TENSION_GAIN * delta;
        } else {
            this.catchProgress -= GAME_CONFIG.REEL.TENSION_LOSS * delta;
        }
        this.catchProgress = Phaser.Math.Clamp(this.catchProgress, 0, 100);

        // --- 4. DRAW ---
        this.drawUI(width);
    }

    private updateFishAI(screenWidth: number) {
        // Simple erratic movement based on fish aggression
        if (!this.currentFish) return;

        // Randomly change direction
        if (Math.random() < 0.02) {
            const speed = Phaser.Math.Between(this.currentFish.speedConfig[0], this.currentFish.speedConfig[1]);
            this.fishVelocity = (Math.random() > 0.5 ? 1 : -1) * speed;

            // "Dash" chance
            if (Math.random() < this.currentFish.aggression) {
                this.fishVelocity *= 2.5; // Dash!
            }
        }

        // Smoothly move fish
        this.fishX += this.fishVelocity;

        // Wall bounce with buffer to prevent corner sticking
        // Keep fish away from absolute edges so it's catchable
        const margin = 150;
        if (this.fishX < margin) {
            this.fishVelocity = Math.abs(this.fishVelocity); // Force right
        } else if (this.fishX > screenWidth - margin) {
            this.fishVelocity = -Math.abs(this.fishVelocity); // Force left
        }

        // Clamp
        this.fishX = Phaser.Math.Clamp(this.fishX, margin, screenWidth - margin);
    }

    private drawUI(width: number) {
        const barY = 100;
        const config = GAME_CONFIG.REEL;

        // Clear
        this.tensionBar.clear();
        this.reelZone.clear();
        this.fishIcon.clear();

        // 1. Progress Bar Background
        const barX = (width - config.BAR_WIDTH) / 2;
        this.tensionBar.fillStyle(0x000000, 0.6);
        this.tensionBar.fillRoundedRect(barX, barY - 40, config.BAR_WIDTH, 20, 10);

        // 2. Progress Fill
        const fillWidth = (this.catchProgress / 100) * config.BAR_WIDTH;
        let color = GAME_CONFIG.COLORS.TENSION_SAFE;
        if (this.catchProgress < 30) color = GAME_CONFIG.COLORS.TENSION_CRIT;
        else if (this.catchProgress < 60) color = GAME_CONFIG.COLORS.TENSION_WARN;

        this.tensionBar.fillStyle(color, 1);
        this.tensionBar.fillRoundedRect(barX, barY - 40, fillWidth, 20, 10);

        // 3. Fish Icon
        this.fishIcon.fillStyle(0xFFD700, 1);
        this.fishIcon.fillCircle(this.fishX, barY + 30, 15);

        // 4. Reel Zone (The Capture Bar)
        // Physics-based position this.reelX
        this.reelZone.lineStyle(4, 0xFFFFFF, 0.9);
        this.reelZone.strokeRect(this.reelX - 50, barY + 5, 100, 50);
        this.reelZone.fillStyle(0xFFFFFF, 0.2);
        this.reelZone.fillRect(this.reelX - 50, barY + 5, 100, 50);
    }

    public getProgress() {
        return this.catchProgress;
    }

    public stop() {
        this.isActive = false;
        this.tensionBar.setVisible(false);
        this.fishIcon.setVisible(false);
        this.reelZone.setVisible(false);
    }
}
