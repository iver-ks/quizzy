import { useMemo, useState } from 'react';
import logoIcon from '../assets/quizzy-logo.png';
import emptyStateImage from '../assets/images/no_quizs.png';
import '../styles/home.css';

const categories = ['Все', 'История', 'Математика', 'IT', 'Биология', 'Языки', 'Другое'];
const userName = 'Ксения';

const publicQuizzes = [
  {
    title: 'История России XIX века',
    category: 'История',
    questions: 15,
    host: 'Алексей К.',
    players: '2/10',
  },
  {
    title: 'Математика: Алгебра 9 класс',
    category: 'Математика',
    questions: 20,
    host: 'Мария С.',
    players: '7/10',
  },
  {
    title: 'Общие знания: Мировая культура',
    category: 'Другое',
    questions: 12,
    host: 'Дмитрий П.',
    players: '5/12',
  },
  {
    title: 'Программирование на Python',
    category: 'IT',
    questions: 18,
    host: 'Анна В.',
    players: '9/15',
  },
  {
    title: 'Биология: Клетка и её строение',
    category: 'Биология',
    questions: 10,
    host: 'Сергей Н.',
    players: '3/10',
  },
  {
    title: 'Английский язык: Intermediate',
    category: 'Языки',
    questions: 25,
    host: 'Ольга Т.',
    players: '6/15',
  },
];

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

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 12h14" />
      <path d="M12 5v14" />
    </svg>
  );
}

function HomePage() {
  const [searchValue, setSearchValue] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Все');
  const [isCategoryFocused, setIsCategoryFocused] = useState(false);

  const filteredQuizzes = useMemo(() => {
    const normalizedSearch = searchValue.trim().toLowerCase();

    return publicQuizzes.filter((quiz) => {
      const matchesCategory = selectedCategory === 'Все' || quiz.category === selectedCategory;
      const matchesSearch =
        normalizedSearch.length === 0 || quiz.title.toLowerCase().includes(normalizedSearch);

      return matchesCategory && matchesSearch;
    });
  }, [searchValue, selectedCategory]);

  const isSearchActive = searchValue.trim().length > 0;
  const isCategoryActive = selectedCategory !== 'Все' && !isCategoryFocused;

  return (
    <div className="home-page">
      <header className="home-header home-container">
        <div className="home-brand">
          <img src={logoIcon} alt="" className="home-brand-icon" />
          <span className="home-brand-name">Quizzy</span>
        </div>

        <div className="home-header-actions">
          <button type="button" className="home-action home-action-light">
            Подключиться по коду
          </button>
          <button type="button" className="home-action home-action-primary">
            <span className="home-action-icon">
              <PlusIcon />
            </span>
            <span>Создать квиз</span>
          </button>
          <div className="home-avatar" aria-label={`Профиль пользователя ${userName}`}>
            {userName.charAt(0)}
          </div>
        </div>
      </header>

      <main className="home-main">
        <div className="home-container">
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

            <label
              className={`home-select-wrap${isCategoryActive ? ' is-active' : ''}`}
              aria-label="Фильтр по категории"
            >
              <select
                value={selectedCategory}
                onPointerDown={() => setIsCategoryFocused(true)}
                onFocus={() => setIsCategoryFocused(true)}
                onBlur={() => setIsCategoryFocused(false)}
                onChange={(event) => {
                  setSelectedCategory(event.target.value);
                  setIsCategoryFocused(false);
                }}
              >
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </label>
          </section>

          {filteredQuizzes.length > 0 ? (
            <section className="home-grid">
              {filteredQuizzes.map((quiz) => (
                <article key={`${quiz.title}-${quiz.host}`} className="quiz-public-card">
                  <div className="quiz-public-top">
                    <h2 title={quiz.title}>{quiz.title}</h2>
                    <div className="quiz-public-players">
                      <span className="quiz-inline-icon">
                        <UsersIcon />
                      </span>
                      <span>{quiz.players}</span>
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
                      <span>{quiz.questions} вопросов</span>
                    </div>
                    <p>Организатор: {quiz.host}</p>
                  </div>

                  <button type="button" className="quiz-public-join">
                    Подключиться
                  </button>
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
        <div className="home-container home-footer-inner">
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
