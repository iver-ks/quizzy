import { useEffect, useState } from 'react';
import Header from '../components/Header';
import { getMyQuizzes } from '../api/quizApi';
import '../styles/profile.css';

function formatStatus(status) {
  const labels = {
    draft: 'Черновик',
    waiting: 'Ожидание',
    active: 'Активен',
    finished: 'Завершён',
  };

  return labels[status] || status;
}

function MyQuizzesPage({
  currentUser,
  onLogout,
  onOpenHome,
  onOpenCreateQuiz,
  onJoinByCodeSuccess,
  onOpenProfile,
  onOpenResults,
  onOpenMyQuizzes,
}) {
  const [quizzes, setQuizzes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pageError, setPageError] = useState('');

  useEffect(() => {
    const token = sessionStorage.getItem('quizzy_token');

    if (!token) {
      setPageError('Требуется авторизация');
      setIsLoading(false);
      return;
    }

    let isMounted = true;

    async function loadQuizzes() {
      try {
        setIsLoading(true);
        const response = await getMyQuizzes(token);

        if (!isMounted) {
          return;
        }

        setQuizzes(Array.isArray(response) ? response : []);
        setPageError('');
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setPageError(error.message || 'Не удалось загрузить мои квизы');
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadQuizzes();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="profile-page">
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

      <main className="profile-main">
        <div className="app-container profile-shell">
          <section className="profile-section-head">
            <h1>Мои квизы</h1>
          </section>

          {isLoading ? (
            <section className="profile-note-card">
              <p className="profile-note">Загрузка квизов...</p>
            </section>
          ) : pageError ? (
            <section className="profile-note-card">
              <p className="profile-note profile-note-error">{pageError}</p>
            </section>
          ) : quizzes.length === 0 ? (
            <section className="profile-note-card">
              <p className="profile-note">Вы ещё не создали ни одного квиза</p>
            </section>
          ) : (
            <section className="profile-results-card">
              <div className="profile-section-head">
                <h2>Список квизов</h2>
              </div>

              <div className="profile-results-list">
                {quizzes.map((quiz) => (
                  <article key={quiz.quiz_id} className="profile-result-item">
                    <div className="profile-result-copy">
                      <strong>{quiz.title}</strong>
                      <span>{quiz.description || 'Без описания'}</span>
                    </div>
                    <div className="profile-result-meta">
                      <strong>{formatStatus(quiz.status)}</strong>
                      <span>{quiz.access_type === 'public' ? 'Публичный' : 'Приватный'}</span>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          )}
        </div>
      </main>
    </div>
  );
}

export default MyQuizzesPage;
