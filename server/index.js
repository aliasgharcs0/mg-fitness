const path = require("path");
const crypto = require("crypto");
const express = require("express");
const cors = require("cors");
const Database = require("better-sqlite3");

const app = express();
app.use(cors());
app.use(express.json());

const usePg = !!process.env.DATABASE_URL;
let db;
let pool;
if (usePg) {
  pool = require("./db");
} else {
  const dbFile = path.join(__dirname, "mg_fitness.db");
  db = new Database(dbFile);
}

// Helpers so the same code can use SQLite (?) or pg ($1, $2)
function toPg(sql) {
  let n = 0;
  return sql.replace(/\?/g, () => `$${++n}`);
}
async function queryOne(sql, params = []) {
  if (usePg) {
    const r = await pool.query(toPg(sql), params);
    return r.rows[0];
  }
  return db.prepare(sql).get(...params);
}
async function queryAll(sql, params = []) {
  if (usePg) {
    const r = await pool.query(toPg(sql), params);
    return r.rows;
  }
  return db.prepare(sql).all(...params);
}
async function run(sql, params = []) {
  if (usePg) {
    await pool.query(toPg(sql), params);
    return;
  }
  db.prepare(sql).run(...params);
}
async function runReturningId(sql, params = []) {
  if (usePg) {
    const r = await pool.query(toPg(sql) + " RETURNING id", params);
    return r.rows[0]?.id;
  }
  const info = db.prepare(sql).run(...params);
  return info.lastInsertRowid;
}

function hashPassword(password) {
  return crypto.createHash("sha256").update(password).digest("hex");
}

async function ensurePgSchemaAndSeed() {
  const today = new Date().toISOString().slice(0, 10);
  const plus3 = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  await pool.query(
    `INSERT INTO members (username, role, name, password_hash, status, start_date, renew_date, balance, total_paid)
     VALUES ('admin', 'admin', 'Gym Admin', $1, 'active', $2, $3, 0, 0)
     ON CONFLICT (username) DO UPDATE SET password_hash = $1`,
    [hashPassword("123"), today, plus3],
  );
}

if (!usePg) {
  db.exec(`
  CREATE TABLE IF NOT EXISTS members (
    id INTEGER PRIMARY KEY,
    username TEXT UNIQUE,
    role TEXT DEFAULT 'member',
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    height_cm INTEGER,
    weight_kg INTEGER,
    trainer TEXT,
    membership TEXT,
    status TEXT,
    start_date TEXT,
    renew_date TEXT,
    injury_history TEXT,
    medical_notes TEXT,
    balance INTEGER DEFAULT 0,
    total_paid INTEGER DEFAULT 0,
    password_hash TEXT
  );

  CREATE TABLE IF NOT EXISTS sessions (
    token TEXT PRIMARY KEY,
    member_id INTEGER NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (member_id) REFERENCES members(id)
  );

  CREATE TABLE IF NOT EXISTS programs (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT,
    level TEXT,
    duration_weeks INTEGER,
    sessions_per_week INTEGER
  );

  CREATE TABLE IF NOT EXISTS diet_plans (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    goal TEXT,
    calories INTEGER,
    notes TEXT,
    medical TEXT,
    early_morning_remedy TEXT,
    breakfast TEXT,
    snack_1 TEXT,
    lunch TEXT,
    snack_2 TEXT,
    dinner TEXT,
    snack_3 TEXT
  );

  CREATE TABLE IF NOT EXISTS payments (
    id INTEGER PRIMARY KEY,
    member_id INTEGER,
    date TEXT,
    amount INTEGER,
    method TEXT,
    type TEXT,
    note TEXT,
    FOREIGN KEY (member_id) REFERENCES members(id)
  );
`);

function hashPassword(password) {
  return crypto.createHash("sha256").update(password).digest("hex");
}

// Add auth columns if missing (for DBs created before login was added)
const columns = db.prepare("PRAGMA table_info(members)").all().map((c) => c.name);
if (!columns.includes("username")) {
  db.exec("ALTER TABLE members ADD COLUMN username TEXT UNIQUE");
}
if (!columns.includes("role")) {
  db.exec("ALTER TABLE members ADD COLUMN role TEXT DEFAULT 'member'");
}
if (!columns.includes("password_hash")) {
  db.exec("ALTER TABLE members ADD COLUMN password_hash TEXT");
}
if (!columns.includes("diet_plan_id")) {
  db.exec("ALTER TABLE members ADD COLUMN diet_plan_id INTEGER REFERENCES diet_plans(id)");
}
if (!columns.includes("payment_day")) {
  db.exec("ALTER TABLE members ADD COLUMN payment_day INTEGER DEFAULT 1");
}
if (!columns.includes("last_billed_month")) {
  db.exec("ALTER TABLE members ADD COLUMN last_billed_month TEXT");
}
if (!columns.includes("fees")) {
  db.exec("ALTER TABLE members ADD COLUMN fees INTEGER DEFAULT 0");
}

const dietPlanColumns = db.prepare("PRAGMA table_info(diet_plans)").all().map((c) => c.name);
const dietChartCols = ["medical", "early_morning_remedy", "breakfast", "snack_1", "lunch", "snack_2", "dinner", "snack_3"];
dietChartCols.forEach((col) => {
  if (!dietPlanColumns.includes(col)) {
    db.exec(`ALTER TABLE diet_plans ADD COLUMN ${col} TEXT DEFAULT ''`);
  }
});

const countMembers = db.prepare("SELECT COUNT(*) as c FROM members").get().c;

if (countMembers === 0) {
  const insertMember = db.prepare(`
    INSERT INTO members
      (id, username, role, name, email, phone, height_cm, weight_kg, trainer, membership, status, start_date, renew_date, injury_history, medical_notes, balance, total_paid, password_hash)
    VALUES (@id, @username, @role, @name, @email, @phone, @height_cm, @weight_kg, @trainer, @membership, @status, @start_date, @renew_date, @injury_history, @medical_notes, @balance, @total_paid, @password_hash)
  `);

  const seedMembers = [
    {
      id: 1,
      username: "admin",
      role: "admin",
      name: "Gym Admin",
      email: "admin@example.com",
      phone: "+92 300 0000000",
      height_cm: 0,
      weight_kg: 0,
      trainer: "",
      membership: "Custom",
      status: "active",
      start_date: "2026-01-01",
      renew_date: "2026-12-31",
      injury_history: "",
      medical_notes: "",
      balance: 0,
      total_paid: 0,
      password_hash: hashPassword("123"),
    },
    {
      id: 2,
      username: "ali",
      role: "member",
      name: "Ali Raza",
      email: "ali.raza@example.com",
      phone: "+92 300 1234567",
      height_cm: 178,
      weight_kg: 82,
      trainer: "Hamza",
      membership: "Weight Loss",
      status: "active",
      start_date: "2026-01-10",
      renew_date: "2026-04-10",
      injury_history: "Minor lower back strain in 2024. Avoid heavy deadlifts.",
      medical_notes: "Advised to keep heart rate under 160 bpm during HIIT.",
      balance: -3500,
      total_paid: 18500,
      password_hash: hashPassword("member123"),
    },
    {
      id: 3,
      username: "fatima",
      role: "member",
      name: "Fatima Khan",
      email: "fatima.khan@example.com",
      phone: "+92 321 9876543",
      height_cm: 162,
      weight_kg: 58,
      trainer: "Mariam",
      membership: "Weight Gain",
      status: "active",
      start_date: "2026-02-01",
      renew_date: "2026-05-01",
      injury_history: "No major injuries reported.",
      medical_notes: "Lactose intolerant – avoid dairy-based supplements.",
      balance: 0,
      total_paid: 12000,
      password_hash: hashPassword("member123"),
    },
  ];

  const insertProgram = db.prepare(`
    INSERT INTO programs
      (id, name, type, level, duration_weeks, sessions_per_week)
    VALUES (@id, @name, @type, @level, @duration_weeks, @sessions_per_week)
  `);

  const seedPrograms = [
    {
      id: 1,
      name: "12‑Week Fat Loss",
      type: "Weight Loss",
      level: "Intermediate",
      duration_weeks: 12,
      sessions_per_week: 5,
    },
    {
      id: 2,
      name: "Lean Bulk Builder",
      type: "Weight Gain",
      level: "Intermediate",
      duration_weeks: 16,
      sessions_per_week: 4,
    },
    {
      id: 3,
      name: "Athlete Performance Custom",
      type: "Custom",
      level: "Advanced",
      duration_weeks: 10,
      sessions_per_week: 6,
    },
  ];

  const insertDiet = db.prepare(`
    INSERT INTO diet_plans
      (id, name, goal, calories, notes, medical, early_morning_remedy, breakfast, snack_1, lunch, snack_2, dinner, snack_3)
    VALUES (@id, @name, @goal, @calories, @notes, @medical, @early_morning_remedy, @breakfast, @snack_1, @lunch, @snack_2, @dinner, @snack_3)
  `);

  const emptyChart = {
    medical: "",
    early_morning_remedy: "",
    breakfast: "",
    snack_1: "",
    lunch: "",
    snack_2: "",
    dinner: "",
    snack_3: "",
  };
  const seedDiets = [
    { id: 1, name: "Weight Loss – High Protein", goal: "Weight Loss", calories: 1900, notes: "Focus on lean protein, vegetables and controlled carbs.", ...emptyChart },
    { id: 2, name: "Weight Gain – Clean Bulk", goal: "Weight Gain", calories: 2600, notes: "Frequent meals, complex carbs and healthy fats.", ...emptyChart },
    { id: 3, name: "Custom – Athlete", goal: "Custom", calories: 2800, notes: "Periodised carbs around training, recovery focused.", ...emptyChart },
  ];

  const insertPayment = db.prepare(`
    INSERT INTO payments
      (id, member_id, date, amount, method, type, note)
    VALUES (@id, @member_id, @date, @amount, @method, @type, @note)
  `);

  const seedPayments = [
    {
      id: 1,
      member_id: 1,
      date: "2026-03-01",
      amount: 12000,
      method: "Card",
      type: "credit",
      note: "Quarterly membership renewal",
    },
    {
      id: 2,
      member_id: 1,
      date: "2026-02-10",
      amount: 15500,
      method: "Bank",
      type: "debit",
      note: "Previous balance adjustment",
    },
    {
      id: 3,
      member_id: 2,
      date: "2026-02-01",
      amount: 12000,
      method: "Cash",
      type: "credit",
      note: "New membership",
    },
    {
      id: 4,
      member_id: 3,
      date: "2026-03-05",
      amount: 6000,
      method: "Card",
      type: "debit",
      note: "Outstanding dues",
    },
  ];

  const tx = db.transaction(() => {
    seedMembers.forEach((m) => insertMember.run(m));
    seedPrograms.forEach((p) => insertProgram.run(p));
    seedDiets.forEach((d) => insertDiet.run(d));
    seedPayments.forEach((p) => insertPayment.run(p));
  });

  tx();
}

// Guarantee admin exists: update id=1 or insert admin if no row
const adminHash = hashPassword("123");
const adminUpdate = db.prepare("UPDATE members SET username = 'admin', role = 'admin', password_hash = ? WHERE id = 1").run(adminHash);
if (adminUpdate.changes === 0) {
  try {
    db.prepare(
      "INSERT INTO members (id, username, role, name, password_hash, status, start_date, renew_date, balance, total_paid) VALUES (1, 'admin', 'admin', 'Gym Admin', ?, 'active', date('now'), date('now','+1 year'), 0, 0)"
    ).run(adminHash);
  } catch (e) {
    // id=1 might not exist; try updating by any row that could be admin
    db.prepare("UPDATE members SET username = 'admin', role = 'admin', password_hash = ? WHERE id = (SELECT id FROM members LIMIT 1)").run(adminHash);
  }
} else {
  db.prepare("UPDATE members SET password_hash = ? WHERE username = 'admin'").run(adminHash);
}
}

function currentMonthKey() {
  const now = new Date();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  return `${now.getFullYear()}-${m}`;
}

async function applyMonthlyChargeIfDue(memberId) {
  const member = await queryOne("SELECT id, balance, payment_day, last_billed_month FROM members WHERE id = ?", [memberId]);
  if (!member) return;
  const day = Math.max(1, Math.min(30, Number(member.payment_day || 1)));
  const now = new Date();
  const monthKey = currentMonthKey();
  if (String(member.last_billed_month || "") === monthKey) return;
  if (now.getDate() < day) return;
  await run("UPDATE members SET balance = balance + 2000, last_billed_month = ? WHERE id = ?", [monthKey, memberId]);
}

async function createSession(memberId) {
  const token = crypto.randomBytes(24).toString("hex");
  await run("INSERT INTO sessions (token, member_id) VALUES (?, ?)", [token, memberId]);
  return token;
}

function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

async function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization || "";
  const [, token] = authHeader.split(" ");
  if (!token) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  const session = await queryOne(
    "SELECT s.token, m.id, m.username, m.role, m.name FROM sessions s JOIN members m ON m.id = s.member_id WHERE s.token = ?",
    [token],
  );
  if (!session) {
    return res.status(401).json({ error: "Invalid session" });
  }
  req.user = { id: session.id, username: session.username, role: session.role || "member", name: session.name };
  next();
}

function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ error: "Admin only" });
  }
  next();
}

app.post("/api/login", asyncHandler(async (req, res) => {
  const raw = req.body || {};
  const username = String(raw.username || "").trim().toLowerCase();
  const password = String(raw.password || "").trim();
  if (!username || !password) {
    return res.status(400).json({ error: "Username and password are required" });
  }
  const user = await queryOne("SELECT * FROM members WHERE username = ?", [username]);
  const expectedHash = hashPassword(password);
  if (!user || user.password_hash !== expectedHash) {
    return res.status(401).json({ error: "Invalid credentials" });
  }
  const token = await createSession(user.id);
  res.json({
    token,
    user: { id: user.id, username: user.username, role: user.role || "member", name: user.name },
  });
}));

app.post("/api/logout", authMiddleware, asyncHandler(async (req, res) => {
  const authHeader = req.headers.authorization || "";
  const [, token] = authHeader.split(" ");
  if (token) await run("DELETE FROM sessions WHERE token = ?", [token]);
  res.json({ ok: true });
}));

app.get("/api/me", authMiddleware, asyncHandler(async (req, res) => {
  await applyMonthlyChargeIfDue(req.user.id);
  const user = await queryOne("SELECT * FROM members WHERE id = ?", [req.user.id]);
  if (!user) return res.status(404).json({ error: "User not found" });
  res.json(user);
}));

app.patch("/api/me/password", authMiddleware, asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body || {};
  if (!oldPassword || !newPassword) {
    return res.status(400).json({ error: "Old and new password are required" });
  }
  const user = await queryOne("SELECT * FROM members WHERE id = ?", [req.user.id]);
  if (!user || user.password_hash !== hashPassword(oldPassword)) {
    return res.status(401).json({ error: "Old password is incorrect" });
  }
  await run("UPDATE members SET password_hash = ? WHERE id = ?", [hashPassword(newPassword), req.user.id]);
  res.json({ ok: true });
}));

app.get("/api/members", authMiddleware, requireAdmin, asyncHandler(async (_req, res) => {
  const ids = (await queryAll("SELECT id FROM members WHERE role != 'admin'")).map((r) => r.id);
  for (const id of ids) await applyMonthlyChargeIfDue(id);
  const rows = await queryAll("SELECT * FROM members WHERE role != 'admin'");
  res.json(rows);
}));

app.post("/api/members", authMiddleware, requireAdmin, asyncHandler(async (req, res) => {
  const raw = req.body || {};
  const username = String(raw.username || "").trim().toLowerCase();
  const name = String(raw.name || "").trim();
  const email = String(raw.email || "");
  const phone = String(raw.phone || "");
  const role = raw.role || "member";
  const membership = raw.membership || "Custom";
  const trainer = String(raw.trainer || "");
  const password = String(raw.password || "");
  const diet_plan_id = raw.diet_plan_id;
  const fees = raw.fees != null ? Math.max(0, Number(raw.fees) || 0) : 0;
  const startDate = usePg ? new Date().toISOString().slice(0, 10) : undefined;
  const renewDate = usePg ? new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10) : undefined;

  if (!username || !name || !password) {
    return res.status(400).json({ error: "username, name and password are required" });
  }
  try {
    const payDay = raw.payment_day != null ? Math.max(1, Math.min(30, Number(raw.payment_day))) : 1;
    if (usePg) {
      const sql = `INSERT INTO members (username, role, name, email, phone, trainer, membership, diet_plan_id, payment_day, status, start_date, renew_date, balance, total_paid, fees, password_hash)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'active', $10, $11, 0, 0, $12, $13) RETURNING id`;
      const r = await pool.query(sql, [
        username, role, name, email, phone, trainer, membership,
        diet_plan_id != null ? diet_plan_id : null, payDay,
        startDate, renewDate, fees, hashPassword(password),
      ]);
      const id = r.rows[0]?.id;
      const created = await queryOne("SELECT * FROM members WHERE id = ?", [id]);
      return res.status(201).json(created);
    }
    const info = db.prepare(`
      INSERT INTO members (username, role, name, email, phone, trainer, membership, diet_plan_id, payment_day, status, start_date, renew_date, balance, total_paid, fees, password_hash)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', date('now'), date('now','+3 months'), 0, 0, ?, ?)
    `).run(username, role, name, email, phone, trainer, membership, diet_plan_id != null ? diet_plan_id : null, payDay, fees, hashPassword(password));
    const created = db.prepare("SELECT * FROM members WHERE id = ?").get(info.lastInsertRowid);
    res.status(201).json(created);
  } catch (e) {
    if (String(e.message || "").includes("UNIQUE") || String(e.message || "").includes("unique")) {
      return res.status(409).json({ error: "Username already exists" });
    }
    res.status(500).json({ error: "Failed to create member" });
  }
}));

app.patch("/api/members/:id", authMiddleware, requireAdmin, asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const existing = await queryOne("SELECT * FROM members WHERE id = ?", [id]);
  if (!existing) return res.status(404).json({ error: "Member not found" });
  const {
    username, name, email, phone, height_cm, weight_kg, trainer, membership,
    diet_plan_id, payment_day, status, start_date, renew_date, injury_history, medical_notes,
    balance, total_paid, fees, password,
  } = req.body || {};
  const normalizedUsername = username !== undefined ? String(username || "").trim().toLowerCase() : undefined;
  if (normalizedUsername !== undefined && normalizedUsername !== existing.username) {
    const taken = await queryOne("SELECT id FROM members WHERE username = ? AND id != ?", [normalizedUsername, id]);
    if (taken) return res.status(409).json({ error: "Username already in use" });
  }
  const payDay = payment_day !== undefined ? Math.max(1, Math.min(30, Number(payment_day || 1))) : (existing.payment_day ?? 1);
  const feesVal = fees !== undefined ? Math.max(0, Number(fees) || 0) : (existing.fees ?? 0);
  await run(
    `UPDATE members SET username = ?, name = ?, email = ?, phone = ?, height_cm = ?, weight_kg = ?, trainer = ?, membership = ?, diet_plan_id = ?, payment_day = ?, status = ?, start_date = ?, renew_date = ?, injury_history = ?, medical_notes = ?, balance = ?, total_paid = ?, fees = ?, password_hash = ? WHERE id = ?`,
    [
      normalizedUsername !== undefined ? normalizedUsername : existing.username,
      name !== undefined ? name : existing.name,
      email !== undefined ? email : existing.email,
      phone !== undefined ? phone : existing.phone,
      height_cm !== undefined ? height_cm : existing.height_cm,
      weight_kg !== undefined ? weight_kg : existing.weight_kg,
      trainer !== undefined ? trainer : existing.trainer,
      membership !== undefined ? membership : existing.membership,
      diet_plan_id !== undefined ? (diet_plan_id || null) : existing.diet_plan_id,
      payDay, status !== undefined ? status : existing.status,
      start_date !== undefined ? start_date : existing.start_date,
      renew_date !== undefined ? renew_date : existing.renew_date,
      injury_history !== undefined ? injury_history : existing.injury_history,
      medical_notes !== undefined ? medical_notes : existing.medical_notes,
      balance !== undefined ? balance : existing.balance,
      total_paid !== undefined ? total_paid : existing.total_paid,
      feesVal, password ? hashPassword(password) : existing.password_hash, id,
    ],
  );
  const fresh = await queryOne("SELECT * FROM members WHERE id = ?", [id]);
  res.json(fresh);
}));

app.delete("/api/members/:id", authMiddleware, requireAdmin, asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) return res.status(400).json({ error: "Invalid member id" });
  const member = await queryOne("SELECT * FROM members WHERE id = ?", [id]);
  if (!member) return res.status(404).json({ error: "Member not found" });
  if (member.role === "admin") return res.status(403).json({ error: "Cannot remove admin account" });
  await run("DELETE FROM sessions WHERE member_id = ?", [id]);
  await run("DELETE FROM payments WHERE member_id = ?", [id]);
  await run("DELETE FROM members WHERE id = ?", [id]);
  res.json({ ok: true });
}));

app.get("/api/programs", asyncHandler(async (_req, res) => {
  const rows = await queryAll("SELECT * FROM programs");
  res.json(rows);
}));

app.post("/api/programs", authMiddleware, requireAdmin, asyncHandler(async (req, res) => {
  const { name, type, level, duration_weeks, sessions_per_week } = req.body || {};
  if (!name || !type) return res.status(400).json({ error: "name and type are required" });
  try {
    const id = await runReturningId(
      "INSERT INTO programs (name, type, level, duration_weeks, sessions_per_week) VALUES (?, ?, ?, ?, ?)",
      [name, type || "Custom", level || "Beginner", duration_weeks ?? 0, sessions_per_week ?? 0],
    );
    const created = await queryOne("SELECT * FROM programs WHERE id = ?", [id]);
    res.status(201).json(created);
  } catch (e) {
    res.status(500).json({ error: "Failed to create program" });
  }
}));

app.patch("/api/programs/:id", authMiddleware, requireAdmin, asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const existing = await queryOne("SELECT * FROM programs WHERE id = ?", [id]);
  if (!existing) return res.status(404).json({ error: "Program not found" });
  const { name, type, level, duration_weeks, sessions_per_week } = req.body || {};
  await run("UPDATE programs SET name = ?, type = ?, level = ?, duration_weeks = ?, sessions_per_week = ? WHERE id = ?", [
    name ?? existing.name, type ?? existing.type, level ?? existing.level,
    duration_weeks ?? existing.duration_weeks, sessions_per_week ?? existing.sessions_per_week, id,
  ]);
  const fresh = await queryOne("SELECT * FROM programs WHERE id = ?", [id]);
  res.json(fresh);
}));

app.delete("/api/programs/:id", authMiddleware, requireAdmin, asyncHandler(async (req, res) => {
  await run("DELETE FROM programs WHERE id = ?", [Number(req.params.id)]);
  res.json({ ok: true });
}));

const dietPlanCols =
  "id, name, goal, calories, notes, medical, early_morning_remedy, breakfast, snack_1, lunch, snack_2, dinner, snack_3";

app.get("/api/diet-plans", asyncHandler(async (_req, res) => {
  const rows = await queryAll(`SELECT ${dietPlanCols} FROM diet_plans`);
  res.json(rows);
}));

app.post("/api/diet-plans", authMiddleware, requireAdmin, asyncHandler(async (req, res) => {
  const body = req.body || {};
  const name = body.name != null ? String(body.name).trim() : "";
  const goal = body.goal != null ? String(body.goal) : "Custom";
  const calories = Number(body.calories) || 0;
  const notes = body.notes != null ? String(body.notes) : "";
  const medical = body.medical != null ? String(body.medical) : "";
  const early_morning_remedy = body.early_morning_remedy != null ? String(body.early_morning_remedy) : "";
  const breakfast = body.breakfast != null ? String(body.breakfast) : "";
  const snack_1 = body.snack_1 != null ? String(body.snack_1) : "";
  const lunch = body.lunch != null ? String(body.lunch) : "";
  const snack_2 = body.snack_2 != null ? String(body.snack_2) : "";
  const dinner = body.dinner != null ? String(body.dinner) : "";
  const snack_3 = body.snack_3 != null ? String(body.snack_3) : "";
  if (!name || !goal) return res.status(400).json({ error: "name and goal are required" });
  try {
    const id = await runReturningId(
      "INSERT INTO diet_plans (name, goal, calories, notes, medical, early_morning_remedy, breakfast, snack_1, lunch, snack_2, dinner, snack_3) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [name, goal, calories, notes, medical, early_morning_remedy, breakfast, snack_1, lunch, snack_2, dinner, snack_3],
    );
    const created = await queryOne(`SELECT ${dietPlanCols} FROM diet_plans WHERE id = ?`, [id]);
    res.status(201).json(created);
  } catch (e) {
    console.error("POST /api/diet-plans", e);
    res.status(500).json({ error: "Failed to create diet plan" });
  }
}));

app.patch("/api/diet-plans/:id", authMiddleware, requireAdmin, asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const existing = await queryOne(`SELECT ${dietPlanCols} FROM diet_plans WHERE id = ?`, [id]);
  if (!existing) return res.status(404).json({ error: "Diet plan not found" });
  const body = req.body || {};
  const str = (v, fallback) => (v !== undefined && v !== null ? String(v) : (fallback ?? ""));
  await run(
    "UPDATE diet_plans SET name = ?, goal = ?, calories = ?, notes = ?, medical = ?, early_morning_remedy = ?, breakfast = ?, snack_1 = ?, lunch = ?, snack_2 = ?, dinner = ?, snack_3 = ? WHERE id = ?",
    [
      body.name ?? existing.name, body.goal ?? existing.goal, body.calories ?? existing.calories,
      str(body.notes, existing.notes), str(body.medical, existing.medical ?? ""),
      str(body.early_morning_remedy, existing.early_morning_remedy ?? ""),
      str(body.breakfast, existing.breakfast ?? ""), str(body.snack_1, existing.snack_1 ?? ""),
      str(body.lunch, existing.lunch ?? ""), str(body.snack_2, existing.snack_2 ?? ""),
      str(body.dinner, existing.dinner ?? ""), str(body.snack_3, existing.snack_3 ?? ""), id,
    ],
  );
  const fresh = await queryOne(`SELECT ${dietPlanCols} FROM diet_plans WHERE id = ?`, [id]);
  res.json(fresh);
}));

app.delete("/api/diet-plans/:id", authMiddleware, requireAdmin, asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  await run("UPDATE members SET diet_plan_id = NULL WHERE diet_plan_id = ?", [id]);
  await run("DELETE FROM diet_plans WHERE id = ?", [id]);
  res.json({ ok: true });
}));

app.post("/api/payments", authMiddleware, requireAdmin, asyncHandler(async (req, res) => {
  const { member_id, amount, method, type, note, date } = req.body || {};
  if (!member_id || amount == null || !method || !type) {
    return res.status(400).json({ error: "member_id, amount, method and type are required" });
  }
  try {
    const id = await runReturningId(
      "INSERT INTO payments (member_id, date, amount, method, type, note) VALUES (?, ?, ?, ?, ?, ?)",
      [member_id, date || new Date().toISOString().slice(0, 10), amount, method, type, note || ""],
    );
    const created = await queryOne("SELECT * FROM payments WHERE id = ?", [id]);
    res.status(201).json(created);
  } catch (_) {
    res.status(500).json({ error: "Failed to create payment" });
  }
}));

app.get("/api/payments", authMiddleware, asyncHandler(async (req, res) => {
  if (req.user.role === "admin") {
    const rows = await queryAll("SELECT * FROM payments");
    return res.json(rows);
  }
  const rows = await queryAll("SELECT * FROM payments WHERE member_id = ?", [req.user.id]);
  res.json(rows);
}));

const port = process.env.PORT || 4000;

(async function start() {
  if (usePg) {
    try {
      await ensurePgSchemaAndSeed();
    } catch (e) {
      console.error("PostgreSQL init failed. Is DATABASE_URL set and schema created (see supabase/schema.sql)?", e);
      process.exit(1);
    }
  }
  app.listen(port, () => {
    console.log(`MG Fitness API listening on http://localhost:${port}${usePg ? " (PostgreSQL)" : " (SQLite)"}`);
  });
})().catch((e) => {
  console.error(e);
  process.exit(1);
});

