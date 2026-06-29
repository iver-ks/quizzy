import { useEffect, useState } from 'react';
import Header from '../components/Header';
import ProfileStatsGrid from '../components/ProfileStatsGrid';
import RecentResultsList from '../components/RecentResultsList';
import { getCurrentUser } from '../api/authApi';
import { getProfile } from '../api/profileApi';
import { getMyQuizzes } from '../api/quizApi';
import logoIcon from '../assets/quizzy-logo.png';
import '../styles/profile.css';

function ProfilePage({
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

          const [user, myQuizzes] = await Promise.all([
            getCurrentUser(token),
            getMyQuizzes(token).catch(() => []),
          ]);

          response = {
            name: user.name,
            email: user.email,
            stats: {
              completedQuizzes: 0,
              createdQuizzes: Array.isArray(myQuizzes) ? myQuizzes.length : 0,
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

        setPageError(error.message || 'Не удалось загрузить профиль');
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
            <h1>Мой профиль</h1>
          </section>

          {isLoading ? (
            <section className="profile-note-card">
              <p className="profile-note">Загрузка профиля...</p>
            </section>
          ) : pageError ? (
            <section className="profile-note-card">
              <p className="profile-note profile-note-error">{pageError}</p>
            </section>
          ) : (
            <>
              <section className="profile-user-card">
                <div className="profile-user-top">
                  <div className="profile-user-avatar">{displayName.charAt(0).toUpperCase()}</div>
                  <div className="profile-user-copy">
                    <h2>{displayName}</h2>
                    <p>{displayEmail}</p>
                  </div>
                </div>
                <ProfileStatsGrid stats={profile?.stats} />
              </section>
              <RecentResultsList results={profile?.recentResults || []} />
            </>
          )}
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

export default ProfilePage;
