import { motion } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import ResultsPodium from '../components/ResultsPodium';
import ResultsTable from '../components/ResultsTable';
import { getLeaderboard, getParticipantSession, getResults } from '../api/sessionApi';
import '../styles/leaderboard.css';

function LeaderboardPage({ currentUser }) {
  const navigate = useNavigate();
  const { sessionId } = useParams();
  const [results, setResults] = useState({ quizTitle: '', leaderboard: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [pageError, setPageError] = useState('');

  const currentUserId = useMemo(() => {
    if (currentUser?.user_id) {
      return Number(currentUser.user_id);
    }

    const storedUser = sessionStorage.getItem('quizzy_user');

    if (!storedUser) {
      return null;
    }

    try {
      return Number(JSON.parse(storedUser)?.user_id ?? null);
    } catch {
      return null;
    }
  }, [currentUser?.user_id]);

  useEffect(() => {
    const token = sessionStorage.getItem('quizzy_token');

    if (!token || !sessionId) {
      setPageError('Требуется авторизация');
      setIsLoading(false);
      return undefined;
    }

    let isMounted = true;

    async function loadResults() {
      try {
        setIsLoading(true);
        let response;

        try {
          response = await getResults(sessionId, token);
        } catch (error) {
          if (error.status !== 404) {
            throw error;
          }

          const [legacyRows, sessionInfo] = await Promise.all([
            getLeaderboard(sessionId, token),
            getParticipantSession(sessionId, token).catch(() => null),
          ]);

          response = {
            quizTitle: sessionInfo?.quiz?.title || 'Квиз',
            leaderboard: legacyRows.map((row) => ({
              place: Number(row.place_in_leaderboard),
              userId: Number(row.user_id),
              name: row.name,
              totalPoints: Number(row.total_points),
            })),
          };
        }

        if (!isMounted) {
          return;
        }

        setResults({
          quizTitle: response.quizTitle || 'Квиз',
          leaderboard: Array.isArray(response.leaderboard) ? response.leaderboard : [],
        });
        setPageError('');
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setPageError(error.message || 'Не удалось загрузить результаты квиза');
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadResults();

    return () => {
      isMounted = false;
    };
  }, [sessionId]);

  return (
    <motion.div
      className="results-page"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
    >
      <main className="results-main">
        <div className="results-shell">
          {isLoading ? (
            <p className="results-note">Загрузка результатов...</p>
          ) : pageError ? (
            <p className="results-note results-note-error">{pageError}</p>
          ) : (
            <>
              <header className="results-header">
                <h1>Результаты квиза</h1>
                <p>{results.quizTitle}</p>
              </header>

              <ResultsPodium leaderboard={results.leaderboard} />
              <ResultsTable leaderboard={results.leaderboard} currentUserId={currentUserId} />

              <button
                type="button"
                className="results-home-button"
                onClick={() => navigate('/home')}
              >
                Вернуться на главную
              </button>
            </>
          )}
        </div>
      </main>
    </motion.div>
  );
}

export default LeaderboardPage;
