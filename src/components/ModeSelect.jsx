import styles from './ModeSelect.module.css';

const modes = [
  {
    key: 'lightning',
    icon: '⚡',
    title: 'LIGHTNING ROUND',
    jp: '稲妻',
    description:
      'A character flashes for 1.5 seconds. Memorise their stats. Pick their strongest stat from memory. Nail it — they join at full power. Miss — they join at half power.',
    tagLabel: 'MEMORY & KNOWLEDGE',
    tagClass: styles.cardTagLightning,
    cardClass: styles.lightning,
  },
  {
    key: 'race',
    icon: '🏃',
    title: 'RACE MODE',
    jp: 'レース',
    description:
      'Characters race across the screen at increasing speed. Tap to catch exactly 3. You see their name but not their stats — reflexes and anime knowledge decide your fate.',
    tagLabel: 'REFLEXES & INSTINCT',
    tagClass: styles.cardTagRace,
    cardClass: styles.race,
  },
];

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

      <div className={styles.cardsRow}>
        {modes.map((mode) => (
          <button
            key={mode.key}
            className={`${styles.card} ${mode.cardClass}`}
            onClick={() => onSelect(mode.key)}
          >
            <div className={`${styles.cardTag} ${mode.tagClass}`}>
              {mode.tagLabel}
            </div>
            <div className={styles.cardIcon}>{mode.icon}</div>
            <div className={styles.cardTitle}>{mode.title}</div>
            <div className={styles.cardJp}>{mode.jp}</div>
            <div className={styles.cardDivider} />
            <p className={styles.cardDesc}>{mode.description}</p>
            <div className={styles.cardCta}>SELECT MODE →</div>
          </button>
        ))}
      </div>

      <footer className={styles.footer}>
        <span className={styles.footerDot}>●</span>
        SHINKU v1.0 &nbsp;·&nbsp; BUILD YOUR LEGEND
        <span className={styles.footerDot}>●</span>
      </footer>

    </div>
  );
}
