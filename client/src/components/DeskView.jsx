import React, { useState, useEffect } from 'react';
import '../styles/global.css';

const DeskView = ({ onOpenBook, onOpenVocab, onLogout, theme, onToggleTheme }) => {
    const [books, setBooks] = useState([]);
    const [isUploading, setIsUploading] = useState(false);
    const [toast, setToast] = useState(null);
    const [deleteConfirm, setDeleteConfirm] = useState(null);
    const [editingBook, setEditingBook] = useState(null); // { id, title }
    const [newTitle, setNewTitle] = useState('');
    const [showBackupMenu, setShowBackupMenu] = useState(false);

    useEffect(() => {
        fetchBooks();
    }, []);

    // 点击外部关闭备份菜单
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (showBackupMenu && !e.target.closest('.backup-wrapper')) {
                setShowBackupMenu(false);
            }
        };
        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, [showBackupMenu]);

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

    const startEditTitle = (book, e) => {
        e.stopPropagation();
        setEditingBook(book);
        setNewTitle(book.title);
    };

    const cancelEditTitle = () => {
        setEditingBook(null);
        setNewTitle('');
    };

    const handleSaveTitle = async () => {
        if (!newTitle.trim()) {
            showToast('书名不能为空', 'error');
            return;
        }

        try {
            const res = await fetch(`/api/books/${editingBook.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title: newTitle.trim() }),
            });
            if (res.ok) {
                showToast('✓ 书名已更新');
                fetchBooks();
                setEditingBook(null);
                setNewTitle('');
            } else {
                showToast('修改失败，请重试', 'error');
            }
        } catch (err) {
            console.error(err);
            showToast('修改出错，请检查网络', 'error');
        }
    };

    const handleExportData = async () => {
        console.log('开始导出备份...');
        try {
            const res = await fetch('/api/export');
            if (!res.ok) {
                throw new Error('导出失败');
            }
            const data = await res.json();
            console.log('获取到数据:', data);
            
            // 创建下载链接
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `immersive-reader-backup-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            showToast('✓ 备份文件已下载');
            setShowBackupMenu(false);
        } catch (err) {
            console.error('导出错误:', err);
            showToast('备份失败，请重试', 'error');
        }
    };

    const handleImportData = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        console.log('开始导入文件:', file.name);

        try {
            const text = await file.text();
            const data = JSON.parse(text);
            
            console.log('解析的数据:', {
                books: data.books?.length || 0,
                vocabulary: data.vocabulary?.length || 0
            });
            
            const res = await fetch('/api/import', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });
            
            if (res.ok) {
                const result = await res.json();
                console.log('导入结果:', result);
                const msg = `✓ 已导入 ${result.imported.books} 本书籍` +
                           (result.imported.files ? `（含 ${result.imported.files} 个文件）` : '') +
                           ` 和 ${result.imported.vocabulary} 个生词`;
                showToast(msg);
                fetchBooks();
                setShowBackupMenu(false);
                
                // 触发全局事件通知其他组件刷新生词列表
                window.dispatchEvent(new CustomEvent('vocabularyUpdated'));
            } else {
                const error = await res.text();
                console.error('导入失败:', error);
                showToast('导入失败，请检查文件格式', 'error');
            }
        } catch (err) {
            console.error('导入错误:', err);
            showToast('导入出错，请检查文件', 'error');
        }
        
        // 重置input
        e.target.value = '';
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
                    <div className="backup-wrapper">
                        <button 
                            className="btn backup-btn" 
                            onClick={(e) => {
                                e.stopPropagation();
                                console.log('备份按钮被点击，当前状态:', showBackupMenu);
                                setShowBackupMenu(!showBackupMenu);
                            }}
                        >
                            💾 备份
                        </button>
                        {showBackupMenu && (
                            <div className="backup-menu" onClick={(e) => e.stopPropagation()}>
                                <button 
                                    className="backup-menu-item" 
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        console.log('点击导出备份');
                                        handleExportData();
                                    }}
                                >
                                    📥 导出备份
                                </button>
                                <label 
                                    className="backup-menu-item"
                                    onClick={(e) => console.log('点击导入备份')}
                                >
                                    📤 导入备份
                                    <input
                                        type="file"
                                        accept=".json"
                                        onChange={handleImportData}
                                        style={{ display: 'none' }}
                                    />
                                </label>
                            </div>
                        )}
                    </div>
                    <button 
                        className="btn theme-toggle-btn" 
                        onClick={onToggleTheme}
                        title={theme === 'light' ? '切换到黑暗模式' : '切换到明亮模式'}
                    >
                        {theme === 'light' ? '🌙' : '☀️'}
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
                    <button className="btn btn-logout" onClick={onLogout}>
                        🚪 退出
                    </button>
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
                                <div className="book-actions">
                                    <button
                                        className="book-edit-btn"
                                        onClick={(e) => startEditTitle(book, e)}
                                        title="编辑书名"
                                    >
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                        </svg>
                                    </button>
                                    <button
                                        className="book-delete-btn"
                                        onClick={(e) => confirmDelete(book, e)}
                                        title="删除书籍"
                                    >
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2M10 11v6M14 11v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="copyright">
                © 2024 Shiyanying · 个人版权所有
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

            {editingBook && (
                <div className="modal-overlay" onClick={cancelEditTitle}>
                    <div className="edit-title-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="edit-title-icon">
                            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                        </div>
                        <h3 className="edit-title-title">编辑书名</h3>
                        <p className="edit-title-text">
                            当前：<strong>{editingBook.title}</strong>
                        </p>
                        <input
                            type="text"
                            className="edit-title-input"
                            placeholder="输入新书名..."
                            value={newTitle}
                            onChange={(e) => setNewTitle(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleSaveTitle()}
                            autoFocus
                        />
                        <div className="edit-title-actions">
                            <button className="btn" onClick={cancelEditTitle}>
                                取消
                            </button>
                            <button 
                                className="btn btn-primary" 
                                onClick={handleSaveTitle}
                                disabled={!newTitle.trim()}
                            >
                                保存
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
          background: var(--paper-color);
          border-bottom: 1px solid var(--border-color);
          padding: 24px 48px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          box-shadow: var(--shadow-sm);
          position: relative;
          z-index: 10;
        }

        .theme-toggle-btn {
          font-size: 18px;
          padding: 10px 14px;
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

        .backup-wrapper {
          position: relative;
          z-index: 100;
        }

        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .backup-menu {
          position: absolute;
          top: calc(100% + 8px);
          right: 0;
          background: var(--popup-bg);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-md);
          box-shadow: var(--shadow-lg);
          min-width: 160px;
          z-index: 9999;
          animation: slideDown 0.2s ease;
          pointer-events: auto;
        }

        .backup-menu-item {
          display: block;
          width: 100%;
          padding: 12px 16px;
          border: none;
          background: none;
          text-align: left;
          cursor: pointer;
          font-size: 14px;
          color: var(--ink-color);
          transition: background 0.2s;
        }

        .backup-menu-item:hover {
          background: var(--bg-secondary);
        }

        .backup-menu-item:first-child {
          border-radius: var(--radius-md) var(--radius-md) 0 0;
        }

        .backup-menu-item:last-child {
          border-radius: 0 0 var(--radius-md) var(--radius-md);
        }

        .backup-menu-item:not(:last-child) {
          border-bottom: 1px solid var(--border-color);
        }

        .books-container {
          flex: 1;
          overflow-y: auto;
          padding: 32px 48px 80px 48px;
        }

        .books-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 20px;
          max-width: 1400px;
          margin: 0 auto;
          padding-bottom: 20px;
        }

        .copyright {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          text-align: center;
          padding: 16px 0;
          font-size: 12px;
          color: var(--text-secondary);
          background: var(--paper-color);
          border-top: 1px solid var(--border-color);
          z-index: 5;
        }

        .book-card {
          background: var(--paper-color);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-lg);
          padding: 20px;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          display: flex;
          align-items: flex-start;
          gap: 16px;
          position: relative;
          box-shadow: var(--shadow-sm);
          height: fit-content;
        }

        .book-card:hover {
          box-shadow: var(--shadow-lg);
          transform: translateY(-3px);
          border-color: var(--accent-color);
        }

        .book-card:hover .book-actions {
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

        .book-actions {
          position: absolute;
          top: 12px;
          right: 12px;
          display: flex;
          gap: 8px;
          opacity: 0;
          transition: all 0.2s ease;
        }

        .book-edit-btn,
        .book-delete-btn {
          width: 32px;
          height: 32px;
          border: none;
          background: var(--paper-color);
          border-radius: 50%;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--text-secondary);
          transition: all 0.2s ease;
          box-shadow: var(--shadow-md);
        }

        .book-edit-btn:hover {
          background: var(--accent-light);
          color: var(--accent-color);
          transform: scale(1.1);
        }

        .book-delete-btn:hover {
          background: var(--danger-light);
          color: var(--danger-color);
          transform: scale(1.1);
        }

        .book-edit-btn:active,
        .book-delete-btn:active {
          transform: scale(0.95);
        }

        .empty-state {
          text-align: center;
          padding: 60px 20px;
          max-width: 400px;
          margin: 0 auto;
        }

        .empty-icon {
          font-size: 56px;
          margin-bottom: 20px;
          opacity: 0.6;
        }

        .empty-state h3 {
          margin: 0 0 12px 0;
          font-size: 22px;
          font-weight: 600;
          color: var(--ink-color);
        }

        .empty-state p {
          margin: 0 0 24px 0;
          font-size: 15px;
          color: var(--text-secondary);
          line-height: 1.6;
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

        /* Delete Confirmation Modal */
        .delete-confirm-modal {
          background: var(--popup-bg);
          border-radius: var(--radius-lg);
          padding: 32px;
          max-width: 480px;
          width: 90%;
          box-shadow: var(--shadow-xl);
          animation: slideUp 0.3s ease;
          border: 1px solid var(--border-color);
        }

        .delete-confirm-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 80px;
          height: 80px;
          background: var(--danger-light);
          border-radius: 50%;
          color: var(--danger-color);
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
          background: var(--warning-light);
          border: 1px solid var(--warning-color);
          border-radius: var(--radius-sm);
          font-size: 14px;
          color: var(--warning-color);
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

        /* Edit Title Modal */
        .edit-title-modal {
          background: white;
          border-radius: var(--radius-lg);
          padding: 32px;
          max-width: 480px;
          width: 90%;
          box-shadow: var(--shadow-xl);
          animation: slideUp 0.3s ease;
        }

        .edit-title-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 80px;
          height: 80px;
          background: #eff6ff;
          border-radius: 50%;
          color: #0ea5e9;
          margin: 0 auto 24px;
        }

        .edit-title-title {
          margin: 0 0 16px 0;
          font-size: 24px;
          font-weight: 600;
          color: var(--ink-color);
          text-align: center;
        }

        .edit-title-text {
          margin: 0 0 16px 0;
          font-size: 14px;
          color: var(--text-secondary);
          text-align: center;
        }

        .edit-title-text strong {
          color: var(--ink-color);
          font-weight: 600;
        }

        .edit-title-input {
          width: 100%;
          padding: 12px 16px;
          border: 2px solid var(--border-color);
          border-radius: var(--radius-md);
          font-size: 16px;
          font-family: var(--font-sans);
          margin-bottom: 24px;
          box-sizing: border-box;
          transition: border-color 0.2s;
        }

        .edit-title-input:focus {
          outline: none;
          border-color: var(--accent-color);
          box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.1);
        }

        .edit-title-actions {
          display: flex;
          gap: 12px;
          justify-content: center;
        }

        .edit-title-actions .btn {
          min-width: 120px;
        }

        @media (max-width: 768px) {
          .desk-header {
            padding: 16px 20px;
            flex-direction: column;
            align-items: flex-start;
            gap: 12px;
          }

          .page-title {
            font-size: 24px;
          }

          .page-subtitle {
            font-size: 13px;
          }

          .desk-actions {
            width: 100%;
            justify-content: space-between;
            flex-wrap: wrap;
          }

          .desk-actions .btn {
            flex: 1;
            justify-content: center;
            font-size: 13px;
            padding: 8px 10px;
            min-width: 80px;
          }

          .backup-wrapper {
            flex: 1;
          }

          .backup-menu {
            right: auto;
            left: 0;
            min-width: 200px;
          }

          .books-container {
            padding: 20px 16px 70px 16px;
          }

          .books-grid {
            grid-template-columns: 1fr;
            gap: 14px;
            padding-bottom: 12px;
          }

          .book-card {
            padding: 14px;
          }

          .book-icon {
            font-size: 32px;
          }

          .book-title {
            font-size: 16px;
            /* 手机端书名过长处理：最多显示2行 */
            white-space: normal;
            overflow: hidden;
            text-overflow: ellipsis;
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            line-height: 1.4;
            max-height: 2.8em; /* 2行的高度 */
          }

          .book-meta {
            font-size: 12px;
          }

          /* 手机端：按钮始终显示，无需悬停 */
          .book-actions {
            opacity: 1;
            position: static;
            margin-left: auto;
            flex-shrink: 0;
          }

          .book-edit-btn,
          .book-delete-btn {
            width: 28px;
            height: 28px;
          }

          .book-edit-btn svg,
          .book-delete-btn svg {
            width: 14px;
            height: 14px;
          }

          .copyright {
            font-size: 11px;
            padding: 12px 0;
          }

          .empty-state {
            padding: 40px 20px;
          }

          .empty-icon {
            font-size: 48px;
            margin-bottom: 16px;
          }

          .empty-state h3 {
            font-size: 20px;
            margin-bottom: 10px;
          }

          .empty-state p {
            font-size: 14px;
            margin-bottom: 20px;
          }

          .toast {
            top: 16px;
            width: 90%;
            max-width: 300px;
          }

          /* 对话框优化 */
          .delete-confirm-modal,
          .edit-title-modal {
            padding: 24px;
            max-width: 90%;
          }

          .delete-confirm-icon,
          .edit-title-icon {
            width: 64px;
            height: 64px;
          }

          .delete-confirm-icon svg,
          .edit-title-icon svg {
            width: 36px;
            height: 36px;
          }

          .delete-confirm-title,
          .edit-title-title {
            font-size: 20px;
          }

          .delete-confirm-text,
          .edit-title-text {
            font-size: 14px;
          }

          .delete-confirm-warning {
            font-size: 13px;
            padding: 10px 12px;
          }

          .edit-title-input {
            font-size: 15px;
            padding: 10px 14px;
          }
        }
      `}</style>
        </div>
    );
};

export default DeskView;
