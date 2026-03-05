// ── STAT GENERATION ──
// Deterministic per character ID so stats are consistent
export const generateStats = (seed) => {
  const s = (offset) => {
    const x = Math.sin(seed * offset) * 10000;
    return Math.floor((x - Math.floor(x)) * 40 + 55); // range: 55–95
  };
  return {
    power:        s(1.1),
    speed:        s(2.3),
    defense:      s(3.7),
    intelligence: s(4.9),
    stamina:      s(5.2),
  };
};

export const totalStats = (stats) =>
  Object.values(stats).reduce((a, b) => a + b, 0);

// ── MOVE SYSTEM ──
// Attack > Special > Defend > Attack (rock paper scissors)
export const MOVES = {
  ATTACK:  { label: '🗡️ ATTACK',  key: 'ATTACK',  stat: (s) => s.power },
  DEFEND:  { label: '🛡️ DEFEND',  key: 'DEFEND',  stat: (s) => s.defense },
  SPECIAL: { label: '⚡ SPECIAL', key: 'SPECIAL', stat: (s) => s.speed + s.intelligence },
};

// Returns 'player', 'opponent', or 'clash'
export const resolveMoveWinner = (playerMove, opponentMove) => {
  if (playerMove === opponentMove) return 'clash';
  if (
    (playerMove === 'ATTACK'  && opponentMove === 'SPECIAL') ||
    (playerMove === 'SPECIAL' && opponentMove === 'DEFEND')  ||
    (playerMove === 'DEFEND'  && opponentMove === 'ATTACK')
  ) return 'player';
  return 'opponent';
};

// ── DICE ROLL ──
export const rollDice = () => Math.floor(Math.random() * 6) + 1;

// ── DAMAGE CALCULATION ──
export const calculateDamage = (character, move, diceRoll, powerMultiplier = 1) => {
  const baseStat = MOVES[move].stat(character.stats);
  return Math.floor(baseStat * diceRoll * powerMultiplier);
};

// ── AI MOVE (simple weighted random, not pure random) ──
// AI slightly favors ATTACK but is not predictable
export const getAIMove = () => {
  const roll = Math.random();
  if (roll < 0.4) return 'ATTACK';
  if (roll < 0.7) return 'SPECIAL';
  return 'DEFEND';
};