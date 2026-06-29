const pool = require('../config/db');

const latestResultsCte = `
  WITH latest_results AS (
    SELECT session_id,
           user_id,
           total_points,
           place_in_leaderboard,
           saved_at
    FROM (
      SELECT r.*,
             ROW_NUMBER() OVER (
               PARTITION BY r.session_id, r.user_id
               ORDER BY r.saved_at DESC, r.result_id DESC
             ) AS row_num
      FROM results r
      WHERE r.user_id = $1
    ) ranked_results
    WHERE row_num = 1
  )
`;

async function getProfile(req, res) {
  const userId = Number(req.user.user_id);

  try {
    const [userResult, statsResult, recentResultsResult] = await Promise.all([
      pool.query(
        `SELECT user_id, name, email
         FROM users
         WHERE user_id = $1
         LIMIT 1`,
        [userId]
      ),
      pool.query(
        `${latestResultsCte}
         SELECT
           (SELECT COUNT(*)::int FROM latest_results) AS quizzes_taken,
           (SELECT COUNT(*)::int FROM quizzes WHERE creator_id = $1) AS quizzes_created,
           COALESCE((SELECT MAX(total_points)::int FROM latest_results), 0) AS best_score,
           COALESCE((SELECT ROUND(AVG(total_points))::int FROM latest_results), 0) AS average_score`,
        [userId]
      ),
      pool.query(
        `${latestResultsCte}
         SELECT
           q.title AS quiz_title,
           lr.total_points,
           lr.place_in_leaderboard,
           session_totals.participants_count,
           lr.saved_at
         FROM latest_results lr
         JOIN quiz_sessions qs ON qs.session_id = lr.session_id
         JOIN quizzes q ON q.quiz_id = qs.quiz_id
         JOIN (
           SELECT session_id, COUNT(*)::int AS participants_count
           FROM (
             SELECT session_id,
                    user_id,
                    ROW_NUMBER() OVER (
                      PARTITION BY session_id, user_id
                      ORDER BY saved_at DESC, result_id DESC
                    ) AS row_num
             FROM results
           ) ranked_session_results
           WHERE row_num = 1
           GROUP BY session_id
         ) session_totals ON session_totals.session_id = lr.session_id
         ORDER BY lr.saved_at DESC
         LIMIT 3`,
        [userId]
      ),
    ]);

    if (userResult.rows.length === 0) {
      return res.status(404).json({ message: 'Пользователь не найден' });
    }

    const user = userResult.rows[0];
    const stats = statsResult.rows[0];

    return res.json({
      name: user.name,
      email: user.email,
      stats: {
        completedQuizzes: Number(stats.quizzes_taken || 0),
        createdQuizzes: Number(stats.quizzes_created || 0),
        bestScore: Number(stats.best_score || 0),
        averageScore: Number(stats.average_score || 0),
      },
      recentResults: recentResultsResult.rows.map((row) => ({
        quizTitle: row.quiz_title,
        date: row.saved_at,
        score: Number(row.total_points),
        place: Number(row.place_in_leaderboard),
        participantsCount: Number(row.participants_count),
      })),
    });
  } catch (error) {
    console.error('Get profile error:', error);
    return res.status(500).json({ message: 'Ошибка сервера при получении профиля' });
  }
}

module.exports = {
  getProfile,
};
