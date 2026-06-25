import { useEffect, useState } from 'react';
import '../styles/joinByCodeModal.css';

const TEST_ROOM_CODE = '482913';

function JoinByCodeModal({ isOpen, onClose }) {
  const [code, setCode] = useState('');
  const [showError, setShowError] = useState(false);

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
      setShowError(false);
    }
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  const handleSubmit = (event) => {
    event.preventDefault();

    if (code.trim() !== TEST_ROOM_CODE) {
      setShowError(true);
      return;
    }

    setShowError(false);
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
                if (showError) {
                  setShowError(false);
                }
              }}
              className={`join-by-code-modal-input${showError ? ' is-error' : ''}`}
              placeholder="Например: 482913"
              autoComplete="off"
            />

            {showError ? (
              <p className="join-by-code-modal-error">Комната с таким кодом не найдена</p>
            ) : null}

            <button type="submit" className="join-by-code-modal-submit">
              Подключиться
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default JoinByCodeModal;
