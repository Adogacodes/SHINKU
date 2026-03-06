import { useState, useEffect, useRef } from 'react';
import { getRandomCharacters } from '../data/characters';
import {
  getTier,
  getTierCost,
  TIER_COLORS,
  totalStats,
  generateSnakeOrder,
  getCpuPick,
} from '../utils/statEngine';
import styles from './DraftScreen.module.css';

const STAT_KEYS     = ['power', 'speed', 'defense', 'intelligence', 'stamina'];
const BUDGET        = 10;
const CPU_THINK_MIN = 1200;
const CPU_THINK_MAX = 2400;
const PICKED_FLASH  = 900;

export default function DraftScreen({ onComplete, onBack }) {
  const [characters]   = useState(() => getRandomCharacters(12));
  const [snakeOrder]   = useState(() => generateSnakeOrder());

  const turnIndexRef    = useRef(0);
  const [turnIndex,     setTurnIndex]    = useState(0);

  const availableRef    = useRef([]);
  const [available,     setAvailable]    = useState([]);

  const playerTeamRef   = useRef([]);
  const [playerTeam,    setPlayerTeam]   = useState([]);

  const cpuTeamRef      = useRef([]);
  const [cpuTeam,       setCpuTeam]      = useState([]);

  const playerBudgetRef = useRef(BUDGET);
  const [playerBudget,  setPlayerBudget] = useState(BUDGET);

  const cpuBudgetRef    = useRef(BUDGET);
  const [cpuBudget,     setCpuBudget]    = useState(BUDGET);

  const [justPickedId,  setJustPickedId] = useState(null);
  const [justPickedBy,  setJustPickedBy] = useState(null);
  const [cpuThinking,   setCpuThinking]  = useState(false);
  const [draftDone,     setDraftDone]    = useState(false);

  const cpuLock      = useRef(false);
  const timeouts     = useRef([]);
  const initialized  = useRef(false);

  const schedule = (ms, fn) => {
    const id = setTimeout(fn, ms);
    timeouts.current.push(id);
    return id;
  };

  useEffect(() => () => timeouts.current.forEach(clearTimeout), []);

  // ── triggerCpuPick stored in a ref so it's always fresh, never stale ──
  const triggerCpuPickRef = useRef(null);
  triggerCpuPickRef.current = (pool, cpuBgt, plrBgt, cpuTm, plrTm, tIdx) => {
    if (cpuLock.current) return;
    cpuLock.current = true;
    setCpuThinking(true);

    const thinkTime = CPU_THINK_MIN + Math.random() * (CPU_THINK_MAX - CPU_THINK_MIN);

    schedule(thinkTime, () => {
      const chosen = getCpuPick(pool, cpuBgt, plrBgt, cpuTm, plrTm);

      if (!chosen) {
        cpuLock.current = false;
        setCpuThinking(false);
        return;
      }

      const cost         = getTierCost(chosen.stats);
      const nextPool     = pool.filter((c) => c.mal_id !== chosen.mal_id);
      const nextTurnIdx  = tIdx + 1;
      const nextCpuTeam  = [...cpuTm, chosen];
      const nextCpuBgt   = cpuBgt - cost;

      availableRef.current = nextPool;
      cpuTeamRef.current   = nextCpuTeam;
      cpuBudgetRef.current = nextCpuBgt;
      turnIndexRef.current = nextTurnIdx;

      setAvailable(nextPool);
      setCpuTeam(nextCpuTeam);
      setCpuBudget(nextCpuBgt);
      setJustPickedId(chosen.mal_id);
      setJustPickedBy('cpu');

      schedule(PICKED_FLASH, () => {
        setJustPickedId(null);
        setJustPickedBy(null);
        setTurnIndex(nextTurnIdx);
        cpuLock.current = false;
        setCpuThinking(false);

        // If next turn is also CPU, chain immediately
        if (
          nextTurnIdx < snakeOrder.length &&
          snakeOrder[nextTurnIdx] === 'cpu'
        ) {
          triggerCpuPickRef.current(
            availableRef.current,
            cpuBudgetRef.current,
            playerBudgetRef.current,
            cpuTeamRef.current,
            playerTeamRef.current,
            nextTurnIdx
          );
        }
      });
    });
  };

  // ── Init pool exactly once on mount ──
  useEffect(() => {
    if (initialized.current) return;
    initialized.current  = true;
    availableRef.current = [...characters];
    setAvailable([...characters]);

    if (snakeOrder[0] === 'cpu') {
      // Small delay so React finishes painting before CPU starts
      schedule(100, () => {
        triggerCpuPickRef.current(
          [...characters],
          cpuBudgetRef.current,
          playerBudgetRef.current,
          cpuTeamRef.current,
          playerTeamRef.current,
          0
        );
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Draft complete check ──
  useEffect(() => {
    if (turnIndex >= snakeOrder.length && playerTeamRef.current.length === 3) {
      schedule(1000, () => setDraftDone(true));
    }
  }, [turnIndex, snakeOrder.length]);

  // ── Player pick ──
  const handlePlayerPick = (character) => {
    if (snakeOrder[turnIndexRef.current] !== 'player') return;
    if (turnIndexRef.current >= snakeOrder.length) return;
    if (cpuLock.current) return;

    const cost = getTierCost(character.stats);
    if (cost > playerBudgetRef.current) return;
    if (!availableRef.current.find((c) => c.mal_id === character.mal_id)) return;

    const nextPool      = availableRef.current.filter((c) => c.mal_id !== character.mal_id);
    const nextTurnIdx   = turnIndexRef.current + 1;
    const nextPlrTeam   = [...playerTeamRef.current, character];
    const nextPlrBgt    = playerBudgetRef.current - cost;

    availableRef.current    = nextPool;
    playerTeamRef.current   = nextPlrTeam;
    playerBudgetRef.current = nextPlrBgt;
    turnIndexRef.current    = nextTurnIdx;

    setAvailable(nextPool);
    setPlayerTeam(nextPlrTeam);
    setPlayerBudget(nextPlrBgt);
    setJustPickedId(character.mal_id);
    setJustPickedBy('player');

    schedule(PICKED_FLASH, () => {
      setJustPickedId(null);
      setJustPickedBy(null);
      setTurnIndex(nextTurnIdx);

      if (
        nextTurnIdx < snakeOrder.length &&
        snakeOrder[nextTurnIdx] === 'cpu'
      ) {
        triggerCpuPickRef.current(
          availableRef.current,
          cpuBudgetRef.current,
          playerBudgetRef.current,
          cpuTeamRef.current,
          playerTeamRef.current,
          nextTurnIdx
        );
      }
    });
  };

  // ── Card state ──
  const getCardState = (character) => {
    if (justPickedId === character.mal_id) {
      return justPickedBy === 'player' ? 'justPicked' : 'cpuPicked';
    }
    const inPool = availableRef.current.find((c) => c.mal_id === character.mal_id);
    if (!inPool) {
      if (playerTeamRef.current.find((c) => c.mal_id === character.mal_id)) return 'yours';
      if (cpuTeamRef.current.find((c) => c.mal_id === character.mal_id))    return 'cpu';
      return 'taken';
    }
    if (snakeOrder[turnIndexRef.current] !== 'player') return 'waiting';
    if (turnIndexRef.current >= snakeOrder.length)     return 'waiting';
    if (cpuLock.current)                               return 'waiting';
    if (getTierCost(character.stats) > playerBudgetRef.current) return 'disabled';
    return 'available';
  };

  const isDraftOver = turnIndex >= snakeOrder.length;
  const currentTurn = snakeOrder[turnIndex];
  const isYourTurn  = currentTurn === 'player' && !isDraftOver && !cpuThinking;

  const maxTotal = characters.length > 0
    ? Math.max(...characters.map((c) => totalStats(c.stats)))
    : 495;

  const turnLabel = isDraftOver
    ? '✅ DRAFT COMPLETE!'
    : cpuThinking
    ? '🤔 CPU IS THINKING...'
    : currentTurn === 'player'
    ? '⚡ YOUR PICK'
    : '🤖 CPU\'S TURN';

  const turnClass = isDraftOver
    ? styles.done
    : isYourTurn
    ? styles.yours
    : styles.cpus;

  return (
    <div className={styles.root}>
      <div className={styles.speedLines} />

      <div className={styles.header}>
        <button className={styles.backBtn} onClick={onBack}>← BACK</button>
        <div className={styles.titleBadge}>
          ⚔️ <span>DRAFT</span> YOUR SQUAD
        </div>
        <div className={styles.turnStrip}>
          {snakeOrder.map((who, i) => (
            <div
              key={i}
              className={`
                ${styles.turnDot}
                ${who === 'player' ? styles.player : styles.cpu}
                ${i === turnIndex  ? styles.active : ''}
                ${i < turnIndex    ? styles.done   : ''}
              `}
            >
              {who === 'player' ? 'YOU' : 'CPU'}
            </div>
          ))}
        </div>
      </div>

      <div className={styles.turnIndicator}>
        <div key={turnIndex} className={`${styles.turnBadge} ${turnClass}`}>
          {turnLabel}
        </div>
      </div>

      <div className={styles.budgets}>

        <div className={`${styles.budgetCard} ${styles.playerCard}`}>
          <div className={styles.budgetLabel}>
            YOUR BUDGET <span>{playerBudget} / {BUDGET} pts</span>
          </div>
          <div className={styles.budgetTrack}>
            <div
              className={`${styles.budgetFill} ${playerBudget <= 2 ? styles.low : ''}`}
              style={{ width: `${(playerBudget / BUDGET) * 100}%` }}
            />
          </div>
          <div className={styles.miniTeam}>
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className={`${styles.miniSlot} ${playerTeam[i] ? styles.filled : ''}`}
              >
                {playerTeam[i] ? (
                  <img
                    src={playerTeam[i].image}
                    alt={playerTeam[i].name}
                    onError={(e) => {
                      e.target.src = `https://api.dicebear.com/7.x/bottts/svg?seed=${playerTeam[i].mal_id}`;
                    }}
                  />
                ) : '?'}
              </div>
            ))}
          </div>
        </div>

        <div className={`${styles.budgetCard} ${styles.cpuCard}`}>
          <div className={styles.budgetLabel}>
            CPU BUDGET <span>{cpuBudget} / {BUDGET} pts</span>
          </div>
          <div className={styles.budgetTrack}>
            <div
              className={`${styles.budgetFill} ${cpuBudget <= 2 ? styles.low : ''}`}
              style={{ width: `${(cpuBudget / BUDGET) * 100}%` }}
            />
          </div>
          <div className={styles.miniTeam}>
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className={`${styles.miniSlot} ${cpuTeam[i] ? styles.filledCpu : ''}`}
              >
                {cpuTeam[i] ? (
                  <img
                    src={cpuTeam[i].image}
                    alt={cpuTeam[i].name}
                    onError={(e) => {
                      e.target.src = `https://api.dicebear.com/7.x/bottts/svg?seed=${cpuTeam[i].mal_id}`;
                    }}
                  />
                ) : '?'}
              </div>
            ))}
          </div>
        </div>

      </div>

      <div className={styles.grid}>
        {characters.map((character) => {
          const state      = getCardState(character);
          const tier       = getTier(character.stats);
          const cost       = getTierCost(character.stats);
          const total      = totalStats(character.stats);
          const tierColor  = TIER_COLORS[tier];
          const isTaken    = ['yours', 'cpu', 'taken'].includes(state);
          const isDisabled = ['disabled', 'waiting'].includes(state);

          return (
            <div
              key={character.mal_id}
              className={`
                ${styles.card}
                ${isTaken                ? styles.taken      : ''}
                ${isDisabled             ? styles.disabled   : ''}
                ${state === 'justPicked' ? styles.justPicked : ''}
                ${state === 'cpuPicked'  ? styles.cpuPicked  : ''}
              `}
              onClick={() => !isTaken && !isDisabled && handlePlayerPick(character)}
            >
              <div
                className={styles.tierBadge}
                style={{ background: tierColor.bg, color: tierColor.text }}
              >
                {tier}
              </div>

              <div
                className={`${styles.costBadge} ${state === 'disabled' ? styles.cantAfford : ''}`}
              >
                {cost}pt{cost !== 1 ? 's' : ''}
              </div>

              <img
                className={styles.cardImg}
                src={character.image}
                alt={character.name}
                onError={(e) => {
                  e.target.src = `https://api.dicebear.com/7.x/bottts/svg?seed=${character.mal_id}`;
                }}
              />

              <div className={styles.cardName}>{character.name}</div>
              <div className={styles.cardAnime}>{character.anime}</div>

              <div className={styles.cardStats}>
                {STAT_KEYS.map((key) => (
                  <div key={key} className={styles.cardStat}>
                    <span className={styles.cardStatLabel}>
                      {key.slice(0, 3).toUpperCase()}
                    </span>
                    <span className={styles.cardStatVal}>
                      {character.stats[key]}
                    </span>
                  </div>
                ))}
              </div>

              <div className={styles.totalBar}>
                <div className={styles.totalLabel}>
                  <span>TOTAL</span>
                  <span>{total}</span>
                </div>
                <div className={styles.totalTrack}>
                  <div
                    className={styles.totalFill}
                    style={{ width: `${(total / maxTotal) * 100}%` }}
                  />
                </div>
              </div>

              {state === 'yours' && (
                <div className={`${styles.ownerLabel} ${styles.you}`}>✓ YOUR PICK</div>
              )}
              {state === 'cpu' && (
                <div className={`${styles.ownerLabel} ${styles.cpu}`}>CPU PICK</div>
              )}
            </div>
          );
        })}
      </div>

      {draftDone && (
        <div className={styles.draftComplete}>
          <div className={styles.draftCompleteBox}>
            <div className={styles.draftCompleteTitle}>
              SQUAD <span>LOCKED</span> IN!
            </div>
            <div className={styles.draftCompleteTeam}>
              {playerTeam.map((c) => {
                const tier      = getTier(c.stats);
                const tierColor = TIER_COLORS[tier];
                return (
                  <div key={c.mal_id} className={styles.draftCompleteSlot}>
                    <img
                      className={styles.draftCompleteImg}
                      src={c.image}
                      alt={c.name}
                      onError={(e) => {
                        e.target.src = `https://api.dicebear.com/7.x/bottts/svg?seed=${c.mal_id}`;
                      }}
                    />
                    <div className={styles.draftCompleteName}>{c.name}</div>
                    <div
                      className={styles.draftCompleteTier}
                      style={{ background: tierColor.bg, color: tierColor.text }}
                    >
                      {tier}-TIER
                    </div>
                  </div>
                );
              })}
            </div>
            <button
              className={styles.battleBtn}
              onClick={() => onComplete(playerTeam)}
            >
              ⚔️ GO TO BATTLE →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}