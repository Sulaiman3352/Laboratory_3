/**
 * Lab 3 — server.js
 * Express + sql.js (in-memory SQLite)
 *
 * Routes:
 *   GET  /api/users          → return all users (optional ?name=&role= filters)
 *   POST /api/users          → insert a new user
 *   GET  /                   → serve main.html
 */

const express  = require('express');
const cors     = require('cors');
const path     = require('path');
const initSqlJs = require('sql.js');

const app  = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'main.html'));
});

// ── Database bootstrap ────────────────────────────────────────────────────────
let DB; // sql.js Database instance

initSqlJs().then(SQL => {
  DB = new SQL.Database();

  // Create users table
  DB.run(`
  CREATE TABLE IF NOT EXISTS users (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    name      TEXT    NOT NULL,
    email     TEXT    NOT NULL UNIQUE,
    role      TEXT    NOT NULL DEFAULT 'Student',
    created_at TEXT   DEFAULT (datetime('now'))
  )
  `);

  // Seed sample data
  const seed = [
    ['Sulayman Seid',  'sulayman@uni.ru',   'DevOps Engineer'],
    ['Alina Ivanova',  'alina@uni.ru',       'Developer'],
    ['Pavel Sokolov',  'pavel@uni.ru',       'Student'],
    ['Maria Chen',     'maria@uni.ru',       'Designer'],
    ['Dmitri Volkov',  'dmitri@uni.ru',      'Student'],
    ['Sara Omer',      'sara@uni.ru',        'Developer'],
  ];

  const insert = DB.prepare(
    'INSERT OR IGNORE INTO users (name, email, role) VALUES (?, ?, ?)'
  );
  seed.forEach(row => insert.run(row));
  insert.free();

  // Start server only after DB is ready
  app.listen(PORT, () => {
    console.log(`✅  Server running → http://localhost:${PORT}`);
  });
});

// ── Helper: run SELECT and return rows as objects ─────────────────────────────
function queryAll(sql, params = []) {
  const stmt   = DB.prepare(sql);
  const rows   = [];
  stmt.bind(params);
  while (stmt.step()) {
    rows.push(stmt.getAsObject());
  }
  stmt.free();
  return rows;
}

// ── GET /api/users ────────────────────────────────────────────────────────────
// Optional query params: ?name=&role=
app.get('/api/users', (req, res) => {
  const { name = '', role = '' } = req.query;

  let sql    = 'SELECT * FROM users WHERE 1=1';
  const params = [];

  if (name.trim()) {
    sql += ' AND name LIKE ?';
    params.push(`%${name.trim()}%`);
  }
  if (role.trim() && role !== 'all') {
    sql += ' AND role = ?';
    params.push(role.trim());
  }

  sql += ' ORDER BY id DESC';

  try {
    const rows = queryAll(sql, params);
    res.json({ success: true, users: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── POST /api/users ───────────────────────────────────────────────────────────
app.post('/api/users', (req, res) => {
  const { name, email, role } = req.body;

  if (!name || !email || !role) {
    return res.status(400).json({ success: false, error: 'All fields are required.' });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ success: false, error: 'Invalid email address.' });
  }

  try {
    DB.run(
      'INSERT INTO users (name, email, role) VALUES (?, ?, ?)',
           [name.trim(), email.trim().toLowerCase(), role.trim()]
    );
    res.json({ success: true, message: `User "${name}" added successfully!` });
  } catch (err) {
    if (err.message.includes('UNIQUE')) {
      res.status(409).json({ success: false, error: 'A user with that email already exists.' });
    } else {
      res.status(500).json({ success: false, error: err.message });
    }
  }
});
