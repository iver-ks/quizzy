import { useState } from 'react';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import HomePage from './pages/HomePage';
import CreateQuizPage from './pages/CreateQuizPage';
import AddQuestionsPage from './pages/AddQuestionsPage';
import WaitingRoomPage from './pages/WaitingRoomPage';
import HostQuizPage from './pages/HostQuizPage';
import ParticipantWaitingPage from './pages/ParticipantWaitingPage';

function App() {
  const [page, setPage] = useState('landing');
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

  const handleJoinByCodeSuccess = ({ roomCode }) => {
    setParticipantRoom((current) => ({
      ...current,
      roomCode,
    }));
    setPage('participant-waiting');
  };

  const handleOpenParticipantWaiting = (roomData) => {
    setParticipantRoom(roomData);
    setPage('participant-waiting');
  };

  if (page === 'login') {
    return (
      <LoginPage
        onOpenLanding={() => setPage('landing')}
        onOpenRegister={() => setPage('register')}
        onOpenHome={() => setPage('home')}
      />
    );
  }

  if (page === 'register') {
    return (
      <RegisterPage
        onOpenLanding={() => setPage('landing')}
        onOpenLogin={() => setPage('login')}
        onOpenHome={() => setPage('home')}
      />
    );
  }

  if (page === 'create-quiz') {
    return (
      <CreateQuizPage
        quizDraft={quizDraft}
        onChangeQuizDraft={setQuizDraft}
        onOpenHome={() => setPage('home')}
        onOpenCreateQuiz={() => setPage('create-quiz')}
        onOpenAddQuestions={() => setPage('add-questions')}
        onJoinByCodeSuccess={handleJoinByCodeSuccess}
      />
    );
  }

  if (page === 'add-questions') {
    return (
      <AddQuestionsPage
        quizTitle={quizDraft.title}
        accessType={quizDraft.accessType}
        onOpenHome={() => setPage('home')}
        onOpenCreateQuiz={() => setPage('create-quiz')}
        onOpenWaitingRoom={() => setPage('waiting-room')}
        onJoinByCodeSuccess={handleJoinByCodeSuccess}
      />
    );
  }

  if (page === 'waiting-room') {
    return (
      <WaitingRoomPage
        quizTitle={quizDraft.title}
        accessType={quizDraft.accessType}
        onOpenHome={() => setPage('home')}
        onOpenCreateQuiz={() => setPage('create-quiz')}
        onOpenHostQuiz={() => setPage('host-quiz')}
        onJoinByCodeSuccess={handleJoinByCodeSuccess}
      />
    );
  }

  if (page === 'host-quiz') {
    return (
      <HostQuizPage
        onOpenHome={() => setPage('home')}
        onOpenCreateQuiz={() => setPage('create-quiz')}
        onJoinByCodeSuccess={handleJoinByCodeSuccess}
      />
    );
  }

  if (page === 'participant-waiting') {
    return (
      <ParticipantWaitingPage
        quizTitle={participantRoom.quizTitle}
        organizerName={participantRoom.organizerName}
        roomCode={participantRoom.roomCode}
        participantsCount={participantRoom.participantsCount}
      />
    );
  }

  if (page === 'home') {
    return (
      <HomePage
        onOpenHome={() => setPage('home')}
        onOpenCreateQuiz={() => setPage('create-quiz')}
        onJoinByCodeSuccess={handleJoinByCodeSuccess}
        onOpenParticipantWaiting={handleOpenParticipantWaiting}
      />
    );
  }

  return (
    <LandingPage
      onOpenLogin={() => setPage('login')}
      onOpenRegister={() => setPage('register')}
    />
  );
}

export default App;
