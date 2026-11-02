export class PermanentProgression {
    constructor() {
        this.permanentGold = 0;
        this.unlockedSkins = ['KNIGHT']; // Starter skin is always unlocked
        this.equippedSkin = 'KNIGHT';
        this.load();
    }

    // قراءة آمنة ومعزولة من localStorage
    load() {
        try {
            const savedGold = localStorage.getItem('dz_perm_gold');
            if (savedGold !== null) this.permanentGold = parseInt(savedGold, 10) || 0;

            const savedSkins = localStorage.getItem('dz_unlocked_skins');
            if (savedSkins !== null) this.unlockedSkins = JSON.parse(savedSkins);

            const savedEquipped = localStorage.getItem('dz_equipped_skin');
            if (savedEquipped !== null) this.equippedSkin = savedEquipped;
        } catch (e) {
            console.warn('[PermanentProgression] Failed to load from localStorage. Using defaults.', e);
            this.permanentGold = 0;
            this.unlockedSkins = ['KNIGHT'];
            this.equippedSkin = 'KNIGHT';
        }
    }

    // كتابة آمنة إلى localStorage
    save() {
        try {
            localStorage.setItem('dz_perm_gold', this.permanentGold.toString());
            localStorage.setItem('dz_unlocked_skins', JSON.stringify(this.unlockedSkins));
            localStorage.setItem('dz_equipped_skin', this.equippedSkin);
        } catch (e) {
            console.warn('[PermanentProgression] Failed to save to localStorage.', e);
        }
    }

    addGold(amount) {
        if (typeof amount === 'number' && amount > 0) {
            this.permanentGold += amount;
            this.save();
        }
    }

    spendGold(amount) {
        if (typeof amount === 'number' && amount > 0 && this.permanentGold >= amount) {
            this.permanentGold -= amount;
            this.save();
            return true;
        }
        return false;
    }

    getGold() {
        return this.permanentGold;
    }

    isUnlocked(skinId) {
        return this.unlockedSkins.includes(skinId);
    }

    unlockSkin(skinId) {
        if (!this.isUnlocked(skinId)) {
            this.unlockedSkins.push(skinId);
            this.save();
        }
    }

    equipSkin(skinId) {
        if (this.isUnlocked(skinId)) {
            this.equippedSkin = skinId;
            this.save();
        }
    }
}