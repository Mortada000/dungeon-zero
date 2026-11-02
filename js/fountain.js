export class Fountain {
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

        if (this.showPrompt && (input.justPressed('KeyE') || input.justPressed('e'))) {
            game.state = 'FOUNTAIN_OPEN';
            this.state = 'OPEN';
            this.showPrompt = false;
        }
    }

    render(ctx, game) {
        ctx.save();
        ctx.translate(this.x, this.y);
        
        // 1. قاعدة النافورة (حجر داكن)
        ctx.fillStyle = '#111118';
        ctx.beginPath(); ctx.ellipse(0, 5, 26, 14, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#1a1a24'; // الحوض الداخلي
        ctx.beginPath(); ctx.ellipse(0, 3, 20, 10, 0, 0, Math.PI * 2); ctx.fill();

        // 2. العمود المركزي
        ctx.fillStyle = '#0a0a10';
        ctx.fillRect(-6, -18, 12, 22);
        ctx.fillStyle = '#151520';
        ctx.fillRect(-4, -20, 8, 4); // رأس العمود

        if (this.state !== 'USED') {
            // مياه النافورة (سماوي متوهج وحيوي)
            ctx.fillStyle = 'rgba(0, 230, 255, 0.7)';
            const pulse = Math.sin(this.animTimer * 3) * 1.5;
            ctx.beginPath(); ctx.ellipse(0, 4, 18 + pulse, 8 + pulse * 0.5, 0, 0, Math.PI * 2); ctx.fill();

            // توهج ومنبع الماء
            ctx.shadowBlur = 15; ctx.shadowColor = '#00ffff'; 
            ctx.fillStyle = '#aaffff';
            ctx.beginPath(); ctx.arc(0, -16, 2.5 + Math.sin(this.animTimer * 6), 0, Math.PI * 2); ctx.fill();
            
            // الشلال الصغير
            ctx.shadowBlur = 5;
            ctx.fillStyle = 'rgba(0, 255, 255, 0.6)';
            ctx.fillRect(-2, -14, 4, 16 + Math.sin(this.animTimer * 10) * 2);
            ctx.shadowBlur = 0;
        } else {
            // النافورة الجافة
            ctx.fillStyle = '#2a2a35';
            ctx.beginPath(); ctx.ellipse(0, 4, 18, 8, 0, 0, Math.PI * 2); ctx.fill();
        }
        ctx.restore();

        // رسالة التفاعل
        if (this.showPrompt) {
            ctx.save();
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 12px monospace';
            ctx.textAlign = 'center';
            ctx.shadowBlur = 5;
            ctx.shadowColor = '#000000';
            ctx.fillText('[E] TO INTERACT', this.x, this.y - 45);
            ctx.restore();
        }
    }

    renderUI(ctx, game) {
        if (this.state === 'OPEN' && game && game.state === 'FOUNTAIN_OPEN') {
            ctx.save();
            ctx.resetTransform(); 
            
            ctx.fillStyle = 'rgba(5, 10, 15, 0.88)'; // خلفية تميل للأزرق الداكن
            ctx.fillRect(0, 0, game.viewportWidth, game.viewportHeight);
            
            ctx.translate(game.viewportWidth / 2, game.viewportHeight / 2);
            
            ctx.fillStyle = '#00ffff';
            ctx.font = 'bold 40px monospace';
            ctx.textAlign = 'center';
            ctx.shadowBlur = 20;
            ctx.shadowColor = '#00aaff';
            ctx.fillText('MYSTERIOUS FOUNTAIN', 0, -80);
            
            // الخيار 1
            ctx.shadowBlur = 10;
            ctx.shadowColor = '#33ff55';
            ctx.fillStyle = '#33ff55';
            ctx.font = 'bold 20px monospace';
            ctx.fillText('[ 1 ] DRINK', 0, -10);
            ctx.shadowBlur = 0;
            ctx.fillStyle = '#aaaaaa';
            ctx.font = '14px monospace';
            ctx.fillText('Restore 50% of missing HP', 0, 15);
            
            // الخيار 2
            ctx.shadowBlur = 10;
            ctx.shadowColor = '#ff0000';
            ctx.fillStyle = '#ff3366';
            ctx.font = 'bold 20px monospace';
            ctx.fillText('[ 2 ] SACRIFICE', 0, 70);
            ctx.shadowBlur = 0;
            ctx.fillStyle = '#aaaaaa';
            ctx.font = '14px monospace';
            ctx.fillText('-10% Max HP / +150 GOLD', 0, 95);
            
            ctx.restore();
        }
    }
}