import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import logoIcon from '../assets/quizzy-logo.png';
import JoinByCodeModal from './JoinByCodeModal';
import '../styles/header.css';

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 12h14" />
      <path d="M12 5v14" />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function TrophyIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M10 14.66v1.626a2 2 0 0 1-.976 1.696A5 5 0 0 0 7 21.978" />
      <path d="M14 14.66v1.626a2 2 0 0 0 .976 1.696A5 5 0 0 1 17 21.978" />
      <path d="M18 9h1.5a1 1 0 0 0 0-5H18" />
      <path d="M4 22h16" />
      <path d="M6 9a6 6 0 0 0 12 0V3a1 1 0 0 0-1-1H7a1 1 0 0 0-1 1z" />
      <path d="M6 9H4.5a1 1 0 0 1 0-5H6" />
    </svg>
  );
}

function BookIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 7v14" />
      <path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z" />
    </svg>
  );
}

function LogoutIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m16 17 5-5-5-5" />
      <path d="M21 12H9" />
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    </svg>
  );
}

function Header({
  userName = 'Ксения',
  userEmail = '',
  onLogout,
  onOpenHome,
  onOpenCreateQuiz,
  onJoinByCodeSuccess,
  onOpenProfile,
  onOpenResults,
  onOpenMyQuizzes,
}) {
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef(null);

  useEffect(() => {
    if (!isProfileMenuOpen) {
      return undefined;
    }

    function handleDocumentClick(event) {
      if (!profileMenuRef.current?.contains(event.target)) {
        setIsProfileMenuOpen(false);
      }
    }

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        setIsProfileMenuOpen(false);
      }
    }

    document.addEventListener('mousedown', handleDocumentClick);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleDocumentClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isProfileMenuOpen]);

  const menuItems = [
    { label: 'Мой профиль', icon: <UserIcon />, onClick: onOpenProfile },
    { label: 'Мои результаты', icon: <TrophyIcon />, onClick: onOpenResults },
    { label: 'Мои квизы', icon: <BookIcon />, onClick: onOpenMyQuizzes },
  ];

  return (
    <>
      <header className="app-header app-container">
        <button type="button" className="app-header-brand-button" onClick={onOpenHome}>
          <div className="app-header-brand">
            <img src={logoIcon} alt="" className="app-header-brand-icon" />
            <span className="app-header-brand-name">Quizzy</span>
          </div>
        </button>

        <div className="app-header-actions">
          <button
            type="button"
            className="app-header-action app-header-action-light"
            onClick={() => setIsJoinModalOpen(true)}
          >
            Подключиться по коду
          </button>
          <button
            type="button"
            className="app-header-action app-header-action-primary"
            onClick={onOpenCreateQuiz}
          >
            <span className="app-header-action-icon">
              <PlusIcon />
            </span>
            <span>Создать квиз</span>
          </button>

          <div className="app-header-profile-wrap" ref={profileMenuRef}>
            <button
              type="button"
              className="app-header-avatar app-header-avatar-button"
              aria-label={`Профиль пользователя ${userName}`}
              onClick={() => setIsProfileMenuOpen((current) => !current)}
            >
              {userName.charAt(0).toUpperCase()}
            </button>

            <AnimatePresence>
              {isProfileMenuOpen ? (
                <motion.div
                  className="profile-menu"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2, ease: 'easeOut' }}
                >
                  <div className="profile-menu-head">
                    <strong>{userName}</strong>
                    <span>{userEmail}</span>
                  </div>

                  <div className="profile-menu-list">
                    {menuItems.map((item) => (
                      <button
                        key={item.label}
                        type="button"
                        className="profile-menu-item"
                        onClick={() => {
                          setIsProfileMenuOpen(false);
                          item.onClick?.();
                        }}
                      >
                        <span className="profile-menu-item-icon">{item.icon}</span>
                        <span>{item.label}</span>
                      </button>
                    ))}
                  </div>

                  <div className="profile-menu-logout-wrap">
                    <button
                      type="button"
                      className="profile-menu-item profile-menu-item-logout"
                      onClick={() => {
                        setIsProfileMenuOpen(false);
                        onLogout?.();
                      }}
                    >
                      <span className="profile-menu-item-icon">
                        <LogoutIcon />
                      </span>
                      <span>Выйти</span>
                    </button>
                  </div>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>
        </div>
      </header>

      <JoinByCodeModal
        isOpen={isJoinModalOpen}
        onClose={() => setIsJoinModalOpen(false)}
        onJoinSuccess={(payload) => {
          setIsJoinModalOpen(false);
          onJoinByCodeSuccess?.(payload);
        }}
      />
    </>
  );
}

export default Header;
