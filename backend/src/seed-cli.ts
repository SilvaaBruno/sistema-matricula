import { existsSync, rmSync } from 'node:fs';
import { createDb } from './db';
import { seed } from './seed';

const file = process.env.DB_FILE ?? 'matricula.db';
if (existsSync(file)) rmSync(file);
const db = createDb(file);
seed(db);
console.log(`Banco ${file} criado e populado.`);
