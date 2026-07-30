require('dotenv').config();
const express = require('express');
const { DatabaseSync } = require('node:sqlite');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: "No token provided" });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ error: "Invalid or expired token" });
    }
    req.user = decoded;
    next();
  });
}

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

// Create a task
app.post('/tasks', authenticateToken, (req, res) => {
  const { title } = req.body;

  if (!title || title.trim() === '') {
    return res.status(400).json({ error: "Title is required" });
  }

  const insert = db.prepare('INSERT INTO tasks (title, user_id) VALUES (?, ?)');
  const result = insert.run(title, req.user.userId);

  const newTask = db.prepare('SELECT * FROM tasks WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(newTask);
});

// Get all tasks belonging to the logged-in user
app.get('/tasks', authenticateToken, (req, res) => {
  const tasks = db.prepare('SELECT * FROM tasks WHERE user_id = ?').all(req.user.userId);
  res.json(tasks);
});

// Get a single task (only if it belongs to the user)
app.get('/tasks/:id', authenticateToken, (req, res) => {
  const id = Number(req.params.id);
  const task = db.prepare('SELECT * FROM tasks WHERE id = ? AND user_id = ?').get(id, req.user.userId);

  if (!task) {
    return res.status(404).json({ error: "Task not found" });
  }
  res.json(task);
});

// Update a task
app.put('/tasks/:id', authenticateToken, (req, res) => {
  const id = Number(req.params.id);
  const { title, completed } = req.body;

  const existing = db.prepare('SELECT * FROM tasks WHERE id = ? AND user_id = ?').get(id, req.user.userId);
  if (!existing) {
    return res.status(404).json({ error: "Task not found" });
  }

  db.prepare('UPDATE tasks SET title = ?, completed = ? WHERE id = ?')
    .run(title ?? existing.title, completed !== undefined ? (completed ? 1 : 0) : existing.completed, id);

  const updated = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
  res.json(updated);
});

// Delete a task
app.delete('/tasks/:id', authenticateToken, (req, res) => {
  const id = Number(req.params.id);

  const existing = db.prepare('SELECT * FROM tasks WHERE id = ? AND user_id = ?').get(id, req.user.userId);
  if (!existing) {
    return res.status(404).json({ error: "Task not found" });
  }

  db.prepare('DELETE FROM tasks WHERE id = ?').run(id);
  res.json({ message: "Task deleted" });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
