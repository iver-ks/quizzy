import { useEffect, useState } from 'react';
import Header from '../components/Header';
import { getCurrentUser } from '../api/authApi';
import { getMyResults } from '../api/resultsApi';
import logoIcon from '../assets/quizzy-logo.png';
import '../styles/myResults.css';

const RESULTS_LIMIT = 5;

function formatResultDate(value) {
  if (!value) {
    return '';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

function MyResultsPage({
  currentUser,
  onLogout,
  onOpenHome,
  onOpenCreateQuiz,
  onJoinByCodeSuccess,
  onOpenProfile,
  onOpenResults,
  onOpenMyQuizzes,
}) {
  const [viewer, setViewer] = useState(currentUser || null);
  const [results, setResults] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [pageError, setPageError] = useState('');
  const [loadMoreError, setLoadMoreError] = useState('');

  useEffect(() => {
    const token = sessionStorage.getItem('quizzy_token');

    if (!token) {
      setPageError('Требуется авторизация');
      setIsLoading(false);
      return;
    }

    let isMounted = true;

    async function loadInitialData() {
      try {
        setIsLoading(true);

        const userPromise = currentUser ? Promise.resolve(currentUser) : getCurrentUser(token);
        const resultsResponse = await getMyResults(token, 1, RESULTS_LIMIT);
        const user = await userPromise;

        if (!isMounted) {
          return;
        }

        setViewer(user);
        setResults(Array.isArray(resultsResponse.results) ? resultsResponse.results : []);
        setHasMore(Boolean(resultsResponse.hasMore));
        setPage(1);
        setPageError('');
        setLoadMoreError('');
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setPageError(error.message || 'Не удалось загрузить результаты');
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadInitialData();

    return () => {
      isMounted = false;
    };
  }, [currentUser]);

  async function handleLoadMore() {
    const token = sessionStorage.getItem('quizzy_token');

    if (!token || isLoadingMore || !hasMore) {
      return;
    }

    try {
      setIsLoadingMore(true);
      setLoadMoreError('');
      const nextPage = page + 1;
      const response = await getMyResults(token, nextPage, RESULTS_LIMIT);

      setResults((currentResults) => [
        ...currentResults,
        ...(Array.isArray(response.results) ? response.results : []),
      ]);
      setHasMore(Boolean(response.hasMore));
      setPage(nextPage);
    } catch (error) {
      setLoadMoreError(error.message || 'Не удалось загрузить результаты');
    } finally {
      setIsLoadingMore(false);
    }
  }

  const displayName = viewer?.name || currentUser?.name || 'Quizzy';
  const displayEmail = viewer?.email || currentUser?.email || '';
  const hasResults = results.length > 0;

  return (
    <div className="my-results-page">
      <Header
        userName={displayName}
        userEmail={displayEmail}
        onLogout={onLogout}
        onOpenHome={onOpenHome}
        onOpenCreateQuiz={onOpenCreateQuiz}
        onJoinByCodeSuccess={onJoinByCodeSuccess}
        onOpenProfile={onOpenProfile}
        onOpenResults={onOpenResults}
        onOpenMyQuizzes={onOpenMyQuizzes}
      />

      <main className="my-results-main">
        <div className="app-container my-results-shell">
          <section className="my-results-header">
            <h1>Мои результаты</h1>
          </section>

          {isLoading ? (
            <section className="my-results-note-card">
              <p className="my-results-note">Загрузка результатов...</p>
            </section>
          ) : pageError ? (
            <section className="my-results-note-card">
              <p className="my-results-note my-results-note-error">{pageError}</p>
            </section>
          ) : hasResults ? (
            <>
              <section className="my-results-list">
                {results.map((item, index) => (
                  <article
                    key={`${item.quizId}-${item.date}-${index}`}
                    className="my-results-card"
                  >
                    <div className="my-results-card-copy">
                      <strong>{item.quizTitle}</strong>
                      <span>{formatResultDate(item.date)}</span>
                    </div>
                    <div className="my-results-card-meta">
                      <strong>{new Intl.NumberFormat('ru-RU').format(item.score)} очков</strong>
                      <span>
                        #{item.place} из {item.participantsCount}
                      </span>
                    </div>
                  </article>
                ))}
              </section>

              {hasMore ? (
                <div className="my-results-load-more-wrap">
                  <div className="my-results-load-more-stack">
                    <button
                      type="button"
                      className="my-results-load-more"
                      onClick={handleLoadMore}
                      disabled={isLoadingMore}
                    >
                      {isLoadingMore ? 'Загрузка...' : 'Показать еще'}
                    </button>
                    {loadMoreError ? (
                      <p className="my-results-load-more-error">{loadMoreError}</p>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </>
          ) : (
            <section className="my-results-empty-card">
              <p>Ничего не найдено</p>
            </section>
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

export default MyResultsPage;
