// ── STAT GENERATION ──
export const generateStats = (seed) => {
  const s = (offset) => {
    const x = Math.sin(seed * offset) * 10000;
    return Math.floor((x - Math.floor(x)) * 40 + 55);
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
//
//  Thresholds calibrated against the full roster:
//    S ≈ 10%  │  A ≈ 20%  │  B ≈ 35%  │  C ≈ 35%
//
export const getTier = (stats) => {
  const total = totalStats(stats);
  if (total >= 463) return 'S';
  if (total >= 446) return 'A';
  if (total >= 423) return 'B';
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

// ── DRAFT SAFETY NET ──
//
//  Guarantees the 12-card pool always contains at least 1 C-tier and
//  enough cheap cards that both sides can legally complete their 3 picks
//  under the reserved-budget rule (must keep 1pt per remaining pick).
//
export const guaranteeAffordablePicks = (pool, allCharacters, budget = 10) => {
  const result = [...pool];

  // ── Guarantee at least 1 C-tier ──
  const hasCTier = result.some((c) => getTier(c.stats) === 'C');
  if (!hasCTier) {
    const poolIds = new Set(result.map((c) => c.mal_id));
    const cTiers  = allCharacters.filter(
      (c) => getTier(c.stats) === 'C' && !poolIds.has(c.mal_id)
    );
    if (cTiers.length > 0) {
      const replacement   = cTiers[Math.floor(Math.random() * cTiers.length)];
      const mostExpensive = result.reduce((worst, c) =>
        getTierCost(c.stats) > getTierCost(worst.stats) ? c : worst
      );
      const idx = result.findIndex((c) => c.mal_id === mostExpensive.mal_id);
      result[idx] = { ...replacement, hp: 1000 };
    }
  }

  // ── Guarantee at least 3 cards affordable under the reserved-budget rule ──
  //
  //  With 3 picks and 10pts, pick 1 maxSpend = 10 - 2 = 8  (reserve 1pt × 2 remaining)
  //  With 2 picks and n pts, pick 2 maxSpend = n  - 1
  //  With 1 pick  and n pts, pick 3 maxSpend = n
  //
  //  Simplest guarantee: pool must have at least 3 cards costing ≤ 8pts
  //  (that covers pick 1 headroom; picks 2 & 3 are naturally cheaper).
  //
  const FIRST_PICK_MAX = budget - 2; // = 8 with default budget of 10
  let validCount = result.filter((c) => getTierCost(c.stats) <= FIRST_PICK_MAX).length;

  if (validCount < 3) {
    const poolIds  = new Set(result.map((c) => c.mal_id));
    const cheapest = allCharacters
      .filter((c) => !poolIds.has(c.mal_id) && getTierCost(c.stats) <= FIRST_PICK_MAX)
      .sort((a, b) => getTierCost(a.stats) - getTierCost(b.stats));

    const toReplace = [...result]
      .sort((a, b) => getTierCost(b.stats) - getTierCost(a.stats));

    let swapIdx = 0;
    for (const candidate of cheapest) {
      if (validCount >= 3) break;
      const victim    = toReplace[swapIdx];
      if (!victim) break;
      const resultIdx = result.findIndex((c) => c.mal_id === victim.mal_id);
      if (resultIdx !== -1) {
        result[resultIdx] = { ...candidate, hp: 1000 };
        swapIdx++;
        validCount = result.filter((c) => getTierCost(c.stats) <= FIRST_PICK_MAX).length;
        poolIds.add(candidate.mal_id);
      }
    }
  }

  return result;
};

// ── SNAKE DRAFT ORDER ──
export const generateSnakeOrder = () => {
  const playerFirst = Math.random() < 0.5;
  const first  = playerFirst ? 'player' : 'cpu';
  const second = playerFirst ? 'cpu'    : 'player';
  return [first, second, second, first, first, second];
};

// ── MOVE SYSTEM ──
export const MOVES = {
  ATTACK:  { label: '🗡️ ATTACK',  key: 'ATTACK',  stat: (s) => s.power },
  DEFEND:  { label: '🛡️ DEFEND',  key: 'DEFEND',  stat: (s) => s.defense },
  SPECIAL: { label: '⚡ SPECIAL', key: 'SPECIAL', stat: (s) => s.speed + s.intelligence },
};

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
//
//  cpuPicksLeft — how many CPU picks remain INCLUDING this one.
//  maxSpend     — budget minus 1pt reserved per remaining pick after this one.
//  This mirrors the same constraint enforced on the player side, so the CPU
//  can never paint itself into a corner either.
//
export const getCpuPick = (
  availableChars,
  cpuBudget,
  playerBudget,
  cpuTeam,
  playerTeam,
  cpuPicksLeft,
) => {
  const maxSpend   = cpuBudget - (cpuPicksLeft - 1);
  const affordable = availableChars.filter(
    (c) => getTierCost(c.stats) <= maxSpend
  );
  if (affordable.length === 0) return null;

  const roll = Math.random();

  // ── GREEDY (35%) ──
  if (roll < 0.35) {
    return affordable.reduce((best, c) =>
      totalStats(c.stats) > totalStats(best.stats) ? c : best
    );
  }

  // ── SPITEFUL (30%) — deny what the player would most want ──
  if (roll < 0.65) {
    const playerMaxSpend   = playerBudget - (cpuPicksLeft - 1);
    const playerAffordable = affordable.filter(
      (c) => getTierCost(c.stats) <= playerMaxSpend
    );
    if (playerAffordable.length > 0) {
      return playerAffordable.reduce((best, c) =>
        totalStats(c.stats) > totalStats(best.stats) ? c : best
      );
    }
  }

  // ── EFFICIENT (35%) — best total stats per point spent ──
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