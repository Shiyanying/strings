import React, { useState } from 'react';
import DeskView from './components/DeskView';
import ReaderView from './components/ReaderView';
import VocabularyModal from './components/VocabularyModal';
import './styles/global.css';

function App() {
  const [currentView, setCurrentView] = useState('desk'); // 'desk' or 'reader'
  const [currentBook, setCurrentBook] = useState(null);
  const [showVocab, setShowVocab] = useState(false);

  const handleOpenBook = (book) => {
    setCurrentBook(book);
    setCurrentView('reader');
  };

  const handleCloseBook = () => {
    setCurrentView('desk');
    setCurrentBook(null);
  };

  return (
    <div className="app-container">
      {currentView === 'desk' && (
        <DeskView
          onOpenBook={handleOpenBook}
          onOpenVocab={() => setShowVocab(true)}
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
