# Security & public deployment checklist

## Before pushing to GitHub

- [ ] No `.env`, `.env.local`, or `.env.production` files are committed
- [ ] `backend/uploads/` and `backend/reports/` are not tracked (user-generated DNA/PDF data)
- [ ] `backend/venv/` and `node_modules/` are not tracked
- [ ] `SECRET_KEY` is set on the host (Render/Vercel env), not in source code
- [ ] `CORS_ORIGINS` lists only your deployed frontend URL(s)
- [ ] `FLASK_DEBUG=false` in production
- [ ] Run `python create_test_users.py` in `backend/` to seed demo login: **DEMO01** / **demo123**

## Demo credentials (public portfolio)

| Field | Value |
|--------|--------|
| Company ID | `DEMO01` |
| Password | `demo123` |

Override via env: `DEMO_EMPLOYEE_ID`, `DEMO_PASSWORD`, `DEMO_EMAIL`, `DEMO_FULLNAME`.

## Local folders safe to delete (not required for deploy)

- `geno-react copy/` — duplicate frontend build
- `genoproject/` — legacy copy with local venv
