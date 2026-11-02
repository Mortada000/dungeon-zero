export class Dasher {
    constructor(x, y, multiplier = 1.0) {
        this.x = x;
        this.y = y;
        
        this.radius = 13;
        this.maxHp = 35 * multiplier;
        this.hp = this.maxHp;
        this.speed = 170; 
        this.detectionRadius = 320;
        this.contactDamage = 12;

        this.isSummon = false;
        this.flashTimer = 0;
        this.time = Math.random() * 100;
        this.facingLeft = false;

        // --- متغيرات ميزة الـ Dash الجديدة ---
        this.isDashing = false;
        this.dashTimer = 0;
        this.dashCooldown = 2.5;
        this.dashCooldownTimer = 1.5; // تأخير أولي قبل أول Dash
        this.dashSpeed = 420;
        this.dashDuration = 0.25;
        this.dashDirectionX = 0;
        this.dashDirectionY = 0;
    }

    takeDamage(amount) {
        this.hp -= amount;
        this.flashTimer = 0.1; // وميض عند تلقي الضرر
        
        if (this.hp <= 0) {
            return true; // يرجع true ليموت ويسقط غنائم في game.js
        }
        return false;
    }

    // نظام فحص التصادم مع الجدران (تماماً مثل Archer)
checkCollision(newX, newY, dungeon) {
    const r = this.radius;

    const points = [
        { x: newX - r, y: newY - r },
        { x: newX + r, y: newY - r },
        { x: newX - r, y: newY + r },
        { x: newX + r, y: newY + r }
    ];

    for (const p of points) {
        if (dungeon.isWallAt(p.x, p.y)) {
            return true;
        }
    }

    return false;
}
    update(dt, player, dungeon) {
        this.time += dt * 8; 
        
        if (this.flashTimer > 0) {
            this.flashTimer -= dt;
        }

        // تحديث عداد التبريد (Cooldown) إذا لم يكن في حالة Dash
        if (!this.isDashing && this.dashCooldownTimer > 0) {
            this.dashCooldownTimer -= dt;
        }

        if (!player) return;

        const dx = player.x - this.x;
        const dy = player.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < this.detectionRadius && dist > 0) {
            this.facingLeft = dx < 0;

            // بدء الـ Dash إذا انتهى التبريد
            if (!this.isDashing && this.dashCooldownTimer <= 0) {
                this.isDashing = true;
                this.dashTimer = this.dashDuration;
                this.dashDirectionX = dx / dist; // تثبيت الاتجاه
                this.dashDirectionY = dy / dist; // تثبيت الاتجاه
            }

            let moveX = 0;
            let moveY = 0;

            if (this.isDashing) {
                // أثناء الـ Dash: استخدام السرعة العالية والاتجاه المخزن
                this.dashTimer -= dt;
                moveX = this.dashDirectionX * this.dashSpeed * dt;
                moveY = this.dashDirectionY * this.dashSpeed * dt;

                // إنهاء الـ Dash والعودة للوضع الطبيعي
                if (this.dashTimer <= 0) {
                    this.isDashing = false;
                    this.dashCooldownTimer = this.dashCooldown;
                }
            } else {
                // المطاردة العادية نحو اللاعب مباشرة
                const dirX = dx / dist;
                const dirY = dy / dist;
                moveX = dirX * this.speed * dt;
                moveY = dirY * this.speed * dt;
            }

            // تطبيق الحركة مع الانزلاق على الجدران (تعمل للحالتين)
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

        // حركة التنفس سريعة (لأعلى وأسفل)
        const breatheOffset = Math.sin(this.time) * 1.5;

        // 1. ظل على الأرض
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.beginPath();
        ctx.ellipse(0, 11, 10, 4, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.translate(0, breatheOffset);

        // 2. الأطراف الخلفية (Darker for depth)
        ctx.strokeStyle = '#0d0d12';
        ctx.lineWidth = 3.5;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        
        // الرجل الخلفية
        ctx.beginPath();
        ctx.moveTo(-5, 2);
        ctx.lineTo(-12, 6);
        ctx.lineTo(-8, 13);
        ctx.stroke();

        // الذراع الخلفية
        ctx.beginPath();
        ctx.moveTo(4, -2);
        ctx.lineTo(12, 6);
        ctx.lineTo(18, 10);
        ctx.stroke();

        // 3. الجسد الأساسي (محدب ومتوحش - Hunched Torso)
        ctx.fillStyle = '#15151c'; // كحلي/أسود داكن جداً
        ctx.beginPath();
        ctx.moveTo(-11, 4);  // ذيل/مؤخرة
        ctx.lineTo(-4, -7);  // تقوس الظهر
        ctx.lineTo(8, -9);   // الأكتاف العالية
        ctx.lineTo(12, 0);   // الصدر
        ctx.lineTo(2, 6);    // البطن
        ctx.closePath();
        ctx.fill();

        // تظليل داخلي لعمق الجسد
        ctx.fillStyle = '#0a0a0e';
        ctx.beginPath();
        ctx.moveTo(-7, 3);
        ctx.lineTo(-2, -4);
        ctx.lineTo(6, -6);
        ctx.lineTo(8, 2);
        ctx.closePath();
        ctx.fill();

        // 4. الأطراف الأمامية
        ctx.strokeStyle = '#1a1a24'; // أفتح قليلاً للأمامية
        
        // الرجل الأمامية
        ctx.beginPath();
        ctx.moveTo(0, 5);
        ctx.lineTo(6, 8);
        ctx.lineTo(4, 14);
        ctx.stroke();

        // الذراع الأمامية والمخالب الطويلة
        ctx.beginPath();
        ctx.moveTo(8, -4); // الكتف
        ctx.lineTo(15, 2); // الكوع
        ctx.lineTo(22, 7); // الرسغ
        ctx.stroke();
        
        // المخالب (Claws)
        ctx.strokeStyle = '#777788'; // رمادي معدني/عظمي
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(22, 7); ctx.lineTo(26, 9);
        ctx.moveTo(22, 7); ctx.lineTo(25, 12);
        ctx.moveTo(22, 7); ctx.lineTo(22, 13);
        ctx.stroke();

        // 5. الرأس (ممتد للأمام كالذئاب/الغيلان)
        ctx.fillStyle = '#101015';
        ctx.beginPath();
        ctx.moveTo(8, -8);
        ctx.lineTo(16, -10); // مقدمة الجمجمة
        ctx.lineTo(19, -5);  // الفك
        ctx.lineTo(10, -2);
        ctx.closePath();
        ctx.fill();

        // 6. العيون المتوهجة الشرسة (Feral Red/Orange Glow)
        ctx.fillStyle = '#ff2200';
        ctx.shadowBlur = 12;
        ctx.shadowColor = '#ff2200';
        ctx.beginPath();
        ctx.arc(15, -7, 1.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        ctx.restore();
    }
}