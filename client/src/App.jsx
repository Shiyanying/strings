import React, { useState, useEffect } from 'react';
import DeskView from './components/DeskView';
import ReaderView from './components/ReaderView';
import VocabularyModal from './components/VocabularyModal';
import LoginView from './components/LoginView';
import './styles/global.css';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentView, setCurrentView] = useState('desk'); // 'desk' or 'reader'
  const [currentBook, setCurrentBook] = useState(null);
  const [showVocab, setShowVocab] = useState(false);

  // 检查登录状态
  useEffect(() => {
    const authStatus = sessionStorage.getItem('isAuthenticated');
    setIsAuthenticated(authStatus === 'true');
  }, []);

  const handleLogin = () => {
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    sessionStorage.removeItem('isAuthenticated');
    setIsAuthenticated(false);
    setCurrentView('desk');
    setCurrentBook(null);
  };

  const handleOpenBook = (book) => {
    setCurrentBook(book);
    setCurrentView('reader');
  };

  const handleCloseBook = () => {
    setCurrentView('desk');
    setCurrentBook(null);
  };

  // 如果未登录，显示登录页面
  if (!isAuthenticated) {
    return <LoginView onLogin={handleLogin} />;
  }

  return (
    <div className="app-container">
      {currentView === 'desk' && (
        <DeskView
          onOpenBook={handleOpenBook}
          onOpenVocab={() => setShowVocab(true)}
          onLogout={handleLogout}
        />
      )}

      {currentView === 'reader' && currentBook && (
        <ReaderView
          book={currentBook}
          onClose={handleCloseBook}
        />
      )}

      {showVocab && (
        <VocabularyModal onClose={() => setShowVocab(false)} />
      )}
    </div>
  );
}

export default App;
