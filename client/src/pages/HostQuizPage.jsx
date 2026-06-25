import Header from '../components/Header';
import '../styles/hostQuiz.css';

const quizTitle = 'ИСТОРИЯ РОССИИ XIX ВЕКА';
const currentQuestionNumber = 3;
const totalQuestions = 15;
const timeLeft = 23;
const answeredCount = 5;
const totalParticipants = 7;
const progressValue = 75;

const answers = [
  { id: 1, label: '1912', percent: 20 },
  { id: 2, label: '1914', percent: 60 },
  { id: 3, label: '1916', percent: 12 },
  { id: 4, label: '1918', percent: 8 },
];

const leaderboard = [
  { place: 1, name: 'Мария С.', score: 2450 },
  { place: 2, name: 'Алексей К.', score: 2310 },
  { place: 3, name: 'Иван Д.', score: 2180 },
  { place: 4, name: 'Анна В.', score: 1970 },
  { place: 5, name: 'Дмитрий П.', score: 1840 },
  { place: 6, name: 'Елена Р.', score: 1810 },
  { place: 7, name: 'Сергей Н.', score: 1730 },
];

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

function HostQuizPage({
  currentUser,
  onLogout,
  onOpenHome,
  onOpenCreateQuiz,
  onJoinByCodeSuccess,
}) {
  return (
    <div className="host-quiz-page">
      <Header
        userName={currentUser?.name || 'Quizzy'}
        onLogout={onLogout}
        onOpenHome={onOpenHome}
        onOpenCreateQuiz={onOpenCreateQuiz}
        onJoinByCodeSuccess={onJoinByCodeSuccess}
      />

      <main className="host-quiz-main">
        <div className="app-container host-quiz-layout">
          <section className="host-quiz-card">
            <div className="host-quiz-top">
              <div className="host-quiz-copy">
                <span className="host-quiz-kicker">{quizTitle}</span>
                <h1>
                  Вопрос {currentQuestionNumber} из {totalQuestions}
                </h1>
              </div>

              <div className="host-quiz-timer">
                <span className="host-quiz-timer-icon">
                  <TimerIcon />
                </span>
                <span>{timeLeft} сек</span>
              </div>
            </div>

            <div className="host-quiz-progress">
              <span style={{ width: `${progressValue}%` }} />
            </div>

            <div className="host-quiz-results">
              <h2>Какой год считается началом Первой мировой войны?</h2>

              <div className="host-quiz-answers">
                {answers.map((answer) => (
                  <article key={answer.id} className="host-answer-card">
                    <div className="host-answer-top">
                      <span>{answer.label}</span>
                      <strong>{answer.percent}%</strong>
                    </div>
                    <div className="host-answer-progress">
                      <span style={{ width: `${answer.percent}%` }} />
                    </div>
                  </article>
                ))}
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
          </section>

          <aside className="host-leaderboard-card">
            <div className="host-leaderboard-title">
              <span className="host-leaderboard-icon">
                <TrophyIcon />
              </span>
              <h2>Лидерборд</h2>
            </div>

            <div className="host-leaderboard-list">
              {leaderboard.map((player) => (
                <div key={`${player.place}-${player.name}`} className="host-leaderboard-row">
                  <span className={`host-leaderboard-place place-${player.place}`}>
                    #{player.place}
                  </span>
                  <span className="host-leaderboard-avatar">{player.name.charAt(0)}</span>
                  <span className="host-leaderboard-name">{player.name}</span>
                  <strong className="host-leaderboard-score">{player.score}</strong>
                </div>
              ))}
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}

export default HostQuizPage;
