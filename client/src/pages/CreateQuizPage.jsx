import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { createQuiz, getCategories, getQuizById, updateQuiz } from '../api/quizApi';
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

function createEmptyDraft() {
  return {
    title: '',
    description: '',
    categoryId: '',
    accessType: 'public',
  };
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
  onOpenHome,
  onOpenCreateQuiz,
  onQuizSaved,
  onJoinByCodeSuccess,
  onOpenProfile,
  onOpenResults,
  onOpenMyQuizzes,
}) {
  const navigate = useNavigate();
  const { quizId } = useParams();
  const isEditMode = Boolean(quizId);
  const [draft, setDraft] = useState(createEmptyDraft);
  const [categories, setCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState('');

  useEffect(() => {
    const token = sessionStorage.getItem('quizzy_token');
    let isMounted = true;

    async function loadPage() {
      setIsLoading(true);
      setFieldErrors({});
      setFormError('');

      try {
        const categoryData = await getCategories();

        if (!isMounted) {
          return;
        }

        setCategories(categoryData);

        if (categoryData.length === 0) {
          setDraft(createEmptyDraft());
          setFormError('Категории пока не добавлены в базу данных.');
          return;
        }

        if (isEditMode) {
          if (!token) {
            navigate('/login');
            return;
          }

          const quiz = await getQuizById(quizId, token);

          if (!isMounted) {
            return;
          }

          setDraft({
            title: quiz.title ?? '',
            description: quiz.description ?? '',
            categoryId: String(quiz.category_id),
            accessType: quiz.access_type ?? 'public',
          });
          onQuizSaved?.(quiz);
        } else {
          setDraft({
            title: '',
            description: '',
            categoryId: String(categoryData[0].category_id),
            accessType: 'public',
          });
        }
      } catch (error) {
        if (isMounted) {
          setFormError(error.message || 'Не удалось загрузить данные квиза');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadPage();

    return () => {
      isMounted = false;
    };
  }, [isEditMode, navigate, onQuizSaved, quizId]);

  function updateDraftField(field, value) {
    setDraft((current) => ({
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
    const errors = validateQuizDraft(draft);

    if (categories.length === 0) {
      errors.categoryId = 'Выберите категорию';
      setFormError('Категории пока не добавлены в базу данных.');
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    const token = sessionStorage.getItem('quizzy_token');

    if (!token) {
      navigate('/login');
      return;
    }

    setIsSubmitting(true);
    setFieldErrors({});
    setFormError('');

    try {
      const payload = {
        title: draft.title.trim(),
        description: draft.description.trim(),
        category_id: Number(draft.categoryId),
        access_type: draft.accessType,
      };

      const savedQuiz = isEditMode
        ? await updateQuiz(quizId, payload, token)
        : await createQuiz(payload, token);

      onQuizSaved?.(savedQuiz);
      navigate(`/quizzes/${savedQuiz.quiz_id}/questions`);
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
        setFormError(error.message || 'Не удалось сохранить квиз');
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="create-quiz-page">
      <Header
        userName={currentUser?.name || 'Quizzy'}
        userEmail={currentUser?.email || ''}
        onLogout={onLogout}
        onOpenHome={onOpenHome}
        onOpenCreateQuiz={onOpenCreateQuiz}
        onJoinByCodeSuccess={onJoinByCodeSuccess}
        onOpenProfile={onOpenProfile}
        onOpenResults={onOpenResults}
        onOpenMyQuizzes={onOpenMyQuizzes}
      />

      <main className="create-quiz-main">
        <div className="create-quiz-container create-quiz-content">
          <div className="create-quiz-title-row">
            <button type="button" className="create-quiz-back" onClick={onOpenHome}>
              <ArrowLeftIcon />
            </button>
            <h1>{isEditMode ? 'Редактировать квиз' : 'Создать квиз'}</h1>
          </div>

          <section className="create-quiz-card">
            <form className="create-quiz-form" onSubmit={(event) => event.preventDefault()} noValidate>
              <div className="create-quiz-field">
                <label htmlFor="quiz-title">Название квиза</label>
                <input
                  id="quiz-title"
                  type="text"
                  placeholder="Например: История России XIX века"
                  value={draft.title}
                  onChange={(event) => updateDraftField('title', event.target.value)}
                  className={fieldErrors.title ? 'is-invalid' : ''}
                  disabled={isLoading}
                />
                {fieldErrors.title ? <p className="create-quiz-error-text">{fieldErrors.title}</p> : null}
              </div>

              <div className="create-quiz-field">
                <label htmlFor="quiz-description">Описание</label>
                <textarea
                  id="quiz-description"
                  placeholder="Краткое описание квиза..."
                  value={draft.description}
                  onChange={(event) => updateDraftField('description', event.target.value)}
                  className={fieldErrors.description ? 'is-invalid' : ''}
                  disabled={isLoading}
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
                    value={draft.categoryId}
                    onChange={(event) => updateDraftField('categoryId', event.target.value)}
                    className={fieldErrors.categoryId ? 'is-invalid' : ''}
                    disabled={isLoading || categories.length === 0}
                  >
                    {categories.length === 0 ? (
                      <option value="">
                        {isLoading ? 'Загрузка категорий...' : 'Нет доступных категорий'}
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
                      draft.accessType === 'public' ? ' is-active' : ''
                    }${fieldErrors.accessType ? ' is-invalid' : ''}`}
                    onClick={() => updateDraftField('accessType', 'public')}
                    disabled={isLoading}
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
                      draft.accessType === 'private' ? ' is-active' : ''
                    }${fieldErrors.accessType ? ' is-invalid' : ''}`}
                    onClick={() => updateDraftField('accessType', 'private')}
                    disabled={isLoading}
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
                  disabled={isSubmitting || isLoading}
                >
                  <span>
                    {isSubmitting
                      ? isEditMode
                        ? 'Сохранение...'
                        : 'Создание...'
                      : 'Перейти к вопросам'}
                  </span>
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
