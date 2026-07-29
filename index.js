require('dotenv').config();
const express = require('express');
const { DatabaseSync } = require('node:sqlite');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
app.use(express.json());

const db = new DatabaseSync('taskmanager.db');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    completed INTEGER DEFAULT 0,
    user_id INTEGER NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id)
  )
`);

console.log("Database and tables ready");

app.post('/register', (req, res) => {
  const { name, password } = req.body;

  if (!name || name.trim() === '') {
    return res.status(400).json({ error: "Name is required" });
  }
  if (!password || password.length < 6) {
    return res.status(400).json({ error: "Password must be at least 6 characters" });
  }

  const existing = db.prepare('SELECT * FROM users WHERE name = ?').get(name);
  if (existing) {
    return res.status(409).json({ error: "Username already taken" });
  }

  const hashedPassword = bcrypt.hashSync(password, 10);
  const insert = db.prepare('INSERT INTO users (name, password) VALUES (?, ?)');
  const result = insert.run(name, hashedPassword);

  const newUser = db.prepare('SELECT id, name FROM users WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(newUser);
});

app.post('/login', (req, res) => {
  const { name, password } = req.body;

  const user = db.prepare('SELECT * FROM users WHERE name = ?').get(name);
  if (!user) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const passwordMatches = bcrypt.compareSync(password, user.password);
  if (!passwordMatches) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const token = jwt.sign(
    { userId: user.id, name: user.name },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );

  res.json({ message: "Login successful", token });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
