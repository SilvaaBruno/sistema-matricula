import request from 'supertest';
import { createApp } from '../src/app';
import { createDb } from '../src/db';
import { seed } from '../src/seed';

export function setup() {
  const db = createDb(':memory:');
  seed(db);
  const app = createApp(db);
  const id = (table: string, col: string, val: string) =>
    (db.prepare(`SELECT id FROM ${table} WHERE ${col} = ?`).get(val) as { id: number }).id;
  const classOf = (code: string) =>
    (db.prepare('SELECT c.id FROM classes c JOIN disciplines d ON d.id = c.discipline_id WHERE d.code = ?').get(code) as { id: number }).id;
  const tokenOf = async (username: string) =>
    (await request(app).post('/auth/login').send({ username })).body.token as string;
  const as = async (username: string) => {
    const t = await tokenOf(username);
    return {
      get: (url: string) => request(app).get(url).set('Authorization', `Bearer ${t}`),
      post: (url: string, body?: object) => request(app).post(url).set('Authorization', `Bearer ${t}`).send(body),
      put: (url: string, body?: object) => request(app).put(url).set('Authorization', `Bearer ${t}`).send(body),
      patch: (url: string, body?: object) => request(app).patch(url).set('Authorization', `Bearer ${t}`).send(body),
      del: (url: string) => request(app).delete(url).set('Authorization', `Bearer ${t}`),
    };
  };
  return { db, app, id, classOf, as };
}
