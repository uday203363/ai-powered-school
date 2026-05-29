# Subject-Based Marks Management Implementation

## Overview
Implemented role-based access control for marks management where:
- **Subject Teachers**: Can only view and update marks for their assigned subjects
- **Class Teachers**: Can view and update marks for all subjects in their class

## Changes Made

### 1. Database Schema Updates (Supabase)
Users table requires these fields:
- `subjects` (string): Comma-separated list of subjects taught by the teacher
- `class_teacher_for` (string): The class the teacher is a class teacher for (or null)
- `assigned_classes` (string): Comma-separated list of classes the teacher is assigned to

### 2. TeacherMarksPage Component
**File**: `src/components/teacher/TeacherMarksPage.tsx`

#### New State Variables:
```typescript
const [teacherSubjects, setTeacherSubjects] = useState<string[]>([]);
const [isClassTeacher, setIsClassTeacher] = useState(false);
```

#### Key Logic:
1. **Initialize subjects and class teacher status** when component loads:
   - Parse `user.subjects` into an array
   - Check if `user.class_teacher_for === selectedClass`

2. **Filter marks display**:
   - If NOT a class teacher: Only show marks for their assigned subjects
   - If IS a class teacher: Show all marks in the class

3. **Subject selection**:
   - If NOT a class teacher: Dropdown (limited to their subjects)
   - If IS a class teacher: Free text input (allow any subject)

4. **Add marks validation**:
   - Prevent non-class-teachers from adding marks for subjects they don't teach
   - Allow class teachers to add marks for any subject

5. **View badge** in header:
   - Shows "Class Teacher" if they are a class teacher
   - Shows "Subject: [subjects]" if they are a subject teacher

#### Feature Implementation:
```typescript
// Example: Filter marks by subject
if (!isClassTeacher && subjects.length > 0) {
  filteredMarks = filteredMarks.filter((mark: any) =>
    subjects.some((subject: string) =>
      subject.toLowerCase() === (mark.subject || '').toLowerCase()
    )
  );
}

// Example: Validate subject authorization
if (!isClassTeacher && !teacherSubjects.some(s => s.toLowerCase() === formData.subject.toLowerCase())) {
  alert(`You are not authorized to add marks for ${formData.subject}.`);
  return;
}
```

### 3. TeacherAttendancePage Component
**File**: `src/components/teacher/TeacherAttendancePage.tsx`

#### Changes:
- Added `isClassTeacher` state to detect class teacher status
- Shows "Class Teacher" badge in header if applicable
- All assigned teachers can mark attendance for their classes (no subject restriction)

#### Class Teacher Detection:
```typescript
const isTeacherForClass = user?.class_teacher_for === classToLoad;
setIsClassTeacher(isTeacherForClass);
```

### 4. Database Service Updates
**File**: `src/services/database.ts`

#### Supabase Query Updates:
All class-filtering queries now use JavaScript-level case-insensitive filtering:

1. **getNextRegisterNoForClass()** (Line 79)
   - Fetches all students, filters by class (case-insensitive)
   - Used for generating next registration numbers

2. **getMarksByClass()** (Line 220)
   - Fetches all students and their marks
   - Filters by class (case-insensitive)
   - Used by TeacherMarksPage to get marks for a class

3. **getClassTeacher()** (Line 557)
   - Fetches all teachers
   - Finds first matching class teacher (case-insensitive)
   - Used by admin panel

4. **getStudentsPerformanceSummary()** (Line 995)
   - Fetches all students and marks
   - Filters by class (case-insensitive) if provided
   - Used for performance analytics

#### Implementation Pattern:
```typescript
const normalizedClassName = className.trim();
const filteredData = data.filter((item: any) =>
  item.class && item.class.trim().toLowerCase() === normalizedClassName.toLowerCase()
);
```

## Admin Configuration

### Subject Assignment
Teachers must have subjects assigned through:
- **Admin Users Page** → Select Teacher → Edit "Subjects/Specialization"
- Format: Comma-separated list (e.g., "Mathematics, Science")
- Case-insensitive matching when filtering marks

### Class Teacher Assignment
Teachers can be assigned as class teachers through:
- **Admin Dashboard** → "Assign Class Teachers" tab
- Only one class teacher per class
- Class teacher can see and manage all subjects for their class

## Workflow Examples

### Scenario 1: Subject Teacher (Math)
1. Teacher logs in with subjects: "Mathematics, Physics"
2. Opens Marks page for class "10A"
3. Can see:
   - Only marks for Mathematics and Physics subjects
   - Subject dropdown showing: "Mathematics", "Physics"
   - Can add marks only for Mathematics or Physics
4. Cannot add marks for English, History, etc.

### Scenario 2: Class Teacher (10A)
1. Teacher logs in with `class_teacher_for: "10A"`
2. Opens Marks page for class "10A"
3. Can see:
   - Marks for ALL subjects in 10A
   - Free text subject input
   - "Class Teacher" badge in header
4. Can add marks for any subject

### Scenario 3: Multi-Class Subject Teacher
1. Teacher assigned to classes: "9A, 10A, 11A"
2. Teaches: "Mathematics, Science"
3. Selects class "10A" from dropdown
4. Can manage Math and Science marks for 10A students
5. Can switch to "9A" and see Math/Science marks there too

## Attendance Management
- All teachers assigned to a class can mark attendance
- No subject restrictions for attendance (class-wide activity)
- Class teacher status shown in header for visibility

## Case-Insensitivity
All class name comparisons are now case-insensitive:
- "10a" matches "10A"
- "Class10a" matches "CLASS10A"
- Prevents data retrieval failures due to case mismatches

## Error Handling

### Authorization Errors:
```typescript
if (!isClassTeacher && !teacherSubjects.includes(formData.subject)) {
  alert('You are not authorized to add marks for this subject.');
}
```

### Empty Subject List:
```typescript
if (teacherSubjects.length === 0 && !isClassTeacher) {
  alert('No subjects assigned. Contact administrator.');
}
```

## Testing Checklist

### Subject Teacher Testing:
- [ ] Login as subject teacher
- [ ] Verify marks shown only for their subjects
- [ ] Try to add marks for unauthorized subject (should fail)
- [ ] Verify student history shows only their subjects
- [ ] Switch between assigned classes

### Class Teacher Testing:
- [ ] Login as class teacher
- [ ] Verify ALL subjects visible
- [ ] Add marks for any subject
- [ ] Verify "Class Teacher" badge shows
- [ ] Subject dropdown shows all subjects or free input enabled

### Case-Insensitivity Testing:
- [ ] Register students with mixed-case class names ("10a", "10A")
- [ ] Verify marks display correctly
- [ ] Verify subject matching handles case differences

### Multi-Class Teacher Testing:
- [ ] Teacher assigned to multiple classes
- [ ] Verify class selector appears
- [ ] Switch classes and verify data updates
- [ ] Verify attendance marking works for each class

## Future Enhancements

1. **Subject Validation**: Add subject whitelist from class config
2. **Department Heads**: Extend class teacher logic to department heads
3. **Subject Coordinator**: Allow teachers to see all sections of their subject
4. **Subject-Level Analytics**: Add dashboard showing all teachers teaching a subject
5. **Cross-Section Subject Reports**: Compare performance across multiple classes for same subject
