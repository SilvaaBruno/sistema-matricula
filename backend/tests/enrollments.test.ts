import { describe, expect, it } from 'vitest';
import { setup } from './helpers';

describe('Matrícula do aluno', () => {
  it('regra 6: não matricula em turma lotada', async () => {
    const { as, classOf } = setup();
    const turma = classOf('IF673'); // 2 vagas: ana e bia ocupam; dani tenta entrar
    await (await as('ana')).post('/enrollments', { classId: turma });
    await (await as('bia')).post('/enrollments', { classId: turma });
    const res = await (await as('dani')).post('/enrollments', { classId: turma });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('CLASS_FULL');
  });

  it('regra 7: bloqueia disciplina já aprovada, mas permite repetir reprovada', async () => {
    const { as, classOf } = setup();
    const ana = await as('ana');
    const aprovada = await ana.post('/enrollments', { classId: classOf('IF668') });
    expect(aprovada.status).toBe(409);
    expect(aprovada.body.error.code).toBe('ALREADY_APPROVED');
    const reprovada = await ana.post('/enrollments', { classId: classOf('IF673') });
    expect(reprovada.status).toBe(201);
  });

  it('não permite matricular duas vezes na mesma disciplina', async () => {
    const { as, classOf } = setup();
    const bia = await as('bia');
    await bia.post('/enrollments', { classId: classOf('IF669') });
    const again = await bia.post('/enrollments', { classId: classOf('IF669') });
    expect(again.body.error.code).toBe('ALREADY_ENROLLED');
  });

  it('turma inexistente responde 404 e classId inválido responde 400', async () => {
    const { as } = setup();
    const bia = await as('bia');
    expect((await bia.post('/enrollments', { classId: 9999 })).status).toBe(404);
    expect((await bia.post('/enrollments', { classId: 'x' })).status).toBe(400);
  });

  it('regra 8: cancelar devolve a vaga à turma', async () => {
    const { as, classOf } = setup();
    const bia = await as('bia');
    const turma = classOf('IF673');
    const { body } = await bia.post('/enrollments', { classId: turma });
    expect((await bia.get('/offers?search=IF673')).body.data[0].availableSeats).toBe(1);
    expect((await bia.del(`/enrollments/${body.id}`)).status).toBe(204);
    expect((await bia.get('/offers?search=IF673')).body.data[0].availableSeats).toBe(2);
    expect((await bia.get('/enrollments')).body).toHaveLength(0);
    expect((await bia.del(`/enrollments/${body.id}`)).status).toBe(409);
  });

  it('regra 9: aluno só vê e cancela as próprias matrículas', async () => {
    const { as, classOf } = setup();
    const ana = await as('ana');
    const bia = await as('bia');
    const { body } = await ana.post('/enrollments', { classId: classOf('IF673') });
    expect((await bia.get('/enrollments')).body).toHaveLength(0);
    expect((await bia.del(`/enrollments/${body.id}`)).status).toBe(404);
    expect((await ana.get('/enrollments')).body).toHaveLength(1);
  });
});
