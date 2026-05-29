# 🔗 Connection Diagram & Architecture

## System Architecture Diagram

```
┌────────────────────────────────────────────────────────────────────┐
│                          USER BROWSER                              │
│                     http://localhost:5175                           │
└────────────────────────────────────────────────────────────────────┘
                              │
                              │ HTTP Request
                              │ with JWT Token
                              ▼
┌────────────────────────────────────────────────────────────────────┐
│                    FRONTEND APPLICATION                             │
│                  (React + Vite + TypeScript)                        │
│                                                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐             │
│  │  Login Page  │  │  Dashboard   │  │  Admin Panel │ ...         │
│  └──────────────┘  └──────────────┘  └──────────────┘             │
│          │                │                │                       │
│          └────────────────┴────────────────┘                       │
│                           │                                         │
│                    ┌──────▼──────┐                                 │
│                    │ API Client   │                                │
│                    │ (fetch)      │                                │
│                    └──────┬──────┘                                 │
│                           │                                         │
│                    ┌──────▼──────────┐                             │
│                    │ Auth Service    │                             │
│                    │ (JWT in header) │                             │
│                    └──────┬──────────┘                             │
│                                                                     │
│  .env.local:                                                       │
│  ├─ VITE_API_URL=http://localhost:5000/api ✓                     │
│  ├─ VITE_SUPABASE_URL=... ✓                                       │
│  └─ VITE_SUPABASE_ANON_KEY=... ✓                                  │
│                                                                     │
│  PORT: 5175 (Vite Dev Server)                                      │
│  Build Tool: Vite                                                  │
│  Framework: React 19.2.4                                           │
│  Router: React Router 7.0.0                                        │
│                                                                     │
└────────────────────────────────────────────────────────────────────┘
                              │
                              │ HTTP/REST API Calls
                              │ POST /api/auth/login
                              │ GET /api/auth/me
                              │ GET /api/students
                              │ PUT /api/students/:id
                              │ etc.
                              ▼
┌────────────────────────────────────────────────────────────────────┐
│                   BACKEND API SERVER                                │
│                  (Express + Node.js + TypeScript)                   │
│                     http://localhost:5000                           │
│                                                                     │
│  ┌──────────────────────────────────────────┐                     │
│  │ Express Server (app.ts)                  │                     │
│  │ ├─ CORS Middleware                       │                     │
│  │ │  origin: http://localhost:5175        │                     │
│  │ ├─ Request Logger                        │                     │
│  │ └─ Error Handler                         │                     │
│  └──────────────────────────────────────────┘                     │
│                     │                                               │
│        ┌────────────┼────────────┐                                │
│        │            │            │                                │
│  ┌─────▼────┐ ┌──────▼──┐ ┌─────▼────┐                          │
│  │ Auth     │ │ Student │ │  Classes │ ...                      │
│  │ Routes   │ │ Routes  │ │  Routes  │                          │
│  └─────┬────┘ └──────┬──┘ └─────┬────┘                          │
│        │            │            │                                │
│        └────────────┼────────────┘                                │
│                     │                                              │
│        ┌────────────▼────────────┐                               │
│        │ Auth Middleware         │                               │
│        │ (JWT Verification)      │                               │
│        └────────────┬────────────┘                               │
│                     │                                              │
│        ┌────────────▼────────────┐                               │
│        │ Database Config (db.ts) │                               │
│        │ (PostgreSQL Pool)       │                               │
│        └────────────┬────────────┘                               │
│                     │                                              │
│  .env:                                                            │
│  ├─ DATABASE_URL=postgresql://... ✓                             │
│  ├─ JWT_SECRET=... ✓                                            │
│  ├─ PORT=5000 ✓                                                 │
│  ├─ NODE_ENV=development ✓                                      │
│  └─ FRONTEND_URL=http://localhost:5175 ✓                        │
│                                                                     │
│  PORT: 5000 (Express Dev Server)                                   │
│  Runtime: Node.js                                                  │
│  Framework: Express 4.18.2                                         │
│  Database: PostgreSQL (pg 8.11.3)                                  │
│  Auth: JWT (jsonwebtoken 9.0.2)                                    │
│                                                                     │
└────────────────────────────────────────────────────────────────────┘
                              │
                              │ SQL Queries
                              │ (Parameterized)
                              │ Connection Pooling
                              │ SSL/TLS
                              ▼
┌────────────────────────────────────────────────────────────────────┐
│                  DATABASE (Supabase PostgreSQL)                      │
│         db.yqgjekjsggpzzxjuzpvt.supabase.co:5432                   │
│                                                                     │
│  ┌──────────────────────────────────────┐                         │
│  │ PostgreSQL Database Instance         │                         │
│  ├──────────────────────────────────────┤                         │
│  │ Tables:                              │                         │
│  │ ├─ users (id, register_no, etc)     │                         │
│  │ ├─ classes                           │                         │
│  │ ├─ students                          │                         │
│  │ ├─ marks                             │                         │
│  │ ├─ fees                              │                         │
│  │ └─ ... (other tables)                │                         │
│  ├──────────────────────────────────────┤                         │
│  │ RLS (Row Level Security)             │                         │
│  │ ├─ Users can only see their data     │                         │
│  │ ├─ Teachers can see students         │                         │
│  │ └─ Admins see everything             │                         │
│  ├──────────────────────────────────────┤                         │
│  │ Security:                            │                         │
│  │ ├─ SSL/TLS encryption in transit    │                         │
│  │ ├─ Password hashing                  │                         │
│  │ └─ Role-based access control        │                         │
│  └──────────────────────────────────────┘                         │
│                                                                     │
│  DATABASE_URL:                                                      │
│  postgresql://postgres:PASSWORD@                                    │
│    db.yqgjekjsggpzzxjuzpvt.supabase.co:5432/postgres              │
│                                                                     │
│  PORT: 5432 (PostgreSQL)                                            │
│  Provider: Supabase                                                 │
│  Version: PostgreSQL 15.x                                           │
│                                                                     │
└────────────────────────────────────────────────────────────────────┘
```

---

## Request/Response Flow - Login Example

```
USER BROWSER                         BACKEND                         DATABASE
     │                                 │                                 │
     │  1. User enters credentials      │                                 │
     │     (register_no: "1"            │                                 │
     │      password: "admin")          │                                 │
     │                                  │                                 │
     │  2. POST /api/auth/login         │                                 │
     │  ════════════════════════════▶  │                                 │
     │  Body: {register_no, password}   │                                 │
     │  Headers:                        │                                 │
     │  - Content-Type: application/json│                                 │
     │                                  │                                 │
     │                                  │ 3. Verify token (none yet)      │
     │                                  │                                 │
     │                                  │ 4. Query users table            │
     │                                  │    SELECT * FROM users          │
     │                                  │    WHERE register_no = '1'      │
     │                                  │ ════════════════════════════▶  │
     │                                  │                                 │
     │                                  │    Return: { id, password_hash }
     │                                  │ ◀════════════════════════════  │
     │                                  │                                 │
     │                                  │ 5. Verify password hash         │
     │                                  │    hash(password) == hash_stored
     │                                  │                                 │
     │                                  │ 6. Generate JWT token           │
     │                                  │    sign({id, register_no, role})
     │                                  │                                 │
     │  7. Response with token          │                                 │
     │  ◀════════════════════════════  │                                 │
     │  {                               │                                 │
     │    "success": true,              │                                 │
     │    "token": "eyJhbG...",         │                                 │
     │    "user": { id, name, role }    │                                 │
     │  }                               │                                 │
     │                                  │                                 │
     │ 8. Store token in localStorage   │                                 │
     │    auth_token = "eyJhbG..."      │                                 │
     │    auth_user = {...}             │                                 │
     │                                  │                                 │
     │ 9. Redirect to dashboard         │                                 │
     │                                  │                                 │
     │ 10. GET /api/students            │                                 │
     │     Headers:                     │                                 │
     │     Authorization: Bearer eyJhbG│                                 │
     │ ════════════════════════════▶  │                                 │
     │                                  │                                 │
     │                                  │ 11. Verify token               │
     │                                  │     decode(token) = {id, role} │
     │                                  │                                 │
     │                                  │ 12. Check permissions          │
     │                                  │     Can user access students?  │
     │                                  │                                 │
     │                                  │ 13. Query students             │
     │                                  │ ════════════════════════════▶  │
     │                                  │                                 │
     │                                  │  Return: [{...}, {...}, ...]   │
     │                                  │ ◀════════════════════════════  │
     │                                  │                                 │
     │ 14. Response with data           │                                 │
     │ ◀════════════════════════════  │                                 │
     │ {                               │                                 │
     │   "success": true,              │                                 │
     │   "data": [{...}, {...}]        │                                 │
     │ }                               │                                 │
     │                                  │                                 │
     │ 15. Update dashboard with data   │                                 │
     │                                  │                                 │
```

---

## Configuration Validation Checklist

```
✓ FRONTEND (.env.local)
  ├─ VITE_API_URL ........................... http://localhost:5000/api
  ├─ VITE_SUPABASE_URL ..................... https://...supabase.co
  ├─ VITE_SUPABASE_ANON_KEY ............... eyJhbGc...
  └─ VITE_OPENROUTER_API_KEY ............. sk-or-v1-...

✓ BACKEND (backend/.env)
  ├─ DATABASE_URL .......................... postgresql://...
  ├─ JWT_SECRET ............................ (32+ chars)
  ├─ PORT .................................. 5000
  ├─ NODE_ENV .............................. development
  └─ FRONTEND_URL .......................... http://localhost:5175

✓ SERVICES
  ├─ Backend Service ....................... npm run dev (port 5000)
  ├─ Frontend Service ....................... npm run dev (port 5175)
  └─ Database Service ....................... Supabase (port 5432)

✓ CONNECTIVITY
  ├─ Frontend → Backend ..................... HTTP/REST
  ├─ Backend → Database ..................... PostgreSQL/SSL
  ├─ CORS Configuration ..................... Enabled
  └─ JWT Authentication ..................... Verified
```

---

## Port Allocation

```
┌────────────────┬──────────────────────────────────┐
│ Service        │ Port & Details                   │
├────────────────┼──────────────────────────────────┤
│ Frontend       │ 5175 (Vite Dev Server)          │
│                │ URL: http://localhost:5175       │
│                │                                  │
│ Backend        │ 5000 (Express API)              │
│                │ URL: http://localhost:5000       │
│                │ Health: /api/health              │
│                │                                  │
│ Database       │ 5432 (PostgreSQL)               │
│                │ Host: db.yqgjekjsggpzzxjuzpvt   │
│                │         .supabase.co             │
│                │ External (not localhost)         │
└────────────────┴──────────────────────────────────┘
```

---

## Data Flow Summary

```
┌─────────────────────────────────────────────────┐
│                   User Action                    │
│           (Click button, submit form)            │
└────────────────────┬────────────────────────────┘
                     │
                     ▼
        ┌────────────────────────┐
        │  Frontend React Code   │
        │  (components/pages)    │
        └────────────┬───────────┘
                     │
                     ▼
        ┌────────────────────────┐
        │   API Service Call     │
        │ (src/services/*)       │
        └────────────┬───────────┘
                     │
                     ▼
        ┌────────────────────────┐
        │ apiClient.fetch()      │
        │ + JWT Token            │
        └────────────┬───────────┘
                     │
              HTTP POST/GET/PUT/DELETE
        ────────────────────────────────
                     │
                     ▼
        ┌────────────────────────────┐
        │  Backend Express Routes    │
        │ (backend/src/routes/*)     │
        └────────────┬───────────────┘
                     │
                     ▼
        ┌────────────────────────────┐
        │ Auth Middleware            │
        │ (verify JWT token)         │
        └────────────┬───────────────┘
                     │
                     ▼
        ┌────────────────────────────┐
        │ Route Handler              │
        │ (process request)          │
        └────────────┬───────────────┘
                     │
                     ▼
        ┌────────────────────────────┐
        │ Database Query             │
        │ (backend/src/config/db.ts) │
        └────────────┬───────────────┘
                     │
              SQL Query (parameterized)
        ────────────────────────────────
                     │
                     ▼
        ┌────────────────────────────┐
        │  PostgreSQL (Supabase)     │
        │  Execute query             │
        │  Return results            │
        └────────────┬───────────────┘
                     │
                     ▼
        ┌────────────────────────────┐
        │  Response object           │
        │  (rows or error)           │
        └────────────┬───────────────┘
                     │
                     ▼
        ┌────────────────────────────┐
        │ Format response            │
        │ (JSON)                     │
        └────────────┬───────────────┘
                     │
              HTTP Response (JSON)
        ────────────────────────────────
                     │
                     ▼
        ┌────────────────────────────┐
        │ Frontend receives response │
        │ (response.json())          │
        └────────────┬───────────────┘
                     │
                     ▼
        ┌────────────────────────────┐
        │ Update state/context       │
        │ (useState, Context API)    │
        └────────────┬───────────────┘
                     │
                     ▼
        ┌────────────────────────────┐
        │ React re-renders           │
        │ (display new data)         │
        └────────────┬───────────────┘
                     │
                     ▼
        ┌────────────────────────────┐
        │   User sees updated UI     │
        └────────────────────────────┘
```

---

## Security Layers

```
┌──────────────────────────────────────────────────┐
│           Frontend Security                       │
├──────────────────────────────────────────────────┤
│ • JWT token in localStorage (secure)             │
│ • Token sent in Authorization header             │
│ • HTTPS recommended in production                │
│ • CORS prevents cross-origin abuse               │
└──────────────────────────────────────────────────┘
                     │
                     ▼
┌──────────────────────────────────────────────────┐
│           Network (HTTP/HTTPS)                    │
├──────────────────────────────────────────────────┤
│ • CORS headers validated by browser              │
│ • SSL/TLS encryption (production)                │
│ • Request origin checked                         │
└──────────────────────────────────────────────────┘
                     │
                     ▼
┌──────────────────────────────────────────────────┐
│           Backend Security                        │
├──────────────────────────────────────────────────┤
│ • JWT token verified (signature & expiration)    │
│ • Role-based access control (admin/teacher)      │
│ • Parameterized queries (SQL injection prevent)  │
│ • Input validation & sanitization                │
│ • Error messages don't leak info                 │
└──────────────────────────────────────────────────┘
                     │
                     ▼
┌──────────────────────────────────────────────────┐
│           Database Security                       │
├──────────────────────────────────────────────────┤
│ • PostgreSQL RLS policies (Row Level Security)   │
│ • SSL/TLS connection (Supabase requirement)      │
│ • Password hashing (not stored plain text)       │
│ • Role-based access control                      │
│ • Encrypted credentials in environment vars      │
└──────────────────────────────────────────────────┘
```

