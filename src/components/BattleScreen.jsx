import { useState, useCallback, useRef, useEffect } from 'react';
import { getRandomCharacters } from '../data/characters';
import { useSound } from '../context/SoundContext';
import {
  MOVES,
  resolveMoveWinner,
  rollDice,
  calculateDamage,
  getAIMove,
} from '../utils/statEngine';
import styles from './BattleScreen.module.css';

const INITIAL_HP  = 1000;
const STEP_DELAY  = 3000;

const KANJI_POOL = ['力', '撃', '斬', '必', '勝', '闘', '烈', '覇', '魂', '炎'];

const hpClass = (hp) => {
  const pct = hp / INITIAL_HP;
  if (pct > 0.55) return styles.high;
  if (pct > 0.25) return styles.medium;
  return styles.low;
};

const buildOpponentTeam = (playerTeam) => {
  const usedIds = new Set(playerTeam.map((c) => c.mal_id));
  return getRandomCharacters(12)
    .filter((c) => !usedIds.has(c.mal_id))
    .slice(0, 3)
    .map((c) => ({ ...c, hp: 1000, powerMultiplier: 1 }));
};

const STAT_KEYS = ['power', 'speed', 'defense', 'intelligence', 'stamina'];

function StatPills({ stats, highlightedStat }) {
  return (
    <div className={styles.statPills}>
      {STAT_KEYS.map((key) => (
        <div
          key={key}
          className={`${styles.statPill} ${
            highlightedStat === key ? styles.highlighted : ''
          }`}
        >
          <span className={styles.statPillLabel}>
            {key.slice(0, 3).toUpperCase()}
          </span>
          <span className={styles.statPillVal}>{stats[key]}</span>
        </div>
      ))}
    </div>
  );
}

// ── Fighter Card ──
function FighterCard({
  character,
  isPlayer,
  isShaking,
  isPulsing,
  isPortraitActive,
  highlightedStat,
}) {
  const hpPct     = Math.max(0, (character.hp / INITIAL_HP) * 100);
  const prevHpRef = useRef(character.hp);
  const [ghostPct, setGhostPct] = useState(hpPct);

  useEffect(() => {
    if (character.hp < prevHpRef.current) {
      const oldPct = Math.max(0, (prevHpRef.current / INITIAL_HP) * 100);
      setGhostPct(oldPct);
      const id = setTimeout(() => setGhostPct(hpPct), 400);
      prevHpRef.current = character.hp;
      return () => clearTimeout(id);
    }
    prevHpRef.current = character.hp;
    setGhostPct(hpPct);
  }, [character.hp, hpPct]);

  const pulseClass = isPulsing
    ? isPlayer ? styles.pulsePlayer : styles.pulseCpu
    : '';

  const imgActiveClass = isPortraitActive
    ? isPlayer ? styles.active : styles.activeCpu
    : '';

  return (
    <div
      className={`
        ${styles.fighterCard}
        ${isPlayer ? styles.player : styles.opponent}
        ${isShaking ? styles.shaking : ''}
        ${pulseClass}
      `}
    >
      <div className={`
        ${styles.fighterLabel}
        ${isPlayer ? styles.youLabel : styles.cpuLabel}
      `}>
        {isPlayer ? '— YOU —' : '— CPU —'}
      </div>

      <img
        className={`${styles.fighterImg} ${imgActiveClass}`}
        src={character.image}
        alt={character.name}
        onError={(e) => {
          e.target.src = `https://api.dicebear.com/7.x/bottts/svg?seed=${character.mal_id}`;
        }}
      />

      <div className={styles.fighterName}>{character.name}</div>
      <div className={styles.fighterAnime}>{character.anime}</div>

      <div className={styles.hpWrap}>
        <div className={styles.hpLabel}>
          <span>HP</span>
          <span>{Math.max(0, character.hp)}</span>
        </div>
        <div className={styles.hpTrack}>
          <div className={styles.hpGhost} style={{ width: `${ghostPct}%` }} />
          <div
            className={`${styles.hpFill} ${hpClass(character.hp)}`}
            style={{ width: `${hpPct}%` }}
          />
        </div>
      </div>

      <StatPills stats={character.stats} highlightedStat={highlightedStat} />

      {isPlayer && (
        <div className={`${styles.powerBadge} ${
          character.powerMultiplier === 1 ? styles.full : styles.half
        }`}>
          {character.powerMultiplier === 1 ? '✓ FULL POWER' : '⚠ 50% POWER'}
        </div>
      )}
    </div>
  );
}

// ── Main Component ──
export default function BattleScreen({
  playerTeam: rawPlayerTeam,
  onComplete,
}) {
  // ── Sound ──
  const {
    playMoveSelect,
    playDiceRoll,
    playHit,
    playClash,
    playKO,
    playVictory,
    playDefeat,
  } = useSound();

  const [playerTeam, setPlayerTeam] = useState(() =>
    rawPlayerTeam.map((c) => ({
      ...c,
      hp: INITIAL_HP,
      powerMultiplier: c.powerMultiplier ?? 1,
    }))
  );

  const [opponentTeam, setOpponentTeam] = useState(() =>
    buildOpponentTeam(rawPlayerTeam)
  );

  const [pIndex, setPIndex] = useState(0);
  const [oIndex, setOIndex] = useState(0);

  const [phase,       setPhase]       = useState('choosing');
  const [showConfirm, setShowConfirm] = useState(false);

  const [flashType, setFlashType] = useState('');
  const [flashKey,  setFlashKey]  = useState(0);

  const [damageFloat,    setDamageFloat]    = useState(null);
  const [damageFloatKey, setDamageFloatKey] = useState(0);

  const [pulsingPlayer,   setPulsingPlayer]   = useState(false);
  const [pulsingOpponent, setPulsingOpponent] = useState(false);

  const [shakingPlayer,   setShakingPlayer]   = useState(false);
  const [shakingOpponent, setShakingOpponent] = useState(false);

  const [activePortrait, setActivePortrait] = useState(null);

  const [playerHighlightStat,   setPlayerHighlightStat]   = useState(null);
  const [opponentHighlightStat, setOpponentHighlightStat] = useState(null);

  const [showSpeedBurst, setShowSpeedBurst] = useState(false);
  const [speedBurstKey,  setSpeedBurstKey]  = useState(0);

  const [kanjis, setKanjis] = useState([]);

  const [dialogueMsg,   setDialogueMsg]   = useState('CHOOSE YOUR MOVE!');
  const [dialogueSub,   setDialogueSub]   = useState('');
  const [dialogueCalc,  setDialogueCalc]  = useState('');
  const [dialogueColor, setDialogueColor] = useState('');
  const [msgKey,        setMsgKey]        = useState(0);

  const timeouts = useRef([]);
  const after = (ms, fn) => {
    const id = setTimeout(fn, ms);
    timeouts.current.push(id);
  };
  useEffect(() => () => timeouts.current.forEach(clearTimeout), []);

  const triggerBgAnimations = useCallback(() => {
    setSpeedBurstKey((k) => k + 1);
    setShowSpeedBurst(true);
    setTimeout(() => setShowSpeedBurst(false), 500);

    const newKanjis = Array.from({ length: 2 }, (_, i) => ({
      id:   Date.now() + i,
      char: KANJI_POOL[Math.floor(Math.random() * KANJI_POOL.length)],
      x:    Math.random() * 80 + 5,
      y:    Math.random() * 60 + 10,
    }));
    setKanjis(newKanjis);
    setTimeout(() => setKanjis([]), 2600);
  }, []);

  const say = useCallback((msg, sub = '', color = '', calc = '', portrait = null) => {
    setDialogueMsg(msg);
    setDialogueSub(sub);
    setDialogueColor(color);
    setDialogueCalc(calc);
    setMsgKey((k) => k + 1);
    setActivePortrait(portrait);
    triggerBgAnimations();
  }, [triggerBgAnimations]);

  const flash = useCallback((type) => {
    setFlashType(type);
    setFlashKey((k) => k + 1);
    after(500, () => setFlashType(''));
  }, []);

  const showDamageFloat = useCallback((amount, isPlayerHit) => {
    setDamageFloat({ amount, isPlayerHit });
    setDamageFloatKey((k) => k + 1);
    after(1400, () => setDamageFloat(null));
  }, []);

  const pulse = useCallback((playerWins) => {
    if (playerWins) {
      setPulsingPlayer(true);
      after(1800, () => setPulsingPlayer(false));
    } else {
      setPulsingOpponent(true);
      after(1800, () => setPulsingOpponent(false));
    }
  }, []);

  const currentPlayer   = playerTeam[pIndex];
  const currentOpponent = opponentTeam[oIndex];

  const handleMove = useCallback((moveKey) => {
    if (phase !== 'choosing') return;
    setPhase('narrating');
    playMoveSelect(moveKey);

    setPlayerHighlightStat(null);
    setOpponentHighlightStat(null);

    const aiMove = getAIMove();
    const pDice  = rollDice();
    const oDice  = rollDice();
    const winner = resolveMoveWinner(moveKey, aiMove);
    const emoji  = { ATTACK: '🗡️', DEFEND: '🛡️', SPECIAL: '⚡' };

    const playerStatUsed   = moveKey === 'ATTACK' ? 'power' : moveKey === 'DEFEND' ? 'defense' : 'speed';
    const opponentStatUsed = aiMove  === 'ATTACK' ? 'power' : aiMove  === 'DEFEND' ? 'defense' : 'speed';

    say(`${emoji[moveKey]} YOU CHOSE: ${moveKey}`, 'waiting for CPU...', 'red', '', 'player');

    after(STEP_DELAY, () => {
      say(`${emoji[aiMove]} CPU CHOSE: ${aiMove}`, 'moves locked in!', 'blue', '', 'cpu');
    });

    after(STEP_DELAY * 2, () => {
      if (winner === 'clash') {
        playClash();
        say(`💥 CLASH! BOTH CHOSE ${moveKey}`, 'dice will decide!', 'gold', '', null);
      } else if (winner === 'player') {
        say(`✅ ${moveKey} BEATS ${aiMove}!`, 'you have the advantage!', 'green', '', 'player');
        pulse(true);
      } else {
        say(`❌ ${aiMove} BEATS ${moveKey}!`, 'CPU has the advantage!', 'red', '', 'cpu');
        pulse(false);
      }
    });

    after(STEP_DELAY * 3, () => {
      playDiceRoll();
      if (winner === 'clash') {
        const clashPlayerWins = pDice >= oDice;
        say(
          `🎲 YOU ROLL ${pDice}  vs  CPU ROLLS ${oDice}`,
          clashPlayerWins ? 'your roll wins the clash!' : 'CPU roll wins the clash!',
          clashPlayerWins ? 'green' : 'red', '', null
        );
        pulse(clashPlayerWins);
      } else if (winner === 'player') {
        say(`🎲 YOU ROLL A ${pDice}!`, 'calculating damage...', 'gold', '', 'player');
      } else {
        say(`🎲 CPU ROLLS A ${oDice}!`, 'calculating damage...', 'gold', '', 'cpu');
      }
    });

    after(STEP_DELAY * 4, () => {
      let dmg            = 0;
      let playerTakesHit = false;
      let statVal        = 0;
      let statUsed       = '';
      let diceUsed       = 0;

      if (winner === 'player') {
        statVal        = MOVES[moveKey].stat(currentPlayer.stats);
        diceUsed       = pDice;
        dmg            = calculateDamage(currentPlayer, moveKey, pDice, currentPlayer.powerMultiplier);
        playerTakesHit = false;
        statUsed       = playerStatUsed;
        setPlayerHighlightStat(playerStatUsed);
      } else if (winner === 'opponent') {
        statVal        = MOVES[aiMove].stat(currentOpponent.stats);
        diceUsed       = oDice;
        dmg            = calculateDamage(currentOpponent, aiMove, oDice, 1);
        playerTakesHit = true;
        statUsed       = opponentStatUsed;
        setOpponentHighlightStat(opponentStatUsed);
      } else {
        if (pDice >= oDice) {
          statVal        = MOVES[moveKey].stat(currentPlayer.stats);
          diceUsed       = pDice;
          dmg            = calculateDamage(currentPlayer, moveKey, pDice, currentPlayer.powerMultiplier);
          playerTakesHit = false;
          statUsed       = playerStatUsed;
          setPlayerHighlightStat(playerStatUsed);
        } else {
          statVal        = MOVES[aiMove].stat(currentOpponent.stats);
          diceUsed       = oDice;
          dmg            = calculateDamage(currentOpponent, aiMove, oDice, 1);
          playerTakesHit = true;
          statUsed       = opponentStatUsed;
          setOpponentHighlightStat(opponentStatUsed);
        }
      }

      const calcLine = `${statUsed.toUpperCase()}: ${statVal} × 🎲${diceUsed} = ${dmg} DMG`;

      say(
        playerTakesHit ? `💢 YOU TAKE ${dmg} DAMAGE!` : `💥 CPU TAKES ${dmg} DAMAGE!`,
        playerTakesHit ? 'ouch...' : 'nice hit!',
        playerTakesHit ? 'red' : 'green',
        calcLine,
        playerTakesHit ? 'cpu' : 'player'
      );

      after(STEP_DELAY, () => {
        const newPTeam = playerTeam.map((c, i) =>
          i === pIndex ? { ...c, hp: playerTakesHit ? c.hp - dmg : c.hp } : c
        );
        const newOTeam = opponentTeam.map((c, i) =>
          i === oIndex ? { ...c, hp: !playerTakesHit ? c.hp - dmg : c.hp } : c
        );

        flash(playerTakesHit ? 'flashRed' : 'flashWhite');
        showDamageFloat(dmg, playerTakesHit);
        playHit(dmg > 180);

        if (playerTakesHit) setShakingPlayer(true);
        else setShakingOpponent(true);

        setPlayerTeam(newPTeam);
        setOpponentTeam(newOTeam);

        after(600, () => {
          setShakingPlayer(false);
          setShakingOpponent(false);

          const updatedPlayer   = newPTeam[pIndex];
          const updatedOpponent = newOTeam[oIndex];
          const playerKO        = updatedPlayer.hp   <= 0;
          const opponentKO      = updatedOpponent.hp <= 0;
          const nextPIndex      = playerKO   ? pIndex + 1 : pIndex;
          const nextOIndex      = opponentKO ? oIndex + 1 : oIndex;
          const allPlayerDead   = nextPIndex >= playerTeam.length;
          const allOpponentDead = nextOIndex >= opponentTeam.length;

          if (allPlayerDead || allOpponentDead) {
            if (allOpponentDead) playVictory();
            else playDefeat();
            say(
              allOpponentDead ? '🏆 VICTORY!' : '💀 DEFEATED!',
              allOpponentDead ? 'you crushed the enemy team!' : 'your team has fallen...',
              allOpponentDead ? 'green' : 'red',
              '', null
            );
            setPhase('done');
            after(2500, () => onComplete(allOpponentDead ? 'win' : 'lose'));
            return;
          }

          if (playerKO || opponentKO) {
            playKO();
            say(
              playerKO
                ? `💀 ${updatedPlayer.name} IS DOWN!`
                : `💀 ${updatedOpponent.name} IS DEFEATED!`,
              'next fighter stepping in...',
              'red', '', null
            );
            setPlayerHighlightStat(null);
            setOpponentHighlightStat(null);
            after(STEP_DELAY, () => {
              if (playerKO)   setPIndex(nextPIndex);
              if (opponentKO) setOIndex(nextOIndex);
              setPhase('choosing');
              say('NEW FIGHTER!', 'choose your move!', '', '', null);
            });
            return;
          }

          after(600, () => {
            setPlayerHighlightStat(null);
            setOpponentHighlightStat(null);
            setPhase('choosing');
            say('CHOOSE YOUR MOVE!', '', '', '', null);
          });
        });
      });
    });
  }, [
    phase, playerTeam, opponentTeam,
    pIndex, oIndex, say, flash,
    showDamageFloat, pulse, onComplete,
    currentPlayer, currentOpponent,
    playMoveSelect, playDiceRoll, playHit,
    playClash, playKO, playVictory, playDefeat,
  ]);

  return (
    <div className={styles.root}>
      <div className={styles.speedLines} />

      {showSpeedBurst && (
        <div key={speedBurstKey} className={styles.speedBurst} />
      )}

      <div className={styles.kanjiWrap}>
        {kanjis.map((k) => (
          <div
            key={k.id}
            className={styles.kanji}
            style={{ left: `${k.x}%`, top: `${k.y}%` }}
          >
            {k.char}
          </div>
        ))}
      </div>

      {flashType && (
        <div key={flashKey} className={`${styles.screenFlash} ${styles[flashType]}`} />
      )}

      {damageFloat && (
        <div
          key={damageFloatKey}
          className={`
            ${styles.damageFloat}
            ${damageFloat.isPlayerHit ? styles.playerHit : styles.opponentHit}
          `}
        >
          -{damageFloat.amount}
        </div>
      )}

      {showConfirm && (
        <div className={styles.confirmOverlay}>
          <div className={styles.confirmBox}>
            <div className={styles.confirmTitle}>GIVE <span>UP</span>?</div>
            <p className={styles.confirmDesc}>
              You will forfeit this battle and return to the main menu.
              Your progress will be lost.
            </p>
            <div className={styles.confirmButtons}>
              <button className={styles.confirmYes} onClick={() => onComplete('lose')}>
                FORFEIT
              </button>
              <button className={styles.confirmNo} onClick={() => setShowConfirm(false)}>
                KEEP FIGHTING
              </button>
            </div>
          </div>
        </div>
      )}

      <div className={styles.header}>
        <div className={styles.roundBadge}>
          ⚔️ FIGHTER <span>{pIndex + 1}</span> / {playerTeam.length}
        </div>
        <button className={styles.giveUpBtn} onClick={() => setShowConfirm(true)}>
          GIVE UP
        </button>
      </div>

      <div className={styles.arena}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
          <FighterCard
            character={currentPlayer}
            isPlayer
            isShaking={shakingPlayer}
            isPulsing={pulsingPlayer}
            isPortraitActive={activePortrait === 'player'}
            highlightedStat={playerHighlightStat}
          />
          <div className={styles.queueDots}>
            {playerTeam.map((c, i) => (
              <div
                key={c.mal_id}
                className={`${styles.dot} ${i < pIndex ? styles.dead : styles.alive}`}
              />
            ))}
          </div>
        </div>

        <div className={styles.vsDivider}>
          <div className={styles.vsDash} />
          <div className={styles.vsText}>VS</div>
          <div className={styles.vsDash} />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
          <FighterCard
            character={currentOpponent}
            isPlayer={false}
            isShaking={shakingOpponent}
            isPulsing={pulsingOpponent}
            isPortraitActive={activePortrait === 'cpu'}
            highlightedStat={opponentHighlightStat}
          />
          <div className={styles.queueDots}>
            {opponentTeam.map((c, i) => (
              <div
                key={c.mal_id}
                className={`${styles.dot} ${i < oIndex ? styles.dead : styles.alive}`}
              />
            ))}
          </div>
        </div>
      </div>

      <div className={styles.dialogue}>
        <div
          key={msgKey}
          className={`
            ${styles.dialogueMessage}
            ${dialogueColor ? styles[dialogueColor] : ''}
          `}
        >
          {dialogueMsg}
          {phase === 'narrating' && <span className={styles.dialogueCursor} />}
        </div>
        {dialogueSub && (
          <div className={styles.dialogueSub}>{dialogueSub}</div>
        )}
        {dialogueCalc && (
          <div className={styles.dialogueCalc}>{dialogueCalc}</div>
        )}
      </div>

      <div className={styles.moveSection}>
        <div className={styles.movePrompt}>— PICK YOUR MOVE —</div>
        <div className={styles.moveButtons}>
          {Object.values(MOVES).map((move) => (
            <button
              key={move.key}
              className={styles.moveBtn}
              onClick={() => handleMove(move.key)}
              disabled={phase !== 'choosing'}
            >
              <span className={styles.moveBtnIcon}>
                {move.key === 'ATTACK' ? '🗡️' : move.key === 'DEFEND' ? '🛡️' : '⚡'}
              </span>
              <span className={styles.moveBtnLabel}>{move.key}</span>
              <span className={styles.moveBtnStat}>
                {move.key === 'ATTACK'
                  ? 'USES POWER'
                  : move.key === 'DEFEND'
                  ? 'USES DEFENSE'
                  : 'SPEED + INT'}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}