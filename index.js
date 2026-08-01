require('dotenv').config();
console.log("DATABASE_URL present:", !!process.env.DATABASE_URL);
console.log("JWT_SECRET present:", !!process.env.JWT_SECRET);

const express = require('express');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
app.use(express.json());
app.use(express.static('public'));

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function setupDatabase() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS tasks (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      completed BOOLEAN DEFAULT false,
      user_id INTEGER NOT NULL REFERENCES users(id)
    )
  `);

  console.log("Database and tables ready");
}

setupDatabase();

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

app.post('/register', async (req, res) => {
  const { name, password } = req.body;

  if (!name || name.trim() === '') {
    return res.status(400).json({ error: "Name is required" });
  }
  if (!password || password.length < 6) {
    return res.status(400).json({ error: "Password must be at least 6 characters" });
  }

  const existing = await pool.query('SELECT * FROM users WHERE name = $1', [name]);
  if (existing.rows.length > 0) {
    return res.status(409).json({ error: "Username already taken" });
  }

  const hashedPassword = bcrypt.hashSync(password, 10);
  const result = await pool.query(
    'INSERT INTO users (name, password) VALUES ($1, $2) RETURNING id, name',
    [name, hashedPassword]
  );

  res.status(201).json(result.rows[0]);
});

app.post('/login', async (req, res) => {
  const { name, password } = req.body;

  const result = await pool.query('SELECT * FROM users WHERE name = $1', [name]);
  const user = result.rows[0];

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

app.post('/tasks', authenticateToken, async (req, res) => {
  const { title } = req.body;

  if (!title || title.trim() === '') {
    return res.status(400).json({ error: "Title is required" });
  }

  const result = await pool.query(
    'INSERT INTO tasks (title, user_id) VALUES ($1, $2) RETURNING *',
    [title, req.user.userId]
  );

  res.status(201).json(result.rows[0]);
});

app.get('/tasks', authenticateToken, async (req, res) => {
  const result = await pool.query('SELECT * FROM tasks WHERE user_id = $1', [req.user.userId]);
  res.json(result.rows);
});

app.get('/tasks/:id', authenticateToken, async (req, res) => {
  const id = Number(req.params.id);
  const result = await pool.query(
    'SELECT * FROM tasks WHERE id = $1 AND user_id = $2',
    [id, req.user.userId]
  );

  if (result.rows.length === 0) {
    return res.status(404).json({ error: "Task not found" });
  }
  res.json(result.rows[0]);
});

app.put('/tasks/:id', authenticateToken, async (req, res) => {
  const id = Number(req.params.id);
  const { title, completed } = req.body;

  const existing = await pool.query(
    'SELECT * FROM tasks WHERE id = $1 AND user_id = $2',
    [id, req.user.userId]
  );
  if (existing.rows.length === 0) {
    return res.status(404).json({ error: "Task not found" });
  }

  const current = existing.rows[0];
  const result = await pool.query(
    'UPDATE tasks SET title = $1, completed = $2 WHERE id = $3 RETURNING *',
    [title ?? current.title, completed !== undefined ? completed : current.completed, id]
  );

  res.json(result.rows[0]);
});

app.delete('/tasks/:id', authenticateToken, async (req, res) => {
  const id = Number(req.params.id);

  const existing = await pool.query(
    'SELECT * FROM tasks WHERE id = $1 AND user_id = $2',
    [id, req.user.userId]
  );
  if (existing.rows.length === 0) {
    return res.status(404).json({ error: "Task not found" });
  }

  await pool.query('DELETE FROM tasks WHERE id = $1', [id]);
  res.json({ message: "Task deleted" });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
