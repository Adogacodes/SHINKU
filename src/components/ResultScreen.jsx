import styles from './ResultScreen.module.css';

const INITIAL_HP = 1000;

const hpClass = (hp) => {
  if (hp <= 0) return styles.dead;
  const pct = hp / INITIAL_HP;
  if (pct > 0.55) return styles.high;
  if (pct > 0.25) return styles.medium;
  return styles.low;
};

export default function ResultScreen({ result, playerTeam = [], onPlayAgain }) {
  const isWin = result === 'win';

  return (
    <div className={styles.root}>
      <div className={styles.speedLines} />

      {/* Ink splash accent */}
      <div className={`${styles.inkSplash} ${isWin ? styles.win : styles.lose}`} />

      {/* Outcome */}
      <div className={styles.outcomeWrap}>
        <div className={styles.outcomeIcon}>
          {isWin ? '🏆' : '💀'}
        </div>
        <div className={`${styles.outcomeTitle} ${isWin ? styles.win : styles.lose}`}>
          {isWin ? 'VICTORY' : 'DEFEATED'}
        </div>
        <div className={styles.outcomeJp}>
          {isWin ? '勝利 · GLORY IS YOURS' : '敗北 · TRAIN HARDER'}
        </div>
        <div className={`${styles.outcomeUnderline} ${isWin ? styles.win : styles.lose}`} />
        <p className={styles.outcomeSubtitle}>
          {isWin
            ? 'YOUR SQUAD DOMINATED THE ARENA.'
            : 'THE OPPONENT WAS TOO POWERFUL THIS TIME.'}
        </p>
      </div>

      {/* Team summary */}
      {playerTeam.length > 0 && (
        <div className={styles.summaryPanel}>
          <div className={styles.summaryTitle}>— YOUR SQUAD —</div>

          {playerTeam.map((fighter) => {
            const hp    = Math.max(0, fighter.hp ?? 0);
            const hpPct = (hp / INITIAL_HP) * 100;

            return (
              <div key={fighter.mal_id} className={styles.fighterRow}>
                <img
                  className={styles.fighterThumb}
                  src={fighter.image}
                  alt={fighter.name}
                  onError={(e) => {
                    e.target.src = `https://api.dicebear.com/7.x/bottts/svg?seed=${fighter.mal_id}`;
                  }}
                />

                <div className={styles.fighterInfo}>
                  <div className={styles.fighterName}>{fighter.name}</div>
                  <div className={styles.fighterAnime}>{fighter.anime}</div>
                  <div className={styles.hpBarWrap}>
                    <div className={styles.hpBarTrack}>
                      <div
                        className={`${styles.hpBarFill} ${hpClass(hp)}`}
                        style={{ width: `${hpPct}%` }}
                      />
                    </div>
                    <div className={styles.hpBarLabel}>{hp} HP</div>
                  </div>
                </div>

                <div
                  className={`${styles.powerBadge} ${
                    fighter.powerMultiplier === 1 ? styles.full : styles.half
                  }`}
                >
                  {fighter.powerMultiplier === 1 ? '100%' : '50%'}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Actions */}
      <div className={styles.actions}>
        <button className={styles.playAgainBtn} onClick={onPlayAgain}>
          {isWin ? '⚔️ FIGHT AGAIN' : '🔄 REMATCH'}
        </button>
        <button className={styles.changeModeBtn} onClick={onPlayAgain}>
          ← CHANGE MODE
        </button>
      </div>

      <footer className={styles.footer}>
        <span className={styles.footerDot}>●</span>
        SHINKU v1.0 &nbsp;·&nbsp; BUILD YOUR LEGEND
        <span className={styles.footerDot}>●</span>
      </footer>
    </div>
  );
}