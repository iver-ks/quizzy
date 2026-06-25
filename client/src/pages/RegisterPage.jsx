import { useState } from 'react';
import { registerUser } from '../api/authApi';
import logoIcon from '../assets/quizzy-logo.png';
import '../styles/register.css';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_REGEX = /^(?=.*[A-Za-z])(?=.*\d).+$/;
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

function RegisterPage({ onOpenLanding, onOpenLogin, onAuthSuccess }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [repeatPassword, setRepeatPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [repeatPasswordVisible, setRepeatPasswordVisible] = useState(false);
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateForm = () => {
    const nextErrors = {};
    const trimmedName = name.trim();
    const normalizedEmail = email.trim();

    if (!trimmedName) {
      nextErrors.name = 'Введите имя';
    } else if (trimmedName.length < 2) {
      nextErrors.name = 'Имя должно содержать минимум 2 символа';
    } else if (trimmedName.length > 50) {
      nextErrors.name = 'Имя должно содержать не более 50 символов';
    }

    if (!normalizedEmail) {
      nextErrors.email = 'Введите email';
    } else if (!EMAIL_REGEX.test(normalizedEmail)) {
      nextErrors.email = 'Введите корректный email';
    }

    if (!password) {
      nextErrors.password = 'Введите пароль';
    } else if (password.length < 6) {
      nextErrors.password = 'Пароль должен содержать минимум 6 символов';
    } else if (!PASSWORD_REGEX.test(password)) {
      nextErrors.password = 'Пароль должен содержать хотя бы одну букву и одну цифру';
    }

    if (!repeatPassword) {
      nextErrors.confirmPassword = 'Подтвердите пароль';
    } else if (password !== repeatPassword) {
      nextErrors.confirmPassword = 'Пароли не совпадают';
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
      const authData = await registerUser({
        name: name.trim(),
        email: email.trim(),
        password,
        confirmPassword: repeatPassword,
      });

      onAuthSuccess?.(authData);
    } catch (error) {
      if (error.message === NETWORK_ERROR_MESSAGE) {
        setSubmitError(NETWORK_ERROR_MESSAGE);
      } else if (
        error.field === 'name' ||
        error.field === 'email' ||
        error.field === 'password' ||
        error.field === 'confirmPassword'
      ) {
        setErrors((current) => ({ ...current, [error.field]: error.message }));
      } else {
        setSubmitError(error.message || 'Ошибка регистрации');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

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
              Создавайте квизы, участвуйте в играх и сохраняйте результаты в одном аккаунте.
            </p>
          </header>

          <form className="register-form" onSubmit={handleSubmit} noValidate>
            <div className="register-field-group">
              <label htmlFor="register-name">Имя</label>
              <div className={`register-input-shell register-input-plain${errors.name ? ' is-invalid' : ''}`}>
                <input
                  id="register-name"
                  type="text"
                  autoComplete="name"
                  placeholder="Ксения"
                  value={name}
                  onChange={(event) => {
                    setName(event.target.value);
                    setErrors((current) => ({ ...current, name: '' }));
                    setSubmitError('');
                  }}
                />
              </div>
              {errors.name ? <p className="register-field-error">{errors.name}</p> : null}
            </div>

            <div className="register-field-group">
              <label htmlFor="register-email">Email</label>
              <div className={`register-input-shell${errors.email ? ' is-invalid' : ''}`}>
                <span className="register-input-icon">
                  <MailIcon />
                </span>
                <input
                  id="register-email"
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
              {errors.email ? <p className="register-field-error">{errors.email}</p> : null}
            </div>

            <div className="register-field-group">
              <label htmlFor="register-password">Пароль</label>
              <div className={`register-input-shell${errors.password ? ' is-invalid' : ''}`}>
                <span className="register-input-icon">
                  <LockIcon />
                </span>
                <input
                  id="register-password"
                  type={passwordVisible ? 'text' : 'password'}
                  autoComplete="new-password"
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
                  className="register-password-toggle"
                  onClick={() => setPasswordVisible((value) => !value)}
                  aria-label={passwordVisible ? 'Скрыть пароль' : 'Показать пароль'}
                >
                  <EyeIcon open={passwordVisible} />
                </button>
              </div>
              {errors.password ? <p className="register-field-error">{errors.password}</p> : null}
            </div>

            <div className="register-field-group">
              <label htmlFor="register-repeat-password">Повторите пароль</label>
              <div className={`register-input-shell${errors.confirmPassword ? ' is-invalid' : ''}`}>
                <span className="register-input-icon">
                  <LockIcon />
                </span>
                <input
                  id="register-repeat-password"
                  type={repeatPasswordVisible ? 'text' : 'password'}
                  autoComplete="new-password"
                  placeholder="••••••••••"
                  value={repeatPassword}
                  onChange={(event) => {
                    setRepeatPassword(event.target.value);
                    setErrors((current) => ({ ...current, confirmPassword: '' }));
                    setSubmitError('');
                  }}
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
              {errors.confirmPassword ? (
                <p className="register-field-error">{errors.confirmPassword}</p>
              ) : null}
            </div>

            {submitError ? <p className="register-form-error">{submitError}</p> : null}

            <button type="submit" className="register-submit" disabled={isSubmitting}>
              {isSubmitting ? 'Регистрация...' : 'Зарегистрироваться'}
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
