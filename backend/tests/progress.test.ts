import { describe, expect, it } from 'vitest';
import { setup } from './helpers';

describe('Progresso no curso', () => {
  it('regras 11 e 13: excedente de perfil vira livre; percentual limitado a 100% e falta nunca negativa', async () => {
    const { as } = setup();
    const { body } = await (await as('ana')).get('/progress');
    // Ana tem 180h de perfil aprovadas, exigido 120h: 120 perfil + 60 livres
    expect(body.profile).toMatchObject({ required: 120, completed: 120, remaining: 0, percent: 100 });
    expect(body.free).toMatchObject({ required: 60, completed: 60, remaining: 0, percent: 100 });
    expect(body.mandatory).toMatchObject({ required: 180, completed: 120, remaining: 60, percent: 67 });
  });

  it('regra 12: reprovação não conta; matrícula ativa aparece como CH em curso', async () => {
    const { as, classOf } = setup();
    const carlos = await as('carlos');
    let p = (await carlos.get('/progress')).body;
    expect(p.mandatory.completed).toBe(60); // só IF668; IF669 reprovada não conta
    expect(p.mandatory.inProgress).toBe(0);
    await carlos.post('/enrollments', { classId: classOf('IF669') });
    p = (await carlos.get('/progress')).body;
    expect(p.mandatory.completed).toBe(60);
    expect(p.mandatory.inProgress).toBe(60);
    expect(p.profile.completed).toBe(60); // IF673 é perfil em CC
    expect(p.free.completed).toBe(30); // HU001
  });

  it('o progresso é calculado conforme o curso do aluno', async () => {
    const { as } = setup();
    const ana = (await (await as('ana')).get('/progress')).body;
    const carlos = (await (await as('carlos')).get('/progress')).body;
    expect(ana.mandatory.completed).not.toBe(carlos.mandatory.completed);
  });
});
