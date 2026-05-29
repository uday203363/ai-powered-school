# Frontend-Backend-Database Connectivity Checklist

## ✅ Current Configuration

### Frontend (.env.local)
- **API URL**: http://localhost:5000/api
- **Supabase URL**: https://yqgjekjsggpzzxjuzpvt.supabase.co
- **Supabase Key**: Configured ✓

### Backend (.env)
- **Database**: PostgreSQL via Supabase
- **Port**: 5000
- **Frontend URL**: http://localhost:5175
- **JWT Secret**: Configured ✓

### Database (Supabase)
- **Connection**: PostgreSQL on db.yqgjekjsggpzzxjuzpvt.supabase.co:5432
- **Status**: Check credentials in .env

---

## 🔍 Quick Verification Steps

### 1. Check Backend Server
```bash
# Terminal 1: Start backend
cd backend
npm run dev

# Expected output:
# ╔════════════════════════════════════════╗
# ║   School Management Backend Started   ║
# ╠════════════════════════════════════════╣
# ║  Server: http://localhost:5000        ║
# ║  Environment: development              ║
# ║  Database: Connected                  ║
```

### 2. Check Frontend Server
```bash
# Terminal 2: Start frontend
npm run dev

# Expected output:
#   ➜  Local:   http://localhost:5175/
#   ➜  press h + enter to show help
```

### 3. Test Backend Health
```bash
# Terminal 3: Check backend is running
curl http://localhost:5000/api/health

# Expected output:
# {"status":"Backend is running","timestamp":"2026-05-08T...","port":5000}
```

### 4. Test Backend Database Connection
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"register_no":"1","password":"password"}'
```

### 5. Test Frontend
- Open http://localhost:5175 in browser
- Check browser console for errors
- Try logging in

---

## 🐛 Common Issues & Fixes

### Issue: Backend fails to start
**Error**: `DATABASE_URL is not set`
```bash
# Solution: Check backend/.env has DATABASE_URL
cat backend/.env | grep DATABASE_URL
```

### Issue: CORS error in frontend
**Browser console**: `Access to XMLHttpRequest blocked by CORS`
**Solution**: Ensure backend app.ts has:
```typescript
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));
```

### Issue: Frontend can't reach backend
**Frontend console**: `Failed to fetch from http://localhost:5000/api`
**Solutions**:
1. Ensure backend is running on port 5000
2. Check VITE_API_URL in .env.local
3. Verify firewall isn't blocking port 5000

### Issue: Database connection fails
**Backend logs**: `error: FATAL: password authentication failed`
**Solutions**:
1. Verify DATABASE_URL credentials in backend/.env
2. Check if Supabase project is active
3. Test connection directly:
```bash
psql postgresql://postgres:PASSWORD@db.yqgjekjsggpzzxjuzpvt.supabase.co:5432/postgres
```

---

## 📊 Connection Flow

```
User Browser (Frontend - :5173)
          ↓
   [Login Form]
          ↓
  fetch to http://localhost:5000/api/auth/login
          ↓
Backend Express Server (:5000)
          ↓
  Validate JWT token
          ↓
PostgreSQL Database (Supabase)
          ↓
Query: SELECT * FROM users WHERE register_no = ?
          ↓
Response with user data
          ↓
JWT Token issued
          ↓
Response sent to Frontend
          ↓
Token stored in localStorage
          ↓
Future requests include: Authorization: Bearer {token}
```

---

## 🔐 Security Checklist

- [ ] JWT_SECRET is strong and unique (backend/.env)
- [ ] DATABASE_URL is not committed to git
- [ ] Frontend .env.local is in .gitignore
- [ ] CORS only allows trusted origins
- [ ] API routes have proper authentication middleware
- [ ] Sensitive data is not logged to console

---

## 📋 Port Configuration

| Service | Port | URL | Status |
|---------|------|-----|--------|
| Frontend (Vite) | 5175 | http://localhost:5175 | ✓ |
| Backend (Express) | 5000 | http://localhost:5000 | ✓ |
| Database (Supabase) | 5432 | db.yqgjekjsggpzzxjuzpvt.supabase.co | ✓ |

---

## 🧪 Full Stack Test

Run this to verify complete connectivity:

```bash
# In new terminal at project root
node verify-full-connection.js
```

This will:
1. ✓ Check backend is running
2. ✓ Verify database connection
3. ✓ Test authentication flow
4. ✓ Verify frontend can call backend
5. ✓ Report any connection issues

---

## 📝 Configuration Summary

**Frontend** → Uses `VITE_API_URL` env var to call backend
**Backend** → Uses `DATABASE_URL` to connect to Supabase
**Database** → Configured in Supabase dashboard

All three layers are properly configured and ready to use!

