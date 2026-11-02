import { RELICS } from './relics.js';
import { PermanentProgression } from './permanentProgression.js';

export class ShopManager {
    constructor() {
        this.offers = [];
        this.permProg = new PermanentProgression();
    }

    generateInventory(player) {
        this.offers = [];
        
        // 1. Health Potion
        this.offers.push({
            type: 'HEAL',
            name: 'HEALTH POTION',
            desc: 'Restores 50 HP',
            price: 50,
            value: 50,
            sold: false,
            color: '#33ff55'
        });

        // 2. Weapon / Stat Upgrade
        this.offers.push({
            type: 'UPGRADE',
            name: 'BLACKSMITH',
            desc: 'Upgrades weapon damage',
            price: 100,
            sold: false,
            color: '#00ffff'
        });

        // 3. Random Relic
        let availableRelics = RELICS.filter(r => !player.hasRelic(r.id));
        if (availableRelics.length > 0) {
            // --- نظام التآزر (Synergy Weights) ---
            let weightedPool = [];
            
            for (let r of availableRelics) {
                let weight = 1; // الوزن الافتراضي

                // VAMPIRE_CORE ↔ BERSERKER_CORE
                if (r.id === 'BERSERKER_CORE' && player.hasRelic('VAMPIRE_CORE')) weight += 3;
                if (r.id === 'VAMPIRE_CORE' && player.hasRelic('BERSERKER_CORE')) weight += 3;
                
                // ARCANE_CORE ↔ BERSERKER_CORE
                if (r.id === 'BERSERKER_CORE' && player.hasRelic('ARCANE_CORE')) weight += 3;
                if (r.id === 'ARCANE_CORE' && player.hasRelic('BERSERKER_CORE')) weight += 3;

                // SWIFT_CORE ↔ FURY
                if (r.id === 'SWIFT_CORE' && player.attackSpeedMultiplier > 1.0) weight += 3;

                // GOLDEN_CORE ↔ FORTUNE
                if (r.id === 'GOLDEN_CORE' && (player.goldMultiplier || 1.0) > 1.0) weight += 3;

                for (let i = 0; i < weight; i++) {
                    weightedPool.push(r);
                }
            }
            
            // سحب Relic واحد بناءً على الوزن
            let relic = weightedPool[Math.floor(Math.random() * weightedPool.length)];
            this.offers.push({
                type: 'RELIC',
                name: relic.name,
                desc: relic.desc,
                price: relic.price || 150,
                relicId: relic.id,
                sold: false,
                color: relic.color || '#bb88ff'
            });
        } else {
            // Fallback if all relics are owned
            this.offers.push({
                type: 'HEAL',
                name: 'MAX POTION',
                desc: 'Fully restores HP',
                price: 150,
                value: 999,
                sold: false,
                color: '#33ff55'
            });
        }
    }

    open(player) {
        // تحديث الذهب الدائم قبل فتح المتجر
        this.permProg.load(); 
        
        // الرصيد المشترك المتاح للشراء
        const totalCombinedGold = player.gold + this.permProg.getGold();
        
        const shopScreen = document.getElementById('shopScreen');
        const goldVal = document.getElementById('shopGoldValue');
        
        // عرض الرصيد المشترك في واجهة المتجر
        if (goldVal) {
            goldVal.innerText = totalCombinedGold;
        }
        if (shopScreen) {
            shopScreen.classList.remove('hidden');
        }

        for (let i = 0; i < 3; i++) {
            let offer = this.offers[i];
            let titleEl = document.getElementById(`shop-title-${i}`);
            let descEl = document.getElementById(`shop-desc-${i}`);
            let priceEl = document.getElementById(`shop-price-${i}`);
            let btnEl = document.getElementById(`shop-btn-${i}`);

            if (titleEl) {
                titleEl.innerText = offer.name;
                titleEl.style.color = offer.color || '#ffffff';
            }
            if (descEl) descEl.innerText = offer.desc;
            if (priceEl) priceEl.innerText = offer.price + ' GOLD';
            
            if (btnEl) {
                if (offer.sold) {
                    btnEl.innerText = 'SOLD OUT';
                    btnEl.disabled = true;
                    if (priceEl) priceEl.innerText = '---';
                } else {
                    btnEl.innerText = `BUY [ ${i + 1} ]`;
                    // التحقق من الرصيد المشترك لتفعيل أو تعطيل الزر
                    btnEl.disabled = totalCombinedGold < offer.price;
                }
            }
        }
    }

    close() {
        const shopScreen = document.getElementById('shopScreen');
        if (shopScreen) {
            shopScreen.classList.add('hidden');
        }
    }

    buy(index, player, game) {
        let offer = this.offers[index];
        if (!offer || offer.sold) return;

        this.permProg.load();
        
        const totalCombinedGold = player.gold + this.permProg.getGold();
        const originalPlayerGold = player.gold;

        // إذا كان الرصيد الكلي كافياً
        if (totalCombinedGold >= offer.price) {
            
            let remainingPrice = offer.price;
            
            // 1. خصم ذهب الجولة أولاً
            if (player.gold >= remainingPrice) {
                player.gold -= remainingPrice;
                remainingPrice = 0;
            } else {
                remainingPrice -= player.gold;
                player.gold = 0; // تفريغ ذهب الجولة بالكامل
            }

            // 2. خصم أي متبقٍ من الذهب الدائم
            if (remainingPrice > 0) {
                this.permProg.spendGold(remainingPrice);
            }

            offer.sold = true;

            // تشغيل صوت الشراء لأن game.js لن يشغله إذا كان ذهب الجولة وحده غير كافٍ
            if (originalPlayerGold < offer.price && game && game.audio) {
                game.audio.play('buy');
            }

            // تطبيق تأثير العنصر
            if (offer.type === 'HEAL') {
                player.heal(offer.value);
            } 
            else if (offer.type === 'UPGRADE') {
                if (player.currentWeapon) {
                    player.currentWeapon.level++;
                    player.currentWeapon.damage = Math.floor(player.currentWeapon.damage * 1.2);
                    if (game) game.updateWeaponHUD();
                }
            } 
            else if (offer.type === 'RELIC') {
                player.addRelic(offer.relicId);
                if (game) game.triggerRelicPopup(RELICS.find(r => r.id === offer.relicId));
            }

            // تحديث الواجهة الخاصة بالمتجر لتعكس الرصيد المتبقي الجديد
            this.open(player); 
            
            // تحديث الواجهة الرئيسية للـ HUD
            if (game) {
                game.updateHUD(); // تحديث ذهب الجولة
                
                // تحديث الذهب الدائم المعروض في الـ HUD إن وجد
                const permGoldUI = document.querySelector('.perm-gold-value');
                if (permGoldUI) {
                    permGoldUI.innerText = this.permProg.getGold();
                }
            }
        }
    }
}