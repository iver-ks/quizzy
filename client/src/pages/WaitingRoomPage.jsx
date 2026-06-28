import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getSessionById, startSession } from '../api/sessionApi';
import Header from '../components/Header';
import { socket } from '../socket/socket';
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
  const [isStarting, setIsStarting] = useState(false);
  const [actionMessage, setActionMessage] = useState('');
  const joinedRoomRef = useRef(false);

  useEffect(() => {
    const token = sessionStorage.getItem('quizzy_token');
    const storedUser = sessionStorage.getItem('quizzy_user');

    if (!token || !sessionId) {
      setPageError('Требуется авторизация');
      setIsLoading(false);
      return undefined;
    }

    let userId = currentUser?.user_id;

    if (!userId && storedUser) {
      try {
        userId = JSON.parse(storedUser)?.user_id;
      } catch {
        userId = null;
      }
    }

    let isMounted = true;

    async function loadSession(showLoader = false) {
      if (showLoader && isMounted) {
        setIsLoading(true);
      }

      try {
        const sessionData = await getSessionById(sessionId, token);

        if (!isMounted) {
          return;
        }

        if (sessionData.status === 'active') {
          navigate(`/sessions/${sessionId}/host`);
          return;
        }

        if (sessionData.status !== 'waiting') {
          setPageError('Комната больше недоступна');
          return;
        }

        setSession(sessionData);
        setPageError('');
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setPageError(error.message || 'Не удалось загрузить данные комнаты');
      } finally {
        if (showLoader && isMounted) {
          setIsLoading(false);
        }
      }
    }

    function handleQuizStarted(payload = {}) {
      const nextPath = payload.redirectHostTo || `/sessions/${sessionId}/host`;
      navigate(nextPath);
    }

    loadSession(true);

    if (!socket.connected) {
      socket.connect();
    }

    if (!joinedRoomRef.current && userId) {
      socket.emit('join_session_room', {
        sessionId: Number(sessionId),
        userId: Number(userId),
        role: 'host',
      });
      joinedRoomRef.current = true;
    }

    socket.on('quiz_started', handleQuizStarted);

    const intervalId = window.setInterval(() => {
      loadSession(false);
    }, 3000);

    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
      socket.off('quiz_started', handleQuizStarted);
      joinedRoomRef.current = false;
      if (socket.connected) {
        socket.disconnect();
      }
    };
  }, [currentUser?.user_id, navigate, sessionId]);

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

  async function handleStartQuiz() {
    const token = sessionStorage.getItem('quizzy_token');

    if (!token || !sessionId) {
      setActionMessage('Требуется авторизация');
      return;
    }

    try {
      setIsStarting(true);
      setActionMessage('');
      await startSession(sessionId, token);
      navigate(`/sessions/${sessionId}/host`);
    } catch (error) {
      setActionMessage(error.message || 'Не удалось начать квиз');
    } finally {
      setIsStarting(false);
    }
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

            {actionMessage ? <p className="add-questions-page-message">{actionMessage}</p> : null}

            <div className="waiting-room-actions-stack">
              <button
                type="button"
                className="waiting-room-start-btn"
                onClick={handleStartQuiz}
                disabled={isStarting}
              >
                <span className="waiting-room-start-icon">
                  <PlayIcon />
                </span>
                <span>{isStarting ? 'Запуск...' : 'Начать квиз'}</span>
              </button>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

export default WaitingRoomPage;
