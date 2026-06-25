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
  const rawUser = localStorage.getItem('quizzy_user');

  if (!rawUser) {
    return null;
  }

  try {
    return JSON.parse(rawUser);
  } catch (error) {
    localStorage.removeItem('quizzy_user');
    return null;
  }
}

function ProtectedRoute({ children }) {
  const token = localStorage.getItem('quizzy_token');

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

function App() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(() => readStoredUser());
  const [quizDraft, setQuizDraft] = useState({
    title: 'История России XIX века',
    description: '',
    category: 'История',
    accessType: 'public',
  });
  const [participantRoom, setParticipantRoom] = useState({
    quizTitle: 'История России XIX века',
    organizerName: 'Алексей К.',
    roomCode: '482913',
    participantsCount: 7,
  });

  useEffect(() => {
    const token = localStorage.getItem('quizzy_token');

    if (!token) {
      setCurrentUser(null);
      return;
    }

    getCurrentUser(token)
      .then((user) => {
        setCurrentUser(user);
        localStorage.setItem('quizzy_user', JSON.stringify(user));
      })
      .catch(() => {
        localStorage.removeItem('quizzy_token');
        localStorage.removeItem('quizzy_user');
        setCurrentUser(null);
      });
  }, []);

  const handleAuthSuccess = (authData) => {
    const user = {
      user_id: authData.user_id,
      name: authData.name,
      email: authData.email,
    };

    localStorage.setItem('quizzy_token', authData.token);
    localStorage.setItem('quizzy_user', JSON.stringify(user));
    setCurrentUser(user);
    navigate('/home');
  };

  const handleLogout = () => {
    localStorage.removeItem('quizzy_token');
    localStorage.removeItem('quizzy_user');
    setCurrentUser(null);
    navigate('/');
  };

  const handleJoinByCodeSuccess = ({ roomCode }) => {
    setParticipantRoom((current) => ({
      ...current,
      roomCode,
    }));
    navigate('/participant-waiting');
  };

  const handleOpenParticipantWaiting = (roomData) => {
    setParticipantRoom(roomData);
    navigate('/participant-waiting');
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
            <HomePage
              {...protectedPageProps}
              onOpenParticipantWaiting={handleOpenParticipantWaiting}
            />
          </ProtectedRoute>
        }
      />
      <Route
        path="/create-quiz"
        element={
          <ProtectedRoute>
            <CreateQuizPage
              {...protectedPageProps}
              quizDraft={quizDraft}
              onChangeQuizDraft={setQuizDraft}
              onOpenAddQuestions={() => navigate('/add-questions')}
            />
          </ProtectedRoute>
        }
      />
      <Route
        path="/add-questions"
        element={
          <ProtectedRoute>
            <AddQuestionsPage
              {...protectedPageProps}
              quizTitle={quizDraft.title}
              accessType={quizDraft.accessType}
              onOpenWaitingRoom={() => navigate('/waiting-room')}
            />
          </ProtectedRoute>
        }
      />
      <Route
        path="/waiting-room"
        element={
          <ProtectedRoute>
            <WaitingRoomPage
              {...protectedPageProps}
              quizTitle={quizDraft.title}
              accessType={quizDraft.accessType}
              onOpenHostQuiz={() => navigate('/host-quiz')}
            />
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
      <Route
        path="/participant-waiting"
        element={
          <ParticipantWaitingPage
            quizTitle={participantRoom.quizTitle}
            organizerName={participantRoom.organizerName}
            roomCode={participantRoom.roomCode}
            participantsCount={participantRoom.participantsCount}
          />
        }
      />
      <Route path="/participant-quiz" element={<ParticipantQuizPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
