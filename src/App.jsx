import { useState } from 'react';
import ModeSelect   from './components/ModeSelect';
import DraftScreen  from './components/DraftScreen';
import BattleScreen from './components/BattleScreen';
import ResultScreen from './components/ResultScreen';

export default function App() {
  const [screen,     setScreen]     = useState('menu');
  const [playerTeam, setPlayerTeam] = useState([]);
  const [result,     setResult]     = useState(null);

  const goToBattle = (team) => {
    setPlayerTeam(team);
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
      {screen === 'menu'   && <ModeSelect onSelect={setScreen} />}
      {screen === 'draft'  && <DraftScreen onComplete={goToBattle} onBack={goToMenu} />}
      {screen === 'battle' && <BattleScreen playerTeam={playerTeam} onComplete={goToResult} />}
      {screen === 'result' && <ResultScreen result={result} playerTeam={playerTeam} onPlayAgain={goToMenu} />}
    </>
  );
}