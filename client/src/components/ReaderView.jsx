import React, { useState, useEffect, useRef } from 'react';
import '../styles/global.css';

const ReaderView = ({ book, onClose, highlightWord = null, vocabVersion = 0, theme, onToggleTheme }) => {
    const [content, setContent] = useState('');
    const [selection, setSelection] = useState(null); // { text, rect, context }
    const [translation, setTranslation] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [toast, setToast] = useState(null); // { message, type }
    const [vocabularyList, setVocabularyList] = useState([]); // 已保存的生词列表
    const [hoveredWord, setHoveredWord] = useState(null); // 当前悬停的单词
    const [selectedVocab, setSelectedVocab] = useState(null); // 点击选中的生词详情
    const [jumpHighlight, setJumpHighlight] = useState(null); // 跳转高亮的单词
    const [isEditingContent, setIsEditingContent] = useState(false); // 是否在编辑内容
    const [editedContent, setEditedContent] = useState(''); // 编辑中的内容
    const contentRef = useRef(null);
    const isDraggingRef = useRef(false);
    const longPressTimerRef = useRef(null);
    const touchStartRef = useRef({ x: 0, y: 0, time: 0 });

    useEffect(() => {
        fetch(`/api/books/${book.id}/content`)
            .then(res => res.text())
            .then(text => setContent(text))
            .catch(err => console.error(err));
        
        // 获取当前书籍的生词列表
        fetchVocabulary();
    }, [book]);

    // 监听生词版本变化，自动刷新生词列表
    useEffect(() => {
        if (vocabVersion > 0) {
            console.log('检测到生词版本变化，刷新生词列表, 版本:', vocabVersion);
            fetchVocabulary();
        }
    }, [vocabVersion]);

    // 当内容和生词列表都加载完成后，滚动到指定单词
    useEffect(() => {
        if (content && vocabularyList.length > 0 && highlightWord) {
            // 延迟确保 DOM 已更新高亮
            const timer = setTimeout(() => {
                scrollToWord(highlightWord);
            }, 300);
            return () => clearTimeout(timer);
        } else if (content && highlightWord && vocabularyList.length === 0) {
            // 如果生词列表为空但有跳转词，延迟重试
            console.log('生词列表为空，延迟重试');
            const retryTimer = setTimeout(() => {
                if (vocabularyList.length > 0) {
                    scrollToWord(highlightWord);
                }
            }, 800);
            return () => clearTimeout(retryTimer);
        }
    }, [content, vocabularyList, highlightWord]);

    const scrollToWord = (word) => {
        if (!word) return;
        
        console.log('尝试滚动到单词:', word);
        console.log('当前生词列表长度:', vocabularyList.length);
        
        // 查找所有包含该单词的 mark 元素
        const marks = contentRef.current?.querySelectorAll('.vocab-highlight');
        console.log('找到的高亮元素数量:', marks?.length || 0);
        
        if (!marks || marks.length === 0) {
            console.warn('没有找到高亮元素，可能生词列表还未加载');
            return;
        }

        // 找到第一个匹配的单词
        for (let mark of marks) {
            if (mark.textContent.toLowerCase() === word.toLowerCase()) {
                console.log('找到匹配的单词，开始滚动');
                // 滚动到该元素
                mark.scrollIntoView({ behavior: 'smooth', block: 'center' });
                
                // 添加临时高亮动画
                setJumpHighlight(word);
                setTimeout(() => setJumpHighlight(null), 2000);
                
                break;
            }
        }
    };

    const fetchVocabulary = () => {
        fetch('/api/vocab')
            .then(res => res.json())
            .then(data => {
                // 只获取当前书籍的生词
                const bookVocab = data.filter(v => v.bookId === book.id);
                setVocabularyList(bookVocab);
            })
            .catch(err => console.error(err));
    };

    // 高亮文本中的生词
    const highlightVocabulary = (text) => {
        if (!text || vocabularyList.length === 0) return text;

        // 去重：同一个单词可能被多次添加到生词本（比如导入备份时）
        const uniqueVocab = [];
        const seenWords = new Set();
        
        vocabularyList.forEach(vocab => {
            const lowerWord = vocab.original.toLowerCase();
            if (!seenWords.has(lowerWord)) {
                seenWords.add(lowerWord);
                uniqueVocab.push(vocab);
            }
        });
        
        // 按单词长度降序排序，优先匹配长单词，避免短单词被误匹配
        const sortedVocab = uniqueVocab.sort((a, b) => 
            b.original.length - a.original.length
        );

        // 使用临时占位符避免重复替换
        let highlightedText = text;
        const replacements = new Map();
        
        sortedVocab.forEach((vocab, index) => {
            const word = vocab.original;
            const isJumpTarget = jumpHighlight && word.toLowerCase() === jumpHighlight.toLowerCase();
            const jumpClass = isJumpTarget ? ' vocab-jump-highlight' : '';
            
            // 转义特殊字符
            const escapedWord = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            // 使用词边界匹配完整单词
            const regex = new RegExp(`\\b(${escapedWord})\\b`, 'gi');
            
            // 第一轮：替换为带原文的占位符
            highlightedText = highlightedText.replace(regex, (match) => {
                const placeholder = `__VOCAB_${index}_${match}__`;
                replacements.set(placeholder, `<mark class="vocab-highlight${jumpClass}" data-vocab-id="${vocab.id}" data-translation="${vocab.translation.replace(/"/g, '&quot;')}">${match}</mark>`);
                return placeholder;
            });
        });
        
        // 第二轮：恢复占位符为实际的 mark 标签
        replacements.forEach((markTag, placeholder) => {
            highlightedText = highlightedText.replace(new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), markTag);
        });

        return highlightedText;
    };

    // Toast notification helper
    const showToast = (message, type = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3000); // Auto hide after 3s
    };

    // 处理生词悬停（PC端）
    const handleVocabHover = (e) => {
        if (e.target.classList.contains('vocab-highlight')) {
            const translation = e.target.getAttribute('data-translation');
            const rect = e.target.getBoundingClientRect();
            setHoveredWord({
                translation,
                rect: {
                    top: rect.top + window.scrollY,
                    left: rect.left + window.scrollX,
                    width: rect.width
                }
            });
        } else {
            // 鼠标移到非高亮区域，清除悬停提示
            setHoveredWord(null);
        }
    };

    const handleVocabLeave = (e) => {
        // 鼠标完全离开文本区域，清除悬停提示
        setHoveredWord(null);
    };

    // 处理点击高亮单词（移动端和PC端）
    const handleVocabClick = (e) => {
        console.log('Click event triggered on:', e.target);
        
        // 检查点击的元素或其父元素是否是高亮单词
        let target = e.target;
        let depth = 0;
        while (target && target !== e.currentTarget && depth < 5) {
            console.log('Checking target:', target.className);
            if (target.classList && target.classList.contains('vocab-highlight')) {
                e.preventDefault();
                e.stopPropagation();
                
                const vocabId = target.getAttribute('data-vocab-id');
                console.log('✅ Clicked vocab word, ID:', vocabId);
                
                // 从生词列表中找到对应的单词
                const vocab = vocabularyList.find(v => String(v.id) === String(vocabId));
                if (vocab) {
                    console.log('✅ Found vocab:', vocab);
                    setSelectedVocab(vocab);
                } else {
                    console.warn('❌ Vocab not found for ID:', vocabId, 'Available IDs:', vocabularyList.map(v => v.id));
                }
                return;
            }
            target = target.parentElement;
            depth++;
        }
        console.log('No vocab-highlight found in click path');
    };

    // --- Selection Logic ---

    const handleContextMenu = (e) => {
        e.preventDefault(); // Prevent default context menu
    };

    const getCaretFromPoint = (x, y) => {
        if (document.caretRangeFromPoint) {
            return document.caretRangeFromPoint(x, y);
        } else if (document.caretPositionFromPoint) {
            // Firefox fallback (simplified)
            const pos = document.caretPositionFromPoint(x, y);
            const range = document.createRange();
            range.setStart(pos.offsetNode, pos.offset);
            range.collapse(true);
            return range;
        }
        return null;
    };

    const handleMouseDown = (e) => {
        // Right click (button 2)
        if (e.button === 2) {
            isDraggingRef.current = true;
            const range = getCaretFromPoint(e.clientX, e.clientY);
            if (range) {
                const sel = window.getSelection();
                sel.removeAllRanges();
                sel.addRange(range);
            }
        } else {
            // Left click clears custom selection UI usually, but we'll let default behavior happen
            setSelection(null);
        }
    };

    const handleMouseMove = (e) => {
        if (isDraggingRef.current && e.buttons === 2) {
            const range = getCaretFromPoint(e.clientX, e.clientY);
            if (range) {
                const sel = window.getSelection();
                if (sel.rangeCount > 0) {
                    const firstRange = sel.getRangeAt(0);
                    // Extend selection to new point
                    sel.extend(range.startContainer, range.startOffset);
                }
            }
        }
    };

    const handleMouseUp = (e) => {
        if (isDraggingRef.current && e.button === 2) {
            isDraggingRef.current = false;
            processSelection();
        }
    };

    // Mobile Selection - 简化的触摸处理
    const handleTouchStart = (e) => {
        const touch = e.touches[0];
        touchStartRef.current = {
            x: touch.clientX,
            y: touch.clientY,
            time: Date.now(),
            moved: false
        };
    };

    const handleTouchMove = (e) => {
        if (!touchStartRef.current) return;
        const touch = e.touches[0];
        const moveDistance = Math.abs(touch.clientX - touchStartRef.current.x) + 
                           Math.abs(touch.clientY - touchStartRef.current.y);
        
        // 如果移动超过10px，标记为移动
        if (moveDistance > 10) {
            touchStartRef.current.moved = true;
        }
    };

    const handleTouchEnd = (e) => {
        if (!touchStartRef.current) return;
        
        const touchDuration = Date.now() - touchStartRef.current.time;
        const moved = touchStartRef.current.moved;
        
        // 短按且没移动 - 可能是点击高亮单词
        if (touchDuration < 300 && !moved) {
            // 检查是否点击了高亮单词
            const touch = e.changedTouches[0];
            const target = document.elementFromPoint(touch.clientX, touch.clientY);
            
            if (target) {
                let vocabElement = target;
                let depth = 0;
                while (vocabElement && depth < 5) {
                    if (vocabElement.classList && vocabElement.classList.contains('vocab-highlight')) {
                        console.log('📱 Mobile tap on vocab highlight detected');
                        const vocabId = vocabElement.getAttribute('data-vocab-id');
                        const vocab = vocabularyList.find(v => String(v.id) === String(vocabId));
                        if (vocab) {
                            console.log('📱 Mobile vocab found:', vocab);
                            setSelectedVocab(vocab);
                            e.preventDefault();
                            e.stopPropagation();
                            touchStartRef.current = null;
                            return;
                        }
                        break;
                    }
                    vocabElement = vocabElement.parentElement;
                    depth++;
                }
            }
        }
        // 长按或移动 - 检查文本选择
        else if (touchDuration > 500 || moved) {
            setTimeout(() => {
                const sel = window.getSelection();
                const selectedText = sel.toString().trim();
                
                if (selectedText.length > 0) {
                    processSelection();
                }
            }, 100);
        }
        
        // 重置
        touchStartRef.current = null;
    };

    const processSelection = () => {
        const sel = window.getSelection();
        const text = sel.toString().trim();
        if (text.length > 0) {
            const range = sel.getRangeAt(0);
            const rect = range.getBoundingClientRect();

            // Get context (surrounding text)
            // Simplified: just the selection for now, or whole paragraph?
            const context = range.startContainer.textContent;

            setSelection({
                text,
                rect: {
                    top: rect.top + window.scrollY,
                    left: rect.left + window.scrollX,
                    height: rect.height,
                    width: rect.width
                },
                context
            });
            setTranslation(''); // Reset translation
        } else {
            setSelection(null);
        }
    };

    // 智能截取上下文
    const smartTruncateContext = (context, word, maxLength = 120) => {
        if (!context || context.length <= maxLength) return context;
        
        const wordIndex = context.toLowerCase().indexOf(word.toLowerCase());
        if (wordIndex === -1) {
            // 找不到单词，直接截取开头
            return context.substring(0, maxLength) + '...';
        }
        
        // 计算单词前后各保留多少字符
        const halfLength = Math.floor((maxLength - word.length) / 2);
        let start = Math.max(0, wordIndex - halfLength);
        let end = Math.min(context.length, wordIndex + word.length + halfLength);
        
        // 调整到单词边界
        if (start > 0) {
            const spaceIndex = context.lastIndexOf(' ', start);
            if (spaceIndex > 0 && spaceIndex > start - 10) start = spaceIndex + 1;
        }
        if (end < context.length) {
            const spaceIndex = context.indexOf(' ', end);
            if (spaceIndex > 0 && spaceIndex < end + 10) end = spaceIndex;
        }
        
        let result = context.substring(start, end);
        if (start > 0) result = '...' + result;
        if (end < context.length) result = result + '...';
        
        return result;
    };

    const saveVocabulary = async () => {
        if (!selection || !translation) return;
        setIsSaving(true);
        try {
            const res = await fetch('/api/vocab', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    original: selection.text,
                    translation,
                    context: selection.context,
                    bookId: book.id
                })
            });
            if (res.ok) {
                showToast('✓ 已保存到生词本');
                setSelection(null);
                setTranslation('');
                // 刷新生词列表以显示新添加的生词
                fetchVocabulary();
            } else {
                showToast('保存失败，请重试', 'error');
            }
        } catch (err) {
            console.error(err);
        } finally {
            setIsSaving(false);
        }
    };

    const startEditContent = () => {
        setEditedContent(content);
        setIsEditingContent(true);
    };

    const cancelEditContent = () => {
        setIsEditingContent(false);
        setEditedContent('');
    };

    const saveEditContent = async () => {
        setIsSaving(true);
        try {
            const res = await fetch(`/api/books/${book.id}/content`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content: editedContent })
            });
            if (res.ok) {
                setContent(editedContent);
                setIsEditingContent(false);
                showToast('✓ 内容已保存');
            } else {
                showToast('保存失败，请重试', 'error');
            }
        } catch (err) {
            console.error(err);
            showToast('保存出错，请检查网络', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="reader-container">
            <div className="reader-header">
                <button className="back-btn btn" onClick={onClose}>
                    ← 返回书架
                </button>
                <h2 className="reader-title">{book.title}</h2>
                <div className="reader-header-actions">
                    <button 
                        className="btn theme-toggle-btn" 
                        onClick={onToggleTheme}
                        title={theme === 'light' ? '切换到黑暗模式' : '切换到明亮模式'}
                    >
                        {theme === 'light' ? '🌙' : '☀️'}
                    </button>
                    <button className="btn" onClick={startEditContent} disabled={isEditingContent}>
                        ✏️ 编辑内容
                    </button>
                </div>
            </div>

            <div className="reader-content-wrapper">
                <div
                    className="reader-content"
                    ref={contentRef}
                    onContextMenu={handleContextMenu}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onClick={handleVocabClick}
                >
                    <div 
                        className="text-content"
                        dangerouslySetInnerHTML={{ __html: highlightVocabulary(content) }}
                        onMouseOver={handleVocabHover}
                        onMouseOut={handleVocabLeave}
                        onTouchStart={handleTouchStart}
                        onTouchMove={handleTouchMove}
                        onTouchEnd={handleTouchEnd}
                    />
                    <div className="reader-copyright">
                        © 2024 Shiyanying · 个人版权所有
                    </div>
                </div>
            </div>

            {selection && (
                <div
                    className="selection-tooltip"
                    style={{
                        top: selection.rect.top - 160,
                        left: selection.rect.left,
                    }}
                >
                    <div className="tooltip-header">
                        <span className="selected-text">
                            "{selection.text.substring(0, 30)}{selection.text.length > 30 ? '...' : ''}"
                        </span>
                        <button className="close-tooltip" onClick={() => setSelection(null)}>×</button>
                    </div>
                    <input
                        type="text"
                        className="tooltip-input"
                        placeholder="输入翻译..."
                        value={translation}
                        onChange={(e) => setTranslation(e.target.value)}
                        autoFocus
                    />
                    <button className="btn btn-primary save-btn" onClick={saveVocabulary} disabled={isSaving}>
                        {isSaving ? '保存中...' : '💾 保存到生词本'}
                    </button>
                </div>
            )}

            {/* 单词详情弹窗 */}
            {selectedVocab && (
                <div className="vocab-detail-overlay" onClick={() => setSelectedVocab(null)}>
                    <div className="vocab-detail-card" onClick={e => e.stopPropagation()}>
                        <button className="vocab-detail-close" onClick={() => setSelectedVocab(null)}>×</button>
                        
                        <div className="vocab-detail-header">
                            <span className="vocab-detail-icon">📖</span>
                            <h3 className="vocab-detail-word">{selectedVocab.original}</h3>
                        </div>
                        
                        <div className="vocab-detail-body">
                            <div className="vocab-detail-section">
                                <div className="vocab-detail-label">翻译</div>
                                <div className="vocab-detail-translation">{selectedVocab.translation}</div>
                            </div>
                            

                            {selectedVocab.context && (
                                <div className="vocab-detail-section">
                                    <div className="vocab-detail-label">上下文</div>
                                    <div className="vocab-detail-context">
                                        "{smartTruncateContext(selectedVocab.context, selectedVocab.original)}"
                                    </div>
                                </div>
                            )}
                            

                            <div className="vocab-detail-footer">
                                <span className="vocab-detail-book">📚 {selectedVocab.bookTitle || book.title}</span>
                                <span className="vocab-detail-date">🕐 {new Date(selectedVocab.createdAt).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {toast && (
                <div className={`toast toast-${toast.type}`}>
                    {toast.message}
                </div>
            )}

            {hoveredWord && (
                <div
                    className="vocab-tooltip"
                    style={{
                        top: hoveredWord.rect.top - 40,
                        left: hoveredWord.rect.left + hoveredWord.rect.width / 2,
                    }}
                >
                    {hoveredWord.translation}
                </div>
            )}

            {isEditingContent && (
                <div className="modal-overlay" onClick={cancelEditContent}>
                    <div className="edit-content-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="edit-content-header">
                            <h3 className="edit-content-title">✏️ 编辑外刊内容</h3>
                            <button className="modal-close" onClick={cancelEditContent}>×</button>
                        </div>
                        <textarea
                            className="edit-content-textarea"
                            value={editedContent}
                            onChange={(e) => setEditedContent(e.target.value)}
                            placeholder="在此编辑外刊内容..."
                        />
                        <div className="edit-content-actions">
                            <button className="btn" onClick={cancelEditContent}>
                                取消
                            </button>
                            <button 
                                className="btn btn-primary" 
                                onClick={saveEditContent}
                                disabled={isSaving}
                            >
                                {isSaving ? '保存中...' : '💾 保存'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
        .reader-container {
          width: 100vw;
          height: 100vh;
          background: var(--bg-primary);
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        .reader-header {
          background: var(--paper-color);
          border-bottom: 1px solid var(--border-color);
          padding: 16px 32px;
          display: flex;
          align-items: center;
          gap: 24px;
          box-shadow: var(--shadow-sm);
        }

        .reader-header-actions {
          display: flex;
          gap: 12px;
        }

        .theme-toggle-btn {
          font-size: 18px;
          padding: 10px 14px;
        }

        .reader-title {
          margin: 0;
          font-size: 18px;
          font-weight: 600;
          color: var(--ink-color);
          flex: 1;
        }

        .back-btn {
          flex-shrink: 0;
        }

        .reader-content-wrapper {
          flex: 1;
          overflow-y: auto;
          padding: 48px 24px;
        }

        .reader-content {
          max-width: 800px;
          margin: 0 auto;
          background: var(--paper-color);
          border-radius: var(--radius-lg);
          padding: 48px;
          box-shadow: var(--shadow-md);
          border: 1px solid var(--border-color);
          min-height: 100%;
        }

        .text-content {
          white-space: pre-wrap;
          word-wrap: break-word;
          font-family: var(--font-serif);
          font-size: 18px;
          line-height: 1.8;
          color: var(--ink-color);
          margin: 0;
          -webkit-user-select: text;
          -moz-user-select: text;
          -ms-user-select: text;
          user-select: text;
        }

        .text-content::selection {
          background: var(--vocab-highlight-border);
          color: var(--ink-color);
        }

        .text-content::-moz-selection {
          background: var(--vocab-highlight-border);
          color: var(--ink-color);
        }

        .reader-copyright {
          text-align: center;
          padding: 48px 0 24px 0;
          font-size: 12px;
          color: var(--text-secondary);
          margin-top: 40px;
          border-top: 1px solid var(--border-color);
        }

        /* 生词高亮 */
        .vocab-highlight {
          background: var(--vocab-highlight-bg);
          cursor: pointer;
          padding: 2px 4px;
          border-radius: 3px;
          transition: all 0.2s;
          color: var(--ink-color);
          font-weight: 500;
          position: relative;
          -webkit-user-select: text;
          -moz-user-select: text;
          -ms-user-select: text;
          user-select: text;
        }

        .vocab-highlight:hover {
          background: var(--vocab-highlight-border);
        }

        /* 跳转高亮脉冲动画 */
        .vocab-jump-highlight {
          animation: jumpPulse 1s ease-in-out 2;
          background: var(--jump-highlight-bg) !important;
        }

        @keyframes jumpPulse {
          0%, 100% {
            background: var(--jump-highlight-bg);
            transform: scale(1);
          }
          50% {
            background: var(--warning-color);
            transform: scale(1.05);
          }
        }

        /* PC端：生词高亮后添加小标签 */
        @media (hover: hover) and (pointer: fine) {
          .vocab-highlight::after {
            content: attr(data-translation);
            position: absolute;
            bottom: 100%;
            left: 50%;
            transform: translateX(-50%) translateY(-4px);
            background: var(--tooltip-bg);
            color: var(--tooltip-text);
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 12px;
            font-weight: 500;
            white-space: nowrap;
            opacity: 0;
            pointer-events: none;
            transition: opacity 0.2s, transform 0.2s;
            z-index: 100;
          }

          .vocab-highlight::before {
            content: '';
            position: absolute;
            bottom: 100%;
            left: 50%;
            transform: translateX(-50%) translateY(-4px);
            border: 4px solid transparent;
            border-top-color: var(--tooltip-bg);
            opacity: 0;
            pointer-events: none;
            transition: opacity 0.2s, transform 0.2s;
            z-index: 100;
          }

          .vocab-highlight:hover::after,
          .vocab-highlight:hover::before {
            opacity: 1;
            transform: translateX(-50%) translateY(-8px);
          }

          .vocab-highlight:hover::before {
            transform: translateX(-50%) translateY(-4px);
          }
        }

        /* 生词悬停 Tooltip */
        .vocab-tooltip {
          position: absolute;
          background: var(--tooltip-bg);
          color: var(--tooltip-text);
          padding: 6px 12px;
          border-radius: 6px;
          font-size: 13px;
          font-weight: 500;
          z-index: 9999;
          pointer-events: none;
          white-space: nowrap;
          transform: translateX(-50%);
          box-shadow: var(--shadow-lg);
          animation: fadeIn 0.2s ease;
        }

        .vocab-tooltip::after {
          content: '';
          position: absolute;
          top: 100%;
          left: 50%;
          transform: translateX(-50%);
          border: 6px solid transparent;
          border-top-color: var(--tooltip-bg);
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translate(-50%, -5px); }
          to { opacity: 1; transform: translate(-50%, 0); }
        }

        /* Selection Tooltip */
        .selection-tooltip {
          position: absolute;
          background: var(--popup-bg);
          padding: 20px;
          border-radius: var(--radius-md);
          box-shadow: var(--shadow-xl);
          border: 1px solid var(--border-color);
          z-index: 1000;
          width: 300px;
          animation: popIn 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }

        .tooltip-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 12px;
          gap: 8px;
        }

        .selected-text {
          font-size: 13px;
          color: var(--text-secondary);
          flex: 1;
          line-height: 1.4;
        }

        .close-tooltip {
          background: none;
          border: none;
          cursor: pointer;
          font-size: 20px;
          padding: 0;
          color: var(--text-secondary);
          flex-shrink: 0;
          width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 4px;
        }

        .close-tooltip:hover {
          background: var(--bg-secondary);
        }

        .tooltip-input {
          width: 100%;
          padding: 10px 12px;
          border: 1px solid var(--border-color);
          border-radius: var(--radius-sm);
          margin-bottom: 12px;
          font-family: var(--font-sans);
          font-size: 14px;
          box-sizing: border-box;
          background: var(--paper-color);
          color: var(--ink-color);
        }

        .tooltip-input:focus {
          outline: none;
          border-color: var(--accent-color);
          box-shadow: 0 0 0 3px var(--accent-light);
        }

        .save-btn {
          width: 100%;
        }

        @keyframes popIn {
          from { transform: scale(0.8); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
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
          from {
            opacity: 1;
          }
          to {
            opacity: 0;
          }
        }

        /* 单词详情弹窗 */
        .vocab-detail-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: var(--overlay-bg);
          -webkit-backdrop-filter: blur(4px);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 10000;
          animation: overlayFadeIn 0.3s ease;
          padding: 20px;
        }

        @keyframes overlayFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .vocab-detail-card {
          background: var(--popup-bg);
          border-radius: var(--radius-lg);
          box-shadow: var(--shadow-xl);
          max-width: 500px;
          border: 1px solid var(--border-color);
          width: 100%;
          max-height: 80vh;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          animation: cardSlideIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
          position: relative;
        }

        @keyframes cardSlideIn {
          from {
            transform: scale(0.9) translateY(20px);
            opacity: 0;
          }
          to {
            transform: scale(1) translateY(0);
            opacity: 1;
          }
        }

        .vocab-detail-close {
          position: absolute;
          top: 16px;
          right: 16px;
          background: rgba(0, 0, 0, 0.05);
          border: none;
          border-radius: 50%;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
          color: var(--text-secondary);
          cursor: pointer;
          transition: all 0.2s;
          z-index: 1;
        }

        .vocab-detail-close:hover {
          background: rgba(0, 0, 0, 0.1);
          transform: rotate(90deg);
        }

        .vocab-detail-header {
          background: linear-gradient(135deg, #0ea5e9 0%, #06b6d4 100%);
          padding: 32px 24px 24px 24px;
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .vocab-detail-icon {
          font-size: 32px;
          filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1));
        }

        .vocab-detail-word {
          margin: 0;
          font-size: 28px;
          font-weight: 600;
          color: white;
          text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          flex: 1;
          word-break: break-word;
        }

        .vocab-detail-body {
          padding: 24px;
          overflow-y: auto;
          flex: 1;
        }

        .vocab-detail-section {
          margin-bottom: 24px;
        }

        .vocab-detail-section:last-of-type {
          margin-bottom: 0;
        }

        .vocab-detail-label {
          font-size: 12px;
          font-weight: 600;
          color: var(--text-secondary);
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 8px;
        }

        .vocab-detail-translation {
          font-size: 20px;
          font-weight: 500;
          color: var(--ink-color);
          line-height: 1.6;
        }

        .vocab-detail-context {
          font-size: 15px;
          color: var(--text-secondary);
          line-height: 1.7;
          font-style: italic;
          padding: 16px;
          background: var(--bg-secondary);
          border-radius: var(--radius-sm);
          border-left: 3px solid var(--accent-color);
        }

        .vocab-detail-footer {
          display: flex;
          gap: 16px;
          padding-top: 16px;
          border-top: 1px solid var(--border-color);
          font-size: 13px;
          color: var(--text-secondary);
          flex-wrap: wrap;
        }

        .vocab-detail-book,
        .vocab-detail-date {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        /* Edit Content Modal */
        .edit-content-modal {
          background: var(--popup-bg);
          border-radius: var(--radius-lg);
          width: 90%;
          max-width: 900px;
          max-height: 85vh;
          display: flex;
          flex-direction: column;
          box-shadow: var(--shadow-xl);
          animation: slideUp 0.3s ease;
          border: 1px solid var(--border-color);
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

        .edit-content-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 24px;
          border-bottom: 1px solid var(--border-color);
        }

        .edit-content-title {
          margin: 0;
          font-size: 20px;
          font-weight: 600;
          color: var(--ink-color);
        }

        .modal-close {
          background: none;
          border: none;
          font-size: 28px;
          cursor: pointer;
          color: var(--text-secondary);
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: var(--radius-sm);
          transition: background 0.2s;
        }

        .modal-close:hover {
          background: var(--bg-secondary);
        }

        .edit-content-textarea {
          flex: 1;
          padding: 24px;
          border: none;
          font-family: var(--font-serif);
          font-size: 16px;
          line-height: 1.8;
          resize: none;
          outline: none;
          overflow-y: auto;
          background: var(--paper-color);
          color: var(--ink-color);
        }

        .edit-content-textarea::placeholder {
          color: var(--text-secondary);
        }

        .edit-content-actions {
          display: flex;
          gap: 12px;
          justify-content: flex-end;
          padding: 20px 24px;
          border-top: 1px solid var(--border-color);
        }

        .edit-content-actions .btn {
          min-width: 100px;
        }

        @media (max-width: 768px) {
          .reader-header {
            padding: 12px 16px;
            gap: 12px;
          }

          .reader-title {
            font-size: 16px;
          }

          .back-btn {
            font-size: 14px;
            padding: 8px 12px;
          }

          .reader-header .btn {
            font-size: 13px;
            padding: 6px 10px;
          }

          .reader-content-wrapper {
            padding: 16px 12px;
          }

          .reader-content {
            padding: 24px 16px;
            border-radius: var(--radius-md);
          }

          .text-content {
            font-size: 16px;
            line-height: 1.9;
            -webkit-user-select: text;
            -moz-user-select: text;
            -ms-user-select: text;
            user-select: text;
            -webkit-touch-callout: default;
          }

          .text-content::selection {
            background: var(--vocab-highlight-border);
          }

          .text-content::-moz-selection {
            background: var(--vocab-highlight-border);
          }

          /* 移动端生词高亮优化 */
          .vocab-highlight {
            padding: 2px 1px;
            -webkit-tap-highlight-color: var(--vocab-highlight-border);
            touch-action: manipulation;
            cursor: pointer;
            pointer-events: auto;
            -webkit-user-select: none;
            -moz-user-select: none;
            -ms-user-select: none;
            user-select: none;
            display: inline;
            position: relative;
            z-index: 1;
          }

          .vocab-highlight:active {
            background: var(--vocab-highlight-border) !important;
            transform: scale(1.05);
          }

          /* 移动端生词 tooltip 定位优化 */
          .vocab-tooltip {
            position: fixed;
            top: auto !important;
            bottom: 80px;
            left: 50% !important;
            transform: translateX(-50%);
            max-width: 280px;
            padding: 10px 16px;
            font-size: 14px;
          }

          .vocab-tooltip::after {
            top: auto;
            bottom: -6px;
            border-top-color: transparent;
            border-bottom-color: var(--ink-color);
            transform: translateX(-50%) rotate(180deg);
          }

          /* 移动端选择 tooltip 优化 */
          .selection-tooltip {
            position: fixed !important;
            top: auto !important;
            bottom: 20px !important;
            left: 50% !important;
            transform: translateX(-50%);
            width: 90%;
            max-width: 340px;
            padding: 16px;
          }

          .tooltip-input {
            font-size: 16px;
            padding: 12px;
          }

          .save-btn {
            padding: 12px;
            font-size: 15px;
          }

          /* Toast 优化 */
          .toast {
            top: 16px;
            width: 90%;
            max-width: 300px;
          }

          /* 移动端单词详情弹窗 */
          .vocab-detail-overlay {
            padding: 16px;
          }

          .vocab-detail-card {
            max-width: 100%;
            max-height: 90vh;
          }

          .vocab-detail-header {
            padding: 24px 20px 20px 20px;
          }

          .vocab-detail-icon {
            font-size: 24px;
          }

          .vocab-detail-word {
            font-size: 22px;
          }

          .vocab-detail-body {
            padding: 20px;
          }

          .vocab-detail-translation {
            font-size: 18px;
          }

          .vocab-detail-context {
            font-size: 14px;
            padding: 12px;
          }

          .vocab-detail-footer {
            font-size: 12px;
            flex-direction: column;
            gap: 8px;
          }

          /* 隐藏桌面端悬停提示 */
          @media (hover: none) {
            .reader-content:hover {
              cursor: default;
            }
          }
        }
      `}</style>
        </div>
    );
};

export default ReaderView;
