import { useState } from 'react';
import logoIcon from '../assets/quizzy-logo.png';
import '../styles/login.css';

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

function LoginPage({ onOpenLanding, onOpenRegister, onOpenHome }) {
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

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
              Войдите в аккаунт Quizzy, чтобы продолжить участие в играх и создание
              квизов.
            </p>
          </header>

          <form
            className="login-form"
            onSubmit={(event) => {
              event.preventDefault();
              if (onOpenHome) {
                onOpenHome();
              }
            }}
          >
            <div className="login-field-group">
              <label htmlFor="login-email">Email</label>
              <div className="login-input-shell">
                <span className="login-input-icon">
                  <MailIcon />
                </span>
                <input
                  id="login-email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </div>
            </div>

            <div className="login-field-group">
              <label htmlFor="login-password">Пароль</label>
              <div className="login-input-shell">
                <span className="login-input-icon">
                  <LockIcon />
                </span>
                <input
                  id="login-password"
                  type={passwordVisible ? 'text' : 'password'}
                  placeholder="••••••••••"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
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
            </div>

            <button type="submit" className="login-submit">
              Войти
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
