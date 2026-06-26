import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getQuizById } from '../api/quizApi';
import {
  createQuestion,
  deleteQuestion,
  getQuizQuestions,
  updateQuestion,
  uploadQuestionImage,
} from '../api/questionApi';
import Header from '../components/Header';
import '../styles/addQuestions.css';

const MAX_OPTIONS = 6;
const MIN_OPTIONS = 2;
const VALID_TIME_LIMITS = ['10', '15', '20', '30', '45', '60'];
const VALID_POINTS = [10, 20, 30, 40, 50, 100];
const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

function createDraftOption(index) {
  return {
    clientId: `option-${Date.now()}-${index}-${Math.random().toString(16).slice(2)}`,
    option_id: null,
    option_text: '',
    is_correct: index === 0,
    option_order: index + 1,
  };
}

function createDraftQuestion(order = 1) {
  return {
    clientId: `question-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    question_id: null,
    quiz_id: null,
    question_text: '',
    image_url: null,
    imagePreviewUrl: '',
    pendingImageFile: null,
    answer_type: 'single',
    time_limit_seconds: '10',
    points: 10,
    question_order: order,
    options: Array.from({ length: 4 }, (_, index) => createDraftOption(index)),
    errors: {},
    formError: '',
    isSaving: false,
    isSaved: false,
    isDirty: false,
  };
}

function mapQuestionFromApi(question) {
  return {
    clientId: `question-${question.question_id}`,
    question_id: Number(question.question_id),
    quiz_id: Number(question.quiz_id),
    question_text: question.question_text ?? '',
    image_url: question.image_url,
    imagePreviewUrl: question.image_url ? `http://localhost:5000${question.image_url}` : '',
    pendingImageFile: null,
    answer_type: question.answer_type,
    time_limit_seconds: String(question.time_limit_seconds),
    points: Number(question.points),
    question_order: Number(question.question_order),
    options: (question.options || []).map((option, index) => ({
      clientId: `option-${option.option_id}`,
      option_id: Number(option.option_id),
      option_text: option.option_text ?? '',
      is_correct: Boolean(option.is_correct),
      option_order: Number(option.option_order || index + 1),
    })),
    errors: {},
    formError: '',
    isSaving: false,
    isSaved: true,
    isDirty: false,
  };
}

function getQuestionSelectionId(question) {
  if (!question) {
    return '';
  }

  return question.question_id ? `saved-${question.question_id}` : question.clientId;
}

function findQuestionBySelectionId(questions, selectionId) {
  return questions.find((question) => getQuestionSelectionId(question) === selectionId) ?? null;
}

function buildQuestionPayload(question, imageUrlOverride = null) {
  return {
    question_text: question.question_text.trim(),
    image_url: imageUrlOverride !== null ? imageUrlOverride : question.image_url,
    answer_type: question.answer_type,
    time_limit_seconds: Number(question.time_limit_seconds),
    points: Number(question.points),
    options: question.options.map((option) => ({
      option_text: option.option_text.trim(),
      is_correct: option.is_correct,
    })),
  };
}

function validateQuestion(question) {
  const errors = {};
  const trimmedQuestionText = question.question_text.trim();

  if (!trimmedQuestionText) {
    errors.question_text = 'Введите текст вопроса';
  } else if (trimmedQuestionText.length < 3) {
    errors.question_text = 'Текст вопроса должен содержать минимум 3 символа';
  } else if (trimmedQuestionText.length > 200) {
    errors.question_text = 'Текст вопроса не должен быть длиннее 200 символов';
  }

  if (!VALID_TIME_LIMITS.includes(String(question.time_limit_seconds))) {
    errors.time_limit_seconds = 'Выберите время на вопрос';
  }

  if (!VALID_POINTS.includes(Number(question.points))) {
    errors.points = 'Выберите количество баллов';
  }

  if (question.options.length < MIN_OPTIONS) {
    errors.options = 'Добавьте минимум 2 варианта ответа';
  } else if (question.options.length > MAX_OPTIONS) {
    errors.options = 'Можно добавить максимум 6 вариантов ответа';
  } else {
    for (const option of question.options) {
      const trimmedOptionText = option.option_text.trim();
      if (!trimmedOptionText) {
        errors.options = 'Вариант ответа не может быть пустым';
        break;
      }
      if (trimmedOptionText.length > 200) {
        errors.options = 'Вариант ответа не должен быть длиннее 200 символов';
        break;
      }
    }
  }

  const correctOptionsCount = question.options.filter((option) => option.is_correct).length;
  if (question.answer_type === 'single' && correctOptionsCount !== 1) {
    errors.options = 'Для вопроса с одним ответом выберите один правильный вариант';
  }
  if (question.answer_type === 'multiple' && correctOptionsCount < 1) {
    errors.options =
      'Для вопроса с несколькими ответами выберите хотя бы один правильный вариант';
  }

  if (question.pendingImageFile) {
    if (!IMAGE_TYPES.has(question.pendingImageFile.type)) {
      errors.image = 'Разрешены только изображения JPG, JPEG, PNG и WEBP';
    } else if (question.pendingImageFile.size > MAX_IMAGE_SIZE) {
      errors.image = 'Размер изображения не должен превышать 5 MB';
    }
  }

  return errors;
}

function resolveQuestionImagePreview(imageUrl) {
  return imageUrl ? `http://localhost:5000${imageUrl}` : '';
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 12h14" />
      <path d="M12 5v14" />
    </svg>
  );
}

function ArrowLeftIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m12 19-7-7 7-7" />
      <path d="M19 12H5" />
    </svg>
  );
}

function PlayIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 5a2 2 0 0 1 3.008-1.728l11.997 6.998a2 2 0 0 1 .003 3.458l-12 7A2 2 0 0 1 5 19z" />
    </svg>
  );
}

function UploadIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 3v12" />
      <path d="m7 8 5-5 5 5" />
      <path d="M5 21h14" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M10 11v6" />
      <path d="M14 11v6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
      <path d="M3 6h18" />
      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  );
}

function AddQuestionsPage({
  currentUser,
  onLogout,
  createdQuiz,
  onOpenHome,
  onOpenCreateQuiz,
  onOpenWaitingRoom,
  onJoinByCodeSuccess,
}) {
  const navigate = useNavigate();
  const { quizId } = useParams();
  const [questions, setQuestions] = useState([createDraftQuestion(1)]);
  const [activeQuestionId, setActiveQuestionId] = useState(getQuestionSelectionId(questions[0]));
  const [quizData, setQuizData] = useState(createdQuiz);
  const [pageError, setPageError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [topMessage, setTopMessage] = useState('');
  const questionsRef = useRef(questions);
  const activeQuestionIdRef = useRef(activeQuestionId);

  useEffect(() => {
    questionsRef.current = questions;
    activeQuestionIdRef.current = activeQuestionId;
  }, [questions, activeQuestionId]);

  useEffect(() => {
    const token = localStorage.getItem('quizzy_token');

    if (!token || !quizId) {
      setPageError('Требуется авторизация');
      setIsLoading(false);
      return;
    }

    let isMounted = true;

    async function loadPage() {
      setIsLoading(true);
      setPageError('');

      try {
        const [quiz, savedQuestions] = await Promise.all([
          getQuizById(quizId, token),
          getQuizQuestions(quizId, token),
        ]);

        if (!isMounted) {
          return;
        }

        setQuizData(quiz);

        if (savedQuestions.length > 0) {
          const mappedQuestions = savedQuestions.map(mapQuestionFromApi);
          setQuestions(mappedQuestions);
          setActiveQuestionId(getQuestionSelectionId(mappedQuestions[0]));
        } else {
          const draftQuestion = createDraftQuestion(1);
          setQuestions([draftQuestion]);
          setActiveQuestionId(getQuestionSelectionId(draftQuestion));
        }
      } catch (error) {
        if (isMounted) {
          setPageError(error.message || 'Не удалось загрузить вопросы');
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
  }, [createdQuiz, quizId]);

  const activeQuestion =
    useMemo(
      () => findQuestionBySelectionId(questions, activeQuestionId) ?? questions[0],
      [questions, activeQuestionId]
    ) || questions[0];

  function replaceQuestion(targetClientId, updatedQuestion) {
    setQuestions((currentQuestions) =>
      currentQuestions.map((question) =>
        question.clientId === targetClientId ? updatedQuestion : question
      )
    );
  }

  function updateActiveQuestion(updater) {
    setQuestions((currentQuestions) =>
      currentQuestions.map((question) =>
        getQuestionSelectionId(question) === activeQuestionId
          ? {
              ...updater(question),
              isSaved: Boolean(question.question_id),
              isDirty: true,
            }
          : question
      )
    );
    setTopMessage('');
  }

  function setQuestionError(questionClientId, nextErrors, formError = '') {
    setQuestions((currentQuestions) =>
      currentQuestions.map((question) =>
        question.clientId === questionClientId
          ? {
              ...question,
              errors: nextErrors,
              formError,
            }
          : question
      )
    );
  }

  function clearQuestionFeedback(questionClientId) {
    setQuestions((currentQuestions) =>
      currentQuestions.map((question) =>
        question.clientId === questionClientId
          ? {
              ...question,
              errors: {},
              formError: '',
            }
          : question
      )
    );
  }

  function handleTypeChange(type) {
    updateActiveQuestion((question) => {
      const nextOptions = question.options.map((option, index) => {
        if (type === 'single') {
          const firstCorrectIndex = question.options.findIndex((item) => item.is_correct);
          const normalizedCorrectIndex = firstCorrectIndex >= 0 ? firstCorrectIndex : 0;
          return { ...option, is_correct: index === normalizedCorrectIndex };
        }

        return { ...option };
      });

      if (type === 'multiple' && !nextOptions.some((option) => option.is_correct) && nextOptions[0]) {
        nextOptions[0].is_correct = true;
      }

      return {
        ...question,
        answer_type: type,
        options: nextOptions,
        errors: {
          ...question.errors,
          options: '',
        },
      };
    });
  }

  function handleOptionTextChange(optionClientId, text) {
    updateActiveQuestion((question) => ({
      ...question,
      options: question.options.map((option) =>
        option.clientId === optionClientId ? { ...option, option_text: text } : option
      ),
      errors: {
        ...question.errors,
        options: '',
      },
    }));
  }

  function handleCorrectAnswerChange(optionClientId) {
    updateActiveQuestion((question) => {
      const nextOptions =
        question.answer_type === 'single'
          ? question.options.map((option) => ({
              ...option,
              is_correct: option.clientId === optionClientId,
            }))
          : question.options.map((option) =>
              option.clientId === optionClientId
                ? { ...option, is_correct: !option.is_correct }
                : option
            );

      if (question.answer_type === 'multiple' && !nextOptions.some((option) => option.is_correct)) {
        nextOptions[0] = { ...nextOptions[0], is_correct: true };
      }

      return {
        ...question,
        options: nextOptions,
        errors: {
          ...question.errors,
          options: '',
        },
      };
    });
  }

  function handleDeleteOption(optionClientId) {
    updateActiveQuestion((question) => {
      if (question.options.length <= MIN_OPTIONS) {
        return question;
      }

      const nextOptions = question.options
        .filter((option) => option.clientId !== optionClientId)
        .map((option, index) => ({
          ...option,
          option_order: index + 1,
        }));

      if (!nextOptions.some((option) => option.is_correct) && nextOptions[0]) {
        nextOptions[0] = { ...nextOptions[0], is_correct: true };
      }

      return {
        ...question,
        options: nextOptions,
        errors: {
          ...question.errors,
          options: '',
        },
      };
    });
  }

  function handleDeleteQuestion(questionClientId) {
    const questionToDelete = questions.find((question) => question.clientId === questionClientId);
    const token = localStorage.getItem('quizzy_token');

    async function deleteStoredQuestion() {
      if (questionToDelete?.question_id && token) {
        try {
          await deleteQuestion(questionToDelete.question_id, token);
        } catch (error) {
          setTopMessage(error.message || 'Не удалось удалить вопрос');
          return false;
        }
      }

      setQuestions((currentQuestions) => {
        const remainingQuestions = currentQuestions
          .filter((question) => question.clientId !== questionClientId)
          .map((question, index) => ({
            ...question,
            question_order: index + 1,
          }));

        if (remainingQuestions.length === 0) {
          const draftQuestion = createDraftQuestion(1);
          setActiveQuestionId(getQuestionSelectionId(draftQuestion));
          return [draftQuestion];
        }

        if (questionClientId === activeQuestion?.clientId) {
          setActiveQuestionId(getQuestionSelectionId(remainingQuestions[0]));
        }

        return remainingQuestions;
      });

      setTopMessage('');
      return true;
    }

    deleteStoredQuestion();
  }

  function handleAddOption() {
    updateActiveQuestion((question) => {
      if (question.options.length >= MAX_OPTIONS) {
        return question;
      }

      return {
        ...question,
        options: [
          ...question.options,
          {
            ...createDraftOption(question.options.length),
            is_correct: false,
            option_order: question.options.length + 1,
          },
        ],
        errors: {
          ...question.errors,
          options: '',
        },
      };
    });
  }

  const canAddOption = activeQuestion ? activeQuestion.options.length < MAX_OPTIONS : false;

  function handleAddQuestion() {
    const nextQuestion = createDraftQuestion(questions.length + 1);
    setQuestions((currentQuestions) => [
      ...currentQuestions.map((question, index) => ({
        ...question,
        question_order: index + 1,
      })),
      nextQuestion,
    ]);
    setActiveQuestionId(getQuestionSelectionId(nextQuestion));
    setTopMessage('');
  }

  function handleFileChange(event) {
    const [file] = event.target.files ?? [];

    updateActiveQuestion((question) => {
      if (!file) {
        return {
          ...question,
          pendingImageFile: null,
          imagePreviewUrl: question.image_url ? resolveQuestionImagePreview(question.image_url) : '',
          errors: {
            ...question.errors,
            image: '',
          },
        };
      }

      let imageError = '';
      if (!IMAGE_TYPES.has(file.type)) {
        imageError = 'Разрешены только изображения JPG, JPEG, PNG и WEBP';
      } else if (file.size > MAX_IMAGE_SIZE) {
        imageError = 'Размер изображения не должен превышать 5 MB';
      }

      return {
        ...question,
        pendingImageFile: imageError ? null : file,
        imagePreviewUrl: imageError ? question.imagePreviewUrl : URL.createObjectURL(file),
        errors: {
          ...question.errors,
          image: imageError,
        },
      };
    });
  }

  async function persistQuestion(question) {
    const token = localStorage.getItem('quizzy_token');
    if (!token) {
      setTopMessage('Требуется авторизация');
      return;
    }

    const validationErrors = validateQuestion(question);
    if (Object.keys(validationErrors).length > 0) {
      setQuestionError(question.clientId, validationErrors);
      return;
    }

    clearQuestionFeedback(question.clientId);
    replaceQuestion(question.clientId, { ...question, isSaving: true });

    try {
      let imageUrl = question.image_url;

      if (question.pendingImageFile) {
        const uploadResponse = await uploadQuestionImage(question.pendingImageFile, token);
        imageUrl = uploadResponse.image_url;
      }

      const payload = buildQuestionPayload(question, imageUrl);
      const response = question.question_id
        ? await updateQuestion(question.question_id, payload, token)
        : await createQuestion(quizId, payload, token);

      const mappedQuestion = mapQuestionFromApi(response);
      const savedQuestion = {
        ...mappedQuestion,
        clientId: question.question_id ? mappedQuestion.clientId : question.clientId,
        isSaving: false,
        isSaved: true,
        isDirty: false,
      };

      replaceQuestion(question.clientId, savedQuestion);
      setActiveQuestionId(getQuestionSelectionId(savedQuestion));
    } catch (error) {
      const fieldMap = {
        question_text: 'question_text',
        image: 'image',
        answer_type: 'answer_type',
        time_limit_seconds: 'time_limit_seconds',
        points: 'points',
        options: 'options',
      };

      if (error.field && fieldMap[error.field]) {
        setQuestionError(question.clientId, { [fieldMap[error.field]]: error.message });
      } else {
        setQuestionError(question.clientId, {}, error.message || 'Не удалось сохранить вопрос');
      }
    } finally {
      setQuestions((currentQuestions) =>
        currentQuestions.map((item) =>
          item.clientId === question.clientId ? { ...item, isSaving: false } : item
        )
      );
    }
  }

  async function handleSaveActiveQuestion() {
    const currentQuestion = findQuestionBySelectionId(
      questionsRef.current,
      activeQuestionIdRef.current
    );

    if (!currentQuestion) {
      return;
    }

    await persistQuestion(currentQuestion);
  }

  function getSaveQuestionLabel(question) {
    if (!question.question_id) {
      return 'Сохранить вопрос';
    }

    if (question.isDirty) {
      return 'Сохранить изменения';
    }

    return 'Сохранено';
  }

  function handleGoBackToQuiz() {
    navigate(`/quizzes/${quizId}/edit`);
  }

  async function handleLaunchQuiz() {
    const storedQuestions = questions.filter((question) => question.question_id);

    if (storedQuestions.length === 0) {
      setTopMessage('Добавьте хотя бы один вопрос');
      return;
    }

    setTopMessage('Запуск квиза будет реализован на следующем этапе.');
  }

  if (isLoading) {
    return (
      <div className="add-questions-page">
        <Header
          userName={currentUser?.name || 'Quizzy'}
          onLogout={onLogout}
          onOpenHome={onOpenHome}
          onOpenCreateQuiz={onOpenCreateQuiz}
          onJoinByCodeSuccess={onJoinByCodeSuccess}
        />
        <main className="add-questions-main">
          <div className="add-questions-container">
            <p className="add-questions-page-message">Загрузка вопросов...</p>
          </div>
        </main>
      </div>
    );
  }

  if (pageError) {
    return (
      <div className="add-questions-page">
        <Header
          userName={currentUser?.name || 'Quizzy'}
          onLogout={onLogout}
          onOpenHome={onOpenHome}
          onOpenCreateQuiz={onOpenCreateQuiz}
          onJoinByCodeSuccess={onJoinByCodeSuccess}
        />
        <main className="add-questions-main">
          <div className="add-questions-container">
            <p className="add-questions-page-error">{pageError}</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="add-questions-page">
      <Header
        userName={currentUser?.name || 'Quizzy'}
        onLogout={onLogout}
        onOpenHome={onOpenHome}
        onOpenCreateQuiz={onOpenCreateQuiz}
        onJoinByCodeSuccess={onJoinByCodeSuccess}
      />

      <main className="add-questions-main">
        <div className="add-questions-container">
          <section className="add-questions-topbar">
            <div className="add-questions-title-wrap">
              <button type="button" className="add-questions-back" onClick={handleGoBackToQuiz}>
                <ArrowLeftIcon />
              </button>
              <div className="add-questions-heading">
                <h1>Добавление вопросов</h1>
                <span>- {quizData?.title || 'Без названия'}</span>
              </div>
            </div>

            <div className="add-questions-top-actions">
              <button type="button" className="add-questions-save-btn" onClick={handleSaveActiveQuestion}>
                Сохранить квиз
              </button>
              <button
                type="button"
                className="add-questions-launch-btn"
                onClick={handleLaunchQuiz}
              >
                <span className="add-questions-launch-icon">
                  <PlayIcon />
                </span>
                <span>Запустить квиз</span>
              </button>
            </div>
          </section>

          {topMessage ? <p className="add-questions-page-message">{topMessage}</p> : null}

          <section className="add-questions-layout">
            <aside className="questions-sidebar-card">
              <h2>Вопросы ({questions.length})</h2>

              <div className="questions-sidebar-list">
                {questions.map((question, index) => {
                  const isActive = getQuestionSelectionId(question) === activeQuestionId;
                  const sidebarTitle = question.question_text.trim() || `Новый вопрос ${index + 1}`;

                  return (
                    <div
                      key={question.clientId}
                      className={`questions-sidebar-item${isActive ? ' is-active' : ''}`}
                    >
                      <button
                        type="button"
                        className="questions-sidebar-item-main"
                        onClick={() => setActiveQuestionId(getQuestionSelectionId(question))}
                      >
                        <span>{index + 1}.</span>
                        <span>{sidebarTitle}</span>
                      </button>

                      <button
                        type="button"
                        className="questions-sidebar-delete question-option-delete"
                        onClick={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          handleDeleteQuestion(question.clientId);
                        }}
                        aria-label="Удалить вопрос"
                      >
                        <TrashIcon />
                      </button>
                    </div>
                  );
                })}
              </div>

              <button type="button" className="questions-sidebar-add" onClick={handleAddQuestion}>
                <span className="questions-sidebar-add-icon">
                  <PlusIcon />
                </span>
                <span>Добавить вопрос</span>
              </button>
            </aside>

            <section className="question-editor-card">
              <div className="question-editor-header">
                <h2>
                  Вопрос {questions.findIndex((question) => question.clientId === activeQuestion.clientId) + 1}
                </h2>

                <div className="question-type-toggle">
                  <button
                    type="button"
                    className={`question-type-btn${activeQuestion.answer_type === 'single' ? ' is-active' : ''}`}
                    onClick={() => handleTypeChange('single')}
                  >
                    Один ответ
                  </button>
                  <button
                    type="button"
                    className={`question-type-btn${activeQuestion.answer_type === 'multiple' ? ' is-active' : ''}`}
                    onClick={() => handleTypeChange('multiple')}
                  >
                    Несколько ответов
                  </button>
                </div>
              </div>

              <div className="question-editor-field">
                <label htmlFor="question-text">Текст вопроса</label>
                <textarea
                  id="question-text"
                  placeholder="Введите текст вопроса..."
                  value={activeQuestion.question_text}
                  onChange={(event) =>
                    updateActiveQuestion((question) => ({
                      ...question,
                      question_text: event.target.value,
                      errors: {
                        ...question.errors,
                        question_text: '',
                      },
                    }))
                  }
                  className={activeQuestion.errors.question_text ? 'is-invalid' : ''}
                />
                {activeQuestion.errors.question_text ? (
                  <p className="add-questions-error-text">{activeQuestion.errors.question_text}</p>
                ) : null}
              </div>

              <div className="question-image-upload">
                <label className="question-image-upload-label">
                  <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleFileChange} />
                  <span className="question-image-upload-icon">
                    <UploadIcon />
                  </span>
                  <span>{activeQuestion.pendingImageFile?.name || 'Добавить изображение'}</span>
                </label>
                {activeQuestion.imagePreviewUrl ? (
                  <div className="question-image-preview-wrap">
                    <img
                      src={activeQuestion.imagePreviewUrl}
                      alt="Превью вопроса"
                      className="question-image-preview"
                    />
                  </div>
                ) : null}
                {activeQuestion.errors.image ? (
                  <p className="add-questions-error-text">{activeQuestion.errors.image}</p>
                ) : null}
              </div>

              <div className="question-options-section">
                <h3>Варианты ответов</h3>

                <div className="question-options-list">
                  {activeQuestion.options.map((option) => {
                    const deleteDisabled = activeQuestion.options.length <= MIN_OPTIONS;

                    return (
                      <div key={option.clientId} className="question-option-row">
                        <label className="question-option-control">
                          <input
                            type={activeQuestion.answer_type === 'single' ? 'radio' : 'checkbox'}
                            name={`question-${activeQuestion.clientId}`}
                            checked={option.is_correct}
                            onChange={() => handleCorrectAnswerChange(option.clientId)}
                          />
                          <span
                            className={`question-option-indicator question-option-indicator-${activeQuestion.answer_type}`}
                          />
                        </label>

                        <input
                          type="text"
                          className={`question-option-input${activeQuestion.errors.options ? ' is-invalid' : ''}`}
                          placeholder="Введите вариант ответа"
                          value={option.option_text}
                          onChange={(event) => handleOptionTextChange(option.clientId, event.target.value)}
                        />

                        <button
                          type="button"
                          className="question-option-delete"
                          onClick={() => handleDeleteOption(option.clientId)}
                          aria-label="Удалить вариант"
                          disabled={deleteDisabled}
                        >
                          <TrashIcon />
                        </button>
                      </div>
                    );
                  })}
                </div>

                <button
                  type="button"
                  className="question-add-option"
                  onClick={handleAddOption}
                  disabled={!canAddOption}
                >
                  <span className="question-add-option-icon">
                    <PlusIcon />
                  </span>
                  <span>Добавить вариант</span>
                </button>
                {activeQuestion.errors.options ? (
                  <p className="add-questions-error-text">{activeQuestion.errors.options}</p>
                ) : null}
              </div>

              <div className="question-settings-grid">
                <div className="question-setting-field">
                  <label htmlFor="question-time">Время (сек)</label>
                  <div className="question-setting-select-wrap">
                    <select
                      id="question-time"
                      value={activeQuestion.time_limit_seconds}
                      onChange={(event) =>
                        updateActiveQuestion((question) => ({
                          ...question,
                          time_limit_seconds: event.target.value,
                          errors: {
                            ...question.errors,
                            time_limit_seconds: '',
                          },
                        }))
                      }
                      className={activeQuestion.errors.time_limit_seconds ? 'is-invalid' : ''}
                    >
                      {VALID_TIME_LIMITS.map((value) => (
                        <option key={value} value={value}>
                          {value}
                        </option>
                      ))}
                    </select>
                  </div>
                  {activeQuestion.errors.time_limit_seconds ? (
                    <p className="add-questions-error-text">
                      {activeQuestion.errors.time_limit_seconds}
                    </p>
                  ) : null}
                </div>

                <div className="question-setting-field">
                  <label htmlFor="question-points">Баллы за вопрос</label>
                  <div className="question-setting-select-wrap">
                    <select
                      id="question-points"
                      value={activeQuestion.points}
                      onChange={(event) =>
                        updateActiveQuestion((question) => ({
                          ...question,
                          points: Number(event.target.value),
                          errors: {
                            ...question.errors,
                            points: '',
                          },
                        }))
                      }
                      className={activeQuestion.errors.points ? 'is-invalid' : ''}
                    >
                      {VALID_POINTS.map((value) => (
                        <option key={value} value={value}>
                          {value}
                        </option>
                      ))}
                    </select>
                  </div>
                  {activeQuestion.errors.points ? (
                    <p className="add-questions-error-text">{activeQuestion.errors.points}</p>
                  ) : null}
                </div>
              </div>

              {activeQuestion.formError ? (
                <p className="add-questions-form-error">{activeQuestion.formError}</p>
              ) : null}

              <div className="add-questions-editor-actions">
                {activeQuestion.question_id && !activeQuestion.isDirty && !activeQuestion.isSaving ? (
                  <span className="add-questions-saved-text">Сохранено</span>
                ) : null}
                {!activeQuestion.question_id || activeQuestion.isDirty || activeQuestion.isSaving ? (
                  <button
                    type="button"
                    className="add-questions-save-current-btn"
                    onClick={handleSaveActiveQuestion}
                    disabled={activeQuestion.isSaving}
                  >
                    {activeQuestion.isSaving ? 'Сохранение...' : getSaveQuestionLabel(activeQuestion)}
                  </button>
                ) : null}
              </div>
            </section>
          </section>
        </div>
      </main>
    </div>
  );
}

export default AddQuestionsPage;
