import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { migrateDatabase } from './migrations';
import { seedBaselineData } from './seed';

export function initializeDatabase(dbPath: string): Database.Database {
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  const db = new Database(dbPath);

  migrateDatabase(db);
  seedBaselineData(db);

  return db;
}
