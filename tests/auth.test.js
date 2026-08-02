const request = require('supertest');
const app = require('../index');
const { pool } = require('../index');

describe('Auth routes', () => {
  const testUser = {
    name: `TestUser_${Date.now()}`, // unique name each run, avoids "already taken" errors
    password: 'testpassword123'
  };

  test('should register a new user', async () => {
    const res = await request(app)
      .post('/register')
      .send(testUser);

    expect(res.statusCode).toBe(201);
    expect(res.body).toHaveProperty('id');
    expect(res.body.name).toBe(testUser.name);
  }, 10000); // 10 second timeout instead of default 5
  test('should reject registration with short password', async () => {
    const res = await request(app)
      .post('/register')
      .send({ name: `ShortPass_${Date.now()}`, password: '123' });

    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  test('should login with correct credentials', async () => {
    const res = await request(app)
      .post('/login')
      .send(testUser);

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('token');
  });

  test('should reject login with wrong password', async () => {
    const res = await request(app)
      .post('/login')
      .send({ name: testUser.name, password: 'wrongpassword' });

    expect(res.statusCode).toBe(401);
    expect(res.body).toHaveProperty('error');
  });
});

