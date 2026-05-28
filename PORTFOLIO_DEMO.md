# GENO — Portfolio demo mode

The project runs in **open demo mode** by default: no login, no PostgreSQL, in-memory metadata + disk uploads.

## Deploy (free tier)

### Render (backend)

1. Root directory: `backend`
2. Build: `pip install -r requirements.txt`
3. Start: `gunicorn --bind 0.0.0.0:$PORT --workers 1 --timeout 120 wsgi:app`
4. Health check: `/api/health`
5. Environment:
   - `DEMO_MODE=true`
   - `CORS_ORIGINS=https://your-frontend.vercel.app` (or `*` for testing)

No `DATABASE_URL` required.

### Free-tier shared demo data

This project uses a **seeded demo store** that is bundled in the repository:

- Seed (always loaded on startup): `backend/demo/demo_store.json`
- Runtime writes (ephemeral): `{DATA_DIR}/demo_runtime_store.json`

On every app start, runtime data is loaded first; if empty/missing, the seeded store is loaded automatically so dashboard/history never starts empty. This works on free Render with no disk add-on.

| File | Purpose |
|------|---------|
| `backend/demo/demo_store.json` | Shared default analyses for all visitors |
| `{DATA_DIR}/uploads/<user_id>/` | Uploaded CSVs for the running instance |
| `{DATA_DIR}/reports/<user_id>/` | Generated PDFs for the running instance |

Optional overrides:
- `DEMO_SEED_STORE_PATH=/path/to/demo_store.json`
- `DEMO_RUNTIME_STORE_PATH=/tmp/geno/demo_runtime_store.json`

### Vercel (frontend)

1. Root directory: `geno-react`
2. Build: `npm run build`
3. Environment:
   - `VITE_API_BASE_URL=https://your-api.onrender.com`
   - `VITE_DEMO_MODE=true` (default if unset)

## Local run

```bash
# Backend
cd backend
set DEMO_MODE=true
python app.py

# Frontend
cd geno-react
npm run dev
```

Open `http://localhost:5173/load` — upload a CSV and run analysis without logging in.

## Full production stack

Set `DEMO_MODE=false` (backend) and `VITE_DEMO_MODE=false` (frontend), configure PostgreSQL and `SECRET_KEY`. Seed demo login with `python create_test_users.py` (**demo** / **demo1234**). See `DEPLOYMENT.md`.
