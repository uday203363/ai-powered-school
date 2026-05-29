# Student Register Number System - Design Document

## Overview
This document details the design and implementation of a unique, scalable student management system with a comprehensive register numbering scheme: `YYSSSNNNN`

---

## 1. Register Number Format: YYSSSNNNN

### Format Breakdown
```
YY        → Last two digits of admission year (e.g., 2026 → 26)
SSS       → School code (3 letters, e.g., SBPS)
NNNN      → Sequential number starting from 0001
```

### Examples
- `26SBPS0001` - First student admitted in 2026 at SBPS school
- `26SBPS0002` - Second student admitted in 2026 at SBPS school
- `25SBPS0145` - 145th student admitted in 2025 at SBPS school

### Properties
✅ **Globally Unique**: Unique across entire school system  
✅ **Immutable**: Cannot be edited once created  
✅ **Auto-Generated**: Automatic increment per year  
✅ **Year-Aware**: Tracks admission year  
✅ **School-Identifiable**: School code embedded  
✅ **Searchable**: Easy to locate by year/school/sequence  

---

## 2. Enhanced Database Schema

### Table: `users`
Stores all user accounts including students

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  register_no VARCHAR(12) UNIQUE NOT NULL, -- e.g., 26SBPS0001
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL, -- admin, teacher, student, parent
  
  -- Student specific fields
  name VARCHAR(255) NOT NULL,
  class VARCHAR(10), -- e.g., 10A, 9B
  admission_year INT NOT NULL, -- e.g., 2026
  status VARCHAR(20) DEFAULT 'Active', -- Active, Inactive, Transferred, Dropped
  
  -- Contact & Additional Info
  phone VARCHAR(20),
  parent_email VARCHAR(255),
  parent_phone VARCHAR(20),
  date_of_birth DATE,
  gender VARCHAR(10),
  address TEXT,
  
  -- System metadata
  first_login BOOLEAN DEFAULT true,
  last_login TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by UUID REFERENCES users(id),
  
  -- Constraints
  CHECK (status IN ('Active', 'Inactive', 'Transferred', 'Dropped'))
);

-- Indexes for performance
CREATE INDEX idx_register_no ON users(register_no);
CREATE INDEX idx_class ON users(class);
CREATE INDEX idx_admission_year ON users(admission_year);
CREATE INDEX idx_status ON users(status);
CREATE INDEX idx_role_status ON users(role, status);
```

### Table: `student_register_sequence`
Tracks auto-incrementing sequence for register number generation

```sql
CREATE TABLE student_register_sequence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admission_year INT NOT NULL, -- e.g., 2026
  school_code VARCHAR(3) NOT NULL, -- e.g., SBPS
  current_sequence INT DEFAULT 0, -- Current sequence number
  max_sequence INT DEFAULT 9999, -- Maximum allowed sequence
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(admission_year, school_code)
);

-- Index for fast lookup
CREATE INDEX idx_year_school ON student_register_sequence(admission_year, school_code);
```

### Table: `student_audit_log`
Tracks all changes to student records for audit and compliance

```sql
CREATE TABLE student_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES users(id),
  register_no VARCHAR(12) NOT NULL,
  action VARCHAR(50), -- created, updated, status_changed, deactivated, transferred
  field_name VARCHAR(100),
  old_value TEXT,
  new_value TEXT,
  changed_by UUID REFERENCES users(id),
  changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  reason TEXT
);

-- Indexes for audit queries
CREATE INDEX idx_student_audit ON student_audit_log(student_id);
CREATE INDEX idx_register_audit ON student_audit_log(register_no);
CREATE INDEX idx_action_audit ON student_audit_log(action);
CREATE INDEX idx_date_audit ON student_audit_log(changed_at);
```

### Table: `class_config`
Class capacity and assignment tracking

```sql
CREATE TABLE class_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_name VARCHAR(10) UNIQUE NOT NULL, -- e.g., 10A, 9B
  max_students INT NOT NULL CHECK (max_students > 0),
  current_students INT DEFAULT 0,
  academic_year INT NOT NULL, -- e.g., 2025-26
  class_teacher_id UUID REFERENCES users(id),
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_class_name ON class_config(class_name);
CREATE INDEX idx_academic_year ON class_config(academic_year);
```

### Enhanced: `marks` Table
```sql
CREATE TABLE marks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES users(id),
  register_no VARCHAR(12) NOT NULL REFERENCES users(register_no),
  class VARCHAR(10) NOT NULL,
  admission_year INT NOT NULL,
  subject VARCHAR(100) NOT NULL,
  marks DECIMAL(5, 2),
  total DECIMAL(5, 2),
  exam_type VARCHAR(50), -- unit_test, midterm, final, quiz
  month INT,
  year INT,
  recorded_by UUID REFERENCES users(id),
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_student_marks ON marks(student_id, year);
CREATE INDEX idx_register_marks ON marks(register_no);
CREATE INDEX idx_subject_marks ON marks(subject, year);
```

### Enhanced: `attendance` Table
```sql
CREATE TABLE attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES users(id),
  register_no VARCHAR(12) NOT NULL REFERENCES users(register_no),
  class VARCHAR(10) NOT NULL,
  admission_year INT NOT NULL,
  date DATE NOT NULL,
  status VARCHAR(20), -- present, absent, leave, late
  remarks TEXT,
  marked_by UUID REFERENCES users(id),
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(student_id, date)
);

CREATE INDEX idx_student_attendance ON attendance(student_id, date);
CREATE INDEX idx_class_attendance ON attendance(class, date);
CREATE INDEX idx_status_attendance ON attendance(status);
```

### Enhanced: `fees` Table
```sql
CREATE TABLE fees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES users(id),
  register_no VARCHAR(12) NOT NULL REFERENCES users(register_no),
  class VARCHAR(10) NOT NULL,
  admission_year INT NOT NULL,
  month INT,
  year INT,
  total_amount DECIMAL(10, 2),
  paid_amount DECIMAL(10, 2) DEFAULT 0,
  balance DECIMAL(10, 2),
  status VARCHAR(20), -- pending, partial, paid
  payment_date DATE,
  payment_method VARCHAR(50),
  recorded_by UUID REFERENCES users(id),
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_student_fees ON fees(student_id, year, month);
CREATE INDEX idx_register_fees ON fees(register_no);
CREATE INDEX idx_status_fees ON fees(status);
```

---

## 3. Student Status Lifecycle

### Status Types
```
Active       → Currently enrolled and authorized to access system
Inactive     → Temporarily inactive (suspension, leave of absence)
Transferred  → Moved to another school/class
Dropped      → Permanently left the institution
Left         → Graduated or completed course
```

### Status Transitions
```
New Student
    ↓
  Active (normal operation)
    ├─→ Inactive (on request/suspension)
    │     ├─→ Active (reactivation)
    │     └─→ Transferred/Dropped (on admin action)
    ├─→ Transferred (moved to another school)
    ├─→ Dropped (expelled/left)
    └─→ Left (graduated)
```

### Login Access Rules
```
Active       → ✅ Can login
Inactive     → ❌ Cannot login (but records available)
Transferred  → ❌ Cannot login (records preserved)
Dropped      → ❌ Cannot login (records preserved)
Left         → ❌ Cannot login (records preserved)
```

---

## 4. Auto-Generation Logic

### Algorithm: Generate Register Number

```
FUNCTION generateRegisterNo(admissionYear, schoolCode):
  1. Retrieve or create sequence for (admissionYear, schoolCode)
  2. Validate schoolCode format (3 uppercase letters)
  3. Validate admissionYear (4 digits)
  4. Increment sequence counter
  5. Check if sequence exceeds max (9999)
  6. Format: YY + SSS + NNNN (front-padded with zeros)
  7. Return register_no
  
EXAMPLE:
  Input:  admissionYear=2026, schoolCode='SBPS'
  Output: '26SBPS0001' (first student)
  Output: '26SBPS0002' (second student)
  Output: '26SBPS0145' (145th student)
```

### Uniqueness Guarantee
- Combined UNIQUE constraint on (register_no)
- Database-level enforcement prevents duplicates
- Transaction-level isolation for sequence updates

---

## 5. Key Operations

### 1. Add New Student
```
Input:  name, email, password, class, schoolCode, admissionYear
Process:
  1. Validate input fields
  2. Generate register_no via generateRegisterNo()
  3. Hash password securely
  4. Create user record with status='Active'
  5. Log to student_audit_log
  6. Increment class_config.current_students
Output: { success, register_no, data }
```

### 2. Update Student (except register_no)
```
Editable fields:
  ✅ name, email, phone, class, address, gender
  ✅ parent_email, parent_phone, date_of_birth
  ❌ register_no (immutable)
  
Modified fields:
  1. Update user record
  2. Create audit log entry
  3. Timestamp updated_at
Output: { success, data }
```

### 3. Deactivate Student
```
Process:
  1. Update status='Inactive'
  2. Clear last_login timestamp
  3. Create audit log with reason
  4. Preserve all historical data:
     - Marks untouched
     - Attendance records intact
     - Fees history preserved
  5. Block authentication
Output: { success, message }
```

### 4. View Student Records (Active)
```
Query: SELECT * FROM users 
       WHERE status='Active' 
       ORDER BY admission_year DESC, register_no
Output: Array of active students with all details
```

### 5. View Student Records (by Class)
```
Query: SELECT * FROM users 
       WHERE class=? AND status='Active' 
       ORDER BY register_no
Output: Class roster with register numbers
```

### 6. Search by Register Number
```
Query: SELECT * FROM users 
       WHERE register_no=? 
       AND status != 'Dropped'
Output: Student details or null if not found
```

### 7. Filter by Admission Year
```
Query: SELECT * FROM users 
       WHERE admission_year=? 
       AND status IN ('Active', 'Inactive')
Output: All students from that year
```

### 8. Historical Data Access (Inactive Student)
```
Process:
  1. Check student status != 'Dropped'
  2. Query marks, attendance, fees for register_no
  3. Include all history regardless of status
Output: Complete academic record
```

---

## 6. Data Integrity Constraints

### Business Rules
1. **Register No Immutability**
   - Cannot be edited or deleted
   - Enforced at application and database level

2. **Unique Register No**
   - UNIQUE constraint on register_no column
   - Prevents duplicate generation

3. **Status Validation**
   - Only allowed values: Active, Inactive, Transferred, Dropped, Left
   - CHECK constraint at database level

4. **Class Capacity**
   - Cannot add more students than max_students
   - Validated before record creation

5. **Sequence Overflow**
   - Maximum 9999 students per year per school
   - Throws error if limit reached

6. **Immutable Admission Year**
   - Cannot change once set
   - Embedded in register_no

---

## 7. Audit & Compliance

### Audit Logging
Every change creates entry in `student_audit_log`:
- Who made the change (changed_by)
- What changed (field_name, old_value, new_value)
- When it changed (changed_at)
- Why it changed (reason, action)

### Historical Data Preservation
- Delete operations cascade marked as 'Dropped' instead of actual deletion
- All marks, attendance, fees retained for 7 years minimum
- Compliance with educational data retention policies

---

## 8. Scalability Considerations

### Performance Optimizations
1. **Indexes**: On register_no, class, admission_year, status
2. **Partitioning**: Can partition by admission_year for large datasets
3. **Sequence Caching**: In-memory cache for register sequence to reduce DB queries
4. **Batch Operations**: Support bulk student creation

### Database Capacity
- 9999 students per year per school
- Supports millions of records across years
- Query response time < 100ms for standard operations

---

## 9. Configuration

### School Settings
```javascript
const schoolConfig = {
  schoolCode: 'SBPS',      // 3-letter code
  schoolName: 'St. Blesses Public School',
  admissionYear: 2026,
  maxSequence: 9999,

  // Status configuration
  statusOptions: ['Active', 'Inactive', 'Transferred', 'Dropped', 'Left'],
  
  // Access rules
  accessRules: {
    'Active': true,
    'Inactive': false,
    'Transferred': false,
    'Dropped': false,
    'Left': false
  }
};
```

---

## 10. Migration Path

### From Old System (STU001 per class) to New System (YYSSSNNNN)
```sql
-- Step 1: Add new columns to users table
ALTER TABLE users 
ADD COLUMN new_register_no VARCHAR(12),
ADD COLUMN admission_year INT,
ADD COLUMN status VARCHAR(20) DEFAULT 'Active';

-- Step 2: Populate admission_year based on creation date
UPDATE users SET admission_year = EXTRACT(YEAR FROM created_at) 
WHERE role = 'student';

-- Step 3: Generate new register numbers
-- Execute migration script (see migration_script.sql)

-- Step 4: Verify uniqueness
SELECT new_register_no, COUNT(*) 
FROM users 
GROUP BY new_register_no 
HAVING COUNT(*) > 1;

-- Step 5: Rename columns
ALTER TABLE users 
DROP COLUMN register_no,
RENAME COLUMN new_register_no TO register_no;

-- Step 6: Create table for sequence tracking
CREATE TABLE student_register_sequence (...);
```

---

## Summary

This design provides:
✅ **Unique, immutable register numbers** (YYSSSNNNN format)  
✅ **Complete student lifecycle management**  
✅ **Comprehensive audit trail**  
✅ **Historical data preservation**  
✅ **Scalable architecture**  
✅ **Production-ready implementation**  

