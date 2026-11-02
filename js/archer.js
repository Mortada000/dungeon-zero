import { ArcherProjectile } from './archerProjectile.js';
export class Archer {
    constructor(x, y, multiplier = 1.0) {
        this.x = x;
        this.y = y;
        this.radius = 14;
        
        this.attackCooldown = 1.5;
        this.attackTimer = 0;
        this.projectiles = [];

        // الخصائص الأساسية المتوافقة مع نظام الأعداء
        this.maxHp = 40 * multiplier;
        this.hp = this.maxHp;
        this.contactDamage = 0;
        this.speed = 100 * multiplier;
        this.detectionRadius = 500;
        this.isSummon = false;
        this.flashTimer = 0;

        // عداد وقت بسيط لعمل Animation للتنفس وحركة العباءة
        this.time = Math.random() * 100;

        // لتحديد اتجاه نظر الشخصية (يمين/يسار)
        this.facingLeft = false;
    }

    takeDamage(amount) {
        this.hp -= amount;
        this.flashTimer = 0.1; // تشغيل الوميض عند تلقي الضرر
        
        // يرجع true فقط إذا مات ليتم حذفه من مصفوفة الأعداء
        if (this.hp <= 0) {
            return true;
        }
        return false;
    }

    // دالة لمنع اختراق الجدران (Tile Collision)
    checkCollision(newX, newY, dungeon) {
    const r = this.radius;

    // فحص نقاط حول جسم الـ Archer
    const points = [
        { x: newX - r, y: newY },
        { x: newX + r, y: newY },
        { x: newX, y: newY - r },
        { x: newX, y: newY + r },
        { x: newX - r * 0.7, y: newY - r * 0.7 },
        { x: newX + r * 0.7, y: newY - r * 0.7 },
        { x: newX - r * 0.7, y: newY + r * 0.7 },
        { x: newX + r * 0.7, y: newY + r * 0.7 }
    ];

    for (const p of points) {
        if (dungeon.isWallAt(p.x, p.y)) {
            return true;
        }
    }

    return false;
}

    hasLineOfSight(player, dungeon) {
        const dx = player.x - this.x;
        const dy = player.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        // تحديد حجم الخطوة (متوسط 10 بكسل)
        const step = 10;
        const stepsCount = Math.floor(dist / step);
        
        const dirX = dx / dist;
        const dirY = dy / dist;

        let currentX = this.x;
        let currentY = this.y;

        // المشي على الخط الوهمي نقطة بنقطة
        for (let i = 0; i < stepsCount; i++) {
            currentX += dirX * step;
            currentY += dirY * step;
            
            // إذا وجدنا جداراً في أي نقطة على الخط، نلغي الرؤية
            if (dungeon.isWallAt(currentX, currentY)) {
                return false;
            }
        }
        
        return true;
    }

    update(dt, player, dungeon) {
    this.time += dt * 5;

    if (this.flashTimer > 0) {
        this.flashTimer -= dt;
    }

    if (!player || !dungeon) return;

    const dx = player.x - this.x;
    const dy = player.y - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // Always face the player
    if (Math.abs(dx) > 2) {
        this.facingLeft = dx < 0;
    }

    this.attackTimer -= dt;

if (
    dist <= this.detectionRadius &&
    dist >= 160 &&
    dist <= 500 &&
    this.attackTimer <= 0 &&
    this.hasLineOfSight(player, dungeon)
) {
    this.projectiles.push(
        new ArcherProjectile(
            this.x,
            this.y,
            player.x,
            player.y,
            10
        )
    );

    this.attackTimer = this.attackCooldown;
}

    // Outside detection range: stay still
    if (dist > this.detectionRadius || dist <= 0.001) {
        return;
    }

    const dirX = dx / dist;
    const dirY = dy / dist;

    let moveX = 0;
    let moveY = 0;

    // Too far: move toward player
    if (dist > 220) {
        moveX = dirX * this.speed * dt;
        moveY = dirY * this.speed * dt;
    }
    // Too close: move away from player
    else if (dist < 160) {
        moveX = -dirX * this.speed * dt;
        moveY = -dirY * this.speed * dt;
    }
    // 160-220: stay in position
    else {
        return;
    }

    // Wall collision
    const nextX = this.x + moveX;
const nextY = this.y + moveY;

if (!this.checkCollision(nextX, this.y, dungeon)) {
    this.x = nextX;
}

if (!this.checkCollision(this.x, nextY, dungeon)) {
    this.y = nextY;
}
    }

    render(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);

        // تدوير الشخصية إذا كان اللاعب على يسارها
        if (this.facingLeft) {
            ctx.scale(-1, 1);
        }

        // إذا كان يتلقى ضرراً، اجعله يومض باللون الأبيض
        if (this.flashTimer > 0) {
            ctx.filter = 'brightness(200%)';
        }

        // حساب حركة التنفس (للأعلى والأسفل) وحركة تمايل أطراف العباءة
        const breatheOffset = Math.sin(this.time) * 1.5;
        const cloakFlutter = Math.cos(this.time * 0.8) * 2;

        // 1. رسم الظل على الأرض (ثابت لا يتأثر بالتنفس)
        ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.beginPath();
        ctx.ellipse(0, 10, 12, 4, 0, 0, Math.PI * 2);
        ctx.fill();

        // تطبيق حركة التنفس على الجسد كله
        ctx.translate(0, breatheOffset); 

        // 2. الجسد / العباءة (Dark Cloak)
        ctx.fillStyle = '#1c1c22'; // رمادي/كحلي داكن جداً
        ctx.beginPath();
        ctx.moveTo(0, -10); // الرقبة
        ctx.lineTo(10, 2);  // الكتف الأيمن
        ctx.lineTo(8 + cloakFlutter, 14); // الطرف السفلي الأيمن المتطاير
        ctx.lineTo(-8 - cloakFlutter, 14); // الطرف السفلي الأيسر المتطاير
        ctx.lineTo(-10, 2); // الكتف الأيسر
        ctx.closePath();
        ctx.fill();

        // طيات العباءة (Inner Shadow/Fold) لإعطاء عمق للتصميم
        ctx.fillStyle = '#111115';
        ctx.beginPath();
        ctx.moveTo(0, -10);
        ctx.lineTo(4, 2);
        ctx.lineTo(2 + cloakFlutter, 12);
        ctx.lineTo(-2 - cloakFlutter, 12);
        ctx.lineTo(-4, 2);
        ctx.closePath();
        ctx.fill();

        // 3. الرأس / القلنسوة (Hood)
        ctx.fillStyle = '#0a0a0c'; // أسود فاحم
        ctx.beginPath();
        ctx.arc(0, -12, 6.5, 0, Math.PI * 2);
        ctx.fill();

        // 4. العيون المتوهجة (Dim Orange/Red Accent)
        ctx.fillStyle = '#ff4411';
        ctx.shadowBlur = 8;
        ctx.shadowColor = '#ff4411';
        ctx.beginPath();
        ctx.arc(2, -13, 1.5, 0, Math.PI * 2);  // العين اليمنى
        ctx.arc(-2, -13, 1.5, 0, Math.PI * 2); // العين اليسرى
        ctx.fill();
        ctx.shadowBlur = 0; // إيقاف التوهج لباقي العناصر

        // 5. القوس (Bow) ممسوك باليد 
        ctx.strokeStyle = '#3a2210'; // لون خشب داكن
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.beginPath();
        // رسم هيكل القوس المنحني
        ctx.arc(12, 0, 12, -Math.PI / 2.5, Math.PI / 2.5);
        ctx.stroke();

        // وتر القوس (Bowstring)
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)'; // وتر شبه شفاف
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        const startY = Math.sin(-Math.PI / 2.5) * 12;
        const endY = Math.sin(Math.PI / 2.5) * 12;
        const bowX = 12 + Math.cos(Math.PI / 2.5) * 12;
        ctx.moveTo(bowX, startY);
        ctx.lineTo(bowX, endY);
        ctx.stroke();

        // 6. اليد التي تمسك القوس (قفاز داكن)
        ctx.fillStyle = '#2a2a35';
        ctx.beginPath();
        ctx.arc(10.5, 0, 2.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }
}