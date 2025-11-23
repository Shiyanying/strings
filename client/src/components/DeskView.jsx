import React, { useState, useEffect } from 'react';
import '../styles/global.css';

const DeskView = ({ onOpenBook, onOpenVocab }) => {
    const [books, setBooks] = useState([]);
    const [isUploading, setIsUploading] = useState(false);

    useEffect(() => {
        fetchBooks();
    }, []);

    const fetchBooks = async () => {
        try {
            const res = await fetch('/api/books');
            const data = await res.json();
            setBooks(data);
        } catch (err) {
            console.error("Failed to fetch books", err);
        }
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('file', file);

        setIsUploading(true);
        try {
            const res = await fetch('/api/upload', {
                method: 'POST',
                body: formData,
            });
            if (res.ok) {
                fetchBooks();
            } else {
                alert('Upload failed');
            }
        } catch (err) {
            console.error(err);
            alert('Upload error');
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className="desk-container">
            <div className="desk-surface">
                <div className="desk-header">
                    <h1 style={{ color: 'rgba(255,255,255,0.8)', textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>My Study Desk</h1>
                    <div className="desk-actions">
                        <button className="btn btn-primary" onClick={onOpenVocab}>
                            📖 Vocabulary
                        </button>
                        <label className="btn btn-primary">
                            {isUploading ? 'Uploading...' : '➕ Add Book'}
                            <input
                                type="file"
                                accept=".txt"
                                onChange={handleFileUpload}
                                style={{ display: 'none' }}
                                disabled={isUploading}
                            />
                        </label>
                    </div>
                </div>

                <div className="books-grid">
                    {books.map((book) => (
                        <div
                            key={book.id}
                            className="book-item"
                            onClick={() => onOpenBook(book)}
                        >
                            <div className="book-cover">
                                <div className="book-spine"></div>
                                <div className="book-front">
                                    <div className="book-title">{book.title}</div>
                                </div>
                            </div>
                        </div>
                    ))}
                    {books.length === 0 && (
                        <div className="empty-state">
                            <p>No books on the desk. Upload one to start reading!</p>
                        </div>
                    )}
                </div>
            </div>

            <style>{`
        .desk-container {
          width: 100vw;
          height: 100vh;
          background: #2c1e18;
          background-image: radial-gradient(circle at 50% 30%, #4a3b32 0%, #1a120e 100%);
          display: flex;
          justify-content: center;
          align-items: center;
          perspective: 1000px;
        }

        .desk-surface {
          width: 90%;
          height: 80%;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 40px;
          backdrop-filter: blur(10px);
          box-shadow: 
            0 20px 50px rgba(0,0,0,0.5),
            inset 0 1px 1px rgba(255,255,255,0.1);
          padding: 40px;
          transform: rotateX(10deg) scale(0.95);
          transition: transform 0.5s ease;
          display: flex;
          flex-direction: column;
        }

        .desk-surface:hover {
          transform: rotateX(0deg) scale(1);
        }

        .desk-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 40px;
        }

        .books-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
          gap: 40px;
          padding: 20px;
          overflow-y: auto;
        }

        .book-item {
          width: 120px;
          height: 160px;
          cursor: pointer;
          position: relative;
          transform-style: preserve-3d;
          transition: transform 0.3s ease;
        }

        .book-item:hover {
          transform: translateY(-10px) rotateY(-10deg);
        }

        .book-cover {
          width: 100%;
          height: 100%;
          position: relative;
          transform-style: preserve-3d;
        }

        .book-front {
          position: absolute;
          width: 100%;
          height: 100%;
          background: linear-gradient(135deg, #8d6e63 0%, #5d4037 100%);
          border-radius: 4px 12px 12px 4px;
          box-shadow: 2px 4px 8px rgba(0,0,0,0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 10px;
          text-align: center;
          color: #fff;
          font-family: var(--font-serif);
          font-size: 0.9rem;
          backface-visibility: hidden;
        }

        .book-spine {
          position: absolute;
          left: 0;
          top: 0;
          width: 12px;
          height: 100%;
          background: #4e342e;
          transform: rotateY(-90deg) translateZ(6px);
          border-radius: 2px 0 0 2px;
        }

        .empty-state {
          grid-column: 1 / -1;
          text-align: center;
          color: rgba(255,255,255,0.5);
          font-size: 1.2rem;
          margin-top: 50px;
        }
      `}</style>
        </div>
    );
};

export default DeskView;
