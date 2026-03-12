/**
 * PostgreSQL connection pool for use with Supabase or any Postgres.
 * Set DATABASE_URL in the environment (e.g. Supabase → Settings → Database → Connection string).
 */
const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL
    ? { rejectUnauthorized: false }
    : undefined,
});

module.exports = pool;
