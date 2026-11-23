import cors from 'cors';
import express, { type ErrorRequestHandler, type Request, Router } from 'express';
import { ZodError, z } from 'zod';
import { login, requireAuth, requireRole, type AuthedRequest } from './auth';
import type { DB } from './db';
import { AppError } from './errors';
import { pageQuery } from './pagination';
import { cancel, enroll, listActiveEnrollments } from './services/enrollments';
import { capacitySchema, classSchema, createClass, listClasses, updateCapacity } from './services/classes';
import { createDiscipline, disciplineSchema, listDisciplines, updateDiscipline } from './services/disciplines';
import { listOffers } from './services/offers';
import { createProfessor, listProfessors, professorSchema } from './services/professors';
import { getProgress } from './services/progress';

const idParam = (req: Request) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) throw new AppError(400, 'VALIDATION_ERROR', 'Id inválido');
  return id;
};
const me = (req: Request) => (req as AuthedRequest).user.id;

export function createApp(db: DB) {
  const app = express();
  app.use(cors());
  app.use(express.json());

  app.post('/auth/login', (req, res) => {
    const { username } = z.object({ username: z.string().trim().min(1) }).parse(req.body);
    res.json(login(db, username));
  });

  const guarded = (role: 'SECRETARY' | 'STUDENT') => {
    const r = Router();
    r.use(requireAuth, requireRole(role));
    return r;
  };

  // ---- Secretaria ----
  const disciplines = guarded('SECRETARY');
  disciplines.get('/', (req, res) => {
    const q = pageQuery.parse(req.query);
    res.json(listDisciplines(db, q.page, q.pageSize, q.search));
  });
  disciplines.post('/', (req, res) => {
    res.status(201).json(createDiscipline(db, disciplineSchema.parse(req.body)));
  });
  disciplines.put('/:id', (req, res) => {
    res.json(updateDiscipline(db, idParam(req), disciplineSchema.parse(req.body)));
  });
  app.use('/disciplines', disciplines);

  const professors = guarded('SECRETARY');
  professors.get('/', (req, res) => {
    const q = pageQuery.parse(req.query);
    res.json(listProfessors(db, q.page, q.pageSize, q.search));
  });
  professors.post('/', (req, res) => {
    res.status(201).json(createProfessor(db, professorSchema.parse(req.body)));
  });
  app.use('/professors', professors);

  const classes = guarded('SECRETARY');
  classes.get('/', (req, res) => {
    const q = pageQuery.parse(req.query);
    res.json(listClasses(db, q.page, q.pageSize));
  });
  classes.post('/', (req, res) => {
    res.status(201).json(createClass(db, classSchema.parse(req.body)));
  });
  classes.patch('/:id', (req, res) => {
    res.json(updateCapacity(db, idParam(req), capacitySchema.parse(req.body).capacity));
  });
  app.use('/classes', classes);

  // ---- Aluno (sempre escopado pelo id do token: regra 9) ----
  const offers = guarded('STUDENT');
  offers.get('/', (req, res) => {
    const q = pageQuery.parse(req.query);
    res.json(listOffers(db, me(req), q.page, q.pageSize, q.search));
  });
  app.use('/offers', offers);

  const enrollments = guarded('STUDENT');
  enrollments.get('/', (req, res) => res.json(listActiveEnrollments(db, me(req))));
  enrollments.post('/', (req, res) => {
    const { classId } = z.object({ classId: z.number().int().positive() }).parse(req.body);
    res.status(201).json(enroll(db, me(req), classId));
  });
  enrollments.delete('/:id', (req, res) => {
    cancel(db, me(req), idParam(req));
    res.status(204).end();
  });
  app.use('/enrollments', enrollments);

  const progress = guarded('STUDENT');
  progress.get('/', (req, res) => res.json(getProgress(db, me(req))));
  app.use('/progress', progress);

  const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
    if (err instanceof AppError) {
      res.status(err.status).json({ error: { code: err.code, message: err.message, details: err.details } });
    } else if (err instanceof ZodError) {
      res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: err.issues[0]?.message ?? 'Dados inválidos',
          details: err.issues.map((i) => ({ field: i.path.join('.'), message: i.message })),
        },
      });
    } else if (err instanceof SyntaxError) {
      res.status(400).json({ error: { code: 'INVALID_JSON', message: 'JSON inválido' } });
    } else {
      console.error(err);
      res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Erro interno do servidor' } });
    }
  };
  app.use(errorHandler);
  return app;
}
