import React, { useState, useEffect } from 'react';
import '../styles/global.css';

const DeskView = ({ onOpenBook, onOpenVocab, onLogout }) => {
    const [books, setBooks] = useState([]);
    const [isUploading, setIsUploading] = useState(false);
    const [toast, setToast] = useState(null);
    const [deleteConfirm, setDeleteConfirm] = useState(null);

    useEffect(() => {
        fetchBooks();
    }, []);

    const showToast = (message, type = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3000);
    };

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
                showToast('✓ 书籍上传成功');
                fetchBooks();
            } else {
                showToast('上传失败，请重试', 'error');
            }
        } catch (err) {
            console.error(err);
            showToast('上传出错，请检查网络', 'error');
        } finally {
            setIsUploading(false);
        }
    };

    const handleDeleteBook = async (bookId) => {
        try {
            const res = await fetch(`/api/books/${bookId}`, {
                method: 'DELETE',
            });
            if (res.ok) {
                showToast('✓ 书籍已删除');
                fetchBooks();
            } else {
                showToast('删除失败，请重试', 'error');
            }
        } catch (err) {
            console.error(err);
            showToast('删除出错，请检查网络', 'error');
        } finally {
            setDeleteConfirm(null);
        }
    };

    const confirmDelete = (book, e) => {
        e.stopPropagation();
        setDeleteConfirm(book);
    };

    const cancelDelete = () => {
        setDeleteConfirm(null);
    };

    return (
        <div className="desk-container">
            <div className="desk-header">
                <div className="header-content">
                    <h1 className="page-title">我的书架</h1>
                    <p className="page-subtitle">开始您的阅读之旅</p>
                </div>
                <div className="desk-actions">
                    <button className="btn" onClick={onOpenVocab}>
                        📖 生词本
                    </button>
                    <label className="btn btn-primary">
                        {isUploading ? '上传中...' : '➕ 添加书籍'}
                        <input
                            type="file"
                            accept=".txt"
                            onChange={handleFileUpload}
                            style={{ display: 'none' }}
                            disabled={isUploading}
                        />
                    </label>
                    {onLogout && (
                        <button className="btn btn-logout" onClick={onLogout} title="退出登录">
                            🚪 退出
                        </button>
                    )}
                </div>
            </div>

            <div className="books-container">
                {books.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-icon">📚</div>
                        <h3>书架空空如也</h3>
                        <p>上传您的第一本书开始阅读吧！</p>
                        <label className="btn btn-primary" style={{ marginTop: '16px' }}>
                            选择文件
                            <input
                                type="file"
                                accept=".txt"
                                onChange={handleFileUpload}
                                style={{ display: 'none' }}
                            />
                        </label>
                    </div>
                ) : (
                    <div className="books-grid">
                        {books.map((book) => (
                            <div
                                key={book.id}
                                className="book-card"
                                onClick={() => onOpenBook(book)}
                            >
                                <div className="book-icon">📖</div>
                                <div className="book-info">
                                    <h3 className="book-title">{book.title}</h3>
                                    <p className="book-meta">点击阅读</p>
                                </div>
                                <button
                                    className="book-delete-btn"
                                    onClick={(e) => confirmDelete(book, e)}
                                    title="删除书籍"
                                >
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2M10 11v6M14 11v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                    </svg>
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {toast && (
                <div className={`toast toast-${toast.type}`}>
                    {toast.message}
                </div>
            )}

            {deleteConfirm && (
                <div className="modal-overlay" onClick={cancelDelete}>
                    <div className="delete-confirm-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="delete-confirm-icon">
                            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                <path d="M10 11v6M14 11v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                        </div>
                        <h3 className="delete-confirm-title">确认删除书籍？</h3>
                        <p className="delete-confirm-text">
                            您确定要删除 <strong>{deleteConfirm.title}</strong> 吗？
                        </p>
                        <p className="delete-confirm-warning">
                            ⚠️ 此操作将同时删除该书籍的所有生词记录，且无法恢复。
                        </p>
                        <div className="delete-confirm-actions">
                            <button className="btn" onClick={cancelDelete}>
                                取消
                            </button>
                            <button 
                                className="btn btn-danger" 
                                onClick={() => handleDeleteBook(deleteConfirm.id)}
                            >
                                确认删除
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
        .desk-container {
          width: 100vw;
          height: 100vh;
          background: var(--bg-primary);
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        .desk-header {
          background: white;
          border-bottom: 1px solid var(--border-color);
          padding: 24px 48px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          box-shadow: var(--shadow-sm);
        }

        .header-content {
          flex: 1;
        }

        .page-title {
          margin: 0;
          font-size: 28px;
          font-weight: 600;
          color: var(--ink-color);
        }

        .page-subtitle {
          margin: 4px 0 0 0;
          font-size: 14px;
          color: var(--text-secondary);
        }

        .desk-actions {
          display: flex;
          gap: 12px;
        }

        .books-container {
          flex: 1;
          overflow-y: auto;
          padding: 48px;
        }

        .books-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 24px;
          max-width: 1400px;
          margin: 0 auto;
        }

        .book-card {
          background: white;
          border: 1px solid var(--border-color);
          border-radius: var(--radius-lg);
          padding: 24px;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          align-items: flex-start;
          gap: 16px;
          position: relative;
        }

        .book-card:hover {
          box-shadow: var(--shadow-lg);
          transform: translateY(-2px);
          border-color: var(--accent-color);
        }

        .book-card:hover .book-delete-btn {
          opacity: 1;
        }

        .book-icon {
          font-size: 40px;
          flex-shrink: 0;
        }

        .book-info {
          flex: 1;
          min-width: 0;
        }

        .book-title {
          margin: 0 0 8px 0;
          font-size: 18px;
          font-weight: 600;
          color: var(--ink-color);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .book-meta {
          margin: 0;
          font-size: 13px;
          color: var(--text-secondary);
        }

        .book-delete-btn {
          position: absolute;
          top: 12px;
          right: 12px;
          width: 36px;
          height: 36px;
          border: none;
          background: white;
          border-radius: 50%;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--text-secondary);
          opacity: 0;
          transition: all 0.2s ease;
          box-shadow: var(--shadow-md);
        }

        .book-delete-btn:hover {
          background: #fef2f2;
          color: #dc2626;
          transform: scale(1.1);
        }

        .book-delete-btn:active {
          transform: scale(0.95);
        }

        .empty-state {
          text-align: center;
          padding: 80px 20px;
          max-width: 400px;
          margin: 0 auto;
        }

        .empty-icon {
          font-size: 64px;
          margin-bottom: 16px;
        }

        .empty-state h3 {
          margin: 0 0 8px 0;
          font-size: 20px;
          font-weight: 600;
          color: var(--ink-color);
        }

        .empty-state p {
          margin: 0;
          font-size: 14px;
          color: var(--text-secondary);
        }

        /* Toast Notification */
        .toast {
          position: fixed;
          top: 24px;
          left: 50%;
          transform: translateX(-50%);
          background: white;
          padding: 16px 24px;
          border-radius: var(--radius-md);
          box-shadow: var(--shadow-xl);
          border: 1px solid var(--border-color);
          font-size: 15px;
          font-weight: 500;
          z-index: 10000;
          animation: slideDown 0.3s ease, fadeOut 0.3s ease 2.7s;
          min-width: 200px;
          text-align: center;
        }

        .toast-success {
          color: var(--success-color);
          border-left: 4px solid var(--success-color);
        }

        .toast-error {
          color: #ef4444;
          border-left: 4px solid #ef4444;
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

        /* Delete Confirmation Modal */
        .delete-confirm-modal {
          background: white;
          border-radius: var(--radius-lg);
          padding: 32px;
          max-width: 480px;
          width: 90%;
          box-shadow: var(--shadow-xl);
          animation: slideUp 0.3s ease;
        }

        .delete-confirm-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 80px;
          height: 80px;
          background: #fef2f2;
          border-radius: 50%;
          color: #dc2626;
          margin: 0 auto 24px;
        }

        .delete-confirm-title {
          margin: 0 0 16px 0;
          font-size: 24px;
          font-weight: 600;
          color: var(--ink-color);
          text-align: center;
        }

        .delete-confirm-text {
          margin: 0 0 16px 0;
          font-size: 16px;
          color: var(--text-secondary);
          text-align: center;
          line-height: 1.5;
        }

        .delete-confirm-text strong {
          color: var(--ink-color);
          font-weight: 600;
        }

        .delete-confirm-warning {
          margin: 0 0 24px 0;
          padding: 12px 16px;
          background: #fef9e7;
          border: 1px solid #fde68a;
          border-radius: var(--radius-sm);
          font-size: 14px;
          color: #92400e;
          text-align: center;
        }

        .delete-confirm-actions {
          display: flex;
          gap: 12px;
          justify-content: center;
        }

        .delete-confirm-actions .btn {
          min-width: 120px;
        }

        @keyframes slideUp {
          from {
            transform: translateY(20px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }

        @media (max-width: 768px) {
          .desk-header {
            padding: 16px 24px;
            flex-direction: column;
            align-items: flex-start;
            gap: 16px;
          }

          .books-container {
            padding: 24px;
          }

          .books-grid {
            grid-template-columns: 1fr;
          }

          .toast {
            top: 16px;
            width: 90%;
            max-width: 300px;
          }
        }
      `}</style>
        </div>
    );
};

export default DeskView;
