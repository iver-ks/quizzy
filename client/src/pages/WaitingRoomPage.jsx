import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { cancelSession, getSessionById } from '../api/sessionApi';
import Header from '../components/Header';
import '../styles/waitingRoom.css';

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

function getSessionStatusMessage(status, fallback = '') {
  if (status === 'active') {
    return 'Квиз уже начался';
  }

  if (status === 'finished' || status === 'cancelled') {
    return 'Комната закрыта';
  }

  return fallback || 'Не удалось загрузить данные комнаты';
}

function WaitingRoomPage({
  currentUser,
  onLogout,
  onOpenHome,
  onOpenCreateQuiz,
  onJoinByCodeSuccess,
}) {
  const navigate = useNavigate();
  const { sessionId } = useParams();
  const [session, setSession] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [pageError, setPageError] = useState('');
  const [copied, setCopied] = useState(false);
  const [startMessage, setStartMessage] = useState('');
  const hasSentCancelRef = useRef(false);
  const shouldCloseRoomRef = useRef(true);

  useEffect(() => {
    const token = sessionStorage.getItem('quizzy_token');

    if (!token || !sessionId) {
      shouldCloseRoomRef.current = false;
      setPageError('Требуется авторизация');
      setIsLoading(false);
      return undefined;
    }

    let isMounted = true;

    function sendCancelRequest() {
      if (!shouldCloseRoomRef.current || hasSentCancelRef.current) {
        return;
      }

      hasSentCancelRef.current = true;
      cancelSession(sessionId, token, true).catch(() => {
        hasSentCancelRef.current = false;
      });
    }

    async function loadSession(showLoader = false) {
      if (showLoader && isMounted) {
        setIsLoading(true);
      }

      try {
        const sessionData = await getSessionById(sessionId, token);

        if (!isMounted) {
          return;
        }

        if (sessionData?.status && sessionData.status !== 'waiting') {
          shouldCloseRoomRef.current = false;
          setPageError(getSessionStatusMessage(sessionData.status));
          navigate('/home');
          return;
        }

        shouldCloseRoomRef.current = true;
        setSession(sessionData);
        setPageError('');
      } catch (error) {
        if (!isMounted) {
          return;
        }

        shouldCloseRoomRef.current = false;

        if (error.status === 404) {
          setPageError('Комната не найдена');
          navigate('/home');
          return;
        }

        if (error.status === 403) {
          setPageError('У вас нет доступа к этой комнате');
          navigate('/home');
          return;
        }

        setPageError(error.message || 'Не удалось загрузить данные комнаты');
      } finally {
        if (showLoader && isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadSession(true);

    const intervalId = window.setInterval(() => {
      loadSession(false);
    }, 1000);

    window.addEventListener('pagehide', sendCancelRequest);
    window.addEventListener('beforeunload', sendCancelRequest);

    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
      window.removeEventListener('pagehide', sendCancelRequest);
      window.removeEventListener('beforeunload', sendCancelRequest);
      sendCancelRequest();
    };
  }, [navigate, sessionId]);

  async function handleCopyCode() {
    if (!session?.room_code) {
      return;
    }

    try {
      await navigator.clipboard.writeText(session.room_code);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  function handleStartQuiz() {
    setStartMessage('Запуск квиза будет реализован на следующем этапе');
  }

  if (isLoading) {
    return (
      <div className="waiting-room-page">
        <Header
          userName={currentUser?.name || 'Quizzy'}
          onLogout={onLogout}
          onOpenHome={onOpenHome}
          onOpenCreateQuiz={onOpenCreateQuiz}
          onJoinByCodeSuccess={onJoinByCodeSuccess}
        />
        <main className="waiting-room-main">
          <div className="waiting-room-container waiting-room-shell">
            <section className="waiting-room-card">
              <p className="add-questions-page-message">Загрузка комнаты ожидания...</p>
            </section>
          </div>
        </main>
      </div>
    );
  }

  if (pageError) {
    return (
      <div className="waiting-room-page">
        <Header
          userName={currentUser?.name || 'Quizzy'}
          onLogout={onLogout}
          onOpenHome={onOpenHome}
          onOpenCreateQuiz={onOpenCreateQuiz}
          onJoinByCodeSuccess={onJoinByCodeSuccess}
        />
        <main className="waiting-room-main">
          <div className="waiting-room-container waiting-room-shell">
            <section className="waiting-room-card">
              <p className="add-questions-page-error">{pageError}</p>
            </section>
          </div>
        </main>
      </div>
    );
  }

  const isPrivate = session?.quiz?.access_type === 'private';
  const statusText = isPrivate
    ? 'Квиз доступен только по коду комнаты'
    : 'Квиз отображается на главной странице';
  const participants = session?.participants || [];
  const participantsCount = session?.participants_count ?? participants.length;

  return (
    <div className="waiting-room-page">
      <Header
        userName={currentUser?.name || 'Quizzy'}
        onLogout={onLogout}
        onOpenHome={onOpenHome}
        onOpenCreateQuiz={onOpenCreateQuiz}
        onJoinByCodeSuccess={onJoinByCodeSuccess}
      />

      <main className="waiting-room-main">
        <div className="waiting-room-container waiting-room-shell">
          <section className="waiting-room-card">
            <div className="waiting-room-card-top">
              <div className="waiting-room-title-block">
                <h1>{session?.quiz?.title || 'Без названия'}</h1>
                <p>{statusText}</p>
              </div>

              <div className={`waiting-room-badge waiting-room-badge-${session?.quiz?.access_type || 'public'}`}>
                <span className="waiting-room-badge-icon">
                  {isPrivate ? <LockIcon /> : <GlobeIcon />}
                </span>
                <span>{isPrivate ? 'Приватный' : 'Публичный'}</span>
              </div>
            </div>

            <div className="waiting-room-code-panel">
              <p>Код комнаты</p>
              <strong>{session?.room_code}</strong>
              <button type="button" className="waiting-room-copy-btn" onClick={handleCopyCode}>
                <span className="waiting-room-copy-icon">
                  <CopyIcon />
                </span>
                <span>{copied ? 'Код скопирован' : 'Скопировать код'}</span>
              </button>
            </div>

            <div className="waiting-room-participants-head">
              <div className="waiting-room-status">
                <span className="waiting-room-status-dot" />
                <span>Ожидает участников</span>
              </div>
              <span className="waiting-room-count">{participantsCount} подключились</span>
            </div>

            <div className="waiting-room-participants-grid">
              {participants.length > 0 ? (
                participants.map((participant) => (
                  <div
                    key={participant.participant_id || `${participant.user_id}-${participant.joined_at}`}
                    className="waiting-room-participant-chip"
                  >
                    <span className="waiting-room-participant-avatar">
                      {(participant.name || '?').charAt(0).toUpperCase()}
                    </span>
                    <span className="waiting-room-participant-name">
                      {participant.name || 'Участник'}
                    </span>
                  </div>
                ))
              ) : (
                <p className="waiting-room-empty-text">Пока участников нет</p>
              )}
            </div>

            {startMessage ? <p className="add-questions-page-message">{startMessage}</p> : null}

            <div className="waiting-room-actions-stack">
              <button type="button" className="waiting-room-start-btn" onClick={handleStartQuiz}>
                <span className="waiting-room-start-icon">
                  <PlayIcon />
                </span>
                <span>Начать квиз</span>
              </button>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

export default WaitingRoomPage;
