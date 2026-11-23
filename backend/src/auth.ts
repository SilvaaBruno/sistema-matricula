import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import type { DB } from './db';
import { AppError } from './errors';

const SECRET = process.env.JWT_SECRET ?? 'dev-secret-troque-em-producao';

export type Role = 'SECRETARY' | 'STUDENT';
export interface AuthUser { id: number; role: Role }
export type AuthedRequest = Request & { user: AuthUser };

export function login(db: DB, username: string) {
  const user = db
    .prepare('SELECT id, username, name, role, course_id AS courseId FROM users WHERE username = ?')
    .get(username) as { id: number; username: string; name: string; role: Role; courseId: number | null } | undefined;
  if (!user) throw new AppError(401, 'INVALID_CREDENTIALS', 'Usuário não encontrado');
  const token = jwt.sign({ id: user.id, role: user.role }, SECRET, { expiresIn: '8h' });
  return { token, user };
}

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) throw new AppError(401, 'UNAUTHENTICATED', 'Sessão ausente ou expirada');
  try {
    const payload = jwt.verify(header.slice(7), SECRET) as AuthUser;
    (req as AuthedRequest).user = { id: payload.id, role: payload.role };
    next();
  } catch {
    throw new AppError(401, 'UNAUTHENTICATED', 'Sessão ausente ou expirada');
  }
}

export const requireRole = (role: Role) => (req: Request, _res: Response, next: NextFunction) => {
  if ((req as AuthedRequest).user.role !== role) {
    throw new AppError(403, 'FORBIDDEN', 'Você não tem acesso a este recurso');
  }
  next();
};
