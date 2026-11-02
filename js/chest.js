import { generateLoot } from './loot.js';

export class Chest {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.state = 'CLOSED'; // CLOSED, OPENING, OPENED
        this.animTimer = 0;
        this.interactRadius = 70;
        this.showPrompt = false;
    }

    update(dt, player, input, game) {
        if (this.state === 'OPENED') {
            this.showPrompt = false;
            return;
        }

        const dx = player.x - this.x;
        const dy = player.y - this.y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        
        this.showPrompt = (dist <= this.interactRadius && this.state === 'CLOSED');

        // Allow both KeyE (hardware code) and standard 'e' character input
        if (this.showPrompt && (input.justPressed('KeyE') || input.justPressed('e'))) {
            this.state = 'OPENING';
            this.animTimer = 0;
            this.showPrompt = false;
        }

        if (this.state === 'OPENING') {
            this.animTimer += dt;
            if (this.animTimer >= 0.6) { // takes 0.6s to finish opening animation
                this.state = 'OPENED';
                generateLoot(this.x, this.y, player, game);
                
                // Update stage 5 room state
                const room = game.dungeon.getRoomAt(this.x, this.y);
                if (room) room.state = 'CHEST_OPENED';
            }
        }
    }

    render(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        
        if (this.state === 'CLOSED') {
            // Idle float/glow
            const floatY = Math.sin(performance.now() / 300) * 2;
            ctx.translate(0, floatY);
            
            ctx.shadowBlur = 20;
            ctx.shadowColor = '#ffd700';
            
            ctx.fillStyle = '#221100'; // Chest base
            ctx.fillRect(-16, -12, 32, 24);
            ctx.fillStyle = '#ffd700'; // Gold trims
            ctx.fillRect(-18, -4, 36, 6);
            ctx.fillRect(-4, -6, 8, 10);
            
        } else if (this.state === 'OPENING') {
            // Violent shake and bright glow
            const shakeX = (Math.random() - 0.5) * 6;
            const shakeY = (Math.random() - 0.5) * 6;
            ctx.translate(shakeX, shakeY);
            
            const progress = this.animTimer / 0.6;
            ctx.shadowBlur = 20 + progress * 50;
            ctx.shadowColor = '#ffffff';
            
            ctx.fillStyle = '#ffd700';
            ctx.fillRect(-18, -4, 36, 6);
            
        } else if (this.state === 'OPENED') {
            ctx.shadowBlur = 0;
            ctx.fillStyle = '#1a0a00';
            ctx.fillRect(-16, -12, 32, 24);
            ctx.fillStyle = '#050505'; // Dark inside
            ctx.fillRect(-12, -8, 24, 16);
            
            // Open lid backwards
            ctx.fillStyle = '#221100';
            ctx.fillRect(-16, -26, 32, 12);
            ctx.fillStyle = '#aa8800'; // Dimmer trim for opened chest
            ctx.fillRect(-18, -26, 36, 4);
        }
        ctx.restore();

        // Draw interaction prompt cleanly above chest in world space
        if (this.showPrompt) {
            ctx.save();
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 12px monospace';
            ctx.textAlign = 'center';
            ctx.shadowBlur = 5;
            ctx.shadowColor = '#000000';
            ctx.fillText('[E] TO OPEN', this.x, this.y - 35);
            ctx.restore();
        }
    }
}