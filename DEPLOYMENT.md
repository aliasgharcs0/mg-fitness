# MG Fitness – Deployment Guide

This guide covers deploying:

1. **Frontend** → Vercel  
2. **Database** → Supabase (PostgreSQL)  
3. **Backend** (Express API) → Railway or Render  

Your app currently uses **SQLite** in the backend. To use **Supabase** as the database, you have two paths:

- **Option A (recommended for production):** Migrate backend to use Supabase (PostgreSQL). Deploy backend to Railway/Render with Supabase connection.  
- **Option B (quick deploy):** Deploy backend as-is with SQLite on Railway or Render (optional persistent volume). Add Supabase later when you’re ready to migrate.

---

## 1. Deploy frontend on Vercel

### 1.1 Push code to GitHub

- Create a repo and push your `mg-fitness` project (include only the app; don’t commit `node_modules` or `.env`).

### 1.2 Import project in Vercel

1. Go to [vercel.com](https://vercel.com) and sign in (e.g. with GitHub).  
2. **Add New** → **Project** → import your `mg-fitness` repo.  
3. Configure the **frontend** app (root of repo):

| Setting        | Value                    |
|----------------|--------------------------|
| **Root Directory** | `.` (or leave default)   |
| **Framework Preset** | Vite                    |
| **Build Command**   | `npm run build`         |
| **Output Directory** | `dist`                |
| **Install Command** | `npm install`          |

4. **Environment variables** (required so the frontend talks to your deployed API):

| Name            | Value                          |
|-----------------|---------------------------------|
| `VITE_API_URL`  | `https://YOUR-BACKEND-URL`      |

Replace `YOUR-BACKEND-URL` with your real backend URL (from Railway or Render, e.g. `https://mg-fitness-api.up.railway.app`). You can add this after the backend is deployed.

5. Deploy. Vercel will build and host the frontend. You’ll get a URL like `https://mg-fitness-xxx.vercel.app`.

### 1.3 SPA routing

The repo includes a **`vercel.json`** that rewrites all non-API requests to `index.html` so client-side routing (e.g. `/login`, `/dashboard`) works. No extra config needed.

---

## 2. Database on Supabase

### 2.1 Create a Supabase project

1. Go to [supabase.com](https://supabase.com) and sign in.  
2. **New Project** → choose organization, name (e.g. `mg-fitness`), database password, region.  
3. Wait for the project to be ready.

### 2.2 Get credentials

- **Project Settings** → **API**: note **Project URL** and **anon** / **service_role** keys.  
- **Project Settings** → **Database**: note **Connection string** (URI). For the backend you’ll use the **Connection pooling** URI (e.g. **Transaction** mode, port 6543) or the direct URI (port 5432).

### 2.3 Create tables in Supabase

In the Supabase dashboard go to **SQL Editor** and run the schema that matches your app. A full schema is in **`supabase/schema.sql`** in this repo (create it from the contents below if you don’t have it). It defines:

- `members`  
- `sessions`  
- `programs`  
- `diet_plans`  
- `payments`  

After running the schema, your **database** is “deployed” on Supabase. To actually **use** it from the app, the backend must be changed from SQLite to PostgreSQL (see “Backend with Supabase” below).

---

## 3. Deploy backend (Express API)

The backend is in the **`server/`** folder and currently uses **SQLite**. You can either keep SQLite (Option B) or switch to Supabase/PostgreSQL (Option A).

### 3.1 Option A – Backend with Supabase (PostgreSQL)

The backend supports PostgreSQL when **`DATABASE_URL`** is set:

1. **`server/db.js`** – Creates a `pg` connection pool using `process.env.DATABASE_URL` and `ssl: { rejectUnauthorized: false }` (as in the migration guide).

2. **`server/index.js`** – If `DATABASE_URL` is set, the server uses PostgreSQL (async); otherwise it uses SQLite (current behavior). No code rewrite needed: set the env var and ensure the schema exists.

3. **Schema** – In Supabase Dashboard → SQL Editor, run **`supabase/schema.sql`** once to create tables. Then set **`DATABASE_URL`** on the backend host to the Supabase **Database** connection string (Settings → Database → Connection string; use the pooled URI on port 6543 if available).

4. **Environment variables** on the host (Railway/Render):

   - `DATABASE_URL` = Supabase **Connection string** (from **Settings → Database**, e.g. `postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres`)  
   - Or use Supabase **Project URL** + **service_role** key and talk to Supabase via HTTP (if you use `@supabase/supabase-js` in the server).

4. Deploy the `server/` app to Railway or Render (see sections below). Set `PORT` if the platform requires it (e.g. `process.env.PORT`).

### 3.2 Option B – Backend with SQLite (no Supabase yet)

- Deploy **only** the Node/Express app in `server/` to Railway or Render.  
- Use the platform’s **persistent volume** for `mg_fitness.db` if you want data to survive restarts (otherwise the DB is ephemeral).  
- You can add Supabase later and migrate the backend to PostgreSQL when ready.

### 3.3 Deploy backend on Railway

1. Go to [railway.app](https://railway.app), sign in with GitHub.  
2. **New Project** → **Deploy from GitHub repo** → select your repo.  
3. Set **Root Directory** to `server` (so Railway builds and runs only the backend).  
4. **Variables**: add `PORT` (Railway sets this automatically; your app already uses `process.env.PORT || 4000`). If using Supabase, add `DATABASE_URL` (or Supabase URL + key).  
5. Deploy. Railway will run `npm install` and `npm start` (from `server/package.json`).  
6. In **Settings** → **Networking** → **Generate Domain**. Copy the URL (e.g. `https://mg-fitness-api.up.railway.app`) and use it as **VITE_API_URL** in Vercel.

### 3.4 Deploy backend on Render

1. Go to [render.com](https://render.com), sign in with GitHub.  
2. **New** → **Web Service** → connect the repo.  
3. **Root Directory**: `server`.  
4. **Build Command**: `npm install`.  
5. **Start Command**: `npm start`.  
6. **Environment**: add `PORT` (Render sets it; your app uses it) and, if using Supabase, `DATABASE_URL`.  
7. Deploy. Copy the service URL (e.g. `https://mg-fitness-api.onrender.com`) and set **VITE_API_URL** in Vercel to this URL.

---

## 4. Troubleshooting: “Login failed” on the deployed app

**Why you see the login page:** The app is supposed to show the login screen when you’re not signed in. The layout (gym image, form on the right) is correct. After a successful login you’re sent to the dashboard.

**Why login fails** (red “Login failed” message) is usually one of these:

1. **Frontend not pointing at the backend (most common)**  
   The Vite app bakes `VITE_API_URL` into the build. If it’s **missing or wrong on Vercel**, the browser calls the Vercel domain (e.g. `mg-fitness.silk.vercel.app/api/login`) instead of your Render backend, so the request fails and you see “Login failed”.

   **Fix:**  
   - Vercel → your project → **Settings** → **Environment Variables**.  
   - Add `VITE_API_URL` = your **Render backend URL** (e.g. `https://mg-fitness-xxxx.onrender.com`), no trailing slash.  
   - **Redeploy** the frontend (Vite only reads env at build time).

2. **User doesn’t exist in production DB**  
   The Supabase DB used by Render might be empty or not have the user you’re trying (e.g. `abdulrafay1`). The backend returns 401 and the app shows “Login failed”.

   **Fix:** Create the user in Supabase (e.g. run seed SQL or use your app’s “Add member” as admin). If you have a seed script or `supabase/schema.sql` that inserts an admin, run it in Supabase SQL Editor.

3. **Backend or DB unreachable**  
   If the Render service is down or `DATABASE_URL` is wrong, the backend may return 500 or not respond. Check Render logs and ensure `DATABASE_URL` is set and the Supabase schema is applied.

---

## 5. Checklist

- [ ] Repo on GitHub (no `.env` or `node_modules` committed).  
- [ ] Supabase project created; schema run in SQL Editor (if using Supabase).  
- [ ] Backend deployed (Railway or Render), with `DATABASE_URL` if using Supabase.  
- [ ] Frontend deployed on Vercel with **VITE_API_URL** = backend URL.  
- [ ] Test: open Vercel URL, log in, and confirm API calls go to the deployed backend (and, if applicable, Supabase).

---

## 6. CORS

The backend uses `cors()`. For production, you can restrict origin:

```js
app.use(cors({ origin: process.env.FRONTEND_URL || "https://your-app.vercel.app" }));
```

Set **`FRONTEND_URL`** on the backend (Render) to your exact Vercel URL so CORS allows login and API calls:

- **Render** → your backend service → **Environment** → add: `FRONTEND_URL` = `https://mg-fitness.silk.vercel.app` (or your real Vercel URL, no trailing slash).
- Multiple origins: `https://app1.vercel.app,https://app2.vercel.app`.

---

## 7. Summary

| Part      | Where       | What to set / run |
|-----------|------------|-------------------|
| Frontend  | Vercel     | Build: `npm run build`, output: `dist`, env: `VITE_API_URL` = backend URL. |
| Database  | Supabase   | Create project, run `supabase/schema.sql`, copy connection string. |
| Backend   | Railway / Render | Root: `server`, start: `npm start`, env: `PORT`, `DATABASE_URL`, `FRONTEND_URL` (your Vercel URL for CORS). |

After deployment, the **frontend** (Vercel) will call the **backend** (Railway/Render). The **database** will be either SQLite on the same server (Option B) or **Supabase** (Option A) once the backend is migrated to PostgreSQL.
