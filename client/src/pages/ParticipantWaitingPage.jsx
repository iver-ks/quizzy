import '../styles/participantWaiting.css';

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

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M21.801 10A10 10 0 1 1 17 3.335" />
      <path d="m9 11 3 3L22 4" />
    </svg>
  );
}

function ParticipantWaitingPage({
  quizTitle = 'История России XIX века',
  organizerName = 'Алексей К.',
  roomCode = '482913',
  participantsCount = 7,
  rules = [
    'Отвечайте до конца таймера',
    'После окончания времени ответ изменить нельзя',
    'Результаты появятся в лидерборде',
  ],
}) {
  return (
    <div className="participant-waiting-page">
      <main className="participant-waiting-main">
        <section className="participant-waiting-card">
          <div className="participant-waiting-icon-shell" aria-hidden="true">
            <UsersIcon />
          </div>

          <div className="participant-waiting-heading">
            <h1>{quizTitle}</h1>
            <p>Организатор: {organizerName}</p>
          </div>

          <div className="participant-waiting-status">
            <div className="participant-waiting-status-row">
              <span className="participant-waiting-status-dot" />
              <span>Ожидаем участников</span>
            </div>
            <p>
              Код комнаты: <strong>{roomCode}</strong>
            </p>
          </div>

          <div className="participant-waiting-count">
            <span className="participant-waiting-count-icon" aria-hidden="true">
              <UsersIcon />
            </span>
            <span>{participantsCount} участников в комнате</span>
          </div>

          <section className="participant-waiting-rules">
            <h2>Правила:</h2>
            <ul>
              {rules.map((rule) => (
                <li key={rule}>
                  <span className="participant-waiting-rule-icon" aria-hidden="true">
                    <CheckIcon />
                  </span>
                  <span>{rule}</span>
                </li>
              ))}
            </ul>
          </section>
        </section>
      </main>
    </div>
  );
}

export default ParticipantWaitingPage;
