export class Brute {
    constructor(x, y, multiplier = 1.0) {
        this.x = x;
        this.y = y;
        
        // المواصفات المطلوبة للـ Brute
        this.radius = 18; // حجم تصادم كبير يتناسب مع ضخامته
        this.maxHp = 140 * multiplier; // صحة عالية جداً
        this.hp = this.maxHp;
        this.speed = 65; // حركة بطيئة وثقيلة
        this.detectionRadius = 260;
        this.contactDamage = 25; // ضرر تلامس مميت

        // خصائص إضافية للتوافق مع أنظمة اللعبة
        this.isSummon = false;
        this.flashTimer = 0;
        
        // عداد وقت لعمل Idle Animation (تنفس بطيء وعميق)
        this.time = Math.random() * 100;
        
        // لتحديد اتجاه نظر الشخصية
        this.facingLeft = false;
    }

    takeDamage(amount) {
        this.hp -= amount;
        this.flashTimer = 0.1; // وميض عند تلقي الضرر
        
        if (this.hp <= 0) {
            return true; // يرجع true ليموت ويسقط غنائم في game.js
        }
        return false;
    }

    // نظام فحص التصادم مع الجدران باستخدام isWallAt الآمنة
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
        // سرعة الـ Animation بطيئة جداً لتعكس ثقله وحجمه
        this.time += dt * 3.5; 
        
        if (this.flashTimer > 0) {
            this.flashTimer -= dt;
        }

        // --- نظام الحركة والمطاردة ---
        if (!player) return;

        const dx = player.x - this.x;
        const dy = player.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        // إذا كان اللاعب داخل نطاق الرؤية
        if (dist < this.detectionRadius && dist > 0) {
            this.facingLeft = dx < 0;

            const dirX = dx / dist;
            const dirY = dy / dist;
            
            // يتحرك ببطء نحو اللاعب
            let moveX = dirX * this.speed * dt;
            let moveY = dirY * this.speed * dt;

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

        // حركة التنفس بطيئة وعميقة (لأعلى وأسفل)
        const breatheOffset = Math.sin(this.time) * 1.2;

        // 1. ظل ضخم على الأرض
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.beginPath();
        ctx.ellipse(0, 16, 15, 6, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.translate(0, breatheOffset);

        // 2. الرجل الخلفية (مظلمة وقصيرة)
        ctx.strokeStyle = '#0a0a0f';
        ctx.lineWidth = 6;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(-6, 8); 
        ctx.lineTo(-8, 15);
        ctx.stroke();

        // 3. الذراع الخلفية (عريضة تتدلى للأسفل)
        ctx.strokeStyle = '#0f0f14';
        ctx.lineWidth = 8;
        ctx.beginPath();
        ctx.moveTo(-2, -8); 
        ctx.lineTo(-8, 4); 
        ctx.lineTo(-5, 17);
        ctx.stroke();

        // 4. الرجل الأمامية (سميكة وثقيلة)
        ctx.strokeStyle = '#121218';
        ctx.lineWidth = 7;
        ctx.beginPath();
        ctx.moveTo(4, 10); 
        ctx.lineTo(6, 16);
        ctx.stroke();

        // 5. الجسد الأساسي (أحدب، ضخم، دروع عضلية/وحشية)
        ctx.fillStyle = '#16161d'; // رمادي/كحلي فاحم
        ctx.beginPath();
        ctx.moveTo(-12, 2);   // أسفل الظهر
        ctx.lineTo(-8, -14);  // الحدبة (Hump) العالية
        ctx.lineTo(8, -12);   // الصدر العلوي
        ctx.lineTo(14, 0);    // البطن البارز
        ctx.lineTo(4, 10);    // أسفل الحوض
        ctx.closePath();
        ctx.fill();

        // تفاصيل وتظليل لعمق الجسد الداخلي
        ctx.fillStyle = '#0e0e12';
        ctx.beginPath();
        ctx.moveTo(-6, -10);
        ctx.lineTo(4, -8);
        ctx.lineTo(8, 2);
        ctx.lineTo(0, 6);
        ctx.closePath();
        ctx.fill();

        // 6. الرأس (صغير جداً ومندمج مع الصدر/الحدبة)
        ctx.fillStyle = '#08080a';
        ctx.beginPath();
        ctx.arc(11, -8, 5.5, 0, Math.PI * 2);
        ctx.fill();

        // 7. العين المتوهجة (Fierce Yellow/Orange Glow)
        ctx.fillStyle = '#ffaa00';
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#ffaa00';
        ctx.beginPath();
        ctx.arc(13, -9, 1.8, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0; // إيقاف التوهج لباقي العناصر

        // 8. الذراع الأمامية (هائلة الحجم، تقريباً تلامس الأرض)
        ctx.strokeStyle = '#1a1a22';
        ctx.lineWidth = 11; // أسمك عنصر في التصميم ليعطي شعور القوة
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(4, -6);    // الكتف الضخم
        ctx.lineTo(14, 6);    // الكوع
        ctx.lineTo(11, 18);   // قبضة ضخمة تتدلى
        ctx.stroke();
        
        // تفصيل القبضة/المخالب
        ctx.fillStyle = '#111116';
        ctx.beginPath();
        ctx.arc(11, 18, 6, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }
}