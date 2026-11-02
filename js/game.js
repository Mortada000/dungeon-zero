import { Input } from './input.js';
import { Dungeon } from './dungeon.js';
import { Player } from './player.js';
import { Camera } from './camera.js';
import { Enemy } from './enemy.js';
import { ParticleSystem } from './particles.js';
import { Pickup } from './pickup.js';
import { FloatingText } from './floatingText.js';
import { Projectile } from './projectile.js';
import { Chest } from './chest.js';
import { ShopManager } from './shop.js';
import { RELICS } from './relics.js';
import { DungeonWarden, Dragon, AbyssalBeast } from './boss.js'; 
import { AudioManager } from './audio.js'; 
import { SKINS } from './skins.js';
import { Archer } from './archer.js';
import { Dasher } from './dasher.js';
import { Brute } from './brute.js';
import { Necromancer } from './necromancer.js';
import { Shrine } from './shrine.js';
import { Fountain } from './fountain.js';
import { ProgressionManager } from './progression.js';


export class Game {
    constructor() {
        this.input = new Input();
        this.dungeon = new Dungeon(100, 100, 64);
        this.camera = new Camera();
        this.particles = new ParticleSystem();
        this.audio = new AudioManager(); 
        
        this.currentFloor = 1;
        this.maxFloors = 3;
        
        this.runStats = { kills: 0, damage: 0, gold: 0, startTime: 0 };
        
        this.player = null;
        this.activeRoom = null;
        this.chest = null;
        this.boss = null; 
        
        this.lastBossClass = null; 
        
        this.shopManager = new ShopManager();
        this.progression = new ProgressionManager(); // تهيئة مدير التقدم
        this.FloatingText = FloatingText;
        
        this.enemies = [];
        this.pickups = [];
        this.floatingTexts = [];
        this.projectiles = [];
        
        this.ambientDust = [];
        
        this.viewportWidth = 0;
        this.viewportHeight = 0;
        this.state = 'PLAYING'; 
        this.previousState = 'PLAYING'; 
        
        this.availableUpgrades = [
            { id: 'POWER', name: 'POWER', desc: '+10% Attack Damage', apply: (p) => p.damageMultiplier += 0.10 },
            { id: 'VITALITY', name: 'VITALITY', desc: '+20 Max HP & Heal', apply: (p) => { p.maxHp += 20; p.hp += 20; } },
            { id: 'SWIFTNESS', name: 'SWIFTNESS', desc: '+10% Movement Speed', apply: (p) => p.speed *= 1.10 },
            { id: 'FURY', name: 'FURY', desc: '+10% Attack Speed', apply: (p) => p.attackSpeedMultiplier += 0.10 }
        ];
        this.currentUpgradeChoices = [];

        // متغيرات الـ HP الجديدة
        this.hpTextUI = document.querySelector('.hp-text');
        this.hpFillUI = document.querySelector('.hp-bar-fill');
        
        this.levelUI = document.querySelector('.level-value');
        this.xpTextUI = document.querySelector('.xp-text');
        this.xpFillUI = document.querySelector('.xp-bar-fill');
        this.goldUI = document.querySelector('.gold-value');
        this.roomUI = document.querySelector('.room-value');
        this.floorUI = document.querySelector('.floor-value');
        this.relicListUI = document.getElementById('relicListUI');
        
        this.gameOverScreen = document.getElementById('gameOverScreen');
        this.levelUpScreen = document.getElementById('levelUpScreen');
        this.relicScreen = document.getElementById('relicScreen');
        this.floorTransitionScreen = document.getElementById('floorTransitionScreen');
        this.floorTitleText = document.getElementById('floorTitleText');
        this.skinsScreen = document.getElementById('skinsScreen');
        this.settingsScreen = document.getElementById('settingsScreen'); // واجهة الإعدادات الجديدة
        this.runHistoryScreen = document.getElementById('runHistoryScreen');
        this.runHistoryContainer = document.getElementById('runHistoryContainer');

        this.bossUI = document.getElementById('bossUI');
        this.uiBossName = document.getElementById('uiBossName'); 
        this.bossHpFill = document.getElementById('bossHpFill');
        this.bossHpText = document.getElementById('bossHpText');
        
        this.victoryScreen = document.getElementById('victoryScreen');
        this.victorySubtitleText = document.getElementById('victorySubtitleText');
        
        this.settingsToggleBtn = document.getElementById('settingsToggleBtn');
        this.volumeSlider = document.getElementById('volumeSlider');
        this.muteToggleSettingsBtn = document.getElementById('muteToggleSettingsBtn');
        
        this.initSkinsUI();
        this.setupListeners();
    }

    initSkinsUI() {
        const container = document.getElementById('skinsCardsContainer');
        container.innerHTML = '';
        SKINS.forEach((skin, index) => {
            const card = document.createElement('div');
            card.className = 'shop-card';
            card.innerHTML = `
                <h2 class="shop-item-title" style="color:${skin.primary}">${skin.name}</h2>
                <canvas id="skin-canvas-${index}" width="80" height="80" style="margin: 16px auto; display: block;"></canvas>
                <button class="shop-btn">EQUIP</button>
            `;
            
            card.querySelector('button').addEventListener('click', (e) => {
                if (this.state === 'SKINS_OPEN') {
                    if (this.player) {
                        this.player.setSkin(skin.id);
                        this.audio.play('buy'); 
                    }
                    this.closeSkins();
                }
                e.currentTarget.blur();
            });
            container.appendChild(card);

            const canvas = document.getElementById(`skin-canvas-${index}`);
            const ctx = canvas.getContext('2d');
            
            ctx.shadowBlur = 15;
            ctx.shadowColor = skin.core;
            ctx.fillStyle = skin.secondary;
            ctx.beginPath(); ctx.arc(40, 40, 36, 0, Math.PI * 2); ctx.fill();
            ctx.shadowBlur = 0;
            
            ctx.fillStyle = '#111';
            ctx.beginPath(); ctx.arc(40, 40, 32, 0, Math.PI * 2); ctx.fill();

            const dummyPlayer = new Player(40, 40);
            dummyPlayer.setSkin(skin.id);
            dummyPlayer.facing = { x: 0, y: 1 }; 
            
            ctx.save();
            ctx.translate(40, 40);
            ctx.scale(1.4, 1.4);
            ctx.translate(-40, -40);
            dummyPlayer.render(ctx); 
            ctx.restore();
        });
    }

    openSkins() {
        this.previousState = this.state;
        this.state = 'SKINS_OPEN';
        this.skinsScreen.classList.remove('hidden');
    }

    closeSkins() {
        this.state = this.previousState === 'SKINS_OPEN' ? 'PLAYING' : this.previousState;
        this.skinsScreen.classList.add('hidden');
    }

    openSettings() {
        this.previousState = this.state;
        this.state = 'SETTINGS';
        this.settingsScreen.classList.remove('hidden');
    }

    closeSettings() {
        this.state = this.previousState === 'SETTINGS' ? 'PLAYING' : this.previousState;
        this.settingsScreen.classList.add('hidden');
    }

    openRunHistory(fromMainMenu = false) {
        this.previousState = this.state;
        this.state = 'RUN_HISTORY';
        this.openedFromMainMenu = fromMainMenu; // حفظ مصدر فتح الشاشة
        this.populateRunHistoryUI();
        if (this.runHistoryScreen) this.runHistoryScreen.classList.remove('hidden');
    }

    closeRunHistory() {
        this.state = this.previousState === 'RUN_HISTORY' ? 'PLAYING' : this.previousState;
        if (this.runHistoryScreen) this.runHistoryScreen.classList.add('hidden');
        
        // إذا فتحناها من القائمة الرئيسية، نعيد إظهار القائمة
        if (this.openedFromMainMenu) {
            const mainMenu = document.getElementById('mainMenu');
            if (mainMenu) mainMenu.style.display = 'flex';
            this.openedFromMainMenu = false;
        }
    }

    populateRunHistoryUI() {
        if (!this.runHistoryContainer || !this.progression) return;
        this.runHistoryContainer.innerHTML = '';

        const history = this.progression.runHistory || [];
        
        if (history.length === 0) {
            this.runHistoryContainer.innerHTML = `<p style="color: #888; font-size: 18px; letter-spacing: 2px;">NO RUNS RECORDED</p>`;
            return;
        }

        history.forEach((run, index) => {
            const isVic = run.result === 'VICTORY';
            const color = isVic ? '#00ffff' : '#ff3366';
            const dateStr = run.timestamp ? new Date(run.timestamp).toLocaleString() : 'UNKNOWN TIME';

            const card = document.createElement('div');
            card.style.cssText = `
                width: 100%; max-width: 600px; padding: 16px; 
                background: rgba(20,20,30,0.8); border-left: 4px solid ${color};
                border-radius: 4px; box-shadow: 0 4px 12px rgba(0,0,0,0.5);
                display: flex; flex-direction: column; gap: 8px; text-align: left;
            `;
            
            card.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 8px;">
                    <span style="color: ${color}; font-weight: bold; font-size: 18px;">${run.result}</span>
                    <span style="color: #888; font-size: 12px;">${dateStr}</span>
                </div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 4px; font-size: 14px; color: #ccc;">
                    <div><span style="color:#888">FLOOR:</span> ${run.floor}</div>
                    <div><span style="color:#888">TIME:</span> ${run.duration}</div>
                    <div><span style="color:#888">KILLS:</span> ${run.kills}</div>
                    <div><span style="color:#888">GOLD:</span> ${run.gold}</div>
                    <div><span style="color:#888">WEAPON:</span> Lv.${run.weaponLevel}</div>
                    <div><span style="color:#888">RELICS:</span> ${run.relicsCount}</div>
                    <div style="grid-column: span 2; margin-top: 4px; color: #ffaa00;"><span style="color:#888">BOSS:</span> ${run.bossName}</div>
                </div>
            `;
            this.runHistoryContainer.appendChild(card);
        });
    }

    setupListeners() {
        for (let i = 0; i < 3; i++) {
            document.getElementById(`upgrade-${i}`).addEventListener('click', (e) => {
                if (this.state === 'LEVEL_UP') this.selectUpgrade(i);
                e.currentTarget.blur();
            });
        }
        for (let i = 0; i < 3; i++) {
            document.getElementById(`shop-btn-${i}`).addEventListener('click', (e) => {
                if (this.state === 'SHOP_OPEN') {
                    const price = this.shopManager.offers[i].price;
                    if (!this.shopManager.offers[i].sold && this.player.gold >= price) {
                        this.audio.play('buy');
                    }
                    this.shopManager.buy(i, this.player, this);
                }
                e.currentTarget.blur();
            });
        }
        const skinsBtn = document.querySelector('div.stat span.value[style*="cursor: pointer"]');
        if (skinsBtn) {
            skinsBtn.addEventListener('click', (e) => {
                if (this.state === 'PLAYING') this.openSkins();
                e.target.blur();
            });
        }

        // إعدادات الصوت (Settings Overlay)
        if (this.settingsToggleBtn) {
            this.settingsToggleBtn.addEventListener('click', (e) => {
                if (this.state === 'PLAYING') this.openSettings();
                e.target.blur();
            });
        }
        
        if (this.volumeSlider) {
            this.volumeSlider.addEventListener('input', (e) => {
                const vol = parseInt(e.target.value) / 100;
                this.audio.setVolume(vol);
            });
        }

        if (this.muteToggleSettingsBtn) {
            this.muteToggleSettingsBtn.addEventListener('click', (e) => {
                const isMuted = this.audio.toggleMute();
                if (isMuted) {
                    this.muteToggleSettingsBtn.innerText = 'MUTE: ON';
                    this.muteToggleSettingsBtn.style.color = '#ff3366';
                    this.muteToggleSettingsBtn.style.borderColor = '#ff3366';
                } else {
                    this.muteToggleSettingsBtn.innerText = 'MUTE: OFF';
                    this.muteToggleSettingsBtn.style.color = '#ffd700';
                    this.muteToggleSettingsBtn.style.borderColor = '#ffd700';
                }
                e.target.blur();
            });
        }
    }

    init() {
        this.currentFloor = 1;
        this.lastBossClass = null;
        this.runStats = { kills: 0, damage: 0, gold: 0, startTime: performance.now() };
        
        this.state = 'PLAYING';
        this.gameOverScreen.classList.add('hidden');
        this.levelUpScreen.classList.add('hidden');
        this.relicScreen.classList.add('hidden');
        this.victoryScreen.classList.add('hidden');
        this.floorTransitionScreen.classList.add('hidden');
        this.skinsScreen.classList.add('hidden');
        this.settingsScreen.classList.add('hidden');
        this.bossUI.classList.add('hidden');
        this.shopManager.close();
        
        this.dungeon.generate();
        
        const startRoom = this.dungeon.rooms.find(r => r.type === 'START');
        startRoom.discovered = true;
        startRoom.state = 'CLEARED';
        this.activeRoom = startRoom;
        
        const currentSkinId = this.player ? this.player.skin.id : SKINS[0].id;
        
        this.player = new Player(startRoom.center.x * this.dungeon.tileSize, startRoom.center.y * this.dungeon.tileSize);
        this.player.setSkin(currentSkinId);
        
        this.camera.snapTo(this.player.x, this.player.y);
        
        const treasureRoom = this.dungeon.rooms.find(r => r.type === 'TREASURE');
        if (treasureRoom) {
            this.chest = new Chest(treasureRoom.center.x * this.dungeon.tileSize, treasureRoom.center.y * this.dungeon.tileSize);
        } else {
            this.chest = null;
        }

        // --- توليد حدث عشوائي في غرفة الـ EVENT ---
        const eventRoom = this.dungeon.rooms.find(r => r.type === 'EVENT');
        if (eventRoom) {
            if (Math.random() < 0.5) {
                this.shrine = new Shrine(eventRoom.center.x * this.dungeon.tileSize, eventRoom.center.y * this.dungeon.tileSize);
                this.fountain = null;
                eventRoom.eventType = 'SHRINE';
            } else {
                this.fountain = new Fountain(eventRoom.center.x * this.dungeon.tileSize, eventRoom.center.y * this.dungeon.tileSize);
                this.shrine = null;
                eventRoom.eventType = 'FOUNTAIN';
            }
        } else {
            this.shrine = null;
            this.fountain = null;
        }

        this.boss = null;
        this.shopManager.generateInventory(this.player);
        
        this.enemies = [];
        this.pickups = [];
        this.floatingTexts = [];
        this.projectiles = [];
        this.particles.particles = [];
        this.particles.effects = [];
        
        this.ambientDust = Array.from({length: 80}, () => ({
            x: Math.random() * 2000,
            y: Math.random() * 2000,
            vx: (Math.random() - 0.5) * 15,
            vy: (Math.random() - 0.5) * 15,
            size: Math.random() * 2 + 0.5
        }));
        
        this.updateHUD();
        this.updateRoomHUD();
        this.updateWeaponHUD();
    }

    startNextFloor() {
        this.currentFloor++;
        this.dungeon.generate();
        
        const startRoom = this.dungeon.rooms.find(r => r.type === 'START');
        startRoom.discovered = true;
        startRoom.state = 'CLEARED';
        this.activeRoom = startRoom;
        
        this.player.x = startRoom.center.x * this.dungeon.tileSize;
        this.player.y = startRoom.center.y * this.dungeon.tileSize;
        this.camera.snapTo(this.player.x, this.player.y);
        
        this.player.heal(Math.floor(this.player.maxHp * 0.5));
        
        const treasureRoom = this.dungeon.rooms.find(r => r.type === 'TREASURE');
        if (treasureRoom) {
            this.chest = new Chest(treasureRoom.center.x * this.dungeon.tileSize, treasureRoom.center.y * this.dungeon.tileSize);
        } else {
            this.chest = null;
        }

        // --- توليد حدث عشوائي في غرفة الـ EVENT ---
        const eventRoom = this.dungeon.rooms.find(r => r.type === 'EVENT');
        if (eventRoom) {
            if (Math.random() < 0.5) {
                this.shrine = new Shrine(eventRoom.center.x * this.dungeon.tileSize, eventRoom.center.y * this.dungeon.tileSize);
                this.fountain = null;
                eventRoom.eventType = 'SHRINE';
            } else {
                this.fountain = new Fountain(eventRoom.center.x * this.dungeon.tileSize, eventRoom.center.y * this.dungeon.tileSize);
                this.shrine = null;
                eventRoom.eventType = 'FOUNTAIN';
            }
        } else {
            this.shrine = null;
            this.fountain = null;
        }

        this.boss = null;
        this.shopManager.generateInventory(this.player);
        
        this.enemies = [];
        this.pickups = [];
        this.floatingTexts = [];
        this.projectiles = [];
        this.particles.particles = [];
        this.particles.effects = [];
        
        this.state = 'PLAYING';
        this.floorTransitionScreen.classList.add('hidden');
        
        this.updateHUD();
        this.updateRoomHUD();
        this.updateWeaponHUD();
    }

    resize(width, height) {
        this.viewportWidth = width;
        this.viewportHeight = height;
        this.camera.setViewport(width, height);
    }

    update(dt) {
        if (this.state === 'GAME_OVER' || this.state === 'VICTORY') {
            if (this.input.justPressed('KeyR') || this.input.justPressed('r')) {
    this.maxFloors = 3;
    this.init();

    // إعادة تشغيل موسيقى الطابق الأول عند بدء Run جديد
    if (this.audio && this.audio.playBGM) {
        this.audio.playBGM('floor1_ost');
    }
}

            // --- خيار CONTINUE ENDLESS ---
            if (this.state === 'VICTORY' && (this.input.justPressed('KeyE') || this.input.justPressed('e'))) {
                this.maxFloors = 999; // فتح الحد الأقصى للطوابق
                this.victoryScreen.classList.add('hidden');
                this.startNextFloor();
                return;
            }
            // -----------------------------

            this.input.update();
            if (this.state === 'VICTORY') {
                this.particles.update(dt);
                if (this.boss) this.boss.update(dt, this.player, this.dungeon, this);
            }
            return;
        }

        if (this.state === 'SKINS_OPEN') {
            if (this.input.justPressed('Escape') || this.input.justPressed('KeyK') || this.input.justPressed('k')) {
                this.closeSkins();
            }
            this.input.update();
            return;
        }

        // دعم إغلاق الإعدادات عبر M أو ESC
        if (this.state === 'SETTINGS') {
            if (this.input.justPressed('Escape') || this.input.justPressed('KeyM') || this.input.justPressed('m')) {
                this.closeSettings();
            }
            this.input.update();
            return; // توقيف اللعب تماماً أثناء عرض الإعدادات
        }

        // دعم إغلاق السجل عبر ESC
        if (this.state === 'RUN_HISTORY') {
            if (this.input.justPressed('Escape')) {
                this.closeRunHistory();
            }
            this.input.update();
            return; 
        }

        if (this.state === 'FLOOR_TRANSITION') {
            if (this.input.justPressed('KeyE') || this.input.justPressed('e')) {
                this.startNextFloor();
            }
            this.input.update();
            this.particles.update(dt);
            if (this.boss) this.boss.update(dt, this.player, this.dungeon, this);
            return;
        }

        if (this.state === 'LEVEL_UP') {
            if (this.input.justPressed('Digit1') || this.input.justPressed('1')) this.selectUpgrade(0);
            if (this.input.justPressed('Digit2') || this.input.justPressed('2')) this.selectUpgrade(1);
            if (this.input.justPressed('Digit3') || this.input.justPressed('3')) this.selectUpgrade(2);
            this.input.update();
            return; 
        }

        if (this.state === 'SHRINE_OPEN') {
            if (this.input.justPressed('Digit1') || this.input.justPressed('1')) {
                // Blessing Effect
                this.audio.play('relic'); 
                this.player.damageMultiplier += 0.20;
                this.floatingTexts.push(new FloatingText(this.player.x, this.player.y - 40, '+20% DAMAGE', '#bb88ff'));
                this.shrine.state = 'USED';
                this.state = 'PLAYING';
            }
            if (this.input.justPressed('Digit2') || this.input.justPressed('2')) {
                // Curse Effect
                this.audio.play('gold');
                let hpLoss = Math.floor(this.player.maxHp * 0.10);
                this.player.maxHp = Math.max(10, this.player.maxHp - hpLoss); // حماية من الهبوط لصفر
                if (this.player.hp > this.player.maxHp) this.player.hp = this.player.maxHp;
                
                this.player.gainGold(100);
                this.runStats.gold += 100;
                this.floatingTexts.push(new FloatingText(this.player.x, this.player.y - 40, '-10% MAX HP / +100 GOLD', '#ff3366'));
                
                this.shrine.state = 'USED';
                this.state = 'PLAYING';
                this.updateHUD();
            }
            this.input.update();
            return;
        }

            if (this.state === 'FOUNTAIN_OPEN') {
            if (this.input.justPressed('Digit1') || this.input.justPressed('1')) {
                // Drink Effect (50% Missing HP)
                this.audio.play('health');
                const missingHp = this.player.maxHp - this.player.hp;
                const healAmount = Math.floor(missingHp * 0.5);
                if (healAmount > 0) this.player.heal(healAmount);
                this.floatingTexts.push(new FloatingText(this.player.x, this.player.y - 40, `+${healAmount} HP`, '#33ff55'));
                this.fountain.state = 'USED';
                this.state = 'PLAYING';
                this.updateHUD();
            }
            if (this.input.justPressed('Digit2') || this.input.justPressed('2')) {
                // Sacrifice Effect (-10% Max HP, +150 Gold)
                this.audio.play('gold');
                let hpLoss = Math.floor(this.player.maxHp * 0.10);
                this.player.maxHp = Math.max(10, this.player.maxHp - hpLoss);
                if (this.player.hp > this.player.maxHp) this.player.hp = this.player.maxHp;
                
                this.player.gainGold(150);
                this.runStats.gold += 150;
                this.floatingTexts.push(new FloatingText(this.player.x, this.player.y - 40, '-10% MAX HP / +150 GOLD', '#ff3366'));
                
                this.fountain.state = 'USED';
                this.state = 'PLAYING';
                this.updateHUD();
            }
            this.input.update();
            return;
        }

        if (this.state === 'SHOP_OPEN') {
            if (this.input.justPressed('Escape')) {
                this.shopManager.close();
                this.state = 'PLAYING';
            }
            if (this.input.justPressed('Digit1') || this.input.justPressed('1')) {
                if(!this.shopManager.offers[0].sold && this.player.gold >= this.shopManager.offers[0].price) this.audio.play('buy');
                this.shopManager.buy(0, this.player, this);
            }
            if (this.input.justPressed('Digit2') || this.input.justPressed('2')) {
                if(!this.shopManager.offers[1].sold && this.player.gold >= this.shopManager.offers[1].price) this.audio.play('buy');
                this.shopManager.buy(1, this.player, this);
            }
            if (this.input.justPressed('Digit3') || this.input.justPressed('3')) {
                if(!this.shopManager.offers[2].sold && this.player.gold >= this.shopManager.offers[2].price) this.audio.play('buy');
                this.shopManager.buy(2, this.player, this);
            }
            this.input.update();
            return; 
        }

        if (this.state === 'RELIC_POPUP') {
            if (this.input.justPressed('KeyE') || this.input.justPressed('e')) {
                this.relicScreen.classList.add('hidden');
                this.state = this.previousState || 'PLAYING';
            }
            this.input.update();
            return;
        }

        if (this.input.justPressed('KeyK') || this.input.justPressed('k')) {
            this.openSkins();
            this.input.update();
            return;
        }
        
        
        const currentRoom = this.dungeon.getRoomAt(this.player.x, this.player.y);
        if (currentRoom && currentRoom !== this.activeRoom) {
            this.activeRoom = currentRoom;
            this.activeRoom.discovered = true;
            this.updateRoomHUD();
            
            if (this.activeRoom.state === 'UNVISITED') {
                this.activeRoom.state = 'ACTIVE';
                
                if (this.activeRoom.type === 'COMBAT') {
                    this.spawnEnemiesInRoom(this.activeRoom);
                } else if (this.activeRoom.type === 'BOSS_PLACEHOLDER') {
                    const bossClasses = [DungeonWarden, Dragon, AbyssalBeast];
                    let availableBosses = bossClasses;
                    if (this.lastBossClass) {
                        availableBosses = bossClasses.filter(b => b !== this.lastBossClass);
                    }
                    
                    const BossClass = availableBosses[Math.floor(Math.random() * availableBosses.length)];
                    this.lastBossClass = BossClass;
                    
                    this.boss = new BossClass(this.activeRoom.center.x * this.dungeon.tileSize, this.activeRoom.center.y * this.dungeon.tileSize, this.currentFloor);
                    
                    this.uiBossName.innerText = this.boss.name; 
                    this.bossUI.classList.remove('hidden');
                    
                    // تشغيل موسيقى الزعيم عند بدء المواجهة
                    if (this.audio.playBGM) {
                        this.audio.playBGM('boss_ost');
                    }
                    
                    this.updateBossHUD();
                } else if (['TREASURE', 'SHOP', 'EVENT'].includes(this.activeRoom.type)) {
                    this.activeRoom.state = 'VISITED'; // نجعلها VISITED فوراً لعدم وجود أعداء حالياً
                }
            }
        }

        if (this.activeRoom && this.activeRoom.type === 'COMBAT' && this.activeRoom.state === 'ACTIVE') {
            const coreEnemies = this.enemies.filter(e => !e.isSummon);
            if (coreEnemies.length === 0) {
                this.activeRoom.state = 'CLEARED';
                this.enemies = []; 
                this.floatingTexts.push(new FloatingText(this.player.x, this.player.y - 40, 'ROOM CLEARED', '#00ffff'));
            }
        }

        let nearShop = false;
        let shopRoom = this.dungeon.rooms.find(r => r.type === 'SHOP');
        if (shopRoom && this.activeRoom === shopRoom) {
            const scx = shopRoom.center.x * this.dungeon.tileSize;
            const scy = shopRoom.center.y * this.dungeon.tileSize;
            const dx = this.player.x - scx;
            const dy = this.player.y - scy;
            if (Math.sqrt(dx*dx + dy*dy) < 80) {
                nearShop = true;
                if (this.input.justPressed('KeyE') || this.input.justPressed('e')) {
                    this.state = 'SHOP_OPEN';
                    this.shopManager.open(this.player);
                    this.input.update();
                    return;
                }
            }
        }
        this.nearShopCache = nearShop; 

        if (this.input.justPressed('Digit1') || this.input.justPressed('1')) { this.player.switchWeapon(0); this.updateWeaponHUD(); }
        if (this.input.justPressed('Digit2') || this.input.justPressed('2')) { this.player.switchWeapon(1); this.updateWeaponHUD(); }
        if (this.input.justPressed('Digit3') || this.input.justPressed('3')) { this.player.switchWeapon(2); this.updateWeaponHUD(); }
        if (this.input.justPressed('Digit4') || this.input.justPressed('4')) { this.player.switchWeapon(3); this.updateWeaponHUD(); }   

        const triggeredWeapon = this.player.update(dt, this.input, this.dungeon);
        
        if (this.activeRoom && this.activeRoom.type === 'BOSS_PLACEHOLDER' && this.activeRoom.state === 'ACTIVE') {
            const minX = this.activeRoom.x * this.dungeon.tileSize + this.player.radius;
            const minY = this.activeRoom.y * this.dungeon.tileSize + this.player.radius;
            const maxX = (this.activeRoom.x + this.activeRoom.w) * this.dungeon.tileSize - this.player.radius;
            const maxY = (this.activeRoom.y + this.activeRoom.h) * this.dungeon.tileSize - this.player.radius;
            this.player.x = Math.max(minX, Math.min(maxX, this.player.x));
            this.player.y = Math.max(minY, Math.min(maxY, this.player.y));
        }

        if (triggeredWeapon) {
    let soundId = 'attack';

    switch (triggeredWeapon.id) {
        case 'ARCANE_BOLT':
            soundId = 'arcane_bolt';
            break;

        case 'FROST_NOVA':
            soundId = 'frost_nova';
            break;

        case 'BLOOD_SCYTHE':
            soundId = 'blood_scythe';
            break;
    }

    this.audio.play(soundId);
    this.processPlayerAttack(triggeredWeapon);
}
        
        if (this.chest) {
            const wasClosed = this.chest.state === 'CLOSED';
            this.chest.update(dt, this.player, this.input, this);
            if (wasClosed && this.chest.state === 'OPENING') this.audio.play('chest_open');
        }

        if (this.shrine) {
            this.shrine.update(dt, this.player, this.input, this);
        }

        if (this.fountain) {
            this.fountain.update(dt, this.player, this.input, this);
        }
        
        if (this.boss) {
            this.boss.update(dt, this.player, this.dungeon, this);

            // فحص موت اللاعب من هجمات الزعيم المساحية والمقذوفات
            if (this.player.hp <= 0 && this.state !== 'GAME_OVER') {
                this.triggerGameOver();
                return;
            }

            if (this.boss.state !== 'DEFEATED') {
                const bdx = this.player.x - this.boss.x;
                const bdy = this.player.y - this.boss.y;
                if (Math.sqrt(bdx*bdx + bdy*bdy) < this.player.radius + this.boss.radius) {
                    if (this.player.takeDamage(this.boss.contactDamage)) {
                        this.audio.play('hit_player');
                        this.camera.shake(0.2, 5);
                        this.particles.spawnHitEffect(this.player.x, this.player.y, '#ff3366');
                        this.floatingTexts.push(new FloatingText(this.player.x, this.player.y - 20, `-${this.boss.contactDamage}`, '#ff0000'));
                        this.updateHUD();
                        if (this.player.hp <= 0) this.triggerGameOver();
                    }
                }
            }
        }

        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            let p = this.projectiles[i];
            p.update(dt, this.dungeon);
            
            if (p.active) {
                for (let j = this.enemies.length - 1; j >= 0; j--) {
                    let enemy = this.enemies[j];
                    const dx = p.x - enemy.x;
                    const dy = p.y - enemy.y;
                    
                    if (Math.sqrt(dx*dx + dy*dy) < p.radius + enemy.radius) {
                        p.active = false;
                        this.particles.spawnHitEffect(enemy.x, enemy.y, p.color);
                        if (enemy.takeDamage(p.damage)) {
                            this.handleEnemyDeath(enemy);
                            this.enemies.splice(j, 1);
                        } else {
                            this.audio.play('hit_enemy');
                            this.floatingTexts.push(new FloatingText(enemy.x, enemy.y - 20, `-${p.damage}`, '#ffffff'));
                        }
                        this.runStats.damage += p.damage;
                        break; 
                    }
                }
                if (p.active && this.boss && this.boss.state !== 'DEFEATED') {
                    const dx = p.x - this.boss.x;
                    const dy = p.y - this.boss.y;
                    if (Math.sqrt(dx*dx + dy*dy) < p.radius + this.boss.radius) {
                        p.active = false;
                        this.particles.spawnHitEffect(this.boss.x, this.boss.y, p.color);
                        this.runStats.damage += p.damage;
                        if (this.boss.takeDamage(p.damage)) {
                            this.handleBossDeath();
                        } else {
                            this.audio.play('boss_hit');
                            this.floatingTexts.push(new FloatingText(this.boss.x, this.boss.y - 40, `-${p.damage}`, '#ffcccc'));
                            this.updateBossHUD();
                        }
                    }
                }
            }
            if (!p.active) {
                this.particles.spawnHitEffect(p.x, p.y, p.color);
                this.projectiles.splice(i, 1);
            }
        }

        for (let i = this.pickups.length - 1; i >= 0; i--) {
            let pickup = this.pickups[i];
            pickup.update(dt);
            const dx = this.player.x - pickup.x;
            const dy = this.player.y - pickup.y;
            
            if (Math.sqrt(dx*dx + dy*dy) < this.player.radius + pickup.radius) {
                this.collectPickup(pickup);
                this.pickups.splice(i, 1);
            }
        }

        for (let i = this.enemies.length - 1; i >= 0; i--) {
            let enemy = this.enemies[i];
            enemy.update(dt, this.player, this.dungeon);
            
            if (enemy.shouldSummon && enemy.summonCount < enemy.maxSummons) {
    const statMultiplier = 1.0 + ((this.currentFloor - 1) * 0.2);

    const angle = Math.random() * Math.PI * 2;
    const spawnDistance = 32;

    const spawnX = enemy.x + Math.cos(angle) * spawnDistance;
    const spawnY = enemy.y + Math.sin(angle) * spawnDistance;

    if (!this.dungeon.isWallAt(spawnX, spawnY)) {
        this.enemies.push(
            new Enemy(
                spawnX,
                spawnY,
                statMultiplier,
                true
            )
        );

        enemy.summonCount++;
    }

    enemy.shouldSummon = false;
}

            if (enemy.projectiles) {
    for (let j = enemy.projectiles.length - 1; j >= 0; j--) {
        const arrow = enemy.projectiles[j];

        arrow.update(dt, this.dungeon);

        if (!arrow.dead) {
            const dx = this.player.x - arrow.x;
            const dy = this.player.y - arrow.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < this.player.radius + arrow.radius) {
                arrow.dead = true;

                if (this.player.takeDamage(arrow.damage)) {
                    this.audio.play('hit_player');
                    this.camera.shake(0.2, 5);
                    this.particles.spawnHitEffect(
                        this.player.x,
                        this.player.y,
                        '#ff3366'
                    );

                    this.floatingTexts.push(
                        new FloatingText(
                            this.player.x,
                            this.player.y - 20,
                            `-${arrow.damage}`,
                            '#ff0000'
                        )
                    );

                    this.updateHUD();

                    if (this.player.hp <= 0) {
                        this.triggerGameOver();
                    }
                }
            }
        }

        if (arrow.dead) {
            enemy.projectiles.splice(j, 1);
        }
    }
}

            const dx = this.player.x - enemy.x;
            const dy = this.player.y - enemy.y;
            
            if (Math.sqrt(dx*dx + dy*dy) < this.player.radius + enemy.radius) {
                if (this.player.takeDamage(enemy.contactDamage)) {
                    this.audio.play('hit_player');
                    this.camera.shake(0.2, 5);
                    this.particles.spawnHitEffect(this.player.x, this.player.y, '#ff3366');
                    this.floatingTexts.push(new FloatingText(this.player.x, this.player.y - 20, `-${enemy.contactDamage}`, '#ff0000'));
                    this.updateHUD();
                    
                    if (this.player.hp <= 0) {
                        this.triggerGameOver();
                    }
                }
            }
        }

        for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
            let ft = this.floatingTexts[i];
            ft.update(dt);
            if (ft.life <= 0) this.floatingTexts.splice(i, 1);
        }

        for (let d of this.ambientDust) {
            d.x += d.vx * dt;
            d.y += d.vy * dt;
            if (d.x > 3000) d.x -= 4000;
            if (d.x < -1000) d.x += 4000;
            if (d.y > 3000) d.y -= 4000;
            if (d.y < -1000) d.y += 4000;
        }

        this.particles.update(dt);
        this.camera.update(dt, this.player, this.dungeon);
        this.input.update();
    }

    spawnMinion(x, y) {
        const statMultiplier = 1.0 + ((this.currentFloor - 1) * 0.2);
        this.enemies.push(new Enemy(x, y, statMultiplier, true));
    }

    spawnEnemiesInRoom(room) {
        const baseCount = Math.floor(Math.random() * 4) + 2; 
        const numEnemies = baseCount + (this.currentFloor - 1); 
        const statMultiplier = 1.0 + ((this.currentFloor - 1) * 0.2); 
        
        const ts = this.dungeon.tileSize;
        for (let i = 0; i < numEnemies; i++) {
            const ex = room.x + 1 + Math.random() * (room.w - 3);
            const ey = room.y + 1 + Math.random() * (room.h - 3);
            const px = ex * ts;
            const py = ey * ts;
            const dx = px - this.player.x;
            const dy = py - this.player.y;
            if (Math.sqrt(dx*dx + dy*dy) > 150) {
                const rand = Math.random();

// 10% Necromancer
if (rand < 0.10) {
    this.enemies.push(new Necromancer(px, py, statMultiplier));
}
// 15% Brute
else if (rand < 0.25) {
    this.enemies.push(new Brute(px, py, statMultiplier));
}
// 20% Dasher
else if (rand < 0.45) {
    this.enemies.push(new Dasher(px, py, statMultiplier));
}
// 25% Archer
else if (rand < 0.70) {
    this.enemies.push(new Archer(px, py, statMultiplier));
}
// 30% Crawler
else {
    this.enemies.push(new Enemy(px, py, statMultiplier, false));
}
            } else {
                i--;
            }
        }
    }

    processPlayerAttack(weapon) {
        let finalDamage = Math.floor(weapon.damage * this.player.damageMultiplier);
        if (weapon.id === 'ARCANE_BOLT' && this.player.hasRelic('ARCANE_CORE')) {
            // Synergy: ARCANE_CORE + BERSERKER_CORE
            let arcaneMultiplier = this.player.hasRelic('BERSERKER_CORE') ? 1.25 : 1.15; // 1.15 + 0.10
            finalDamage = Math.floor(finalDamage * arcaneMultiplier);
        }

        if (weapon.type === 'MELEE') {
            const facingAngle = Math.atan2(this.player.facing.y, this.player.facing.x);
            const targets = [...this.enemies];
            if (this.boss && this.boss.state !== 'DEFEATED') targets.push(this.boss);
            
            for (let i = targets.length - 1; i >= 0; i--) {
                let enemy = targets[i];
                const dx = enemy.x - this.player.x;
                const dy = enemy.y - this.player.y;
                
                if (Math.sqrt(dx*dx + dy*dy) <= weapon.range + enemy.radius) {
                    const angleToEnemy = Math.atan2(dy, dx);
                    let angleDiff = Math.abs(facingAngle - angleToEnemy);
                    if (angleDiff > Math.PI) angleDiff = 2 * Math.PI - angleDiff;
                    
                    if (angleDiff < Math.PI / 3) { 
                        this.particles.spawnHitEffect(enemy.x, enemy.y, weapon.color);
                        this.runStats.damage += finalDamage;
                        if (enemy.takeDamage(finalDamage)) {
                            if (enemy === this.boss) {
                                this.handleBossDeath();
                            } else {
                                this.handleEnemyDeath(enemy);
                                this.enemies.splice(this.enemies.indexOf(enemy), 1);
                            }
                        } else if (enemy === this.boss) {
                            this.audio.play('boss_hit');
                            this.floatingTexts.push(new FloatingText(this.boss.x, this.boss.y - 40, `-${finalDamage}`, '#ffcccc'));
                            this.updateBossHUD();
                        } else {
                            this.audio.play('hit_enemy');
                            this.floatingTexts.push(new FloatingText(enemy.x, enemy.y - 20, `-${finalDamage}`, '#ffffff'));
                        }
                    }
                }
            }
        } 
        else if (weapon.type === 'RANGED') {
            const trueDamageMultiplier = finalDamage / weapon.damage;
            this.projectiles.push(new Projectile(this.player.x, this.player.y, this.player.facing, weapon, trueDamageMultiplier));
        }
        else if (weapon.type === 'AREA') {
            this.particles.spawnNova(this.player.x, this.player.y, weapon.range, weapon.color);
            const targets = [...this.enemies];
            if (this.boss && this.boss.state !== 'DEFEATED') targets.push(this.boss);
            
            for (let i = targets.length - 1; i >= 0; i--) {
                let enemy = targets[i];
                const dx = enemy.x - this.player.x;
                const dy = enemy.y - this.player.y;
                if (Math.sqrt(dx*dx + dy*dy) <= weapon.range + enemy.radius) {
                    this.particles.spawnHitEffect(enemy.x, enemy.y, weapon.color);
                    this.runStats.damage += finalDamage;
                    if (enemy.takeDamage(finalDamage)) {
                        if (enemy === this.boss) {
                            this.handleBossDeath();
                        } else {
                            this.handleEnemyDeath(enemy);
                            this.enemies.splice(this.enemies.indexOf(enemy), 1);
                        }
                    } else if (enemy === this.boss) {
                        this.audio.play('boss_hit');
                        this.floatingTexts.push(new FloatingText(this.boss.x, this.boss.y - 40, `-${finalDamage}`, '#ffcccc'));
                        this.updateBossHUD();
                    } else {
                        this.audio.play('hit_enemy');
                        this.floatingTexts.push(new FloatingText(enemy.x, enemy.y - 20, `-${finalDamage}`, '#ffffff'));
                    }
                }
            }
        }
    }

    handleEnemyDeath(enemy) {
        this.audio.play('enemy_death');
        
        if (this.player.hasRelic('VAMPIRE_CORE') && this.player.hp < this.player.maxHp) {
            // Synergy: VAMPIRE_CORE + BERSERKER_CORE
            const healAmount = this.player.hasRelic('BERSERKER_CORE') ? 4 : 2;
            this.player.heal(healAmount);
            this.floatingTexts.push(new FloatingText(this.player.x, this.player.y - 40, `+${healAmount} HP`, '#ff1155'));
        }

        if (!enemy.isSummon) {
            this.runStats.kills++;
            
            // Synergy: GOLDEN_CORE + FORTUNE (goldMultiplier > 1.0)
            let coreMult = this.player.hasRelic('GOLDEN_CORE') ? 1.25 : 1.0;
            if (this.player.hasRelic('GOLDEN_CORE') && (this.player.goldMultiplier || 1.0) > 1.0) {
                coreMult += 0.10;
            }
            const goldMult = coreMult * (this.player.goldMultiplier || 1.0);
            this.pickups.push(new Pickup(enemy.x, enemy.y, 'GOLD', goldMult));
            
            if (Math.random() < 0.15) {
                this.pickups.push(new Pickup(enemy.x + 15, enemy.y - 15, 'HEALTH'));
            }

            const xpGained = 25;
            this.floatingTexts.push(new FloatingText(enemy.x, enemy.y - 20, `+${xpGained} XP`, '#bb88ff'));
            
            if (this.player.gainXp(xpGained)) {
                this.audio.play('level_up');
                this.triggerLevelUp();
            }
        }
        
        this.updateHUD();
    }

    handleBossDeath() {
        this.audio.play('floor_clear');
        
        // إيقاف موسيقى الزعيم فور تأكيد موته
        if (this.audio.stopMusic) {
            this.audio.stopMusic();
        }
        
        this.runStats.kills++;
        this.updateBossHUD();
        this.particles.spawnNova(this.boss.x, this.boss.y, 200, '#ffffff'); 
        this.camera.shake(0.6, 20);
        
        // Synergy: GOLDEN_CORE + FORTUNE (goldMultiplier > 1.0)
        let coreMult = this.player.hasRelic('GOLDEN_CORE') ? 1.25 : 1.0;
        if (this.player.hasRelic('GOLDEN_CORE') && (this.player.goldMultiplier || 1.0) > 1.0) {
            coreMult += 0.10;
        }
        const goldMult = coreMult * (this.player.goldMultiplier || 1.0);
        const goldReward = Math.floor(150 * goldMult);
        const xpReward = 300;
        
        this.player.gainGold(goldReward);
        this.runStats.gold += goldReward; 
        
        this.floatingTexts.push(new FloatingText(this.boss.x, this.boss.y, `+${goldReward} GOLD`, '#ffd700'));
        this.floatingTexts.push(new FloatingText(this.boss.x, this.boss.y - 20, `+${xpReward} XP`, '#bb88ff'));
        
        if (this.player.gainXp(xpReward)) {} 

        this.activeRoom.state = 'CLEARED';
        this.enemies = []; 

        this.bossUI.classList.add('hidden');
        this.updateHUD();
        
        // إضافة توجيه للاعب في شاشة النصر
        this.victorySubtitleText.innerText = `${this.boss.name} HAS FALLEN\nPRESS [E] TO CONTINUE ENDLESS`;

        setTimeout(() => {
            if (this.currentFloor < this.maxFloors) {
                this.state = 'FLOOR_TRANSITION';
                this.floorTitleText.innerText = `FLOOR ${this.currentFloor} CLEARED`;
                this.floorTransitionScreen.classList.remove('hidden');
            } else {
                this.state = 'VICTORY';
                this.populateStatsUI('vic');
                this.victoryScreen.classList.remove('hidden');
            }
        }, 1500);
    }

    collectPickup(pickup) {
        if (pickup.type === 'GOLD') {
            this.audio.play('gold');
            this.player.gainGold(pickup.value);
            this.runStats.gold += pickup.value;
            this.floatingTexts.push(new FloatingText(this.player.x, this.player.y - 20, `+${pickup.value}`, '#ffd700'));
        } else if (pickup.type === 'HEALTH') {
            this.audio.play('health');
            this.player.heal(pickup.value);
            this.floatingTexts.push(new FloatingText(this.player.x, this.player.y - 20, `+${pickup.value} HP`, '#33ff55'));
        }
        this.updateHUD();
    }

    triggerLevelUp() {
        if (this.state === 'VICTORY' || this.state === 'FLOOR_TRANSITION') return; 
        this.state = 'LEVEL_UP';
        let shuffled = [...this.availableUpgrades].sort(() => 0.5 - Math.random());
        this.currentUpgradeChoices = shuffled.slice(0, 3);
        
        for (let i = 0; i < 3; i++) {
            const cardUI = document.getElementById(`upgrade-${i}`);
            cardUI.querySelector('.card-title').innerText = this.currentUpgradeChoices[i].name;
            cardUI.querySelector('.card-desc').innerText = this.currentUpgradeChoices[i].desc;
        }
        this.levelUpScreen.classList.remove('hidden');
    }

    selectUpgrade(index) {
        const upgrade = this.currentUpgradeChoices[index];
        if (upgrade) {
            this.audio.play('upgrade_select');
            upgrade.apply(this.player);
            this.updateHUD(); 
            this.levelUpScreen.classList.add('hidden');
            this.state = 'PLAYING';
        }
    }

    triggerRelicPopup(relicDef) {
        this.audio.play('relic');
        this.previousState = this.state; 
        this.state = 'RELIC_POPUP';
        
        const title = document.getElementById('relicName');
        title.innerText = relicDef.name;
        title.style.color = relicDef.color;
        
        document.getElementById('relicDesc').innerText = relicDef.desc;
        this.relicScreen.classList.remove('hidden');
        this.player.addRelic(relicDef);

        this.updateHUD(); 
    }

    formatTime(ms) {
        let totalSeconds = Math.floor(ms / 1000);
        let m = Math.floor(totalSeconds / 60);
        let s = totalSeconds % 60;
        return `${m}:${s.toString().padStart(2, '0')}`;
    }

    populateStatsUI(prefix) {
        const highestWpn = this.player.weapons.reduce((max, w) => w.level > max ? w.level : max, 1);
        const totalMs = performance.now() - this.runStats.startTime;
        const timeStr = this.formatTime(totalMs);
        
        if (prefix === 'go') {
            document.getElementById('go-floor').innerText = this.currentFloor;
        }
        document.getElementById(`${prefix}-level`).innerText = this.player.level;
        document.getElementById(`${prefix}-gold`).innerText = this.runStats.gold;
        document.getElementById(`${prefix}-kills`).innerText = this.runStats.kills;
        document.getElementById(`${prefix}-damage`).innerText = this.runStats.damage;
        document.getElementById(`${prefix}-time`).innerText = timeStr;
        document.getElementById(`${prefix}-relics`).innerText = this.player.relics.length;
        document.getElementById(`${prefix}-weapon`).innerText = `Lv. ${highestWpn}`;

        // --- تجميع وتسجيل بيانات الرن المنتهي في السجل ---
        const runData = {
            result: prefix === 'vic' ? 'VICTORY' : 'DEFEAT',
            floor: this.currentFloor,
            kills: this.runStats.kills,
            gold: this.runStats.gold,
            relicsCount: this.player.relics.length,
            weaponLevel: highestWpn,
            duration: timeStr,
            bossName: this.boss ? this.boss.name : 'Unknown',
            timestamp: Date.now()
        };
        
        // حفظ الرن في نظام التقدم
        if (this.progression && this.progression.addRun) {
            this.progression.addRun(runData);
        }
    }

    triggerGameOver() {
    if (this.audio.stopMusic) {
        this.audio.stopMusic();
    }
        this.audio.play('game_over');
        this.state = 'GAME_OVER';
        this.camera.shake(0.5, 10);
        this.bossUI.classList.add('hidden');
        this.populateStatsUI('go');
        this.gameOverScreen.classList.remove('hidden');
    }

    updateWeaponHUD() {
        const weapon = this.player.currentWeapon;
        const nameEl = document.querySelector('.weapon-name');
        nameEl.innerText = `${weapon.name} Lv.${weapon.level}`;
        nameEl.style.color = weapon.color;
        
        for (let i = 0; i < this.player.weapons.length; i++) {
            const w = this.player.weapons[i];
            const item = document.getElementById(`ui-weapon-${i}`);
            item.innerText = `[ ${i+1} ] ${w.name} Lv.${w.level}`;
            if (i === this.player.currentWeaponIndex) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        }
    }

    updateRoomHUD() {
        if (!this.activeRoom) return;
        this.roomUI.innerText = this.activeRoom.type;
        const typeColors = {
            'START': '#00aaff',
            'COMBAT': '#ff3366',
            'TREASURE': '#ffd700',
            'SHOP': '#ffaa00',
            'BOSS_PLACEHOLDER': '#ff0000',
            'EVENT': '#aa55ff' // لون بنفسجي مميز للحدث
        };
        this.roomUI.style.color = typeColors[this.activeRoom.type] || '#ffffff';
    }

    updateHUD() {
        if (this.hpTextUI && this.hpFillUI) {
            const isLow = this.player.hp <= this.player.maxHp * 0.3;
            const hpPercent = Math.max(0, Math.min(100, (this.player.hp / this.player.maxHp) * 100));
            
            // تحديث الرقم
            this.hpTextUI.innerText = `${Math.floor(this.player.hp)} / ${Math.floor(this.player.maxHp)}`;
            this.hpTextUI.style.color = isLow ? '#ff0000' : '#ff3366';
            
            // تحديث الشريط مع التنبيه البصري عند انخفاض الصحة
            this.hpFillUI.style.width = `${hpPercent}%`;
            this.hpFillUI.style.backgroundColor = isLow ? '#ff0000' : '#ff3366';
            this.hpFillUI.style.boxShadow = isLow ? '0 0 12px #ff0000' : '0 0 8px rgba(255,51,102,0.4)';
        }

        this.levelUI.innerText = this.player.level;
        this.xpTextUI.innerText = `${Math.floor(this.player.xp)} / ${this.player.maxXp}`;
        this.xpFillUI.style.width = `${Math.min(100, (this.player.xp / this.player.maxXp) * 100)}%`;
        this.goldUI.innerText = this.player.gold;
        // إظهار كلمة ENDLESS إذا تجاوز اللاعب الطابق الثالث
        this.floorUI.innerText = this.currentFloor > 3 ? `${this.currentFloor} (ENDLESS)` : `${this.currentFloor} / 3`;
        
        this.relicListUI.innerHTML = '';
        for (let rId of this.player.relics) {
            const def = RELICS.find(x => x.id === rId);
            if (def) {
                const badge = document.createElement('div');
                badge.innerText = def.short;
                badge.style.cssText = `
                    color: ${def.color};
                    background: rgba(0, 0, 0, 0.7);
                    border: 1px solid ${def.color};
                    box-shadow: 0 0 6px ${def.color}40, inset 0 0 4px ${def.color}40;
                    padding: 2px 6px;
                    border-radius: 3px;
                    font-size: 10px;
                    font-weight: bold;
                    font-family: monospace;
                    letter-spacing: 1px;
                    text-transform: uppercase;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                `;
                this.relicListUI.appendChild(badge);
            }
        }
    }

    updateBossHUD() {
        if (!this.boss) return;
        this.bossHpFill.style.width = `${Math.max(0, (this.boss.hp / this.boss.maxHp) * 100)}%`;
        this.bossHpText.innerText = `${Math.floor(this.boss.hp)} / ${this.boss.maxHp}`;
    }

        renderMinimap(ctx) {
        const size = 130;
        const margin = 40;
        const x = this.viewportWidth - size - margin;
        const y = this.viewportHeight - size - margin;

        ctx.save();
        ctx.fillStyle = 'rgba(10, 10, 15, 0.85)';
        ctx.strokeStyle = '#444';
        ctx.lineWidth = 2;
        ctx.fillRect(x, y, size, size);
        ctx.strokeRect(x, y, size, size);

        ctx.beginPath();
        ctx.rect(x, y, size, size);
        ctx.clip();

        ctx.translate(x + size/2, y + size/2);

        const scale = 2.5;
        const px = this.player.x / this.dungeon.tileSize;
        const py = this.player.y / this.dungeon.tileSize;

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.lineWidth = 2;
        for (let r of this.dungeon.rooms) {
            if (!r.discovered) continue;
            for (let connected of r.connectedRooms) {
                if (connected.discovered) {
                    const r1x = (r.center.x - px) * scale;
                    const r1y = (r.center.y - py) * scale;
                    const r2x = (connected.center.x - px) * scale;
                    const r2y = (connected.center.y - py) * scale;
                    ctx.beginPath();
                    ctx.moveTo(r1x, r1y);
                    ctx.lineTo(r2x, r2y);
                    ctx.stroke();
                }
            }
        }

        for (let r of this.dungeon.rooms) {
            if (!r.discovered) continue;

            const rx = (r.x - px) * scale;
            const ry = (r.y - py) * scale;
            const rw = r.w * scale;
            const rh = r.h * scale;

            let bgColor = '#333';
            let bColor = '#555';
            let icon = '';
            let iconColor = '#fff';

            if (r.type === 'START') { bgColor = 'rgba(0, 170, 255, 0.3)'; bColor = '#00aaff'; icon = 'S'; iconColor = '#00aaff'; }
            else if (r.type === 'TREASURE') { bgColor = 'rgba(255, 215, 0, 0.3)'; bColor = '#ffd700'; icon = 'T'; iconColor = '#ffd700'; }
            else if (r.type === 'SHOP') { bgColor = 'rgba(255, 170, 0, 0.3)'; bColor = '#ffaa00'; icon = '$'; iconColor = '#ffaa00'; }
            else if (r.type === 'BOSS_PLACEHOLDER') { bgColor = 'rgba(255, 0, 0, 0.3)'; bColor = '#ff0000'; icon = 'B'; iconColor = '#ff0000'; }
            else if (r.type === 'EVENT') {
                if (r.eventType === 'FOUNTAIN') {
                    bgColor = 'rgba(0, 170, 255, 0.3)'; bColor = '#00aaff'; icon = 'F'; iconColor = '#00aaff';
                } else {
                    bgColor = 'rgba(170, 85, 255, 0.3)'; bColor = '#aa55ff'; icon = '?'; iconColor = '#aa55ff';
                }
            }
            else if (r.type === 'COMBAT') {
                if (r.state === 'CLEARED') { bgColor = 'rgba(85, 85, 85, 0.5)'; bColor = '#777'; }
                else { bgColor = 'rgba(255, 51, 102, 0.3)'; bColor = '#ff3366'; icon = '!'; iconColor = '#ff3366'; }
            }

            ctx.globalAlpha = (r !== this.activeRoom) ? 0.7 : 1.0;

            if (r === this.activeRoom) {
                ctx.shadowBlur = 10;
                ctx.shadowColor = '#ffffff';
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 2;
            } else {
                ctx.shadowBlur = 0;
                ctx.strokeStyle = bColor;
                ctx.lineWidth = 1;
            }

            ctx.fillStyle = bgColor;
            ctx.fillRect(rx, ry, rw, rh);
            ctx.strokeRect(rx, ry, rw, rh);
            ctx.shadowBlur = 0;

            if (icon) {
                ctx.fillStyle = iconColor;
                ctx.font = 'bold 10px monospace';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                const cx = (r.center.x - px) * scale;
                const cy = (r.center.y - py) * scale;
                ctx.fillText(icon, cx, cy);
            }
        }

        ctx.globalAlpha = 1.0;
        ctx.fillStyle = '#00ffff';
        ctx.shadowBlur = 8;
        ctx.shadowColor = '#00ffff';
        ctx.beginPath();
        ctx.arc(0, 0, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 9px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('YOU', 0, -8);

        ctx.restore();
    }


    render(ctx) {
        ctx.fillStyle = '#050505';
        ctx.fillRect(0, 0, this.viewportWidth, this.viewportHeight);

        ctx.save();
        const offsetX = Math.floor(this.viewportWidth / 2 - this.camera.x + this.camera.offsetX);
        const offsetY = Math.floor(this.viewportHeight / 2 - this.camera.y + this.camera.offsetY);
        ctx.translate(offsetX, offsetY);

        // تمرير currentFloor إلى نظام رسم الدنجن
        this.dungeon.render(ctx, this.camera, this.viewportWidth, this.viewportHeight, this.currentFloor);
        
        // تعديل لون الإضاءة/الجسيمات حسب الطابق (Floor Theme)
        if (this.currentFloor === 1) ctx.fillStyle = 'rgba(255, 220, 180, 0.12)';      // Floor 1: إضاءة دافئة
        else if (this.currentFloor === 2) ctx.fillStyle = 'rgba(150, 255, 180, 0.15)'; // Floor 2: إضاءة أبرد
        else ctx.fillStyle = 'rgba(255, 100, 100, 0.20)';                              // Floor 3: طاقة حمراء

        for (let d of this.ambientDust) {
            ctx.beginPath();
            ctx.arc(d.x, d.y, d.size, 0, Math.PI * 2);
            ctx.fill();
        }
        
        if (this.chest) this.chest.render(ctx);
        if (this.shrine) this.shrine.render(ctx, this); // رسم المذبح
        if (this.fountain) this.fountain.render(ctx, this); // رسم النافورة في العالم
        if (this.boss) this.boss.render(ctx);
        
        for (let pickup of this.pickups) { pickup.render(ctx); }
        for (let enemy of this.enemies) {
    enemy.render(ctx);

    if (enemy.projectiles) {
        for (let arrow of enemy.projectiles) {
            arrow.render(ctx);
        }
    }
}

for (let proj of this.projectiles) {
    proj.render(ctx);
}
        
        if (this.state !== 'GAME_OVER') {
            const glow = ctx.createRadialGradient(this.player.x, this.player.y, 10, this.player.x, this.player.y, 150);
            glow.addColorStop(0, 'rgba(200, 220, 255, 0.15)');
            glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
            ctx.fillStyle = glow;
            ctx.beginPath(); ctx.arc(this.player.x, this.player.y, 150, 0, Math.PI*2); ctx.fill();
            
            this.player.render(ctx);
        }

        if (this.nearShopCache && this.state === 'PLAYING') {
            const shopRoom = this.dungeon.rooms.find(r => r.type === 'SHOP');
            if (shopRoom) {
                ctx.save();
                ctx.fillStyle = '#ffffff';
                ctx.font = 'bold 12px monospace';
                ctx.textAlign = 'center';
                ctx.shadowBlur = 5;
                ctx.shadowColor = '#000000';
                ctx.fillText('[E] TO OPEN SHOP', shopRoom.center.x * this.dungeon.tileSize, shopRoom.center.y * this.dungeon.tileSize - 35);
                ctx.restore();
            }
        }
        
        this.particles.render(ctx);
        for (let ft of this.floatingTexts) { ft.render(ctx); }

        ctx.restore();

        if (!['GAME_OVER', 'SHOP_OPEN', 'RELIC_POPUP', 'FLOOR_TRANSITION', 'VICTORY', 'SKINS_OPEN', 'SETTINGS', 'UPGRADES_OPEN', 'ACHIEVEMENTS_OPEN',  'FOUNTAIN_OPEN'].includes(this.state)) {
            this.renderMinimap(ctx);
        } 
        
        const vignette = ctx.createRadialGradient(
            this.viewportWidth/2, this.viewportHeight/2, this.viewportHeight * 0.3,
            this.viewportWidth/2, this.viewportHeight/2, this.viewportWidth * 0.7
        );
        
        // كثافة ولون الضباب حسب الطابق
        let fogColor = 'rgba(0, 0, 0, 0.85)'; // Floor 1
        if (this.currentFloor === 2) fogColor = 'rgba(5, 15, 10, 0.88)'; // Floor 2: ضباب داكن/مائل للأخضر
        else if (this.currentFloor === 3) fogColor = 'rgba(0, 0, 5, 0.95)'; // Floor 3: ضباب أسود كثيف

        vignette.addColorStop(0, 'rgba(0,0,0,0)');
        vignette.addColorStop(1, fogColor);
        ctx.fillStyle = vignette;
        ctx.fillRect(0, 0, this.viewportWidth, this.viewportHeight);

        if (this.state === 'PLAYING' && this.player.invulnTimer > 0.4) {
            ctx.fillStyle = 'rgba(255, 0, 0, 0.2)';
            ctx.fillRect(0, 0, this.viewportWidth, this.viewportHeight);
        }

        // رسم واجهة الحدث فوق اللاعب وكل التأثيرات
        if (this.shrine) {
            this.shrine.renderUI(ctx, this);
        }

        if (this.fountain) {
            this.fountain.renderUI(ctx, this);
        }
    }
}