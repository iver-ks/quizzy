import { useEffect, useMemo, useState } from 'react';
import Header from '../components/Header';
import '../styles/waitingRoom.css';

const participants = [
  'Мария С.',
  'Алексей К.',
  'Иван Д.',
  'Анна В.',
  'Дмитрий П.',
  'Елена Р.',
  'Сергей Н.',
];

function PlayIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 5a2 2 0 0 1 3.008-1.728l11.997 6.998a2 2 0 0 1 .003 3.458l-12 7A2 2 0 0 1 5 19z" />
    </svg>
  );
}

function CopyIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
      <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
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

function WaitingRoomPage({
  quizTitle,
  accessType = 'public',
  onOpenHome,
  onOpenCreateQuiz,
}) {
  const roomCode = useMemo(
    () => String(Math.floor(100000 + Math.random() * 900000)),
    [],
  );
  const storageKey = `quizzy-room-code-copied-${roomCode}`;
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setCopied(window.sessionStorage.getItem(storageKey) === 'true');
  }, [storageKey]);

  async function handleCopyCode() {
    try {
      await navigator.clipboard.writeText(roomCode);
      setCopied(true);
      window.sessionStorage.setItem(storageKey, 'true');
    } catch {
      setCopied(false);
    }
  }

  const isPrivate = accessType === 'private';
  const statusText = isPrivate
    ? 'Квиз доступен только по коду комнаты'
    : 'Квиз отображается на главной странице';

  return (
    <div className="waiting-room-page">
      <Header onOpenHome={onOpenHome} onOpenCreateQuiz={onOpenCreateQuiz} />

      <main className="waiting-room-main">
        <div className="waiting-room-container waiting-room-shell">
          <section className="waiting-room-card">
            <div className="waiting-room-card-top">
              <div className="waiting-room-title-block">
                <h1>{quizTitle || 'Без названия'}</h1>
                <p>{statusText}</p>
              </div>

              <div className={`waiting-room-badge waiting-room-badge-${accessType}`}>
                <span className="waiting-room-badge-icon">
                  {isPrivate ? <LockIcon /> : <GlobeIcon />}
                </span>
                <span>{isPrivate ? 'Приватный' : 'Публичный'}</span>
              </div>
            </div>

            <div className="waiting-room-code-panel">
              <p>Код комнаты</p>
              <strong>{roomCode}</strong>
              <button type="button" className="waiting-room-copy-btn" onClick={handleCopyCode}>
                <span className="waiting-room-copy-icon">
                  <CopyIcon />
                </span>
                <span>{copied ? 'Скопировано' : 'Скопировать код'}</span>
              </button>
            </div>

            <div className="waiting-room-participants-head">
              <div className="waiting-room-status">
                <span className="waiting-room-status-dot" />
                <span>Ожидает участников</span>
              </div>
              <span className="waiting-room-count">{participants.length} подключились</span>
            </div>

            <div className="waiting-room-participants-grid">
              {participants.map((participant) => (
                <div key={participant} className="waiting-room-participant-chip">
                  <span className="waiting-room-participant-avatar">{participant.charAt(0)}</span>
                  <span className="waiting-room-participant-name">{participant}</span>
                </div>
              ))}
            </div>

            <button type="button" className="waiting-room-start-btn">
              <span className="waiting-room-start-icon">
                <PlayIcon />
              </span>
              <span>Начать квиз</span>
            </button>
          </section>
        </div>
      </main>
    </div>
  );
}

export default WaitingRoomPage;
