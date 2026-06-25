import { useState } from 'react';
import '../styles/participantQuiz.css';

const questionNumber = 3;
const totalQuestions = 15;
const timeLeft = 23;
const progress = 75;
const question = 'Какой год считается началом Первой мировой войны?';
const answers = ['1912', '1914', '1916', '1918'];

function TimerIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <line x1="10" x2="14" y1="2" y2="2" />
      <line x1="12" x2="15" y1="14" y2="11" />
      <circle cx="12" cy="14" r="8" />
    </svg>
  );
}

function ParticipantQuizPage() {
  const [selectedAnswer, setSelectedAnswer] = useState('1914');

  return (
    <div className="participant-quiz-page">
      <main className="participant-quiz-main">
        <div className="participant-quiz-shell">
          <section className="participant-quiz-topbar">
            <span className="participant-quiz-step">
              Вопрос {questionNumber} из {totalQuestions}
            </span>

            <div className="participant-quiz-timer">
              <span className="participant-quiz-timer-icon">
                <TimerIcon />
              </span>
              <span>{timeLeft} сек</span>
            </div>
          </section>

          <div className="participant-quiz-progress" aria-hidden="true">
            <span style={{ width: `${progress}%` }} />
          </div>

          <section className="participant-quiz-card">
            <h1>{question}</h1>

            <div className="participant-quiz-grid">
              {answers.map((answer) => {
                const isSelected = selectedAnswer === answer;

                return (
                  <button
                    key={answer}
                    type="button"
                    className={`participant-quiz-answer${isSelected ? ' is-selected' : ''}`}
                    onClick={() => setSelectedAnswer(answer)}
                  >
                    {answer}
                  </button>
                );
              })}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

export default ParticipantQuizPage;
