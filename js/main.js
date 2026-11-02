import { Game } from './game.js';
import { PermanentProgression } from './permanentProgression.js';
import { SKINS } from './skins.js';
import { Player } from './player.js'; 
import { AchievementManager } from './achievementManager.js';
import { PermanentUpgradeManager } from './permanentUpgradeManager.js';

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const game = new Game();
const permProg = new PermanentProgression();
const achManager = new AchievementManager();
const upgradeManager = new PermanentUpgradeManager(); 

// Initialize UI
const permGoldUI = document.querySelector('.perm-gold-value');
const shopPermGoldUI = document.getElementById('skinsPermGoldValue');
const upgradesPermGoldUI = document.getElementById('upgradesPermGoldValue'); 

function updateGoldUI() {
    if (permGoldUI) permGoldUI.innerText = permProg.getGold();
    if (shopPermGoldUI) shopPermGoldUI.innerText = permProg.getGold();
    if (upgradesPermGoldUI) upgradesPermGoldUI.innerText = permProg.getGold();
}
updateGoldUI();

// -------------------------------------------------------------
// CUSTOM SKIN SHOP
// -------------------------------------------------------------
function renderSkinShop() {
    const container = document.getElementById('skinsCardsContainer');
    if (!container) return;
    
    container.innerHTML = '';
    updateGoldUI();

    SKINS.forEach((skin) => {
        const isUnlocked = permProg.isUnlocked(skin.id);
        const isEquipped = permProg.equippedSkin === skin.id;

        let btnHTML = '';
        let statusText = '';
        
        if (isEquipped) {
            btnHTML = `<button class="shop-btn" disabled style="color:#00ffff; border-color:#00ffff;">EQUIPPED</button>`;
        } else if (isUnlocked) {
            btnHTML = `<button class="shop-btn">EQUIP</button>`;
            statusText = `<div class="shop-item-price" style="color:#33ff55;">UNLOCKED</div>`;
        } else {
            const canAfford = permProg.getGold() >= skin.price;
            btnHTML = `<button class="shop-btn" ${canAfford ? '' : 'disabled'}>BUY [ ${skin.price} G ]</button>`;
            statusText = `<div class="shop-item-price" style="color:#ffd700;">LOCKED</div>`;
        }

        const card = document.createElement('div');
        card.className = 'shop-card';
        card.innerHTML = `
            <h2 class="shop-item-title" style="color:${skin.primary}">${skin.name}</h2>
            <canvas id="custom-skin-canvas-${skin.id}" width="80" height="80" style="margin: 16px auto; display: block;"></canvas>
            ${statusText}
            ${btnHTML}
        `;
        
        const btn = card.querySelector('button');
        if (btn && !btn.disabled) {
            btn.addEventListener('click', (e) => {
                if (!isUnlocked) {
                    if (permProg.spendGold(skin.price)) {
                        permProg.unlockSkin(skin.id);
                        if (game.audio) game.audio.play('buy');
                        renderSkinShop(); 
                    }
                } else {
                    permProg.equipSkin(skin.id);
                    if (game.player) game.player.setSkin(skin.id);
                    if (game.audio) game.audio.play('upgrade_select');
                    renderSkinShop(); 
                }
                e.currentTarget.blur();
            });
        }
        container.appendChild(card);
    });

    SKINS.forEach((skin) => {
        const cvs = document.getElementById(`custom-skin-canvas-${skin.id}`);
        if (cvs) {
            const cCtx = cvs.getContext('2d');
            cCtx.shadowBlur = 15; cCtx.shadowColor = skin.core;
            cCtx.fillStyle = skin.secondary;
            cCtx.beginPath(); cCtx.arc(40, 40, 36, 0, Math.PI * 2); cCtx.fill();
            cCtx.shadowBlur = 0;
            
            cCtx.fillStyle = '#111';
            cCtx.beginPath(); cCtx.arc(40, 40, 32, 0, Math.PI * 2); cCtx.fill();

            const dummyPlayer = new Player(40, 40);
            dummyPlayer.setSkin(skin.id);
            dummyPlayer.facing = { x: 0, y: 1 }; 
            
            cCtx.save();
            cCtx.translate(40, 40);
            cCtx.scale(1.4, 1.4);
            cCtx.translate(-40, -40);
            dummyPlayer.render(cCtx); 
            cCtx.restore();
        }
    });
}

// -------------------------------------------------------------
// Core Game Logic
// -------------------------------------------------------------
function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    game.resize(canvas.width, canvas.height);
}

window.addEventListener('resize', resize);
resize();

game.init();
renderSkinShop();

window.addEventListener('keydown', (e) => {
    if (e.code === 'KeyY' || e.code === 'y') {
        if (game.state === 'PLAYING' || achManager.isOpen) achManager.toggleUI(game);
    }
    if (e.code === 'KeyU' || e.code === 'u') {
        if (game.state === 'PLAYING' || upgradeManager.isOpen) upgradeManager.toggleUI(game, permProg);
    }
    if (e.code === 'Escape') {
        if (achManager.isOpen) achManager.toggleUI(game);
        if (upgradeManager.isOpen) upgradeManager.toggleUI(game, permProg);
    }
});

const achToggleBtn = document.getElementById('achievementsToggleBtn');
if (achToggleBtn) {
    achToggleBtn.addEventListener('click', (e) => {
        if (game.state === 'PLAYING' || achManager.isOpen) achManager.toggleUI(game);
        e.target.blur();
    });
}

const upgradesToggleBtn = document.getElementById('upgradesToggleBtn');
if (upgradesToggleBtn) {
    upgradesToggleBtn.addEventListener('click', (e) => {
        if (game.state === 'PLAYING' || upgradeManager.isOpen) upgradeManager.toggleUI(game, permProg);
        e.target.blur();
    });
}

let lastTime = 0;
let goldSavedThisRun = false;
let lastRunStartTimeForUpgrades = 0; 

// Main Menu
const mainMenu = document.getElementById('mainMenu');
const startRunBtn = document.getElementById('startRunBtn');

function startRunFromMenu() {
    if (!mainMenu) return;

    mainMenu.style.display = 'none';
    goldSavedThisRun = false;
    lastRunStartTimeForUpgrades = 0;

    // تشغيل موسيقى الطابق الأول فعلياً بمجرد بدء الرن من القائمة الرئيسية
    if (game.audio && game.audio.playBGM) {
        game.audio.playBGM('floor1_ost');
    }
}

    let isPaused = false;

const pauseMenu = document.getElementById('pauseMenu');

function openPauseMenu() {
    if (!pauseMenu || !game.player) return;
    if (game.state !== 'PLAYING') return;

    isPaused = true;
    pauseMenu.classList.remove('hidden');
    pauseMenu.style.display = 'flex';
}

function closePauseMenu() {
    if (!pauseMenu) return;

    isPaused = false;
    pauseMenu.classList.add('hidden');
    pauseMenu.style.display = 'none';
}

    const pauseSkinsBtn = document.getElementById('pauseSkinsBtn');

if (pauseSkinsBtn) {
    pauseSkinsBtn.addEventListener('click', () => {
        game.openSkins();
        pauseSkinsBtn.blur();
    });
}

    const pauseUpgradesBtn = document.getElementById('pauseUpgradesBtn');

if (pauseUpgradesBtn) {
    pauseUpgradesBtn.addEventListener('click', () => {
        upgradeManager.toggleUI(game, permProg);
        pauseUpgradesBtn.blur();
    });
}

    const pauseSettingsBtn = document.getElementById('pauseSettingsBtn');

if (pauseSettingsBtn) {
    pauseSettingsBtn.addEventListener('click', () => {
        game.openSettings();
        pauseSettingsBtn.blur();
    });
}

const resumeBtn = document.getElementById('resumeBtn');

if (resumeBtn) {
    resumeBtn.addEventListener('click', () => {
        closePauseMenu();
        resumeBtn.blur();
    });
}

    const quitToMenuBtn = document.getElementById('quitToMenuBtn');

if (quitToMenuBtn) {
    quitToMenuBtn.addEventListener('click', () => {
        closePauseMenu();

        if (mainMenu) {
            mainMenu.style.display = 'flex';
        }

        quitToMenuBtn.blur();
    });
}

if (startRunBtn) {
    startRunBtn.addEventListener('click', startRunFromMenu);
}

const menuSkinsBtn = document.getElementById('menuSkinsBtn');

if (menuSkinsBtn) {
    menuSkinsBtn.addEventListener('click', () => {
        startRunFromMenu();
        game.openSkins();
        menuSkinsBtn.blur();
    });
}

const menuAchievementsBtn = document.getElementById('menuAchievementsBtn');

if (menuAchievementsBtn) {
    menuAchievementsBtn.addEventListener('click', () => {
        startRunFromMenu();
        achManager.toggleUI(game);
        menuAchievementsBtn.blur();
    });
}

const menuUpgradesBtn = document.getElementById('menuUpgradesBtn');

if (menuUpgradesBtn) {
    menuUpgradesBtn.addEventListener('click', () => {
        startRunFromMenu();
        upgradeManager.toggleUI(game, permProg);
        menuUpgradesBtn.blur();
    });
}

const menuSettingsBtn = document.getElementById('menuSettingsBtn');

if (menuSettingsBtn) {
    menuSettingsBtn.addEventListener('click', () => {
        startRunFromMenu();
        game.openSettings();
        menuSettingsBtn.blur();
    });
}

// --- ربط أزرار RUN HISTORY ---
const menuRunHistoryBtn = document.getElementById('menuRunHistoryBtn');
if (menuRunHistoryBtn) {
    menuRunHistoryBtn.addEventListener('click', () => {
        // إخفاء القائمة الرئيسية دون استدعاء startRunFromMenu (أي بدون بدء اللعبة)
        if (mainMenu) mainMenu.style.display = 'none'; 
        game.openRunHistory(true); // true = تم الفتح من القائمة الرئيسية
        menuRunHistoryBtn.blur();
    });
}

const pauseRunHistoryBtn = document.getElementById('pauseRunHistoryBtn');
if (pauseRunHistoryBtn) {
    pauseRunHistoryBtn.addEventListener('click', () => {
        game.openRunHistory(false); // false = تم الفتح من الـ Pause
        pauseRunHistoryBtn.blur();
    });
}

const historyBackBtn = document.getElementById('historyBackBtn');
if (historyBackBtn) {
    historyBackBtn.addEventListener('click', () => {
        game.closeRunHistory(); // دالة الإغلاق ستتكفل بالباقي
        historyBackBtn.blur();
    });
}

const historyClearBtn = document.getElementById('historyClearBtn');
if (historyClearBtn) {
    historyClearBtn.addEventListener('click', () => {
        // تفريغ سجل الرن فقط، دون المساس بالذهب الدائم أو الإنجازات
        if (game.progression) {
            game.progression.runHistory = [];
            game.progression.save(); // حفظ التغيير (تفریغ الـ array) في localStorage
            game.populateRunHistoryUI(); // إعادة رسم الشاشة كفارغة
        }
        historyClearBtn.blur();
    });
}

window.addEventListener('keydown', (e) => {
    // Main Menu: only Enter is allowed
    if (mainMenu && mainMenu.style.display !== 'none') {
        if (e.code === 'Enter') {
            e.preventDefault();
            startRunFromMenu();
        }
        return;
    }

    // Gameplay / Pause
    if (e.code === 'Escape') {
        e.preventDefault();

        if (isPaused) {
            closePauseMenu();
        } else {
            openPauseMenu();
        }
    }
});

function gameLoop(timestamp) {
    let dt = (timestamp - lastTime) / 1000;
    if (dt > 0.1) dt = 0.1;
    lastTime = timestamp;

    if (
    mainMenu &&
    mainMenu.style.display !== 'none'
) {
    // Main Menu is open — keep gameplay frozen
} else if (!isPaused && game.state !== 'ACHIEVEMENTS_OPEN' && game.state !== 'UPGRADES_OPEN') {
    game.update(dt);
}
    game.render(ctx);

    if (game.player && game.player.skin && game.player.skin.id !== permProg.equippedSkin) {
        game.player.setSkin(permProg.equippedSkin);
    }

    try {
        // --- تطبيق الترقيات الدائمة بشكل آمن ومحمي من NaN ---
        if (game.runStats && game.runStats.startTime !== lastRunStartTimeForUpgrades) {
            lastRunStartTimeForUpgrades = game.runStats.startTime;

            if (game.player && typeof game.player.speed === 'number' && typeof game.player.maxHp === 'number') {
                const vit = Number(upgradeManager?.levels?.VITALITY) || 0;
                const pow = Number(upgradeManager?.levels?.POWER) || 0;
                const swi = Number(upgradeManager?.levels?.SWIFTNESS) || 0;
                const fort = Number(upgradeManager?.levels?.FORTUNE) || 0;

                game.player.maxHp += (vit * 10);
                game.player.hp = game.player.maxHp;
                game.player.damageMultiplier += (pow * 0.05);
                game.player.speed *= (1 + (swi * 0.05));
                game.player.goldMultiplier = 1.0 + (fort * 0.05);
                
                if (typeof game.updateHUD === 'function') game.updateHUD();
                console.log('[Upgrades] Permanent Upgrades Applied safely for this run.');
            }
        }
        // -----------------------------------------------------------

        if (game.state === 'PLAYING' || (!goldSavedThisRun && (game.state === 'GAME_OVER' || game.state === 'VICTORY'))) {
            achManager.check(game, permProg);
        }

        if (game.state === 'PLAYING') {
            goldSavedThisRun = false;
        } 
        else if ((game.state === 'GAME_OVER' || game.state === 'VICTORY') && !goldSavedThisRun) {
            let currentRunGold = 0;
            if (game.player && typeof game.player.gold === 'number') {
                currentRunGold = game.player.gold;
            }

            if (currentRunGold > 0) {
                permProg.addGold(currentRunGold);
                console.log(`[Progression] Transferred ${currentRunGold} Gold. Total Permanent Gold: ${permProg.getGold()}`);
                
                updateGoldUI();
                renderSkinShop();
                if(upgradeManager.isOpen) upgradeManager.renderUI(permProg, game);
            }

            achManager.commitRun(game);
            console.log(`[AchievementManager] Committed Run Stats to Lifetime.`);

            goldSavedThisRun = true;
        }
    } catch (error) {
        console.warn('[Progression/Observer] Error in observer hook:', error);
    }

    requestAnimationFrame(gameLoop);
}

requestAnimationFrame(gameLoop);