import { useState } from 'react';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import HomePage from './pages/HomePage';
import CreateQuizPage from './pages/CreateQuizPage';

function App() {
  const [page, setPage] = useState('landing');

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
    return <CreateQuizPage onOpenHome={() => setPage('home')} />;
  }

  if (page === 'home') {
    return <HomePage onOpenCreateQuiz={() => setPage('create-quiz')} />;
  }

  return (
    <LandingPage
      onOpenLogin={() => setPage('login')}
      onOpenRegister={() => setPage('register')}
    />
  );
}

export default App;
