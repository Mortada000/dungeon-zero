export class FloatingText {
    constructor(x, y, text, color) {
        this.x = x;
        this.y = y;
        this.text = text;
        this.color = color;
        this.life = 1.0;
        this.maxLife = 1.0;
        this.vy = -30; // Float upwards
    }

    update(dt) {
        this.y += this.vy * dt;
        this.life -= dt;
    }

    render(ctx) {
        ctx.save();
        const alpha = Math.max(0, this.life / this.maxLife);
        ctx.globalAlpha = alpha;
        
        ctx.fillStyle = this.color;
        ctx.font = 'bold 14px monospace';
        ctx.textAlign = 'center';
        
        // Add subtle shadow for legibility
        ctx.shadowColor = '#000000';
        ctx.shadowBlur = 4;
        ctx.shadowOffsetX = 1;
        ctx.shadowOffsetY = 1;

        ctx.fillText(this.text, this.x, this.y);
        ctx.restore();
    }
}