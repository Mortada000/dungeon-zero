export class Projectile {
    constructor(x, y, dir, weapon, damageMultiplier) {
        this.x = x + dir.x * 10; // Spawn slightly ahead of player
        this.y = y + dir.y * 10;
        
        this.vx = dir.x * weapon.projectileSpeed;
        this.vy = dir.y * weapon.projectileSpeed;
        
        this.damage = Math.floor(weapon.damage * damageMultiplier);
        this.maxRange = weapon.range;
        this.color = weapon.color;
        this.radius = 6;
        
        this.distanceTraveled = 0;
        this.active = true;
    }

    update(dt, dungeon) {
        if (!this.active) return;

        const moveX = this.vx * dt;
        const moveY = this.vy * dt;

        this.x += moveX;
        this.y += moveY;
        
        const dist = Math.sqrt(moveX * moveX + moveY * moveY);
        this.distanceTraveled += dist;

        // Destroy on wall impact or range limit
        if (this.distanceTraveled >= this.maxRange || dungeon.isWallAt(this.x, this.y)) {
            this.active = false;
        }
    }

    render(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        
        ctx.shadowBlur = 12;
        ctx.shadowColor = this.color;
        
        // Outer glow
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
        ctx.fill();
        
        // Bright core
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(0, 0, this.radius - 3, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }
}