import { useState, useEffect, useRef, useCallback } from 'react';
import { useCharacters } from '../hooks/useCharacters';
import {
  getTier,
  getTierCost,
  TIER_COLORS,
  totalStats,
  generateSnakeOrder,
  getCpuPick,
} from '../utils/statEngine';
import styles from './DraftScreen.module.css';

const STAT_KEYS      = ['power', 'speed', 'defense', 'intelligence', 'stamina'];
const BUDGET         = 10;
const CPU_THINK_MIN  = 1200;
const CPU_THINK_MAX  = 2400;
const PICKED_FLASH   = 900; // ms the "just picked" highlight shows

export default function DraftScreen({ onComplete, onBack }) {
  const { characters, loading } = useCharacters(12);

  const [snakeOrder]    = useState(() => generateSnakeOrder());
  const [turnIndex,     setTurnIndex]     = useState(0);

  // Use a ref for available so CPU always reads the latest value
  const availableRef   = useRef([]);
  const [available,    setAvailable]      = useState([]);

  const [playerTeam,   setPlayerTeam]     = useState([]);
  const [cpuTeam,      setCpuTeam]        = useState([]);
  const [playerBudget, setPlayerBudget]   = useState(BUDGET);
  const [cpuBudget,    setCpuBudget]      = useState(BUDGET);

  // UI feedback
  const [justPickedId, setJustPickedId]   = useState(null);
  const [justPickedBy, setJustPickedBy]   = useState(null);
  const [cpuThinking,  setCpuThinking]    = useState(false);
  const [draftDone,    setDraftDone]      = useState(false);

  // Keep ref in sync with state so CPU always reads fresh list
  const syncAvailable = (list) => {
    availableRef.current = list;
    setAvailable(list);
  };

  const timeouts = useRef([]);
  const after = (ms, fn) => {
    const id = setTimeout(fn, ms);
    timeouts.current.push(id);
    return id;
  };
  useEffect(() => () => timeouts.current.forEach(clearTimeout), []);

  // Init pool once loaded
  useEffect(() => {
    if (!loading && characters.length > 0) {
      syncAvailable([...characters]);
    }
  }, [loading, characters]);

  const currentTurn = snakeOrder[turnIndex];
  const isDraftOver = turnIndex >= snakeOrder.length;

  // ── Core pick function — immediately removes from pool ──
  const pick = useCallback((character, by, currentAvailable) => {
    const cost    = getTierCost(character.stats);

    // Remove from pool IMMEDIATELY so CPU can never pick the same character
    const nextAvailable = currentAvailable.filter(
      (c) => c.mal_id !== character.mal_id
    );
    syncAvailable(nextAvailable);

    // Flash highlight so player can see who was picked
    setJustPickedId(character.mal_id);
    setJustPickedBy(by);

    if (by === 'player') {
      setPlayerTeam((prev) => [...prev, character]);
      setPlayerBudget((prev) => prev - cost);
    } else {
      setCpuTeam((prev) => [...prev, character]);
      setCpuBudget((prev) => prev - cost);
    }

    // Clear highlight after flash duration, then advance turn
    after(PICKED_FLASH, () => {
      setJustPickedId(null);
      setJustPickedBy(null);
      setTurnIndex((prev) => prev + 1);
    });
  }, []);

  // ── CPU turn handler ──
  // Reads budgets via refs so it always has fresh values
  const playerBudgetRef = useRef(BUDGET);
  const cpuBudgetRef    = useRef(BUDGET);
  const playerTeamRef   = useRef([]);
  const cpuTeamRef      = useRef([]);

  useEffect(() => { playerBudgetRef.current = playerBudget; }, [playerBudget]);
  useEffect(() => { cpuBudgetRef.current    = cpuBudget;    }, [cpuBudget]);
  useEffect(() => { playerTeamRef.current   = playerTeam;   }, [playerTeam]);
  useEffect(() => { cpuTeamRef.current      = cpuTeam;      }, [cpuTeam]);

  useEffect(() => {
    if (isDraftOver || currentTurn !== 'cpu' || cpuThinking) return;
    if (availableRef.current.length === 0) return;

    setCpuThinking(true);

    // Random think time so CPU feels alive, not robotic
    const thinkTime = CPU_THINK_MIN + Math.random() * (CPU_THINK_MAX - CPU_THINK_MIN);

    after(thinkTime, () => {
      const snapshot = availableRef.current;
      const chosen   = getCpuPick(
        snapshot,
        cpuBudgetRef.current,
        playerBudgetRef.current,
        cpuTeamRef.current,
        playerTeamRef.current
      );

      if (chosen) {
        pick(chosen, 'cpu', snapshot);
      }
      setCpuThinking(false);
    });
  }, [currentTurn, turnIndex, isDraftOver, available.length]);

  // ── Draft complete ──
  useEffect(() => {
    if (isDraftOver && playerTeam.length === 3) {
      after(1000, () => setDraftDone(true));
    }
  }, [isDraftOver, playerTeam.length]);

  // ── Player pick handler ──
  const handlePlayerPick = (character) => {
    if (currentTurn !== 'player' || isDraftOver || cpuThinking) return;
    if (getTierCost(character.stats) > playerBudget) return;
    if (!availableRef.current.find((c) => c.mal_id === character.mal_id)) return;

    pick(character, 'player', availableRef.current);
  };

  // ── Card state ──
  const getCardState = (character) => {
    if (justPickedId === character.mal_id) {
      return justPickedBy === 'player' ? 'justPicked' : 'cpuPicked';
    }
    const isAvailable = availableRef.current.find(
      (c) => c.mal_id === character.mal_id
    );
    if (!isAvailable) {
      if (playerTeam.find((c) => c.mal_id === character.mal_id)) return 'yours';
      if (cpuTeam.find((c) => c.mal_id === character.mal_id))    return 'cpu';
      return 'taken';
    }
    if (currentTurn !== 'player' || isDraftOver || cpuThinking) return 'waiting';
    if (getTierCost(character.stats) > playerBudget) return 'disabled';
    return 'available';
  };

  const maxTotal = characters.length > 0
    ? Math.max(...characters.map((c) => totalStats(c.stats)))
    : 475;

  const isYourTurn = currentTurn === 'player' && !isDraftOver && !cpuThinking;

  const turnLabel = isDraftOver
    ? '✅ DRAFT COMPLETE!'
    : currentTurn === 'player' && !cpuThinking
    ? '⚡ YOUR PICK'
    : cpuThinking
    ? '🤔 CPU IS THINKING...'
    : '🤖 CPU\'S TURN';

  const turnClass = isDraftOver
    ? styles.done
    : isYourTurn
    ? styles.yours
    : styles.cpus;

  return (
    <div className={styles.root}>
      <div className={styles.speedLines} />

      {/* Loading */}
      {loading && (
        <div className={styles.loadingWrap}>
          <div className={styles.loadingText}>ASSEMBLING FIGHTERS...</div>
          <div className={styles.loadingSubtext}>fetching characters from the api</div>
        </div>
      )}

      {!loading && (
        <>
          {/* Header */}
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

          {/* Turn indicator */}
          <div className={styles.turnIndicator}>
            <div key={turnIndex} className={`${styles.turnBadge} ${turnClass}`}>
              {turnLabel}
            </div>
          </div>

          {/* Budget cards */}
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

          {/* Character grid */}
          <div className={styles.grid}>
            {characters.map((character) => {
              const state     = getCardState(character);
              const tier      = getTier(character.stats);
              const cost      = getTierCost(character.stats);
              const total     = totalStats(character.stats);
              const tierColor = TIER_COLORS[tier];
              const isTaken   = ['yours', 'cpu', 'taken'].includes(state);
              const isDisabled = ['disabled', 'waiting'].includes(state);

              return (
                <div
                  key={character.mal_id}
                  className={`
                    ${styles.card}
                    ${isTaken              ? styles.taken     : ''}
                    ${isDisabled           ? styles.disabled  : ''}
                    ${state === 'justPicked' ? styles.justPicked : ''}
                    ${state === 'cpuPicked'  ? styles.cpuPicked  : ''}
                  `}
                  onClick={() =>
                    !isTaken && !isDisabled && handlePlayerPick(character)
                  }
                >
                  <div
                    className={styles.tierBadge}
                    style={{ background: tierColor.bg, color: tierColor.text }}
                  >
                    {tier}
                  </div>

                  <div
                    className={`${styles.costBadge} ${
                      state === 'disabled' ? styles.cantAfford : ''
                    }`}
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
                    <div className={`${styles.ownerLabel} ${styles.you}`}>
                      ✓ YOUR PICK
                    </div>
                  )}
                  {state === 'cpu' && (
                    <div className={`${styles.ownerLabel} ${styles.cpu}`}>
                      CPU PICK
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Draft complete overlay */}
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