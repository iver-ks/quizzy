import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getParticipantSession, leaveSession } from '../api/sessionApi';
import '../styles/participantWaiting.css';

const WAITING_RULES = [
  'Отвечайте до конца таймера',
  'После окончания времени ответ изменить нельзя',
  'Результаты появятся в лидерборде',
];

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

function getSessionStatusMessage(status, fallback = '') {
  if (status === 'active') {
    return 'Квиз уже начался';
  }

  if (status === 'finished' || status === 'cancelled') {
    return 'Комната закрыта';
  }

  return fallback || 'Не удалось загрузить данные комнаты';
}

function ParticipantWaitingPage() {
  const navigate = useNavigate();
  const { sessionId } = useParams();
  const [session, setSession] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [pageError, setPageError] = useState('');
  const [isLeaving, setIsLeaving] = useState(false);
  const hasSentLeaveRef = useRef(false);

  useEffect(() => {
    const token = sessionStorage.getItem('quizzy_token');

    if (!token || !sessionId) {
      setPageError('Требуется авторизация');
      setIsLoading(false);
      return undefined;
    }

    let isMounted = true;

    function sendLeaveRequest() {
      if (hasSentLeaveRef.current) {
        return;
      }

      hasSentLeaveRef.current = true;
      leaveSession(sessionId, token, true).catch(() => {
        hasSentLeaveRef.current = false;
      });
    }

    async function loadSession(showLoader = false) {
      if (showLoader && isMounted) {
        setIsLoading(true);
      }

      try {
        const sessionData = await getParticipantSession(sessionId, token);

        if (!isMounted) {
          return;
        }

        if (sessionData?.status && sessionData.status !== 'waiting') {
          hasSentLeaveRef.current = true;
          setPageError(getSessionStatusMessage(sessionData.status));
          navigate('/home');
          return;
        }

        setSession(sessionData);
        setPageError('');
      } catch (error) {
        if (!isMounted) {
          return;
        }

        hasSentLeaveRef.current = true;

        if (error.status === 404) {
          setPageError('Комната не найдена');
          navigate('/home');
          return;
        }

        if (error.status === 403) {
          setPageError(error.message || 'Вы не подключены к этой комнате');
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

    window.addEventListener('pagehide', sendLeaveRequest);
    window.addEventListener('beforeunload', sendLeaveRequest);

    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
      window.removeEventListener('pagehide', sendLeaveRequest);
      window.removeEventListener('beforeunload', sendLeaveRequest);
      sendLeaveRequest();
    };
  }, [navigate, sessionId]);

  async function handleLeaveRoom() {
    const token = sessionStorage.getItem('quizzy_token');

    if (!token || !sessionId) {
      navigate('/home');
      return;
    }

    try {
      setIsLeaving(true);
      hasSentLeaveRef.current = true;
      await leaveSession(sessionId, token);
    } catch {
      // Пользователь уже уходит со страницы, повторная попытка будет избыточной.
    } finally {
      navigate('/home');
    }
  }

  return (
    <div className="participant-waiting-page">
      <main className="participant-waiting-main">
        <section className="participant-waiting-card">
          {isLoading ? (
            <p className="participant-waiting-message">Загрузка комнаты ожидания...</p>
          ) : pageError ? (
            <p className="participant-waiting-error">{pageError}</p>
          ) : (
            <>
              <div className="participant-waiting-icon-shell" aria-hidden="true">
                <UsersIcon />
              </div>

              <div className="participant-waiting-heading">
                <h1>{session?.quiz?.title || 'Без названия'}</h1>
                <p>Организатор: {session?.creator?.name || 'Организатор'}</p>
              </div>

              <div className="participant-waiting-status">
                <div className="participant-waiting-status-row">
                  <span className="participant-waiting-status-dot" />
                  <span>Ожидаем участников</span>
                </div>
                <p>
                  Код комнаты: <strong>{session?.room_code}</strong>
                </p>
              </div>

              <div className="participant-waiting-count">
                <span className="participant-waiting-count-icon" aria-hidden="true">
                  <UsersIcon />
                </span>
                <span>{session?.participants_count || 0} участников в комнате</span>
              </div>

              <section className="participant-waiting-rules">
                <h2>Правила:</h2>
                <ul>
                  {WAITING_RULES.map((rule) => (
                    <li key={rule}>
                      <span className="participant-waiting-rule-icon" aria-hidden="true">
                        <CheckIcon />
                      </span>
                      <span>{rule}</span>
                    </li>
                  ))}
                </ul>
              </section>

              <button
                type="button"
                className="participant-waiting-leave-btn"
                onClick={handleLeaveRoom}
                disabled={isLeaving}
              >
                {isLeaving ? 'Выход...' : 'Выйти из комнаты'}
              </button>
            </>
          )}
        </section>
      </main>
    </div>
  );
}

export default ParticipantWaitingPage;
