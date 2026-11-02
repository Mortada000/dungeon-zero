export class Enemy {
    // تمت إضافة isSummon لدعم أتباع الـ Necromancer
    constructor(x, y, multiplier = 1.0, isSummon = false) {
        this.x = x;
        this.y = y;
        this.radius = 12;
        this.isSummon = isSummon;
        
        const baseHp = this.isSummon ? 20 : 50;
        const baseDamage = this.isSummon ? 5 : 10;
        
        this.maxHp = Math.floor(baseHp * multiplier);
        this.hp = this.maxHp;
        this.speed = this.isSummon ? 150 : 120; 
        this.contactDamage = Math.floor(baseDamage * multiplier);
        
        this.detectionRadius = 300;
        this.flashTimer = 0;
    }

    takeDamage(amount) {
        this.hp -= amount;
        this.flashTimer = 0.1; 
        return this.hp <= 0; 
    }

    update(dt, player, dungeon) {
        if (this.flashTimer > 0) this.flashTimer -= dt;

        const dx = player.x - this.x;
        const dy = player.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist > 0 && dist < this.detectionRadius) {
            const dirX = dx / dist;
            const dirY = dy / dist;

            const nextX = this.x + dirX * this.speed * dt;
            const nextY = this.y + dirY * this.speed * dt;

            if (!this.checkCollision(nextX, this.y, dungeon)) {
                this.x = nextX;
            }
            if (!this.checkCollision(this.x, nextY, dungeon)) {
                this.y = nextY;
            }
        }
    }

    checkCollision(newX, newY, dungeon) {
        const r = this.radius;
        const points = [
            { x: newX - r, y: newY - r },
            { x: newX + r, y: newY - r },
            { x: newX - r, y: newY + r },
            { x: newX + r, y: newY + r }
        ];

        for (let p of points) {
            if (dungeon.isWallAt(p.x, p.y)) {
                return true;
            }
        }
        return false;
    }

    render(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);

    const t = performance.now() * 0.006;
    const bob = Math.sin(t) * 0.8;
    const legMove = Math.sin(t * 1.8) * 1.5;

    ctx.translate(0, bob);

    const mainColor = this.isSummon ? '#24103a' : '#17131b';
    const shellColor = this.isSummon ? '#5a2378' : '#332532';
    const eyeColor = this.isSummon ? '#c56cff' : '#ff304f';
    const shadowColor = this.isSummon ? '#9b35ff' : '#ff1744';

    // Hit flash
    if (this.flashTimer > 0) {
        ctx.fillStyle = '#ffffff';
        ctx.shadowBlur = 18;
        ctx.shadowColor = '#ffffff';

        ctx.beginPath();
        ctx.ellipse(0, 1, 15, 10, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
        return;
    }

    // Ground shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.beginPath();
    ctx.ellipse(0, 11, 15, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Legs / claws
    ctx.strokeStyle = shellColor;
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';

    const legs = [
        [-7, -2, -14, -7, -18, -3],
        [-8, 2, -15, 2, -19, 7],
        [-6, 7, -12, 11, -16, 14],
        [7, -2, 14, -7, 18, -3],
        [8, 2, 15, 2, 19, 7],
        [6, 7, 12, 11, 16, 14]
    ];

    legs.forEach((leg, i) => {
        const offset = (i % 2 === 0 ? legMove : -legMove);

        ctx.beginPath();
        ctx.moveTo(leg[0], leg[1]);
        ctx.lineTo(leg[2], leg[3] + offset);
        ctx.lineTo(leg[4], leg[5]);
        ctx.stroke();
    });

    // Main body
    ctx.fillStyle = mainColor;
    ctx.strokeStyle = shellColor;
    ctx.lineWidth = 2;
    ctx.shadowBlur = 10;
    ctx.shadowColor = shadowColor;

    ctx.beginPath();
    ctx.ellipse(0, 2, 14, 10, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.shadowBlur = 0;

    // Back shell plates
    ctx.fillStyle = shellColor;

    ctx.beginPath();
    ctx.ellipse(-5, -3, 8, 5, -0.15, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.ellipse(3, -5, 7, 4.5, 0.1, 0, Math.PI * 2);
    ctx.fill();

    // Head
    ctx.fillStyle = mainColor;
    ctx.beginPath();
    ctx.ellipse(0, -7, 9, 7, 0, 0, Math.PI * 2);
    ctx.fill();

    // Mandibles / claws
    ctx.strokeStyle = shellColor;
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.moveTo(-5, -9);
    ctx.lineTo(-9, -13);
    ctx.lineTo(-6, -7);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(5, -9);
    ctx.lineTo(9, -13);
    ctx.lineTo(6, -7);
    ctx.stroke();

    // Eyes
    ctx.fillStyle = eyeColor;
    ctx.shadowBlur = 8;
    ctx.shadowColor = eyeColor;

    ctx.beginPath();
    ctx.ellipse(-3.5, -8, 2, 1.5, -0.2, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.ellipse(3.5, -8, 2, 1.5, 0.2, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowBlur = 0;

    // Small glowing core
    ctx.fillStyle = eyeColor;
    ctx.globalAlpha = 0.7;

    ctx.beginPath();
    ctx.arc(0, 2, 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalAlpha = 1;

    ctx.restore();
    }
}