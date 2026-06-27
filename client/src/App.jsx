import { useEffect, useState } from 'react';
import { Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import { getCurrentUser } from './api/authApi';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import HomePage from './pages/HomePage';
import CreateQuizPage from './pages/CreateQuizPage';
import AddQuestionsPage from './pages/AddQuestionsPage';
import WaitingRoomPage from './pages/WaitingRoomPage';
import HostQuizPage from './pages/HostQuizPage';
import ParticipantWaitingPage from './pages/ParticipantWaitingPage';
import ParticipantQuizPage from './pages/ParticipantQuizPage';

function readStoredUser() {
  const rawUser = sessionStorage.getItem('quizzy_user');

  if (!rawUser) {
    return null;
  }

  try {
    return JSON.parse(rawUser);
  } catch (error) {
    sessionStorage.removeItem('quizzy_user');
    return null;
  }
}

function ProtectedRoute({ children }) {
  const token = sessionStorage.getItem('quizzy_token');

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

function App() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(() => readStoredUser());
  const [createdQuiz, setCreatedQuiz] = useState(null);

  useEffect(() => {
    const token = sessionStorage.getItem('quizzy_token');

    if (!token) {
      setCurrentUser(null);
      return;
    }

    getCurrentUser(token)
      .then((user) => {
        setCurrentUser(user);
        sessionStorage.setItem('quizzy_user', JSON.stringify(user));
      })
      .catch(() => {
        sessionStorage.removeItem('quizzy_token');
        sessionStorage.removeItem('quizzy_user');
        setCurrentUser(null);
      });
  }, []);

  const handleAuthSuccess = (authData) => {
    const user = {
      user_id: authData.user_id,
      name: authData.name,
      email: authData.email,
    };

    sessionStorage.setItem('quizzy_token', authData.token);
    sessionStorage.setItem('quizzy_user', JSON.stringify(user));
    setCurrentUser(user);
    navigate('/home');
  };

  const handleLogout = () => {
    sessionStorage.removeItem('quizzy_token');
    sessionStorage.removeItem('quizzy_user');
    setCurrentUser(null);
    setCreatedQuiz(null);
    navigate('/');
  };

  const handleJoinByCodeSuccess = ({ session_id: sessionId }) => {
    if (!sessionId) {
      return;
    }

    navigate(`/sessions/${sessionId}/participant-waiting`);
  };

  const protectedPageProps = {
    currentUser,
    onLogout: handleLogout,
    onOpenHome: () => navigate('/home'),
    onOpenCreateQuiz: () => navigate('/create-quiz'),
    onJoinByCodeSuccess: handleJoinByCodeSuccess,
  };

  return (
    <Routes>
      <Route
        path="/"
        element={
          <LandingPage
            onOpenLogin={() => navigate('/login')}
            onOpenRegister={() => navigate('/register')}
          />
        }
      />
      <Route
        path="/login"
        element={
          <LoginPage
            onOpenLanding={() => navigate('/')}
            onOpenRegister={() => navigate('/register')}
            onAuthSuccess={handleAuthSuccess}
          />
        }
      />
      <Route
        path="/register"
        element={
          <RegisterPage
            onOpenLanding={() => navigate('/')}
            onOpenLogin={() => navigate('/login')}
            onAuthSuccess={handleAuthSuccess}
          />
        }
      />
      <Route
        path="/home"
        element={
          <ProtectedRoute>
            <HomePage {...protectedPageProps} />
          </ProtectedRoute>
        }
      />
      <Route
        path="/create-quiz"
        element={
          <ProtectedRoute>
            <CreateQuizPage {...protectedPageProps} onQuizSaved={setCreatedQuiz} />
          </ProtectedRoute>
        }
      />
      <Route
        path="/quizzes/:quizId/edit"
        element={
          <ProtectedRoute>
            <CreateQuizPage {...protectedPageProps} onQuizSaved={setCreatedQuiz} />
          </ProtectedRoute>
        }
      />
      <Route
        path="/quizzes/:quizId/questions"
        element={
          <ProtectedRoute>
            <AddQuestionsPage {...protectedPageProps} createdQuiz={createdQuiz} />
          </ProtectedRoute>
        }
      />
      <Route
        path="/sessions/:sessionId/waiting"
        element={
          <ProtectedRoute>
            <WaitingRoomPage
              {...protectedPageProps}
              onOpenHostQuiz={() => navigate('/host-quiz')}
            />
          </ProtectedRoute>
        }
      />
      <Route
        path="/sessions/:sessionId/participant-waiting"
        element={
          <ProtectedRoute>
            <ParticipantWaitingPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/host-quiz"
        element={
          <ProtectedRoute>
            <HostQuizPage {...protectedPageProps} />
          </ProtectedRoute>
        }
      />
      <Route path="/participant-quiz" element={<ParticipantQuizPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
