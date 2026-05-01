import { useState } from 'react';
import { SoundProvider, useSound } from './context/SoundContext';
import ModeSelect   from './components/ModeSelect';
import DraftScreen  from './components/DraftScreen';
import BattleScreen from './components/BattleScreen';
import ResultScreen from './components/ResultScreen';

// Mute toggle sits on top of everything
function MuteButton() {
  const { toggleMute, isMuted } = useSound();
  const [muted, setMuted] = useState(false);

  const handleToggle = () => {
    const nowMuted = toggleMute();
    setMuted(nowMuted);
  };

  return (
    <button
      onClick={handleToggle}
      style={{
        position: 'fixed', top: 12, right: 14, zIndex: 9999,
        background: 'rgba(0,0,0,0.55)', border: '1px solid #555',
        borderRadius: 8, color: '#fff', fontSize: 18,
        padding: '4px 10px', cursor: 'pointer',
        backdropFilter: 'blur(4px)',
      }}
      title={muted ? 'Unmute' : 'Mute'}
    >
      {muted ? '🔇' : '🔊'}
    </button>
  );
}

function AppInner() {
  const [screen,     setScreen]     = useState('menu');
  const [playerTeam, setPlayerTeam] = useState([]);
  const [result,     setResult]     = useState(null);
  const { startMusic } = useSound();

  const goToBattle = (team) => {
    setPlayerTeam(team);
    startMusic(); // new random theme for each battle
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
      <MuteButton />
      {screen === 'menu'   && <ModeSelect onSelect={setScreen} />}
      {screen === 'draft'  && <DraftScreen onComplete={goToBattle} onBack={goToMenu} />}
      {screen === 'battle' && <BattleScreen playerTeam={playerTeam} onComplete={goToResult} />}
      {screen === 'result' && <ResultScreen result={result} playerTeam={playerTeam} onPlayAgain={goToMenu} />}
    </>
  );
}

export default function App() {
  return (
    <SoundProvider>
      <AppInner />
    </SoundProvider>
  );
}