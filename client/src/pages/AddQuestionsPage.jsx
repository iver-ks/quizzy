import { useMemo, useState } from 'react';
import Header from '../components/Header';
import '../styles/addQuestions.css';

const MAX_OPTIONS = 10;

function createDefaultQuestion(index) {
  return {
    id: index + 1,
    title: 'Новый вопрос',
    text: '',
    type: 'single',
    imageName: '',
    options: Array.from({ length: 4 }, (_, optionIndex) => ({
      id: `${index + 1}-${optionIndex + 1}`,
      text: '',
    })),
    correctAnswers: [`${index + 1}-1`],
    time: '10',
    points: '50',
  };
}

const initialQuestions = [createDefaultQuestion(0), createDefaultQuestion(1)];

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
  quizTitle,
  accessType,
  onOpenHome,
  onOpenCreateQuiz,
  onOpenWaitingRoom,
  onJoinByCodeSuccess,
}) {
  const [questions, setQuestions] = useState(initialQuestions);
  const [activeQuestionId, setActiveQuestionId] = useState(initialQuestions[0].id);
  const [nextQuestionId, setNextQuestionId] = useState(initialQuestions.length + 1);

  const activeQuestion = useMemo(
    () => questions.find((question) => question.id === activeQuestionId) ?? questions[0],
    [questions, activeQuestionId]
  );

  function updateActiveQuestion(updater) {
    setQuestions((currentQuestions) =>
      currentQuestions.map((question) =>
        question.id === activeQuestionId ? updater(question) : question
      )
    );
  }

  function handleTypeChange(type) {
    updateActiveQuestion((question) => ({
      ...question,
      type,
      correctAnswers:
        type === 'single'
          ? [question.correctAnswers[0] ?? question.options[0]?.id].filter(Boolean)
          : question.correctAnswers,
    }));
  }

  function handleOptionTextChange(optionId, text) {
    updateActiveQuestion((question) => ({
      ...question,
      options: question.options.map((option) =>
        option.id === optionId ? { ...option, text } : option
      ),
    }));
  }

  function handleCorrectAnswerChange(optionId) {
    updateActiveQuestion((question) => {
      if (question.type === 'single') {
        return { ...question, correctAnswers: [optionId] };
      }

      const hasOption = question.correctAnswers.includes(optionId);
      const nextCorrectAnswers = hasOption
        ? question.correctAnswers.filter((currentId) => currentId !== optionId)
        : [...question.correctAnswers, optionId];

      return {
        ...question,
        correctAnswers: nextCorrectAnswers.length > 0 ? nextCorrectAnswers : [optionId],
      };
    });
  }

  function handleDeleteOption(optionId) {
    updateActiveQuestion((question) => {
      if (question.options.length <= 2) {
        return question;
      }

      const nextOptions = question.options.filter((option) => option.id !== optionId);
      const nextCorrectAnswers = question.correctAnswers.filter((currentId) => currentId !== optionId);

      return {
        ...question,
        options: nextOptions,
        correctAnswers:
          nextCorrectAnswers.length > 0 ? nextCorrectAnswers : [nextOptions[0]?.id].filter(Boolean),
      };
    });
  }

  function handleDeleteQuestion(questionId) {
    setQuestions((currentQuestions) => {
      if (currentQuestions.length <= 1) {
        return currentQuestions;
      }

      const nextQuestions = currentQuestions.filter((question) => question.id !== questionId);

      if (questionId === activeQuestionId) {
        setActiveQuestionId(nextQuestions[0].id);
      }

      return nextQuestions;
    });
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
            id: `${question.id}-${Date.now()}`,
            text: '',
          },
        ],
      };
    });
  }

  const canAddOption = activeQuestion.options.length < MAX_OPTIONS;

  function handleAddQuestion() {
    const nextQuestion = createDefaultQuestion(nextQuestionId - 1);
    nextQuestion.id = nextQuestionId;
    nextQuestion.options = Array.from({ length: 4 }, (_, optionIndex) => ({
      id: `${nextQuestionId}-${optionIndex + 1}`,
      text: '',
    }));
    nextQuestion.correctAnswers = [`${nextQuestionId}-1`];

    setQuestions((currentQuestions) => [...currentQuestions, nextQuestion]);
    setActiveQuestionId(nextQuestion.id);
    setNextQuestionId((current) => current + 1);
  }

  function handleFileChange(event) {
    const [file] = event.target.files ?? [];
    updateActiveQuestion((question) => ({
      ...question,
      imageName: file ? file.name : '',
    }));
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
              <button type="button" className="add-questions-back" onClick={onOpenCreateQuiz}>
                <ArrowLeftIcon />
              </button>
              <div className="add-questions-heading">
                <h1>Добавление вопросов</h1>
                <span>- {quizTitle || 'Без названия'}</span>
              </div>
            </div>

            <div className="add-questions-top-actions">
              <button type="button" className="add-questions-save-btn">
                Сохранить квиз
              </button>
              <button
                type="button"
                className="add-questions-launch-btn"
                onClick={onOpenWaitingRoom}
              >
                <span className="add-questions-launch-icon">
                  <PlayIcon />
                </span>
                <span>Запустить квиз</span>
              </button>
            </div>
          </section>

          <section className="add-questions-layout">
            <aside className="questions-sidebar-card">
              <h2>Вопросы ({questions.length})</h2>

              <div className="questions-sidebar-list">
                {questions.map((question, index) => {
                  const isActive = question.id === activeQuestionId;
                  const sidebarTitle = question.text.trim() || `Новый вопрос ${index + 1}`;

                  return (
                    <div
                      key={question.id}
                      className={`questions-sidebar-item${isActive ? ' is-active' : ''}`}
                    >
                      <button
                        type="button"
                        className="questions-sidebar-item-main"
                        onClick={() => setActiveQuestionId(question.id)}
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
                          handleDeleteQuestion(question.id);
                        }}
                        aria-label="Удалить вопрос"
                        disabled={questions.length <= 1}
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
                <h2>Вопрос {questions.findIndex((question) => question.id === activeQuestion.id) + 1}</h2>

                <div className="question-type-toggle">
                  <button
                    type="button"
                    className={`question-type-btn${activeQuestion.type === 'single' ? ' is-active' : ''}`}
                    onClick={() => handleTypeChange('single')}
                  >
                    Один ответ
                  </button>
                  <button
                    type="button"
                    className={`question-type-btn${activeQuestion.type === 'multiple' ? ' is-active' : ''}`}
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
                  value={activeQuestion.text}
                  onChange={(event) =>
                    updateActiveQuestion((question) => ({
                      ...question,
                      text: event.target.value,
                    }))
                  }
                />
              </div>

              <div className="question-image-upload">
                <label className="question-image-upload-label">
                  <input type="file" accept="image/*" onChange={handleFileChange} />
                  <span className="question-image-upload-icon">
                    <UploadIcon />
                  </span>
                  <span>{activeQuestion.imageName || 'Добавить изображение'}</span>
                </label>
              </div>

              <div className="question-options-section">
                <h3>Варианты ответов</h3>

                <div className="question-options-list">
                  {activeQuestion.options.map((option) => {
                    const isChecked = activeQuestion.correctAnswers.includes(option.id);
                    const deleteDisabled = activeQuestion.options.length <= 2;

                    return (
                      <div key={option.id} className="question-option-row">
                        <label className="question-option-control">
                          <input
                            type={activeQuestion.type === 'single' ? 'radio' : 'checkbox'}
                            name={`question-${activeQuestion.id}`}
                            checked={isChecked}
                            onChange={() => handleCorrectAnswerChange(option.id)}
                          />
                          <span
                            className={`question-option-indicator question-option-indicator-${activeQuestion.type}`}
                          />
                        </label>

                        <input
                          type="text"
                          className="question-option-input"
                          placeholder="Введите вариант ответа"
                          value={option.text}
                          onChange={(event) => handleOptionTextChange(option.id, event.target.value)}
                        />

                        <button
                          type="button"
                          className="question-option-delete"
                          onClick={() => handleDeleteOption(option.id)}
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
              </div>

              <div className="question-settings-grid">
                <div className="question-setting-field">
                  <label htmlFor="question-time">Время (сек)</label>
                  <div className="question-setting-select-wrap">
                    <select
                      id="question-time"
                      value={activeQuestion.time}
                      onChange={(event) =>
                        updateActiveQuestion((question) => ({
                          ...question,
                          time: event.target.value,
                        }))
                      }
                    >
                      {['10', '15', '20', '30', '45', '60'].map((value) => (
                        <option key={value} value={value}>
                          {value}
                        </option>
                      ))}
                    </select>
                  </div>
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
                          points: event.target.value,
                        }))
                      }
                    >
                      {['10', '20', '30', '40', '50', '100'].map((value) => (
                        <option key={value} value={value}>
                          {value}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </section>
          </section>
        </div>
      </main>
    </div>
  );
}

export default AddQuestionsPage;
