import { useParams } from 'react-router-dom';
import Header from '../components/Header';
import logoIcon from '../assets/quizzy-logo.png';
import '../styles/myResults.css';

function QuizResultsPlaceholderPage({
  currentUser,
  onLogout,
  onOpenHome,
  onOpenCreateQuiz,
  onJoinByCodeSuccess,
  onOpenProfile,
  onOpenResults,
  onOpenMyQuizzes,
}) {
  const { quizId } = useParams();

  return (
    <div className="my-results-page">
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

      <main className="my-results-main">
        <div className="app-container my-results-shell">
          <section className="my-results-header">
            <h1>Результаты квиза</h1>
          </section>

          <section className="my-results-empty-card">
            <p>Страница результатов для квиза #{quizId} появится позже</p>
          </section>
        </div>
      </main>

      <footer className="home-footer">
        <div className="app-container home-footer-inner">
          <div className="home-brand home-footer-brand">
            <img src={logoIcon} alt="" className="home-brand-icon" />
            <span className="home-brand-name">Quizzy</span>
          </div>
          <p>Платформа для проведения квизов в реальном времени</p>
          <span>© 2026 Quizzy. Все права защищены</span>
        </div>
      </footer>
    </div>
  );
}

export default QuizResultsPlaceholderPage;
