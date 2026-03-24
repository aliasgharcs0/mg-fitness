# MG Fitness

Gym management app (React + Vite + Supabase).

## Local run

1. Create `.env` with:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
2. Start frontend:
   ```bash
   npm run dev
   ```
3. Open on desktop or phone:
   ```text
   http://<YOUR_IP>:8080
   ```

## Supabase setup required

- Run DB migrations in `supabase/migrations`.
- Deploy edge function:
  - `supabase/functions/admin-ops`
- Ensure each row in `members` is linked to `auth.users` via `members.auth_user_id`.
