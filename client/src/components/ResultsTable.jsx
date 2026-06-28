import { motion } from 'framer-motion';

function getAvatarLetter(name) {
  const value = typeof name === 'string' ? name.trim() : '';
  return value ? value.charAt(0).toUpperCase() : '?';
}

function ResultsTable({ leaderboard, currentUserId }) {
  return (
    <section className="results-table-card">
      <div className="results-table">
        {leaderboard.map((player, index) => {
          const isCurrentUser = Number(currentUserId) === Number(player.userId);

          return (
            <motion.article
              key={player.userId}
              className={`results-row${isCurrentUser ? ' is-current-user' : ''}`}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.28, ease: 'easeOut', delay: 0.18 + index * 0.05 }}
            >
              <div className={`results-place place-${player.place}`}>{player.place}</div>
              <div className={`results-avatar${isCurrentUser ? ' is-current-user' : ''}`}>
                {getAvatarLetter(player.name)}
              </div>
              <div className="results-user">
                <strong>
                  {player.name}
                  {isCurrentUser ? <span> (вы)</span> : null}
                </strong>
              </div>
              <div className="results-score">{player.totalPoints}</div>
            </motion.article>
          );
        })}
      </div>
    </section>
  );
}

export default ResultsTable;
