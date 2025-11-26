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
  const [highlightWord, setHighlightWord] = useState(null); // 要高亮的单词
  const [books, setBooks] = useState([]); // 书籍列表
  const [vocabVersion, setVocabVersion] = useState(0); // 生词版本号，用于触发刷新
  const [theme, setTheme] = useState(() => {
    // 从 localStorage 读取主题，默认跟随系统
    const saved = localStorage.getItem('theme');
    if (saved) return saved;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  // 应用主题到 document
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  // 切换主题
  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  // 检查登录状态
  useEffect(() => {
    const authStatus = sessionStorage.getItem('isAuthenticated');
    setIsAuthenticated(authStatus === 'true');
  }, []);

  // 获取书籍列表
  useEffect(() => {
    if (isAuthenticated) {
      fetchBooks();
    }
  }, [isAuthenticated]);

  // 监听生词更新事件
  useEffect(() => {
    const handleVocabUpdate = () => {
      console.log('App 收到生词更新事件，递增版本号');
      setVocabVersion(v => v + 1);
    };
    
    window.addEventListener('vocabularyUpdated', handleVocabUpdate);
    
    return () => {
      window.removeEventListener('vocabularyUpdated', handleVocabUpdate);
    };
  }, []);

  const fetchBooks = async () => {
    try {
      const res = await fetch('/api/books');
      const data = await res.json();
      setBooks(data);
    } catch (err) {
      console.error('Failed to fetch books', err);
    }
  };

  const handleLogin = () => {
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    sessionStorage.removeItem('isAuthenticated');
    setIsAuthenticated(false);
    setCurrentView('desk');
    setCurrentBook(null);
  };

  const handleOpenBook = (book, word = null) => {
    setCurrentBook(book);
    setHighlightWord(word);
    setCurrentView('reader');
    setShowVocab(false); // 关闭生词本
    
    // 如果是从生词本跳转，延迟触发版本更新确保 ReaderView 已挂载
    if (word) {
      setTimeout(() => {
        setVocabVersion(v => v + 1);
      }, 100);
    }
  };

  const handleCloseBook = () => {
    setCurrentView('desk');
    setCurrentBook(null);
    setHighlightWord(null);
  };

  // 从生词本跳转到书籍
  const handleJumpToBook = (bookId, word) => {
    const book = books.find(b => b.id === bookId);
    if (book) {
      handleOpenBook(book, word);
    }
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
          theme={theme}
          onToggleTheme={toggleTheme}
        />
      )}

      {currentView === 'reader' && currentBook && (
        <ReaderView
          book={currentBook}
          onClose={handleCloseBook}
          highlightWord={highlightWord}
          vocabVersion={vocabVersion}
          theme={theme}
          onToggleTheme={toggleTheme}
        />
      )}

      {showVocab && (
        <VocabularyModal 
          onClose={() => setShowVocab(false)} 
          onJumpToBook={handleJumpToBook}
          vocabVersion={vocabVersion}
        />
      )}
    </div>
  );
}

export default App;
