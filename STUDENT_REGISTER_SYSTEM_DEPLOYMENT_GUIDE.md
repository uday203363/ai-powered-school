# Student Register System - Deployment & Migration Checklist

## Pre-Deployment Checklist

### 1. Database Setup
- [ ] Open Supabase project dashboard
- [ ] Go to SQL Editor
- [ ] Copy entire contents of `DATABASE_MIGRATION_REGISTER_SYSTEM.sql`
- [ ] Paste and execute the migration
- [ ] Verify all tables created:
  ```bash
  SELECT table_name FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name IN ('student_register_sequence', 'student_audit_log', 'users');
  ```
- [ ] Verify all functions created:
  ```bash
  SELECT routine_name FROM information_schema.routines 
  WHERE routine_schema = 'public';
  ```

### 2. Code Integration
- [ ] Copy `src/services/registerNumber.ts` to project
- [ ] Copy `src/services/studentService.ts` to project
- [ ] Copy `src/services/studentFilter.ts` to project
- [ ] Copy `src/services/studentTestSuite.ts` to project
- [ ] Update `src/services/index.ts` with new exports
- [ ] Verify all imports resolve correctly
- [ ] Check TypeScript compilation: `npm run build`

### 3. Configuration
- [ ] Update school code in `registerNumber.ts`:
  ```typescript
  SCHOOL_CODE: 'YOUR_CODE' // e.g., 'SBPS'
  ```
- [ ] Update school name if needed
- [ ] Verify all configuration constants

### 4. Testing
- [ ] Run full test suite:
  ```typescript
  import { runAllTests } from './services/studentTestSuite';
  await runAllTests();
  ```
- [ ] Verify test output in console
- [ ] Check for any errors or failures
- [ ] Manual testing with sample data

### 5. Documentation Review
- [ ] Read `STUDENT_REGISTER_SYSTEM_README.md`
- [ ] Read `docs/STUDENT_REGISTER_SYSTEM_DESIGN.md`
- [ ] Read `docs/STUDENT_MANAGEMENT_IMPLEMENTATION_GUIDE.md`
- [ ] Share documentation with team

### 6. Admin Interface Updates (Optional)
- [ ] Review `ClassManagementTab.tsx` for compatibility
- [ ] Update student creation to use new `createStudent()` function
- [ ] Add status management UI (Deactivate, Reactivate, Transfer, Drop)
- [ ] Add search & filter components
- [ ] Add bulk operations UI

---

## Migration Path (From Old System to New System)

### Step 1: Backup Existing Data
```sql
-- Create backup table
CREATE TABLE users_backup AS SELECT * FROM users;
CREATE TABLE marks_backup AS SELECT * FROM marks;
CREATE TABLE attendance_backup AS SELECT * FROM attendance;
CREATE TABLE fees_backup AS SELECT * FROM fees;
```

### Step 2: Add New Columns
```sql
-- Already done in migration script
-- Verify columns exist:
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'users' 
AND column_name IN ('register_no', 'admission_year', 'status');
```

### Step 3: Populate Admission Year (if not set)
```sql
UPDATE users 
SET admission_year = COALESCE(
  EXTRACT(YEAR FROM created_at)::INTEGER, 
  EXTRACT(YEAR FROM CURRENT_TIMESTAMP)::INTEGER
)
WHERE role = 'student' AND admission_year IS NULL;
```

### Step 4: Generate New Register Numbers
```sql
-- For each existing student, generate new register number
UPDATE users u
SET register_no = (
  SELECT get_next_register_number(u.admission_year, 'SBPS')
)
WHERE role = 'student' AND register_no IS NULL;
```

### Step 5: Update Related Tables
```sql
-- Populate register_no in marks
UPDATE marks m
SET register_no = (SELECT register_no FROM users WHERE id = m.student_id)
WHERE register_no IS NULL;

-- Populate register_no in attendance
UPDATE attendance a
SET register_no = (SELECT register_no FROM users WHERE id = a.student_id)
WHERE register_no IS NULL;

-- Populate register_no in fees
UPDATE fees f
SET register_no = (SELECT register_no FROM users WHERE id = f.student_id)
WHERE register_no IS NULL;
```

### Step 6: Verify Data Integrity
```sql
-- Check for NULL register_no
SELECT COUNT(*) FROM users WHERE role = 'student' AND register_no IS NULL;

-- Check for NULL admission_year
SELECT COUNT(*) FROM users WHERE role = 'student' AND admission_year IS NULL;

-- Check for duplicate register numbers
SELECT register_no, COUNT(*) FROM users 
GROUP BY register_no HAVING COUNT(*) > 1;

-- Result should be: 0, 0, 0 (no issues)
```

### Step 7: Update Application Code
```typescript
// Replace old studentService import
// OLD: import { studentService } from './database';
// NEW: import studentService from './studentService';

// Update all student creation calls
// OLD: await studentService.createStudent(...)
// NEW: await createStudent(...)
```

---

## Post-Deployment Checklist

### 1. Verify System
- [ ] Test student creation (should auto-generate register number)
- [ ] Test student retrieval (by register number)
- [ ] Test student update (verify register_no cannot be edited)
- [ ] Test status transitions (deactivate, reactivate, transfer, drop)
- [ ] Test filtering & search (by class, year, status, name)
- [ ] Test class roster retrieval
- [ ] Test audit log creation

### 2. Performance Validation
- [ ] Run load test with 1000 students
- [ ] Verify query response times (should be < 100ms)
- [ ] Check database connection pool
- [ ] Monitor server logs for errors

### 3. Data Validation
- [ ] Verify all students have valid register numbers
- [ ] Verify all register numbers are unique
- [ ] Verify all register numbers follow pattern
- [ ] Verify historical data is accessible
- [ ] Verify audit logs are being created

### 4. Access Control
- [ ] Verify active students can login
- [ ] Verify inactive students cannot login
- [ ] Verify transferred students cannot login
- [ ] Verify dropped students cannot login
- [ ] Verify teachers can see their class students
- [ ] Verify admins can see all students

### 5. Error Handling
- [ ] Test with invalid register numbers
- [ ] Test with duplicate emails
- [ ] Test with missing required fields
- [ ] Test with invalid status values
- [ ] Verify error messages are clear

---

## Implementation Timeline

### Phase 1: Setup (Day 1)
- [ ] Database migration
- [ ] Code integration
- [ ] Configuration
- [ ] Backup existing data

**Estimated Time:** 2-3 hours

### Phase 2: Testing (Day 1-2)
- [ ] Unit testing
- [ ] Integration testing
- [ ] Migration verification
- [ ] Performance testing

**Estimated Time:** 4-6 hours

### Phase 3: Rollout (Day 2-3)
- [ ] Update admin interface
- [ ] Train admin staff
- [ ] Monitor system for 24 hours
- [ ] Handle any issues

**Estimated Time:** 4-8 hours

### Total Estimated Time: 10-17 hours

---

## Rollback Plan

If issues occur, rollback using backups:

```sql
-- Restore from backups
TRUNCATE TABLE users CASCADE;
INSERT INTO users SELECT * FROM users_backup;

TRUNCATE TABLE marks CASCADE;
INSERT INTO marks SELECT * FROM marks_backup;

TRUNCATE TABLE attendance CASCADE;
INSERT INTO attendance SELECT * FROM attendance_backup;

TRUNCATE TABLE fees CASCADE;
INSERT INTO fees SELECT * FROM fees_backup;

-- Keep the new tables for reference
-- student_register_sequence, student_audit_log
```

---

## Performance Monitoring

### Queries to Monitor

```sql
-- Average query response time
SELECT
  mean_exec_time,
  calls,
  query
FROM pg_stat_statements
WHERE query LIKE '%users%'
ORDER BY mean_exec_time DESC;

-- Slow queries
SELECT
  query,
  calls,
  mean_exec_time,
  total_exec_time
FROM pg_stat_statements
WHERE mean_exec_time > 100
ORDER BY mean_exec_time DESC;

-- Index usage
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan,
  idx_tup_read,
  idx_tup_fetch
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC;
```

### Key Metrics to Track

| Metric | Target | Warning | Critical |
|--------|--------|---------|----------|
| Register No Lookup | < 10ms | > 50ms | > 100ms |
| Class Roster | < 50ms | > 200ms | > 500ms |
| Student Creation | < 500ms | > 1s | > 2s |
| Sequence Generation | < 100ms | > 500ms | > 1s |
| Page Load (20 students) | < 1s | > 2s | > 5s |

---

## Common Issues & Solutions

### Issue: Migration Fails with "relation already exists"
**Solution:**
```sql
-- Drop and recreate
DROP TABLE IF EXISTS student_register_sequence CASCADE;
DROP TABLE IF EXISTS student_audit_log CASCADE;
-- Re-run migration
```

### Issue: Register numbers not generating
**Solution:**
```sql
-- Check sequence
SELECT * FROM student_register_sequence;

-- If empty, insert initial record
INSERT INTO student_register_sequence 
(admission_year, school_code, current_sequence)
VALUES (EXTRACT(YEAR FROM CURRENT_TIMESTAMP)::INTEGER, 'SBPS', 0);
```

### Issue: Students can still login when deactivated
**Solution:**
Add login check:
```typescript
// Before allowing login
const { data } = await supabase
  .from('users')
  .select('status')
  .eq('register_no', registerNo)
  .single();

if (data?.status !== 'Active') {
  throw new Error('Account is ' + data?.status);
}
```

### Issue: Duplicate register numbers after migration
**Solution:**
```sql
-- Find duplicates
SELECT register_no, COUNT(*) FROM users 
GROUP BY register_no HAVING COUNT(*) > 1;

-- Delete duplicates (keep first)
DELETE FROM users WHERE id NOT IN (
  SELECT MIN(id) FROM users GROUP BY register_no
);
```

---

## Documentation Files

| File | Purpose |
|------|---------|
| `STUDENT_REGISTER_SYSTEM_README.md` | Quick reference & overview |
| `docs/STUDENT_REGISTER_SYSTEM_DESIGN.md` | Complete system design |
| `docs/STUDENT_MANAGEMENT_IMPLEMENTATION_GUIDE.md` | Detailed implementation guide |
| `DATABASE_MIGRATION_REGISTER_SYSTEM.sql` | Database migration script |
| `STUDENT_REGISTER_SYSTEM_DEPLOYMENT_GUIDE.md` | This file |

---

## Support Contact

- **System Administrator**: [Your IT Team]
- **Database Admin**: [Your DB Team]
- **Documentation**: See files above
- **Issues**: [Your Issue Tracker]

---

## Sign-Off

- [ ] **Developer**: Reviewed code implementation _______________
- [ ] **Database Admin**: Verified migration _______________
- [ ] **QA Lead**: Verified testing _______________
- [ ] **Admin Lead**: Trained on system _______________
- [ ] **CTO/Manager**: Approved for production _______________

**Date**: ________________  
**Version**: 1.0.0  
**Status**: Ready for Deployment

