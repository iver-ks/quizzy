import { useEffect, useState } from 'react';
import { joinSessionByCode } from '../api/sessionApi';
import '../styles/joinByCodeModal.css';

function JoinByCodeModal({ isOpen, onClose, onJoinSuccess }) {
  const [code, setCode] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) {
      setCode('');
      setErrorMessage('');
      setIsSubmitting(false);
    }
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  const handleSubmit = async (event) => {
    event.preventDefault();

    const trimmedCode = code.trim();

    if (!trimmedCode) {
      setErrorMessage('Введите код комнаты');
      return;
    }

    const token = sessionStorage.getItem('quizzy_token');

    if (!token) {
      setErrorMessage('Требуется авторизация');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage('');
      const session = await joinSessionByCode(trimmedCode, token);
      onJoinSuccess?.(session);
    } catch (error) {
      setErrorMessage(error.message || 'Не удалось подключиться к комнате');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="join-by-code-modal-overlay" onClick={onClose} role="presentation">
      <div
        className="join-by-code-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="join-by-code-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="join-by-code-modal-content">
          <button
            type="button"
            className="join-by-code-modal-close"
            onClick={onClose}
            aria-label="Закрыть"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>

          <h2 id="join-by-code-title" className="join-by-code-modal-title">
            Подключиться по коду
          </h2>
          <p className="join-by-code-modal-description">
            Введите код комнаты для подключения к квизу.
          </p>

          <form className="join-by-code-modal-form" onSubmit={handleSubmit}>
            <input
              type="text"
              value={code}
              onChange={(event) => {
                setCode(event.target.value);
                if (errorMessage) {
                  setErrorMessage('');
                }
              }}
              className={`join-by-code-modal-input${errorMessage ? ' is-error' : ''}`}
              placeholder="Например: 482913"
              autoComplete="off"
            />

            {errorMessage ? <p className="join-by-code-modal-error">{errorMessage}</p> : null}

            <button type="submit" className="join-by-code-modal-submit" disabled={isSubmitting}>
              {isSubmitting ? 'Подключение...' : 'Подключиться'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default JoinByCodeModal;
