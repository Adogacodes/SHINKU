import styles from './ModeSelect.module.css';

export default function ModeSelect({ onSelect }) {
  return (
    <div className={styles.root}>
      <div className={styles.speedLines} />

      <header className={styles.header}>
        <div className={styles.eyebrow}>— ANIME BATTLE ARENA —</div>
        <h1 className={styles.title}>
          <span className={styles.titleRed}>SH</span>INKU
        </h1>
        <p className={styles.titleJp}>真紅 · CRIMSON FURY</p>
        <div className={styles.titleUnderline} />
      </header>

      <p className={styles.subtitle}>
        DRAFT YOUR SQUAD. MASTER YOUR MOVES. CLAIM GLORY.
      </p>

      <div className={styles.card}>
        <div className={styles.cardTag}>⚔️ STRATEGY DRAFT</div>
        <div className={styles.cardIcon}>🏆</div>
        <div className={styles.cardTitle}>STAT DRAFT</div>
        <div className={styles.cardJp}>戦略 · STRATEGY</div>
        <div className={styles.cardDivider} />
        <p className={styles.cardDesc}>
          12 characters. 10 draft points. Pick 3 fighters
          that fit your budget — S-tier costs more, C-tier
          costs less. A balanced team beats a greedy one.
          Snake order randomised every game. Outsmart the CPU.
        </p>
        <button
          className={styles.cardCta}
          onClick={() => onSelect('draft')}
        >
          ENTER DRAFT →
        </button>
      </div>

      <footer className={styles.footer}>
        <span className={styles.footerDot}>◆</span>
        SHINKU v2.0 &nbsp;·&nbsp; BUILD YOUR LEGEND
        <span className={styles.footerDot}>◆</span>
      </footer>
    </div>
  );
}