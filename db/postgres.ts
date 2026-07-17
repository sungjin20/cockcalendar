import { Pool, type QueryResultRow } from "pg";
import { postgresSchema } from "./schema";

let pool: Pool | undefined;
let schemaReady: Promise<void> | undefined;
export function getPool() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not configured");
  pool ??= new Pool({ connectionString: process.env.DATABASE_URL, max: 5, connectionTimeoutMillis: 5000 });
  return pool;
}
export async function ensurePostgresSchema() {
  if (process.env.DB_AUTO_INIT !== "true") return;
  schemaReady ??= (async () => { await getPool().query(postgresSchema); })();
  return schemaReady;
}
export async function dbQuery<T extends QueryResultRow = any>(text: string, values: unknown[] = []) { await ensurePostgresSchema(); return getPool().query<T>(text, values); }
