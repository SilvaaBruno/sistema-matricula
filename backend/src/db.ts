import Database from 'better-sqlite3';

export type DB = Database.Database;

const SCHEMA = `
CREATE TABLE IF NOT EXISTS courses (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  required_mandatory INTEGER NOT NULL,
  required_profile INTEGER NOT NULL,
  required_free INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS disciplines (
  id INTEGER PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  workload INTEGER NOT NULL CHECK (workload BETWEEN 15 AND 120 AND workload % 15 = 0)
);
CREATE TABLE IF NOT EXISTS course_disciplines (
  course_id INTEGER NOT NULL REFERENCES courses(id),
  discipline_id INTEGER NOT NULL REFERENCES disciplines(id),
  kind TEXT NOT NULL CHECK (kind IN ('MANDATORY', 'PROFILE')),
  PRIMARY KEY (course_id, discipline_id)
);
CREATE TABLE IF NOT EXISTS professors (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE
);
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('SECRETARY', 'STUDENT')),
  course_id INTEGER REFERENCES courses(id)
);
CREATE TABLE IF NOT EXISTS classes (
  id INTEGER PRIMARY KEY,
  discipline_id INTEGER NOT NULL REFERENCES disciplines(id),
  professor_id INTEGER NOT NULL REFERENCES professors(id),
  capacity INTEGER NOT NULL CHECK (capacity >= 1)
);
CREATE TABLE IF NOT EXISTS enrollments (
  id INTEGER PRIMARY KEY,
  student_id INTEGER NOT NULL REFERENCES users(id),
  class_id INTEGER NOT NULL REFERENCES classes(id),
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'CANCELLED')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS history (
  id INTEGER PRIMARY KEY,
  student_id INTEGER NOT NULL REFERENCES users(id),
  discipline_id INTEGER NOT NULL REFERENCES disciplines(id),
  status TEXT NOT NULL CHECK (status IN ('APPROVED', 'FAILED'))
);
`;

export function createDb(file: string = process.env.DB_FILE ?? 'matricula.db'): DB {
  const db = new Database(file);
  db.pragma('foreign_keys = ON');
  db.exec(SCHEMA);
  return db;
}
