export class ParticleSystem {
    constructor() {
        this.particles = [];
        this.effects = [];
    }

    spawnHitEffect(x, y, color) {
        const numParticles = 8;
        for (let i = 0; i < numParticles; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 100 + 50;
            this.particles.push({
                x: x,
                y: y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 0.2 + Math.random() * 0.2, 
                maxLife: 0.4,
                color: color,
                size: Math.random() * 3 + 2
            });
        }
    }
    
    spawnNova(x, y, maxRadius, color) {
        this.effects.push({
            type: 'NOVA',
            x: x,
            y: y,
            radius: 10,
            maxRadius: maxRadius,
            life: 0.25,
            maxLife: 0.25,
            color: color
        });
    }

    update(dt) {
        // Update Area Effects
        for (let i = this.effects.length - 1; i >= 0; i--) {
            let e = this.effects[i];
            e.life -= dt;
            if (e.type === 'NOVA') {
                const progress = 1.0 - (e.life / e.maxLife);
                // Expand outwards using ease-out
                e.radius = 10 + (e.maxRadius - 10) * Math.sin(progress * Math.PI / 2);
            }
            if (e.life <= 0) {
                this.effects.splice(i, 1);
            }
        }

        // Update standard particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            let p = this.particles[i];
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.life -= dt;

            if (p.life <= 0) {
                this.particles.splice(i, 1);
            }
        }
    }

    render(ctx) {
        // Render Area Effects (Underneath particles)
        for (let e of this.effects) {
            if (e.type === 'NOVA') {
                ctx.save();
                const alpha = Math.max(0, e.life / e.maxLife);
                ctx.globalAlpha = alpha;
                
                ctx.strokeStyle = e.color;
                ctx.lineWidth = 4 * alpha + 2;
                ctx.shadowBlur = 15;
                ctx.shadowColor = e.color;
                
                ctx.beginPath();
                ctx.arc(e.x, e.y, e.radius, 0, Math.PI * 2);
                ctx.stroke();
                
                ctx.fillStyle = e.color;
                ctx.globalAlpha = alpha * 0.15;
                ctx.fill();
                
                ctx.restore();
            }
        }

        // Render standard particles
        for (let p of this.particles) {
            ctx.save();
            ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
            ctx.fillStyle = p.color;
            ctx.fillRect(p.x - p.size/2, p.y - p.size/2, p.size, p.size);
            ctx.restore();
        }
    }
}