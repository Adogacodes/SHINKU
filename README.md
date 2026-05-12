# SHINKU ⚔️ 真紅

> **Draft your squad. Master your moves. Claim glory.**

A full-stack anime battle game built entirely in React — featuring a strategic snake-draft system, turn-based combat with rock-paper-scissors mechanics, dice-based damage calculation, a multi-strategy AI opponent, and a fully orchestrated sound system. No game engine. Pure React.

🔗 [Live Demo](#) • 📁 https://github.com/Adogacodes/shinku

---

## 🎮 What It Is

**SHINKU** (真紅 · Crimson Fury) is a single-player anime battle arena game where you draft a team of 3 characters from a randomized pool of 12, then face off against a CPU opponent in a turn-based battle. Every run is different — the draft pool, snake order, and CPU strategy all randomize each game.

The game flows through four distinct screens:

```
Main Menu → Draft Screen → Battle Screen → Result Screen
```

---

## 🌟 Features

### ⚙️ Stat & Tier Engine (`statEngine.js`)
- **Deterministic stat generation** using a seeded sine-wave hash — every character always gets the same stats, no database needed
- **4-tier system** (S / A / B / C) calibrated against the full character roster:
  - S-tier ≈ top 10% | A ≈ 20% | B ≈ 35% | C ≈ 35%
- **Cost-per-tier** (S=5pts, A=3pts, B=2pts, C=1pt) creates meaningful trade-offs
- **Draft safety net** (`guaranteeAffordablePicks`) — guarantees the pool always has enough cheap cards so neither side can ever get locked out of a legal pick

### 🃏 Snake Draft (`DraftScreen`)
- **Randomized snake order** so first-pick advantage rotates every game
- **10-point budget system** with a reserved-budget rule — you must keep 1pt per remaining pick, preventing dead-end situations
- **3-strategy CPU AI**:
  - 🟡 **Greedy (35%)** — takes the highest total stats it can afford
  - 🔴 **Spiteful (30%)** — denies the card the player would most want
  - 🔵 **Efficient (35%)** — optimizes for best stats-per-point value
- Real-time budget bars, animated pick flashes, and CPU "thinking" delays for authentic game feel

### ⚔️ Battle System (`BattleScreen`)
- **Move triangle** — ATTACK beats SPECIAL, SPECIAL beats DEFEND, DEFEND beats ATTACK
- **Dice-based damage** — `stat × dice roll × power multiplier`, shown transparently every round
- **Clash resolution** — when both players pick the same move, dice rolls break the tie
- **3v3 team battles** with live HP bars, ghost HP drain animations, and KO transitions
- **Full narration engine** — every game event has step-by-step dialogue with color coding and precise timing
- **Visual effects**: screen flashes, shake animations, floating damage numbers, speed burst lines, and randomized kanji overlays (力, 撃, 斬...)

### 🔊 Sound System (`SoundContext`)
- Context-based audio engine powering move selection, dice rolls, hits, clashes, KOs, victory/defeat, draft picks, and ambient music
- Global mute toggle persists across all screens

### 🏆 Result Screen
- Post-match squad summary with surviving HP bars and power ratings
- Win/loss outcome with bilingual Japanese flavour text (勝利 / 敗北)

---

## 🛠️ Tech Stack

| Tool | Usage |
|---|---|
| **React 18** | All UI, game state, and screen routing |
| **React Context API** | Global sound engine (`SoundContext`) |
| **CSS Modules** | Scoped, animated styles per screen |
| **Custom Hooks** | `useSound` for audio controls across components |
| **Vite** | Dev server and bundling |
| **Jikan API (MAL)** | Anime character images and metadata |

> No game engine. No Redux. No external state library. Pure React — proving the framework can power real-time interactive experiences well beyond typical CRUD apps.

---

## 🏗️ Architecture Highlights

- **`statEngine.js` as a pure utility module** — all game logic (stat generation, damage calculation, AI, tier system, draft safety) lives in one stateless, fully testable file with zero React dependencies
- **Ref + state dual-tracking in `DraftScreen`** — mutable refs keep AI auto-pick closures in sync without stale state bugs, while React state drives re-renders; a production-grade pattern for real-time game loops
- **Step-sequenced narration engine** — `after(ms, fn)` builds a timeout chain that plays out battle events like a cutscene, with all timeouts tracked in a ref and cleaned up on unmount
- **Ghost HP bar** — a `useRef` + `useEffect` pattern tracks previous HP to animate a trailing "drain" effect behind the real HP bar, identical to modern RPGs
- **Data-driven character system** — characters are plain objects; tier, cost, and stat display all derive from the same data at runtime with no duplication

---

## 📦 Getting Started

### Prerequisites
- Node.js 18+

### Installation

```bash
# Clone the repository
git clone https://github.com/Adogacodes/SHINKU
cd shinku

# Install dependencies
npm install

# Start the dev server
npm run dev
```

---

## 📁 Project Structure

```
shinku/
├── src/
│   ├── components/
│   │   ├── ModeSelect.jsx       # Main menu
│   │   ├── DraftScreen.jsx      # Snake draft + CPU AI
│   │   ├── BattleScreen.jsx     # Turn-based combat engine
│   │   └── ResultScreen.jsx     # Post-match summary
│   ├── context/
│   │   └── SoundContext.jsx     # Global audio engine
│   ├── data/
│   │   └── characters.js        # Character roster
│   ├── utils/
│   │   └── statEngine.js        # Pure game logic (no React)
│   ├── App.jsx
│   └── main.jsx
├── public/
│   └── sounds/
├── index.html
├── package.json
└── README.md
```

---

## 💡 Key Design Decisions

**Why pure React (no game engine)?**
Deliberately chose React over Phaser or Unity WebGL to demonstrate that complex, stateful, real-time game UIs are fully achievable in a standard frontend stack — a directly transferable skill for any interactive product role.

**Why a pure utility `statEngine.js`?**
Keeping all game logic framework-agnostic makes it testable in isolation and easy to migrate if the frontend changes. It's the same separation-of-concerns principle used in production backend service layers.

**Why refs alongside state in the draft?**
CPU auto-pick runs inside a `useEffect` with a `setTimeout`. Closures would capture stale state. Refs provide the latest values without causing re-render loops — a pattern that solves a real, non-trivial React problem.

---

## 🙌 Author

Built by **[Your Name]** — a frontend developer who builds things that are actually fun to use.

📬 vagotech0@gmail.com • 💼 [LinkedIn](#) • 🐙 https://github.com/Adogacodes

---

## 📄 License

MIT — feel free to fork, remix, and build your own arena.