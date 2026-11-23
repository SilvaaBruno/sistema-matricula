import type { DB } from './db';

/** Dados iniciais: 2 cursos que compartilham disciplinas com classificações diferentes. */
export function seed(db: DB) {
  db.transaction(() => {
    const course = db.prepare('INSERT INTO courses (name, required_mandatory, required_profile, required_free) VALUES (?, ?, ?, ?)');
    const si = Number(course.run('Sistemas de Informação', 180, 120, 60).lastInsertRowid);
    const cc = Number(course.run('Ciência da Computação', 180, 120, 60).lastInsertRowid);

    const disc = db.prepare('INSERT INTO disciplines (code, name, workload) VALUES (?, ?, ?)');
    const d: Record<string, number> = {};
    for (const [code, name, ch] of [
      ['IF668', 'Introdução à Programação', 60],
      ['IF669', 'Algoritmos e Estruturas de Dados', 60],
      ['IF673', 'Banco de Dados', 60],
      ['IF700', 'Engenharia de Software', 60],
      ['IF701', 'Redes de Computadores', 60],
      ['IF702', 'Inteligência Artificial', 60],
      ['IF703', 'Computação Gráfica', 60],
      ['MA100', 'Cálculo 1', 60],
      ['HU001', 'Introdução à Filosofia', 30],
    ] as const) d[code] = Number(disc.run(code, name, ch).lastInsertRowid);

    const link = db.prepare('INSERT INTO course_disciplines (course_id, discipline_id, kind) VALUES (?, ?, ?)');
    // Mesma disciplina, classificações diferentes por curso (ex.: IF673 e IF702).
    for (const c of ['IF668', 'IF669', 'IF673']) link.run(si, d[c], 'MANDATORY');
    for (const c of ['IF700', 'IF701', 'IF702']) link.run(si, d[c], 'PROFILE');
    for (const c of ['IF668', 'IF669', 'IF702']) link.run(cc, d[c], 'MANDATORY');
    for (const c of ['IF673', 'IF703']) link.run(cc, d[c], 'PROFILE');

    const prof = db.prepare('INSERT INTO professors (name, email) VALUES (?, ?)');
    const p1 = Number(prof.run('Profa. Maria Souza', 'maria.souza@cin.ufpe.br').lastInsertRowid);
    const p2 = Number(prof.run('Prof. João Lima', 'joao.lima@cin.ufpe.br').lastInsertRowid);

    const cls = db.prepare('INSERT INTO classes (discipline_id, professor_id, capacity) VALUES (?, ?, ?)');
    for (const [code, prof, cap] of [
      ['IF668', p1, 40], ['IF669', p2, 30], ['IF673', p1, 2], ['IF700', p2, 30],
      ['IF701', p1, 30], ['IF702', p2, 30], ['IF703', p1, 30], ['MA100', p2, 50], ['HU001', p1, 50],
    ] as const) cls.run(d[code], prof, cap);

    const user = db.prepare('INSERT INTO users (username, name, role, course_id) VALUES (?, ?, ?, ?)');
    user.run('secretaria', 'Secretaria de Graduação', 'SECRETARY', null);
    const ana = Number(user.run('ana', 'Ana Silva', 'STUDENT', si).lastInsertRowid);
    const bia = Number(user.run('bia', 'Bia Costa', 'STUDENT', si).lastInsertRowid);
    const carlos = Number(user.run('carlos', 'Carlos Rocha', 'STUDENT', cc).lastInsertRowid);
    const dani = Number(user.run('dani', 'Dani Alves', 'STUDENT', cc).lastInsertRowid);

    const hist = db.prepare('INSERT INTO history (student_id, discipline_id, status) VALUES (?, ?, ?)');
    // Ana (SI): perfil excede o exigido (180 > 120), então 60h viram eletiva livre; reprovou em IF673.
    for (const c of ['IF668', 'IF669', 'IF700', 'IF701', 'IF702']) hist.run(ana, d[c], 'APPROVED');
    hist.run(ana, d.IF673, 'FAILED');
    for (const c of ['IF668']) hist.run(bia, d[c], 'APPROVED');
    // Carlos (CC): IF673 é perfil; HU001 é livre; reprovou em IF669.
    for (const c of ['IF668', 'IF673', 'HU001']) hist.run(carlos, d[c], 'APPROVED');
    hist.run(carlos, d.IF669, 'FAILED');
    hist.run(dani, d.IF668, 'APPROVED');
  })();
}
