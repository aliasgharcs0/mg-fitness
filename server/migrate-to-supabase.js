/**
 * One-time migration: copy data from SQLite (mg_fitness.db) to Supabase (PostgreSQL).
 *
 * Prerequisites:
 * 1. In Supabase Dashboard → SQL Editor, run the contents of ../supabase/schema.sql
 * 2. Get your Supabase database connection string: Project Settings → Database → Connection string (URI)
 * 3. Set DATABASE_URL in the environment, e.g.:
 *    export DATABASE_URL="postgresql://postgres.[ref]:[YOUR-PASSWORD]@aws-0-[region].pooler.supabase.com:6543/postgres"
 *
 * Run: node migrate-to-supabase.js
 */
const path = require("path");
const Database = require("better-sqlite3");
const { Pool } = require("pg");

const dbPath = path.join(__dirname, "mg_fitness.db");
if (!process.env.DATABASE_URL) {
  console.error("Set DATABASE_URL to your Supabase connection string (Settings → Database).");
  process.exit(1);
}

const sqlite = new Database(dbPath, { readonly: true });
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

function sqliteAll(table) {
  return sqlite.prepare(`SELECT * FROM ${table}`).all();
}

async function pgRun(query, params = []) {
  const client = await pool.connect();
  try {
    await client.query(query, params);
  } finally {
    client.release();
  }
}

async function resetSequences(client) {
  for (const table of ["members", "programs", "diet_plans", "payments"]) {
    const r = await client.query(`SELECT COALESCE(MAX(id), 1) AS max_id FROM ${table}`);
    const maxId = r.rows[0]?.max_id ?? 1;
    await client.query(`SELECT setval(pg_get_serial_sequence($1, 'id'), $2)`, [table, maxId]);
  }
}

async function migrate() {
  console.log("Reading from SQLite:", dbPath);

  const programs = sqliteAll("programs");
  const dietPlans = sqliteAll("diet_plans");
  const members = sqliteAll("members");
  const sessions = sqliteAll("sessions");
  const payments = sqliteAll("payments");

  console.log("Found:", { programs: programs.length, dietPlans: dietPlans.length, members: members.length, sessions: sessions.length, payments: payments.length });

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    await client.query("DELETE FROM payments");
    await client.query("DELETE FROM sessions");
    await client.query("DELETE FROM members");
    await client.query("DELETE FROM diet_plans");
    await client.query("DELETE FROM programs");

    for (const row of programs) {
      await client.query(
        `INSERT INTO programs (id, name, type, level, duration_weeks, sessions_per_week)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (id) DO NOTHING`,
        [row.id, row.name ?? "", row.type ?? null, row.level ?? null, row.duration_weeks ?? 0, row.sessions_per_week ?? 0],
      );
    }
    console.log("Inserted programs:", programs.length);

    for (const row of dietPlans) {
      await client.query(
        `INSERT INTO diet_plans (id, name, goal, calories, notes, medical, early_morning_remedy, breakfast, snack_1, lunch, snack_2, dinner, snack_3)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
         ON CONFLICT (id) DO NOTHING`,
        [
          row.id, row.name ?? "", row.goal ?? null, row.calories ?? 0, row.notes ?? "",
          row.medical ?? "", row.early_morning_remedy ?? "", row.breakfast ?? "", row.snack_1 ?? "",
          row.lunch ?? "", row.snack_2 ?? "", row.dinner ?? "", row.snack_3 ?? "",
        ],
      );
    }
    console.log("Inserted diet_plans:", dietPlans.length);

    for (const row of members) {
      await client.query(
        `INSERT INTO members (id, username, role, name, email, phone, height_cm, weight_kg, trainer, membership, status, start_date, renew_date, injury_history, medical_notes, balance, total_paid, password_hash, diet_plan_id, payment_day, last_billed_month, fees)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)
         ON CONFLICT (id) DO NOTHING`,
        [
          row.id, row.username ?? null, row.role ?? "member", row.name ?? "", row.email ?? null, row.phone ?? null,
          row.height_cm ?? null, row.weight_kg ?? null, row.trainer ?? null, row.membership ?? null, row.status ?? null,
          row.start_date ?? null, row.renew_date ?? null, row.injury_history ?? null, row.medical_notes ?? null,
          row.balance ?? 0, row.total_paid ?? 0, row.password_hash ?? null, row.diet_plan_id ?? null,
          row.payment_day ?? 1, row.last_billed_month ?? null, row.fees ?? 0,
        ],
      );
    }
    console.log("Inserted members:", members.length);

    for (const row of sessions) {
      await client.query(
        `INSERT INTO sessions (token, member_id, created_at) VALUES ($1, $2, $3) ON CONFLICT (token) DO NOTHING`,
        [row.token, row.member_id, row.created_at ?? new Date().toISOString()],
      );
    }
    console.log("Inserted sessions:", sessions.length);

    for (const row of payments) {
      await client.query(
        `INSERT INTO payments (id, member_id, date, amount, method, type, note) VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT (id) DO NOTHING`,
        [row.id, row.member_id, row.date ?? null, row.amount ?? 0, row.method ?? null, row.type ?? null, row.note ?? null],
      );
    }
    console.log("Inserted payments:", payments.length);

    await resetSequences(client);
    await client.query("COMMIT");
    console.log("Migration complete.");
  } catch (e) {
    await client.query("ROLLBACK");
    console.error("Migration failed:", e.message);
    process.exit(1);
  } finally {
    client.release();
    sqlite.close();
    pool.end();
  }
}

migrate();
