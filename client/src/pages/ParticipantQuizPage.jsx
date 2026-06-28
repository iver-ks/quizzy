import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getCurrentQuestion, submitAnswer } from '../api/sessionApi';
import { socket } from '../socket/socket';
import '../styles/participantQuiz.css';

function TimerIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <line x1="10" x2="14" y1="2" y2="2" />
      <line x1="12" x2="15" y1="14" y2="11" />
      <circle cx="12" cy="14" r="8" />
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
    currentUserAnswered: Boolean(payload.current_user_answered),
    question: payload.question,
  };
}

function ParticipantQuizPage() {
  const navigate = useNavigate();
  const { sessionId } = useParams();
  const [selectedAnswers, setSelectedAnswers] = useState([]);
  const [quizState, setQuizState] = useState(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pageError, setPageError] = useState('');
  const [infoMessage, setInfoMessage] = useState('');

  useEffect(() => {
    const token = sessionStorage.getItem('quizzy_token');
    const storedUser = sessionStorage.getItem('quizzy_user');

    if (!token || !sessionId) {
      setPageError('Требуется авторизация');
      setIsLoading(false);
      return undefined;
    }

    let userId = null;

    if (storedUser) {
      try {
        userId = JSON.parse(storedUser)?.user_id ?? null;
      } catch {
        userId = null;
      }
    }

    let isMounted = true;

    async function loadCurrentQuestion() {
      try {
        setIsLoading(true);
        const response = await getCurrentQuestion(sessionId, token);

        if (!isMounted) {
          return;
        }

        const nextState = mapQuestionState(response);
        setQuizState(nextState);
        setTimeLeft(getPreciseSecondsLeft(nextState?.question?.expires_at));
        setSelectedAnswers([]);
        setPageError('');
        setInfoMessage(nextState?.currentUserAnswered ? 'Ответ уже принят' : '');
      } catch (error) {
        if (!isMounted) {
          return;
        }

        if (error.status === 400) {
          navigate(`/sessions/${sessionId}/leaderboard`);
          return;
        }

        setPageError(error.message || 'Не удалось загрузить вопрос');
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
      setSelectedAnswers([]);
      setInfoMessage('');
      setPageError('');
      setIsSubmitting(false);
    }

    function handleQuestionFinished() {
      setTimeLeft(0);
      setInfoMessage((current) => current || 'Время на вопрос истекло');
    }

    function handleQuizFinished(payload) {
      navigate(payload?.redirectTo || `/results/${sessionId}`);
    }

    loadCurrentQuestion();

    if (!socket.connected) {
      socket.connect();
    }

    if (userId) {
      socket.emit('join_session_room', {
        sessionId: Number(sessionId),
        userId: Number(userId),
        role: 'participant',
      });
    }

    socket.on('question_started', handleQuestionStarted);
    socket.on('question_finished', handleQuestionFinished);
    socket.on('quiz:finished', handleQuizFinished);
    socket.on('quiz_finished', handleQuizFinished);

    return () => {
      isMounted = false;
      socket.off('question_started', handleQuestionStarted);
      socket.off('question_finished', handleQuestionFinished);
      socket.off('quiz:finished', handleQuizFinished);
      socket.off('quiz_finished', handleQuizFinished);
      if (socket.connected) {
        socket.disconnect();
      }
    };
  }, [navigate, sessionId]);

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
  const timerLabel = Math.ceil(timeLeft);
  const timerProgress = question?.time_limit_seconds
    ? Math.max(0, (timeLeft / question.time_limit_seconds) * 100)
    : 0;
  const answerSubmitted = Boolean(quizState?.currentUserAnswered);
  const answersDisabled = isSubmitting || answerSubmitted || timeLeft <= 0;
  const canSubmitAnswer = !answersDisabled && selectedAnswers.length > 0;
  const selectedSet = useMemo(() => new Set(selectedAnswers), [selectedAnswers]);

  async function sendAnswer(optionIds) {
    const token = sessionStorage.getItem('quizzy_token');

    if (!token || !sessionId || !question?.question_id || optionIds.length === 0) {
      return;
    }

    try {
      setIsSubmitting(true);
      setPageError('');
      const response = await submitAnswer(
        sessionId,
        {
          question_id: question.question_id,
          selected_options: optionIds,
        },
        token
      );

      setQuizState((current) =>
        current
          ? {
              ...current,
              currentUserAnswered: true,
              answeredCount: current.answeredCount,
            }
          : current
      );
      setInfoMessage(response.message || 'Ответ принят');
    } catch (error) {
      setPageError(error.message || 'Не удалось отправить ответ');
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleOptionClick(optionId) {
    if (answersDisabled) {
      return;
    }

    if (question?.answer_type === 'multiple') {
      setSelectedAnswers((current) =>
        current.includes(optionId)
          ? current.filter((id) => id !== optionId)
          : [...current, optionId]
      );
      return;
    }

    setSelectedAnswers([optionId]);
  }

  async function handleSubmitAnswer() {
    if (!canSubmitAnswer) {
      return;
    }

    await sendAnswer(selectedAnswers);
  }

  return (
    <div className="participant-quiz-page">
      <main className="participant-quiz-main">
        <div className="participant-quiz-shell">
          {isLoading ? (
            <section className="participant-quiz-card">
              <p className="participant-quiz-note">Загрузка вопроса...</p>
            </section>
          ) : pageError ? (
            <section className="participant-quiz-card">
              <p className="participant-quiz-note participant-quiz-note-error">{pageError}</p>
            </section>
          ) : (
            <>
              <section className="participant-quiz-topbar">
                <div className="participant-quiz-title-block">
                  <span className="participant-quiz-kicker">{quizState?.quiz?.title || 'Квиз'}</span>
                  <span className="participant-quiz-step">
                    Вопрос {questionNumber} из {totalQuestions}
                  </span>
                </div>

                <div className="participant-quiz-timer">
                  <span className="participant-quiz-timer-icon">
                    <TimerIcon />
                  </span>
                  <span>{timerLabel} сек</span>
                </div>
              </section>

              <div className="participant-quiz-progress" aria-hidden="true">
                <span className="participant-timer-progress-fill" style={{ width: `${timerProgress}%` }} />
              </div>

              <section className="participant-quiz-card">
                <h1>{question?.question_text || 'Вопрос не найден'}</h1>

                {question?.image_url ? (
                  <img
                    className="participant-quiz-image"
                    src={`http://localhost:5000${question.image_url}`}
                    alt="Иллюстрация вопроса"
                  />
                ) : null}

                <div className="participant-quiz-grid">
                  {(question?.options || []).map((answer) => {
                    const isSelected = selectedSet.has(answer.option_id);

                    return (
                      <button
                        key={answer.option_id}
                        type="button"
                        className={`participant-quiz-answer${isSelected ? ' is-selected' : ''}`}
                        onClick={() => handleOptionClick(answer.option_id)}
                        disabled={answersDisabled}
                      >
                        {answer.option_text}
                      </button>
                    );
                  })}
                </div>

                <div className="participant-quiz-actions">
                  {answerSubmitted ? (
                    <p className="participant-quiz-answer-accepted">Ответ принят</p>
                  ) : (
                    <button
                      type="button"
                      className="participant-quiz-submit"
                      disabled={!canSubmitAnswer}
                      onClick={handleSubmitAnswer}
                    >
                      {isSubmitting ? 'Отправка...' : 'Ответить'}
                    </button>
                  )}
                </div>

                {infoMessage && !answerSubmitted ? <p className="participant-quiz-note">{infoMessage}</p> : null}
              </section>
            </>
          )}
        </div>
      </main>
    </div>
  );
}

export default ParticipantQuizPage;
