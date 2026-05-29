# Fix Class Strength in Supabase - Step by Step Guide

## Problem
The class dropdown in the admin dashboard shows incorrect current student count. This happens because:
1. The `current_students` count in `class_config` table gets out of sync
2. No automatic triggers exist to keep the count updated
3. Manual RPC calls might not be executing properly

## Solution - 3 Steps

### STEP 1: Recalculate Current Class Counts (IMMEDIATE FIX)

1. Go to your **Supabase Dashboard**
2. Navigate to **SQL Editor**
3. Click **"New Query"**
4. Copy and paste this SQL:

```sql
-- Recalculate actual student counts from users table
UPDATE public.class_config 
SET current_students = (
    SELECT COUNT(*) 
    FROM public.users 
    WHERE users.class = class_config.class_name 
      AND users.role = 'student' 
      AND users.status = 'Active'
),
updated_at = CURRENT_TIMESTAMP;

-- Show results
SELECT 
    class_name,
    max_students,
    current_students,
    (max_students - current_students) as available_seats
FROM public.class_config
ORDER BY class_name;
```

5. Click **"Run"** button
6. You should see all classes with corrected `current_students` count

---

### STEP 2: Add Automatic Triggers (PERMANENT FIX)

These triggers will automatically update class counts when students are added/edited/deleted.

1. In the same **SQL Editor**, create **New Query**
2. Copy and paste the complete trigger setup from: `ADD_CLASS_COUNT_TRIGGERS.sql`
3. Click **"Run"** button
4. You should see message: "Triggers created successfully!"

**What this does:**
- ✅ Auto-increment `current_students` when new student is added
- ✅ Auto-decrement when student is deleted or becomes inactive  
- ✅ Auto-handle when student changes class
- ✅ Auto-recalculate for status changes (Active/Inactive)

---

### STEP 3: Verify the Fix Works

1. Go back to your application
2. Go to **Admin > Student Registration**
3. Try adding a new student to a class
4. The class dropdown should now show:
   - Correct count immediately
   - Updated strength in real-time

---

## How to Check Class Counts in Supabase

### View current class configuration:
```sql
SELECT class_name, max_students, current_students 
FROM public.class_config 
ORDER BY class_name;
```

### View actual students per class:
```sql
SELECT 
    class,
    COUNT(*) as total_count,
    COUNT(CASE WHEN status = 'Active' THEN 1 END) as active_count
FROM public.users
WHERE role = 'student'
GROUP BY class
ORDER BY class;
```

### Check if triggers are working:
```sql
SELECT trigger_name, event_manipulation, event_object_table
FROM information_schema.triggers
WHERE event_object_table = 'users'
ORDER BY trigger_name;
```

---

## Files Provided

1. **FIX_CLASS_STRENGTH.sql** - Recalculate counts (Run this FIRST)
2. **ADD_CLASS_COUNT_TRIGGERS.sql** - Add automatic triggers (Run this SECOND)

## Expected Results After Fix

✅ Class dropdown shows accurate current/max students
✅ Count updates immediately when student is added
✅ Count decreases when student is deleted/marked inactive
✅ Count adjusts when student changes class
✅ No more manual refresh needed

## Troubleshooting

**Still showing wrong count?**
- Make sure you ran the FIRST SQL (FIX_CLASS_STRENGTH.sql)
- Reload the page to clear browser cache
- Check browser console for any errors

**Triggers not working?**
- Check if triggers were created successfully (Step 2)
- Verify in Supabase: Database > Triggers
- Make sure RLS policies aren't blocking updates

**Need to manually fix again?**
- Just run Step 1 SQL again to recalculate
- It's safe to run multiple times
