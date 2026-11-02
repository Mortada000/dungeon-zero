export class PermanentUpgradeManager {
    constructor() {
        this.maxLevel = 5;
        this.levels = {
            VITALITY: 0,
            POWER: 0,
            SWIFTNESS: 0,
            FORTUNE: 0
        };
        
        this.defs = [
            { id: 'VITALITY', name: 'VITALITY', desc: '+10 Max HP per level', color: '#ff3366' },
            { id: 'POWER', name: 'POWER', desc: '+5% Damage per level', color: '#ff1a1a' },
            { id: 'SWIFTNESS', name: 'SWIFTNESS', desc: '+5% Movement Speed per level', color: '#00ffff' },
            { id: 'FORTUNE', name: 'FORTUNE', desc: '+5% Gold Gain per level', color: '#ffd700' }
        ];

        this.isOpen = false;
        this.load();
    }

    load() {
        try {
            const saved = localStorage.getItem('dz_perm_upgrades');
            if (saved) {
                this.levels = { ...this.levels, ...JSON.parse(saved) };
            }
        } catch (e) {
            console.warn('[PermanentUpgrades] Failed to load from localStorage', e);
        }
    }

    save() {
        try {
            localStorage.setItem('dz_perm_upgrades', JSON.stringify(this.levels));
        } catch (e) {
            console.warn('[PermanentUpgrades] Failed to save to localStorage', e);
        }
    }

    // تسعير تصاعدي بسيط: 150، 300، 450، 600، 750
    getPrice(currentLevel) {
        return (currentLevel + 1) * 150; 
    }

    toggleUI(game, permProg) {
        const screen = document.getElementById('upgradesScreen');
        if (!screen) return;

        this.isOpen = !this.isOpen;
        if (this.isOpen) {
            if (game) game.previousState = game.state;
            if (game) game.state = 'UPGRADES_OPEN';
            this.renderUI(permProg, game);
            screen.classList.remove('hidden');
        } else {
            if (game && game.state === 'UPGRADES_OPEN') {
                game.state = game.previousState === 'UPGRADES_OPEN' ? 'PLAYING' : game.previousState;
            }
            screen.classList.add('hidden');
        }
    }

    renderUI(permProg, game) {
        const container = document.getElementById('upgradesContainer');
        if (!container) return;
        container.innerHTML = '';

        const goldUI = document.getElementById('upgradesPermGoldValue');
        if (goldUI && permProg) {
            goldUI.innerText = permProg.getGold();
        }

        this.defs.forEach(def => {
            const currentLevel = this.levels[def.id];
            const isMax = currentLevel >= this.maxLevel;
            const price = this.getPrice(currentLevel);
            const canAfford = !isMax && permProg && permProg.getGold() >= price;

            const card = document.createElement('div');
            card.className = 'shop-card';
            if (isMax) card.style.borderColor = '#ffd700';
            
            let btnHTML = '';
            if (isMax) {
                btnHTML = `<button class="shop-btn" disabled style="color:#ffd700; border-color:#ffd700;">MAX LEVEL</button>`;
            } else {
                btnHTML = `<button class="shop-btn" ${canAfford ? '' : 'disabled'}>UPGRADE [ ${price} G ]</button>`;
            }

            card.innerHTML = `
                <h2 class="shop-item-title" style="color: ${def.color};">${def.name}</h2>
                <p class="shop-item-desc" style="color: #ccc; margin-bottom: 8px;">${def.desc}</p>
                <div style="font-family: monospace; font-size: 16px; font-weight: bold; color: #fff; margin-bottom: 16px;">
                    LEVEL: <span style="color: ${isMax ? '#ffd700' : '#fff'}">${currentLevel} / ${this.maxLevel}</span>
                </div>
                ${btnHTML}
            `;

            const btn = card.querySelector('button');
            if (btn && !btn.disabled) {
                btn.addEventListener('click', (e) => {
                    if (permProg.spendGold(price)) {
                        this.levels[def.id]++;
                        this.save();
                        if (game && game.audio) game.audio.play('upgrade_select');
                        
                        // تحديث العداد الرئيسي إذا كان مرئياً
                        const mainPermGoldUI = document.querySelector('.perm-gold-value');
                        if (mainPermGoldUI) mainPermGoldUI.innerText = permProg.getGold();
                        
                        this.renderUI(permProg, game);
                    }
                    e.currentTarget.blur();
                });
            }
            container.appendChild(card);
        });
    }
}