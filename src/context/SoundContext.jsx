// src/context/SoundContext.jsx
import { createContext, useContext, useRef, useCallback, useEffect } from 'react';

// ── Asset imports ──────────────────────────────────────────────────────────
import music1 from '../assets/sounds/music1.mp3';
import music2 from '../assets/sounds/music3.mp3';
import music3 from '../assets/sounds/music4.mp3';
import music4 from '../assets/sounds/music5.mp3';
import music5 from '../assets/sounds/music6.mp3';


import sfxAttackFile  from '../assets/sounds/attack.mp3';
import sfxDefendFile  from '../assets/sounds/defend.mp3';
import sfxSpecialFile from '../assets/sounds/special.mp3';

const BGM_FILES = [music1, music2, music3, music4, music5];

const SoundContext = createContext(null);

// ── AudioContext singleton (for synth sfx) ─────────────────────────────────
let _ac     = null;
let _master = null;

const getAC = () => {
  if (!_ac) _ac = new (window.AudioContext || window.webkitAudioContext)();
  return _ac;
};

const getMaster = () => {
  const ac = getAC();
  if (!_master) {
    _master = ac.createGain();
    _master.gain.value = 1.60;
    _master.connect(ac.destination);
  }
  return _master;
};

// ── Synth utilities ────────────────────────────────────────────────────────
function playTone(freq, type, startTime, duration, gainVal, ac, dest) {
  const osc = ac.createOscillator();
  const g   = ac.createGain();
  osc.type            = type;
  osc.frequency.value = freq;
  g.gain.setValueAtTime(gainVal, startTime);
  g.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
  osc.connect(g);
  g.connect(dest);
  osc.start(startTime);
  osc.stop(startTime + duration + 0.05);
}

function playNoise(startTime, duration, gainVal, ac, dest) {
  const bufSize = ac.sampleRate * duration;
  const buf     = ac.createBuffer(1, bufSize, ac.sampleRate);
  const data    = buf.getChannelData(0);
  for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;
  const src = ac.createBufferSource();
  const g   = ac.createGain();
  src.buffer = buf;
  g.gain.setValueAtTime(gainVal, startTime);
  g.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
  src.connect(g);
  g.connect(dest);
  src.start(startTime);
  src.stop(startTime + duration + 0.05);
}

// ── Audio clip player (for real sfx files) ─────────────────────────────────
function playClip(src, volume = 0.55) {
  const audio = new Audio(src);
  audio.volume = volume;
  audio.play().catch(() => {});
}

// ╔══════════════════════════════════════════════════════════════════════════╗
// ║                        SOUND EFFECT LIBRARY                             ║
// ╚══════════════════════════════════════════════════════════════════════════╝

function sfxAttackHit()  { playClip(sfxAttackFile,  1.0); }
function sfxDefendHit()  { playClip(sfxDefendFile,  1.0);  }
function sfxSpecialHit() { playClip(sfxSpecialFile, 1.0);  }

function sfxHover() {
  const ac = getAC(); const dest = getMaster(); const t = ac.currentTime;
  playTone(880, 'sine', t, 0.07, 0.07, ac, dest);
}

function sfxPlayerPick() {
  const ac = getAC(); const dest = getMaster(); const t = ac.currentTime;
  playTone(440, 'square', t,        0.08, 0.16, ac, dest);
  playTone(660, 'square', t + 0.09, 0.08, 0.16, ac, dest);
  playTone(880, 'square', t + 0.18, 0.13, 0.20, ac, dest);
}

function sfxCpuPick() {
  const ac = getAC(); const dest = getMaster(); const t = ac.currentTime;
  playTone(220, 'sawtooth', t,        0.09, 0.13, ac, dest);
  playTone(165, 'sawtooth', t + 0.10, 0.11, 0.13, ac, dest);
}

function sfxDraftComplete() {
  const ac  = getAC(); const dest = getMaster(); const t = ac.currentTime;
  const seq = [523, 659, 784, 1047];
  seq.forEach((f, i) => playTone(f, 'square', t + i * 0.13, 0.20, 0.18, ac, dest));
  playTone(2093, 'sine', t + 0.58, 0.32, 0.10, ac, dest);
}

function sfxMoveSelect() {
  const ac = getAC(); const dest = getMaster(); const t = ac.currentTime;
  playTone(300, 'square', t,        0.05, 0.18, ac, dest);
  playTone(450, 'square', t + 0.06, 0.05, 0.15, ac, dest);
}

function sfxDiceRoll() {
  const ac = getAC(); const dest = getMaster(); const t = ac.currentTime;
  for (let i = 0; i < 7; i++) {
    const freq = 180 + Math.random() * 320;
    playTone(freq, 'square', t + i * 0.052, 0.04, 0.09, ac, dest);
  }
}

function sfxHitGeneric(isCritical = false) {
  const ac = getAC(); const dest = getMaster(); const t = ac.currentTime;
  playNoise(t, 0.11, isCritical ? 0.32 : 0.20, ac, dest);
  playTone(isCritical ? 80 : 110, 'sine', t, 0.17, 0.28, ac, dest);
  if (isCritical) playTone(380, 'sawtooth', t + 0.05, 0.09, 0.18, ac, dest);
}

function sfxClash() {
  const ac = getAC(); const dest = getMaster(); const t = ac.currentTime;
  playTone(300, 'sawtooth', t,        0.06, 0.14, ac, dest);
  playTone(283, 'sawtooth', t + 0.05, 0.06, 0.14, ac, dest);
  playNoise(t + 0.03, 0.08, 0.11, ac, dest);
}

function sfxKO() {
  const ac = getAC(); const dest = getMaster(); const t = ac.currentTime;
  playNoise(t,        0.14, 0.38, ac, dest);
  playTone(150, 'sine', t,        0.28, 0.32, ac, dest);
  playTone(80,  'sine', t + 0.14, 0.38, 0.32, ac, dest);
  playTone(60,  'sine', t + 0.40, 0.28, 0.16, ac, dest);
}

function sfxVictory() {
  const ac = getAC(); const dest = getMaster(); const t = ac.currentTime;
  const melody  = [523, 659, 784, 659, 1047, 784, 1047, 1319];
  const harmony = [330, 415, 494, 415,  659, 494,  659,  831];
  melody.forEach((f, i)  => playTone(f, 'square', t + i * 0.11, 0.17, 0.17, ac, dest));
  harmony.forEach((f, i) => playTone(f, 'sine',   t + i * 0.11, 0.17, 0.09, ac, dest));
}

function sfxDefeat() {
  const ac  = getAC(); const dest = getMaster(); const t = ac.currentTime;
  const seq = [392, 330, 277, 220];
  seq.forEach((f, i) => playTone(f, 'sawtooth', t + i * 0.18, 0.27, 0.16, ac, dest));
  playTone(110, 'sine', t + 0.75, 0.48, 0.18, ac, dest);
}

function sfxEnterDraft() {
  const ac = getAC(); const dest = getMaster(); const t = ac.currentTime;
  playTone(330, 'square', t,        0.06, 0.18, ac, dest);
  playTone(494, 'square', t + 0.07, 0.06, 0.18, ac, dest);
  playTone(659, 'square', t + 0.14, 0.09, 0.22, ac, dest);
  playNoise(t + 0.20, 0.05, 0.09, ac, dest);
}

function sfxKanjiPop() {
  const ac = getAC(); const dest = getMaster(); const t = ac.currentTime;
  playTone(1200 + Math.random() * 400, 'sine', t,        0.06, 0.10, ac, dest);
  playTone(900  + Math.random() * 300, 'sine', t + 0.05, 0.07, 0.07, ac, dest);
}

function sfxNewFighter() {
  const ac  = getAC(); const t = ac.currentTime;
  const osc = ac.createOscillator();
  const g   = ac.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(200, t);
  osc.frequency.exponentialRampToValueAtTime(800, t + 0.35);
  g.gain.setValueAtTime(0.18, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.38);
  osc.connect(g);
  g.connect(getMaster());
  osc.start(t);
  osc.stop(t + 0.4);
}

function sfxAdvantage() {
  const ac = getAC(); const dest = getMaster(); const t = ac.currentTime;
  playTone(660, 'square', t,        0.07, 0.14, ac, dest);
  playTone(880, 'square', t + 0.08, 0.09, 0.16, ac, dest);
}

// ╔══════════════════════════════════════════════════════════════════════════╗
// ║                        BACKGROUND MUSIC ENGINE                          ║
// ╚══════════════════════════════════════════════════════════════════════════╝

function buildAudioTheme(src) {
  const audio  = new Audio(src);
  audio.loop   = true;
  audio.volume = 0.10;
  let fadeInterval = null;
  let stopped      = false;

  const tryPlay = () => {
    audio.play().catch(() => {
      const resume = () => {
        if (!stopped) audio.play().catch(() => {});
        document.removeEventListener('click',   resume);
        document.removeEventListener('keydown', resume);
      };
      document.addEventListener('click',   resume);
      document.addEventListener('keydown', resume);
    });
  };

  tryPlay();

  return {
    stop: () => {
      stopped = true;                      // blocks any pending retry from playing
      if (fadeInterval) clearInterval(fadeInterval);

      const step = audio.volume / 20;
      fadeInterval = setInterval(() => {
        if (audio.volume > step) {
          audio.volume = Math.max(0, audio.volume - step);
        } else {
          audio.volume = 0;
          audio.pause();
          audio.src = '';                  // fully release the audio resource
          clearInterval(fadeInterval);
        }
      }, 50);
    },
  };
}

// ╔══════════════════════════════════════════════════════════════════════════╗
// ║                              PROVIDER                                   ║
// ╚══════════════════════════════════════════════════════════════════════════╝

export function SoundProvider({ children }) {
  const musicRef    = useRef(null);
  const mutedRef    = useRef(false);
  const themeIdxRef = useRef(null);

  const resume = useCallback(() => {
    const ac = getAC();
    if (ac.state === 'suspended') ac.resume();
  }, []);

  // ── 1. startMusic defined FIRST ──────────────────────────────────────────
  const startMusic = useCallback((forceIndex) => {
    if (mutedRef.current) return;
    resume();

    if (musicRef.current) {
      musicRef.current.stop();
      musicRef.current = null;
    }

    let idx;
    if (forceIndex !== undefined && forceIndex !== null) {
      idx = forceIndex;
    } else {
      const choices = BGM_FILES.map((_, i) => i).filter((i) => i !== themeIdxRef.current);
      idx = choices[Math.floor(Math.random() * choices.length)];
    }

    themeIdxRef.current = idx;
    musicRef.current    = buildAudioTheme(BGM_FILES[idx]);
  }, [resume]);

  const stopMusic = useCallback(() => {
    if (musicRef.current) {
      musicRef.current.stop();
      musicRef.current = null;
    }
  }, []);

  const toggleMute = useCallback(() => {
    mutedRef.current = !mutedRef.current;
    if (mutedRef.current) {
      getMaster().gain.setValueAtTime(0, getAC().currentTime);
      stopMusic();
    } else {
      getMaster().gain.setValueAtTime(1.60, getAC().currentTime);
      startMusic();
    }
    return mutedRef.current;
  }, [startMusic, stopMusic]);

  const sfx = useCallback((fn) => {
    if (mutedRef.current) return;
    resume();
    fn();
  }, [resume]);

  // ── 2. useEffects AFTER all callbacks are defined ─────────────────────────
  useEffect(() => () => stopMusic(), [stopMusic]);

  useEffect(() => {
    const handleFirstInteraction = () => {
      if (!musicRef.current && !mutedRef.current) {
        startMusic();
      }
      document.removeEventListener('click',   handleFirstInteraction);
      document.removeEventListener('keydown', handleFirstInteraction);
    };
    document.addEventListener('click',   handleFirstInteraction);
    document.addEventListener('keydown', handleFirstInteraction);
    return () => {
      document.removeEventListener('click',   handleFirstInteraction);
      document.removeEventListener('keydown', handleFirstInteraction);
    };
  }, [startMusic]);

  // ── 3. Context value ──────────────────────────────────────────────────────
  const value = {
    startMusic,
    stopMusic,
    toggleMute,
    isMuted: () => mutedRef.current,

    playHover:         () => sfx(sfxHover),
    playPlayerPick:    () => sfx(sfxPlayerPick),
    playCpuPick:       () => sfx(sfxCpuPick),
    playDraftComplete: () => sfx(sfxDraftComplete),
    playEnterDraft:    () => sfx(sfxEnterDraft),

    playHit: (winnerMove, isCritical = false) => sfx(() => {
      if      (winnerMove === 'ATTACK')  sfxAttackHit();
      else if (winnerMove === 'DEFEND')  sfxDefendHit();
      else if (winnerMove === 'SPECIAL') sfxSpecialHit();
      else                               sfxHitGeneric(isCritical);
    }),

    playMoveSelect:  () => sfx(sfxMoveSelect),
    playDiceRoll:    () => sfx(sfxDiceRoll),
    playClash:       () => sfx(sfxClash),
    playKO:          () => sfx(sfxKO),
    playVictory:     () => sfx(sfxVictory),
    playDefeat:      () => sfx(sfxDefeat),
    playKanjiPop:    () => sfx(sfxKanjiPop),
    playNewFighter:  () => sfx(sfxNewFighter),
    playAdvantage:   () => sfx(sfxAdvantage),
  };

  return (
    <SoundContext.Provider value={value}>
      {children}
    </SoundContext.Provider>
  );
}

export const useSound = () => useContext(SoundContext);