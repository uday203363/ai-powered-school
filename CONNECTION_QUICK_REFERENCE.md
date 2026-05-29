# 🚀 Quick Connection Reference

## One-Line Start

```bash
# Terminal 1 - Backend
cd backend && npm run dev

# Terminal 2 - Frontend
npm run dev

# Open http://localhost:5175 in browser
```

---

## Connection Architecture at a Glance

```
Browser :5175
    ↓
Frontend (React + Vite)
    ↓ fetch('http://localhost:5000/api/...')
Backend :5000 (Express)
    ↓ query('SELECT ... FROM users')
Database :5432 (Supabase PostgreSQL)
```

---

## Environment Configuration

### Frontend (.env.local)
| Variable | Value | Purpose |
|----------|-------|---------|
| VITE_API_URL | http://localhost:5000/api | Backend API endpoint |
| VITE_SUPABASE_URL | https://...supabase.co | Direct DB access (optional) |
| VITE_SUPABASE_ANON_KEY | eyJhbGc... | Supabase auth key |

### Backend (backend/.env)
| Variable | Value | Purpose |
|----------|-------|---------|
| DATABASE_URL | postgresql://... | PostgreSQL connection |
| JWT_SECRET | your_secret_key | Token signing key |
| PORT | 5000 | Server port |
| NODE_ENV | development | Env mode |
| FRONTEND_URL | http://localhost:5175 | CORS origin |

---

## Port Map

| Service | Port | Health Check |
|---------|------|--------------|
| Frontend | 5175 | http://localhost:5175 |
| Backend | 5000 | curl http://localhost:5000/api/health |
| Database | 5432 | (External, Supabase) |

---

## Verification Commands

```bash
# 1. Check configuration
node validate-config.js

# 2. Full connectivity test
node verify-full-connection.js

# 3. Backend health
curl http://localhost:5000/api/health

# 4. Backend logs (from backend terminal)
npm run dev
```

---

## Common Operations

### Test Login API
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"register_no":"1","password":"admin"}'
```

### Check Database Connection
```bash
# From backend folder
psql $(grep DATABASE_URL .env | cut -d= -f2)

# Then run: SELECT 1;
```

### Clear Frontend Cache
```
DevTools → Application → Storage → Clear All
```

### Reset Both Services
```bash
# Terminal 1:
cd backend
npm run dev --  # Press Ctrl+C then run again

# Terminal 2:
npm run dev  # Press Ctrl+C then run again
```

---

## Authentication Flow

1. **Frontend**: User enters register_no & password
2. **POST** `/api/auth/login` with credentials
3. **Backend**: Validates against users table
4. **Returns**: JWT token + user data
5. **Frontend**: Stores token in localStorage
6. **Future requests**: Include `Authorization: Bearer {token}`
7. **Backend**: Verifies token before processing

---

## Troubleshooting Quick Links

| Problem | Solution |
|---------|----------|
| Port already in use | Kill process or change port |
| CORS error | Check FRONTEND_URL in backend/.env |
| DB connection fails | Verify DATABASE_URL credentials |
| Blank screen | Clear cache, check browser console |
| 404 on API calls | Verify VITE_API_URL in .env.local |
| Login fails | Check users table exists |
| Token expired | Token lasts 7 days, check console |

---

## Key Files

```
Frontend
├── .env.local              ← Frontend secrets
├── src/services/
│   ├── apiClient.ts        ← HTTP client
│   └── auth.ts             ← Login logic
└── src/pages/
    └── LoginPage.tsx       ← Login UI

Backend
├── backend/.env            ← Backend secrets
├── backend/src/
│   ├── app.ts              ← Express server
│   ├── config/
│   │   ├── database.ts     ← DB pool
│   │   └── jwt.ts          ← Token logic
│   ├── routes/
│   │   └── auth.ts         ← /api/auth/*
│   └── middleware/
│       └── auth.ts         ← JWT verify

Database
└── Supabase PostgreSQL     ← Remote DB
```

---

## Status Checklist

- [ ] `npm install` run in root
- [ ] `npm install` run in backend/
- [ ] `.env.local` exists with VITE_API_URL
- [ ] `backend/.env` exists with DATABASE_URL
- [ ] Backend can start: `cd backend && npm run dev`
- [ ] Frontend can start: `npm run dev`
- [ ] Can reach http://localhost:5000/api/health
- [ ] Can reach http://localhost:5175
- [ ] Can login at http://localhost:5175

---

## Full Guides

- 📖 **Detailed Guide**: `FRONTEND_BACKEND_DATABASE_CONNECTION.md`
- 📋 **Checklist**: `CONNECTIVITY_CHECK.md`

---

## Still Need Help?

1. **Run**: `node validate-config.js`
2. **Run**: `node verify-full-connection.js`
3. Check `FRONTEND_BACKEND_DATABASE_CONNECTION.md` → Troubleshooting section

