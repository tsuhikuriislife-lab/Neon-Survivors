export class AudioManager {
    constructor() {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        this.buffers = {}; 
        this.throttleTimers = {}; 
        this.bgmNode = null;
        this.currentMusicKey = null;
        
        // Metrics requested: volume, pitch, speed
        this.bgmVolume = 0.5;
        this.sfxVolume = 0.5;
        this.bgmMuted = false;
        this.sfxMuted = false;
        
        this.sounds = {
            'enemy_dash': 'assets/sfc/enemy/firing/dash/alexzavesa-swoosh-4-463609.mp3',
            'enemy_projectile': 'assets/sfc/enemy/firing/proyectile/freesound-community-strza-67506_XFjcMjme.mp3',
            'enemy_aoe': 'assets/sfc/enemy/firing/areaeffect/freesound_community-retro-game-sfx-explosion-104422.mp3',
            'enemy_death_medium': 'assets/sfc/enemy/death/mediumEnemy/u_b32baquv5u-8-bit-explosion-3-340456.mp3',
            'enemy_death_big': 'assets/sfc/enemy/death/bigEnemy/u_b32baquv5u-explosion-9-340460.mp3',
            'enemy_death_small': 'assets/sfc/enemy/death/smallEnemy/u_b32baquv5u-8-bit-explosion-10-340462.mp3',
            'enemy_death_boss': 'assets/sfc/enemy/death/boss/freesound_community-sci-fi_explosion_1-42890.mp3',
            
            'hit_satellite': 'assets/sfc/hit/satellite/daviddumaisaudio-sci-fi-weapon-laser-shot-04-316416.mp3',
            'hit_nova': 'assets/sfc/hit/nova/universfield-sci-fi-blaster-shot-229313.mp3',
            'hit_main_gun': 'assets/sfc/hit/main gun/daviddumaisaudio-sci-fi-weapon-shot-02-316412.mp3',
            'hit_missile': 'assets/sfc/hit/missile/daviddumaisaudio-sci-fi-explosion-09-190268.mp3',
            
            'fire_nova': 'assets/sfc/firing/nova/rescopicsound-sci-fi-weapon-shoot-firing-pulse-tm-05-233825.mp3',
            'fire_main_gun': 'assets/sfc/firing/main gun/rescopicsound-sci-fi-weapon-shoot-firing-plasma-ku-01-233816.mp3',
            'fire_missile': 'assets/sfc/firing/missile/daviddumaisaudio-sci-fi-weapon-single-shot-bass-heavy-02-316418.mp3',
            'fire_shockwave': 'assets/sfc/firing/shockwave/black_kumizhi-cyberpunk-bass-impact-effect-479138.mp3',
            'fire_laser_cannon': 'assets/sfc/firing/laser canon/snoops-audio-08-weaponry-ultra-heavy-cannon-b-343781_qfxIjBYq.mp3',
            
            'charge_laser_cannon': 'assets/sfc/charging/laser cannon/freesound_community-power-charge-6798.mp3',
            'hit_laser_cannon': 'assets/sfc/hit/laser canon/freesound_community-hurt_c_08-102842.mp3',
            'hurt_player': 'assets/sfc/player/hurt/driken5482-retro-hurt-2-236675.mp3',
            
            'level_up': 'assets/sfc/levelUp/universfield-level-up-191997.mp3',
            'jackpot': 'assets/sfc/jackpot/vadim_makes_sound-retro-arcade-level-up-552982.mp3',
            
            'ui_click': 'assets/sfc/ui/click/creatorshome-video-game-select-337214.mp3',
            'ui_hover': 'assets/sfc/ui/hover/u_iozlfd2w96-bubble-pop-283674.mp3',
            'pickup_gem': 'assets/sfc/pickups/gems/lumora_studios-video-game-coin-pickup-sfx-319169.mp3',
            
            'music_main': 'assets/music/mainGame/soundcarousel-shadowy-figure-116963.mp3',
            'music_boss_amalgam': 'assets/music/boss/Amalgam/the_mountain-background-techno-133101.mp3',
            'music_boss_devourer': 'assets/music/boss/Devourer of Tax/psychronic-circuit-madness-433847.mp3',
            'music_boss_kyren': 'assets/music/boss/Kyren/sonican-cyber-chunk-loop-481849.mp3'
        };
    }
    
    async init() {
        for (const [key, path] of Object.entries(this.sounds)) {
            try {
                const response = await fetch(path);
                const arrayBuffer = await response.arrayBuffer();
                const audioBuffer = await this.ctx.decodeAudioData(arrayBuffer);
                this.buffers[key] = audioBuffer;
            } catch (err) {
                console.error(`Error loading audio ${key}: ${path}`, err);
            }
        }
    }
    
    playSound(key, { volume = 1.0, pitch = 1.0, randomPitch = true, speed = 1.0, throttleMs = 50, loop = false, offset = 0 } = {}) {
        if (!this.buffers[key]) return null;
        
        if (throttleMs > 0) {
            const now = performance.now();
            if (this.throttleTimers[key] && now - this.throttleTimers[key] < throttleMs) {
                return null;
            }
            this.throttleTimers[key] = now;
        }

        const source = this.ctx.createBufferSource();
        source.buffer = this.buffers[key];
        
        let finalPitch = pitch;
        if (randomPitch) {
             finalPitch *= (0.9 + Math.random() * 0.2); 
        }
        
        // Detune modifies pitch
        const detuneCents = Math.log2(finalPitch) * 1200;
        source.detune.value = detuneCents;
        
        // Playback rate modifies speed
        source.playbackRate.value = speed;
        source.loop = loop;

        const isMusic = key.startsWith('music_');
        const multiplier = isMusic ? 
            (this.bgmMuted ? 0 : this.bgmVolume) : 
            (this.sfxMuted ? 0 : this.sfxVolume);
            
        if (multiplier === 0 && !isMusic) return null; // Optimization for SFX

        const gainNode = this.ctx.createGain();
        gainNode.gain.value = volume * multiplier;
        
        source.connect(gainNode);
        gainNode.connect(this.ctx.destination);
        source.start(0, offset);
        
        return { source, gainNode };
    }
    
    playMusic(key, volume = 0.4) {
        if (this.currentMusicKey === key && this.bgmNode !== null) return;
        
        if (this.bgmNode) {
            this.bgmNode.source.stop();
            this.bgmNode = null;
        }
        
        if (!key) {
            this.currentMusicKey = null;
            return;
        }
        
        this.bgmNode = this.playSound(key, { volume: this.isMuffled ? volume * 0.2 : volume, pitch: 1.0, randomPitch: false, throttleMs: 0, loop: true });
        
        if (this.bgmNode) {
            this.currentMusicKey = key;
            this.currentMusicVolume = volume;
        } else {
            this.currentMusicKey = null;
        }
    }

    setMusicMuffled(muffled) {
        this.isMuffled = muffled;
        this.updateMusicVolume();
    }

    updateMusicVolume() {
        if (this.bgmNode && this.bgmNode.gainNode) {
            const baseVol = this.isMuffled ? this.currentMusicVolume * 0.2 : this.currentMusicVolume;
            const multiplier = this.bgmMuted ? 0 : this.bgmVolume;
            this.bgmNode.gainNode.gain.setTargetAtTime(baseVol * multiplier, this.ctx.currentTime, 0.1);
        }
    }

    setBgmVolume(val) {
        this.bgmVolume = val;
        this.updateMusicVolume();
    }

    setSfxVolume(val) {
        this.sfxVolume = val;
    }

    setBgmMuted(muted) {
        this.bgmMuted = muted;
        this.updateMusicVolume();
    }

    setSfxMuted(muted) {
        this.sfxMuted = muted;
    }

    suspendAudio() {
        if (this.ctx && this.ctx.state === 'running') {
            this.ctx.suspend().catch(() => {});
        }
    }

    resumeAudioContext() {
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume().catch(() => {});
        }
    }
}

export const audioManager = new AudioManager();
