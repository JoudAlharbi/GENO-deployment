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

Set `DEMO_MODE=false` (backend) and `VITE_DEMO_MODE=false` (frontend), configure PostgreSQL and `SECRET_KEY`. See `DEPLOYMENT.md`.
