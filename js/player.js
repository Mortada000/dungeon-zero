import { WEAPONS } from './weapon.js';
import { SKINS } from './skins.js';

export class Player {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.radius = 14;
        
        this.speed = 280;
        this.maxHp = 100;
        this.hp = 100;
        
        this.damageMultiplier = 1.0;
        this.attackSpeedMultiplier = 1.0;
        this.goldMultiplier = 1.0;
        
        this.weapons = JSON.parse(JSON.stringify(WEAPONS));
        this.currentWeaponIndex = 0;
        
        this.relics = []; 
        
        this.level = 1;
        this.xp = 0;
        this.maxXp = 100;
        this.gold = 0;

        this.facing = { x: 1, y: 0 };
        this.attackTimer = 0;
        this.invulnTimer = 0;
        this.isAttacking = false;
        this.attackDuration = 0.15; 

        this.skin = SKINS[0];
        this.walkTimer = 0;
        this.isMoving = false;
    }

    setSkin(skinId) {
        const found = SKINS.find(s => s.id === skinId);
        if (found) {
            this.skin = found;
        }
    }

    get currentWeapon() {
        return this.weapons[this.currentWeaponIndex];
    }
    
    switchWeapon(index) {
        if (index >= 0 && index < this.weapons.length) {
            this.currentWeaponIndex = index;
            this.isAttacking = false; 
        }
    }

    upgradeRandomWeapon() {
        const available = this.weapons.filter(w => w.level < w.maxLevel);
        if (available.length === 0) return null;
        const w = available[Math.floor(Math.random() * available.length)];
        w.level++;
        w.damage = Math.floor(w.baseDamage * (1 + (w.level - 1) * 0.15));
        return w;
    }

    hasRelic(id) {
        return this.relics.includes(id);
    }

    addRelic(relicDef) {
        if (this.hasRelic(relicDef.id)) return;
        this.relics.push(relicDef.id);
        if (relicDef.id === 'BERSERKER_CORE') {
            this.damageMultiplier += 0.15;
            this.maxHp = Math.max(1, Math.floor(this.maxHp * 0.95));
            if (this.hp > this.maxHp) this.hp = this.maxHp;
        } else if (relicDef.id === 'SWIFT_CORE') {
            this.speed *= 1.15;
        } else if (relicDef.id === 'GUARDIAN_CORE') {
            this.maxHp += 20;
            this.hp += 20;
        }
    }

    gainXp(amount) {
        this.xp += amount;
        let leveledUp = false;
        while (this.xp >= this.maxXp) {
            this.level++;
            this.xp -= this.maxXp;
            this.maxXp = Math.floor(100 * Math.pow(1.5, this.level - 1));
            leveledUp = true;
        }
        return leveledUp;
    }

    gainGold(amount) {
        this.gold += amount;
    }

    heal(amount) {
        this.hp += amount;
        if (this.hp > this.maxHp) this.hp = this.maxHp;
    }

    update(dt, input, dungeon) {
        if (this.attackTimer > 0) this.attackTimer -= dt;
        if (this.invulnTimer > 0) this.invulnTimer -= dt;
        
        const weapon = this.currentWeapon;
        
        // --- Synergy Check: SWIFT_CORE + FURY ---
        let currentAttackSpeed = this.attackSpeedMultiplier;
        let currentMovementSpeed = this.speed;
        
        if (this.hasRelic('SWIFT_CORE') && this.attackSpeedMultiplier > 1.0) {
            currentAttackSpeed += 0.10;
            currentMovementSpeed *= 1.10;
        }
        
        const finalCooldown = weapon.cooldown / currentAttackSpeed;
        
        this.isAttacking = (this.attackTimer > finalCooldown - this.attackDuration);

        const dir = input.getDirection();
        this.isMoving = (dir.x !== 0 || dir.y !== 0);

        if (this.isMoving) {
            this.walkTimer += dt * 15; 
            if (!this.isAttacking) {
                this.facing = { x: dir.x, y: dir.y };
            }
            const nextX = this.x + dir.x * currentMovementSpeed * dt;
            const nextY = this.y + dir.y * currentMovementSpeed * dt;

            if (!this.checkCollision(nextX, this.y, dungeon)) {
                this.x = nextX;
            }
            if (!this.checkCollision(this.x, nextY, dungeon)) {
                this.y = nextY;
            }
        } else {
            this.walkTimer = 0;
        }

        if (input.justPressed('Space') && this.attackTimer <= 0) {
            this.attackTimer = finalCooldown;
            return weapon; 
        }
        return null;
    }

    takeDamage(amount) {
        if (this.invulnTimer > 0) return false;
        this.hp -= amount;
        if (this.hp < 0) this.hp = 0;
        this.invulnTimer = 0.5;
        return true;
    }

    checkCollision(newX, newY, dungeon) {
        const r = this.radius;
        const points = [
            { x: newX - r, y: newY - r },
            { x: newX + r, y: newY - r },
            { x: newX - r, y: newY + r },
            { x: newX + r, y: newY + r }
        ];

        for (let p of points) {
            if (dungeon.isWallAt(p.x, p.y)) return true;
        }
        return false;
    }

    // --- DRAWING HELPERS ---

    drawWeaponAndHands(ctx, leftHandX, rightHandX, w, skin) {
        ctx.fillStyle = w.color;
        ctx.shadowBlur = 10;
        ctx.shadowColor = w.color;
        
        // رسم السلاح (أسفل اليد)
        if (w.type === 'MELEE') {
    if (w.id === 'IRON_BLADE') {
        ctx.save();
        ctx.translate(leftHandX, -14);

        ctx.fillStyle = '#2a1b1b'; 
        ctx.fillRect(0, -2, 8, 4);

        ctx.fillStyle = '#111115'; 
        ctx.fillRect(6, -6, 3, 12);

        ctx.fillStyle = '#b0b0b5';
        ctx.beginPath();
        ctx.moveTo(9, -2);
        ctx.lineTo(26, -1.5);
        ctx.lineTo(30, 0);
        ctx.lineTo(26, 1.5);
        ctx.lineTo(9, 2);
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = '#555';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(9, 0);
        ctx.lineTo(27, 0);
        ctx.stroke();

        ctx.restore();
    } else if (w.id === 'BLOOD_SCYTHE') {
        ctx.save();
        ctx.translate(leftHandX, -14);

        // Dark handle
        ctx.fillStyle = '#160b0b';
        ctx.fillRect(-2, -2, 26, 4);

        // Metal grip
        ctx.fillStyle = '#3a1717';
        ctx.fillRect(18, -4, 4, 8);

        // Curved blood blade
        ctx.fillStyle = '#8b0000';
        ctx.shadowBlur = 8;
        ctx.shadowColor = '#8b0000';

        ctx.beginPath();
        ctx.moveTo(21, -2);
        ctx.quadraticCurveTo(27, -18, 12, -27);
        ctx.quadraticCurveTo(18, -14, 17, -2);
        ctx.closePath();
        ctx.fill();

        // Sharp edge
        ctx.shadowBlur = 0;
        ctx.strokeStyle = '#ff3333';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(21, -2);
        ctx.quadraticCurveTo(27, -18, 12, -27);
        ctx.stroke();

        ctx.restore();
    } else {
        ctx.fillRect(leftHandX, -16, 18, 4); 
    }
} else {
    if (w.id === 'ARCANE_BOLT') {
        ctx.save();

        ctx.translate(leftHandX, -14);

        ctx.fillStyle = '#1a1a24';
        ctx.fillRect(0, -1, 15, 2.5);

        ctx.fillStyle = '#0a0a0f';
        ctx.fillRect(0, 0.5, 15, 1);

        ctx.translate(16, 0);

        ctx.shadowBlur = 8;
        ctx.shadowColor = '#d000ff';
        ctx.fillStyle = '#9900ff';

        ctx.beginPath();
        ctx.moveTo(4, 0);
        ctx.lineTo(0, 3);
        ctx.lineTo(-3, 0);
        ctx.lineTo(0, -3);
        ctx.closePath();
        ctx.fill();

        ctx.shadowBlur = 0;
        ctx.fillStyle = '#ffccff';

        ctx.beginPath();
        ctx.arc(0.5, 0, 1, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    } else if (w.id === 'FROST_NOVA') {
                ctx.save();
                // نقل نقطة الرسم ليد اللاعب
                ctx.translate(leftHandX, -14); 

                // 1. جسم العصا الجليدية (Dark Frost Staff)
                ctx.fillStyle = '#111820'; // معدن أزرق داكن جداً يميل للأسود
                ctx.fillRect(0, -1.5, 16, 2);
                ctx.fillStyle = '#1c2836'; // تظليل للعمق
                ctx.fillRect(0, 0.5, 16, 1);

                // 2. الكريستالة الجليدية في الطرف (Ice Crystal)
                ctx.translate(17, -0.5); 
                ctx.shadowBlur = 10;
                ctx.shadowColor = '#00e5ff'; // توهج جليدي سماوي/أزرق فاتح
                ctx.fillStyle = '#00bfff';

                // رسم كريستالة مسننة وحادة
                ctx.beginPath();
                ctx.moveTo(0, -4);  // قمة الكريستالة
                ctx.lineTo(3, -1);
                ctx.lineTo(5, 0);   // الطرف المدبب المتجه للأمام
                ctx.lineTo(3, 1);
                ctx.lineTo(0, 4);   // قاع الكريستالة
                ctx.lineTo(-2, 0);  // القاعدة المتصلة بالعصا
                ctx.closePath();
                ctx.fill();

                // 3. لمعان أبيض ثلجي في قلب الكريستالة
                ctx.shadowBlur = 0; // إيقاف الظل للنواة
                ctx.fillStyle = '#ffffff';
                ctx.beginPath();
                ctx.moveTo(0, -2);
                ctx.lineTo(2, 0);
                ctx.lineTo(0, 2);
                ctx.lineTo(-1, 0);
                ctx.closePath();
                ctx.fill();

                ctx.restore();
                
                
            } else {
                // رسم أي أسلحة سحرية أخرى بالشكل الافتراضي
                ctx.fillRect(leftHandX, -15, 12, 3); 
                ctx.beginPath(); ctx.arc(leftHandX + 12, -13.5, 4, 0, Math.PI*2); ctx.fill(); 
            }
}
        ctx.shadowBlur = 0;

        // رسم اليدين بلون الـ Skin
        ctx.fillStyle = skin.primary;
        ctx.beginPath(); ctx.arc(leftHandX, -14, 4, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(rightHandX, 14, 4, 0, Math.PI*2); ctx.fill();
        
        // رسم قوس الهجوم
        if (this.isAttacking && w.type === 'MELEE') {
            if (w.id === 'IRON_BLADE') {
                ctx.save();
                
                // إعدادات خطوط الشرار (معدني، حاد، وقصير)
                ctx.strokeStyle = '#ffffff'; // أبيض ناصع
                ctx.lineWidth = 1.5;
                ctx.lineCap = 'round';
                
                // توهج معدني بسيط جداً للشرار
                ctx.shadowBlur = 4;
                ctx.shadowColor = '#e0e0e0';

                ctx.beginPath();
                
                // رسم 6 خطوط صغيرة تمثل شرارات حادة متطايرة باتجاه الضربة
                // الشرارة 1 (علوية بعيدة)
                ctx.moveTo(w.range - 8, -10);
                ctx.lineTo(w.range + 4, -16);
                
                // الشرارة 2 (وسطية مستقيمة للأمام)
                ctx.moveTo(w.range - 2, -2);
                ctx.lineTo(w.range + 10, -3);
                
                // الشرارة 3 (سفلية بعيدة)
                ctx.moveTo(w.range - 6, 8);
                ctx.lineTo(w.range + 4, 14);
                
                // الشرارة 4 (علوية قريبة)
                ctx.moveTo(w.range - 15, -6);
                ctx.lineTo(w.range - 7, -11);
                
                // الشرارة 5 (سفلية قريبة)
                ctx.moveTo(w.range - 12, 6);
                ctx.lineTo(w.range - 4, 12);
                
                // الشرارة 6 (أمامية منخفضة)
                ctx.moveTo(w.range, 3);
                ctx.lineTo(w.range + 8, 6);

                ctx.stroke();
                
                // رسم 3 شظايا معدنية صغيرة جداً (نقاط)
                ctx.fillStyle = '#cccccc'; // رمادي معدني
                ctx.shadowBlur = 0; // بدون توهج للشظايا لتكون حادة
                ctx.fillRect(w.range + 6, -8, 1.5, 1.5);
                ctx.fillRect(w.range + 2, 12, 1.5, 1.5);
                ctx.fillRect(w.range - 4, 0, 2, 2);

               ctx.restore();
            } else if (w.id === 'BLOOD_SCYTHE') {
                ctx.save();

                ctx.strokeStyle = '#b30018';
                ctx.lineWidth = 3;
                ctx.lineCap = 'round';
                ctx.shadowBlur = 8;
                ctx.shadowColor = '#ff0033';

                ctx.beginPath();
                ctx.arc(18, 0, w.range * 0.75, -0.9, 0.45);
                ctx.stroke();

                // Small blood particles
                ctx.fillStyle = '#ff1744';
                ctx.shadowBlur = 5;

                ctx.fillRect(w.range * 0.65, -14, 2, 2);
                ctx.fillRect(w.range * 0.85, 4, 2, 2);
                ctx.fillRect(w.range * 0.5, 12, 1.5, 1.5);

                ctx.restore();
            }
        }
    }

    render(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);

        if (this.invulnTimer > 0 && Math.floor(this.invulnTimer * 10) % 2 === 0) {
            ctx.globalAlpha = 0.5;
        }

        const angle = Math.atan2(this.facing.y, this.facing.x);
        ctx.rotate(angle);

        const bobX = this.isMoving ? Math.sin(this.walkTimer) * 2 : 0;
        const bobY = this.isMoving ? Math.cos(this.walkTimer) * 2 : 0;

        const skin = this.skin;
        const w = this.currentWeapon;
        const leftHandX = 4 + (this.isAttacking ? 12 : 0);
        const rightHandX = 4 + (this.isMoving && !this.isAttacking ? Math.sin(this.walkTimer + Math.PI)*3 : 0);

        // --- SKINS MODULAR DRAWING ---
        switch (skin.id) {
            case 'KNIGHT':
                // Cape
                ctx.fillStyle = skin.cape;
                ctx.beginPath(); ctx.moveTo(-5, -8); ctx.lineTo(-15 - Math.abs(bobX)*2, -10 + bobY); ctx.lineTo(-20 - Math.abs(bobX)*2, 0); ctx.lineTo(-15 - Math.abs(bobX)*2, 10 - bobY); ctx.fill();
                // Body
                ctx.fillStyle = skin.primary;
                ctx.beginPath(); ctx.roundRect(-8, -10, 16, 20, 4); ctx.fill();
                ctx.strokeStyle = skin.secondary; ctx.lineWidth = 2; ctx.stroke();
                // Head
                ctx.fillStyle = skin.secondary;
                ctx.beginPath(); ctx.arc(2, 0, 8, 0, Math.PI*2); ctx.fill();
                // T-Visor
                ctx.fillStyle = '#111';
                ctx.fillRect(0, -2, 8, 4);
                ctx.fillRect(4, -6, 2, 12);
                break;

            case 'ROGUE':
                // Jagged Cloak/Scarf
                ctx.fillStyle = skin.secondary;
                ctx.beginPath(); ctx.moveTo(0, -6); ctx.lineTo(-18 - bobX*3, -12 + bobY*2); ctx.lineTo(-12, -4); ctx.fill();
                // Slim Body
                ctx.fillStyle = skin.primary;
                ctx.fillRect(-6, -8, 12, 16);
                // Deep Hood
                ctx.fillStyle = skin.primary;
                ctx.beginPath(); ctx.arc(0, 0, 7, 0, Math.PI*2); ctx.fill();
                ctx.beginPath(); ctx.moveTo(0, -7); ctx.lineTo(10, 0); ctx.lineTo(0, 7); ctx.fill();
                // Glowing Eyes
                ctx.fillStyle = skin.core;
                ctx.shadowBlur = 5; ctx.shadowColor = skin.core;
                ctx.beginPath(); ctx.arc(4, -2, 1.5, 0, Math.PI*2); ctx.arc(4, 2, 1.5, 0, Math.PI*2); ctx.fill();
                ctx.shadowBlur = 0;
                break;

            case 'MAGE':
                // Flowing Robe Base
                ctx.fillStyle = skin.primary;
                ctx.beginPath(); ctx.moveTo(-12, -14); ctx.lineTo(6, -10); ctx.lineTo(6, 10); ctx.lineTo(-12, 14); ctx.fill();
                ctx.strokeStyle = skin.secondary; ctx.stroke();
                // Wizard Hat
                ctx.fillStyle = skin.secondary;
                ctx.beginPath(); ctx.arc(0, 0, 9, 0, Math.PI*2); ctx.fill(); 
                ctx.fillStyle = skin.primary;
                ctx.beginPath(); ctx.moveTo(-8, -6); ctx.lineTo(12, 0); ctx.lineTo(-8, 6); ctx.fill(); 
                break;

            case 'DARK_KNIGHT':
                // Torn Heavy Cape
                ctx.fillStyle = skin.secondary;
                ctx.beginPath(); ctx.moveTo(-5, -10); ctx.lineTo(-20-bobX, -15+bobY); ctx.lineTo(-15, -5); ctx.lineTo(-25-bobX, 0); ctx.lineTo(-15, 5); ctx.lineTo(-20-bobX, 15-bobY); ctx.lineTo(-5, 10); ctx.fill();
                // Bulky Body
                ctx.fillStyle = skin.primary;
                ctx.fillRect(-10, -14, 20, 28);
                // Spiky Shoulders
                ctx.fillStyle = skin.secondary;
                ctx.beginPath(); ctx.moveTo(0, -14); ctx.lineTo(5, -20); ctx.lineTo(-5, -14); ctx.fill();
                ctx.beginPath(); ctx.moveTo(0, 14); ctx.lineTo(5, 20); ctx.lineTo(-5, 14); ctx.fill();
                // Horned Helmet
                ctx.fillStyle = '#000';
                ctx.beginPath(); ctx.arc(2, 0, 8, 0, Math.PI*2); ctx.fill();
                ctx.strokeStyle = skin.core; ctx.lineWidth = 2; 
                ctx.beginPath(); ctx.moveTo(2, -6); ctx.lineTo(10, -10); ctx.stroke(); 
                ctx.beginPath(); ctx.moveTo(2, 6); ctx.lineTo(10, 10); ctx.stroke(); 
                // Core Eye
                ctx.fillStyle = skin.core; ctx.beginPath(); ctx.arc(4, 0, 2, 0, Math.PI*2); ctx.fill();
                break;

            case 'GOLDEN_KNIGHT':
                // Majestic Cape
                ctx.fillStyle = skin.cape; 
                ctx.beginPath(); ctx.moveTo(-2, -10); ctx.quadraticCurveTo(-20-bobX*2, -15, -25, 0); ctx.quadraticCurveTo(-20-bobX*2, 15, -2, 10); ctx.fill();
                // Rounded Sleek Body
                ctx.fillStyle = skin.primary;
                ctx.beginPath(); ctx.ellipse(-2, 0, 10, 14, 0, 0, Math.PI*2); ctx.fill();
                ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1; ctx.stroke();
                // Halo/Glow ring behind head
                ctx.strokeStyle = skin.core;
                ctx.lineWidth = 2;
                ctx.beginPath(); ctx.arc(2, 0, 11, -Math.PI/2, Math.PI/2); ctx.stroke();
                // Smooth Head
                ctx.fillStyle = skin.primary;
                ctx.beginPath(); ctx.arc(2, 0, 7, 0, Math.PI*2); ctx.fill();
                ctx.fillStyle = '#fff'; ctx.fillRect(4, -4, 2, 8); 
                break;

            default:
                // Fallback (Original Basic Boxy Shape)
                ctx.fillStyle = skin.primary;
                ctx.fillRect(-8, -10, 16, 20);
                break;
        }

        // Draw Hands & Weapons (Shared for all skins based on hand positions)
        // Adjust hand distances slightly for Mage (floating hands)
        if (skin.id === 'MAGE') {
            this.drawWeaponAndHands(ctx, leftHandX + 2, rightHandX + 2, w, skin);
        } else {
            this.drawWeaponAndHands(ctx, leftHandX, rightHandX, w, skin);
        }

        ctx.restore();
    }
}