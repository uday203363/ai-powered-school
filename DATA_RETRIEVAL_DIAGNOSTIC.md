# 🔍 Data Retrieval Diagnostic Guide

## Overview

If your database has data but it's not displaying on the dashboard, there are several possible points of failure in the connection chain:

```
Database (has data)
       ↓
Backend SQL Query
       ↓
API Response 
       ↓
Frontend Fetch
       ↓
Component Renders
```

One of these layers is failing. This guide helps you identify where.

---

## Quick Diagnostic Check

Run this command to analyze your database and identify the issue:

```bash
node diagnose-data-retrieval.js
```

This will check:
1. ✓ Database connection
2. ✓ Table structure
3. ✓ Data in database
4. ✓ Students by class
5. ✓ Authentication users
6. ✓ API endpoints

---

## Common Issues & Solutions

### Issue 1: No Data in Database

**Symptom:** Dashboard shows "No students found"

**Check:** Run `node diagnose-data-retrieval.js` and look for:
```
✗ No students found in database!
```

**Solution:**

Option A: Add students manually
```
1. Login to admin dashboard (use any admin register number)
2. Go to "Student Registration" tab
3. Fill in student details
4. Click "Register Student"
```

Option B: Add test data using Supabase
```
1. Go to Supabase dashboard
2. Select your project
3. Go to "users" table
4. Click "Insert" → "Insert row"
5. Fill in: register_no, name, email, class, role='student', password
```

Option C: Seed database with SQL
```sql
INSERT INTO users (register_no, name, email, class, role, password, admission_year, status)
VALUES 
  ('24001', 'John Doe', 'john@school.com', '10-A', 'student', 'hashed_pwd', 2024, 'Active'),
  ('24002', 'Jane Smith', 'jane@school.com', '10-A', 'student', 'hashed_pwd', 2024, 'Active'),
  ('24003', 'Bob Wilson', 'bob@school.com', '10-B', 'student', 'hashed_pwd', 2024, 'Active');
```

---

### Issue 2: Data Exists But Students Have No Class

**Symptom:** Diagnostic shows students but they have no class value

**Problem:** Students are NULL in the "class" field
```
• 24001 | John Doe | Class: N/A ← Empty!
```

**Solution:** Update student records with class values

```sql
UPDATE users 
SET class = '10-A' 
WHERE register_no = '24001';
```

Or in admin dashboard:
```
1. Go to "Users Management" tab
2. Find the student
3. Click "Edit"
4. Set "Class" field
5. Save
```

---

### Issue 3: Data Exists But Not Showing (Filter Problem)

**Symptom:** 
- Diagnostic shows data exists
- But admin dashboard shows "No students" when clicking a class

**Root Cause:** Class name mismatch

Example:
```
Database has: "10A" or "10-a" or "10a"
Filter looking for: "10-A"
Result: No match!
```

**Solution:** Ensure consistent class naming

**Correct Format:**
```
Use uppercase with hyphen: 10-A, 10-B, 11-A, etc.
NOT: 10A, 10a, 10-a
```

Update existing data:
```sql
-- If you have "10A", convert to "10-A"
UPDATE users SET class = '10-A' WHERE class = '10A';
UPDATE users SET class = '10-B' WHERE class = '10B';
UPDATE users SET class = '11-A' WHERE class = '11A';
-- etc.
```

---

### Issue 4: No Authentication Users

**Symptom:** Can't log in at all

**Diagnostic shows:**
```
✗ No admin users found - you cannot log in!
```

**Solution:** Create an admin user

```sql
INSERT INTO users (register_no, name, email, password, role)
VALUES ('admin', 'Admin User', 'admin@school.com', 'hashed_password', 'admin');
```

Or in Supabase:
1. Go to SQL Editor
2. Paste the INSERT statement
3. Click "Run"

**Default Password:** Change this in backend/.env
```
Default password hash for simple testing: (use same as frontend)
```

---

### Issue 5: Backend Can't Connect to Database

**Symptom:** Backend won't start

**Error in backend console:**
```
error: FATAL: password authentication failed
error: connect ECONNREFUSED
```

**Diagnostic shows:**
```
✗ Database connection failed
```

**Solution:**

1. Check DATABASE_URL in backend/.env
```bash
cat backend/.env | grep DATABASE_URL
```

2. Verify it looks like:
```
DATABASE_URL=postgresql://postgres:PASSWORD@db.yqgjekjsggpzzxjuzpvt.supabase.co:5432/postgres
```

3. Test connection directly:
```bash
psql postgresql://postgres:PASSWORD@db.yqgjekjsggpzzxjuzpvt.supabase.co:5432/postgres
```

4. If that fails:
   - Supabase project may be paused
   - Password may be wrong
   - Network access may be blocked

---

### Issue 6: API Endpoints Not Working

**Symptom:** Frontend shows "Failed to fetch" error

**Diagnostic shows:**
```
✗ Cannot reach backend: Failed to fetch
```

**Solution:**

1. Start the backend
```bash
cd backend
npm run dev
```

2. Check if it's running on correct port
```bash
curl http://localhost:5000/api/health
# Should return: {"status":"Backend is running",...}
```

3. Check CORS configuration in backend/src/app.ts
```typescript
app.use(cors({
  origin: 'http://localhost:5175',  // Make sure this matches frontend port
  credentials: true,
}));
```

4. Check VITE_API_URL in frontend .env.local
```
VITE_API_URL=http://localhost:5000/api  // Correct
```

---

### Issue 7: Authentication Token Invalid

**Symptom:** Logged in but getting 401 errors

**Browser console shows:**
```
401 Unauthorized: Invalid or expired token
```

**Causes:**
1. Token is expired (lasts 7 days)
2. JWT_SECRET in backend doesn't match
3. Token corrupted in localStorage

**Solution:**

```bash
# Option 1: Clear browser cache
# DevTools → Application → Storage → Clear All

# Option 2: Logout and login again
# Click Logout, then login again

# Option 3: Check JWT_SECRET
# Make sure backend/.env JWT_SECRET hasn't changed
```

---

### Issue 8: CORS Errors

**Symptom:** Browser console shows
```
Access to XMLHttpRequest blocked by CORS policy
```

**Solution:**

Check backend/src/app.ts:
```typescript
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5175',  // ← Check this
  credentials: true,
}));
```

Verify backend/.env:
```
FRONTEND_URL=http://localhost:5175  # Must match your frontend port
```

---

## Step-by-Step Debugging Process

### Step 1: Run Diagnostic
```bash
node diagnose-data-retrieval.js
```

**Look for:**
- Is database connected? ✓ or ✗
- Do tables exist? ✓ or ✗
- Is there any data? Count of users
- Are there students? Count by role
- Do students have classes? Check class values

### Step 2: Check Browser Console
```
Press F12 in browser
Go to Console tab
Look for error messages
```

**Common messages:**
- `Failed to fetch` → Backend not running
- `401 Unauthorized` → Token invalid
- `CORS error` → Wrong origin in CORS config
- `404 not found` → Wrong API endpoint

### Step 3: Check Backend Console
```
Look at the terminal where backend is running
Look for error messages related to database queries
```

**Common messages:**
- `SELECT * FROM users WHERE...` → Shows the query being run
- `FATAL: password authentication failed` → DB credentials wrong
- `relation "users" does not exist` → Table doesn't exist

### Step 4: Verify Network Requests
```
Press F12 in browser
Go to Network tab
Perform action that fetches data
Look at the request and response
```

**Check:**
- Request URL: Should be `http://localhost:5000/api/students`
- Request Headers: Should have `Authorization: Bearer {token}`
- Response Status: Should be 200 (success)
- Response Body: Should have student data

### Step 5: Test API Directly
```bash
# Get admin token first
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"register_no":"admin","password":"password"}'

# Copy the token from response
TOKEN="eyJhbGc..."

# Test students endpoint
curl http://localhost:5000/api/students \
  -H "Authorization: Bearer $TOKEN"

# Should return: {"success":true,"data":[...]}
```

---

## Checklist for Data Retrieval

- [ ] Database has students (run diagnostic)
- [ ] Students have class values (not NULL)
- [ ] Class names are consistent (uppercase with hyphen: 10-A)
- [ ] Backend is running (npm run dev)
- [ ] Backend connects to database successfully
- [ ] API health endpoint works: `/api/health`
- [ ] Can log in successfully
- [ ] Authentication token is in localStorage
- [ ] Frontend VITE_API_URL is correct
- [ ] Backend FRONTEND_URL is correct
- [ ] CORS is configured properly
- [ ] No errors in browser console (F12)
- [ ] No errors in backend console
- [ ] API calls return 200 status
- [ ] Response contains student data

---

## Quick Fix Checklist

If none of the above work, try these quick fixes in order:

1. **Restart everything:**
   ```bash
   # Stop backend (Ctrl+C)
   # Stop frontend (Ctrl+C)
   # Start backend: cd backend && npm run dev
   # Start frontend: npm run dev (in new terminal)
   ```

2. **Clear browser cache:**
   - DevTools → Application → Storage → Clear All
   - Close and reopen browser

3. **Clear localStorage:**
   ```javascript
   // In browser console (F12):
   sessionStorage.clear()
   ```

4. **Reset database connection:**
   ```bash
   # Reconnect to database
   psql $(grep DATABASE_URL backend/.env | cut -d= -f2)
   SELECT 1;  # Test query
   ```

5. **Check data actually exists:**
   ```bash
   # In Supabase or psql:
   SELECT COUNT(*) FROM users WHERE role = 'student';
   # Should be > 0
   ```

---

## Getting Help

If the issue persists:

1. **Run diagnostic and save output:**
   ```bash
   node diagnose-data-retrieval.js > diagnostic-report.txt
   ```

2. **Check backend logs:**
   ```
   Look for error messages in the backend terminal
   Copy any error messages
   ```

3. **Check frontend logs:**
   ```
   Press F12 → Console tab
   Copy any error messages
   ```

4. **Check Network tab:**
   ```
   Press F12 → Network tab
   Click "Fetch/XHR" filter
   Try to fetch data
   Click failed request
   Check Response tab for error details
   ```

5. **Save diagnostic info:**
   - Diagnostic report output
   - Frontend console errors
   - Backend console errors
   - Network tab failures
   - Any error messages

This information will help identify exactly where the data flow is breaking.

