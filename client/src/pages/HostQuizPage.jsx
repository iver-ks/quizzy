import { motion } from 'framer-motion';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getCurrentQuestion, getLiveLeaderboard } from '../api/sessionApi';
import Header from '../components/Header';
import { socket } from '../socket/socket';
import '../styles/hostQuiz.css';

function TimerIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <line x1="10" x2="14" y1="2" y2="2" />
      <line x1="12" x2="15" y1="14" y2="11" />
      <circle cx="12" cy="14" r="8" />
    </svg>
  );
}

function UsersIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <path d="M16 3.128a4 4 0 0 1 0 7.744" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <circle cx="9" cy="7" r="4" />
    </svg>
  );
}

function TrophyIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M10 14.66v1.626a2 2 0 0 1-.976 1.696A5 5 0 0 0 7 21.978" />
      <path d="M14 14.66v1.626a2 2 0 0 0 .976 1.696A5 5 0 0 1 17 21.978" />
      <path d="M18 9h1.5a1 1 0 0 0 0-5H18" />
      <path d="M4 22h16" />
      <path d="M6 9a6 6 0 0 0 12 0V3a1 1 0 0 0-1-1H7a1 1 0 0 0-1 1z" />
      <path d="M6 9H4.5a1 1 0 0 1 0-5H6" />
    </svg>
  );
}

function getPreciseSecondsLeft(expiresAt) {
  if (!expiresAt) {
    return 0;
  }

  return Math.max(0, (new Date(expiresAt).getTime() - Date.now()) / 1000);
}

function mapQuestionState(payload) {
  if (!payload) {
    return null;
  }

  return {
    sessionId: payload.session_id ?? payload.sessionId,
    quiz: payload.quiz ?? null,
    questionNumber: payload.question_number ?? payload.questionNumber,
    totalQuestions: payload.total_questions ?? payload.totalQuestions,
    participantsCount: payload.participants_count ?? payload.participantsCount ?? 0,
    answeredCount: payload.answered_count ?? payload.answeredCount ?? 0,
    optionStats: payload.option_stats ?? payload.optionStats ?? [],
    question: payload.question,
  };
}

function mapLeaderboardRows(rows) {
  if (!Array.isArray(rows)) {
    return [];
  }

  return rows.map((row, index) => ({
    place: Number(row.place ?? index + 1),
    user_id: Number(row.user_id),
    name: row.name || 'Участник',
    total_points: Number(row.total_points ?? 0),
  }));
}

function getAvatarLetter(name) {
  const value = typeof name === 'string' ? name.trim() : '';
  return value ? value.charAt(0).toUpperCase() : '?';
}

function getChangedUserIds(previousRows, nextRows) {
  if (!previousRows.length || !nextRows.length) {
    return [];
  }

  const previousIndexes = new Map(
    previousRows.map((item, index) => [item.user_id, index])
  );

  return nextRows
    .filter((item, index) => previousIndexes.has(item.user_id) && index < previousIndexes.get(item.user_id))
    .map((item) => item.user_id);
}

function HostQuizPage({
  currentUser,
  onLogout,
  onOpenHome,
  onOpenCreateQuiz,
  onJoinByCodeSuccess,
  onOpenProfile,
  onOpenResults,
  onOpenMyQuizzes,
}) {
  const navigate = useNavigate();
  const { sessionId } = useParams();
  const [quizState, setQuizState] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [pageError, setPageError] = useState('');
  const [leaderboardError, setLeaderboardError] = useState('');
  const [highlightedUserIds, setHighlightedUserIds] = useState(new Set());
  const previousLeaderboardRef = useRef([]);
  const highlightTimeoutRef = useRef(null);

  useEffect(() => {
    const token = sessionStorage.getItem('quizzy_token');
    const storedUser = sessionStorage.getItem('quizzy_user');

    if (!token || !sessionId) {
      setPageError('Требуется авторизация');
      setIsLoading(false);
      return undefined;
    }

    let userId = currentUser?.user_id ?? null;

    if (!userId && storedUser) {
      try {
        userId = JSON.parse(storedUser)?.user_id ?? null;
      } catch {
        userId = null;
      }
    }

    let isMounted = true;

    function applyLeaderboard(nextRows, { shouldHighlight = false } = {}) {
      const normalizedRows = mapLeaderboardRows(nextRows);

      if (highlightTimeoutRef.current) {
        window.clearTimeout(highlightTimeoutRef.current);
        highlightTimeoutRef.current = null;
      }

      if (shouldHighlight) {
        const changedUserIds = getChangedUserIds(previousLeaderboardRef.current, normalizedRows);

        if (changedUserIds.length > 0) {
          setHighlightedUserIds(new Set(changedUserIds));
          highlightTimeoutRef.current = window.setTimeout(() => {
            setHighlightedUserIds(new Set());
            highlightTimeoutRef.current = null;
          }, 1000);
        } else {
          setHighlightedUserIds(new Set());
        }
      } else {
        setHighlightedUserIds(new Set());
      }

      previousLeaderboardRef.current = normalizedRows;
      setLeaderboard(normalizedRows);
    }

    async function loadPageData() {
      try {
        setIsLoading(true);
        const questionResponse = await getCurrentQuestion(sessionId, token);

        if (!isMounted) {
          return;
        }

        const nextState = mapQuestionState(questionResponse);
        setQuizState(nextState);
        setTimeLeft(getPreciseSecondsLeft(nextState?.question?.expires_at));
        setPageError('');

        try {
          const leaderboardResponse = await getLiveLeaderboard(sessionId, token);

          if (!isMounted) {
            return;
          }

          applyLeaderboard(leaderboardResponse, { shouldHighlight: false });
          setLeaderboardError('');
        } catch (leaderboardLoadError) {
          if (!isMounted) {
            return;
          }

          previousLeaderboardRef.current = [];
          setLeaderboard([]);
          setLeaderboardError(
            leaderboardLoadError.status === 404
              ? 'Live-лидерборд станет доступен после перезапуска backend'
              : leaderboardLoadError.message || 'Не удалось загрузить лидерборд'
          );
        }
      } catch (error) {
        if (!isMounted) {
          return;
        }

        if (error.status === 400) {
          navigate(`/sessions/${sessionId}/leaderboard`);
          return;
        }

        setPageError(error.message || 'Не удалось загрузить текущий вопрос');
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    function handleQuestionStarted(payload) {
      const nextState = mapQuestionState(payload);
      setQuizState(nextState);
      setTimeLeft(getPreciseSecondsLeft(nextState?.question?.expires_at));
      setPageError('');
    }

    function handleAnswerSubmitted(payload) {
      setQuizState((current) =>
        current
          ? {
              ...current,
              answeredCount: payload.answeredCount,
              participantsCount: payload.participantsCount,
              optionStats: payload.optionStats,
            }
          : current
      );
    }

    function handleLeaderboardUpdated(payload) {
      applyLeaderboard(payload?.leaderboard, { shouldHighlight: true });
      setLeaderboardError('');
    }

    function handleQuestionFinished() {
      setTimeLeft(0);
    }

    function handleQuizFinished(payload) {
      navigate(payload?.redirectTo || `/results/${sessionId}`);
    }

    loadPageData();

    if (!socket.connected) {
      socket.connect();
    }

    if (userId) {
      socket.emit('join_session_room', {
        sessionId: Number(sessionId),
        userId: Number(userId),
        role: 'host',
      });
    }

    socket.on('question_started', handleQuestionStarted);
    socket.on('answer_submitted', handleAnswerSubmitted);
    socket.on('leaderboard_updated', handleLeaderboardUpdated);
    socket.on('question_finished', handleQuestionFinished);
    socket.on('quiz:finished', handleQuizFinished);
    socket.on('quiz_finished', handleQuizFinished);

    return () => {
      isMounted = false;
      socket.off('question_started', handleQuestionStarted);
      socket.off('answer_submitted', handleAnswerSubmitted);
      socket.off('leaderboard_updated', handleLeaderboardUpdated);
      socket.off('question_finished', handleQuestionFinished);
      socket.off('quiz:finished', handleQuizFinished);
      socket.off('quiz_finished', handleQuizFinished);
      if (highlightTimeoutRef.current) {
        window.clearTimeout(highlightTimeoutRef.current);
        highlightTimeoutRef.current = null;
      }
      previousLeaderboardRef.current = [];
      if (socket.connected) {
        socket.disconnect();
      }
    };
  }, [currentUser?.user_id, navigate, sessionId]);

  useEffect(() => {
    if (!quizState?.question?.expires_at) {
      return undefined;
    }

    const intervalId = window.setInterval(() => {
      setTimeLeft(getPreciseSecondsLeft(quizState.question.expires_at));
    }, 100);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [quizState?.question?.expires_at]);

  const question = quizState?.question;
  const questionNumber = quizState?.questionNumber || 0;
  const totalQuestions = quizState?.totalQuestions || 0;
  const totalParticipants = quizState?.participantsCount || 0;
  const answeredCount = quizState?.answeredCount || 0;
  const timerLabel = Math.ceil(timeLeft);
  const timerProgress = question?.time_limit_seconds
    ? Math.max(0, (timeLeft / question.time_limit_seconds) * 100)
    : 0;
  const optionStatsById = useMemo(
    () => new Map((quizState?.optionStats || []).map((item) => [item.option_id, item])),
    [quizState?.optionStats]
  );

  return (
    <div className="host-quiz-page">
      <Header
        userName={currentUser?.name || 'Quizzy'}
        userEmail={currentUser?.email || ''}
        onLogout={onLogout}
        onOpenHome={onOpenHome}
        onOpenCreateQuiz={onOpenCreateQuiz}
        onJoinByCodeSuccess={onJoinByCodeSuccess}
        onOpenProfile={onOpenProfile}
        onOpenResults={onOpenResults}
        onOpenMyQuizzes={onOpenMyQuizzes}
      />

      <main className="host-quiz-main">
        <div className="app-container host-quiz-layout">
          <section className="host-quiz-card">
            {isLoading ? (
              <p className="host-quiz-note">Загрузка вопроса...</p>
            ) : pageError ? (
              <p className="host-quiz-note host-quiz-note-error">{pageError}</p>
            ) : (
              <>
                <div className="host-quiz-top">
                  <div className="host-quiz-copy">
                    <span className="host-quiz-kicker">{quizState?.quiz?.title || 'Квиз'}</span>
                    <h1>
                      Вопрос {questionNumber} из {totalQuestions}
                    </h1>
                  </div>

                  <div className="host-quiz-timer">
                    <span className="host-quiz-timer-icon">
                      <TimerIcon />
                    </span>
                    <span>{timerLabel} сек</span>
                  </div>
                </div>

                <div className="host-quiz-progress">
                  <span className="host-timer-progress-fill" style={{ width: `${timerProgress}%` }} />
                </div>

                <div className="host-quiz-results">
                  <h2>{question?.question_text || 'Вопрос не найден'}</h2>

                  {question?.image_url ? (
                    <img
                      className="host-quiz-image"
                      src={`http://localhost:5000${question.image_url}`}
                      alt="Иллюстрация вопроса"
                    />
                  ) : null}

                  <div className="host-quiz-answers">
                    {(question?.options || []).map((answer) => {
                      const stat = optionStatsById.get(answer.option_id);

                      return (
                        <article key={answer.option_id} className="host-answer-card">
                          <div className="host-answer-top">
                            <span>{answer.option_text}</span>
                            <strong>{stat?.percent || 0}%</strong>
                          </div>
                          <div className="host-answer-progress">
                            <span className="host-answer-percent-fill" style={{ width: `${stat?.percent || 0}%` }} />
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </div>

                <div className="host-quiz-footer">
                  <div className="host-quiz-answered">
                    <span className="host-quiz-answered-icon">
                      <UsersIcon />
                    </span>
                    <span>
                      Ответили: <strong>{answeredCount} из {totalParticipants}</strong>
                    </span>
                  </div>
                </div>
              </>
            )}
          </section>

          <aside className="host-leaderboard-card">
            <div className="host-leaderboard-title">
              <span className="host-leaderboard-icon">
                <TrophyIcon />
              </span>
              <h2>Лидерборд</h2>
            </div>

            {isLoading ? (
              <p className="host-quiz-note">Загрузка лидерборда...</p>
            ) : pageError ? (
              <p className="host-quiz-note host-quiz-note-error">{pageError}</p>
            ) : leaderboardError ? (
              <p className="host-quiz-note">{leaderboardError}</p>
            ) : leaderboard.length === 0 ? (
              <p className="host-quiz-note">Участники пока не появились</p>
            ) : (
              <div className="host-leaderboard-list">
                {leaderboard.map((player) => (
                  <motion.article
                    key={player.user_id}
                    layout
                    transition={{ duration: 0.45, ease: 'easeOut' }}
                    className={`host-leaderboard-row${
                      highlightedUserIds.has(player.user_id) ? ' host-leaderboard-row-highlighted' : ''
                    }`}
                  >
                    <span className={`host-leaderboard-place place-${player.place}`}>#{player.place}</span>
                    <span className="host-leaderboard-avatar">{getAvatarLetter(player.name)}</span>
                    <span className="host-leaderboard-name" title={player.name}>
                      {player.name}
                    </span>
                    <strong className="host-leaderboard-score">{player.total_points}</strong>
                  </motion.article>
                ))}
              </div>
            )}
          </aside>
        </div>
      </main>
    </div>
  );
}

export default HostQuizPage;
