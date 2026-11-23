import { describe, expect, it } from 'vitest';
import { setup } from './helpers';

describe('Cadastro de professores (secretaria)', () => {
  it('regra 3: e-mail de professor é único (sem diferenciar maiúsculas)', async () => {
    const { as } = setup();
    const sec = await as('secretaria');
    const res = await sec.post('/professors', { name: 'Outro', email: 'MARIA.SOUZA@cin.ufpe.br' });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('PROFESSOR_EMAIL_TAKEN');
  });

  it('cadastra professor válido e rejeita e-mail inválido', async () => {
    const { as } = setup();
    const sec = await as('secretaria');
    expect((await sec.post('/professors', { name: 'Novo', email: 'novo@cin.ufpe.br' })).status).toBe(201);
    expect((await sec.post('/professors', { name: 'Ruim', email: 'nao-e-email' })).status).toBe(400);
  });

  it('lista com busca', async () => {
    const { as } = setup();
    const res = await (await as('secretaria')).get('/professors?search=lima');
    expect(res.body.data.map((p: any) => p.name)).toEqual(['Prof. João Lima']);
  });
});
