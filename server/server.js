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
const uploadsDir = path.join(__dirname, '../data/uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

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
