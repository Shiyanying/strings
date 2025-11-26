import React, { useState, useEffect } from 'react';
import '../styles/global.css';

const VocabularyModal = ({ onClose, onJumpToBook, vocabVersion = 0 }) => {
    const [vocab, setVocab] = useState([]);
    const [deletingId, setDeletingId] = useState(null);
    const [toast, setToast] = useState(null);

    useEffect(() => {
        fetchVocab();
    }, []);

    // 监听生词版本变化，自动刷新
    useEffect(() => {
        if (vocabVersion > 0) {
            console.log('生词本检测到版本变化，刷新列表, 版本:', vocabVersion);
            fetchVocab();
        }
    }, [vocabVersion]);

    const fetchVocab = () => {
        fetch('/api/vocab')
            .then(res => res.json())
            .then(data => setVocab(data))
            .catch(err => console.error(err));
    };

    const showToast = (message, type = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3000);
    };

    const handleDelete = async (id) => {
        if (!confirm('确定要删除这个生词吗？')) {
            return;
        }

        setDeletingId(id);
        try {
            const res = await fetch(`/api/vocab/${id}`, {
                method: 'DELETE',
            });
            
            if (res.ok) {
                // 从列表中移除已删除的项
                setVocab(vocab.filter(item => item.id !== id));
                showToast('✓ 生词已删除');
            } else {
                showToast('删除失败，请重试', 'error');
            }
        } catch (err) {
            console.error(err);
            showToast('删除出错', 'error');
        } finally {
            setDeletingId(null);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <div className="modal-header-left">
                        <h2 className="modal-title">📖 我的生词本</h2>
                        <span className="vocab-hint">点击跳转异常请刷新浏览器</span>
                    </div>
                    <button onClick={onClose} className="modal-close">×</button>
                </div>

                <div className="vocab-list">
                    {vocab.length === 0 ? (
                        <div className="vocab-empty">
                            <p>还没有保存生词</p>
                            <p className="vocab-empty-hint">在阅读时右键选择单词并翻译即可保存</p>
                        </div>
                    ) : (
                        vocab.map((item) => (
                            <div key={item.id} className="vocab-item">
                                <div 
                                    className="vocab-content" 
                                    onClick={() => onJumpToBook && onJumpToBook(item.bookId, item.original)}
                                    style={{ cursor: onJumpToBook ? 'pointer' : 'default' }}
                                >
                                    <div className="vocab-header">
                                        <span className="vocab-original">{item.original}</span>
                                        <span className="vocab-translation">{item.translation}</span>
                                    </div>
                                    {item.context && (
                                        <div className="vocab-context">"{item.context.substring(0, 100)}{item.context.length > 100 ? '...' : ''}"</div>
                                    )}
                                    <div className="vocab-meta">
                                        <span className="vocab-book-link">📚 来自《{item.bookTitle}》</span> · {new Date(item.createdAt).toLocaleDateString('zh-CN')}
                                    </div>
                                </div>
                                <button 
                                    className="vocab-delete-btn"
                                    onClick={() => handleDelete(item.id)}
                                    disabled={deletingId === item.id}
                                    title="删除"
                                >
                                    {deletingId === item.id ? '...' : '🗑️'}
                                </button>
                            </div>
                        ))
                    )}
                </div>

                {toast && (
                    <div className={`toast toast-${toast.type}`}>
                        {toast.message}
                    </div>
                )}
            </div>

            <style>{`
        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
          padding-bottom: 16px;
          border-bottom: 1px solid var(--border-color);
        }

        .modal-header-left {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .modal-title {
          margin: 0;
          font-size: 20px;
          font-weight: 600;
          color: var(--ink-color);
        }

        .vocab-hint {
          font-size: 11px;
          color: var(--text-secondary);
          opacity: 0.7;
        }

        .modal-close {
          background: none;
          border: none;
          font-size: 24px;
          cursor: pointer;
          color: var(--text-secondary);
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: var(--radius-sm);
          transition: background 0.2s;
        }

        .modal-close:hover {
          background: var(--bg-secondary);
        }

        .vocab-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
          max-height: 60vh;
          overflow-y: auto;
        }

        .vocab-empty {
          text-align: center;
          padding: 40px 20px;
          color: var(--text-secondary);
        }

        .vocab-empty p {
          margin: 0 0 8px 0;
        }

        .vocab-empty-hint {
          font-size: 13px;
          color: var(--text-secondary);
        }

        .vocab-item {
          background: var(--bg-primary);
          padding: 16px;
          border-radius: var(--radius-md);
          border: 1px solid var(--border-color);
          transition: all 0.2s;
          display: flex;
          gap: 12px;
          align-items: flex-start;
        }

        .vocab-item:hover {
          border-color: var(--accent-color);
          box-shadow: var(--shadow-sm);
        }

        .vocab-content:hover .vocab-book-link {
          color: var(--accent-color);
          text-decoration: underline;
        }

        .vocab-content {
          flex: 1;
          min-width: 0;
        }

        .vocab-header {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          margin-bottom: 8px;
          gap: 16px;
        }

        .vocab-delete-btn {
          background: none;
          border: none;
          cursor: pointer;
          font-size: 18px;
          padding: 4px 8px;
          border-radius: var(--radius-sm);
          transition: all 0.2s;
          flex-shrink: 0;
          opacity: 0.6;
        }

        .vocab-delete-btn:hover:not(:disabled) {
          opacity: 1;
          background: rgba(239, 68, 68, 0.1);
        }

        .vocab-delete-btn:disabled {
          cursor: not-allowed;
          opacity: 0.3;
        }

        .vocab-original {
          font-weight: 600;
          font-size: 16px;
          color: var(--ink-color);
          flex-shrink: 0;
        }

        .vocab-translation {
          color: var(--accent-color);
          font-weight: 500;
          font-size: 15px;
        }

        .vocab-context {
          font-size: 13px;
          color: var(--text-secondary);
          line-height: 1.5;
          margin-bottom: 8px;
          font-style: italic;
        }

        .vocab-meta {
          font-size: 12px;
          color: var(--text-secondary);
        }

        /* Toast Notification */
        .toast {
          position: fixed;
          top: 24px;
          left: 50%;
          transform: translateX(-50%);
          background: var(--popup-bg);
          padding: 16px 24px;
          border-radius: var(--radius-md);
          box-shadow: var(--shadow-xl);
          border: 1px solid var(--border-color);
          font-size: 15px;
          font-weight: 500;
          z-index: 10001;
          animation: slideDown 0.3s ease, fadeOut 0.3s ease 2.7s;
          min-width: 200px;
          text-align: center;
        }

        .toast-success {
          color: var(--success-color);
          border-left: 4px solid var(--success-color);
        }

        .toast-error {
          color: var(--danger-color);
          border-left: 4px solid var(--danger-color);
        }

        @keyframes slideDown {
          from {
            transform: translate(-50%, -20px);
            opacity: 0;
          }
          to {
            transform: translate(-50%, 0);
            opacity: 1;
          }
        }

        @keyframes fadeOut {
          from { opacity: 1; }
          to { opacity: 0; }
        }
      `}</style>
        </div>
    );
};

export default VocabularyModal;
