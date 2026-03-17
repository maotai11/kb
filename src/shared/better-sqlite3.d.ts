declare module 'better-sqlite3' {
  type BindParameters = unknown[] | Record<string, unknown>;

  interface RunResult {
    changes: number;
    lastInsertRowid: number | bigint;
  }

  interface Statement<Result = unknown> {
    run(params?: BindParameters | unknown): RunResult;
    get(...params: unknown[]): Result | undefined;
    all(...params: unknown[]): Result[];
  }

  interface Transaction<F extends (...args: never[]) => unknown> {
    (...args: Parameters<F>): ReturnType<F>;
  }

  class Database {
    constructor(filename: string);
    exec(sql: string): this;
    prepare<Result = unknown>(sql: string): Statement<Result>;
    transaction<F extends (...args: never[]) => unknown>(fn: F): Transaction<F>;
    close(): void;
  }

  namespace Database {
    export { Database };
  }

  export = Database;
}
