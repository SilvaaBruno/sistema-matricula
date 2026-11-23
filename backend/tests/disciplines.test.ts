import { describe, expect, it } from 'vitest';
import { setup } from './helpers';

describe('Cadastro de disciplinas (secretaria)', () => {
  it('regra 1: código de disciplina é único', async () => {
    const { as } = setup();
    const sec = await as('secretaria');
    const res = await sec.post('/disciplines', { code: 'if668', name: 'Outra', workload: 60 });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('DISCIPLINE_CODE_TAKEN');
  });

  it.each([0, 10, 50, 135, 150])('regra 2: rejeita CH %i', async (workload) => {
    const { as } = setup();
    const sec = await as('secretaria');
    const res = await sec.post('/disciplines', { code: 'NEW1', name: 'Nova', workload });
    expect(res.status).toBe(400);
  });

  it.each([15, 60, 120])('regra 2: aceita CH %i', async (workload) => {
    const { as } = setup();
    const sec = await as('secretaria');
    const res = await sec.post('/disciplines', { code: 'NEW1', name: 'Nova', workload });
    expect(res.status).toBe(201);
  });

  it('edita uma disciplina sem conflitar com o próprio código', async () => {
    const { as, id } = setup();
    const sec = await as('secretaria');
    const res = await sec.put(`/disciplines/${id('disciplines', 'code', 'MA100')}`, { code: 'MA100', name: 'Cálculo I', workload: 90 });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ code: 'MA100', name: 'Cálculo I', workload: 90 });
  });

  it('lista com busca e paginação', async () => {
    const { as } = setup();
    const sec = await as('secretaria');
    const page = await sec.get('/disciplines?pageSize=4&page=3');
    expect(page.body.data).toHaveLength(1);
    expect(page.body.total).toBe(9);
    expect((await sec.get('/disciplines?search=redes')).body.data).toHaveLength(1);
  });
});
