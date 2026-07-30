# Task Manager API

A RESTful API for managing personal tasks, built with Node.js and Express. Each user has their own account and can only access their own tasks — built to practice real-world backend patterns: authentication, authorization, and secure data handling.

## Features

- User registration and login with hashed passwords (bcrypt)
- JWT-based authentication
- Full CRUD for tasks (Create, Read, Update, Delete)
- Tasks are scoped per user — no user can view or modify another user's data
- Input validation on all write operations
- Centralized error handling
- SQLite database (via Node's built-in `node:sqlite` module)

## Tech Stack

- Node.js
- Express
- SQLite (node:sqlite)
- bcryptjs (password hashing)
- jsonwebtoken (JWT auth)
- dotenv (environment config)

## Getting Started

### Prerequisites
- Node.js v22+ (uses the built-in `node:sqlite` module)

### Installation

\`\`\`bash
git clone https://github.com/innocentochonogor/task-manager-api.git
cd task-manager-api
npm install
\`\`\`

### Environment Variables

Create a `.env` file in the root directory:

\`\`\`
PORT=3000
JWT_SECRET=your_secret_key_here
\`\`\`

### Running the server

\`\`\`bash
node index.js
\`\`\`

Server runs at `http://localhost:3000`

## API Endpoints

### Auth

| Method | Endpoint | Description | Auth Required |
|--------|----------|--------------|----------------|
| POST | /register | Create a new user account | No |
| POST | /login | Log in and receive a JWT token | No |

### Tasks

| Method | Endpoint | Description | Auth Required |
|--------|----------|--------------|----------------|
| POST | /tasks | Create a new task | Yes |
| GET | /tasks | Get all tasks for the logged-in user | Yes |
| GET | /tasks/:id | Get a single task by ID | Yes |
| PUT | /tasks/:id | Update a task's title or completed status | Yes |
| DELETE | /tasks/:id | Delete a task | Yes |

### Example: Register

\`\`\`bash
curl -X POST http://localhost:3000/register \\
  -H "Content-Type: application/json" \\
  -d '{"name": "yourname", "password": "yourpassword"}'
\`\`\`

### Example: Create a task (authenticated)

\`\`\`bash
curl -X POST http://localhost:3000/tasks \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \\
  -d '{"title": "Learn Express"}'
\`\`\`

## Security Notes

- Passwords are never stored in plain text — hashed with bcrypt before saving
- Passwords are excluded from all API responses
- JWTs expire after 1 hour
- All queries use parameterized statements to prevent SQL injection
- Tasks are strictly scoped to their owning user (authorization, not just authentication)

🔗 **Live API:** https://task-manager-api-0dzi.onrender.com

*Note: hosted on Render's free tier, so the first request after inactivity may take 30-50 seconds to respond while the server wakes up.*

## Author

Innocent Ochonogor
