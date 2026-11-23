import { existsSync } from 'node:fs';
import { createApp } from './app';
import { createDb } from './db';
import { seed } from './seed';

const file = process.env.DB_FILE ?? 'matricula.db';
const fresh = !existsSync(file);
const db = createDb(file);
if (fresh) seed(db);

const port = Number(process.env.PORT ?? 3333);
createApp(db).listen(port, () => console.log(`API em http://localhost:${port}`));
