# GENO — Portfolio deployment guide

Recommended **free-tier** stack:

| Layer | Service | Why |
|--------|---------|-----|
| **Frontend** | [Vercel](https://vercel.com) or [Netlify](https://netlify.com) | Fast static hosting, SPA routing, free |
| **Backend** | [Render](https://render.com) | Simple Python/Flask deploy, free web + Postgres |
| **Database** | Render PostgreSQL (or [Neon](https://neon.tech)) | Managed Postgres, `DATABASE_URL` supported |

---

## 1. Prerequisites

- GitHub repo with this project pushed
- Local PostgreSQL schema already applied (`backend/DB/db_setup.py` or your existing `geno` DB)
- Demo login user exists (`DEMO01` / `demo123` — run `python create_test_users.py` in `backend/`)

---

## 2. Deploy backend (Render)

### Create PostgreSQL on Render

1. Render Dashboard → **New +** → **PostgreSQL** (free).
2. Copy the **Internal Database URL** (or External if testing from outside Render).

### Create Web Service

1. **New +** → **Web Service** → connect your repo.
2. **Root Directory:** `backend`
3. **Runtime:** Python 3
4. **Build Command:**
   ```bash
   pip install -r requirements.txt
   ```
5. **Start Command:**
   ```bash
   gunicorn --bind 0.0.0.0:$PORT --workers 2 --timeout 120 wsgi:app
   ```
6. **Health Check Path:** `/api/health`

### Environment variables (Render → Environment)

| Variable | Value |
|----------|--------|
| `DATABASE_URL` | Paste Render Postgres connection string |
| `SECRET_KEY` | Long random string (required in production) |
| `CORS_ORIGINS` | Your frontend URL, e.g. `https://geno-demo.vercel.app` (add `http://localhost:5173` for local testing) |
| `FLASK_DEBUG` | `false` |
| `PORT` | Set automatically by Render |

Optional (persistent uploads/reports on paid disk):

| Variable | Value |
|----------|--------|
| `DATA_DIR` | Mount path, e.g. `/var/data` |

### Initialize database on Render Postgres

From your machine (with `psql` or Render shell), run your schema against the hosted DB, or export/import from local `geno` database. Ensure tables and at least one lab user exist.

### Verify backend

```bash
curl https://YOUR-API.onrender.com/api/health
```

Expect `status: ok` when DB is reachable.

**Note:** Render free tier sleeps after inactivity; first request may take ~30–60s.

---

## 3. Deploy frontend (Vercel — recommended)

1. Vercel → **Add New Project** → import repo.
2. **Root Directory:** `geno-react`
3. **Framework Preset:** Vite
4. **Build Command:** `npm run build`
5. **Output Directory:** `dist`

### Environment variable (Vercel → Settings → Environment Variables)

| Name | Production value |
|------|------------------|
| `VITE_API_BASE_URL` | `https://YOUR-API.onrender.com` (no trailing slash) |

6. Deploy. `vercel.json` handles SPA refresh routing.

### Alternative: Netlify

- Root: `geno-react`
- Build: `npm run build`
- Publish: `dist`
- Set `VITE_API_BASE_URL` in Netlify env vars
- `netlify.toml` is included for redirects

---

## 4. Connect frontend ↔ backend

1. Deploy backend first; copy public URL.
2. Set `VITE_API_BASE_URL` on Vercel/Netlify to that URL.
3. Set `CORS_ORIGINS` on Render to your Vercel/Netlify URL.
4. Redeploy frontend after changing env vars (Vite bakes env at build time).

---

## 5. Local production-like test

**Backend:**

```powershell
cd genoproject\backend
copy .env.example .env
# edit .env
pip install -r requirements.txt
gunicorn --bind 127.0.0.1:5000 --workers 1 --timeout 120 wsgi:app
```

**Frontend:**

```powershell
cd genoproject\geno-react
copy .env.production.example .env.production
# set VITE_API_BASE_URL=http://127.0.0.1:5000
npm install
npm run build
npm run preview
```

---

## 6. Files added/updated for deployment

| File | Purpose |
|------|---------|
| `geno-react/src/config/apiBase.js` | `VITE_API_BASE_URL` |
| `geno-react/.env.example` | Local dev API URL |
| `geno-react/.env.production.example` | Production API URL template |
| `geno-react/vite.config.js` | Build chunks / size |
| `geno-react/vercel.json` | SPA rewrites |
| `geno-react/netlify.toml` | Netlify build + redirects |
| `backend/wsgi.py` | Gunicorn entry |
| `backend/Procfile` | Render/Heroku-style start |
| `backend/render.yaml` | Optional Render blueprint |
| `backend/.env.example` | Backend env template |
| `backend/app.py` | Production host/port, CORS via env |
| `backend/app_config.py` | `CORS_ORIGINS`, `DATA_DIR` |
| `backend/utils/db_connection.py` | `DATABASE_URL` support |
| `backend/requirements.txt` | Added `gunicorn` |

---

## 7. Portfolio checklist

- [ ] Backend `/api/health` returns OK
- [ ] Login works on live URL
- [ ] Upload + analysis completes
- [ ] Dashboard charts load
- [ ] View report / PDF download works
- [ ] Add live demo link to portfolio README

---

## Security reminders

- Never commit `.env` files
- Use strong `SECRET_KEY` in production
- Restrict `CORS_ORIGINS` to your real frontend domain(s)
- Do not expose Postgres credentials in the frontend repo
