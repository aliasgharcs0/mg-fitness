/**
 * PostgreSQL connection pool for use with Supabase or any Postgres.
 * Set DATABASE_URL in the environment.
 *
 * On Render: use Supabase "Connection pooling" URI (port 6543), not the direct URI (5432).
 * Direct URI often fails with ENETUNREACH because Render may not reach Supabase over IPv6.
 * Supabase Dashboard → Project Settings → Database → Connection pooling → URI (Transaction).
 */
const { Pool } = require("pg");

// Prefer IPv4 when resolving hostnames (avoids ENETUNREACH on Render when Supabase resolves to IPv6).
if (require("dns").setDefaultResultOrder) {
  require("dns").setDefaultResultOrder("ipv4first");
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

module.exports = pool;
