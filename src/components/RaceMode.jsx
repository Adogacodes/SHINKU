import { useState, useEffect, useRef, useCallback } from 'react';
import { useCharacters } from '../hooks/useCharacters';
import styles from './RaceMode.module.css';

// Wave config — each wave is faster
const WAVES = [
  { speed: 7000, label: 'WAVE 1 — WARM UP'   },
  { speed: 5000, label: 'WAVE 2 — SPEEDING UP' },
  { speed: 3200, label: 'WAVE 3 — FULL SPRINT' },
];

const CHARS_PER_WAVE = 4;
const LANES          = 3; // track divided into 3 horizontal lanes
const TARGET_CATCHES = 3;

// Assign each character a random lane (0, 1, 2)
// Lane maps to a vertical % position inside the track
const laneTopMap = { 0: '8%', 1: '37%', 2: '66%' };

export default function RaceMode({ onComplete, onBack }) {
  const { characters, loading } = useCharacters(12);

  const [phase, setPhase]             = useState('ready');   // ready | countdown | racing | done
  const [countdown, setCountdown]     = useState(3);
  const [waveIndex, setWaveIndex]     = useState(0);
  const [racers, setRacers]           = useState([]);        // active characters on track
  const [caught, setCaught]           = useState([]);        // captured characters
  const [missedIds, setMissedIds]     = useState(new Set()); // ids that left the screen
  const waveIndexRef                  = useRef(0);
  const caughtRef                     = useRef([]);
  const timerRef                      = useRef(null);

  // Keep refs in sync
  useEffect(() => { waveIndexRef.current = waveIndex; }, [waveIndex]);
  useEffect(() => { caughtRef.current    = caught;    }, [caught]);

  // ── Launch a wave of characters onto the track ──
  const launchWave = useCallback((wIndex, pool) => {
    const waveChars = pool
      .slice(wIndex * CHARS_PER_WAVE, wIndex * CHARS_PER_WAVE + CHARS_PER_WAVE)
      .map((char, i) => ({
        ...char,
        racerId:    `${char.mal_id}-w${wIndex}-${i}`,
        lane:       i % LANES,
        delay:      i * 900,           // stagger entry
        duration:   WAVES[wIndex].speed,
      }));

    setRacers(waveChars);
    setWaveIndex(wIndex);

    // After the wave clears — mark missed ones, then next wave or done
    const waveDuration = WAVES[wIndex].speed + CHARS_PER_WAVE * 900 + 600;
    timerRef.current = setTimeout(() => {
      // Characters that were NOT caught are missed
      setMissedIds((prev) => {
        const next = new Set(prev);
        waveChars.forEach((c) => {
          if (!caughtRef.current.find((x) => x.racerId === c.racerId)) {
            next.add(c.racerId);
          }
        });
        return next;
      });

      const nextWave = wIndex + 1;

      if (caughtRef.current.length >= TARGET_CATCHES) {
        // Already have 3 — go to done
        setPhase('done');
        setTimeout(() => onComplete(caughtRef.current.slice(0, TARGET_CATCHES)), 1200);
      } else if (nextWave < WAVES.length) {
        // Launch next wave
        setTimeout(() => launchWave(nextWave, pool), 600);
      } else {
        // All waves done — go to done with however many caught
        setPhase('done');
        setTimeout(() => {
          const finalTeam = caughtRef.current.slice(0, TARGET_CATCHES);
          // Pad with random chars if player caught fewer than 3
          onComplete(finalTeam);
        }, 1200);
      }
    }, waveDuration);
  }, [onComplete]);

  // ── Start countdown then race ──
  const startCountdown = useCallback(() => {
    setPhase('countdown');
    setCountdown(3);

    let count = 3;
    const tick = setInterval(() => {
      count -= 1;
      setCountdown(count);
      if (count <= 0) {
        clearInterval(tick);
        setPhase('racing');
        launchWave(0, characters);
      }
    }, 800);
  }, [characters, launchWave]);

  // ── Player taps a character ──
  const handleCatch = (racer) => {
    if (caughtRef.current.length >= TARGET_CATCHES) return;
    if (caughtRef.current.find((c) => c.racerId === racer.racerId)) return;

    const newCaught = [...caughtRef.current, racer];
    setCaught(newCaught);
    caughtRef.current = newCaught;

    if (newCaught.length >= TARGET_CATCHES) {
      clearTimeout(timerRef.current);
      setPhase('done');
      setTimeout(() => onComplete(newCaught.slice(0, TARGET_CATCHES)), 1200);
    }
  };

  useEffect(() => {
    return () => clearTimeout(timerRef.current);
  }, []);

  const speedLevel = waveIndex + 1; // 1, 2, or 3 dots lit

  return (
    <div className={styles.root}>
      <div className={styles.speedLines} />

      {/* Top bar */}
      <div className={styles.topBar}>
        <button className={styles.backBtn} onClick={onBack}>← BACK</button>
        <div className={styles.catchTracker}>
          CAUGHT <span>{caught.length}</span> / {TARGET_CATCHES}
        </div>
        <div style={{ width: 80 }} />
      </div>

      {/* Team strip */}
      <div className={styles.teamStrip}>
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className={`${styles.teamSlot} ${caught[i] ? styles.filled : ''}`}
          >
            {caught[i] ? (
              <img
                src={caught[i].image}
                alt={caught[i].name}
                onError={(e) => {
                  e.target.src = `https://api.dicebear.com/7.x/bottts/svg?seed=${caught[i].mal_id}`;
                }}
              />
            ) : '?'}
          </div>
        ))}
      </div>

      {/* Race track */}
      <div className={styles.track}>

        {/* ── READY ── */}
        {phase === 'ready' && !loading && (
          <div className={styles.readyWrap}>
            <div className={styles.readyTitle}>
              🏃 <span>RACE</span> MODE
            </div>
            <p className={styles.readyDesc}>
              Characters race across the screen in <strong>3 waves</strong>,
              getting faster each time. <strong>Tap 3 characters</strong> to
              catch them — you can see their name but not their stats. Anime
              knowledge and quick reflexes are your only weapons.
            </p>
            <button className={styles.startBtn} onClick={startCountdown}>
              START →
            </button>
          </div>
        )}

        {phase === 'ready' && loading && (
          <div className={styles.readyWrap}>
            <div className={styles.readyTitle} style={{ fontSize: 'clamp(18px,3vw,26px)' }}>
              LOADING FIGHTERS...
            </div>
          </div>
        )}

        {/* ── COUNTDOWN ── */}
        {phase === 'countdown' && (
          <div className={styles.countdownOverlay}>
            <div className={styles.countdownNumber} key={countdown}>
              {countdown === 0 ? 'GO!' : countdown}
            </div>
          </div>
        )}

        {/* ── RACING — render racers ── */}
        {(phase === 'racing' || phase === 'done') && (
          <>
            <div className={styles.waveLabel}>{WAVES[waveIndex]?.label}</div>

            {/* Speed dots */}
            <div className={styles.speedIndicator}>
              {[1, 2, 3].map((dot) => (
                <div
                  key={dot}
                  className={`${styles.speedDot} ${dot <= speedLevel ? styles.active : ''}`}
                />
              ))}
            </div>

            {racers.map((racer) => {
              const isCaught = !!caught.find((c) => c.racerId === racer.racerId);
              const isMissed = missedIds.has(racer.racerId);

              return (
                <div
                  key={racer.racerId}
                  className={`
                    ${styles.racer}
                    ${isCaught ? styles.caught : ''}
                    ${isMissed ? styles.missed : ''}
                  `}
                  style={{
                    top:                laneTopMap[racer.lane],
                    animationDuration:  `${racer.duration}ms`,
                    animationDelay:     `${racer.delay}ms`,
                    animationPlayState: isCaught ? 'paused' : 'running',
                  }}
                  onClick={() => !isCaught && !isMissed && handleCatch(racer)}
                >
                  <div className={styles.racerCard}>
                    <img
                      className={styles.racerImg}
                      src={racer.image}
                      alt={racer.name}
                      onError={(e) => {
                        e.target.src = `https://api.dicebear.com/7.x/bottts/svg?seed=${racer.mal_id}`;
                      }}
                    />
                    <div className={styles.racerName}>{racer.name}</div>
                    <div className={styles.racerAnime}>{racer.anime}</div>
                  </div>
                </div>
              );
            })}
          </>
        )}

        {/* ── DONE overlay ── */}
        {phase === 'done' && (
          <div className={styles.doneOverlay}>
            <div className={styles.doneTitle}>
              <span>SQUAD</span> LOCKED!
            </div>
            <div className={styles.doneSubtitle}>
              HEADING TO BATTLE...
            </div>
          </div>
        )}

      </div>

      {/* Hint */}
      {phase === 'racing' && (
        <p className={styles.hint}>
          TAP A CHARACTER TO <span>CATCH</span> THEM —
          YOU CANNOT SEE THEIR STATS UNTIL BATTLE
        </p>
      )}

    </div>
  );
}


