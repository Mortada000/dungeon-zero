export class Pickup {
    // STAGE 8: Added goldMultiplier parameter
    constructor(x, y, type, goldMultiplier = 1.0) {
        this.x = x;
        this.y = y;
        this.type = type; 
        
        this.radius = 10;
        this.floatTimer = Math.random() * Math.PI * 2; 
        
        if (this.type === 'GOLD') {
            const baseGold = Math.floor(Math.random() * 6) + 5;
            this.value = Math.floor(baseGold * goldMultiplier);
        } else if (this.type === 'HEALTH') {
            this.value = 20; 
        }
    }

    update(dt) {
        this.floatTimer += dt * 3; 
    }

    render(ctx) {
        ctx.save();
        const hoverY = Math.sin(this.floatTimer) * 4;
        ctx.translate(this.x, this.y + hoverY);

        if (this.type === 'GOLD') {
            ctx.shadowBlur = 10;
            ctx.shadowColor = '#ffd700';
            ctx.fillStyle = '#ffd700';
            
            ctx.beginPath();
            ctx.moveTo(0, -6);
            ctx.lineTo(6, 0);
            ctx.lineTo(0, 6);
            ctx.lineTo(-6, 0);
            ctx.closePath();
            ctx.fill();
            
        } else if (this.type === 'HEALTH') {
            ctx.shadowBlur = 15;
            ctx.shadowColor = '#33ff55';
            ctx.fillStyle = '#33ff55';
            
            ctx.beginPath();
            ctx.arc(0, 0, 5, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(0, 0, 2, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
    }
}