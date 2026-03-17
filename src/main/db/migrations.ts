import type Database from 'better-sqlite3';

type Migration = {
  version: number;
  sql: string;
};

const migrations: Migration[] = [
  {
    version: 1,
    sql: `
      CREATE TABLE schema_version (
        version INTEGER NOT NULL PRIMARY KEY,
        applied_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
      );

      CREATE TABLE yearly_params (
        id                    INTEGER PRIMARY KEY AUTOINCREMENT,
        fiscal_year           INTEGER NOT NULL,
        category              TEXT NOT NULL,
        param_key             TEXT NOT NULL,
        param_value           REAL,
        param_text            TEXT,
        unit                  TEXT,
        source_law            TEXT,
        official_announcement TEXT,
        announcement_date     TEXT,
        is_confirmed          INTEGER NOT NULL DEFAULT 0,
        usage_context         TEXT NOT NULL CHECK (usage_context IN ('income_year', 'effective_year')),
        filing_year           INTEGER,
        effective_date        TEXT,
        note                  TEXT,
        updated_at            TEXT NOT NULL DEFAULT (datetime('now','localtime')),
        updated_by            TEXT,
        UNIQUE(fiscal_year, category, param_key, usage_context)
      );

      CREATE TABLE grade_tables (
        id             INTEGER PRIMARY KEY AUTOINCREMENT,
        fiscal_year    INTEGER NOT NULL,
        table_type     TEXT NOT NULL,
        usage_context  TEXT NOT NULL CHECK (usage_context IN ('income_year', 'effective_year')),
        version_tag    TEXT NOT NULL,
        effective_date TEXT,
        is_confirmed   INTEGER NOT NULL DEFAULT 0,
        table_json     TEXT NOT NULL,
        updated_at     TEXT NOT NULL DEFAULT (datetime('now','localtime')),
        UNIQUE(fiscal_year, table_type, usage_context)
      );
    `
  },
  {
    version: 2,
    sql: `
      CREATE TABLE calc_history (
        calc_id          INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id          INTEGER,
        client_id        INTEGER,
        calculator       TEXT NOT NULL,
        fiscal_year      INTEGER,
        inputs           TEXT NOT NULL,
        outputs          TEXT NOT NULL,
        params_snapshot  TEXT,
        grade_snapshot   TEXT,
        created_at       TEXT NOT NULL DEFAULT (datetime('now','localtime')),
        notes            TEXT,
        is_bookmarked    INTEGER NOT NULL DEFAULT 0
      );
    `
  },
  {
    version: 3,
    sql: `
      CREATE TABLE holidays (
        id           INTEGER PRIMARY KEY AUTOINCREMENT,
        holiday_date TEXT UNIQUE NOT NULL,
        name         TEXT,
        year         INTEGER,
        is_makeup    INTEGER NOT NULL DEFAULT 0
      );
    `
  },
  {
    version: 4,
    sql: `
      CREATE TABLE company_registry (
        rowid INTEGER PRIMARY KEY AUTOINCREMENT,
        tax_id TEXT NOT NULL,
        company_name TEXT NOT NULL,
        status TEXT,
        representative TEXT,
        address TEXT,
        capital INTEGER
      );

      CREATE VIRTUAL TABLE company_registry_fts USING fts5(
        tax_id,
        company_name,
        content=company_registry,
        content_rowid=rowid
      );

      CREATE TRIGGER company_registry_ai AFTER INSERT ON company_registry BEGIN
        INSERT INTO company_registry_fts(rowid, tax_id, company_name)
        VALUES (new.rowid, new.tax_id, new.company_name);
      END;

      CREATE TRIGGER company_registry_ad AFTER DELETE ON company_registry BEGIN
        DELETE FROM company_registry_fts WHERE rowid = old.rowid;
      END;

      CREATE TRIGGER company_registry_au AFTER UPDATE ON company_registry BEGIN
        UPDATE company_registry_fts
        SET tax_id = new.tax_id, company_name = new.company_name
        WHERE rowid = old.rowid;
      END;
    `
  },
  {
    version: 5,
    sql: `
      CREATE TABLE law_cards (
        card_id INTEGER PRIMARY KEY AUTOINCREMENT,
        law_name TEXT NOT NULL,
        article TEXT,
        category TEXT NOT NULL,
        summary TEXT,
        content TEXT,
        search_keywords TEXT,
        is_active INTEGER NOT NULL DEFAULT 1,
        superseded_by INTEGER,
        created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
      );
    `
  },
  {
    version: 6,
    sql: `
      CREATE TABLE audit_log (
        log_id INTEGER PRIMARY KEY AUTOINCREMENT,
        source TEXT NOT NULL,
        event TEXT NOT NULL,
        detail TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
      );
    `
  },
  {
    version: 7,
    sql: `
      CREATE TABLE clients (
        client_id INTEGER PRIMARY KEY AUTOINCREMENT,
        tax_id TEXT NOT NULL,
        client_name TEXT NOT NULL,
        client_type TEXT,
        fiscal_year_end TEXT,
        notes TEXT,
        is_active INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
      );
    `
  },
  {
    version: 8,
    sql: `
      CREATE TABLE filing_schedules (
        schedule_id      INTEGER PRIMARY KEY AUTOINCREMENT,
        client_id        INTEGER,
        calculator       TEXT NOT NULL,
        raw_deadline     TEXT NOT NULL,
        adjusted_deadline TEXT,
        notes            TEXT,
        is_done          INTEGER NOT NULL DEFAULT 0,
        created_at       TEXT NOT NULL DEFAULT (datetime('now','localtime'))
      );
    `
  }
];

function getCurrentVersion(db: Database): number {
  const versionTable = db
    .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='schema_version'")
    .get() as { name: string } | undefined;

  if (!versionTable) {
    return 0;
  }

  const row = db.prepare('SELECT MAX(version) AS version FROM schema_version').get() as {
    version: number | null;
  };

  return row.version ?? 0;
}

export function migrateDatabase(db: Database): void {
  const currentVersion = getCurrentVersion(db);
  const pending = migrations.filter((migration) => migration.version > currentVersion);

  const applyMigrations = db.transaction(() => {
    for (const migration of pending) {
      db.exec(migration.sql);
      db.prepare('INSERT INTO schema_version (version) VALUES (?)').run(migration.version);
    }
  });

  applyMigrations();
}
