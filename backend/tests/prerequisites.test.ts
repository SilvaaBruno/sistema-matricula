import { describe, expect, it } from 'vitest';
import { setup } from './helpers';

// Seed: IF669 exige IF668; IF700 e IF703 exigem IF669.
// Bia só foi aprovada em IF668; Carlos foi reprovado em IF669; Ana foi aprovada em IF669.
describe('Pré-requisitos entre disciplinas', () => {
  it('a oferta informa os pré-requisitos e o que falta para o aluno', async () => {
    const { as } = setup();
    const oferta = (await (await as('bia')).get('/offers?search=IF700')).body.data[0];
    expect(oferta.prerequisites).toEqual(['IF669']);
    expect(oferta.missingPrerequisites).toEqual(['IF669']);
    const ok = (await (await as('bia')).get('/offers?search=IF669')).body.data[0];
    expect(ok.missingPrerequisites).toEqual([]);
  });

  it('recusa a matrícula sem aprovação no pré-requisito', async () => {
    const { as, classOf } = setup();
    const res = await (await as('bia')).post('/enrollments', { classId: classOf('IF700') });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('PREREQUISITE_NOT_MET');
    expect(res.body.error.details).toEqual({ missing: ['IF669'] });
  });

  it('matrícula ativa no pré-requisito não substitui a aprovação', async () => {
    const { as, classOf } = setup();
    const bia = await as('bia');
    expect((await bia.post('/enrollments', { classId: classOf('IF669') })).status).toBe(201);
    expect((await bia.post('/enrollments', { classId: classOf('IF700') })).body.error.code).toBe('PREREQUISITE_NOT_MET');
  });

  it('reprovação no pré-requisito também não satisfaz', async () => {
    const { as, classOf } = setup();
    const res = await (await as('carlos')).post('/enrollments', { classId: classOf('IF703') });
    expect(res.body.error.code).toBe('PREREQUISITE_NOT_MET');
  });

  it('aprovado no pré-requisito consegue se matricular', async () => {
    const { as, classOf } = setup();
    expect((await (await as('ana')).post('/enrollments', { classId: classOf('IF703') })).status).toBe(201);
  });

  it('secretaria define os pré-requisitos ao cadastrar e ao editar (PUT substitui a lista)', async () => {
    const { as, id } = setup();
    const sec = await as('secretaria');
    const ma100 = id('disciplines', 'code', 'MA100');
    const ma200 = (await sec.post('/disciplines', { code: 'MA200', name: 'Cálculo 2', workload: 60, prerequisiteIds: [ma100] })).body;
    expect(ma200.prerequisites).toMatchObject([{ code: 'MA100' }]);
    const editada = await sec.put(`/disciplines/${ma200.id}`, { code: 'MA200', name: 'Cálculo 2', workload: 60, prerequisiteIds: [] });
    expect(editada.body.prerequisites).toEqual([]);
    const lista = (await sec.get('/disciplines?search=IF700')).body.data[0];
    expect(lista.prerequisites).toMatchObject([{ code: 'IF669' }]);
  });

  it('recusa pré-requisito inexistente, a própria disciplina e ciclos', async () => {
    const { as, id } = setup();
    const sec = await as('secretaria');
    const if669 = id('disciplines', 'code', 'IF669');
    const if700 = id('disciplines', 'code', 'IF700');
    const base = { code: 'IF669', name: 'Algoritmos e Estruturas de Dados', workload: 60 };
    expect((await sec.put(`/disciplines/${if669}`, { ...base, prerequisiteIds: [9999] })).status).toBe(404);
    expect((await sec.put(`/disciplines/${if669}`, { ...base, prerequisiteIds: [if669] })).status).toBe(400);
    const ciclo = await sec.put(`/disciplines/${if669}`, { ...base, prerequisiteIds: [if700] }); // IF700 já exige IF669
    expect(ciclo.status).toBe(409);
    expect(ciclo.body.error.code).toBe('PREREQUISITE_CYCLE');
  });

  it('uma edição recusada não altera os pré-requisitos existentes (transação)', async () => {
    const { as, id } = setup();
    const sec = await as('secretaria');
    const if669 = id('disciplines', 'code', 'IF669');
    await sec.put(`/disciplines/${if669}`, { code: 'IF669', name: 'X', workload: 60, prerequisiteIds: [9999] });
    const atual = (await sec.get('/disciplines?search=IF669')).body.data[0];
    expect(atual.name).toBe('Algoritmos e Estruturas de Dados');
    expect(atual.prerequisites).toMatchObject([{ code: 'IF668' }]);
  });
});
