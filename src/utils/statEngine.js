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

// ── TIER SYSTEM ──
// Thresholds are intentionally uneven — not guaranteed equal distribution
// A pool of 12 might have 0 S-tiers or 3, just like real life
export const getTier = (stats) => {
  const total = totalStats(stats);
  if (total >= 420) return 'S';
  if (total >= 370) return 'A';
  if (total >= 330) return 'B';
  return 'C';
};

export const getTierCost = (stats) => {
  const tier = getTier(stats);
  if (tier === 'S') return 5;
  if (tier === 'A') return 3;
  if (tier === 'B') return 2;
  return 1;
};

export const TIER_COLORS = {
  S: { bg: '#c1121f', text: '#ffffff', label: 'S' },
  A: { bg: '#b5860d', text: '#ffffff', label: 'A' },
  B: { bg: '#023e8a', text: '#ffffff', label: 'B' },
  C: { bg: '#4a4a4a', text: '#ffffff', label: 'C' },
};

// ── SNAKE DRAFT ORDER ──
// Randomises who picks first, then snakes
// Returns array of 6 turns: 'player' | 'cpu'
export const generateSnakeOrder = () => {
  const playerFirst = Math.random() < 0.5;

  // Snake pattern: first → second → second → first → first → second
  const first  = playerFirst ? 'player' : 'cpu';
  const second = playerFirst ? 'cpu'    : 'player';

  return [first, second, second, first, first, second];
};

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

// ── DICE ──
export const rollDice = () => Math.floor(Math.random() * 6) + 1;

// ── DAMAGE CALCULATION ──
export const calculateDamage = (character, move, diceRoll, powerMultiplier = 1) => {
  const baseStat = MOVES[move].stat(character.stats);
  return Math.floor(baseStat * diceRoll * powerMultiplier);
};

// ── CPU DRAFT AI ──
// Mixed strategy — unpredictably combines greedy, efficient, and spiteful
export const getCpuPick = (availableChars, cpuBudget, playerBudget, cpuTeam, playerTeam) => {
  // Only consider characters the CPU can actually afford
  const affordable = availableChars.filter(
    (c) => getTierCost(c.stats) <= cpuBudget
  );
  if (affordable.length === 0) return availableChars[0]; // fallback

  // Roll to decide strategy this turn — truly random each pick
  const roll = Math.random();

  // ── GREEDY (35%) — just take the highest total stat character ──
  if (roll < 0.35) {
    return affordable.reduce((best, c) =>
      totalStats(c.stats) > totalStats(best.stats) ? c : best
    );
  }

  // ── SPITEFUL (30%) — take whatever the player would most want ──
  // i.e. the highest stat character the player can still afford
  if (roll < 0.65) {
    const playerAffordable = affordable.filter(
      (c) => getTierCost(c.stats) <= playerBudget
    );
    if (playerAffordable.length > 0) {
      return playerAffordable.reduce((best, c) =>
        totalStats(c.stats) > totalStats(best.stats) ? c : best
      );
    }
    // If player can't afford anything, fall through to efficient
  }

  // ── EFFICIENT (35%) — best value per point spent ──
  // Picks character with highest (totalStats / cost) ratio
  return affordable.reduce((best, c) => {
    const bestRatio = totalStats(best.stats) / getTierCost(best.stats);
    const cRatio    = totalStats(c.stats)    / getTierCost(c.stats);
    return cRatio > bestRatio ? c : best;
  });
};

// ── AI BATTLE MOVE ──
export const getAIMove = () => {
  const roll = Math.random();
  if (roll < 0.4) return 'ATTACK';
  if (roll < 0.7) return 'SPECIAL';
  return 'DEFEND';
};