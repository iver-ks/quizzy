const pool = require('../config/db');

function getPaginationParams(query) {
  const page = Number.parseInt(query.page, 10);
  const limit = Number.parseInt(query.limit, 10);

  return {
    page: Number.isInteger(page) && page > 0 ? page : 1,
    limit: Number.isInteger(limit) && limit > 0 ? Math.min(limit, 50) : 5,
  };
}

async function getMyResults(req, res) {
  const userId = Number(req.user.user_id);
  const { page, limit } = getPaginationParams(req.query);
  const offset = (page - 1) * limit;

  try {
    const result = await pool.query(
      `WITH latest_results AS (
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
       ),
       session_totals AS (
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
       )
       SELECT q.quiz_id,
              q.title AS quiz_title,
              lr.saved_at,
              lr.total_points,
              lr.place_in_leaderboard,
              session_totals.participants_count
       FROM latest_results lr
       JOIN quiz_sessions qs ON qs.session_id = lr.session_id
       JOIN quizzes q ON q.quiz_id = qs.quiz_id
       JOIN session_totals ON session_totals.session_id = lr.session_id
       ORDER BY lr.saved_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit + 1, offset]
    );

    const hasMore = result.rows.length > limit;
    const rows = hasMore ? result.rows.slice(0, limit) : result.rows;

    return res.json({
      results: rows.map((row) => ({
        quizId: Number(row.quiz_id),
        quizTitle: row.quiz_title,
        date: row.saved_at,
        score: Number(row.total_points),
        place: Number(row.place_in_leaderboard),
        participantsCount: Number(row.participants_count),
      })),
      hasMore,
    });
  } catch (error) {
    console.error('Get my results error:', error);
    return res.status(500).json({ message: 'Ошибка сервера при получении результатов' });
  }
}

module.exports = {
  getMyResults,
};
