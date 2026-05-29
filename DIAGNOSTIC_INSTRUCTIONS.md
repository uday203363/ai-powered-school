## Diagnostic Steps for Foreign Key Error

The error `"foreign key constraint fees_student_id_fkey"` means the `student_id` being inserted into the `fees` table doesn't exist in the `users` table.

### Step 1: Run the SQL Diagnostic

1. **Open Supabase** → Go to your project
2. **Go to SQL Editor** (left sidebar)
3. **Create a new query**
4. **Copy ALL the queries** from `DIAGNOSE_FEE_FK_ERROR.sql`
5. **Run them** one by one or all together
6. **Check the results** for:

### Step 2: Check Query Results

**Critical Queries to Check:**

**Query 4 Output:**
```
Should show:
total_students: (some number > 0)
active_students: (some number > 0)
students_with_role: (some number > 0)
```
❌ If all are 0 → No students in database!

**Query 5 Output:**
```
Should show a list of students like:
id                                   | register_no | name  | class | status | role    | current_fee
12345678-1234-1234-1234-123456789abc | SBPS001    | John  | 10-A  | Active | student | 50000
```
❌ If empty → No students found!

**Query 6 Output:**
```
Should show no rows (empty result)
```
❌ If shows rows → Duplicate student IDs (data corruption)

**Query 7 Output:**
```
Should show:
total_fees: X
unique_students_with_fees: Y
```
ℹ️ If 0 fees → Database hasn't had fees inserted yet (normal)

**Query 8 Output:**
```
Should show no rows (empty result)
```
❌ If shows rows → Orphaned fees (student deleted but fees remain)

**Query 9 Output:**
```
Should show:
null_student_ids: 0
```
❌ If > 0 → Corrupted fees table!

**Query 10 Output:**
```
Replace 'Class Name' with your actual class name.
Should show students in that class.
```
❌ If empty → Class name might be different (case sensitivity)

### Step 3: Check What the Issue Is

Based on the results:

**If Query 4 shows 0 students:**
- ✅ SOLUTION: Add students first through the app before trying to add fees

**If Query 5 shows students but they have NULL ids:**
- ✅ SOLUTION: Data corruption. Contact admin to rebuild student records

**If Query 6 shows duplicate IDs:**
- ✅ SOLUTION: Data corruption. Delete duplicates or contact admin

**If Query 10 shows no results:**
- ✅ SOLUTION: Class name might be capitalized differently
- Try: SELECT DISTINCT class FROM users WHERE role = 'student'

**If Query 5 shows students but Query 10 is empty:**
- ✅ SOLUTION: The class name doesn't match exactly
- Check for spaces, different capitalization, or special characters

### Step 4: Test Manual Insert

Uncomment Query 11 in the SQL file and run it to test if you can manually insert a fee:

1. Find the commented section (starts with `DO $$`)
2. Remove the `/*` at the start and `*/` at the end
3. Run it
4. If it works, there's an issue with how the app is passing the student_id
5. If it fails, there's a database constraint issue

### What to Share With Me:

When you run these diagnostics, share:

1. **Result of Query 4:** How many students exist?
2. **Result of Query 5:** Show 2-3 student records (with IDs)
3. **Result of Query 10:** What class names show up? Try to match your class name
4. **Result of Query 11:** Does manual insert work or fail?
5. **Any error messages** from the queries

This will help me identify if:
- Students don't actually exist (data issue)
- Class name mismatch (configuration issue)
- Database constraint issue (corruption)
- RLS policy blocking inserts (security issue)