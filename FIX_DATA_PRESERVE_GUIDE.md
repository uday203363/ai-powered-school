# Preserve Your Data - Database Fix Guide

## ⚠️ Important
This script **KEEPS your existing data** and only:
- ✅ Creates missing tables
- ✅ Adds missing columns
- ✅ Fixes data issues (class format, status, etc.)
- ❌ Does NOT insert test data
- ❌ Does NOT delete anything

---

## 🚀 How to Run (5 minutes)

### Step 1: Open Supabase Console
Go to: https://app.supabase.com/projects

### Step 2: Select Your Project
Click on: `yqgjekjsggpzzxjuzpvt`

### Step 3: Open SQL Editor
- Left sidebar → **SQL Editor**
- Click **New Query**

### Step 4: Copy the Fix Script
Open file: `FIX_DATABASE_PRESERVE_DATA.sql`
Copy entire contents (Ctrl+A, Ctrl+C)

### Step 5: Paste & Run
- Paste into Supabase SQL Editor (Ctrl+V)
- Click **Run** (or Ctrl+Enter)
- Wait for green checkmark ✅

---

## ✅ How to Verify It Worked

After running the script, scroll to the bottom of the editor. You'll see 4 verification queries:

### Query 1: Count Total Users
```
total_users
-----------
     45
```
Shows how many users you have (your number will vary).

### Query 2: Users by Role
```
   role    | count
-----------+-------
   admin   |   2
  teacher  |   5
  student  |  38
```
Shows breakdown by role.

### Query 3: Students by Class
```
  class  | count
---------+-------
  10-A   |   8
  10-B   |   7
  11-A   |   9
  11-B   |   8
  12-A   |   3
  12-B   |   3
```
Shows students in each class (your numbers will vary).

### Query 4: All Your Students
```
 register_no |    name     | class | status | admission_year
-------------+-------------+-------+--------+----------------
 24001       | Raj Kumar   | 10-A  | Active |     2024
 24002       | Priya Singh | 10-A  | Active |     2024
 ...
```
Shows ALL your student records.

### Query 5: Data Quality Check
```
              issue           | count
------------------------------+-------
Students with NULL status     |   0
Students with NULL class      |   0
Students with NULL admission  |   0
```

**✅ Perfect!** If all are 0, your data is clean.

---

## 🔍 What Gets Fixed

### Issue 1: Missing Tables ✅
If you don't have these tables, they're created:
- marks
- attendance
- fees
- exams
- classes
- class_config

### Issue 2: Missing Columns ✅
If users table is missing these columns, they're added:
- role
- register_no
- name
- class
- status
- admission_year
- password
- phone
- father_name
- gender
- accommodation_type
- initial_fee
- current_fee
- ...and more

### Issue 3: Class Name Formats ✅
**Before:**
```
10A, 10a, 10-a
10B, 10b, 10-b
```

**After:**
```
10-A (all converted to this format)
10-B (all converted to this format)
11-A, 11-B, 12-A, 12-B (same)
```

This fixes the problem where filters don't work because class names don't match.

### Issue 4: NULL Status ✅
**Before:**
```
register_no | status
----------+--------
24001     | NULL       ❌ (won't show in dashboard)
24002     | Inactive   ✅ (shows correctly)
```

**After:**
```
register_no | status
----------+--------
24001     | Active     ✅ (now shows!)
24002     | Inactive   ✅ (unchanged)
```

### Issue 5: NULL Admission Year ✅
**Before:**
```
register_no | admission_year
----------+---------------
24001     | NULL           ❌ (incomplete)
24002     | 2024           ✅ (shows)
```

**After:**
```
register_no | admission_year
----------+---------------
24001     | 2024           ✅ (auto-filled with current year)
24002     | 2024           ✅ (unchanged)
```

### Issue 6: Database Indexes ✅
Creates indexes for fast searching:
- Fast login by register_no
- Fast filtering by class
- Fast filtering by role
- Fast search by student name

---

## ⚡ What Happens to Your Data

### Your Data is Safe! ✅
✅ All existing students stay  
✅ All existing marks stay  
✅ All existing attendance stays  
✅ All existing fees stay  
✅ All existing exams stay  
✅ All existing user accounts stay  

### Only Changes Made
✅ Adds missing columns (with default values)  
✅ Fixes class name format (10A → 10-A)  
✅ Fixes missing status (NULL → Active)  
✅ Fixes missing admission_year (NULL → 2024)  

No deletions, no overwrites, no data loss!

---

## 🛠️ If Something Goes Wrong

### Error: "Relation already exists"
This is OK - it means the table already exists. Script skips it.

### Error: "Column already exists"
This is OK - it means the column already exists. Script skips it.

### Error: "Foreign key violation"
This means a student_id in marks/attendance/fees doesn't exist in users table.

**Fix:** Contact support, we can fix mismatched IDs.

### Error: "Unique constraint violation"
This means duplicate register_no values.

**Fix:** Check your students for duplicate register numbers and fix manually.

---

## 📊 After Running the Script

### In Supabase
- All required tables exist ✓
- All required columns exist ✓
- Data is clean and valid ✓
- Indexes are created for speed ✓

### In Your Frontend Dashboard
1. Refresh browser (F5)
2. Log in (if you had an admin user)
3. Should see all your students
4. Filters should work correctly
5. Data should display properly

---

## 🎯 Next Steps

1. **Run the script** (copy FIX_DATABASE_PRESERVE_DATA.sql to Supabase)
2. **Refresh browser** (F5)
3. **Log in** with your admin credentials
4. **Check dashboard** - all your students should appear
5. **Test filtering** - click a class name, should show students

---

## ❓ Questions About Your Data

### "My students still aren't showing!"
Check these in Supabase SQL Editor:

```sql
-- See all your students
SELECT register_no, name, class, status FROM users 
WHERE role = 'student' 
ORDER BY register_no;

-- Check if they have NULL class
SELECT COUNT(*) FROM users 
WHERE role = 'student' AND class IS NULL;

-- Check if they have NULL status
SELECT COUNT(*) FROM users 
WHERE role = 'student' AND status IS NULL;
```

### "Class filters show 0 students!"
Your class names might not match. Check:

```sql
-- See all unique class names
SELECT DISTINCT class FROM users 
WHERE role = 'student' 
ORDER BY class;
```

If you see format like `10A` or `10a`, the script will fix it to `10-A`.

### "I need to add an admin user to log in"
Run this in Supabase:

```sql
INSERT INTO users (email, name, role, register_no, password, status)
VALUES ('admin@school.com', 'Admin User', 'admin', 'admin', 'admin123', 'Active')
ON CONFLICT (register_no) DO NOTHING;
```

Then login with:
- Register No: `admin`
- Password: `admin123`

---

## 📝 File Reference

- **Script:** FIX_DATABASE_PRESERVE_DATA.sql
- **Old Script (with test data):** FIX_DATABASE_ISSUES.sql
- **Quick Fixes:** DATABASE_QUICK_FIXES.md
- **Complete Implementation Guide:** DATABASE_FIX_GUIDE.md

Choose the right script based on what you need:
- **Your own data?** → Use FIX_DATABASE_PRESERVE_DATA.sql ✅
- **Need test data?** → Use FIX_DATABASE_ISSUES.sql
