import logoIcon from '../assets/quizzy-logo.png';
import '../styles/header.css';

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 12h14" />
      <path d="M12 5v14" />
    </svg>
  );
}

function Header({ userName = 'Ксения', onOpenHome, onOpenCreateQuiz }) {
  return (
    <header className="app-header app-container">
      <button type="button" className="app-header-brand-button" onClick={onOpenHome}>
        <div className="app-header-brand">
          <img src={logoIcon} alt="" className="app-header-brand-icon" />
          <span className="app-header-brand-name">Quizzy</span>
        </div>
      </button>

      <div className="app-header-actions">
        <button type="button" className="app-header-action app-header-action-light">
          Подключиться по коду
        </button>
        <button
          type="button"
          className="app-header-action app-header-action-primary"
          onClick={onOpenCreateQuiz}
        >
          <span className="app-header-action-icon">
            <PlusIcon />
          </span>
          <span>Создать квиз</span>
        </button>
        <div className="app-header-avatar" aria-label={`Профиль пользователя ${userName}`}>
          {userName.charAt(0)}
        </div>
      </div>
    </header>
  );
}

export default Header;
