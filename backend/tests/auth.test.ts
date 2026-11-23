import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { setup } from './helpers';

describe('Autenticação', () => {
  it('login com usuário existente devolve token e perfil', async () => {
    const { app } = setup();
    const res = await request(app).post('/auth/login').send({ username: 'ana' });
    expect(res.status).toBe(200);
    expect(res.body.token).toEqual(expect.any(String));
    expect(res.body.user).toMatchObject({ username: 'ana', role: 'STUDENT' });
  });

  it('usuário inexistente não loga', async () => {
    const { app } = setup();
    const res = await request(app).post('/auth/login').send({ username: 'fantasma' });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
  });

  it('username vazio é recusado com erro de validação', async () => {
    const { app } = setup();
    const res = await request(app).post('/auth/login').send({ username: '  ' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('JSON malformado responde 400 no formato padrão de erro', async () => {
    const { app } = setup();
    const res = await request(app).post('/auth/login').set('Content-Type', 'application/json').send('{oops');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_JSON');
  });
});
