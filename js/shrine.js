export class Shrine {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.state = 'IDLE'; // IDLE, OPEN, USED
        this.animTimer = 0;
        this.interactRadius = 70;
        this.showPrompt = false;
    }

    update(dt, player, input, game) {
        if (this.state === 'USED') {
            this.showPrompt = false;
            return;
        }

        this.animTimer += dt;
        const dx = player.x - this.x;
        const dy = player.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        this.showPrompt = (dist <= this.interactRadius && this.state === 'IDLE');

        // التفاعل مع المذبح
        if (this.showPrompt && (input.justPressed('KeyE') || input.justPressed('e'))) {
            game.state = 'SHRINE_OPEN';
            this.state = 'OPEN';
            this.showPrompt = false;
        }
    }

    render(ctx, game) {
        ctx.save();
        ctx.translate(this.x, this.y);
        
        // حركة طفو خفيفة
        const floatY = (this.state !== 'USED') ? Math.sin(this.animTimer * 2) * 3 : 0;
        ctx.translate(0, floatY);

        // قاعدة المذبح (حجر داكن)
        ctx.fillStyle = '#1a1a24';
        ctx.fillRect(-16, -10, 32, 20);
        ctx.fillStyle = '#0f0f15';
        ctx.fillRect(-18, 10, 36, 6); // الدرج السفلي
        ctx.fillRect(-12, -14, 24, 4); // السطح العلوي

        if (this.state !== 'USED') {
            // النواة السحرية والرموز (توهج بنفسجي)
            ctx.shadowBlur = 15;
            ctx.shadowColor = '#9900ff';
            ctx.fillStyle = '#cc66ff';
            
            // رمز نابض
            const pulse = 1 + Math.sin(this.animTimer * 4) * 0.2;
            ctx.scale(pulse, pulse);
            ctx.beginPath();
            ctx.moveTo(0, -12);
            ctx.lineTo(8, 0);
            ctx.lineTo(0, 12);
            ctx.lineTo(-8, 0);
            ctx.closePath();
            ctx.fill();

            // قلب النواة الساطع
            ctx.shadowBlur = 0;
            ctx.fillStyle = '#ffffff';
            ctx.beginPath(); ctx.arc(0, 0, 3, 0, Math.PI * 2); ctx.fill();
        } else {
            // المذبح المستنفد (مطفأ)
            ctx.fillStyle = '#333344';
            ctx.beginPath();
            ctx.moveTo(0, -12);
            ctx.lineTo(8, 0);
            ctx.lineTo(0, 12);
            ctx.lineTo(-8, 0);
            ctx.closePath();
            ctx.fill();
        }
        ctx.restore();

        // رسالة التفاعل فوق المذبح
        if (this.showPrompt) {
            ctx.save();
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 12px monospace';
            ctx.textAlign = 'center';
            ctx.shadowBlur = 5;
            ctx.shadowColor = '#000000';
            ctx.fillText('[E] TO INTERACT', this.x, this.y - 35);
            ctx.restore();
        }

        // رسم واجهة الاختيارات مباشرة على الـ Canvas لتجنب تعديل HTML/CSS
        if (this.state === 'OPEN' && game && game.state === 'SHRINE_OPEN') {
            ctx.save();
            ctx.resetTransform(); // الرسم بملء الشاشة الثابتة
            
            // خلفية مظلمة
            ctx.fillStyle = 'rgba(10, 0, 15, 0.85)';
            ctx.fillRect(0, 0, game.viewportWidth, game.viewportHeight);
            
            ctx.translate(game.viewportWidth / 2, game.viewportHeight / 2);
            
            // العنوان
            ctx.fillStyle = '#bb88ff';
            ctx.font = 'bold 40px monospace';
            ctx.textAlign = 'center';
            ctx.shadowBlur = 20;
            ctx.shadowColor = '#9900ff';
            ctx.fillText('MYSTERIOUS SHRINE', 0, -80);
            
            // الخيار الأول: البركة
            ctx.shadowBlur = 10;
            ctx.shadowColor = '#ffffff';
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 20px monospace';
            ctx.fillText('[ 1 ] BLESSING', 0, -10);
            ctx.shadowBlur = 0;
            ctx.fillStyle = '#aaaaaa';
            ctx.font = '14px monospace';
            ctx.fillText('+20% Attack Damage for this Run', 0, 15);
            
            // الخيار الثاني: اللعنة
            ctx.shadowBlur = 10;
            ctx.shadowColor = '#ff0000';
            ctx.fillStyle = '#ff3366';
            ctx.font = 'bold 20px monospace';
            ctx.fillText('[ 2 ] CURSE', 0, 70);
            ctx.shadowBlur = 0;
            ctx.fillStyle = '#aaaaaa';
            ctx.font = '14px monospace';
            ctx.fillText('-10% Max HP / +100 GOLD', 0, 95);
            
            ctx.restore();
        }
        
    } // نهاية دالة render الأصلية

    // دالة جديدة مخصصة لرسم الواجهة فوق كل شيء
    renderUI(ctx, game) {
        if (this.state === 'OPEN' && game && game.state === 'SHRINE_OPEN') {
            ctx.save();
            ctx.resetTransform(); 
            
            ctx.fillStyle = 'rgba(10, 0, 15, 0.85)';
            ctx.fillRect(0, 0, game.viewportWidth, game.viewportHeight);
            
            ctx.translate(game.viewportWidth / 2, game.viewportHeight / 2);
            
            ctx.fillStyle = '#bb88ff';
            ctx.font = 'bold 40px monospace';
            ctx.textAlign = 'center';
            ctx.shadowBlur = 20;
            ctx.shadowColor = '#9900ff';
            ctx.fillText('MYSTERIOUS SHRINE', 0, -80);
            
            ctx.shadowBlur = 10;
            ctx.shadowColor = '#ffffff';
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 20px monospace';
            ctx.fillText('[ 1 ] BLESSING', 0, -10);
            ctx.shadowBlur = 0;
            ctx.fillStyle = '#aaaaaa';
            ctx.font = '14px monospace';
            ctx.fillText('+20% Attack Damage for this Run', 0, 15);
            
            ctx.shadowBlur = 10;
            ctx.shadowColor = '#ff0000';
            ctx.fillStyle = '#ff3366';
            ctx.font = 'bold 20px monospace';
            ctx.fillText('[ 2 ] CURSE', 0, 70);
            ctx.shadowBlur = 0;
            ctx.fillStyle = '#aaaaaa';
            ctx.font = '14px monospace';
            ctx.fillText('-10% Max HP / +100 GOLD', 0, 95);
            
            ctx.restore();
        }
    }
    
}