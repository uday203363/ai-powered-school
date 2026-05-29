## 🔍 STEP-BY-STEP DEBUG GUIDE FOR MARKS NOT SHOWING

### Setup:
1. **Refresh browser:** `Ctrl+Shift+R`
2. **Open DevTools:** Press `F12`
3. **Go to Console tab** and keep it open

---

## TEST PROCEDURE:

### STEP 1: LOAD CLASS AND VERIFY MARKS IN CLASS
1. Go to **Teacher Dashboard** → **Marks tab**
2. A class should be pre-selected
3. **In Console**, look for:
   ```
   ✅ FINAL MARKS STATE SET: { totalMarksLoaded: X }
   ```
   - If `totalMarksLoaded: 0` → No marks in this class yet (expected on first test)
   - If `totalMarksLoaded: 1+` → Marks exist in database

### STEP 2: ADD FIRST MARK
1. Click **"+ Add Marks"** button
2. **Select a Student** (e.g., "Alice")
3. **Select Subject** (e.g., "Math")
4. **Select Exam** (e.g., "FA-1")
5. **Enter Marks** (e.g., "45")
6. Click **"Create"**
7. **In Console**, watch for:
   ```
   ✅ MARKS ADDED SUCCESSFULLY: {
     student_id: "uuid-...",
     subject: "Math",
     marks: 45
   }
   ⏳ Reloading fresh data after marks added...
   ✅ FINAL MARKS STATE SET: { totalMarksLoaded: 1 }
   📋 FIRST 3 MARKS STRUCTURE:
     Mark 1: { student_id: "uuid-...", student_name: "Alice", ... }
   ```

### STEP 3: SELECT SAME STUDENT AGAIN
1. Modal should have closed
2. Click **"+ Add Marks"** again
3. **Select the SAME Student** (Alice)
4. **In Console**, look for the FILTER COMPLETE log:
   ```
   ✅ FILTER COMPLETE: {
     selectedStudentId: "uuid-...",
     selectedStudent: "Alice",
     totalMarksInClass: 1,          ← Count from step 2
     foundMarks: 1,                 ← Should be 1 (the mark we added)
     marksDetails: [
       { subject: "Math", exam: "FA-1", marks: 45 }
     ]
   }
   ```

---

## EXPECTED RESULTS:

✅ **If Working Correctly:**
- After selecting Alice again, you should see:
  - **Green box** showing "✅ Marks Already Added (1)"
  - Details showing: "Math • FA-1 (2026-2027) 45/50"

❌ **If Still Broken:**
- You'll see **Blue box** saying "📝 No marks added yet"
- `foundMarks: 0` in console (marks not being found)

---

## DEBUGGING CHECKS:

### Check 1: Student IDs Match?
In console logs, compare:
- `selectedStudentId:` (when you select in dropdown)
- `Mark 1: { student_id: ... }` (from database)

They should be **identical** (same UUID)

### Check 2: Marks Array Structure
Look at `📋 FIRST 3 MARKS STRUCTURE` log:
- Should have: `student_id`, `student_name`, `subject`, `exam_name`, `marks`, `total`
- If missing `student_name` → Data flattening issue

### Check 3: Filter Logic
Look at filter loop logs (first 5):
```
Check 1: { markStudentId: "uuid-1", selectedId: "uuid-1", matches: true }
Check 2: { markStudentId: "uuid-2", selectedId: "uuid-1", matches: false }
```
If all show `matches: false` → Student IDs are different

---

## WHAT TO SHARE IF STILL NOT WORKING:

Copy entire console output showing:
1. ✅ FINAL MARKS STATE SET log
2. ✅ MARKS ADDED SUCCESSFULLY log  
3. ✅ FILTER COMPLETE log

Highlight:
- What `totalMarksLoaded` shows
- What `foundMarks` shows
- Any mismatched student IDs

---

## QUICK TESTS:

**Test A: Brand New Database** (all marks cleared)
1. Clear all marks: Run DELETE query in Supabase
2. Add mark for Student "Alice"
3. Select Alice again → Should show mark

**Test B: Multiple Marks**
1. Add 2 marks for Alice (Math + Science)
2. Select Alice → Should show 2 marks
3. Select Different Student → Should show 0 marks

**Test C: Different Exam**
1. Add mark for Alice in FA-1
2. Add another mark for Alice in FA-2
3. Select Alice → Should show 2 marks for different exams

