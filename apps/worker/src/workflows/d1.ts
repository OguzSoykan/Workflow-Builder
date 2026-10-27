// Minimal D1 surface used by the repository (avoids a workers-types dependency).
export interface D1Result<T = Record<string, unknown>> {
  results: T[];
  meta: { changes: number };
}
export interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  first<T = Record<string, unknown>>(): Promise<T | null>;
  all<T = Record<string, unknown>>(): Promise<D1Result<T>>;
  run(): Promise<D1Result>;
}
export interface D1Database {
  prepare(query: string): D1PreparedStatement;
  /** Runs all statements in one transaction; any failure rolls all of them back. */
  batch(statements: D1PreparedStatement[]): Promise<D1Result[]>;
}
