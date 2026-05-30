# 🔗 Complete Frontend-Backend-Database Connection Guide

## Overview

```
┌─────────────────┐         ┌──────────────────┐         ┌──────────────────┐
│  Frontend       │         │  Backend         │         │  Database        │
│  (Vite React)   │────────▶│  (Express)       │────────▶│  (Supabase)      │
│  :5173          │         │  :5000           │         │  PostgreSQL      │
└─────────────────┘         └──────────────────┘         └──────────────────┘
     Vite Dev                Express Server              PostgreSQL Pool
     React Router            JWT Auth                    Connection Pool
     Supabase JS             CORS Enabled                RLS Policies
```

---

## ✅ Current Status

### ✓ Frontend Configuration
- **Port**: 5175 (Vite)
- **API Endpoint**: `http://localhost:5000/api`
- **Auth Method**: JWT tokens stored in localStorage
- **Database**: Supabase client library

### ✓ Backend Configuration
- **Port**: 5000 (Express)
- **Database Driver**: PostgreSQL (pg)
- **Authentication**: JWT middleware
- **CORS**: Enabled for http://localhost:5173

### ✓ Database Configuration
- **Provider**: Supabase (PostgreSQL)
- **Connection**: Via DATABASE_URL in backend/.env
- **SSL**: Enabled in production

---

## 🚀 Quick Start (5 minutes)

### 1. Install Dependencies

```bash
# Frontend dependencies
npm install

# Backend dependencies
cd backend
npm install
cd ..
```

### 2. Verify Environment Files

**Frontend (.env.local)**
```env
VITE_SUPABASE_URL=https://yqgjekjsggpzzxjuzpvt.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_OPENROUTER_API_KEY=sk-or-v1-...
VITE_API_URL=http://localhost:5000/api
```

**Backend (.env)**
```env
DATABASE_URL=postgresql://postgres:OldKn5biBkRbW72W@db.yqgjekjsggpzzxjuzpvt.supabase.co:5432/postgres
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production_12345
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:5175
```

> ⚠️ Change `JWT_SECRET` and `FRONTEND_URL` as needed!

### 3. Start Services

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```

**Terminal 2 - Frontend:**
```bash
npm run dev
```

**Terminal 3 - Test Connectivity (Optional):**
```bash
node verify-full-connection.js
```

---

## 🔍 Detailed Connection Architecture

### Frontend → Backend Flow

#### 1. **API Client Setup** (`src/services/apiClient.ts`)
```typescript
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export const apiRequest = async <T>(path: string, options: RequestInit = {}) => {
  const response = await fetch(getApiUrl(path), {
    ...options,
    headers: {
      ...getAuthHeaders(true),
      ...(options.headers || {}),
    },
  });
  // Handle response...
};
```

**What it does:**
- Reads API URL from `VITE_API_URL` env var
- Automatically includes JWT token in Authorization header
- Handles request/response serialization

#### 2. **Authentication Service** (`src/services/auth.ts`)
```typescript
async login(registerNo: string, password: string) {
  const response = await fetch(getApiUrl('/auth/login'), {
    method: 'POST',
    headers: getAuthHeaders(true),
    body: JSON.stringify({ register_no: registerNo, password }),
  });
  
  const { token, user } = await response.json();
  sessionStorage.setItem('auth_token', token);
  sessionStorage.setItem('auth_user', JSON.stringify(user));
}
```

**What it does:**
- POSTs login credentials to `/api/auth/login`
- Backend validates against database
- Receives JWT token
- Stores token in sessionStorage for future requests

#### 3. **Protected Requests**
```typescript
// Every API request includes token
headers['Authorization'] = `Bearer ${token}`;

// Backend verifies token before processing
authenticateToken middleware → checks JWT → proceeds or returns 401
```

### Backend → Database Flow

#### 1. **Database Connection** (`backend/src/config/database.ts`)
```typescript
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' 
    ? { rejectUnauthorized: false } 
    : false,
});
```

**What it does:**
- Creates PostgreSQL connection pool
- Reads connection string from `DATABASE_URL`
- Enables SSL for production (Supabase requirement)
- Reuses connections for performance

#### 2. **Query Execution** (`backend/src/routes/auth.ts`)
```typescript
const result = await query(
  'SELECT id, register_no, name, role, password FROM users WHERE register_no = $1',
  [register_no]
);

const user = result.rows[0];
```

**What it does:**
- Executes parameterized queries (prevents SQL injection)
- Gets data from `users` table
- Returns user object to frontend

#### 3. **JWT Generation**
```typescript
const token = generateToken(user.id, user.register_no, user.role);

res.json({
  success: true,
  token,
  user: { id, register_no, name, role },
});
```

**What it does:**
- Creates JWT token with user info
- Includes expiration (7 days)
- Signed with JWT_SECRET

---

## 🧪 Connection Testing

### Test 1: Backend Health
```bash
curl http://localhost:5000/api/health
```

**Expected Response:**
```json
{
  "status": "Backend is running",
  "timestamp": "2026-05-08T10:30:00.000Z",
  "port": 5000
}
```

### Test 2: Database Connection
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"register_no":"1","password":"password"}'
```

**Expected Response:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "register_no": "1",
    "name": "Test User",
    "role": "admin"
  }
}
```

### Test 3: Protected Route
```bash
# Get the token from Test 2 first
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

curl http://localhost:5000/api/auth/me \
  -H "Authorization: Bearer $TOKEN"
```

### Test 4: Automatic Verification
```bash
node verify-full-connection.js
```

---

## 🐛 Troubleshooting Guide

### Issue 1: Backend won't start

**Error:** `EADDRINUSE: address already in use :::5000`

**Solution:**
```bash
# Find process using port 5000 (Windows)
netstat -ano | findstr :5000

# Kill the process (replace PID with actual number)
taskkill /PID <PID> /F

# Or use a different port
PORT=5001 npm run dev
```

### Issue 2: Frontend can't reach backend

**Error in browser console:** `Failed to fetch` or `CORS error`

**Checklist:**
- [ ] Backend is running (`npm run dev` in backend folder)
- [ ] Backend is on port 5000
- [ ] VITE_API_URL in `.env.local` is `http://localhost:5000/api`
- [ ] No typos in API calls

**Fix:**
```env
# .env.local (Frontend)
VITE_API_URL=http://localhost:5000/api
```

### Issue 3: Database connection fails

**Error in backend logs:** `error: FATAL: password authentication failed`

**Solution:**
1. Verify DATABASE_URL in `backend/.env`
2. Check if Supabase project is active
3. Test connection directly:
```bash
# Install psql if needed
psql postgresql://postgres:PASSWORD@db.yqgjekjsggpzzxjuzpvt.supabase.co:5432/postgres
```

### Issue 4: Login always fails

**Backend logs:** `Invalid credentials`

**Causes:**
- User doesn't exist in database
- Password hash mismatch
- Wrong register_no

**Debug:**
```bash
# Check if user exists
SELECT register_no, name, role FROM users WHERE register_no = '1';
```

### Issue 5: Token errors

**Error:** `Invalid or expired token`

**Solutions:**
- [ ] JWT_SECRET in backend/.env matches what's being used
- [ ] Token not older than 7 days
- [ ] Token format is correct: `Bearer <token>`
- [ ] No extra spaces in Authorization header

### Issue 6: Blank screens or 404 errors

**Solution 1:** Clear browser cache
```
Dev Tools → Storage → Clear All
```

**Solution 2:** Check backend console for errors
```
Look for: [error] messages in backend terminal
```

**Solution 3:** Verify routes are registered
```typescript
// In backend/src/app.ts
app.use('/api/auth', authRoutes);       // ✓ Must exist
app.use('/api/students', studentRoutes); // ✓ Must exist
```

---

## 📊 Port & Service Map

| Service | Port | URL | Status | Start Command |
|---------|------|-----|--------|----------------|
| Frontend | 5175 | http://localhost:5175 | Dev Mode | `npm run dev` |
| Backend | 5000 | http://localhost:5000 | Dev Mode | `cd backend && npm run dev` |
| Database | 5432 | db.yqgjekjsggpzzxjuzpvt.supabase.co | External | Auto |
| API Health | 5000 | /api/health | Dev Mode | GET request |

---

## 🔐 Security Checklist

Before deploying to production:

- [ ] Change JWT_SECRET to a strong random string
  ```bash
  openssl rand -base64 32
  ```

- [ ] Set NODE_ENV to `production` in backend/.env

- [ ] Update FRONTEND_URL to your production domain
  ```env
  FRONTEND_URL=https://yourdomain.com
  ```

- [ ] Use environment variables for all secrets
  ```bash
  # Never commit these files
  .env
  .env.local
  backend/.env
  ```

- [ ] Enable HTTPS for production API calls

- [ ] Add rate limiting to backend
  ```typescript
  import rateLimit from 'express-rate-limit';
  ```

- [ ] Add CORS whitelist
  ```typescript
  app.use(cors({
    origin: ['https://yourdomain.com'],
    credentials: true,
  }));
  ```

---

## 📝 Verification Checklist

- [ ] `.env.local` has VITE_API_URL pointing to backend
- [ ] `backend/.env` has DATABASE_URL from Supabase
- [ ] `backend/.env` has JWT_SECRET set
- [ ] Backend starts without errors: `npm run dev`
- [ ] Frontend starts without errors: `npm run dev`
- [ ] Can reach http://localhost:5000/api/health
- [ ] Can login at http://localhost:5173
- [ ] Browser console shows no CORS errors
- [ ] Backend console shows incoming requests

---

## 🚀 Full Stack Start Command

For convenience, use the batch file to start all services:

```bash
# Windows
START_ALL.bat

# Or manually:
# Terminal 1:
cd backend && npm run dev

# Terminal 2:
npm run dev

# Terminal 3 (Optional - runs verification):
node verify-full-connection.js
```

---

## 📚 Key Files Reference

| File | Purpose | Port |
|------|---------|------|
| `vite.config.ts` | Frontend build config | 5173 |
| `src/services/apiClient.ts` | API communication | → 5000 |
| `backend/src/app.ts` | Express server | 5000 |
| `backend/src/config/database.ts` | DB connection | → 5432 |
| `.env.local` | Frontend secrets | N/A |
| `backend/.env` | Backend secrets | N/A |

---

## ✨ Success Indicators

When everything is working:

1. ✓ Backend logs show: `School Management Backend Started`
2. ✓ Frontend shows Vite logo and app
3. ✓ Login page loads without errors
4. ✓ Can log in with valid credentials
5. ✓ Dashboard displays data from database
6. ✓ No errors in browser console (except warnings)
7. ✓ No errors in backend terminal
8. ✓ Network tab shows successful requests to `/api/*`

---

## 🆘 Getting Help

1. **Check logs first:**
   - Browser DevTools Console (Frontend errors)
   - Backend terminal (Database/query errors)

2. **Run verification:**
   ```bash
   node verify-full-connection.js
   ```

3. **Check configuration:**
   - Verify all environment variables
   - Check ports are correct and available
   - Ensure no typos in URLs

4. **Common fixes:**
   - Restart both frontend and backend
   - Clear browser cache
   - Check firewall settings
   - Verify internet connection

