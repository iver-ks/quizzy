import { useEffect, useMemo, useState } from 'react';
import { getPublicWaitingQuizzes } from '../api/quizApi';
import { joinSessionById } from '../api/sessionApi';
import logoIcon from '../assets/quizzy-logo.png';
import emptyStateImage from '../assets/images/no_quizs.png';
import Header from '../components/Header';
import '../styles/home.css';

const ALL_CATEGORIES_LABEL = 'Все';

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
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

function BookIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 7v14" />
      <path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z" />
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

function HomePage({ currentUser, onLogout, onOpenHome, onOpenCreateQuiz, onJoinByCodeSuccess }) {
  const [searchValue, setSearchValue] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(ALL_CATEGORIES_LABEL);
  const [publicQuizzes, setPublicQuizzes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingError, setLoadingError] = useState('');
  const [joinMessageByQuizId, setJoinMessageByQuizId] = useState({});
  const [joiningQuizId, setJoiningQuizId] = useState(null);

  useEffect(() => {
    let isMounted = true;
    const token = sessionStorage.getItem('quizzy_token');

    async function loadPublicQuizzes(showLoader = false) {
      try {
        if (showLoader && isMounted) {
          setIsLoading(true);
        }
        if (isMounted) {
          setLoadingError('');
        }

        const quizzes = await getPublicWaitingQuizzes(token);

        if (!isMounted) {
          return;
        }

        setPublicQuizzes(Array.isArray(quizzes) ? quizzes : []);
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setLoadingError(error.message || 'Не удалось загрузить публичные квизы');
      } finally {
        if (showLoader && isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadPublicQuizzes(true);

    const intervalId = window.setInterval(() => {
      loadPublicQuizzes(false);
    }, 1000);

    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
    };
  }, []);

  const categories = useMemo(() => {
    const uniqueCategories = Array.from(
      new Set(
        publicQuizzes
          .map((quiz) => quiz.category)
          .filter((category) => typeof category === 'string' && category.trim().length > 0)
      )
    ).sort((left, right) => left.localeCompare(right, 'ru'));

    return [ALL_CATEGORIES_LABEL, ...uniqueCategories];
  }, [publicQuizzes]);

  const filteredQuizzes = useMemo(() => {
    const normalizedSearch = searchValue.trim().toLowerCase();

    return publicQuizzes.filter((quiz) => {
      const matchesCategory =
        selectedCategory === ALL_CATEGORIES_LABEL || quiz.category === selectedCategory;
      const matchesSearch =
        normalizedSearch.length === 0 || quiz.title.toLowerCase().includes(normalizedSearch);

      return matchesCategory && matchesSearch;
    });
  }, [publicQuizzes, searchValue, selectedCategory]);

  const isSearchActive = searchValue.trim().length > 0;

  const handleJoinClick = async (quiz) => {
    const token = sessionStorage.getItem('quizzy_token');

    if (String(quiz.creator_id) === String(currentUser?.user_id)) {
      setJoinMessageByQuizId((current) => ({
        ...current,
        [quiz.quiz_id]: 'Автор не может подключиться к своему квизу как участник',
      }));
      return;
    }

    if (!token) {
      setJoinMessageByQuizId((current) => ({
        ...current,
        [quiz.quiz_id]: 'Требуется авторизация',
      }));
      return;
    }

    try {
      setJoiningQuizId(quiz.quiz_id);
      setJoinMessageByQuizId((current) => ({
        ...current,
        [quiz.quiz_id]: '',
      }));
      const session = await joinSessionById(quiz.session_id, token);
      onJoinByCodeSuccess?.(session);
    } catch (error) {
      setJoinMessageByQuizId((current) => ({
        ...current,
        [quiz.quiz_id]: error.message || 'Не удалось подключиться к комнате',
      }));
    } finally {
      setJoiningQuizId(null);
    }
  };

  return (
    <div className="home-page">
      <Header
        userName={currentUser?.name || 'Quizzy'}
        onLogout={onLogout}
        onOpenHome={onOpenHome}
        onOpenCreateQuiz={onOpenCreateQuiz}
        onJoinByCodeSuccess={onJoinByCodeSuccess}
      />

      <main className="home-main">
        <div className="app-container">
          <section className="home-intro">
            <h1>Публичные квизы</h1>
            <p>Выберите открытый квиз и подключайтесь к игре в реальном времени</p>
          </section>

          <section className="home-toolbar">
            <label className={`home-search${isSearchActive ? ' is-active' : ''}`} aria-label="Поиск квиза">
              <span className="home-search-icon">
                <SearchIcon />
              </span>
              <input
                type="text"
                placeholder="Поиск по названию..."
                value={searchValue}
                onChange={(event) => setSearchValue(event.target.value)}
              />
            </label>

            <label className="home-select-wrap" aria-label="Фильтр по категории">
              <select
                value={selectedCategory}
                onChange={(event) => setSelectedCategory(event.target.value)}
              >
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </label>
          </section>

          {isLoading ? (
            <section className="home-status-card">
              <p>Загрузка квизов...</p>
            </section>
          ) : loadingError ? (
            <section className="home-status-card">
              <p>{loadingError}</p>
            </section>
          ) : filteredQuizzes.length > 0 ? (
            <section className="home-grid">
              {filteredQuizzes.map((quiz) => (
                <article key={quiz.session_id} className="quiz-public-card">
                  <div className="quiz-public-top">
                    <h2 title={quiz.title}>{quiz.title}</h2>
                    <div className="quiz-public-players">
                      <span className="quiz-inline-icon">
                        <UsersIcon />
                      </span>
                      <span>{quiz.participants_count}</span>
                    </div>
                  </div>

                  <span
                    className={`quiz-badge quiz-badge-${quiz.category
                      .toLowerCase()
                      .replace(/[^a-zа-яё0-9]+/gi, '-')}`}
                  >
                    {quiz.category}
                  </span>

                  <div className="quiz-public-meta">
                    <div className="quiz-meta-row">
                      <span className="quiz-inline-icon">
                        <BookIcon />
                      </span>
                      <span>
                        {quiz.questions_count} {getQuestionWord(Number(quiz.questions_count) || 0)}
                      </span>
                    </div>
                    <p>Автор: {quiz.creator_name}</p>
                  </div>

                  <button
                    type="button"
                    className="quiz-public-join"
                    onClick={() => handleJoinClick(quiz)}
                    disabled={joiningQuizId === quiz.quiz_id}
                  >
                    {joiningQuizId === quiz.quiz_id ? 'Подключение...' : 'Подключиться'}
                  </button>

                  {joinMessageByQuizId[quiz.quiz_id] ? (
                    <p
                      className={`quiz-public-note${
                        joinMessageByQuizId[quiz.quiz_id] ===
                        'Автор не может подключиться к своему квизу как участник'
                          ? ' is-error'
                          : ''
                      }`}
                    >
                      {joinMessageByQuizId[quiz.quiz_id]}
                    </p>
                  ) : null}
                </article>
              ))}
            </section>
          ) : (
            <section className="home-empty-card">
              <img src={emptyStateImage} alt="" className="home-empty-image" />
              <p>Сейчас нет доступных квизов для подключения</p>
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

export default HomePage;
