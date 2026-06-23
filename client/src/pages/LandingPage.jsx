import logoIcon from '../assets/quizzy-logo.png';
import '../styles/landing.css';

const featureCards = [
  {
    title: 'Подключение по коду',
    text: 'Участники могут присоединяться к приватным квизам по коду комнаты.',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 24 24" fill="none" stroke="#684FDC" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-users-icon lucide-users"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><path d="M16 3.128a4 4 0 0 1 0 7.744"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><circle cx="9" cy="7" r="4"/></svg>
    ),
  },
  {
    title: 'Автоматический ход игры',
    text: 'Вопросы переключаются автоматически по заданному времени.',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 24 24" fill="none" stroke="#684FDC" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-refresh-cw-icon lucide-refresh-cw"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/></svg>
    ),
  },
  {
    title: 'История результатов',
    text: 'Просматривайте свои результаты и итоги проведённых квизов.',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 24 24" fill="none" stroke="#684FDC" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-clipboard-list-icon lucide-clipboard-list"><rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M12 11h4"/><path d="M12 16h4"/><path d="M8 11h.01"/><path d="M8 16h.01"/></svg>
    ),
  },
];

const answers = ['Юпитер', 'Сатурн', 'Земля', 'Нептун'];

function LandingPage() {
  return (
    <div className="landing-page">
      <header className="landing-header landing-container">
        <div className="landing-brand">
          <div className="brand-icon" aria-hidden="true">
            <img src={logoIcon} alt="" />
          </div>
          <span className="brand-name">Quizzy</span>
        </div>

        <div className="landing-actions">
          <button type="button" className="btn btn-outline">
            Войти
          </button>
          <button type="button" className="btn btn-primary">
            Зарегистрироваться
          </button>
        </div>
      </header>

      <main className="landing-main">
        <section className="hero-band">
          <div className="hero-section landing-container">
            <div className="hero-copy">
              <h1>Создавайте и проходите квизы в реальном времени</h1>
              <p>
                Quizzy превращает проверку знаний в динамичную игру, которую интересно
                создавать, проходить и обсуждать после завершения.
              </p>
              <button type="button" className="btn btn-primary hero-button">
                Начать
              </button>
            </div>

            <div className="hero-visual" aria-hidden="true">
              <article className="quiz-card">
                <div className="quiz-card-top">
                  <span className="quiz-badge">Вопрос 2 из 10</span>
                  <span className="quiz-points">150 баллов</span>
                </div>

                <h2>Какая планета солнечной системы является самой большой?</h2>

                <div className="answer-list">
                  {answers.map((answer, index) => (
                    <div key={answer} className={`answer-option${index === 0 ? ' selected' : ''}`}>
                      <span className="answer-radio">
                        <span />
                      </span>
                      <span>{answer}</span>
                    </div>
                  ))}
                </div>

                <div className="quiz-next">Далее</div>
              </article>

              <aside className="timer-card">
                <div className="timer-icon" aria-hidden="true">
                  <svg viewBox="0 0 40 40">
                    <circle cx="20" cy="20" r="16" />
                    <path d="M20 11v10l7 3" />
                  </svg>
                </div>
                <div className="timer-content">
                  <p>Осталось времени</p>
                  <strong>00:18</strong>
                </div>
                <div className="timer-progress">
                  <span />
                </div>
              </aside>
            </div>
          </div>
        </section>

        <section className="why-section landing-container">
          <h2>Почему Quizzy</h2>
          <div className="features-grid">
            {featureCards.map((card) => (
              <article key={card.title} className="feature-card">
                <div className="feature-icon" aria-hidden="true">
                  {card.icon}
                </div>
                <div className="feature-copy">
                  <h3>{card.title}</h3>
                  <p>{card.text}</p>
                </div>
              </article>
            ))}
          </div>
        </section>
      </main>

      <footer className="landing-footer">
        <div className="landing-container footer-inner">
          <div className="landing-brand footer-brand">
            <div className="brand-icon" aria-hidden="true">
              <img src={logoIcon} alt="" />
            </div>
            <span className="brand-name">Quizzy</span>
          </div>
          <p>Платформа для проведения квизов в реальном времени</p>
          <span>© 2026 Quizzy. Все права защищены</span>
        </div>
      </footer>
    </div>
  );
}

export default LandingPage;
