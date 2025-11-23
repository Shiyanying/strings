import React, { useState, useEffect, useRef } from 'react';
import '../styles/global.css';

const ReaderView = ({ book, onClose }) => {
    const [content, setContent] = useState('');
    const [selection, setSelection] = useState(null); // { text, rect, context }
    const [translation, setTranslation] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const contentRef = useRef(null);
    const isDraggingRef = useRef(false);

    useEffect(() => {
        fetch(`/api/books/${book.id}/content`)
            .then(res => res.text())
            .then(text => setContent(text))
            .catch(err => console.error(err));
    }, [book]);

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

    // Mobile Selection
    useEffect(() => {
        const handleSelectionChange = () => {
            // Only process if not dragging right mouse (to avoid conflict)
            if (!isDraggingRef.current) {
                // Debounce or wait for end? Mobile usually has a "selection end" via touchend, 
                // but selectionchange fires continuously.
                // We'll rely on a manual "Translate" button or check if selection is stable?
                // Actually, for mobile, let's listen to touchend to finalize.
            }
        };
        document.addEventListener('selectionchange', handleSelectionChange);
        return () => document.removeEventListener('selectionchange', handleSelectionChange);
    }, []);

    const handleTouchEnd = () => {
        setTimeout(processSelection, 100); // Small delay to let selection settle
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
                alert('Saved to Vocabulary!');
                setSelection(null);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="reader-container">
            <button className="back-btn" onClick={onClose}>← Back to Desk</button>

            <div className="book-open">
                <div className="page left-page"></div>
                <div
                    className="page right-page"
                    ref={contentRef}
                    onContextMenu={handleContextMenu}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onTouchEnd={handleTouchEnd}
                >
                    <div className="page-content">
                        <h2>{book.title}</h2>
                        <pre className="text-content">{content}</pre>
                    </div>
                </div>
            </div>

            {selection && (
                <div
                    className="selection-tooltip"
                    style={{
                        top: selection.rect.top - 140, // Position above
                        left: selection.rect.left,
                    }}
                >
                    <div className="tooltip-header">
                        <span className="selected-text">{selection.text.substring(0, 20)}{selection.text.length > 20 ? '...' : ''}</span>
                        <button className="close-tooltip" onClick={() => setSelection(null)}>×</button>
                    </div>
                    <input
                        type="text"
                        placeholder="Enter translation..."
                        value={translation}
                        onChange={(e) => setTranslation(e.target.value)}
                        autoFocus
                    />
                    <button className="save-btn" onClick={saveVocabulary} disabled={isSaving}>
                        {isSaving ? 'Saving...' : 'Save to Vocab'}
                    </button>
                </div>
            )}

            <style>{`
        .reader-container {
          width: 100vw;
          height: 100vh;
          background: #1a1a1a;
          display: flex;
          justify-content: center;
          align-items: center;
          overflow: hidden;
          position: relative;
        }

        .back-btn {
          position: absolute;
          top: 20px;
          left: 20px;
          z-index: 100;
          background: rgba(255,255,255,0.1);
          color: white;
          border: none;
          padding: 10px 20px;
          border-radius: 20px;
          cursor: pointer;
        }

        .book-open {
          width: 90vw;
          height: 90vh;
          background: #fdfbf7;
          border-radius: 20px;
          box-shadow: 0 20px 50px rgba(0,0,0,0.5);
          display: flex;
          position: relative;
          overflow: hidden;
        }

        .page {
          flex: 1;
          height: 100%;
          overflow-y: auto;
          padding: 60px;
          position: relative;
        }

        .left-page {
          background: #f8f5f0;
          border-right: 1px solid #e0e0e0;
          box-shadow: inset -10px 0 20px rgba(0,0,0,0.05);
          /* For now, left page is empty or could show previous content */
          display: none; /* Hide for single-page view on small screens/MVP */
        }
        
        @media (min-width: 1024px) {
          .left-page { display: block; }
          .book-open { width: 80vw; height: 85vh; }
        }

        .right-page {
          background: #fdfbf7;
          box-shadow: inset 10px 0 20px rgba(0,0,0,0.05);
        }

        .text-content {
          white-space: pre-wrap;
          font-family: var(--font-serif);
          font-size: 1.2rem;
          line-height: 1.8;
          color: #2c2c2c;
          max-width: 800px;
          margin: 0 auto;
        }

        /* Selection Tooltip */
        .selection-tooltip {
          position: absolute;
          background: white;
          padding: 16px;
          border-radius: 12px;
          box-shadow: 0 10px 30px rgba(0,0,0,0.2);
          z-index: 1000;
          width: 250px;
          animation: popIn 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }

        .tooltip-header {
          display: flex;
          justify-content: space-between;
          margin-bottom: 10px;
          font-size: 0.9rem;
          color: #666;
        }

        .close-tooltip {
          background: none;
          border: none;
          cursor: pointer;
          font-size: 1.2rem;
          padding: 0 5px;
        }

        .selection-tooltip input {
          width: 100%;
          padding: 8px 12px;
          border: 1px solid #ddd;
          border-radius: 8px;
          margin-bottom: 10px;
          font-family: var(--font-sans);
        }

        .save-btn {
          width: 100%;
          background: var(--accent-color);
          color: white;
          border: none;
          padding: 8px;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 600;
        }

        @keyframes popIn {
          from { transform: scale(0.8); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
      `}</style>
        </div>
    );
};

export default ReaderView;
