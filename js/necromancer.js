import { NecromancerProjectile } from './necromancerProjectile.js';
export class Necromancer {
    constructor(x, y, multiplier = 1.0) {
        this.x = x;
        this.y = y;
        
        // المواصفات المطلوبة للـ Necromancer
        this.radius = 14;
        this.maxHp = 55 * multiplier;
        this.hp = this.maxHp;
        this.speed = 45; // سرعة بطيئة نسبياً
        this.detectionRadius = 360;
        this.contactDamage = 8;

        // خصائص إضافية للتوافق مع أنظمة اللعبة
        this.isSummon = false;
        this.flashTimer = 0;
        
        // عداد وقت لعمل Idle Animation (طفو العباءة ونبض الطاقة)
        this.time = Math.random() * 100;
        
        // لتحديد اتجاه نظر الشخصية
        this.facingLeft = false;

        this.attackCooldown = 1.8;
        this.attackTimer = 0;
        this.projectiles = [];
        this.summonCooldown = 6;
        this.summonTimer = 3;
        this.maxSummons = 2;

    }

    takeDamage(amount) {
        this.hp -= amount;
        this.flashTimer = 0.1; // وميض عند تلقي الضرر
        
        if (this.hp <= 0) {
            return true; // يرجع true ليموت ويسقط غنائم في game.js
        }
        return false;
    }

    // نظام فحص التصادم مع الجدران باستخدام isWallAt
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

    update(dt, player, dungeon) {
        // تحديث Animation الطفو والطاقة
        this.time += dt * 4; 
        
        if (this.flashTimer > 0) {
            this.flashTimer -= dt;
        }

        // --- نظام الحركة والـ Kiting (الابتعاد التكتيكي) ---
        if (!player) return;

        const dx = player.x - this.x;
        const dy = player.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        this.summonTimer -= dt;

    if (
        dist <= this.detectionRadius &&
        dist >= 180 &&
        this.summonTimer <= 0
    ) {
        this.summonTimer = this.summonCooldown;
        this.shouldSummon = true;
        this.summonCount = 0;
    }

        this.attackTimer -= dt;

    if (
    dist <= 300 &&
    dist >= 160 &&
    this.attackTimer <= 0
    ) {
    this.projectiles.push(
        new NecromancerProjectile(
            this.x,
            this.y,
            player.x,
            player.y
        )
    );

    this.attackTimer = this.attackCooldown;
    }

        // إذا كان اللاعب داخل نطاق الرؤية
        if (dist < this.detectionRadius && dist > 0) {
            this.facingLeft = dx < 0;

            const dirX = dx / dist;
            const dirY = dy / dist;
            
            let moveX = 0;
            let moveY = 0;

            // تحديد السلوك للحفاظ على مسافة بين 220 و 300
            if (dist < 220) {
                // اللاعب قريب جداً -> اهرب وابتعد عنه
                moveX = -dirX * this.speed * dt;
                moveY = -dirY * this.speed * dt;
            } else if (dist > 300) {
                // اللاعب بعيد لكن ضمن الـ Detection -> اقترب لتدخل في المدى
                moveX = dirX * this.speed * dt;
                moveY = dirY * this.speed * dt;
            }
            // إذا كانت المسافة بين 220 و 300 يتوقف عن الحركة (استعداداً للهجوم لاحقاً)

            // تطبيق الحركة مع الانزلاق السلس على الجدران
            if (moveX !== 0 || moveY !== 0) {
                if (!this.checkCollision(this.x + moveX, this.y, dungeon)) {
                    this.x += moveX;
                }
                if (!this.checkCollision(this.x, this.y + moveY, dungeon)) {
                    this.y += moveY;
                }
            }
        }
    }

    render(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);

        if (this.facingLeft) {
            ctx.scale(-1, 1);
        }

        if (this.flashTimer > 0) {
            ctx.filter = 'brightness(200%)';
        }

        // حركة طفو (Hover) صعود ونزول ناعمة جداً
        const hoverOffset = Math.sin(this.time) * 2.5;
        // حركة نبض للطاقة السحرية
        const energyPulse = Math.abs(Math.cos(this.time * 2)) * 3;
        // تطاير أطراف العباءة
        const cloakFlutter = Math.cos(this.time * 1.5) * 2;

        // 1. ظل خفيف على الأرض (لأنه يطفو قليلاً)
        ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.beginPath();
        // حجم الظل يتغير عكسياً مع الطفو ليعطي إحساساً بالارتفاع
        const shadowScale = 1 - (hoverOffset / 10);
        ctx.ellipse(0, 14, 11 * shadowScale, 3 * shadowScale, 0, 0, Math.PI * 2);
        ctx.fill();

        // تطبيق حركة الطفو على كامل الجسد
        ctx.translate(0, hoverOffset);

        // 2. العباءة السحرية (Dark Purple / Void Black)
        ctx.fillStyle = '#140c1a'; 
        ctx.beginPath();
        ctx.moveTo(0, -12); // الرقبة
        ctx.lineTo(8, -2);  // الكتف الأيمن
        ctx.lineTo(10 + cloakFlutter, 10); // الطرف السفلي الأيمن المتطاير
        ctx.lineTo(0, 14); // مركز العباءة السفلي
        ctx.lineTo(-10 - cloakFlutter, 10); // الطرف السفلي الأيسر المتطاير
        ctx.lineTo(-8, -2); // الكتف الأيسر
        ctx.closePath();
        ctx.fill();

        // تظليل وعمق للعباءة (طيات)
        ctx.fillStyle = '#0d0712';
        ctx.beginPath();
        ctx.moveTo(0, -12);
        ctx.lineTo(3, -2);
        ctx.lineTo(4 + cloakFlutter, 12);
        ctx.lineTo(-4 - cloakFlutter, 12);
        ctx.lineTo(-3, -2);
        ctx.closePath();
        ctx.fill();

        // 3. الرأس وغطاء الرأس (Hood)
        ctx.fillStyle = '#0a050d'; // أسود حالك
        ctx.beginPath();
        ctx.arc(0, -14, 6, 0, Math.PI * 2);
        ctx.fill();

        // 4. العيون السحرية المتوهجة (Violet / Pink Glow)
        ctx.fillStyle = '#d000ff';
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#d000ff';
        ctx.beginPath();
        ctx.arc(2, -15, 1.5, 0, Math.PI * 2);  // العين اليمنى
        ctx.arc(-2, -15, 1.5, 0, Math.PI * 2); // العين اليسرى
        ctx.fill();
        ctx.shadowBlur = 0; // إيقاف التوهج مؤقتاً

        // 5. العصا السحرية (Staff)
        ctx.strokeStyle = '#22182b'; // خشب داكن جداً أو معدن أسود
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(10, 8);    // أسفل العصا
        ctx.lineTo(11, -16);  // قمة العصا
        ctx.stroke();

        // 6. طاقة العصا (Glowing Magical Orb)
        ctx.fillStyle = '#aa00ff'; // لون أرجواني ساطع
        ctx.shadowBlur = 15 + energyPulse * 2;
        ctx.shadowColor = '#d000ff';
        ctx.beginPath();
        // حجم الجرم السماوي ينبض بشكل مستمر
        ctx.arc(11.2, -17, 3 + (energyPulse * 0.5), 0, Math.PI * 2);
        ctx.fill();
        
        // قلب ناصع البياض للطاقة
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.shadowBlur = 0;
        ctx.beginPath();
        ctx.arc(11.2, -17, 1.5, 0, Math.PI * 2);
        ctx.fill();

        // 7. اليد التي تمسك العصا
        ctx.fillStyle = '#221133';
        ctx.beginPath();
        ctx.arc(10.5, -2, 2.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }
}