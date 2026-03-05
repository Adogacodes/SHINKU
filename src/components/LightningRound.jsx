import { useState, useEffect, useCallback } from 'react';
import { useCharacters } from '../hooks/useCharacters';
import styles from './LightningRound.module.css';

const STAT_KEYS = ['power', 'speed', 'defense', 'intelligence', 'stamina'];
const FLASH_DURATION = 1500; // ms character is visible
const FEEDBACK_DURATION = 1200; // ms result banner shows

// Returns the key of the highest stat
const getHighestStat = (stats) =>
  STAT_KEYS.reduce((best, key) => (stats[key] > stats[best] ? key : best), STAT_KEYS[0]);

// PHASE flow:
// 'ready' → 'flashing' → 'recall' → 'feedback' → next round or done
export default function LightningRound({ onComplete, onBack }) {
  const { characters, loading } = useCharacters(9);

  const [phase, setPhase]           = useState('ready');
  const [roundIndex, setRoundIndex] = useState(0);
  const [team, setTeam]             = useState([]);
  const [picked, setPicked]         = useState(null); // stat key player picked
  const [showFlash, setShowFlash]   = useState(false);

  // The 3 characters this player will face (sliced once loaded)
  const fighters = characters.slice(0, 3);
  const current  = fighters[roundIndex];

  // ── Start a round — flash the character ──
  const startFlash = useCallback(() => {
    setShowFlash(true);
    setPhase('flashing');
    setPicked(null);

    // After FLASH_DURATION hide character and move to recall
    setTimeout(() => {
      setShowFlash(false);
      setPhase('recall');
    }, FLASH_DURATION);
  }, []);

  // ── Player picks a stat ──
  const handleStatPick = (statKey) => {
    if (phase !== 'recall') return;
    setPicked(statKey);

    const correct    = getHighestStat(current.stats);
    const isCorrect  = statKey === correct;
    const multiplier = isCorrect ? 1 : 0.5;

    setPhase('feedback');

    // Build the character entry with power multiplier applied
    const entry = {
      ...current,
      powerMultiplier: multiplier,
      stats: Object.fromEntries(
        STAT_KEYS.map((k) => [k, Math.floor(current.stats[k] * multiplier)])
      ),
    };

    setTimeout(() => {
      const newTeam = [...team, entry];
      setTeam(newTeam);

      if (newTeam.length === 3) {
        // All 3 rounds done — go to battle
        onComplete(newTeam);
      } else {
        setRoundIndex((i) => i + 1);
        setPhase('flashing');
        setShowFlash(true);
        setPicked(null);

        setTimeout(() => {
          setShowFlash(false);
          setPhase('recall');
        }, FLASH_DURATION);
      }
    }, FEEDBACK_DURATION);
  };

  // ── Derived ──
  const isCorrect     = picked && current && picked === getHighestStat(current.stats);
  const correctStat   = current ? getHighestStat(current.stats) : null;

  return (
    <div className={styles.root}>
      <div className={styles.speedLines} />

      {/* Top bar */}
      <div className={styles.topBar}>
        <button className={styles.backBtn} onClick={onBack}>← BACK</button>
        <div className={styles.roundTracker}>
          ROUND <span>{Math.min(roundIndex + 1, 3)}</span> / 3
        </div>
        <div style={{ width: 80 }} /> {/* spacer to balance flex */}
      </div>

      {/* Team strip — shows collected characters */}
      <div className={styles.teamStrip}>
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className={`${styles.teamSlot} ${team[i] ? styles.filled : ''}`}
          >
            {team[i] ? (
              <img
                src={team[i].image}
                alt={team[i].name}
                onError={(e) => {
                  e.target.src = `https://api.dicebear.com/7.x/bottts/svg?seed=${team[i].mal_id}`;
                }}
              />
            ) : (
              '?'
            )}
          </div>
        ))}
      </div>

      {/* Main stage */}
      <div className={styles.stage}>

        {/* ── LOADING ── */}
        {loading && (
          <div className={styles.loadingText}>LOADING FIGHTERS...</div>
        )}

        {/* ── READY ── */}
        {!loading && phase === 'ready' && (
          <div className={styles.readyWrap}>
            <div className={styles.readyTitle}>
              ⚡ <span>LIGHTNING</span> ROUND
            </div>
            <p className={styles.readyDesc}>
              A character will flash for <strong>1.5 seconds</strong>.
              Memorise their stats — then pick their highest one from memory.
              Correct = <strong>100% power</strong>. Wrong = <strong>50% power</strong>.
            </p>
            <button className={styles.startBtn} onClick={startFlash}>
              START →
            </button>
          </div>
        )}

        {/* ── FLASHING — character visible ── */}
        {!loading && phase === 'flashing' && current && (
          <>
            {showFlash && <div className={styles.flashOverlay} />}
            <div className={styles.characterReveal}>
              <img
                className={styles.characterImage}
                src={current.image}
                alt={current.name}
                onError={(e) => {
                  e.target.src = `https://api.dicebear.com/7.x/bottts/svg?seed=${current.mal_id}`;
                }}
              />
              <div className={styles.characterName}>{current.name}</div>
              <div className={styles.characterAnime}>{current.anime}</div>

              <div className={styles.statsGrid}>
                {STAT_KEYS.map((key) => (
                  <div className={styles.statPill} key={key}>
                    <span className={styles.statLabel}>{key.slice(0, 3).toUpperCase()}</span>
                    <span className={styles.statValue}>{current.stats[key]}</span>
                  </div>
                ))}
              </div>

              <div className={styles.countdownWrap}>
                <div className={styles.countdownBar} />
              </div>
            </div>
          </>
        )}

        {/* ── RECALL — pick the stat ── */}
        {!loading && phase === 'recall' && current && (
          <>
            <div className={styles.recallHeader}>WHAT WAS THE HIGHEST STAT?</div>
            <p className={styles.recallSubtitle}>
              {current.name} · {current.anime}
            </p>
            <img
              className={styles.recallImage}
              src={current.image}
              alt={current.name}
              onError={(e) => {
                e.target.src = `https://api.dicebear.com/7.x/bottts/svg?seed=${current.mal_id}`;
              }}
            />
            <div className={styles.statButtons}>
              {STAT_KEYS.map((key) => (
                <button
                  key={key}
                  className={styles.statBtn}
                  onClick={() => handleStatPick(key)}
                >
                  {key.toUpperCase()}
                </button>
              ))}
            </div>
          </>
        )}

        {/* ── FEEDBACK — show result ── */}
        {!loading && phase === 'feedback' && current && (
          <>
            <img
              className={styles.recallImage}
              src={current.image}
              alt={current.name}
              onError={(e) => {
                e.target.src = `https://api.dicebear.com/7.x/bottts/svg?seed=${current.mal_id}`;
              }}
            />
            <div className={styles.characterName}>{current.name}</div>

            {/* Show all stats so player can see the correct answer */}
            <div className={styles.statsGrid}>
              {STAT_KEYS.map((key) => (
                <div
                  className={styles.statPill}
                  key={key}
                  style={
                    key === correctStat
                      ? { borderColor: '#2d6a4f', background: '#d8f3dc' }
                      : {}
                  }
                >
                  <span className={styles.statLabel}>{key.slice(0, 3).toUpperCase()}</span>
                  <span className={styles.statValue}>{current.stats[key]}</span>
                </div>
              ))}
            </div>

            <div
              className={`${styles.resultBanner} ${
                isCorrect ? styles.success : styles.fail
              }`}
            >
              {isCorrect
                ? '✓ CORRECT! FULL POWER'
                : `✗ WRONG! ${correctStat?.toUpperCase()} WAS HIGHEST — 50% POWER`}
            </div>
          </>
        )}

      </div>
    </div>
  );
}

