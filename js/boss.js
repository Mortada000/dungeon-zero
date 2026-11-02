export class BossProjectile {
    constructor(x, y, dirX, dirY, damage = 15, color = '#ff1a1a') {
        this.x = x;
        this.y = y;
        this.vx = dirX * 300; 
        this.vy = dirY * 300;
        this.damage = damage;
        this.radius = 8;
        this.color = color;
        this.active = true;
    }

    update(dt, dungeon) {
        if (!this.active) return;
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        if (dungeon.isWallAt(this.x, this.y)) {
            this.active = false;
        }
    }

    render(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.shadowBlur = 15;
        ctx.shadowColor = this.color;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(0, 0, this.radius - 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

// 1. THE DUNGEON WARDEN
export class DungeonWarden {
    constructor(x, y, floor = 1) {
        this.x = x;
        this.y = y;
        this.name = 'THE DUNGEON WARDEN';
        this.radius = 28; 
        
        const baseHps = [1000, 1400, 2000];
        this.maxHp = baseHps[Math.min(floor - 1, 2)];
        this.hp = this.maxHp;
        
        const multiplier = 1.0 + ((floor - 1) * 0.2);
        this.contactDamage = Math.floor(20 * multiplier);
        this.projectileDamage = Math.floor(15 * multiplier);
        this.shockwaveDamage = Math.floor(30 * multiplier);
        
        this.state = 'ACTIVE';
        this.action = 'IDLE'; 
        this.currentPhase = 1;
        
        this.cooldown = 1.5;
        this.timer = 0;
        this.maxTimer = 0; 
        
        this.flashTimer = 0;
        this.targetDir = { x: 0, y: 0 };
        this.projectiles = [];
        
        this.animTime = 0;
        this.facingAngle = 0;
    }

    takeDamage(amount) {
        if (this.state === 'DEFEATED') return false;
        this.hp -= amount;
        this.flashTimer = 0.1;

        // الانتقال إلى Phase 2 (70%)
        if (this.currentPhase === 1 && this.hp <= this.maxHp * 0.70) {
            this.currentPhase = 2;
            console.log("WARDEN PHASE 2");
        }
        // الانتقال إلى Phase 3 (35%)
        else if (this.currentPhase === 2 && this.hp <= this.maxHp * 0.35) {
            this.currentPhase = 3;
            console.log("WARDEN PHASE 3");
        }

        if (this.hp <= 0) {
            this.hp = 0;
            this.state = 'DEFEATED';
            return true;
        }
        return false;
    }

    update(dt, player, dungeon, game) {
        if (this.flashTimer > 0) this.flashTimer -= dt;
        this.animTime += dt;
        
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            let p = this.projectiles[i];
            p.update(dt, dungeon);
            if (p.active && Math.sqrt(Math.pow(p.x - player.x, 2) + Math.pow(p.y - player.y, 2)) < p.radius + player.radius) {
                p.active = false;
                game.particles.spawnHitEffect(player.x, player.y, p.color);
                game.audio.play('hit_player');
                player.takeDamage(p.damage);
                game.camera.shake(0.2, 5);
                game.updateHUD();
            }
            if (!p.active) {
                game.particles.spawnHitEffect(p.x, p.y, p.color);
                this.projectiles.splice(i, 1);
            }
        }

        if (this.state === 'DEFEATED') return;

        if (this.state === 'ACTIVE') {
            this.cooldown -= dt;
            const dx = player.x - this.x;
            const dy = player.y - this.y;
            this.facingAngle = Math.atan2(dy, dx);
            
            const dist = Math.sqrt(dx*dx + dy*dy);
            if (dist > 100) {
                this.x += (dx / dist) * 40 * dt;
                this.y += (dy / dist) * 40 * dt;
            }

            if (this.cooldown <= 0) this.pickAttack(player, game);
        } 
        else if (this.state === 'TELEGRAPH') {
            this.timer -= dt;
            if (this.timer <= 0) {
                this.state = 'ATTACKING';
                if (this.action === 'CHARGE') this.timer = 0.5;
                if (this.action === 'SHOCKWAVE') {
                    game.audio.play('boss_shockwave'); // AUDIO TRIGGER
                    game.particles.spawnNova(this.x, this.y, 180, '#ff0000');
                    if (Math.sqrt(Math.pow(player.x - this.x, 2) + Math.pow(player.y - this.y, 2)) <= 180 + player.radius) {
                        player.takeDamage(this.shockwaveDamage);
                        game.audio.play('hit_player');
                        game.camera.shake(0.4, 15);
                        game.updateHUD();
                    }
                    this.resetActive();
                }
                if (this.action === 'BURST') {
                    game.audio.play('boss_burst'); // AUDIO TRIGGER
                    for (let i = this.currentPhase >= 2 ? -3 : -2; i <= (this.currentPhase >= 2 ? 3 : 2); i++) {
                        const angle = this.facingAngle + (i * 0.2);
                        this.projectiles.push(new BossProjectile(this.x, this.y, Math.cos(angle), Math.sin(angle), this.projectileDamage, '#ff1a1a'));
                    }
                    this.resetActive();
                }
            }
        }
        else if (this.state === 'ATTACKING') {
            this.timer -= dt;
            if (this.action === 'CHARGE') {
                const nextX = this.x + this.targetDir.x * 600 * dt;
                const nextY = this.y + this.targetDir.y * 600 * dt;
                if (!dungeon.isWallAt(nextX, this.y)) this.x = nextX;
                if (!dungeon.isWallAt(this.x, nextY)) this.y = nextY;
            }
            if (this.timer <= 0) this.resetActive();
        }
    }

   pickAttack(player, game) {
this.state = 'TELEGRAPH';

const rand = Math.random();

if (this.currentPhase === 1) {
    if (rand < 0.33) {
        this.action = 'CHARGE';
        this.timer = 0.8;
        this.maxTimer = 0.8;

        const dx = player.x - this.x;
        const dy = player.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        this.targetDir = {
            x: dx / dist,
            y: dy / dist
        };

        this.facingAngle = Math.atan2(dy, dx);
        game.audio.play('boss_charge');

    } else if (rand < 0.66) {
        this.action = 'SHOCKWAVE';
        this.timer = 1.2;
        this.maxTimer = 1.2;
        game.audio.play('boss_charge');

    } else {
        this.action = 'BURST';
        this.timer = 0.8;
        this.maxTimer = 0.8;
    }

} else if (this.currentPhase === 2) {
    console.log("WARDEN ATTACKING IN PHASE 2"); 
    // Phase 2: Warden becomes more aggressive

    if (rand < 0.45) {
        this.action = 'CHARGE';
        this.timer = 0.55;
        this.maxTimer = 0.55;

        const dx = player.x - this.x;
        const dy = player.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        this.targetDir = {
            x: dx / dist,
            y: dy / dist
        };

        this.facingAngle = Math.atan2(dy, dx);
        game.audio.play('boss_charge');

    } else if (rand < 0.70) {
        this.action = 'BURST';
        this.timer = 0.55;
        this.maxTimer = 0.55;

    } else {
        this.action = 'SHOCKWAVE';
        this.timer = 0.9;
        this.maxTimer = 0.9;
        game.audio.play('boss_charge');
    }
}

else if (this.currentPhase === 3) {
    // Phase 3: Enrage
    console.log("WARDEN ENRAGE");

    if (rand < 0.50) {
        this.action = 'CHARGE';
        this.timer = 0.35;
        this.maxTimer = 0.35;

        const dx = player.x - this.x;
        const dy = player.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        this.targetDir = {
            x: dx / dist,
            y: dy / dist
        };

        this.facingAngle = Math.atan2(dy, dx);
        game.audio.play('boss_charge');

    } else if (rand < 0.75) {
        this.action = 'BURST';
        this.timer = 0.35;
        this.maxTimer = 0.35;

    } else {
        this.action = 'SHOCKWAVE';
        this.timer = 0.60;
        this.maxTimer = 0.60;
        game.audio.play('boss_charge');
    }
}

}

    resetActive() {
        this.state = 'ACTIVE';
        this.action = 'IDLE';
        this.cooldown = 1.5 + Math.random();
    }

    render(ctx) {
        for (let p of this.projectiles) p.render(ctx);
        if (this.state === 'DEFEATED') return;

        ctx.save();
        ctx.translate(this.x, this.y);
        
        if (this.state === 'TELEGRAPH') {
            const tNorm = 1.0 - (this.timer / this.maxTimer); 
            const pulse = (Math.sin(tNorm * Math.PI * 10) + 1) / 2; 
            
            if (this.action === 'CHARGE') {
                ctx.strokeStyle = `rgba(255, 0, 0, ${0.5 + pulse * 0.5})`;
                ctx.lineWidth = 4 + pulse * 4;
                ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(this.targetDir.x * 400, this.targetDir.y * 400); ctx.stroke();
            } else if (this.action === 'SHOCKWAVE') {
                ctx.strokeStyle = `rgba(255, 0, 0, ${0.3 + pulse * 0.7})`;
                ctx.lineWidth = 2 + pulse * 4;
                ctx.beginPath(); ctx.arc(0, 0, 180 * tNorm, 0, Math.PI * 2); ctx.stroke();
            } else if (this.action === 'BURST') {
                ctx.fillStyle = `rgba(255, 0, 255, ${0.3 + pulse * 0.7})`;
                ctx.beginPath(); ctx.arc(0, 0, this.radius + 15 + pulse * 10, 0, Math.PI * 2); ctx.fill();
            }
        }

        ctx.rotate(this.facingAngle + Math.PI/2); 
        
        const isFlashing = this.flashTimer > 0;
        ctx.fillStyle = isFlashing ? '#fff' : '#222';
        ctx.strokeStyle = isFlashing ? '#fff' : '#111';

        const breath = this.state === 'ACTIVE' ? Math.sin(this.animTime * 5) * 0.05 : 0;
        ctx.scale(1 + breath, 1 + breath);

        ctx.save();
        if (this.state === 'TELEGRAPH' && this.action === 'BURST') ctx.rotate(-Math.PI/4); 
        else if (this.action === 'CHARGE') ctx.translate(0, -10); 
        
        ctx.fillStyle = isFlashing ? '#fff' : '#555';
        ctx.fillRect(15, -45, 12, 70); 
        ctx.fillStyle = isFlashing ? '#fff' : (this.action === 'BURST' ? '#ff00ff' : '#ff1a1a');
        ctx.shadowBlur = this.action === 'BURST' ? 15 : 0; ctx.shadowColor = '#ff00ff';
        ctx.fillRect(10, 25, 22, 6); 
        ctx.shadowBlur = 0;
        ctx.fillStyle = isFlashing ? '#fff' : '#111';
        ctx.fillRect(18, 31, 6, 20); 
        ctx.restore();

        ctx.save();
        if (this.state === 'TELEGRAPH' && this.action === 'CHARGE') ctx.translate(0, -15); 
        ctx.fillStyle = isFlashing ? '#fff' : '#1a1a1a';
        ctx.strokeStyle = isFlashing ? '#fff' : '#444';
        ctx.lineWidth = 4;
        ctx.beginPath(); ctx.arc(-22, -5, 20, -Math.PI, 0); ctx.closePath();
        ctx.fill(); ctx.stroke();
        ctx.restore();

        ctx.fillStyle = isFlashing ? '#fff' : '#222';
        ctx.beginPath(); ctx.roundRect(-20, -15, 40, 45, 8); ctx.fill();
        ctx.strokeStyle = isFlashing ? '#fff' : '#444';
        ctx.lineWidth = 2; ctx.strokeRect(-12, -10, 24, 35); 

        ctx.fillStyle = isFlashing ? '#fff' : '#333';
        ctx.beginPath(); ctx.arc(-22, -10, 12, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(22, -10, 12, 0, Math.PI*2); ctx.fill();

        ctx.fillStyle = isFlashing ? '#fff' : '#000';
        ctx.beginPath(); ctx.arc(0, -15, 15, 0, Math.PI*2); ctx.fill();
        if (!isFlashing) {
            ctx.fillStyle = '#ff1a1a';
            ctx.shadowBlur = 15; ctx.shadowColor = '#ff1a1a';
            ctx.fillRect(-6, -20, 12, 5);
            ctx.shadowBlur = 0;
        }

        ctx.restore();
    }
}

// 2. THE DRAGON
export class Dragon {
    constructor(x, y, floor = 1) {
        this.x = x; this.y = y;
        this.name = 'THE DRAGON';
        this.radius = 30; 
        
        const baseHps = [800, 1100, 1600];
        this.maxHp = baseHps[Math.min(floor - 1, 2)];
        this.hp = this.maxHp;
        
        const multiplier = 1.0 + ((floor - 1) * 0.2);
        this.contactDamage = Math.floor(15 * multiplier);
        this.projectileDamage = Math.floor(20 * multiplier);
        this.breathDamage = Math.floor(25 * multiplier);
        
        this.state = 'ACTIVE';
        this.action = 'IDLE'; 
        this.currentPhase = 1;
        this.cooldown = 1.0;
        this.timer = 0; this.maxTimer = 0; 
        
        this.flashTimer = 0;
        this.projectiles = [];
        
        this.animTime = 0;
        this.facingAngle = 0;
        this.targetPoint = {x: 0, y: 0};
    }

    takeDamage(amount) {
if (this.state === 'DEFEATED') return false;

this.hp -= amount;
this.flashTimer = 0.1;

// Phase 2 عند 75%
if (this.currentPhase === 1 && this.hp <= this.maxHp * 0.75) {
    this.currentPhase = 2;
    console.log("DRAGON PHASE 2");
}

// Phase 3 عند 40%
else if (this.currentPhase === 2 && this.hp <= this.maxHp * 0.40) {
    this.currentPhase = 3;
    console.log("DRAGON PHASE 3");
}

if (this.hp <= 0) {
    this.hp = 0;
    this.state = 'DEFEATED';
    return true;
}

return false;

}

    update(dt, player, dungeon, game) {
        if (this.flashTimer > 0) this.flashTimer -= dt;
        this.animTime += dt;
        
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            let p = this.projectiles[i];
            p.update(dt, dungeon);
            if (p.active && Math.sqrt(Math.pow(p.x - player.x, 2) + Math.pow(p.y - player.y, 2)) < p.radius + player.radius) {
                p.active = false;
                game.particles.spawnHitEffect(player.x, player.y, p.color);
                game.audio.play('hit_player');
                player.takeDamage(p.damage);
                game.camera.shake(0.2, 5);
                game.updateHUD();
            }
            if (!p.active) {
                game.particles.spawnHitEffect(p.x, p.y, p.color);
                this.projectiles.splice(i, 1);
            }
        }

        if (this.state === 'DEFEATED') return;

        if (this.state === 'ACTIVE') {
            this.cooldown -= dt;
            const dx = player.x - this.x;
            const dy = player.y - this.y;
            this.facingAngle = Math.atan2(dy, dx);
            const dist = Math.sqrt(dx*dx + dy*dy);
            
            if (dist < 150) {
                this.x -= (dx / dist) * 50 * dt;
                this.y -= (dy / dist) * 50 * dt;
            } else if (dist > 250) {
                this.x += (dx / dist) * 70 * dt;
                this.y += (dy / dist) * 70 * dt;
            }

            if (this.cooldown <= 0) this.pickAttack(player, game);
        } 
        else if (this.state === 'TELEGRAPH') {
            this.timer -= dt;
            if (this.timer <= 0) {
                this.state = 'ATTACKING';
                if (this.action === 'VOLLEY') {
                    game.audio.play('boss_burst'); // AUDIO TRIGGER
                    for (let i = -1; i <= 1; i++) {
                        const angle = this.facingAngle + (i * 0.3);
                        this.projectiles.push(new BossProjectile(this.x, this.y, Math.cos(angle), Math.sin(angle), this.projectileDamage, '#ff6600'));
                    }
                    this.resetActive();
                }
                else if (this.action === 'FIRE_BREATH') {
                    game.audio.play('boss_breath'); // AUDIO TRIGGER
                    game.particles.spawnNova(this.x, this.y, 160, '#ff3300');
                    if (Math.sqrt(Math.pow(player.x - this.x, 2) + Math.pow(player.y - this.y, 2)) <= 160 + player.radius) {
                        player.takeDamage(this.breathDamage);
                        game.audio.play('hit_player');
                        game.camera.shake(0.4, 15);
                        game.updateHUD();
                    }
                    this.resetActive();
                }
                else if (this.action === 'FLIGHT_SLAM') {
                    game.audio.play('boss_slam'); // AUDIO TRIGGER
                    this.x = this.targetPoint.x;
                    this.y = this.targetPoint.y;
                    game.particles.spawnNova(this.x, this.y, 180, '#ffaa00');
                    if (Math.sqrt(Math.pow(player.x - this.x, 2) + Math.pow(player.y - this.y, 2)) <= 180 + player.radius) {
                        player.takeDamage(this.contactDamage);
                        game.audio.play('hit_player');
                        game.camera.shake(0.5, 20);
                        game.updateHUD();
                    }
                    this.resetActive();
                }
            }
        }
    }

pickAttack(player, game) {
this.state = 'TELEGRAPH';

const rand = Math.random();

const dx = player.x - this.x;
const dy = player.y - this.y;
this.facingAngle = Math.atan2(dy, dx);

if (this.currentPhase === 1) {

    if (rand < 0.4) {
        this.action = 'VOLLEY';
        this.timer = 0.6;
        this.maxTimer = 0.6;

    } else if (rand < 0.7) {
        this.action = 'FIRE_BREATH';
        this.timer = 1.0;
        this.maxTimer = 1.0;
        game.audio.play('boss_charge');

    } else {
        this.action = 'FLIGHT_SLAM';
        this.timer = 1.2;
        this.maxTimer = 1.2;
        this.targetPoint = { x: player.x, y: player.y };
        game.audio.play('boss_charge');
    }

} else if (this.currentPhase === 2) {

    // Phase 2: Dragon becomes more aggressive

    if (rand < 0.55) {
        this.action = 'VOLLEY';
        this.timer = 0.35;
        this.maxTimer = 0.35;

    } else if (rand < 0.80) {
        this.action = 'FIRE_BREATH';
        this.timer = 0.65;
        this.maxTimer = 0.65;
        game.audio.play('boss_charge');

    } else {
        this.action = 'FLIGHT_SLAM';
        this.timer = 0.8;
        this.maxTimer = 0.8;
        this.targetPoint = { x: player.x, y: player.y };
        game.audio.play('boss_charge');
    }
}

    else if (this.currentPhase === 3) {

console.log("DRAGON ENRAGE");

if (rand < 0.60) {
    this.action = 'VOLLEY';
    this.timer = 0.25;
    this.maxTimer = 0.25;

} else if (rand < 0.90) {
    this.action = 'FIRE_BREATH';
    this.timer = 0.45;
    this.maxTimer = 0.45;
    game.audio.play('boss_charge');

} else {
    this.action = 'FLIGHT_SLAM';
    this.timer = 0.60;
    this.maxTimer = 0.60;
    this.targetPoint = { x: player.x, y: player.y };
    game.audio.play('boss_charge');
}

}

}

    resetActive() {
        this.state = 'ACTIVE'; this.action = 'IDLE';
        this.cooldown = 1.5 + Math.random();
    }

    render(ctx) {
        for (let p of this.projectiles) p.render(ctx);
        if (this.state === 'DEFEATED') return;

        if (this.state === 'TELEGRAPH' && this.action === 'FLIGHT_SLAM') {
            ctx.save();
            ctx.translate(this.targetPoint.x, this.targetPoint.y);
            const tNorm = 1.0 - (this.timer / this.maxTimer); 
            ctx.strokeStyle = `rgba(255, 170, 0, ${0.5 + tNorm * 0.5})`;
            ctx.lineWidth = 3;
            ctx.beginPath(); ctx.arc(0, 0, 180, 0, Math.PI * 2); ctx.stroke();
            ctx.fillStyle = `rgba(255, 50, 0, 0.2)`;
            ctx.beginPath(); ctx.arc(0, 0, 180 * tNorm, 0, Math.PI * 2); ctx.fill();
            ctx.restore();
        }

        ctx.save();
        ctx.translate(this.x, this.y);

        if (this.state === 'TELEGRAPH') {
            const tNorm = 1.0 - (this.timer / this.maxTimer); 
            const pulse = (Math.sin(tNorm * Math.PI * 15) + 1) / 2; 
            
            if (this.action === 'VOLLEY') {
                ctx.fillStyle = `rgba(255, 100, 0, ${0.2 + pulse * 0.5})`;
                ctx.beginPath(); ctx.arc(0, 0, this.radius + 20, 0, Math.PI * 2); ctx.fill();
            } else if (this.action === 'FIRE_BREATH') {
                ctx.strokeStyle = `rgba(255, 50, 0, ${0.4 + pulse * 0.6})`;
                ctx.lineWidth = 3;
                ctx.beginPath(); ctx.arc(0, 0, 160 * tNorm, 0, Math.PI * 2); ctx.stroke();
            }
        }

        ctx.rotate(this.facingAngle + Math.PI/2); 

        const isFlashing = this.flashTimer > 0;
        const mainColor = isFlashing ? '#fff' : '#990000';
        const outlineColor = isFlashing ? '#fff' : '#4a0000';
        
        let scale = 1.0;
        if(this.state === 'TELEGRAPH' && this.action === 'FLIGHT_SLAM') {
            const tNorm = 1.0 - (this.timer / this.maxTimer); 
            scale = 1.0 + Math.sin(tNorm * Math.PI) * 0.6; 
        }
        ctx.scale(scale, scale);

        const flapSpeed = (this.state === 'TELEGRAPH' && this.action === 'FLIGHT_SLAM') ? 20 : 5;
        const flap = Math.sin(this.animTime * flapSpeed) * 20;
        
        ctx.fillStyle = isFlashing ? '#fff' : '#660000';
        ctx.strokeStyle = outlineColor; ctx.lineWidth = 3;
        
        ctx.beginPath(); ctx.moveTo(-10, 5); 
        ctx.quadraticCurveTo(-60, -20 - flap, -80, 20); ctx.lineTo(-20, 25); 
        ctx.fill(); ctx.stroke();
        
        ctx.beginPath(); ctx.moveTo(10, 5); 
        ctx.quadraticCurveTo(60, -20 - flap, 80, 20); ctx.lineTo(20, 25); 
        ctx.fill(); ctx.stroke();

        const wag = Math.sin(this.animTime * 4) * 20;
        ctx.beginPath(); ctx.moveTo(-6, 25); ctx.lineTo(wag, 70); ctx.lineTo(6, 25); ctx.fill(); ctx.stroke();

        ctx.fillStyle = mainColor;
        ctx.beginPath(); ctx.ellipse(0, 5, 20, 30, 0, 0, Math.PI*2); ctx.fill(); ctx.stroke();
        
        ctx.save();
        if(this.state === 'TELEGRAPH' && (this.action === 'FIRE_BREATH' || this.action === 'VOLLEY')) {
            ctx.translate(0, -15); 
        }
        ctx.fillStyle = mainColor;
        ctx.beginPath(); ctx.moveTo(-12, -15); ctx.lineTo(0, -45); ctx.lineTo(12, -15); ctx.fill(); ctx.stroke();
        
        if (!isFlashing) {
            ctx.fillStyle = '#ffff00'; ctx.shadowBlur = 10; ctx.shadowColor = '#ffff00';
            ctx.beginPath(); ctx.arc(-6, -25, 3, 0, Math.PI*2); ctx.arc(6, -25, 3, 0, Math.PI*2); ctx.fill();
            ctx.shadowBlur = 0;
            
            ctx.fillStyle = '#ffaa00';
            ctx.beginPath(); ctx.moveTo(-8, -20); ctx.lineTo(-25, -10); ctx.lineTo(-12, -10); ctx.fill();
            ctx.beginPath(); ctx.moveTo(8, -20); ctx.lineTo(25, -10); ctx.lineTo(12, -10); ctx.fill();
        }
        ctx.restore();
        ctx.restore();
    }
}

// 3. THE ABYSSAL BEAST
export class AbyssalBeast {
    constructor(x, y, floor = 1) {
        this.x = x; this.y = y;
        this.name = 'THE ABYSSAL BEAST';
        this.radius = 35; 
        
        const baseHps = [1200, 1600, 2200];
        this.maxHp = baseHps[Math.min(floor - 1, 2)];
        this.hp = this.maxHp;
        
        const multiplier = 1.0 + ((floor - 1) * 0.2);
        this.contactDamage = Math.floor(25 * multiplier);
        this.shockwaveDamage = Math.floor(40 * multiplier);
        this.slamDamage = Math.floor(35 * multiplier);
        
        this.state = 'ACTIVE';
        this.action = 'IDLE'; 
        this.currentPhase = 1;
        this.cooldown = 1.5;
        this.timer = 0; this.maxTimer = 0; 
        
        this.flashTimer = 0;
        this.targetPoint = { x: 0, y: 0 };
        this.projectiles = []; 
        this.animTime = 0;
        this.facingAngle = 0;
    }

    takeDamage(amount) {
if (this.state === 'DEFEATED') return false;

this.hp -= amount;
this.flashTimer = 0.1;

// Phase 2 عند 70%
if (this.currentPhase === 1 && this.hp <= this.maxHp * 0.70) {
    this.currentPhase = 2;
    console.log("ABYSSAL BEAST PHASE 2");
}

// Phase 3 عند 35%
else if (this.currentPhase === 2 && this.hp <= this.maxHp * 0.35) {
    this.currentPhase = 3;
    console.log("ABYSSAL BEAST PHASE 3");
}

if (this.hp <= 0) {
    this.hp = 0;
    this.state = 'DEFEATED';
    return true;
}

return false;

}

    update(dt, player, dungeon, game) {
        if (this.flashTimer > 0) this.flashTimer -= dt;
        this.animTime += dt;
        
        if (this.state === 'DEFEATED') return;

        if (this.state === 'ACTIVE') {
            this.cooldown -= dt;
            const dx = player.x - this.x;
            const dy = player.y - this.y;
            this.facingAngle = Math.atan2(dy, dx);
            const dist = Math.sqrt(dx*dx + dy*dy);
            
            if (dist > 30) {
                this.x += (dx / dist) * 70 * dt;
                this.y += (dy / dist) * 70 * dt;
            }

            if (this.cooldown <= 0) this.pickAttack(player, game);
        } 
        else if (this.state === 'TELEGRAPH') {
            this.timer -= dt;
            if (this.timer <= 0) {
                this.state = 'ATTACKING';
                if (this.action === 'FAST_CHARGE') {
                    this.timer = 0.4; 
                }
                else if (this.action === 'LEAP_SLAM') {
                    game.audio.play('boss_slam'); // AUDIO TRIGGER
                    this.x = this.targetPoint.x;
                    this.y = this.targetPoint.y;
                    game.particles.spawnNova(this.x, this.y, 220, '#0055ff');
                    if (Math.sqrt(Math.pow(player.x - this.x, 2) + Math.pow(player.y - this.y, 2)) <= 220 + player.radius) {
                        player.takeDamage(this.shockwaveDamage);
                        game.audio.play('hit_player');
                        game.camera.shake(0.5, 20);
                        game.updateHUD();
                    }
                    this.resetActive();
                }
                else if (this.action === 'AREA_SLAM') {
                    game.audio.play('boss_shockwave'); // AUDIO TRIGGER
                    game.particles.spawnNova(this.x, this.y, 150, '#002288');
                    if (Math.sqrt(Math.pow(player.x - this.x, 2) + Math.pow(player.y - this.y, 2)) <= 150 + player.radius) {
                        player.takeDamage(this.slamDamage);
                        game.audio.play('hit_player');
                        game.camera.shake(0.4, 15);
                        game.updateHUD();
                    }
                    this.resetActive();
                }
            }
        }
        else if (this.state === 'ATTACKING') {
            this.timer -= dt;
            if (this.action === 'FAST_CHARGE') {
                const nextX = this.x + this.targetPoint.x * 900 * dt;
                const nextY = this.y + this.targetPoint.y * 900 * dt;
                if (!dungeon.isWallAt(nextX, this.y)) this.x = nextX;
                if (!dungeon.isWallAt(this.x, nextY)) this.y = nextY;
            }
            if (this.timer <= 0) this.resetActive();
        }
    }

    pickAttack(player, game) {
this.state = 'TELEGRAPH';

const rand = Math.random();

const dx = player.x - this.x;
const dy = player.y - this.y;

this.facingAngle = Math.atan2(dy, dx);

const dist = Math.sqrt(dx * dx + dy * dy);

if (this.currentPhase === 1) {

    if (rand < 0.4) {
        this.action = 'FAST_CHARGE';
        this.timer = 0.6;
        this.maxTimer = 0.6;

        this.targetPoint = {
            x: dx / dist,
            y: dy / dist
        };

        game.audio.play('boss_charge');

    } else if (rand < 0.7) {
        this.action = 'LEAP_SLAM';
        this.timer = 1.0;
        this.maxTimer = 1.0;

        this.targetPoint = {
            x: player.x,
            y: player.y
        };

        game.audio.play('boss_charge');

    } else {
        this.action = 'AREA_SLAM';
        this.timer = 0.8;
        this.maxTimer = 0.8;
    }

} else if (this.currentPhase === 2) {

    // Phase 2: aggressive

    if (rand < 0.50) {
        this.action = 'FAST_CHARGE';
        this.timer = 0.40;
        this.maxTimer = 0.40;

        this.targetPoint = {
            x: dx / dist,
            y: dy / dist
        };

        game.audio.play('boss_charge');

    } else if (rand < 0.80) {
        this.action = 'LEAP_SLAM';
        this.timer = 0.70;
        this.maxTimer = 0.70;

        this.targetPoint = {
            x: player.x,
            y: player.y
        };

        game.audio.play('boss_charge');

    } else {
        this.action = 'AREA_SLAM';
        this.timer = 0.60;
        this.maxTimer = 0.60;
    }

} else if (this.currentPhase === 3) {

    // Phase 3: ENRAGE

    console.log("ABYSSAL BEAST ENRAGE");

    if (rand < 0.60) {
        this.action = 'FAST_CHARGE';
        this.timer = 0.25;
        this.maxTimer = 0.25;

        this.targetPoint = {
            x: dx / dist,
            y: dy / dist
        };

        game.audio.play('boss_charge');

    } else if (rand < 0.85) {
        this.action = 'LEAP_SLAM';
        this.timer = 0.45;
        this.maxTimer = 0.45;

        this.targetPoint = {
            x: player.x,
            y: player.y
        };

        game.audio.play('boss_charge');

    } else {
        this.action = 'AREA_SLAM';
        this.timer = 0.40;
        this.maxTimer = 0.40;
    }
}

}

    resetActive() {
        this.state = 'ACTIVE'; this.action = 'IDLE';
        this.cooldown = 1.2 + Math.random();
    }

    render(ctx) {
        if (this.state === 'DEFEATED') return;

        if (this.state === 'TELEGRAPH' && this.action === 'LEAP_SLAM') {
            ctx.save();
            ctx.translate(this.targetPoint.x, this.targetPoint.y);
            const tNorm = 1.0 - (this.timer / this.maxTimer); 
            ctx.strokeStyle = `rgba(0, 85, 255, ${0.5 + tNorm * 0.5})`;
            ctx.lineWidth = 3;
            ctx.beginPath(); ctx.arc(0, 0, 220, 0, Math.PI * 2); ctx.stroke();
            ctx.fillStyle = `rgba(0, 30, 100, 0.2)`;
            ctx.beginPath(); ctx.arc(0, 0, 220 * tNorm, 0, Math.PI * 2); ctx.fill();
            ctx.restore();
        }

        ctx.save();
        ctx.translate(this.x, this.y);
        
        let scale = 1.0;
        if (this.state === 'TELEGRAPH') {
            const tNorm = 1.0 - (this.timer / this.maxTimer); 
            const pulse = (Math.sin(tNorm * Math.PI * 15) + 1) / 2; 
            
            if (this.action === 'FAST_CHARGE') {
                ctx.strokeStyle = `rgba(0, 85, 255, ${0.5 + pulse * 0.5})`;
                ctx.lineWidth = 4 + pulse * 4;
                ctx.beginPath(); ctx.moveTo(0, 0);
                ctx.lineTo(this.targetPoint.x * 500, this.targetPoint.y * 500); ctx.stroke();
            } else if (this.action === 'AREA_SLAM') {
                ctx.strokeStyle = `rgba(0, 34, 136, ${0.3 + pulse * 0.7})`;
                ctx.lineWidth = 2 + pulse * 4;
                ctx.beginPath(); ctx.arc(0, 0, 150 * tNorm, 0, Math.PI * 2); ctx.stroke();
            } else if (this.action === 'LEAP_SLAM') {
                scale = 1.0 + Math.sin(tNorm * Math.PI) * 0.5; 
            }
        }
        ctx.scale(scale, scale);

        ctx.rotate(this.facingAngle + Math.PI/2); 

        const isFlashing = this.flashTimer > 0;
        const mainColor = isFlashing ? '#fff' : '#001a4d';
        const darkColor = isFlashing ? '#fff' : '#00051a';

        // Legs
        ctx.fillStyle = darkColor;
        const run = (this.state === 'ATTACKING' || this.state === 'ACTIVE') ? Math.sin(this.animTime * 15)*12 : 0;
        ctx.fillRect(-28, -20 + run, 12, 25); 
        ctx.fillRect(16, -20 - run, 12, 25); 
        ctx.fillRect(-32, 15 - run, 14, 30); 
        ctx.fillRect(18, 15 + run, 14, 30); 

        // Spines
        ctx.fillStyle = isFlashing ? '#fff' : '#0055ff';
        for(let y = -15; y <= 25; y += 12) {
            ctx.beginPath(); ctx.moveTo(-8, y); ctx.lineTo(0, y-20); ctx.lineTo(8, y); ctx.fill();
        }

        // Body
        ctx.fillStyle = mainColor;
        ctx.beginPath(); ctx.ellipse(0, 5, 25, 45, 0, 0, Math.PI*2); ctx.fill();
        ctx.strokeStyle = isFlashing ? '#fff' : '#002b80'; 
        ctx.lineWidth = 4; ctx.stroke();

        // Head/Snout
        ctx.fillStyle = darkColor;
        ctx.beginPath(); ctx.moveTo(-16, -30); ctx.lineTo(0, -60); ctx.lineTo(16, -30); ctx.fill();

        if (!isFlashing) {
            ctx.fillStyle = '#ff0000'; ctx.shadowBlur = 10; ctx.shadowColor = '#ff0000';
            ctx.beginPath(); ctx.arc(-6, -42, 3, 0, Math.PI*2); ctx.arc(6, -42, 3, 0, Math.PI*2); ctx.fill();
            ctx.shadowBlur = 0;
            ctx.fillStyle = '#fff';
            ctx.beginPath(); ctx.moveTo(-5, -50); ctx.lineTo(-2, -65); ctx.lineTo(0, -50); ctx.fill();
            ctx.beginPath(); ctx.moveTo(5, -50); ctx.lineTo(2, -65); ctx.lineTo(0, -50); ctx.fill();
        }

        ctx.restore();
    }
}