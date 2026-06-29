import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import { getMyQuizzes, getQuizResultsSession } from '../api/quizApi';
import { startQuizSession } from '../api/sessionApi';
import logoIcon from '../assets/quizzy-logo.png';
import '../styles/myQuizzes.css';

const QUIZZES_LIMIT = 3;

function GlobeIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
      <path d="M2 12h20" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="16" r="1" />
      <rect x="3" y="10" width="18" height="12" rx="2" />
      <path d="M7 10V7a5 5 0 0 1 10 0v3" />
    </svg>
  );
}

function EditIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.375 2.625a1 1 0 0 1 3 3l-9.013 9.014a2 2 0 0 1-.853.505l-2.873.84a.5.5 0 0 1-.62-.62l.84-2.873a2 2 0 0 1 .506-.852z" />
    </svg>
  );
}

function PlayIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 5a2 2 0 0 1 3.008-1.728l11.997 6.998a2 2 0 0 1 .003 3.458l-12 7A2 2 0 0 1 5 19z" />
    </svg>
  );
}

function ChartIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 21v-6" />
      <path d="M12 21V3" />
      <path d="M19 21V9" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 12h14" />
      <path d="M12 5v14" />
    </svg>
  );
}

function getQuestionWord(count) {
  const mod10 = count % 10;
  const mod100 = count % 100;

  if (mod100 >= 11 && mod100 <= 14) {
    return 'вопросов';
  }

  if (mod10 === 1) {
    return 'вопрос';
  }

  if (mod10 >= 2 && mod10 <= 4) {
    return 'вопроса';
  }

  return 'вопросов';
}

function MyQuizzesPage({
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
  const [quizzes, setQuizzes] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [pageError, setPageError] = useState('');
  const [loadMoreError, setLoadMoreError] = useState('');
  const [launchingQuizId, setLaunchingQuizId] = useState(null);

  useEffect(() => {
    const token = sessionStorage.getItem('quizzy_token');

    if (!token) {
      setPageError('Требуется авторизация');
      setIsLoading(false);
      return;
    }

    let isMounted = true;

    async function loadQuizzes() {
      try {
        setIsLoading(true);
        const response = await getMyQuizzes(1, QUIZZES_LIMIT, token);

        if (!isMounted) {
          return;
        }

        setQuizzes(Array.isArray(response?.quizzes) ? response.quizzes : []);
        setHasMore(Boolean(response?.hasMore));
        setPage(1);
        setPageError('');
        setLoadMoreError('');
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setPageError(error.message || 'Не удалось загрузить мои квизы');
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadQuizzes();

    return () => {
      isMounted = false;
    };
  }, []);

  async function handleLoadMore() {
    const token = sessionStorage.getItem('quizzy_token');

    if (!token || isLoadingMore || !hasMore) {
      return;
    }

    try {
      setIsLoadingMore(true);
      setLoadMoreError('');
      const nextPage = page + 1;
      const response = await getMyQuizzes(nextPage, QUIZZES_LIMIT, token);

      setQuizzes((currentQuizzes) => [
        ...currentQuizzes,
        ...(Array.isArray(response?.quizzes) ? response.quizzes : []),
      ]);
      setHasMore(Boolean(response?.hasMore));
      setPage(nextPage);
    } catch (error) {
      setLoadMoreError(error.message || 'Не удалось загрузить мои квизы');
    } finally {
      setIsLoadingMore(false);
    }
  }

  async function handleStartQuiz(quizId) {
    const token = sessionStorage.getItem('quizzy_token');

    if (!token || launchingQuizId) {
      return;
    }

    try {
      setLaunchingQuizId(quizId);
      const session = await startQuizSession(quizId, token);
      navigate(`/sessions/${session.session_id}/waiting`);
    } catch (error) {
      setPageError(error.message || 'Не удалось запустить комнату');
    } finally {
      setLaunchingQuizId(null);
    }
  }

  async function handleOpenResults(quizId) {
    const token = sessionStorage.getItem('quizzy_token');

    if (!token) {
      setPageError('Требуется авторизация');
      return;
    }

    try {
      const payload = await getQuizResultsSession(quizId, token);
      navigate(payload?.redirect_to || `/results/${payload.session_id}`);
    } catch (error) {
      navigate('/my-quizzes');
      setPageError(error.message || 'Не удалось открыть результаты квиза');
    }
  }

  return (
    <div className="my-quizzes-page">
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

      <main className="my-quizzes-main">
        <div className="app-container my-quizzes-shell">
          <section className="my-quizzes-head">
            <h1>Мои квизы</h1>
            <button type="button" className="my-quizzes-create" onClick={onOpenCreateQuiz}>
              <span className="my-quizzes-create-icon">
                <PlusIcon />
              </span>
              <span>Создать квиз</span>
            </button>
          </section>

          {isLoading ? (
            <section className="my-quizzes-note-card">
              <p className="my-quizzes-note">Загрузка квизов...</p>
            </section>
          ) : pageError ? (
            <section className="my-quizzes-note-card">
              <p className="my-quizzes-note my-quizzes-note-error">{pageError}</p>
            </section>
          ) : quizzes.length === 0 ? (
            <section className="my-quizzes-empty-card">
              <p>Ничего не найдено</p>
            </section>
          ) : (
            <>
              <section className="my-quizzes-list">
                {quizzes.map((quiz) => {
                  const questionsCount = Number(quiz.questions_count) || 0;
                  const isPublic = quiz.access_type === 'public';
                  const hasResults = Boolean(quiz.has_results);
                  const canStartQuiz = questionsCount > 0;

                  return (
                    <article key={quiz.quiz_id} className="my-quiz-card">
                      <div className="my-quiz-card-top">
                        <div className="my-quiz-card-copy">
                          <h2>{quiz.title}</h2>
                          <div className="my-quiz-card-access">
                            <span className="my-quiz-card-access-icon">
                              {isPublic ? <GlobeIcon /> : <LockIcon />}
                            </span>
                            <span>{isPublic ? 'Публичный' : 'Приватный'}</span>
                          </div>
                        </div>

                        <div className="my-quiz-card-count">
                          {questionsCount} {getQuestionWord(questionsCount)}
                        </div>
                      </div>

                      <div className="my-quiz-card-divider" />

                      <div className="my-quiz-card-actions">
                        <button
                          type="button"
                          className="my-quiz-action my-quiz-action-outline"
                          onClick={() => navigate(`/quizzes/${quiz.quiz_id}/edit`)}
                        >
                          <span className="my-quiz-action-icon">
                            <EditIcon />
                          </span>
                          <span>Редактировать</span>
                        </button>

                        <button
                          type="button"
                          className="my-quiz-action my-quiz-action-primary"
                          onClick={() => handleStartQuiz(quiz.quiz_id)}
                          disabled={launchingQuizId === quiz.quiz_id || !canStartQuiz}
                        >
                          <span className="my-quiz-action-icon">
                            <PlayIcon />
                          </span>
                          <span>
                            {launchingQuizId === quiz.quiz_id ? 'Запуск...' : 'Запустить'}
                          </span>
                        </button>

                        <button
                          type="button"
                          className="my-quiz-action my-quiz-action-outline"
                          onClick={() => handleOpenResults(quiz.quiz_id)}
                          disabled={!hasResults}
                        >
                          <span className="my-quiz-action-icon">
                            <ChartIcon />
                          </span>
                          <span>Результаты</span>
                        </button>
                      </div>
                    </article>
                  );
                })}
              </section>

              {hasMore ? (
                <div className="my-quizzes-load-more-wrap">
                  <div className="my-quizzes-load-more-stack">
                    <button
                      type="button"
                      className="my-quizzes-load-more"
                      onClick={handleLoadMore}
                      disabled={isLoadingMore}
                    >
                      {isLoadingMore ? 'Загрузка...' : 'Показать еще'}
                    </button>
                    {loadMoreError ? (
                      <p className="my-quizzes-load-more-error">{loadMoreError}</p>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </>
          )}
        </div>
      </main>

      <footer className="home-footer">
        <div className="app-container home-footer-inner">
          <div className="home-brand home-footer-brand">
            <img src={logoIcon} alt="" className="home-brand-icon" />
            <span className="home-brand-name">Quizzy</span>
          </div>
          <p>Платформа для проведения квизов в реальном времени</p>
          <span>© 2026 Quizzy. Все права защищены</span>
        </div>
      </footer>
    </div>
  );
}

export default MyQuizzesPage;
