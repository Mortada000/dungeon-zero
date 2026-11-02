import { SKINS } from './skins.js';

export const ACHIEVEMENTS = [
    { id: 'FIRST_BOSS', name: 'BOSS SLAYER', desc: 'Defeat your first Boss', target: 1, type: 'bosses' },
    { id: 'REACH_FL3', name: 'DEEP DIVER', desc: 'Reach Floor 3', target: 3, type: 'floor' },
    { id: 'RICH', name: 'WEALTHY', desc: 'Accumulate 1000 Total Gold', target: 1000, type: 'gold' },
    { id: 'KILLER', name: 'SLAYER', desc: 'Defeat 50 Enemies', target: 50, type: 'kills' },
    { id: 'VICTORY', name: 'CONQUEROR', desc: 'Complete a Full Run', target: 1, type: 'wins' }
];

export class ProgressionManager {
    constructor() {
        // Safe Defaults
        this.permanentGold = 0;
        this.unlockedSkins = ['KNIGHT']; 
        this.equippedSkin = 'KNIGHT';
        this.achievements = {}; 
        this.stats = { bosses: 0, floor: 1, gold: 0, kills: 0, wins: 0 };
        this.runHistory = []; // <-- إضافة مصفوفة السجل الافتراضية
        
        this.load();
    }
    
    load() {
        try {
            const dataStr = localStorage.getItem('dz_progression');
            if (dataStr) {
                const data = JSON.parse(dataStr);
                if (typeof data.permanentGold === 'number') this.permanentGold = data.permanentGold;
                if (Array.isArray(data.unlockedSkins)) this.unlockedSkins = data.unlockedSkins;
                if (typeof data.equippedSkin === 'string') this.equippedSkin = data.equippedSkin;
                if (typeof data.achievements === 'object') this.achievements = data.achievements;
                if (typeof data.stats === 'object') this.stats = { ...this.stats, ...data.stats };
                if (Array.isArray(data.runHistory)) this.runHistory = data.runHistory; // <-- تحميل السجل إن وجد
            }
        } catch (e) {
            console.warn("Failed to load progression data. Using defaults.", e);
        }
    }
    
    save() {
        try {
            localStorage.setItem('dz_progression', JSON.stringify({
                permanentGold: this.permanentGold,
                unlockedSkins: this.unlockedSkins,
                equippedSkin: this.equippedSkin,
                achievements: this.achievements,
                stats: this.stats,
                runHistory: this.runHistory // <-- حفظ السجل ضمن بيانات اللعبة
            }));
        } catch (e) {
            console.warn("Failed to save progression data.", e);
        }
    }

    // --- دالة إضافة Run جديد للسجل ---
    addRun(runData) {
        this.runHistory.unshift(runData); // إضافة في بداية المصفوفة
        if (this.runHistory.length > 10) {
            this.runHistory = this.runHistory.slice(0, 10); // الاحتفاظ بآخر 10 محاولات فقط
        }
        this.save();
    }

    addGold(amount, gameRef) {
        this.permanentGold += amount;
        this.updateStat('gold', amount, gameRef);
        this.save();
    }
    
    updateStat(type, amount, gameRef) {
        if (type === 'floor') {
            if (amount > this.stats.floor) this.stats.floor = amount;
        } else {
            this.stats[type] += amount;
        }
        this.checkAchievements(gameRef);
        this.save();
    }

    checkAchievements(gameRef) {
        for (let ach of ACHIEVEMENTS) {
            if (!this.achievements[ach.id]) {
                if (this.stats[ach.type] >= ach.target) {
                    this.achievements[ach.id] = true;
                    if (gameRef && typeof gameRef.triggerAchievement === 'function') {
                        gameRef.triggerAchievement(ach);
                    }
                    this.checkSkinUnlocks(ach.id, gameRef);
                }
            }
        }
    }

    checkSkinUnlocks(achId, gameRef) {
        for (let skin of SKINS) {
            if (skin.unlockType === 'ACHIEVEMENT' && skin.achievementId === achId) {
                if (!this.unlockedSkins.includes(skin.id)) {
                    this.unlockedSkins.push(skin.id);
                    if (gameRef && typeof gameRef.triggerSkinUnlock === 'function') {
                        gameRef.triggerSkinUnlock(skin);
                    }
                }
            }
        }
    }

    buySkin(skin) {
        if (skin.unlockType === 'GOLD' && this.permanentGold >= skin.price && !this.unlockedSkins.includes(skin.id)) {
            this.permanentGold -= skin.price;
            this.unlockedSkins.push(skin.id);
            this.save();
            return true;
        }
        return false;
    }

    equipSkin(skinId) {
        if (this.unlockedSkins.includes(skinId)) {
            this.equippedSkin = skinId;
            this.save();
            return true;
        }
        return false;
    }
}