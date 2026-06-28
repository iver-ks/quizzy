import { motion } from 'framer-motion';

const PODIUM_CONFIG = {
  1: {
    columnClassName: 'results-podium-column place-1',
    avatarClassName: 'results-podium-avatar place-1',
    glowClassName: 'results-podium-glow place-1',
  },
  2: {
    columnClassName: 'results-podium-column place-2',
    avatarClassName: 'results-podium-avatar place-2',
    glowClassName: 'results-podium-glow place-2',
  },
  3: {
    columnClassName: 'results-podium-column place-3',
    avatarClassName: 'results-podium-avatar place-3',
    glowClassName: 'results-podium-glow place-3',
  },
};

function getAvatarLetter(name) {
  const value = typeof name === 'string' ? name.trim() : '';
  return value ? value.charAt(0).toUpperCase() : '?';
}

function ResultsPodiumCard({ player }) {
  if (!player) {
    return <div className="results-podium-slot is-empty" aria-hidden="true" />;
  }

  const config = PODIUM_CONFIG[player.place] || PODIUM_CONFIG[3];

  return (
    <motion.article
      className={`results-podium-slot place-${player.place}`}
      initial={{ opacity: 0, y: 32 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut', delay: 0.08 * player.place }}
    >
      <motion.div
        className={config.glowClassName}
        initial={{ scale: 0.85, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.38, ease: 'easeOut', delay: 0.12 * player.place }}
      >
        <div className={config.avatarClassName}>{getAvatarLetter(player.name)}</div>
      </motion.div>
      <div className="results-podium-meta">
        <strong>{player.name}</strong>
        <span>{player.totalPoints}</span>
      </div>
      <motion.div
        className={config.columnClassName}
        initial={{ scaleY: 0 }}
        animate={{ scaleY: 1 }}
        transition={{ duration: 0.42, ease: 'easeOut', delay: 0.1 * player.place }}
      />
    </motion.article>
  );
}

function ResultsPodium({ leaderboard }) {
  const topThreeByPlace = [2, 1, 3].map((place) =>
    leaderboard.find((player) => player.place === place) || null
  );

  return (
    <section className="results-podium" aria-label="Пьедестал лидеров">
      {topThreeByPlace.map((player, index) => (
        <ResultsPodiumCard
          key={player?.userId ?? `empty-${index}`}
          player={player}
        />
      ))}
    </section>
  );
}

export default ResultsPodium;
