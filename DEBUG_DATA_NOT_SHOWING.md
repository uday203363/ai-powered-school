# 🚨 Why Data Isn't Displaying - Complete Troubleshooting

## The Data Flow Chain

Your data retrieval has **7 critical points** where it can fail:

```
1. Database     → Has the data?
                ↓
2. Table        → users table exists with data?
                ↓
3. Backend SQL  → Query returns results?
                ↓
4. API Response → Returns 200 status?
                ↓
5. Frontend API → Receives response?
                ↓
6. Filter Logic → Filters applied correctly?
                ↓
7. UI Render    → Component displays data?
```

---

## Diagnostic Steps (In Order)

### Step 1: Check If Backend Can Start & Connect

```bash
cd backend
npm run dev
```

**Look for in console:**
```
✓ School Management Backend Started
✓ Database: Connected
```

**If you see errors:**
- `FATAL: password authentication failed` → DATABASE_URL is wrong
- `ECONNREFUSED` → Database server not running
- `relation "users" does not exist` → Tables not created

**Fix:** Verify `backend/.env` has correct DATABASE_URL

---

### Step 2: Check If Data Exists in Database

**Command to run:**
```bash
node diagnose-data-retrieval.js
```

**Expected output - Good:**
```
✓ Connected to PostgreSQL database
✓ users table exists
ℹ Database returned 150 total students
ℹ Students by role:
  • student: 150
  • admin: 5
  • teacher: 20
✓ Found 150 students (showing first 20)
  • 24001 | John Doe | Class: 10-A | Status: Active
  • 24002 | Jane Smith | Class: 10-A | Status: Active
```

**Expected output - Bad:**
```
✗ No students found in database!
This is the main issue - the database has no student records.
```

**If no data exists:**
- Go to Admin Dashboard
- Click "Student Registration" tab
- Add some test students
- Or insert via Supabase console

---

### Step 3: Check API Endpoints

**Start both services:**
```bash
# Terminal 1: Backend
cd backend && npm run dev

# Terminal 2: Frontend
npm run dev
```

**Test API in a new terminal:**
```bash
# Check health
curl http://localhost:5000/api/health

# Expected response:
# {"status":"Backend is running","timestamp":"...","port":5000}
```

**If that works, test students endpoint:**
```bash
# First, get a token by logging in
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"register_no":"1","password":"password"}'

# Response should have a "token" field
# Copy that token and use it

TOKEN="eyJhbGciOiJIUzI1NiIs..."

curl http://localhost:5000/api/students \
  -H "Authorization: Bearer $TOKEN"

# Expected response:
# {"success":true,"data":[{student objects}]}
```

---

### Step 4: Check Frontend in Browser

**Open browser to:** http://localhost:5175

**Press F12 (Developer Tools)**

**Go to "Console" tab and look for errors:**

**Common Error 1: CORS**
```
Access to XMLHttpRequest blocked by CORS policy
```
**Fix:** Check `backend/.env` FRONTEND_URL is `http://localhost:5175`

**Common Error 2: 401 Unauthorized**
```
401: Invalid or expired token
```
**Fix:** Logout and login again

**Common Error 3: 404 Not Found**
```
GET http://localhost:5000/api/students 404
```
**Fix:** Backend not running or wrong port

**Common Error 4: Failed to fetch**
```
TypeError: Failed to fetch
```
**Fix:** Backend not running on correct port

---

### Step 5: Check Network Requests

**In DevTools, go to "Network" tab**

**Try to display students (e.g., click a class)**

**Look for the request to `/api/students`**

**Check:**
```
Request URL: http://localhost:5000/api/students
Request Method: GET
Status: 200 (should be green)
Response: {"success":true,"data":[...]}
```

**If Status is not 200:**
- 401: Token issue - logout/login
- 403: Permission issue - wrong role
- 404: Endpoint doesn't exist - backend not running
- 500: Backend error - check backend console

**If Response is empty or error:**
- Check backend console for SQL errors
- Verify data exists in database
- Check filters are working

---

## Common Scenarios & Solutions

### Scenario 1: "Data exists but shows empty dashboard"

**Diagnosis:**
```bash
node diagnose-data-retrieval.js
```

Should show:
```
ℹ Database returned 50 students
BUT
✓ Found 0 students on dashboard
```

**Cause:** One of these:

**A) Class field is empty for students**
```
Database shows: "24001 | John Doe | Class: NULL"
```
Solution: Update class values
```sql
UPDATE users SET class = '10-A' WHERE class IS NULL;
```

**B) Class name mismatch**
```
Database: "10A" or "10a"
Frontend filter: "10-A"
Result: No match
```
Solution: Use consistent format "10-A"
```sql
UPDATE users SET class = '10-A' WHERE class = '10A';
```

**C) Status field filtering**
```
Database: status = NULL or "Inactive"
Frontend: Only shows status = 'Active'
```
Solution: Update status
```sql
UPDATE users SET status = 'Active' WHERE status IS NULL;
```

**D) Filters in UI are wrong**
If "10-A" shows "0 students" but they exist:
- Check browser console for filter logs
- Run in console: `sessionStorage.clear()` to reset
- Reload page

---

### Scenario 2: "Can't login"

**Diagnostic:**
```bash
node diagnose-data-retrieval.js
```

Should show:
```
ℹ Admin users (for testing login):
  • admin1 | Admin User
OR
✗ No admin users found - you cannot log in!
```

**If no admin users:**

Create one via SQL:
```sql
INSERT INTO users (
  register_no, name, email, password, role
) VALUES (
  'admin',
  'Admin User',
  'admin@school.com',
  'admin_password_hash',  -- In plain text for now
  'admin'
);
```

Or via Supabase console:
1. Table: users
2. Click Insert
3. Fill: register_no='admin', name='Admin', email='admin@school.com', role='admin', password='anything'
4. Click Save

---

### Scenario 3: "Login works but no data shows"

**Diagnosis chain:**

1. **Check network request:**
   - DevTools → Network tab
   - Try to load students
   - Look for `/api/students` request
   
2. **If request fails (404, 500, etc):**
   - Check backend console for errors
   - Verify backend is running

3. **If request succeeds (200) but empty data:**
   - Check diagnostic: `node diagnose-data-retrieval.js`
   - Verify students exist in database
   - Check if filters are too restrictive

4. **If response has data but UI is empty:**
   - Check browser console for rendering errors
   - Clear cache: DevTools → Storage → Clear All
   - Reload page

---

## Quick Test Script

Run this to simulate the entire data retrieval flow:

```bash
node test-data-retrieval.js
```

This will:
1. Test backend health
2. Test login
3. Fetch students
4. Filter by class
5. Report results

---

## The 5-Minute Fix

If data isn't showing, run this sequence:

```bash
# 1. Check database has data
node diagnose-data-retrieval.js

# 2. Check API works
node test-data-retrieval.js

# 3. If no data, add some test data
# Open Supabase → users table → Insert row
# Fill: register_no='24001', name='Test', class='10-A', role='student', password='pwd'

# 4. Reload browser
# F5 in browser

# 5. Try again
# Should see data now
```

---

## Still Not Working? Debug Checklist

### Backend Issues
- [ ] Backend running? (See "School Management Backend Started")
- [ ] Database connected? (No "FATAL" errors)
- [ ] Database URL correct? (Check backend/.env)
- [ ] Port 5000 not used? (Check with: netstat -ano | findstr :5000)

### Database Issues
- [ ] Database has students? (Run diagnostic)
- [ ] Students have class values? (Not NULL)
- [ ] Students have status? (Should be 'Active')
- [ ] No duplicate register numbers? (Diagnostic checks this)

### API Issues
- [ ] Health endpoint works? (curl http://localhost:5000/api/health)
- [ ] Login works? (Get token successfully)
- [ ] Students endpoint responds? (Check status 200)
- [ ] Response has data? (data array is not empty)

### Frontend Issues
- [ ] VITE_API_URL correct? (http://localhost:5000/api)
- [ ] Token in localStorage? (DevTools → Application → Storage)
- [ ] No CORS errors? (DevTools → Console)
- [ ] No 401 errors? (Token still valid)

### Filter Issues
- [ ] Class names match exactly? (10-A not 10A)
- [ ] Status is 'Active'? (Not 'Inactive' or NULL)
- [ ] Filters not too restrictive? (Try "show all")
- [ ] Browser cache cleared? (F12 → Storage → Clear All)

---

## Getting Detailed Logs

**Backend logs:**
```
Look at the terminal where "npm run dev" is running
Copy any error messages that appear
```

**Frontend logs:**
```
Press F12 → Console tab
Copy any red error messages
```

**Network logs:**
```
Press F12 → Network tab
Click "Fetch/XHR"
Try to fetch data
Right-click failed request → Copy as cURL
```

**Database logs:**
```
Check if database is responding
psql $(grep DATABASE_URL backend/.env | cut -d= -f2)
SELECT COUNT(*) FROM users WHERE role = 'student';
```

---

## Success Checklist

When everything is working:
- ✓ Backend starts without errors
- ✓ Database connected successfully  
- ✓ Can log in
- ✓ Dashboard loads
- ✓ Students visible in class
- ✓ Filters work (show/hide students)
- ✓ No errors in console (F12)
- ✓ No errors in backend logs
- ✓ Network requests return 200

---

## Still Stuck?

1. **Run diagnostic:**
   ```bash
   node diagnose-data-retrieval.js > diagnostic.txt
   node test-data-retrieval.js > test.txt
   ```

2. **Collect information:**
   - diagnostic.txt output
   - test.txt output
   - Backend console output
   - Frontend console errors (F12)
   - Network tab failures (F12 → Network)

3. **Check documentation:**
   - FRONTEND_BACKEND_DATABASE_CONNECTION.md
   - CONNECTION_QUICK_REFERENCE.md
   - DATA_RETRIEVAL_DIAGNOSTIC.md

4. **Most likely issues (in order):**
   - No students in database (add via admin dashboard)
   - Students have no class value (update SQL)
   - Backend not running (npm run dev)
   - Wrong database credentials (check .env)
   - CORS misconfigured (check FRONTEND_URL)

