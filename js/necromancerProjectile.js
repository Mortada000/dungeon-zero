export class NecromancerProjectile {
    constructor(startX, startY, targetX, targetY) {
        this.x = startX;
        this.y = startY;
        
        // المواصفات المطلوبة للمقذوف
        this.radius = 5;
        this.speed = 240;
        this.damage = 12;
        this.lifetime = 3.0; // مدة الحياة 3 ثوانٍ
        this.dead = false;

        // حساب زاوية وسرعة الانطلاق نحو اللاعب
        const dx = targetX - startX;
        const dy = targetY - startY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist > 0) {
            this.vx = (dx / dist) * this.speed;
            this.vy = (dy / dist) * this.speed;
        } else {
            this.vx = this.speed;
            this.vy = 0;
        }

        // متغيرات إضافية للتأثيرات البصرية (Dark Fantasy)
        this.angle = Math.atan2(this.vy, this.vx);
        this.time = 0;
        this.trail = []; // مصفوفة لحفظ الأماكن السابقة ورسم الذيل السحري
    }

    update(dt, dungeon) {
        if (this.dead) return;

        this.time += dt;
        
        // تحديث مدة الحياة
        this.lifetime -= dt;
        if (this.lifetime <= 0) {
            this.dead = true;
            return;
        }

        // حفظ الموقع الحالي قبل الحركة لرسم الـ Trail
        this.trail.push({ x: this.x, y: this.y });
        // الاحتفاظ بآخر 6 نقاط فقط للذيل
        if (this.trail.length > 6) {
            this.trail.shift();
        }

        // تحريك المقذوف
        this.x += this.vx * dt;
        this.y += this.vy * dt;

        // فحص الاصطدام بالجدران ليموت ويتوقف فوراً
        if (dungeon.isWallAt(this.x, this.y)) {
            this.dead = true;
        }
    }

    render(ctx) {
        if (this.dead) return;

        ctx.save();
        
        // 1. رسم الذيل السحري (Magic Trail)
        if (this.trail.length > 1) {
            ctx.beginPath();
            ctx.moveTo(this.trail[0].x, this.trail[0].y);
            for (let i = 1; i < this.trail.length; i++) {
                ctx.lineTo(this.trail[i].x, this.trail[i].y);
            }
            // خط الذيل
            ctx.strokeStyle = 'rgba(170, 0, 255, 0.4)';
            ctx.lineWidth = 2;
            ctx.lineCap = 'round';
            ctx.stroke();

            // رسم ذرات سحرية متلاشية على طول الذيل
            for (let i = 0; i < this.trail.length; i++) {
                const p = this.trail[i];
                const size = (i / this.trail.length) * this.radius * 0.8;
                ctx.fillStyle = `rgba(80, 0, 130, ${i / this.trail.length * 0.6})`;
                ctx.beginPath();
                ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        // 2. رسم المقذوف الأساسي
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle); // تدوير المقذوف باتجاه الحركة

        // تأثير نبض للطاقة
        const pulse = Math.abs(Math.sin(this.time * 20)) * 1.5;

        // التوهج البنفسجي السحري (Violet Glow)
        ctx.shadowBlur = 10 + pulse;
        ctx.shadowColor = '#d000ff';

        // الهالة الخارجية (Dark Purple Energy)
        ctx.fillStyle = '#220044'; 
        ctx.beginPath();
        // رسم شكل بيضاوي مسحوب قليلاً ليعطي إحساس السرعة
        ctx.ellipse(0, 0, this.radius + 2, this.radius, 0, 0, Math.PI * 2);
        ctx.fill();

        // النواة الداخلية (شكل شظية / Shard Shape)
        ctx.fillStyle = '#aa00ff';
        ctx.beginPath();
        ctx.moveTo(this.radius + 1 + pulse, 0); // الرأس الأمامي المدبب
        ctx.lineTo(0, this.radius - 1.5);       // القمة
        ctx.lineTo(-this.radius - 1, 0);        // النهاية الخلفية
        ctx.lineTo(0, -this.radius + 1.5);      // القاع
        ctx.closePath();
        ctx.fill();

        // بؤرة طاقة ساطعة في المقدمة
        ctx.fillStyle = '#ffccff'; // لون زهري/أبيض ساطع جداً
        ctx.shadowBlur = 0; // إيقاف الظل للبؤرة
        ctx.beginPath();
        ctx.arc(this.radius * 0.4, 0, 1.2, 0, Math.PI * 2); 
        ctx.fill();

        ctx.restore();
    }
}