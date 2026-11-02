import { FloatingText } from './floatingText.js';
import { RELICS } from './relics.js';

export function generateLoot(x, y, player, game) {
    const rand = Math.random();
    let rewardType = '';

    // STAGE 8: Check for Relic Drop
    const unownedRelics = RELICS.filter(r => !player.hasRelic(r.id));
    const relicChance = 0.15; // 15% chance for a relic

    if (rand < relicChance && unownedRelics.length > 0) {
        rewardType = 'RELIC';
    } else {
        // Normalize remaining random value for standard loot
        const subRand = Math.random();
        if (subRand < 0.35) {
            rewardType = 'GOLD';
        } else if (subRand < 0.65) {
            rewardType = 'WEAPON_UPGRADE';
        } else if (subRand < 0.85) {
            rewardType = 'MAX_HP_UPGRADE';
        } else {
            rewardType = 'HEAL';
        }
    }

    if (rewardType === 'RELIC') {
        // --- نظام التآزر (Synergy Weights) ---
        let weightedPool = [];
        
        for (let r of unownedRelics) {
            let weight = 1; // الوزن الافتراضي

            // VAMPIRE_CORE ↔ BERSERKER_CORE
            if (r.id === 'BERSERKER_CORE' && player.hasRelic('VAMPIRE_CORE')) weight += 3;
            if (r.id === 'VAMPIRE_CORE' && player.hasRelic('BERSERKER_CORE')) weight += 3;
            
            // ARCANE_CORE ↔ BERSERKER_CORE
            if (r.id === 'BERSERKER_CORE' && player.hasRelic('ARCANE_CORE')) weight += 3;
            if (r.id === 'ARCANE_CORE' && player.hasRelic('BERSERKER_CORE')) weight += 3;

            // SWIFT_CORE ↔ FURY (الاستدلال من سرعة الهجوم)
            if (r.id === 'SWIFT_CORE' && player.attackSpeedMultiplier > 1.0) weight += 3;

            // GOLDEN_CORE ↔ FORTUNE (الاستدلال من مضاعف الذهب)
            if (r.id === 'GOLDEN_CORE' && (player.goldMultiplier || 1.0) > 1.0) weight += 3;

            // إضافة العنصر إلى السحب بناءً على وزنه
            for (let i = 0; i < weight; i++) {
                weightedPool.push(r);
            }
        }
        
        // سحب Relic واحد من البركة الموزونة
        const relic = weightedPool[Math.floor(Math.random() * weightedPool.length)];
        
        player.addRelic(relic);
        game.triggerRelicPopup(relic);
        return; // The popup handles visual presentation natively, skip text feedback below
    }

    let feedbackText = '';
    let feedbackColor = '#ffffff';

    if (rewardType === 'WEAPON_UPGRADE') {
        const upgradedWeapon = player.upgradeRandomWeapon();
        if (upgradedWeapon) {
            feedbackText = `+1 ${upgradedWeapon.name}`;
            feedbackColor = upgradedWeapon.color;
            game.updateWeaponHUD();
        } else {
            rewardType = 'GOLD';
        }
    }

    if (rewardType === 'GOLD') {
        let amount = Math.floor(Math.random() * 26) + 15; 
        if (player.hasRelic('GOLDEN_CORE')) amount = Math.floor(amount * 1.25); // Golden Core modifier
        player.gainGold(amount);
        feedbackText = `+${amount} GOLD`;
        feedbackColor = '#ffd700';
    } else if (rewardType === 'MAX_HP_UPGRADE') {
        player.maxHp += 15;
        player.hp += 15;
        feedbackText = `+15 MAX HP`;
        feedbackColor = '#ff3366';
    } else if (rewardType === 'HEAL') {
        const healAmount = 30;
        player.heal(healAmount);
        feedbackText = `+${healAmount} HP`;
        feedbackColor = '#33ff55';
    }

    game.floatingTexts.push(new FloatingText(x, y - 20, feedbackText, feedbackColor));
    game.particles.spawnHitEffect(x, y, feedbackColor);
    game.updateHUD();
}