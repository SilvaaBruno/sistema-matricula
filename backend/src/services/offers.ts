import type { DB } from '../db';
import { likePattern, type Page } from '../pagination';
import { classify, getStudent } from './classification';

/** Ofertas do semestre para o aluno, com a classificação da disciplina no curso dele. */
export function listOffers(db: DB, studentId: number, page: number, pageSize: number, search?: string): Page<unknown> {
  const { courseId } = getStudent(db, studentId);
  const like = likePattern(search);
  const where = 'WHERE d.code LIKE ? OR d.name LIKE ? OR p.name LIKE ?';
  const from = `FROM classes c JOIN disciplines d ON d.id = c.discipline_id JOIN professors p ON p.id = c.professor_id`;
  const total = (db.prepare(`SELECT COUNT(*) AS n ${from} ${where}`).get(like, like, like) as { n: number }).n;
  const rows = db
    .prepare(
      `SELECT c.id, c.capacity, d.id AS disciplineId, d.code AS disciplineCode, d.name AS disciplineName,
              d.workload, p.name AS professorName,
              (SELECT COUNT(*) FROM enrollments e WHERE e.class_id = c.id AND e.status = 'ACTIVE') AS occupied,
              EXISTS (SELECT 1 FROM enrollments e WHERE e.class_id = c.id AND e.student_id = ? AND e.status = 'ACTIVE') AS enrolled,
              EXISTS (SELECT 1 FROM history h WHERE h.student_id = ? AND h.discipline_id = d.id AND h.status = 'APPROVED') AS approved
       ${from} ${where} ORDER BY d.code, c.id LIMIT ? OFFSET ?`,
    )
    .all(studentId, studentId, like, like, like, pageSize, (page - 1) * pageSize) as any[];
  const data = rows.map((r) => ({
    id: r.id,
    disciplineCode: r.disciplineCode,
    disciplineName: r.disciplineName,
    workload: r.workload,
    professorName: r.professorName,
    capacity: r.capacity,
    availableSeats: r.capacity - r.occupied,
    kind: classify(db, courseId, r.disciplineId),
    enrolled: !!r.enrolled,
    approved: !!r.approved,
  }));
  return { data, page, pageSize, total };
}
