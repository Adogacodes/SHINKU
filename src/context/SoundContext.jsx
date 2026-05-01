// src/context/SoundContext.jsx
import { createContext, useContext, useRef, useCallback, useEffect } from 'react';

const SoundContext = createContext(null);

// ── Tiny AudioContext singleton ──────────────────────────────────────────────
let _ac = null;
const getAC = () => {
  if (!_ac) _ac = new (window.AudioContext || window.webkitAudioContext)();
  return _ac;
};

// ── Master gain (lets us mute everything at once) ────────────────────────────
let _master = null;
const getMaster = () => {
  const ac = getAC();
  if (!_master) {
    _master = ac.createGain();
    _master.gain.value = 0.55;
    _master.connect(ac.destination);
  }
  return _master;
};

// ── Utility: play a simple oscillator note ───────────────────────────────────
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

// ── Utility: white noise burst ───────────────────────────────────────────────
function playNoise(startTime, duration, gainVal, ac, dest) {
  const bufSize = ac.sampleRate * duration;
  const buf     = ac.createBuffer(1, bufSize, ac.sampleRate);
  const data    = buf.getChannelData(0);
  for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;
  const src = ac.createBufferSource();
  const g   = ac.createGain();
  src.buffer        = buf;
  g.gain.setValueAtTime(gainVal, startTime);
  g.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
  src.connect(g);
  g.connect(dest);
  src.start(startTime);
  src.stop(startTime + duration + 0.05);
}

// ╔══════════════════════════════════════════════════════════════════════════╗
// ║                        SOUND EFFECT LIBRARY                             ║
// ╚══════════════════════════════════════════════════════════════════════════╝

// Card hover — soft tick
function sfxHover() {
  const ac   = getAC();
  const dest = getMaster();
  const t    = ac.currentTime;
  playTone(880, 'sine', t, 0.08, 0.08, ac, dest);
}

// Card click / draft pick (player)
function sfxPlayerPick() {
  const ac   = getAC();
  const dest = getMaster();
  const t    = ac.currentTime;
  playTone(440, 'square', t,        0.08, 0.18, ac, dest);
  playTone(660, 'square', t + 0.09, 0.08, 0.18, ac, dest);
  playTone(880, 'square', t + 0.18, 0.14, 0.22, ac, dest);
}

// CPU picks a card — lower, ominous
function sfxCpuPick() {
  const ac   = getAC();
  const dest = getMaster();
  const t    = ac.currentTime;
  playTone(220, 'sawtooth', t,        0.09, 0.14, ac, dest);
  playTone(165, 'sawtooth', t + 0.10, 0.12, 0.14, ac, dest);
}

// Draft complete — triumphant ascending jingle
function sfxDraftComplete() {
  const ac   = getAC();
  const dest = getMaster();
  const t    = ac.currentTime;
  const seq  = [523, 659, 784, 1047];
  seq.forEach((f, i) => playTone(f, 'square', t + i * 0.13, 0.22, 0.2, ac, dest));
  // shimmer on top
  playTone(2093, 'sine', t + 0.55, 0.35, 0.12, ac, dest);
}

// Move select — button press
function sfxMoveSelect(moveKey) {
  const ac   = getAC();
  const dest = getMaster();
  const t    = ac.currentTime;
  if (moveKey === 'ATTACK') {
    playTone(300, 'sawtooth', t,        0.07, 0.22, ac, dest);
    playTone(200, 'sawtooth', t + 0.07, 0.10, 0.22, ac, dest);
  } else if (moveKey === 'DEFEND') {
    playTone(180, 'square', t,        0.10, 0.18, ac, dest);
    playTone(220, 'square', t + 0.10, 0.10, 0.15, ac, dest);
  } else {
    // SPECIAL — zap
    playTone(800, 'sawtooth', t,        0.05, 0.15, ac, dest);
    playTone(1200, 'sine',    t + 0.05, 0.08, 0.18, ac, dest);
    playTone(600,  'sawtooth',t + 0.13, 0.08, 0.12, ac, dest);
  }
}

// Dice roll — quick rattling ticks
function sfxDiceRoll() {
  const ac   = getAC();
  const dest = getMaster();
  const t    = ac.currentTime;
  for (let i = 0; i < 6; i++) {
    const freq = 200 + Math.random() * 300;
    playTone(freq, 'square', t + i * 0.055, 0.04, 0.1, ac, dest);
  }
}

// Hit impact — hard thud + noise
function sfxHit(isCritical = false) {
  const ac   = getAC();
  const dest = getMaster();
  const t    = ac.currentTime;
  playNoise(t, 0.12, isCritical ? 0.35 : 0.22, ac, dest);
  playTone(isCritical ? 80 : 110, 'sine', t, 0.18, 0.3, ac, dest);
  if (isCritical) {
    playTone(400, 'sawtooth', t + 0.05, 0.1, 0.2, ac, dest);
  }
}

// Miss / clash
function sfxClash() {
  const ac   = getAC();
  const dest = getMaster();
  const t    = ac.currentTime;
  playTone(300, 'sawtooth', t,        0.06, 0.15, ac, dest);
  playTone(280, 'sawtooth', t + 0.05, 0.06, 0.15, ac, dest);
  playNoise(t + 0.04, 0.08, 0.12, ac, dest);
}

// KO — descending heavy punch
function sfxKO() {
  const ac   = getAC();
  const dest = getMaster();
  const t    = ac.currentTime;
  playNoise(t, 0.15, 0.4, ac, dest);
  playTone(150, 'sine', t,        0.3, 0.35, ac, dest);
  playTone(80,  'sine', t + 0.15, 0.4, 0.35, ac, dest);
  // echo
  playTone(60, 'sine', t + 0.4, 0.3, 0.18, ac, dest);
}

// Victory fanfare — full ascending chord burst
function sfxVictory() {
  const ac   = getAC();
  const dest = getMaster();
  const t    = ac.currentTime;
  const melody = [523, 659, 784, 659, 1047, 784, 1047, 1319];
  melody.forEach((f, i) =>
    playTone(f, 'square', t + i * 0.11, 0.18, 0.18, ac, dest)
  );
  // harmony
  const harmony = [330, 415, 494, 415, 659, 494, 659, 831];
  harmony.forEach((f, i) =>
    playTone(f, 'sine', t + i * 0.11, 0.18, 0.1, ac, dest)
  );
}

// Defeat sting — descending minor
function sfxDefeat() {
  const ac   = getAC();
  const dest = getMaster();
  const t    = ac.currentTime;
  const seq  = [392, 330, 277, 220];
  seq.forEach((f, i) =>
    playTone(f, 'sawtooth', t + i * 0.18, 0.28, 0.18, ac, dest)
  );
  playTone(110, 'sine', t + 0.75, 0.5, 0.2, ac, dest);
}

// Enter Draft button click
function sfxEnterDraft() {
  const ac   = getAC();
  const dest = getMaster();
  const t    = ac.currentTime;
  playTone(330, 'square', t,        0.06, 0.2, ac, dest);
  playTone(494, 'square', t + 0.07, 0.06, 0.2, ac, dest);
  playTone(659, 'square', t + 0.14, 0.10, 0.25, ac, dest);
  playNoise(t + 0.20, 0.06, 0.1, ac, dest);
}

// ╔══════════════════════════════════════════════════════════════════════════╗
// ║                      BACKGROUND MUSIC ENGINE                            ║
// ╚══════════════════════════════════════════════════════════════════════════╝

// Three themes: 0 = orchestral, 1 = japanese traditional, 2 = rock/synth
// Each returns a stop() function

function buildOrchestrалTheme(ac, dest) {
  // Cinematic ostinato: low strings pulse + brass stabs
  let stopped = false;
  const gainNode = ac.createGain();
  gainNode.gain.value = 0.13;
  gainNode.connect(dest);

  const BPM       = 108;
  const BEAT      = 60 / BPM;
  const LOOP_BARS = 8;
  const LOOP_LEN  = LOOP_BARS * 4 * BEAT;

  const schedule = () => {
    if (stopped) return;
    const t = ac.currentTime;

    // Bass pulse every beat
    const bassNotes = [98, 98, 110, 98, 87, 98, 98, 110];
    bassNotes.forEach((f, i) => {
      playTone(f, 'sawtooth', t + i * BEAT, BEAT * 0.7, 0.55, ac, gainNode);
    });

    // Mid brass stabs on beat 1 & 3 of each bar
    const brassStabs = [196, 220, 196, 175];
    brassStabs.forEach((f, i) => {
      playTone(f * 2, 'square', t + i * BEAT * 2, BEAT * 0.3, 0.22, ac, gainNode);
    });

    // Shimmer high string run bars 5-8
    const run = [523, 587, 659, 587, 523, 494, 523, 587];
    run.forEach((f, i) => {
      playTone(f, 'sine', t + BEAT * 16 + i * BEAT * 0.5, BEAT * 0.45, 0.1, ac, gainNode);
    });

    setTimeout(schedule, (LOOP_LEN - 0.1) * 1000);
  };

  schedule();
  return {
    stop: () => {
      stopped = true;
      gainNode.gain.setValueAtTime(gainNode.gain.value, ac.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + 1.2);
    },
  };
}

function buildJapaneseTheme(ac, dest) {
  // Pentatonic flute melody + taiko drum pulse
  let stopped = false;
  const gainNode = ac.createGain();
  gainNode.gain.value = 0.12;
  gainNode.connect(dest);

  const BPM      = 88;
  const BEAT     = 60 / BPM;
  const LOOP_LEN = 16 * BEAT;

  // D minor pentatonic: D E F A C
  const penta = [293, 329, 349, 440, 523, 587, 659, 698, 880];

  const melody = [0, 2, 3, 5, 3, 2, 0, 6, 5, 3, 2, 3, 0, 2, 5, 3];

  const schedule = () => {
    if (stopped) return;
    const t = ac.currentTime;

    // Flute melody
    melody.forEach((idx, i) => {
      playTone(penta[idx], 'sine', t + i * BEAT * 0.5, BEAT * 0.55, 0.18, ac, gainNode);
    });

    // Taiko on beats 1 & 3 — low sine + noise
    [0, 2, 4, 6].forEach((beat) => {
      playNoise(t + beat * BEAT, 0.09, 0.28, ac, gainNode);
      playTone(80, 'sine', t + beat * BEAT, 0.12, 0.35, ac, gainNode);
    });

    // Koto pluck accent on offbeats
    [1, 3, 5, 7].forEach((beat) => {
      playTone(penta[2], 'triangle', t + beat * BEAT, 0.18, 0.1, ac, gainNode);
    });

    setTimeout(schedule, (LOOP_LEN - 0.1) * 1000);
  };

  schedule();
  return {
    stop: () => {
      stopped = true;
      gainNode.gain.setValueAtTime(gainNode.gain.value, ac.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + 1.2);
    },
  };
}

function buildRockTheme(ac, dest) {
  // Distorted power-chord riff + punchy kick
  let stopped = false;
  const gainNode = ac.createGain();
  gainNode.gain.value = 0.11;
  gainNode.connect(dest);

  const BPM      = 140;
  const BEAT     = 60 / BPM;
  const LOOP_LEN = 8 * BEAT;

  // Power chord = root + 5th + octave
  const chord = (root, t, dur) => {
    playTone(root,       'sawtooth', t, dur, 0.28, ac, gainNode);
    playTone(root * 1.5, 'sawtooth', t, dur, 0.18, ac, gainNode);
    playTone(root * 2,   'square',   t, dur, 0.10, ac, gainNode);
  };

  const riff = [
    { root: 110, beat: 0 },
    { root: 110, beat: 0.5 },
    { root: 123, beat: 1 },
    { root: 110, beat: 1.5 },
    { root: 98,  beat: 2 },
    { root: 110, beat: 2.5 },
    { root: 130, beat: 3 },
    { root: 110, beat: 3.5 },
  ];

  const schedule = () => {
    if (stopped) return;
    const t = ac.currentTime;

    riff.forEach(({ root, beat }) => {
      chord(root, t + beat * BEAT, BEAT * 0.38);
    });

    // Kick on every beat
    for (let i = 0; i < 8; i++) {
      playNoise(t + i * BEAT, 0.05, 0.25, ac, gainNode);
      playTone(55, 'sine', t + i * BEAT, 0.12, 0.45, ac, gainNode);
    }

    // Snare on 2 & 4
    [1, 3, 5, 7].forEach((beat) => {
      playNoise(t + beat * BEAT, 0.07, 0.35, ac, gainNode);
    });

    setTimeout(schedule, (LOOP_LEN - 0.05) * 1000);
  };

  schedule();
  return {
    stop: () => {
      stopped = true;
      gainNode.gain.setValueAtTime(gainNode.gain.value, ac.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + 1.2);
    },
  };
}

const THEMES = [buildOrchestrалTheme, buildJapaneseTheme, buildRockTheme];

// ╔══════════════════════════════════════════════════════════════════════════╗
// ║                           PROVIDER                                      ║
// ╚══════════════════════════════════════════════════════════════════════════╝

export function SoundProvider({ children }) {
  const musicRef    = useRef(null); // current bg music instance { stop }
  const mutedRef    = useRef(false);
  const themeIdxRef = useRef(null); // which theme is currently playing

  // Resume AudioContext on first user gesture (browser policy)
  const resume = useCallback(() => {
    const ac = getAC();
    if (ac.state === 'suspended') ac.resume();
  }, []);

  // ── start a random theme (excluding current) ──
  const startMusic = useCallback((forceIndex) => {
    if (mutedRef.current) return;
    resume();

    // stop old theme
    if (musicRef.current) {
      musicRef.current.stop();
      musicRef.current = null;
    }

    let idx;
    if (forceIndex !== undefined) {
      idx = forceIndex;
    } else {
      // pick randomly, avoid repeating same theme
      const choices = [0, 1, 2].filter((i) => i !== themeIdxRef.current);
      idx = choices[Math.floor(Math.random() * choices.length)];
    }

    themeIdxRef.current = idx;
    const ac   = getAC();
    const dest = getMaster();
    musicRef.current = THEMES[idx](ac, dest);
  }, [resume]);

  const stopMusic = useCallback(() => {
    if (musicRef.current) {
      musicRef.current.stop();
      musicRef.current = null;
    }
  }, []);

  const toggleMute = useCallback(() => {
    mutedRef.current = !mutedRef.current;
    const master = getMaster();
    if (mutedRef.current) {
      master.gain.setValueAtTime(0, getAC().currentTime);
      stopMusic();
    } else {
      master.gain.setValueAtTime(0.55, getAC().currentTime);
      startMusic();
    }
    return mutedRef.current;
  }, [startMusic, stopMusic]);

  // ── wrap every sfx to respect mute and resume AC ──
  const sfx = useCallback((fn) => {
    if (mutedRef.current) return;
    resume();
    fn();
  }, [resume]);

  useEffect(() => () => stopMusic(), [stopMusic]);

  const value = {
    startMusic,
    stopMusic,
    toggleMute,
    isMuted: () => mutedRef.current,
    // SFX
    playHover:        () => sfx(sfxHover),
    playPlayerPick:   () => sfx(sfxPlayerPick),
    playCpuPick:      () => sfx(sfxCpuPick),
    playDraftComplete:() => sfx(sfxDraftComplete),
    playMoveSelect:   (key) => sfx(() => sfxMoveSelect(key)),
    playDiceRoll:     () => sfx(sfxDiceRoll),
    playHit:          (isCrit) => sfx(() => sfxHit(isCrit)),
    playClash:        () => sfx(sfxClash),
    playKO:           () => sfx(sfxKO),
    playVictory:      () => sfx(sfxVictory),
    playDefeat:       () => sfx(sfxDefeat),
    playEnterDraft:   () => sfx(sfxEnterDraft),
  };

  return (
    <SoundContext.Provider value={value}>
      {children}
    </SoundContext.Provider>
  );
}

export const useSound = () => useContext(SoundContext);