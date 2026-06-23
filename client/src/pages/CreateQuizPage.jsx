import { useState } from 'react';
import logoIcon from '../assets/quizzy-logo.png';
import '../styles/createQuiz.css';

const userName = 'Ксения';

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 12h14" />
      <path d="M12 5v14" />
    </svg>
  );
}

function ArrowLeftIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m12 19-7-7 7-7" />
      <path d="M19 12H5" />
    </svg>
  );
}

function ArrowRightIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 12h14" />
      <path d="m12 5 7 7-7 7" />
    </svg>
  );
}

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

function CreateQuizPage({ onOpenHome }) {
  const [accessType, setAccessType] = useState('public');

  return (
    <div className="create-quiz-page">
      <header className="create-quiz-header create-quiz-container">
        <div className="create-quiz-brand">
          <img src={logoIcon} alt="" className="create-quiz-brand-icon" />
          <span className="create-quiz-brand-name">Quizzy</span>
        </div>

        <div className="create-quiz-header-actions">
          <button type="button" className="create-quiz-action create-quiz-action-light">
            Подключиться по коду
          </button>
          <button type="button" className="create-quiz-action create-quiz-action-primary">
            <span className="create-quiz-action-icon">
              <PlusIcon />
            </span>
            <span>Создать квиз</span>
          </button>
          <div className="create-quiz-avatar" aria-label={`Профиль пользователя ${userName}`}>
            {userName.charAt(0)}
          </div>
        </div>
      </header>

      <main className="create-quiz-main">
        <div className="create-quiz-container create-quiz-content">
          <div className="create-quiz-title-row">
            <button type="button" className="create-quiz-back" onClick={onOpenHome}>
              <ArrowLeftIcon />
            </button>
            <h1>Создать квиз</h1>
          </div>

          <section className="create-quiz-card">
            <form className="create-quiz-form" onSubmit={(event) => event.preventDefault()}>
              <div className="create-quiz-field">
                <label htmlFor="quiz-title">Название квиза</label>
                <input
                  id="quiz-title"
                  type="text"
                  placeholder="Например: История России XIX века"
                />
              </div>

              <div className="create-quiz-field">
                <label htmlFor="quiz-description">Описание</label>
                <textarea
                  id="quiz-description"
                  placeholder="Краткие описание квиза..."
                />
              </div>

              <div className="create-quiz-field">
                <label htmlFor="quiz-category">Категория</label>
                <div className="create-quiz-select-wrap">
                  <select id="quiz-category" defaultValue="История">
                    <option value="История">История</option>
                    <option value="Математика">Математика</option>
                    <option value="Другое">Другое</option>
                    <option value="IT">IT</option>
                    <option value="Биология">Биология</option>
                    <option value="Языки">Языки</option>
                  </select>
                </div>
              </div>

              <div className="create-quiz-field">
                <span className="create-quiz-field-title">Тип доступа</span>
                <div className="create-quiz-access-grid">
                  <button
                    type="button"
                    className={`create-quiz-access-card${
                      accessType === 'public' ? ' is-active' : ''
                    }`}
                    onClick={() => setAccessType('public')}
                  >
                    <span className="create-quiz-access-icon">
                      <GlobeIcon />
                    </span>
                    <span className="create-quiz-access-copy">
                      <strong>Публичный</strong>
                      <span>Виден всем</span>
                    </span>
                  </button>

                  <button
                    type="button"
                    className={`create-quiz-access-card${
                      accessType === 'private' ? ' is-active' : ''
                    }`}
                    onClick={() => setAccessType('private')}
                  >
                    <span className="create-quiz-access-icon">
                      <LockIcon />
                    </span>
                    <span className="create-quiz-access-copy">
                      <strong>Приватный</strong>
                      <span>Только по коду</span>
                    </span>
                  </button>
                </div>
              </div>

              <div className="create-quiz-actions-row">
                <button type="button" className="create-quiz-secondary-btn">
                  Сохранить черновик
                </button>
                <button type="submit" className="create-quiz-primary-btn">
                  <span>Перейти к вопросам</span>
                  <span className="create-quiz-primary-icon">
                    <ArrowRightIcon />
                  </span>
                </button>
              </div>
            </form>
          </section>
        </div>
      </main>
    </div>
  );
}

export default CreateQuizPage;
