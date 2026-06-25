import { useState } from 'react';
import { loginUser } from '../api/authApi';
import logoIcon from '../assets/quizzy-logo.png';
import '../styles/login.css';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const NETWORK_ERROR_MESSAGE = 'Сервер временно недоступен. Попробуйте позже.';

function MailIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m22 7-8.991 5.727a2 2 0 0 1-2.009 0L2 7" />
      <rect x="2" y="4" width="20" height="16" rx="2" />
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

function EyeIcon({ open }) {
  if (open) {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m3 3 18 18" />
      <path d="M10.6 10.7a3 3 0 0 0 4 4" />
      <path d="M9.9 5.1A11.4 11.4 0 0 1 12 5c6.5 0 10 7 10 7a15.8 15.8 0 0 1-3.2 4.1" />
      <path d="M6.6 6.7C3.9 8.5 2 12 2 12s3.5 7 10 7a10.7 10.7 0 0 0 4.3-.9" />
    </svg>
  );
}

function LoginPage({ onOpenLanding, onOpenRegister, onAuthSuccess }) {
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateForm = () => {
    const nextErrors = {};
    const normalizedEmail = email.trim();

    if (!normalizedEmail) {
      nextErrors.email = 'Введите email';
    } else if (!EMAIL_REGEX.test(normalizedEmail)) {
      nextErrors.email = 'Введите корректный email';
    }

    if (!password) {
      nextErrors.password = 'Введите пароль';
    }

    return nextErrors;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const nextErrors = validateForm();
    setErrors(nextErrors);
    setSubmitError('');

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    setIsSubmitting(true);

    try {
      const authData = await loginUser({
        email: email.trim(),
        password,
      });

      onAuthSuccess?.(authData);
    } catch (error) {
      if (error.message === NETWORK_ERROR_MESSAGE) {
        setSubmitError(NETWORK_ERROR_MESSAGE);
      } else if (error.field === 'email' || error.field === 'password') {
        setErrors((current) => ({ ...current, [error.field]: error.message }));
      } else {
        setSubmitError(error.message || 'Неверный email или пароль');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-shell">
        <button type="button" className="login-brand login-brand-button" onClick={onOpenLanding}>
          <img src={logoIcon} alt="" className="login-brand-icon" />
          <span className="login-brand-name">Quizzy</span>
        </button>

        <section className="login-card">
          <header className="login-card-header">
            <h1>Добро пожаловать</h1>
            <p>
              Войдите в аккаунт Quizzy, чтобы продолжить участие в играх и создание квизов.
            </p>
          </header>

          <form className="login-form" onSubmit={handleSubmit} noValidate>
            <div className="login-field-group">
              <label htmlFor="login-email">Email</label>
              <div className={`login-input-shell${errors.email ? ' is-invalid' : ''}`}>
                <span className="login-input-icon">
                  <MailIcon />
                </span>
                <input
                  id="login-email"
                  type="text"
                  inputMode="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(event) => {
                    setEmail(event.target.value);
                    setErrors((current) => ({ ...current, email: '' }));
                    setSubmitError('');
                  }}
                />
              </div>
              {errors.email ? <p className="login-field-error">{errors.email}</p> : null}
            </div>

            <div className="login-field-group">
              <label htmlFor="login-password">Пароль</label>
              <div className={`login-input-shell${errors.password ? ' is-invalid' : ''}`}>
                <span className="login-input-icon">
                  <LockIcon />
                </span>
                <input
                  id="login-password"
                  type={passwordVisible ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="••••••••••"
                  value={password}
                  onChange={(event) => {
                    setPassword(event.target.value);
                    setErrors((current) => ({ ...current, password: '' }));
                    setSubmitError('');
                  }}
                />
                <button
                  type="button"
                  className="login-password-toggle"
                  onClick={() => setPasswordVisible((value) => !value)}
                  aria-label={passwordVisible ? 'Скрыть пароль' : 'Показать пароль'}
                >
                  <EyeIcon open={passwordVisible} />
                </button>
              </div>
              {errors.password ? <p className="login-field-error">{errors.password}</p> : null}
            </div>

            {submitError ? <p className="login-form-error">{submitError}</p> : null}

            <button type="submit" className="login-submit" disabled={isSubmitting}>
              {isSubmitting ? 'Вход...' : 'Войти'}
            </button>
          </form>

          <p className="login-signup-hint">
            Нет аккаунта?{' '}
            <a
              href="#"
              onClick={(event) => {
                if (onOpenRegister) {
                  event.preventDefault();
                  onOpenRegister();
                }
              }}
            >
              Зарегистрироваться
            </a>
          </p>
        </section>
      </div>
    </div>
  );
}

export default LoginPage;
