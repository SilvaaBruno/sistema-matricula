import { describe, expect, it } from 'vitest';
import { setup } from './helpers';

describe('Turmas (secretaria)', () => {
  it('regra 4: turma exige disciplina, professor e ao menos 1 vaga', async () => {
    const { as, id } = setup();
    const sec = await as('secretaria');
    const body = { disciplineId: id('disciplines', 'code', 'MA100'), professorId: 1 };
    expect((await sec.post('/classes', { ...body, capacity: 0 })).status).toBe(400);
    expect((await sec.post('/classes', { ...body, capacity: 1 })).status).toBe(201);
    expect((await sec.post('/classes', { disciplineId: 999, professorId: 1, capacity: 5 })).status).toBe(404);
    expect((await sec.post('/classes', { disciplineId: body.disciplineId, professorId: 999, capacity: 5 })).status).toBe(404);
  });

  it('regra 5: não reduz vagas abaixo do número de matriculados', async () => {
    const { as, classOf } = setup();
    const ana = await as('ana');
    const bia = await as('bia');
    const sec = await as('secretaria');
    const turma = classOf('IF673'); // capacidade 2
    await ana.post('/enrollments', { classId: turma });
    await bia.post('/enrollments', { classId: turma });
    const bad = await sec.patch(`/classes/${turma}`, { capacity: 1 });
    expect(bad.status).toBe(409);
    expect(bad.body.error.code).toBe('CAPACITY_BELOW_ENROLLED');
    expect((await sec.patch(`/classes/${turma}`, { capacity: 2 })).status).toBe(200);
  });

  it('lista turmas com vagas ocupadas e totais', async () => {
    const { as, classOf } = setup();
    await (await as('ana')).post('/enrollments', { classId: classOf('IF673') });
    const res = await (await as('secretaria')).get('/classes?search=&pageSize=100');
    const t = res.body.data.find((c: any) => c.disciplineCode === 'IF673');
    expect(t).toMatchObject({ occupied: 1, capacity: 2 });
  });

  it('um perfil não acessa a área do outro', async () => {
    const { as } = setup();
    expect((await (await as('ana')).get('/classes')).status).toBe(403);
  });
});
