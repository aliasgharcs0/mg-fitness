# Migrate current database to Supabase

Use this to copy your existing SQLite data into your Supabase project (e.g. **aliasgharsc0's Project**).

---

## Step 1: Create tables in Supabase

1. Open your project: **Supabase Dashboard** → your project (e.g. **aliasgharsc0's Project**).
2. Go to **SQL Editor** (left sidebar).
3. Click **New query**.
4. Copy the **entire** contents of **`supabase/schema.sql`** and paste into the editor.
5. Click **Run** (or press Ctrl+Enter). You should see “Success. No rows returned.”
6. In **Table Editor** you should see: `members`, `sessions`, `programs`, `diet_plans`, `payments`.

---

## Step 2: Get your database connection string

1. In the same project, go to **Project Settings** (gear icon in the left sidebar).
2. Open **Database**.
3. Under **Connection string**, choose **URI**.
4. Copy the connection string. It looks like:
   ```text
   postgresql://postgres.[project-ref]:[YOUR-PASSWORD]@aws-0-[region].pooler.supabase.com:6543/postgres
   ```
5. Replace `[YOUR-PASSWORD]` with your **database password** (the one you set when creating the project). If you forgot it, you can reset it on the same page.

---

## Step 3: Run the migration script

From your machine (with the MG Fitness repo and a current **SQLite** database at `server/mg_fitness.db`):

1. **Terminal**, from the project root:
   ```bash
   cd server
   export DATABASE_URL="postgresql://postgres.xxxxx:YOUR_PASSWORD@aws-0-xx.pooler.supabase.com:6543/postgres"
   node migrate-to-supabase.js
   ```
   Use the real connection string from Step 2 in place of the example above.

2. You should see something like:
   ```text
   Reading from SQLite: .../server/mg_fitness.db
   Found: { programs: 3, dietPlans: 3, members: 3, sessions: 0, payments: 4 }
   Inserted programs: 3
   Inserted diet_plans: 3
   Inserted members: 3
   Inserted sessions: 0
   Inserted payments: 4
   Migration complete.
   ```

3. In Supabase **Table Editor**, open **members**, **programs**, **diet_plans**, **payments** and confirm rows are there.

---

## Step 4: Use Supabase in your app

1. **Backend**  
   When you run or deploy the backend, set **`DATABASE_URL`** to the **same** connection string you used in Step 3. The server will use PostgreSQL (Supabase) instead of SQLite.

2. **Deploy**  
   On Railway/Render (or wherever the backend runs), add the env var:
   - **Name:** `DATABASE_URL`  
   - **Value:** your Supabase connection string (with the real password).

After that, the app uses the migrated data on Supabase. You can keep `server/mg_fitness.db` as a local backup; the live app will read/write only Supabase.
