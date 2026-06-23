import { useState } from 'react';
import logoIcon from '../assets/quizzy-logo.png';
import '../styles/register.css';

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

function RegisterPage({ onOpenLanding, onOpenLogin, onOpenHome }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [repeatPassword, setRepeatPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [repeatPasswordVisible, setRepeatPasswordVisible] = useState(false);

  return (
    <div className="register-page">
      <div className="register-shell">
        <button
          type="button"
          className="register-brand register-brand-button"
          onClick={onOpenLanding}
        >
          <img src={logoIcon} alt="" className="register-brand-icon" />
          <span className="register-brand-name">Quizzy</span>
        </button>

        <section className="register-card">
          <header className="register-card-header">
            <h1>Создать аккаунт</h1>
            <p>
              Создавайте квизы, участвуйте в играх и сохраняйте результаты в одном
              аккаунте.
            </p>
          </header>

          <form
            className="register-form"
            onSubmit={(event) => {
              event.preventDefault();
              if (onOpenHome) {
                onOpenHome();
              }
            }}
          >
            <div className="register-field-group">
              <label htmlFor="register-name">Имя</label>
              <div className="register-input-shell register-input-plain">
                <input
                  id="register-name"
                  type="text"
                  placeholder="Ксения"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                />
              </div>
            </div>

            <div className="register-field-group">
              <label htmlFor="register-email">Email</label>
              <div className="register-input-shell">
                <span className="register-input-icon">
                  <MailIcon />
                </span>
                <input
                  id="register-email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </div>
            </div>

            <div className="register-field-group">
              <label htmlFor="register-password">Пароль</label>
              <div className="register-input-shell">
                <span className="register-input-icon">
                  <LockIcon />
                </span>
                <input
                  id="register-password"
                  type={passwordVisible ? 'text' : 'password'}
                  placeholder="••••••••••"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
                <button
                  type="button"
                  className="register-password-toggle"
                  onClick={() => setPasswordVisible((value) => !value)}
                  aria-label={passwordVisible ? 'Скрыть пароль' : 'Показать пароль'}
                >
                  <EyeIcon open={passwordVisible} />
                </button>
              </div>
            </div>

            <div className="register-field-group">
              <label htmlFor="register-repeat-password">Повторите пароль</label>
              <div className="register-input-shell">
                <span className="register-input-icon">
                  <LockIcon />
                </span>
                <input
                  id="register-repeat-password"
                  type={repeatPasswordVisible ? 'text' : 'password'}
                  placeholder="••••••••••"
                  value={repeatPassword}
                  onChange={(event) => setRepeatPassword(event.target.value)}
                />
                <button
                  type="button"
                  className="register-password-toggle"
                  onClick={() => setRepeatPasswordVisible((value) => !value)}
                  aria-label={
                    repeatPasswordVisible ? 'Скрыть повтор пароля' : 'Показать повтор пароля'
                  }
                >
                  <EyeIcon open={repeatPasswordVisible} />
                </button>
              </div>
            </div>

            <button type="submit" className="register-submit">
              Зарегистрироваться
            </button>
          </form>

          <p className="register-login-hint">
            Уже есть аккаунт?{' '}
            <a
              href="#"
              onClick={(event) => {
                if (onOpenLogin) {
                  event.preventDefault();
                  onOpenLogin();
                }
              }}
            >
              Войти
            </a>
          </p>
        </section>
      </div>
    </div>
  );
}

export default RegisterPage;
