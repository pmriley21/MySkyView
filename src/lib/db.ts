import { neon } from "@neondatabase/serverless";

let sqlClient: ReturnType<typeof neon> | null = null;
let sqlClientUrl: string | null = null;
let schemaPromise: Promise<void> | null = null;

function getDatabaseUrl() {
  const databaseUrl =
    process.env.POSTGRES_URL ||
    process.env.DATABASE_URL ||
    process.env.POSTGRES_PRISMA_URL;

  if (!databaseUrl) {
    throw new Error("DATABASE_URL or POSTGRES_URL is not set");
  }

  return databaseUrl;
}

export function getSql() {
  const databaseUrl = getDatabaseUrl();

  if (!sqlClient || sqlClientUrl !== databaseUrl) {
    sqlClient = neon(databaseUrl);
    sqlClientUrl = databaseUrl;
  }

  return sqlClient;
}

export function unwrapRows<T>(result: unknown): T[] {
  if (Array.isArray(result)) {
    return result as T[];
  }

  const rows = (result as { rows?: T[] } | null)?.rows;
  return Array.isArray(rows) ? rows : [];
}

export async function ensureSchema() {
  if (!schemaPromise) {
    schemaPromise = (async () => {
      const sql = getSql();

      await sql`
        CREATE TABLE IF NOT EXISTS sky_views (
          id uuid PRIMARY KEY,
          title text NOT NULL,
          image_url text NOT NULL,
          latitude double precision NOT NULL,
          longitude double precision NOT NULL,
          captured_at timestamptz,
          created_at timestamptz NOT NULL DEFAULT now()
        );
      `;

      await sql`ALTER TABLE sky_views ADD COLUMN IF NOT EXISTS captured_at timestamptz;`;
      await sql`
        ALTER TABLE sky_views
        ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();
      `;
    })();
  }

  try {
    await schemaPromise;
  } catch (error) {
    schemaPromise = null;
    throw error;
  }
}
