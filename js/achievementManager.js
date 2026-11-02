export class AchievementManager {
    constructor() {
        this.achievements = [
            { id: 'FIRST_BLOOD', name: 'FIRST BLOOD', desc: 'Defeat your first enemy', reward: 50 },
            { id: 'SLAYER', name: 'SLAYER', desc: 'Defeat 50 enemies across all runs', reward: 100 },
            { id: 'BOSS_SLAYER', name: 'BOSS SLAYER', desc: 'Defeat your first Boss', reward: 150 },
            { id: 'WARDEN_FALLEN', name: 'WARDEN FALLEN', desc: 'Defeat the Final Boss on Floor 3', reward: 250 },
            { id: 'TREASURE_HUNTER', name: 'TREASURE HUNTER', desc: 'Collect 500 Gold across all runs', reward: 200 },
            { id: 'RELIC_MASTER', name: 'RELIC MASTER', desc: 'Obtain 5 Relics across all runs', reward: 150 },
            { id: 'WEAPON_MASTER', name: 'WEAPON MASTER', desc: 'Reach Level 5 with any weapon', reward: 200 },
            { id: 'DUNGEON_CLEARED', name: 'DUNGEON CLEARED', desc: 'Achieve Victory and clear the dungeon', reward: 500 }
        ];

        this.unlocked = [];
        // الإحصائيات الدائمة (عبر كل الجولات)
        this.lifetimeStats = { kills: 0, gold: 0, relics: 0, bosses: 0 };
        this.isOpen = false;

        // متغيرات داخلية لتتبع الجولة الحالية بوضوح وعزلها
        this.lastRunStartTime = 0;
        this.defeatedBossFloors = [];
        this.runCommitted = false; 

        this.load();
    }

    // قراءة الإنجازات والإحصائيات بأمان تام باستخدام try/catch
    load() {
        try {
            const savedUnlocked = localStorage.getItem('dz_achievements_unlocked');
            if (savedUnlocked) this.unlocked = JSON.parse(savedUnlocked);

            const savedStats = localStorage.getItem('dz_lifetime_stats');
            if (savedStats) this.lifetimeStats = { ...this.lifetimeStats, ...JSON.parse(savedStats) };
        } catch (e) {
            console.warn('[AchievementManager] Failed to load from localStorage.', e);
        }
    }

    // حفظ آمن في الـ localStorage
    save() {
        try {
            localStorage.setItem('dz_achievements_unlocked', JSON.stringify(this.unlocked));
            localStorage.setItem('dz_lifetime_stats', JSON.stringify(this.lifetimeStats));
        } catch (e) {
            console.warn('[AchievementManager] Failed to save to localStorage.', e);
        }
    }

    // تُستدعى كل إطار (frame) وتراقب تحقق الشروط دون تخزين متكرر
    check(game, permProg) {
        if (!game || !game.player || !game.runStats) return;

        // التعرف على بدء جولة جديدة (تصفير المتغيرات المؤقتة للجولة)
        if (game.runStats.startTime !== this.lastRunStartTime) {
            this.lastRunStartTime = game.runStats.startTime;
            this.defeatedBossFloors = [];
            this.runCommitted = false;
        }

        // تتبع زعماء الطوابق الذين قُتلوا فعلياً في هذه الجولة فقط (مرة واحدة لكل طابق)
        if (game.boss && game.boss.state === 'DEFEATED') {
            if (!this.defeatedBossFloors.includes(game.currentFloor)) {
                this.defeatedBossFloors.push(game.currentFloor);
            }
        }

        // حساب الإحصائيات الفعّالة للتحقق من الإنجازات
        // إذا لم تدمج الإحصائيات بعد، نجمع (الدائم + الحالي). إذا دمجت، نستخدم (الدائم) فقط لمنع الازدواجية.
        let currentEffectiveKills = this.lifetimeStats.kills;
        let currentEffectiveGold = this.lifetimeStats.gold;
        let currentEffectiveRelics = this.lifetimeStats.relics;
        let currentEffectiveBosses = this.lifetimeStats.bosses;

        if (!this.runCommitted) {
            currentEffectiveKills += game.runStats.kills;
            currentEffectiveGold += game.runStats.gold;
            currentEffectiveRelics += game.player.relics.length;
            currentEffectiveBosses += this.defeatedBossFloors.length;
        }
        
        // هل يملك اللاعب أي سلاح ليفل 5؟
        const hasLevel5Weapon = game.player.weapons.some(w => w.level >= 5);

        // تقييم شروط الإنجازات الثمانية
        const conditions = {
            'FIRST_BLOOD': currentEffectiveKills >= 1,
            'SLAYER': currentEffectiveKills >= 50,
            'BOSS_SLAYER': currentEffectiveBosses >= 1,
            'WARDEN_FALLEN': this.defeatedBossFloors.includes(3),
            'TREASURE_HUNTER': currentEffectiveGold >= 500,
            'RELIC_MASTER': currentEffectiveRelics >= 5,
            'WEAPON_MASTER': hasLevel5Weapon,
            'DUNGEON_CLEARED': game.state === 'VICTORY'
        };

        // فتح الإنجاز إذا لم يُفتح سابقاً
        for (let ach of this.achievements) {
            if (!this.unlocked.includes(ach.id) && conditions[ach.id]) {
                this.unlock(ach, permProg, game);
            }
        }
    }

    // منطق فتح الإنجاز، إعطاء الذهب، وعرض الإشعار
    unlock(ach, permProg, game) {
        this.unlocked.push(ach.id);
        
        // إعطاء الـ Permanent Gold عبر المثيل (Instance) المتاح
        if (permProg) {
            permProg.addGold(ach.reward);
        }
        
        this.save(); // حفظ حالة الإنجاز كـ Unlocked فوراً
        
        if (game && game.audio) {
            game.audio.play('level_up');
        }

        // تحديث عداد الـ Permanent Gold في واجهة اللعبة إن وجد
        const permGoldUI = document.querySelector('.perm-gold-value');
        if (permGoldUI && permProg) permGoldUI.innerText = permProg.getGold();
        
        // تحديث عداد المتجر إن كان مفتوحاً
        const shopPermGoldUI = document.getElementById('skinsPermGoldValue');
        if (shopPermGoldUI && permProg) shopPermGoldUI.innerText = permProg.getGold();

        this.showToast(ach);
        
        // تحديث نافذة الإنجازات فوراً إن كانت مفتوحة أمام اللاعب
        if (this.isOpen) this.renderUI();
    }

    // دمج إحصائيات الجولة مرة واحدة فقط عند GAME_OVER أو VICTORY
    commitRun(game) {
        if (!game || !game.player || !game.runStats) return;
        
        if (!this.runCommitted) {
            this.lifetimeStats.kills += game.runStats.kills;
            this.lifetimeStats.gold += game.runStats.gold;
            this.lifetimeStats.relics += game.player.relics.length;
            this.lifetimeStats.bosses += this.defeatedBossFloors.length;
            
            this.save();
            this.runCommitted = true;
        }
    }

    // إظهار إشعار Toast جميل بأسفل الشاشة
    showToast(ach) {
        const toast = document.getElementById('achievementToast');
        if (!toast) return;
        
        const nameEl = document.getElementById('toastName');
        const descEl = document.getElementById('toastDesc');
        const rewardEl = document.getElementById('toastReward');

        if (nameEl) nameEl.innerText = ach.name;
        if (descEl) descEl.innerText = ach.desc;
        if (rewardEl) rewardEl.innerText = `+${ach.reward} PERM GOLD`;
        
        // إظهار النافذة ثم إخفاؤها بعد 4 ثوانٍ
        toast.classList.add('show');
        setTimeout(() => {
            toast.classList.remove('show');
        }, 4000);
    }

    // فتح وإغلاق الشاشة
    toggleUI(game) {
        const screen = document.getElementById('achievementsScreen');
        if (!screen) return;

        this.isOpen = !this.isOpen;
        if (this.isOpen) {
            if (game) game.previousState = game.state;
            if (game) game.state = 'ACHIEVEMENTS_OPEN';
            this.renderUI();
            screen.classList.remove('hidden');
        } else {
            if (game && game.state === 'ACHIEVEMENTS_OPEN') {
                game.state = game.previousState === 'ACHIEVEMENTS_OPEN' ? 'PLAYING' : game.previousState;
            }
            screen.classList.add('hidden');
        }
    }

    // بناء بطاقات الإنجازات وحالتها
    renderUI() {
        const container = document.getElementById('achievementsContainer');
        if (!container) return;
        container.innerHTML = '';

        this.achievements.forEach(ach => {
            const isUnlocked = this.unlocked.includes(ach.id);
            const card = document.createElement('div');
            card.className = `shop-card ${isUnlocked ? 'achiev-unlocked' : 'achiev-locked'}`;
            
            card.innerHTML = `
                <h2 class="shop-item-title" style="color: ${isUnlocked ? '#ffd700' : '#555'};">${ach.name}</h2>
                <p class="shop-item-desc" style="color: ${isUnlocked ? '#ccc' : '#444'};">${ach.desc}</p>
                <div class="shop-item-price" style="color: ${isUnlocked ? '#33ff55' : '#888'};">
                    ${isUnlocked ? 'COMPLETED' : 'REWARD: ' + ach.reward + ' G'}
                </div>
            `;
            container.appendChild(card);
        });
    }
}