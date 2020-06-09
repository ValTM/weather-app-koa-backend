import request from 'supertest';
import nock from 'nock';
import server from '../src/index';
import fs from 'fs';

// eslint-disable-next-line max-len
const token9999yearsAdmin = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhZG1pbiIsInBlcm1pc3Npb25zIjpbImFkbWluIl0sImlhdCI6MTU5MTczMzgyMSwiZXhwIjozMTcxMzYxNzYyMjF9.rUbShJVIOwagnzm5_9hrObje0ZCLqyfYSkMfxEQmv2I';
// eslint-disable-next-line max-len
const token9999yearsVal = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJWYWwiLCJpYXQiOjE1OTE3MzQyNzIsImV4cCI6MzE3MTM2MTc2NjcyfQ.nKzBszSK12Y7LP5ljlDrdRLAQkP60YXHENE5ut0p02Q';

describe('server tests', () => {
  afterAll(() => {
    fs.writeFileSync('users.json', JSON.stringify(
      { admin: { passwordhash: 'e9ec4a03944e7ed657d80026576878b2e3c35c2648bbf537c2415482fce185f2', isAdmin: true } })
    );
  });
  beforeEach(() => {
    // kill console
    jest.spyOn(global.console, 'error').mockImplementationOnce(() => true);
  });
  afterEach(async () => {
    // @ts-ignore
    request(await server.close());
  });
  describe('server general tests', () => {
    it('returns OK on /', async () => {
      const response = await request(server).get('/');
      expect(response.status).toEqual(200);
      expect(response.text).toContain('OK');
    });
    it('returns 401 on /weather without token', async () => {
      const response = await request(server).get('/weather');
      expect(response.status).toEqual(401);
      expect(response.text).toContain('Authentication Error');
    });
    it('responds with 405 on wrong method', async () => {
      const response = await request(server).get('/login');
      expect(response.status).toEqual(405);
      expect(response.text).toContain('Method Not Allowed');
    });
  });
  describe('login', () => {
    it('returns an error on incorrect credentials', async () => {
      const response = await request(server).post('/login')
        .send({ username: 'admin', passwordhash: 'wrong' });
      expect(response.body.error).toBe('invalid credentials');
      expect(response.body.token).toBe(undefined);
      expect(response.status).toBe(401);
    });
    it('returns an error on incorrect usernams', async () => {
      const response = await request(server).post('/login')
        .send({ username: 'aadmin', passwordhash: 'wrong' });
      expect(response.body.error).toBe('username not registered');
      expect(response.body.token).toBe(undefined);
      expect(response.status).toBe(409);
    });
    it('returns a token on correct credentials', async () => {
      const response = await request(server).post('/login')
        .send({ username: 'admin', passwordhash: 'd82494f05d6917ba02f7aaa29689ccb444bb73f20380876cb05d1f37537b7892' });
      expect(response.body.token.length > 0).toBe(true);
      expect(response.status).toBe(200);
    });
  });
  describe('register', () => {
    afterAll(() => {
      fs.writeFileSync('users.json', JSON.stringify(
        { admin: { passwordhash: 'e9ec4a03944e7ed657d80026576878b2e3c35c2648bbf537c2415482fce185f2', isAdmin: true } })
      );
    });
    it('returns an error on existing user', async () => {
      const response = await request(server).post('/register')
        .send({ username: 'admin', passwordhash: 'wrong' });
      expect(response.body.error).toBe('username already registered');
      expect(response.body.token).toBe(undefined);
      expect(response.status).toBe(409);
    });
    it('successfully registers a user', async () => {
      const response = await request(server).post('/register')
        .send({ username: 'aadmin', passwordhash: 'wrong' });
      expect(response.body.message).toBe('registered successfully');
      expect(response.body.token.length > 0).toBe(true);
      expect(response.status).toBe(200);
    });
  });
  describe('users', () => {
    it('returns the userlist for admin', async () => {
      const result = await request(server).get('/users').auth(token9999yearsAdmin, { type: 'bearer' });
      expect(result.body).toStrictEqual([{ username: 'admin', isAdmin: true }, { username: 'aadmin' }]);
      expect(result.status).toBe(200);
    });
    it('fails for non-admin', async () => {
      const result = await request(server).get('/users').auth(token9999yearsVal, { type: 'bearer' });
      expect(result.body.error).toBe('Missing permissions object in token');
      expect(result.status).toBe(400);
    });
    it('fails to delete non existing user', async () => {
      const result = await request(server).delete('/users/JonSnow').auth(token9999yearsAdmin, { type: 'bearer' });
      expect(result.body.error).toBe('user not found');
      expect(result.status).toBe(404);
    });
    it('fails to delete admin user', async () => {
      const result = await request(server).delete('/users/admin').auth(token9999yearsAdmin, { type: 'bearer' });
      expect(result.body.error).toBe('You cannot delete the admin user');
      expect(result.status).toBe(400);
    });
    it('deletes a user successfully', async () => {
      await request(server).post('/register').send({ username: 'goodbye', passwordhash: 'hashhashhash' });
      const result = await request(server).delete('/users/goodbye').auth(token9999yearsAdmin, { type: 'bearer' });
      expect(result.body.message).toBe('successfully deleted user');
      expect(result.status).toBe(200);
    });
  });
  describe('weather', () => {
    it('gives you weather information', async () => {
      nock('https://api.openweathermap.org')
        .get('/data/2.5/weather?q=Sofia&apikey=1991b65c2188e5cd2e73063499569612&units=metric')
        .reply(200, { coord: { lon: 123, lat: 123 } });
      nock('https://api.openweathermap.org')
        // eslint-disable-next-line max-len
        .get('/data/2.5/onecall?lat=123&lon=123&exclude=hourly,minutely&apikey=1991b65c2188e5cd2e73063499569612&units=metric')
        .reply(200, {great: 'success'});
      const result = await request(server).get('/weather/Sofia').auth(token9999yearsVal, { type: 'bearer' });
      expect(result.body.great).toBe('success');
      expect(result.status).toBe(200);
    });
  });
});

