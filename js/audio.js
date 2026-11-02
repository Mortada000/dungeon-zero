export class AudioManager {
    constructor() {
        this.ctx = null;
        this.initialized = false;                       
        this.isMuted = false;
        this.globalVolume = 0.6; // الافتراضي 60%
        
        this.masterGain = null;
        this.sfxGain = null;
        this.currentMusicSource = null; // متتبع الموسيقى الحالية
        
        this.pendingMusic = null; // تخزين طلب الموسيقى الصريح
        this.initializing = false; // حماية لمنع التهيئة المزدوجة

        const unlock = async () => {
            if (this.initialized || this.initializing) return;
            
            this.initializing = true;

            try {
                const AudioContext = window.AudioContext || window.webkitAudioContext;
                this.ctx = new AudioContext();
                
                if (this.ctx.state === 'suspended') this.ctx.resume();
                
                await this.preloadSounds();

                this.masterGain = this.ctx.createGain();
                this.sfxGain = this.ctx.createGain();

                this.sfxGain.connect(this.masterGain);
                this.masterGain.connect(this.ctx.destination);
                
                this.masterGain.gain.value = this.isMuted ? 0 : this.globalVolume;

                this.initialized = true;

                // استدعاء التشغيل وإعطاء دالة playBGM مسؤولية مسح الطلب أو التعامل مع الفشل
                if (this.pendingMusic) {
                    this.playBGM(this.pendingMusic);
                }

                window.removeEventListener('keydown', unlock);
                window.removeEventListener('click', unlock);
            } catch (error) {
                console.error('[Audio] Unlock failed:', error);
            } finally {
                // ضمان إرجاع الحالة دائمًا حتى لو فشلت التهيئة أو التحميل
                this.initializing = false;
            }
        };
        window.addEventListener('keydown', unlock);
        window.addEventListener('click', unlock);
        
        // --- نظام ملفات الصوت الحقيقية (Cache & Paths) ---
        this.buffers = {};
        this.sfxPaths = {
            'attack': 'assets/audio/sfx/attack.wav',
            'boss_hit': 'assets/audio/sfx/boss_hit.wav',
            'chest_open': 'assets/audio/sfx/chest_open.wav',
            'hit_enemy': 'assets/audio/sfx/hit_enemy.wav', // <--- إضافة هذا السطر فقط
            'hit_player': 'assets/audio/sfx/hit_player.wav',
            'enemy_death': 'assets/audio/sfx/enemy_death.wav',
            'boss_charge': 'assets/audio/sfx/boss_charge.wav',
            'boss_slam': 'assets/audio/sfx/boss_slam.wav',
            'boss_shockwave': 'assets/audio/sfx/boss_shockwave.wav',   
            'boss_burst': 'assets/audio/sfx/boss_burst.wav', 
            'boss_breath': 'assets/audio/sfx/boss_breath.wav',
            'gold': 'assets/audio/sfx/gold.wav',    
            'health': 'assets/audio/sfx/health.wav',
            'relic': 'assets/audio/sfx/relic.wav',
            'level_up': 'assets/audio/sfx/level_up.wav',
            'upgrade_select': 'assets/audio/sfx/upgrade_select.wav',
            'buy': 'assets/audio/sfx/buy.wav',
            'boss_ost': 'assets/audio/music/boss_ost.wav',
            'floor_clear': 'assets/audio/sfx/floor_clear.wav',
            'game_over': 'assets/audio/sfx/game_over.wav',
            'floor1_ost': 'assets/audio/music/floor1_ost.wav',
            'arcane_bolt': 'assets/audio/sfx/arcane_bolt.wav',
            'blood_scythe': 'assets/audio/sfx/blood_scythe.wav',
            'frost_nova': 'assets/audio/sfx/frost_nova.wav',
        };
    }

    toggleMute() {
        this.isMuted = !this.isMuted;
        if (this.initialized && this.masterGain) {
            this.masterGain.gain.setTargetAtTime(this.isMuted ? 0 : this.globalVolume, this.ctx.currentTime, 0.1);
        }
        return this.isMuted;
    }

    setVolume(volume) {
        // حجم الصوت من 0.0 إلى 1.0
        this.globalVolume = Math.max(0, Math.min(1, volume));
        if (this.initialized && this.masterGain && !this.isMuted) {
            this.masterGain.gain.setTargetAtTime(this.globalVolume, this.ctx.currentTime, 0.1);
        }
    }

    async preloadSounds() {
        const promises = [];

        for (let [id, path] of Object.entries(this.sfxPaths)) {
            promises.push(this.loadSound(id, path));
        }

        await Promise.all(promises);
    }

    async loadSound(id, url) {
        try {
            const response = await fetch(url);
            const arrayBuffer = await response.arrayBuffer();
            if (this.ctx) {
                const audioBuffer = await this.ctx.decodeAudioData(arrayBuffer);
                this.buffers[id] = audioBuffer;
            }
        } catch (error) {
            console.warn(`[Audio] Failed to load ${url}. Fallback to Oscillator for: ${id}`);
        }
    }

    stopMusic() {
        this.pendingMusic = null; // مسح أي طلب موسيقى معلق لتجنب تشغيله لاحقًا بالخطأ

        if (this.currentMusicSource) {
            try {
                this.currentMusicSource.stop();
            } catch (e) {
                // تجاهل الخطأ إذا كانت متوقفة بالفعل
            }
            this.currentMusicSource.disconnect();
            this.currentMusicSource = null;
        }
    }

    playBGM(type) {
        // 1. إذا لم يكن الصوت مهيأ بعد، احفظ الطلب للتشغيل لاحقًا
        if (!this.initialized || !this.ctx) {
            this.pendingMusic = type;
            return;
        }

        // 2. إذا اكتملت التهيئة لكن ملف الصوت مفقود أو فشل تحميله
        if (!this.buffers[type]) {
            console.warn(`[Audio] Cannot play BGM '${type}': Buffer not found or failed to load.`);
            if (this.pendingMusic === type) this.pendingMusic = null; // إلغاء الطلب كي لا يضيع بصمت أو يعلق
            return;
        }

        if (this.isMuted || this.globalVolume <= 0) {
            this.pendingMusic = null; // إلغاء الطلب المعلق لأن اللاعب وضع كتم للصوت
            return;
        }
        
        if (this.ctx.state === 'suspended') this.ctx.resume();

        this.stopMusic();

        const source = this.ctx.createBufferSource();
        source.buffer = this.buffers[type];
        source.loop = true; 
        
        const gainNode = this.ctx.createGain();
        gainNode.gain.value = (this.globalVolume || 1) * (type === 'boss_ost' ? 0.4 : 0.7);            
        source.connect(gainNode);
        gainNode.connect(this.masterGain);
        
        source.start(0);
        this.currentMusicSource = source;
        
        // مسح الطلب بعد أن تم تشغيل الموسيقى بنجاح
        this.pendingMusic = null; 
    }

    play(type) {
        // تأكد من أن الصوت يعمل فقط إذا لم يكن مكتوماً أو مستوى الصوت أعلى من 0
        if (!this.initialized || !this.ctx || this.isMuted || this.globalVolume <= 0) return;
        if (this.ctx.state === 'suspended') this.ctx.resume();

        // 1. محاولة تشغيل الملف الصوتي الحقيقي إذا تم تحميله بنجاح
        if (this.buffers[type]) {
            const source = this.ctx.createBufferSource();
            source.buffer = this.buffers[type];
            
            const gainNode = this.ctx.createGain();
            gainNode.gain.value = this.globalVolume || 1; // تطبيق مستوى الصوت العام
            
            source.connect(gainNode);
            gainNode.connect(this.sfxGain);
            
            source.start(0);
            return; // إنهاء الدالة هنا حتى لا يعمل الـ Oscillator
        }

        // 2. نظام الـ Oscillator الحالي يعمل كـ Fallback
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const now = this.ctx.currentTime;
        
        osc.connect(gain);
        gain.connect(this.sfxGain);

        switch (type) {
            case 'attack':
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(400, now);
                osc.frequency.exponentialRampToValueAtTime(50, now + 0.1);
                gain.gain.setValueAtTime(0.3, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
                osc.start(now);
                osc.stop(now + 0.1);
                break;
            case 'hit_enemy':
                osc.type = 'square';
                osc.frequency.setValueAtTime(150, now);
                osc.frequency.exponentialRampToValueAtTime(40, now + 0.1);
                gain.gain.setValueAtTime(0.2, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
                osc.start(now);
                osc.stop(now + 0.1);
                break;
            case 'hit_player':
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(100, now);
                osc.frequency.exponentialRampToValueAtTime(20, now + 0.2);
                gain.gain.setValueAtTime(0.5, now);
                gain.gain.linearRampToValueAtTime(0.01, now + 0.2);
                osc.start(now);
                osc.stop(now + 0.2);
                break;
            case 'enemy_death':
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(100, now);
                osc.frequency.exponentialRampToValueAtTime(10, now + 0.3);
                gain.gain.setValueAtTime(0.3, now);
                gain.gain.linearRampToValueAtTime(0.01, now + 0.3);
                osc.start(now);
                osc.stop(now + 0.3);
                break;
            case 'gold':
                osc.type = 'sine';
                osc.frequency.setValueAtTime(1200, now);
                osc.frequency.exponentialRampToValueAtTime(1800, now + 0.1);
                gain.gain.setValueAtTime(0.1, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
                osc.start(now);
                osc.stop(now + 0.3);
                break;
            case 'health':
                osc.type = 'sine';
                osc.frequency.setValueAtTime(600, now);
                osc.frequency.linearRampToValueAtTime(800, now + 0.2);
                gain.gain.setValueAtTime(0.2, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
                osc.start(now);
                osc.stop(now + 0.4);
                break;
            case 'chest_open':
                osc.type = 'sine';
                osc.frequency.setValueAtTime(400, now);
                osc.frequency.setValueAtTime(600, now + 0.1);
                osc.frequency.setValueAtTime(800, now + 0.2);
                gain.gain.setValueAtTime(0, now);
                gain.gain.linearRampToValueAtTime(0.3, now + 0.1);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
                osc.start(now);
                osc.stop(now + 0.5);
                break;
            case 'level_up':
                osc.type = 'square';
                osc.frequency.setValueAtTime(440, now);
                osc.frequency.setValueAtTime(554, now + 0.15);
                osc.frequency.setValueAtTime(659, now + 0.3);
                osc.frequency.setValueAtTime(880, now + 0.45);
                gain.gain.setValueAtTime(0.3, now);
                gain.gain.linearRampToValueAtTime(0.01, now + 1.0);
                osc.start(now);
                osc.stop(now + 1.0);
                break;
            case 'upgrade_select':
            case 'buy':
            case 'relic':
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(600, now);
                osc.frequency.setValueAtTime(900, now + 0.1);
                gain.gain.setValueAtTime(0.4, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
                osc.start(now);
                osc.stop(now + 0.3);
                break;
            case 'boss_start':
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(100, now);
                osc.frequency.linearRampToValueAtTime(50, now + 1.5);
                gain.gain.setValueAtTime(0.6, now);
                gain.gain.linearRampToValueAtTime(0.01, now + 1.5);
                osc.start(now);
                osc.stop(now + 1.5);
                break;
            case 'boss_hit':
                osc.type = 'square';
                osc.frequency.setValueAtTime(80, now);
                osc.frequency.linearRampToValueAtTime(30, now + 0.2);
                gain.gain.setValueAtTime(0.6, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
                osc.start(now);
                osc.stop(now + 0.2);
                break;
            case 'boss_charge':
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(50, now);
                osc.frequency.exponentialRampToValueAtTime(200, now + 0.8);
                gain.gain.setValueAtTime(0.2, now);
                gain.gain.linearRampToValueAtTime(0.5, now + 0.8);
                osc.start(now);
                osc.stop(now + 0.8);
                break;
            case 'boss_shockwave':
            case 'boss_slam':
                osc.type = 'square';
                osc.frequency.setValueAtTime(30, now);
                osc.frequency.exponentialRampToValueAtTime(10, now + 0.5); 
                gain.gain.setValueAtTime(1.0, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
                osc.start(now);
                osc.stop(now + 0.5);
                break;
            case 'boss_burst':
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(400, now);
                osc.frequency.setValueAtTime(600, now + 0.1);
                osc.frequency.setValueAtTime(800, now + 0.2);
                gain.gain.setValueAtTime(0.4, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
                osc.start(now);
                osc.stop(now + 0.4);
                break;
            case 'boss_breath':
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(100, now);
                osc.frequency.linearRampToValueAtTime(800, now + 1.0);
                gain.gain.setValueAtTime(0.1, now);
                gain.gain.linearRampToValueAtTime(0.5, now + 0.5);
                gain.gain.linearRampToValueAtTime(0.01, now + 1.0);
                osc.start(now);
                osc.stop(now + 1.0);
                break;
            case 'floor_clear':
                osc.type = 'square';
                osc.frequency.setValueAtTime(440, now);
                osc.frequency.setValueAtTime(554, now + 0.2);
                osc.frequency.setValueAtTime(659, now + 0.4);
                gain.gain.setValueAtTime(0.4, now);
                gain.gain.linearRampToValueAtTime(0.01, now + 1.5);
                osc.start(now);
                osc.stop(now + 1.5);
                break;
            case 'game_over':
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(200, now);
                osc.frequency.linearRampToValueAtTime(50, now + 2.0);
                gain.gain.setValueAtTime(0.5, now);
                gain.gain.linearRampToValueAtTime(0.01, now + 2.0);
                osc.start(now);
                osc.stop(now + 2.0);
                break;
        }
    }
}
    