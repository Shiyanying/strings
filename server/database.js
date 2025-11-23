const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Ensure data directory exists
const dataDir = path.join(__dirname, '../data');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'database.sqlite');
const db = new Database(dbPath);

console.log('Connected to the SQLite database.');

// Initialize database tables
db.exec(`CREATE TABLE IF NOT EXISTS books (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    filename TEXT NOT NULL,
    uploadDate DATETIME DEFAULT CURRENT_TIMESTAMP
)`);

db.exec(`CREATE TABLE IF NOT EXISTS vocabulary (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    original TEXT NOT NULL,
    translation TEXT,
    context TEXT,
    bookId INTEGER,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(bookId) REFERENCES books(id)
)`);

// Create compatibility wrapper for sqlite3 API
const compatDb = {
    run: function(sql, params, callback) {
        try {
            const stmt = db.prepare(sql);
            const args = Array.isArray(params) ? params : (params !== undefined ? [params] : []);
            const info = stmt.run(...args);
            if (callback) callback.call({ lastID: info.lastID, changes: info.changes }, null);
        } catch (err) {
            if (callback) callback(err);
        }
    },
    get: function(sql, params, callback) {
        try {
            const stmt = db.prepare(sql);
            const args = Array.isArray(params) ? params : (params !== undefined ? [params] : []);
            const row = stmt.get(...args);
            if (callback) callback(null, row);
        } catch (err) {
            if (callback) callback(err, null);
        }
    },
    all: function(sql, params, callback) {
        try {
            const stmt = db.prepare(sql);
            const args = Array.isArray(params) ? params : (params !== undefined ? [params] : []);
            const rows = stmt.all(...args);
            if (callback) callback(null, rows);
        } catch (err) {
            if (callback) callback(err, null);
        }
    }
};

module.exports = compatDb;
