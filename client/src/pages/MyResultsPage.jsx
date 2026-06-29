import { useEffect, useState } from 'react';
import Header from '../components/Header';
import RecentResultsList from '../components/RecentResultsList';
import { getCurrentUser } from '../api/authApi';
import { getProfile } from '../api/profileApi';
import '../styles/profile.css';

function MyResultsPage({
  currentUser,
  onLogout,
  onOpenHome,
  onOpenCreateQuiz,
  onJoinByCodeSuccess,
  onOpenProfile,
  onOpenResults,
  onOpenMyQuizzes,
}) {
  const [profile, setProfile] = useState(null);
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

    async function loadProfile() {
      try {
        setIsLoading(true);
        let response;

        try {
          response = await getProfile(token);
        } catch (error) {
          if (error.status !== 404) {
            throw error;
          }

          const user = await getCurrentUser(token);
          response = {
            name: user.name,
            email: user.email,
            stats: {
              completedQuizzes: 0,
              createdQuizzes: 0,
              bestScore: 0,
              averageScore: 0,
            },
            recentResults: [],
          };
        }

        if (!isMounted) {
          return;
        }

        setProfile(response);
        setPageError('');
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setPageError(error.message || 'Не удалось загрузить результаты');
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadProfile();

    return () => {
      isMounted = false;
    };
  }, []);

  const displayName = profile?.name || currentUser?.name || 'Quizzy';
  const displayEmail = profile?.email || currentUser?.email || '';

  return (
    <div className="profile-page">
      <Header
        userName={displayName}
        userEmail={displayEmail}
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
            <h1>Мои результаты</h1>
          </section>

          {isLoading ? (
            <section className="profile-note-card">
              <p className="profile-note">Загрузка результатов...</p>
            </section>
          ) : pageError ? (
            <section className="profile-note-card">
              <p className="profile-note profile-note-error">{pageError}</p>
            </section>
          ) : (
            <RecentResultsList title="Последние результаты" results={profile?.recentResults || []} />
          )}
        </div>
      </main>
    </div>
  );
}

export default MyResultsPage;
