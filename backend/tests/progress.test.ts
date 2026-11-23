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

describe('Excedente de perfil em curso (regra 11)', () => {
  // Abre uma turma de 60h de perfil em SI (IF800) e ajusta a exigência de perfil do curso.
  function setupPerfil(requiredProfile: number) {
    const ctx = setup();
    const si = ctx.id('courses', 'name', 'Sistemas de Informação');
    const disc = Number(ctx.db.prepare("INSERT INTO disciplines (code, name, workload) VALUES ('IF800', 'Tópicos', 60)").run().lastInsertRowid);
    ctx.db.prepare("INSERT INTO course_disciplines (course_id, discipline_id, kind) VALUES (?, ?, 'PROFILE')").run(si, disc);
    ctx.db.prepare('INSERT INTO classes (discipline_id, professor_id, capacity) VALUES (?, 1, 5)').run(disc);
    ctx.db.prepare('UPDATE courses SET required_profile = ? WHERE id = ?').run(requiredProfile, si);
    return ctx;
  }

  it('exigência de perfil já atingida: a CH em curso de perfil vai toda para livres', async () => {
    const { as, classOf } = setupPerfil(120);
    const ana = await as('ana'); // 180h de perfil aprovadas
    await ana.post('/enrollments', { classId: classOf('IF800') });
    const p = (await ana.get('/progress')).body;
    expect(p.profile.inProgress).toBe(0);
    expect(p.free.inProgress).toBe(60);
  });

  it('falta pouco para o perfil: preenche o saldo e o resto vai para livres', async () => {
    const { as, classOf } = setupPerfil(30);
    const bia = await as('bia'); // nenhuma CH de perfil aprovada
    await bia.post('/enrollments', { classId: classOf('IF800') });
    const p = (await bia.get('/progress')).body;
    expect(p.profile.inProgress).toBe(30);
    expect(p.free.inProgress).toBe(30);
  });

  it('sem excedente: toda a CH em curso fica no perfil e nada é duplicado', async () => {
    const { as, classOf } = setupPerfil(120);
    const bia = await as('bia');
    await bia.post('/enrollments', { classId: classOf('IF800') });
    const p = (await bia.get('/progress')).body;
    expect(p.profile.inProgress).toBe(60);
    expect(p.free.inProgress).toBe(0);
    expect(p.profile.inProgress + p.free.inProgress).toBe(60);
  });
});
