import React, { useState, useEffect } from 'react';
import '../styles/global.css';

const VocabularyModal = ({ onClose }) => {
    const [vocab, setVocab] = useState([]);

    useEffect(() => {
        fetch('/api/vocab')
            .then(res => res.json())
            .then(data => setVocab(data))
            .catch(err => console.error(err));
    }, []);

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <h2>My Vocabulary</h2>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer' }}>×</button>
                </div>

                <div className="vocab-list">
                    {vocab.map((item) => (
                        <div key={item.id} className="vocab-item">
                            <div className="vocab-header">
                                <span className="vocab-original">{item.original}</span>
                                <span className="vocab-translation">{item.translation}</span>
                            </div>
                            {item.context && (
                                <div className="vocab-context">"{item.context}"</div>
                            )}
                            <div className="vocab-meta">
                                From: {item.bookTitle} • {new Date(item.createdAt).toLocaleDateString()}
                            </div>
                        </div>
                    ))}
                    {vocab.length === 0 && <p>No words saved yet.</p>}
                </div>
            </div>

            <style>{`
        .vocab-list {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .vocab-item {
          background: #f8f5f0;
          padding: 16px;
          border-radius: 12px;
          border-left: 4px solid var(--accent-color);
        }

        .vocab-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }

        .vocab-original {
          font-weight: bold;
          font-size: 1.1rem;
          color: #2c2c2c;
        }

        .vocab-translation {
          color: var(--accent-color);
          font-weight: 600;
        }

        .vocab-context {
          font-style: italic;
          color: #666;
          font-size: 0.9rem;
          margin-bottom: 8px;
        }

        .vocab-meta {
          font-size: 0.8rem;
          color: #999;
        }
      `}</style>
        </div>
    );
};

export default VocabularyModal;
