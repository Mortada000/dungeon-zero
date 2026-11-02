export class ArcherProjectile {
    constructor(x, y, targetX, targetY, damage = 10) {
        this.x = x;
        this.y = y;

        const dx = targetX - x;
        const dy = targetY - y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;

        this.vx = (dx / dist) * 320;
        this.vy = (dy / dist) * 320;

        this.damage = damage;
        this.radius = 4;
        this.life = 3;
        this.dead = false;
        this.angle = Math.atan2(this.vy, this.vx);
    }

    update(dt, dungeon) {
        if (this.dead) return;

        this.life -= dt;

        if (this.life <= 0) {
            this.dead = true;
            return;
        }

        const nextX = this.x + this.vx * dt;
        const nextY = this.y + this.vy * dt;

        // اصطدام بالجدار
        if (dungeon && dungeon.isWallAt(nextX, nextY)) {
            this.dead = true;
            return;
        }

        this.x = nextX;
        this.y = nextY;
    }

    render(ctx) {
        if (this.dead) return;

        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);

        // جسم السهم
        ctx.strokeStyle = '#d8c7a0';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-10, 0);
        ctx.lineTo(8, 0);
        ctx.stroke();

        // رأس السهم
        ctx.fillStyle = '#eeeeee';
        ctx.beginPath();
        ctx.moveTo(10, 0);
        ctx.lineTo(5, -3);
        ctx.lineTo(5, 3);
        ctx.closePath();
        ctx.fill();

        // ريش السهم
        ctx.strokeStyle = '#8b2f2f';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(-8, 0);
        ctx.lineTo(-11, -3);
        ctx.moveTo(-8, 0);
        ctx.lineTo(-11, 3);
        ctx.stroke();

        ctx.restore();
    }
}