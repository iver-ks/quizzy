import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createQuiz, getCategories } from '../api/quizApi';
import Header from '../components/Header';
import '../styles/createQuiz.css';

function ArrowLeftIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m12 19-7-7 7-7" />
      <path d="M19 12H5" />
    </svg>
  );
}

function ArrowRightIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 12h14" />
      <path d="m12 5 7 7-7 7" />
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

function validateQuizDraft({ title, description, categoryId, accessType }) {
  const errors = {};
  const trimmedTitle = title.trim();
  const trimmedDescription = description.trim();

  if (!trimmedTitle) {
    errors.title = 'Введите название квиза';
  } else if (trimmedTitle.length < 3) {
    errors.title = 'Название должно содержать минимум 3 символа';
  } else if (trimmedTitle.length > 100) {
    errors.title = 'Название не должно быть длиннее 100 символов';
  }

  if (trimmedDescription.length > 500) {
    errors.description = 'Описание не должно быть длиннее 500 символов';
  }

  if (!categoryId) {
    errors.categoryId = 'Выберите категорию';
  }

  if (!accessType) {
    errors.accessType = 'Выберите тип доступа';
  } else if (!['public', 'private'].includes(accessType)) {
    errors.accessType = 'Некорректный тип доступа';
  }

  return errors;
}

function CreateQuizPage({
  currentUser,
  onLogout,
  quizDraft,
  onChangeQuizDraft,
  onOpenHome,
  onOpenCreateQuiz,
  onQuizCreated,
  onJoinByCodeSuccess,
}) {
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState('');

  useEffect(() => {
    let isMounted = true;

    async function loadCategories() {
      setIsLoadingCategories(true);
      setFormError('');

      try {
        const data = await getCategories();

        if (!isMounted) {
          return;
        }

        setCategories(data);

        if (data.length === 0) {
          setFormError('Категории пока не добавлены в базу данных.');
          return;
        }

        onChangeQuizDraft((current) => {
          if (current.categoryId) {
            return current;
          }

          return {
            ...current,
            categoryId: String(data[0].category_id),
          };
        });
      } catch (error) {
        if (isMounted) {
          setFormError(error.message || 'Не удалось загрузить категории');
        }
      } finally {
        if (isMounted) {
          setIsLoadingCategories(false);
        }
      }
    }

    loadCategories();

    return () => {
      isMounted = false;
    };
  }, [onChangeQuizDraft]);

  function updateDraftField(field, value) {
    onChangeQuizDraft((current) => ({
      ...current,
      [field]: value,
    }));

    setFieldErrors((current) => {
      if (!current[field]) {
        return current;
      }

      const nextErrors = { ...current };
      delete nextErrors[field];
      return nextErrors;
    });

    if (formError) {
      setFormError('');
    }
  }

  async function handleSubmit() {
    const errors = validateQuizDraft(quizDraft);

    if (categories.length === 0) {
      errors.categoryId = 'Выберите категорию';
      setFormError('Категории пока не добавлены в базу данных.');
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    const token = localStorage.getItem('quizzy_token');

    if (!token) {
      navigate('/login');
      return;
    }

    setIsSubmitting(true);
    setFieldErrors({});
    setFormError('');

    try {
      const createdQuiz = await createQuiz(
        {
          title: quizDraft.title.trim(),
          description: quizDraft.description.trim(),
          category_id: Number(quizDraft.categoryId),
          access_type: quizDraft.accessType,
        },
        token
      );

      onQuizCreated?.(createdQuiz);
      navigate(`/quizzes/${createdQuiz.quiz_id}/questions`);
    } catch (error) {
      const fieldMap = {
        title: 'title',
        description: 'description',
        category_id: 'categoryId',
        access_type: 'accessType',
      };

      if (error.field && fieldMap[error.field]) {
        setFieldErrors({ [fieldMap[error.field]]: error.message });
      } else {
        setFormError(error.message || 'Не удалось создать квиз');
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="create-quiz-page">
      <Header
        userName={currentUser?.name || 'Quizzy'}
        onLogout={onLogout}
        onOpenHome={onOpenHome}
        onOpenCreateQuiz={onOpenCreateQuiz}
        onJoinByCodeSuccess={onJoinByCodeSuccess}
      />

      <main className="create-quiz-main">
        <div className="create-quiz-container create-quiz-content">
          <div className="create-quiz-title-row">
            <button type="button" className="create-quiz-back" onClick={onOpenHome}>
              <ArrowLeftIcon />
            </button>
            <h1>Создать квиз</h1>
          </div>

          <section className="create-quiz-card">
            <form className="create-quiz-form" onSubmit={(event) => event.preventDefault()} noValidate>
              <div className="create-quiz-field">
                <label htmlFor="quiz-title">Название квиза</label>
                <input
                  id="quiz-title"
                  type="text"
                  placeholder="Например: История России XIX века"
                  value={quizDraft.title}
                  onChange={(event) => updateDraftField('title', event.target.value)}
                  className={fieldErrors.title ? 'is-invalid' : ''}
                />
                {fieldErrors.title ? (
                  <p className="create-quiz-error-text">{fieldErrors.title}</p>
                ) : null}
              </div>

              <div className="create-quiz-field">
                <label htmlFor="quiz-description">Описание</label>
                <textarea
                  id="quiz-description"
                  placeholder="Краткое описание квиза..."
                  value={quizDraft.description}
                  onChange={(event) => updateDraftField('description', event.target.value)}
                  className={fieldErrors.description ? 'is-invalid' : ''}
                />
                {fieldErrors.description ? (
                  <p className="create-quiz-error-text">{fieldErrors.description}</p>
                ) : null}
              </div>

              <div className="create-quiz-field">
                <label htmlFor="quiz-category">Категория</label>
                <div className="create-quiz-select-wrap">
                  <select
                    id="quiz-category"
                    value={quizDraft.categoryId}
                    onChange={(event) => updateDraftField('categoryId', event.target.value)}
                    className={fieldErrors.categoryId ? 'is-invalid' : ''}
                    disabled={isLoadingCategories || categories.length === 0}
                  >
                    {categories.length === 0 ? (
                      <option value="">
                        {isLoadingCategories ? 'Загрузка категорий...' : 'Нет доступных категорий'}
                      </option>
                    ) : null}
                    {categories.map((category) => (
                      <option key={category.category_id} value={String(category.category_id)}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>
                {fieldErrors.categoryId ? (
                  <p className="create-quiz-error-text">{fieldErrors.categoryId}</p>
                ) : null}
              </div>

              <div className="create-quiz-field">
                <span className="create-quiz-field-title">Тип доступа</span>
                <div className="create-quiz-access-grid">
                  <button
                    type="button"
                    className={`create-quiz-access-card${
                      quizDraft.accessType === 'public' ? ' is-active' : ''
                    }${fieldErrors.accessType ? ' is-invalid' : ''}`}
                    onClick={() => updateDraftField('accessType', 'public')}
                  >
                    <span className="create-quiz-access-icon">
                      <GlobeIcon />
                    </span>
                    <span className="create-quiz-access-copy">
                      <strong>Публичный</strong>
                      <span>Виден всем</span>
                    </span>
                  </button>

                  <button
                    type="button"
                    className={`create-quiz-access-card${
                      quizDraft.accessType === 'private' ? ' is-active' : ''
                    }${fieldErrors.accessType ? ' is-invalid' : ''}`}
                    onClick={() => updateDraftField('accessType', 'private')}
                  >
                    <span className="create-quiz-access-icon">
                      <LockIcon />
                    </span>
                    <span className="create-quiz-access-copy">
                      <strong>Приватный</strong>
                      <span>Только по коду</span>
                    </span>
                  </button>
                </div>
                {fieldErrors.accessType ? (
                  <p className="create-quiz-error-text">{fieldErrors.accessType}</p>
                ) : null}
              </div>

              {formError ? <p className="create-quiz-form-error">{formError}</p> : null}

              <div className="create-quiz-actions-row">
                <button type="button" className="create-quiz-secondary-btn" disabled>
                  Сохранить черновик
                </button>
                <button
                  type="button"
                  className="create-quiz-primary-btn"
                  onClick={handleSubmit}
                  disabled={isSubmitting || isLoadingCategories}
                >
                  <span>{isSubmitting ? 'Создание...' : 'Перейти к вопросам'}</span>
                  <span className="create-quiz-primary-icon">
                    <ArrowRightIcon />
                  </span>
                </button>
              </div>
            </form>
          </section>
        </div>
      </main>
    </div>
  );
}

export default CreateQuizPage;
