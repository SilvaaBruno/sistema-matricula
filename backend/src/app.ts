import cors from 'cors';
import express, { type ErrorRequestHandler } from 'express';
import { ZodError, z } from 'zod';
import { login } from './auth';
import type { DB } from './db';
import { AppError } from './errors';

export function createApp(db: DB) {
  const app = express();
  app.use(cors());
  app.use(express.json());

  app.post('/auth/login', (req, res) => {
    const { username } = z.object({ username: z.string().trim().min(1) }).parse(req.body);
    res.json(login(db, username));
  });

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
