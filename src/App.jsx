import { useState } from 'react';
import { useCharacters } from './hooks/useCharacters';
import ModeSelect     from './components/ModeSelect';
import LightningRound from './components/LightningRound';
import RaceMode       from './components/RaceMode';
import BattleScreen   from './components/BattleScreen';
import ResultScreen   from './components/ResultScreen';

export default function App() {
  const [screen, setScreen]         = useState('menu');
  const [playerTeam, setPlayerTeam] = useState([]);
  const [result, setResult]         = useState(null);

  // Fetch once at app level — shared across all screens
  // 20 characters gives enough pool for player team + opponent team
  const { characters, loading } = useCharacters(20);

  const goToBattle = (team) => {
    // Ensure team always has exactly 3 fighters
    // If Race Mode caught fewer than 3, pad with random characters
    // from the pool that aren't already in the team
    const usedIds  = new Set(team.map((c) => c.mal_id));
    const fallback = characters
      .filter((c) => !usedIds.has(c.mal_id))
      .sort(() => Math.random() - 0.5);

    const paddedTeam = [...team];
    while (paddedTeam.length < 3 && fallback.length > 0) {
      const next = fallback.shift();
      paddedTeam.push({
        ...next,
        hp:              1000,
        powerMultiplier: 0.75, // penalty for missing a catch
      });
    }

    setPlayerTeam(paddedTeam);
    setScreen('battle');
  };

  const goToResult = (outcome) => {
    setResult(outcome);
    setScreen('result');
  };

  const goToMenu = () => {
    setScreen('menu');
    setPlayerTeam([]);
    setResult(null);
  };

  return (
    <>
      {screen === 'menu' && (
        <ModeSelect onSelect={setScreen} />
      )}

      {screen === 'lightning' && (
        <LightningRound
          onComplete={goToBattle}
          onBack={goToMenu}
        />
      )}

      {screen === 'race' && (
        <RaceMode
          onComplete={goToBattle}
          onBack={goToMenu}
        />
      )}

      {screen === 'battle' && (
        <BattleScreen
          playerTeam={playerTeam}
          allCharacters={characters}
          onComplete={goToResult}
        />
      )}

      {screen === 'result' && (
        <ResultScreen
          result={result}
          playerTeam={playerTeam}
          onPlayAgain={goToMenu}
        />
      )}
    </>
  );
}