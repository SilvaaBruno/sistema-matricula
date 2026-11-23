import type { DB } from '../db';
import { classify, getStudent } from './classification';

interface Group { required: number; completed: number; inProgress: number; remaining: number; percent: number }

function group(required: number, completed: number, inProgress: number): Group {
  return {
    required,
    completed,
    inProgress,
    remaining: Math.max(0, required - completed), // regra 13
    percent: required === 0 ? 100 : Math.min(100, Math.round((completed / required) * 100)), // regra 13
  };
}

export function getProgress(db: DB, studentId: number) {
  const { courseId } = getStudent(db, studentId);
  const course = db.prepare('SELECT * FROM courses WHERE id = ?').get(courseId) as {
    required_mandatory: number; required_profile: number; required_free: number;
  };

  // Regra 12: só aprovadas contam (cada disciplina uma única vez); matrículas ativas ficam em "em curso".
  const approved = db
    .prepare(`SELECT DISTINCT d.id, d.workload FROM history h JOIN disciplines d ON d.id = h.discipline_id
              WHERE h.student_id = ? AND h.status = 'APPROVED'`)
    .all(studentId) as { id: number; workload: number }[];
  const active = db
    .prepare(`SELECT d.id, d.workload FROM enrollments e JOIN classes c ON c.id = e.class_id
              JOIN disciplines d ON d.id = c.discipline_id WHERE e.student_id = ? AND e.status = 'ACTIVE'`)
    .all(studentId) as { id: number; workload: number }[];

  const sum = (rows: { id: number; workload: number }[]) => {
    const t = { MANDATORY: 0, PROFILE: 0, FREE: 0 };
    for (const r of rows) t[classify(db, courseId, r.id)] += r.workload;
    return t;
  };
  const done = sum(approved);
  const doing = sum(active);

  // Regra 11: o excedente de perfil vira eletiva livre.
  const profileDone = Math.min(done.PROFILE, course.required_profile);
  const overflow = done.PROFILE - profileDone;

  return {
    mandatory: group(course.required_mandatory, done.MANDATORY, doing.MANDATORY),
    profile: group(course.required_profile, profileDone, doing.PROFILE),
    free: group(course.required_free, done.FREE + overflow, doing.FREE),
  };
}
