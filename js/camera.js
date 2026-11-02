export class Camera {
    constructor() {
        this.x = 0;
        this.y = 0;
        this.viewportWidth = 0;
        this.viewportHeight = 0;
        this.lerpSpeed = 5.0;
        
        // Shake properties
        this.shakeTimer = 0;
        this.shakeIntensity = 0;
        this.offsetX = 0;
        this.offsetY = 0;
    }

    setViewport(width, height) {
        this.viewportWidth = width;
        this.viewportHeight = height;
    }

    snapTo(targetX, targetY) {
        this.x = targetX;
        this.y = targetY;
    }

    shake(duration, intensity) {
        this.shakeTimer = duration;
        this.shakeIntensity = intensity;
    }

    update(dt, target, dungeon) {
        this.x += (target.x - this.x) * this.lerpSpeed * dt;
        this.y += (target.y - this.y) * this.lerpSpeed * dt;

        const dungeonPixelWidth = dungeon.cols * dungeon.tileSize;
        const dungeonPixelHeight = dungeon.rows * dungeon.tileSize;

        const minX = this.viewportWidth / 2;
        const maxX = dungeonPixelWidth - this.viewportWidth / 2;
        const minY = this.viewportHeight / 2;
        const maxY = dungeonPixelHeight - this.viewportHeight / 2;

        if (minX > maxX) {
            this.x = dungeonPixelWidth / 2;
        } else {
            this.x = Math.max(minX, Math.min(maxX, this.x));
        }

        if (minY > maxY) {
            this.y = dungeonPixelHeight / 2;
        } else {
            this.y = Math.max(minY, Math.min(maxY, this.y));
        }

        // Handle screen shake
        if (this.shakeTimer > 0) {
            this.shakeTimer -= dt;
            this.offsetX = (Math.random() - 0.5) * 2 * this.shakeIntensity;
            this.offsetY = (Math.random() - 0.5) * 2 * this.shakeIntensity;
        } else {
            this.offsetX = 0;
            this.offsetY = 0;
        }
    }
}