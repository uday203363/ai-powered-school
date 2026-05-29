# 🔧 Complete Database Issue Fixes

## Quick Fix (5 Minutes)

### Option 1: Run SQL in Supabase Dashboard (Easiest)

1. **Go to Supabase Console**
   - URL: https://app.supabase.com
   - Select your project: "yqgjekjsggpzzxjuzpvt"

2. **Open SQL Editor**
   - Click "SQL Editor" in left sidebar
   - Click "New Query"

3. **Copy and Paste the Fix Script**
   ```
   Open: FIX_DATABASE_ISSUES.sql (in your project root)
   Copy ALL the contents
   Paste into Supabase SQL Editor
   Click "Run"
   ```

4. **Wait for Completion**
   - You should see: `executed successfully`
   - If errors, scroll down to see which part failed

5. **Verify Results**
   - You should see at the bottom:
   ```
   total_users: X
   role | count
   admin | 1
   student | 4
   teacher | 1
   ```

6. **Done!**
   - Go back to frontend
   - Refresh browser (F5)
   - Log in and check if data appears

---

## What the Fix Script Does

### ✅ Creates All Required Tables
- ✓ marks - student marks/grades
- ✓ attendance - attendance records
- ✓ fees - fee management
- ✓ exams - exam definitions
- ✓ classes - class management
- ✓ class_config - class configuration

### ✅ Adds All Required Columns to Users
- ✓ role (admin, teacher, student)
- ✓ register_no (unique identifier)
- ✓ name, class, phone
- ✓ password, status
- ✓ admission_year, father_name
- ✓ initial_fee, current_fee
- ✓ And 10+ more fields

### ✅ Inserts Test Data
If your database is empty, it adds:
- 1 Admin user (login: admin / password: admin123)
- 4 Test students in classes 10-A and 10-B
- 1 Test teacher

### ✅ Creates Indexes
- Faster queries on commonly searched fields
- Better performance for filters

### ✅ Fixes Common Issues
- ✓ Ensures students have proper status
- ✓ Fixes class name format (10-A not 10A)
- ✓ Sets missing admission years
- ✓ Validates data integrity

---

## Step-by-Step Fix (With Screenshots)

### Step 1: Go to Supabase Console

Open in browser: https://app.supabase.com/projects

You should see your project listed.

### Step 2: Select Your Project

Click on: **yqgjekjsggpzzxjuzpvt** (your project name)

### Step 3: Open SQL Editor

Left sidebar → **SQL Editor** → **New Query**

A new editor tab opens.

### Step 4: Copy Fix Script

From your PC:
```
Open file: FIX_DATABASE_ISSUES.sql
Select All (Ctrl+A)
Copy (Ctrl+C)
```

### Step 5: Paste in Supabase

In the Supabase SQL Editor:
```
Click in the editor area
Paste (Ctrl+V)
All the SQL code should appear
```

### Step 6: Run the Script

Click the **Run** button (or Ctrl+Enter)

The script will execute. This takes about 5-10 seconds.

### Step 7: Check Results

Scroll to the bottom of the output. You should see:

```
total_users: 5

register_no | name           | class | status | admission_year
24001       | Raj Kumar      | 10-A  | Active | 2024
24002       | Priya Singh    | 10-A  | Active | 2024
24003       | Anuj Patel     | 10-B  | Active | 2024
24004       | Maya Sharma    | 10-B  | Active | 2024
T001        | Mr. Gupta      | NULL  | Active | 2024
```

If you see this, the fix worked!

### Step 8: Test in Frontend

1. Refresh browser (F5)
2. Log out if logged in
3. Log in with: 
   - **Register No:** admin
   - **Password:** admin123
4. Click on "Admin Dashboard"
5. Look for student data

Should now see the 4 test students!

---

## Troubleshooting the Fix

### Issue 1: SQL Error on Line 10

**Error:** `column "email" does not exist`

**Cause:** Users table structure is different

**Solution:**
1. Go to Supabase Dashboard
2. Click "Table Editor" in left sidebar
3. Click "users" table
4. Look at the columns
5. Note which columns exist
6. Modify the FIX_DATABASE_ISSUES.sql to only add missing columns

### Issue 2: Script Hangs

**Problem:** Running script for more than 1 minute

**Solution:**
1. Click "Stop" button
2. Reload page (F5)
3. Try running in smaller chunks:
   - Run just the CREATE TABLE sections first
   - Then run the ALTER TABLE sections
   - Then run the INSERT sections

### Issue 3: RLS Error

**Error:** `new row violates row-level security policy`

**Cause:** Row Level Security is blocking insertions

**Solution:** 
Run this command FIRST before the fix script:

```sql
-- Disable RLS on all tables temporarily
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE marks DISABLE ROW LEVEL SECURITY;
ALTER TABLE attendance DISABLE ROW LEVEL SECURITY;
ALTER TABLE fees DISABLE ROW LEVEL SECURITY;
ALTER TABLE exams DISABLE ROW LEVEL SECURITY;
ALTER TABLE classes DISABLE ROW LEVEL SECURITY;
ALTER TABLE class_config DISABLE ROW LEVEL SECURITY;
```

Then run the FIX_DATABASE_ISSUES.sql script.

Then re-enable RLS (optional, for security):
```sql
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE marks ENABLE ROW LEVEL SECURITY;
-- etc.
```

### Issue 4: "Cannot insert duplicate key"

**Error:** `duplicate key value violates unique constraint "users_register_no_key"`

**Cause:** Test data already exists

**Solution:** This is OK! It means:
- The fix script detected the data already exists
- It skipped adding duplicates
- Your data is safe

Just continue to next step.

---

## Verify Database is Fixed

After running the fix script, verify with these queries:

### Check 1: Count All Users
```sql
SELECT COUNT(*) as total FROM users;
```
Should return: **5 or more**

### Check 2: Count by Role
```sql
SELECT role, COUNT(*) FROM users GROUP BY role;
```
Should return:
```
admin | 1
student | 4
teacher | 1
```

### Check 3: List All Students
```sql
SELECT register_no, name, class, status FROM users WHERE role = 'student';
```
Should return:
```
24001 | Raj Kumar | 10-A | Active
24002 | Priya Singh | 10-A | Active
24003 | Anuj Patel | 10-B | Active
24004 | Maya Sharma | 10-B | Active
```

### Check 4: Check Tables Exist
```sql
-- Should return rows if tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('marks', 'attendance', 'fees', 'exams', 'classes');
```

---

## After Fix - What to Do

### 1. Test Login
- Open http://localhost:5175
- Register No: **admin**
- Password: **admin123**
- Click Login

### 2. Check Admin Dashboard
- Should see student count
- Should see class list
- Should see 4 students total

### 3. Add Your Own Data
- Go to "Student Registration" tab
- Add your actual student data
- Can delete test data later if needed

### 4. Test Data Retrieval
- Click on "10-A" class
- Should see 2 students (Raj Kumar, Priya Singh)
- Click on "10-B" class
- Should see 2 students (Anuj Patel, Maya Sharma)

---

## Manual Fix (If Script Fails)

If the fix script has issues, run these commands one by one:

### Part 1: Ensure Users Table Has All Columns
```sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'student';
ALTER TABLE users ADD COLUMN IF NOT EXISTS register_no TEXT UNIQUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS class TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Active';
ALTER TABLE users ADD COLUMN IF NOT EXISTS admission_year INTEGER;
```

### Part 2: Insert Test Data
```sql
INSERT INTO users (email, name, role, register_no, password)
VALUES ('admin@school.com', 'Admin User', 'admin', 'admin', 'admin123')
ON CONFLICT (register_no) DO NOTHING;

INSERT INTO users (email, name, role, register_no, class, password, admission_year, status)
VALUES 
  ('s1@school.com', 'Raj Kumar', 'student', '24001', '10-A', 'pwd', 2024, 'Active'),
  ('s2@school.com', 'Priya Singh', 'student', '24002', '10-A', 'pwd', 2024, 'Active'),
  ('s3@school.com', 'Anuj Patel', 'student', '24003', '10-B', 'pwd', 2024, 'Active'),
  ('s4@school.com', 'Maya Sharma', 'student', '24004', '10-B', 'pwd', 2024, 'Active')
ON CONFLICT (register_no) DO NOTHING;
```

### Part 3: Verify
```sql
SELECT register_no, name, class FROM users WHERE role = 'student';
```

---

## Clean Up (Optional)

### Delete Test Data
```sql
-- Delete all test students
DELETE FROM users WHERE register_no IN ('24001', '24002', '24003', '24004');

-- Delete test teacher
DELETE FROM users WHERE register_no = 'T001';

-- Keep the admin user for login
```

### Rebuild from Scratch
```sql
-- DANGER: This deletes everything!
-- Only run if you want to start fresh

DELETE FROM marks;
DELETE FROM attendance;
DELETE FROM fees;
DELETE FROM exams;
DELETE FROM classes;
DELETE FROM class_config;
DELETE FROM users WHERE role != 'admin';
```

---

## Success Checklist

- [ ] Opened Supabase Dashboard
- [ ] Navigated to SQL Editor
- [ ] Copied FIX_DATABASE_ISSUES.sql
- [ ] Pasted and ran in Supabase
- [ ] Verified 5+ users exist
- [ ] Verified admin user exists
- [ ] Verified 4 test students exist
- [ ] Refreshed frontend
- [ ] Can log in with admin/admin123
- [ ] Can see dashboard
- [ ] Can see student list
- [ ] Can filter by class
- [ ] Data is displaying correctly

If all checked, database is fixed! ✅

