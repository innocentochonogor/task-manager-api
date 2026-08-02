const request = require('supertest');
const app = require('../index');
const { pool } = require('../index');

describe('Task routes', () => {
  const testUser = {
    name: `TaskTester_${Date.now()}`,
    password: 'testpassword123'
  };

  let token;
  let taskId;

  beforeAll(async () => {
    await request(app).post('/register').send(testUser);
    const loginRes = await request(app).post('/login').send(testUser);
    token = loginRes.body.token;
  }, 15000);

  test('should reject task creation without a token', async () => {
    const res = await request(app)
      .post('/tasks')
      .send({ title: 'No auth task' });

    expect(res.statusCode).toBe(401);
  });

  test('should create a task when authenticated', async () => {
    const res = await request(app)
      .post('/tasks')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Write tests' });

    expect(res.statusCode).toBe(201);
    expect(res.body.title).toBe('Write tests');
    taskId = res.body.id;
  });

  test('should get all tasks for the logged-in user', async () => {
    const res = await request(app)
      .get('/tasks')
      .set('Authorization', `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
  });

  test('should update a task', async () => {
    const res = await request(app)
      .put(`/tasks/${taskId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ completed: true });

    expect(res.statusCode).toBe(200);
    expect(res.body.completed).toBe(true);
  });

  test('should delete a task', async () => {
    const res = await request(app)
      .delete(`/tasks/${taskId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe('Task deleted');
  });

  test('should return 404 for a deleted task', async () => {
    const res = await request(app)
      .get(`/tasks/${taskId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.statusCode).toBe(404);
  });

 });
