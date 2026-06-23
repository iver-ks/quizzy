import { useState } from 'react';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';

function App() {
  const [page, setPage] = useState('landing');

  if (page === 'login') {
    return (
      <LoginPage
        onOpenLanding={() => setPage('landing')}
        onOpenRegister={() => setPage('register')}
      />
    );
  }

  if (page === 'register') {
    return (
      <RegisterPage
        onOpenLanding={() => setPage('landing')}
        onOpenLogin={() => setPage('login')}
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
