import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { setup } from './helpers';

describe('Ofertas do aluno', () => {
  it('sem token retorna 401', async () => {
    const { app } = setup();
    const res = await request(app).get('/offers');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHENTICATED');
  });

  it('secretaria não acessa a área do aluno', async () => {
    const { as } = setup();
    expect((await (await as('secretaria')).get('/offers')).status).toBe(403);
  });

  it('busca, paginação e vagas disponíveis', async () => {
    const { as } = setup();
    const bia = await as('bia');
    const page = await bia.get('/offers?pageSize=3&page=2');
    expect(page.body.data).toHaveLength(3);
    expect(page.body.total).toBe(9);
    const busca = await bia.get('/offers?search=banco');
    expect(busca.body.data.map((o: any) => o.disciplineCode)).toEqual(['IF673']);
    expect(busca.body.data[0].availableSeats).toBe(2);
    expect((await bia.get('/offers?search=zzzz')).body.data).toEqual([]);
  });

  it('regra 10: a mesma disciplina é classificada conforme o curso do aluno', async () => {
    const { as } = setup();
    const kind = async (user: string, code: string) =>
      ((await (await as(user)).get(`/offers?search=${code}`)).body.data[0].kind as string);
    expect(await kind('ana', 'IF702')).toBe('PROFILE'); // SI
    expect(await kind('carlos', 'IF702')).toBe('MANDATORY'); // CC
    expect(await kind('ana', 'IF673')).toBe('MANDATORY');
    expect(await kind('carlos', 'IF673')).toBe('PROFILE');
    expect(await kind('ana', 'HU001')).toBe('FREE');
  });
});
