const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Static files (uploaded books)
// Docker 环境: ./data, 本地环境: ../data
const dataDir = fs.existsSync(path.join(__dirname, 'data')) 
    ? path.join(__dirname, 'data') 
    : path.join(__dirname, '../data');

const uploadsDir = path.join(dataDir, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// 登录背景图片目录
const loginBgDir = path.join(dataDir, 'login-bg');
if (!fs.existsSync(loginBgDir)) {
    fs.mkdirSync(loginBgDir, { recursive: true });
}
console.log('登录背景目录:', loginBgDir);
app.use('/api/login-bg', express.static(loginBgDir));

// Multer setup for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadsDir)
    },
    filename: function (req, file, cb) {
        // Use timestamp to avoid collisions, keep original name for reference
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + '-' + file.originalname)
    }
});

const upload = multer({
    storage: storage,
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'text/plain' || file.originalname.endsWith('.txt')) {
            cb(null, true);
        } else {
            cb(new Error('Only .txt files are allowed!'), false);
        }
    }
});

// API Routes

// Upload a book
app.post('/api/upload', upload.single('file'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded or invalid file type' });
    }

    const title = req.body.title || req.file.originalname.replace('.txt', '');
    const filename = req.file.filename;

    const sql = `INSERT INTO books (title, filename) VALUES (?, ?)`;
    db.run(sql, [title, filename], function (err) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json({
            message: 'File uploaded successfully',
            book: { id: this.lastID, title, filename }
        });
    });
});

// Get all books
app.get('/api/books', (req, res) => {
    const sql = `SELECT * FROM books ORDER BY uploadDate DESC`;
    db.all(sql, [], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(rows);
    });
});

// Get book content
app.get('/api/books/:id/content', (req, res) => {
    const sql = `SELECT filename FROM books WHERE id = ?`;
    db.get(sql, [req.params.id], (err, row) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        if (!row) {
            return res.status(404).json({ error: 'Book not found' });
        }

        const filePath = path.join(uploadsDir, row.filename);
        fs.readFile(filePath, 'utf8', (err, data) => {
            if (err) {
                return res.status(500).json({ error: 'Error reading file' });
            }
            res.send(data);
        });
    });
});

// Save vocabulary
app.post('/api/vocab', (req, res) => {
    const { original, translation, context, bookId } = req.body;
    if (!original) {
        return res.status(400).json({ error: 'Original text is required' });
    }

    const sql = `INSERT INTO vocabulary (original, translation, context, bookId) VALUES (?, ?, ?, ?)`;
    db.run(sql, [original, translation, context, bookId], function (err) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json({
            message: 'Vocabulary saved',
            id: this.lastID
        });
    });
});

// Get vocabulary
app.get('/api/vocab', (req, res) => {
    const sql = `SELECT v.*, b.title as bookTitle FROM vocabulary v LEFT JOIN books b ON v.bookId = b.id ORDER BY v.createdAt DESC`;
    db.all(sql, [], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(rows);
    });
});

// Delete vocabulary
app.delete('/api/vocab/:id', (req, res) => {
    const sql = `DELETE FROM vocabulary WHERE id = ?`;
    db.run(sql, [req.params.id], function (err) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        if (this.changes === 0) {
            return res.status(404).json({ error: 'Vocabulary not found' });
        }
        res.json({ message: 'Vocabulary deleted successfully' });
    });
});

// Update book title
app.put('/api/books/:id', (req, res) => {
    const bookId = req.params.id;
    const { title } = req.body;
    
    if (!title || title.trim().length === 0) {
        return res.status(400).json({ error: 'Title is required' });
    }
    
    const sql = `UPDATE books SET title = ? WHERE id = ?`;
    db.run(sql, [title.trim(), bookId], function(err) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        if (this.changes === 0) {
            return res.status(404).json({ error: 'Book not found' });
        }
        res.json({ message: 'Book title updated successfully', title: title.trim() });
    });
});

// Update book content
app.put('/api/books/:id/content', (req, res) => {
    const bookId = req.params.id;
    const { content } = req.body;
    
    if (content === undefined || content === null) {
        return res.status(400).json({ error: 'Content is required' });
    }
    
    // 首先获取书籍的文件名
    const getBookSql = `SELECT filename FROM books WHERE id = ?`;
    db.get(getBookSql, [bookId], (err, book) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        if (!book) {
            return res.status(404).json({ error: 'Book not found' });
        }
        
        // 写入文件
        const filePath = path.join(uploadsDir, book.filename);
        fs.writeFile(filePath, content, 'utf8', (err) => {
            if (err) {
                return res.status(500).json({ error: 'Error writing file' });
            }
            res.json({ message: 'Book content updated successfully' });
        });
    });
});

// Export all data (books metadata + vocabulary + content)
app.get('/api/export', (req, res) => {
    const getBooksSQL = `SELECT * FROM books ORDER BY uploadDate DESC`;
    const getVocabSQL = `SELECT * FROM vocabulary ORDER BY createdAt DESC`;
    
    db.all(getBooksSQL, [], (err, books) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        
        console.log(`导出: 找到 ${books.length} 本书籍`);
        
        // 读取每本书的内容
        const booksWithContent = [];
        let processedCount = 0;
        
        if (books.length === 0) {
            // 如果没有书籍，直接导出生词
            db.all(getVocabSQL, [], (err, vocabulary) => {
                if (err) {
                    return res.status(500).json({ error: err.message });
                }
                
                console.log(`导出: 找到 ${vocabulary ? vocabulary.length : 0} 个生词（无书籍）`);
                
                res.json({
                    version: '1.0',
                    exportDate: new Date().toISOString(),
                    books: [],
                    vocabulary: vocabulary || []
                });
            });
            return;
        }
        
        books.forEach(book => {
            const filePath = path.join(uploadsDir, book.filename);
            fs.readFile(filePath, 'utf8', (err, content) => {
                if (!err) {
                    booksWithContent.push({
                        ...book,
                        content: content
                    });
                } else {
                    console.error(`Error reading file ${book.filename}:`, err);
                    // 即使文件读取失败，也保存元数据
                    booksWithContent.push({
                        ...book,
                        content: ''
                    });
                }
                
                processedCount++;
                
                // 所有书籍处理完成后，导出数据
                if (processedCount === books.length) {
                    db.all(getVocabSQL, [], (err, vocabulary) => {
                        if (err) {
                            return res.status(500).json({ error: err.message });
                        }
                        
                        console.log(`导出: 找到 ${vocabulary ? vocabulary.length : 0} 个生词`);
                        
                        res.json({
                            version: '1.0',
                            exportDate: new Date().toISOString(),
                            books: booksWithContent,
                            vocabulary: vocabulary || []
                        });
                    });
                }
            });
        });
    });
});

// Import data (books metadata + vocabulary + content)
app.post('/api/import', (req, res) => {
    const { books, vocabulary } = req.body;
    
    if (!books || !Array.isArray(books)) {
        return res.status(400).json({ error: 'Invalid import data' });
    }
    
    console.log(`导入: 准备导入 ${books.length} 本书籍和 ${vocabulary ? vocabulary.length : 0} 个生词`);
    
    let imported = { books: 0, vocabulary: 0, files: 0 };
    const bookIdMap = {}; // 旧ID -> 新ID 的映射
    
    // 导入书籍元数据和文件内容
    const importBookPromises = books.map(book => {
        return new Promise((resolve, reject) => {
            const sql = `INSERT INTO books (title, filename, uploadDate) VALUES (?, ?, ?)`;
            db.run(sql, [book.title, book.filename, book.uploadDate], function(err) {
                if (err) {
                    console.error('Error importing book:', err);
                    resolve({ success: false, oldId: book.id, newId: null });
                    return;
                }
                
                console.log('db.run callback - this:', this);
                console.log('db.run callback - this.lastID:', this.lastID);
                
                const newBookId = this.lastID;
                imported.books++;
                
                console.log(`导入书籍: "${book.title}" (旧ID: ${book.id} -> 新ID: ${newBookId})`);
                
                // 如果有内容，写入文件
                if (book.content) {
                    const filePath = path.join(uploadsDir, book.filename);
                    fs.writeFile(filePath, book.content, 'utf8', (writeErr) => {
                        if (writeErr) {
                            console.error('Error writing book file:', writeErr);
                        } else {
                            imported.files++;
                        }
                        resolve({ success: true, oldId: book.id, newId: newBookId });
                    });
                } else {
                    resolve({ success: true, oldId: book.id, newId: newBookId });
                }
            });
        });
    });
    
    Promise.all(importBookPromises).then((results) => {
        // 构建bookId映射表
        results.forEach(result => {
            if (result.success && result.oldId && result.newId) {
                bookIdMap[result.oldId] = result.newId;
            }
        });
        
        console.log('BookId映射表:', bookIdMap);
        
        // 导入生词
        if (vocabulary && Array.isArray(vocabulary)) {
            const importVocabPromises = vocabulary.map(vocab => {
                return new Promise((resolve, reject) => {
                    // 使用映射后的新bookId
                    const newBookId = bookIdMap[vocab.bookId] || vocab.bookId;
                    
                    const sql = `INSERT INTO vocabulary (original, translation, context, bookId, createdAt) VALUES (?, ?, ?, ?, ?)`;
                    db.run(sql, [vocab.original, vocab.translation, vocab.context, newBookId, vocab.createdAt], function(err) {
                        if (err) {
                            console.error('Error importing vocabulary:', err);
                            resolve(false);
                        } else {
                            imported.vocabulary++;
                            resolve(true);
                        }
                    });
                });
            });
            
            Promise.all(importVocabPromises).then(() => {
                console.log(`导入完成: ${imported.books} 本书籍, ${imported.files} 个文件, ${imported.vocabulary} 个生词`);
                res.json({
                    message: 'Import completed',
                    imported: imported
                });
            });
        } else {
            console.log(`导入完成: ${imported.books} 本书籍, ${imported.files} 个文件, 0 个生词`);
            res.json({
                message: 'Import completed',
                imported: imported
            });
        }
    });
});

// Delete book
app.delete('/api/books/:id', (req, res) => {
    const bookId = req.params.id;
    
    // First, get the book filename
    const getBookSql = `SELECT filename FROM books WHERE id = ?`;
    db.get(getBookSql, [bookId], (err, book) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        if (!book) {
            return res.status(404).json({ error: 'Book not found' });
        }
        
        // Delete associated vocabulary
        const deleteVocabSql = `DELETE FROM vocabulary WHERE bookId = ?`;
        db.run(deleteVocabSql, [bookId], (err) => {
            if (err) {
                console.error('Error deleting vocabulary:', err);
                // Continue even if vocabulary deletion fails
            }
            
            // Delete book from database
            const deleteBookSql = `DELETE FROM books WHERE id = ?`;
            db.run(deleteBookSql, [bookId], function (err) {
                if (err) {
                    return res.status(500).json({ error: err.message });
                }
                
                // Delete the file from uploads directory
                const filePath = path.join(uploadsDir, book.filename);
                fs.unlink(filePath, (err) => {
                    if (err) {
                        console.error('Error deleting file:', err);
                        // File might not exist, but book is deleted from DB, so continue
                    }
                    res.json({ 
                        message: 'Book deleted successfully',
                        deletedFile: book.filename
                    });
                });
            });
        });
    });
});

// Serve frontend in production
if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, 'public')));
    app.get('*', (req, res) => {
        res.sendFile(path.join(__dirname, 'public', 'index.html'));
    });
}

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV}`);
});
