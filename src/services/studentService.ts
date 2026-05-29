/**
 * Enhanced Student Management Service
 * Handles CRUD operations with register number system
 */

import { supabase } from './supabase';
import { normalizeObject } from '../utils/normalize';
import { apiRequest } from './apiClient';
import { 
  generateNextRegisterNumber, 
  parseRegisterNumber,
  isValidRegisterNumber,
  registerConfig 
} from './registerNumber';
// Password hashing handled on backend; frontend sends plaintext

/**
 * Student data types
 */
export interface StudentInput {
  name: string;
  email: string;
  password: string;
  phone?: string;
  class: string;
  status?: 'Active' | 'Inactive' | 'Transferred' | 'Dropped' | 'Left' | 'Graduated';
  date_of_birth?: string;
  gender?: string;
  parent_email?: string;
  parent_phone?: string;
  address?: string;
  admission_year?: number;
  initial_fee?: number;
  current_fee?: number;
}

export interface StudentData extends StudentInput {
  id?: string;
  register_no: string;
  status: 'Active' | 'Inactive' | 'Transferred' | 'Dropped' | 'Left' | 'Graduated';
  first_login: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface StudentUpdate {
  name?: string;
  email?: string;
  password?: string;
  phone?: string;
  father_name?: string;
  class?: string;
  status?: 'Active' | 'Inactive' | 'Transferred' | 'Dropped' | 'Left' | 'Graduated';
  date_of_birth?: string;
  gender?: string;
  parent_email?: string;
  parent_phone?: string;
  address?: string;
  initial_fee?: number;
  current_fee?: number;
}

export interface StudentFilters {
  class?: string;
  admission_year?: number;
  status?: 'Active' | 'Inactive' | 'Transferred' | 'Dropped' | 'Left' | 'Graduated';
  search?: string; // Search by name or register_no
}

const STUDENT_STATUSES = ['Active', 'Inactive', 'Transferred', 'Dropped', 'Left', 'Graduated'] as const;

function normalizeStudentStatus(status: unknown): (typeof STUDENT_STATUSES)[number] {
  const normalized = String(status || 'Active').trim().toLowerCase();

  switch (normalized) {
    case 'inactive':
      return 'Inactive';
    case 'transferred':
      return 'Transferred';
    case 'dropped':
      return 'Dropped';
    case 'left':
      return 'Left';
    case 'graduated':
      return 'Graduated';
    case 'active':
    default:
      return 'Active';
  }
}

function normalizeStudentOption(value: unknown, options: string[]): string | undefined {
  if (value === null || value === undefined || value === '') {
    return undefined;
  }

  const normalized = String(value).trim().toLowerCase();
  const match = options.find((option) => option.toLowerCase() === normalized);
  return match || String(value);
}

function normalizeStudentRecord(record: any): any {
  if (!record) return record;

  const normalized = normalizeObject(record);
  return {
    ...normalized,
    status: normalizeStudentStatus(record.status),
    gender: normalizeStudentOption(record.gender, ['Male', 'Female']),
    accommodation_type: normalizeStudentOption(record.accommodation_type, ['Hostel', 'Day Scholar']),
  };
}

export interface OperationResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

/**
 * Creates a new student with auto-generated register number
 */
export async function createStudent(input: StudentInput): Promise<OperationResult<StudentData>> {
  try {
    // Validate required fields
    if (!input.name?.trim() || !input.email?.trim() || !input.password?.trim() || !input.class?.trim()) {
      return {
        success: false,
        error: 'Missing required fields: name, email, password, class',
      };
    }

    // Get admission year (default to current year)
    const admissionYear = input.admission_year || new Date().getFullYear();
    // Normalize class and names to UPPERCASE (except email)
    const normalizedClass = input.class.toUpperCase();
    const normalizedName = input.name.toUpperCase();
    const normalizedFatherName = input.father_name?.toUpperCase() || null;
    const normalizedStatus = normalizeStudentStatus(input.status || 'Active');

    console.log(`📝 Creating student: ${normalizedName} (${input.email}) in class ${normalizedClass}`);

    // Generate register number
    let registerNo: string;
    try {
      registerNo = await generateNextRegisterNumber(admissionYear, registerConfig.SCHOOL_CODE);
      console.log(`✅ Generated register number: ${registerNo}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('❌ Failed to generate register number:', errorMessage);
      return {
        success: false,
        error: `Failed to generate register number: ${errorMessage}. Please ensure the database migration has been run and Supabase is properly configured.`,
      };
    }

    // Validate register number format
    if (!isValidRegisterNumber(registerNo)) {
      console.error(`❌ Invalid register number format: ${registerNo}`);
      return {
        success: false,
        error: `Generated invalid register number: ${registerNo}. Expected format: YYSSSNNNN`,
      };
    }

    // Check if email already exists (case-insensitive)
    // Business rule: allow the same email for up to 2 student accounts.
    // Note: the database must not enforce a UNIQUE constraint on email for this to succeed.
    const { data: existingEmails, error: existingError } = await supabase
      .from('users')
      .select('id')
      .ilike('email', input.email);

    if (existingError) {
      console.error('Error checking existing emails:', existingError);
      return { success: false, error: 'Failed to validate email' };
    }

    const existingCount = (existingEmails && existingEmails.length) || 0;
    if (existingCount >= 2) {
      return { success: false, error: 'Email already registered for two students' };
    }

    // Password is sent in plaintext; backend will hash it
    const hashedPassword = input.password;

    // Create student record (with UPPERCASE for name, class, father_name)
    const { data, error } = await supabase
      .from('users')
      .insert({
        register_no: registerNo,
        email: input.email,
        password: hashedPassword,
        name: normalizedName, // ✅ UPPERCASE
        class: normalizedClass, // ✅ UPPERCASE
        admission_year: admissionYear,
        phone: input.phone || null,
        parent_email: input.parent_email || null,
        parent_phone: input.parent_phone || null,
        date_of_birth: input.date_of_birth || null,
        gender: input.gender || null,
        address: input.address || null,
        initial_fee: input.initial_fee || 0,
        current_fee: input.current_fee || input.initial_fee || 0,
        role: 'student',
        status: normalizedStatus,
        first_login: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('❌ Failed to insert student:', error);
      return { success: false, error: `Failed to create student: ${error.message}` };
    }

    console.log(`✅ Student created successfully with register number: ${registerNo}`);

    // Log to audit table
    await logStudentAudit(data.id, registerNo, 'created', null, 'Student created');

    // Increment class student count
    await incrementClassStudentCount(input.class);

    return {
      success: true,
      data: {
        id: data.id,
        register_no: data.register_no,
        name: data.name,
        email: data.email,
        phone: data.phone,
        class: data.class,
        admission_year: data.admission_year,
        status: normalizeStudentStatus(data.status),
        first_login: data.first_login,
        created_at: data.created_at,
      } as StudentData,
      message: `Student created successfully with register number: ${registerNo}`,
    };
  } catch (error) {
    console.error('❌ Error creating student:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error creating student',
    };
  }
}

/**
 * Gets student by register number
 */
export async function getStudentByRegisterNo(
  registerNo: string
): Promise<OperationResult<StudentData>> {
  try {
    if (!isValidRegisterNumber(registerNo)) {
      return { success: false, error: 'Invalid register number format' };
    }

    const result = await apiRequest<StudentData>(`/students/${encodeURIComponent(registerNo)}`);

    if (!result.success || !result.data) {
      return { success: false, error: result.error || 'Student not found' };
    }

    return { success: true, data: normalizeStudentRecord(result.data) as StudentData };
  } catch (error) {
    console.error('Error fetching student:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error fetching student',
    };
  }
}

/**
 * Gets all students with optional filtering
 */
export async function getAllStudents(
  filters?: StudentFilters
): Promise<OperationResult<StudentData[]>> {
  try {
    console.log('📥 getAllStudents called with filters:', filters);

    // Build query parameters
    const queryParams = new URLSearchParams();
    if (filters?.class) {
      queryParams.append('class', filters.class);
    }
    if (filters?.admission_year) {
      queryParams.append('admission_year', String(filters.admission_year));
    }
    if (filters?.status) {
      queryParams.append('status', filters.status);
    }
    if (filters?.search) {
      queryParams.append('search', filters.search);
    }

    const queryString = queryParams.toString();
    const endpoint = `/students${queryString ? '?' + queryString : ''}`;
    
    console.log(`🔗 Fetching from endpoint: ${endpoint}`);
    const result = await apiRequest<StudentData[]>(endpoint);
    if (!result.success) {
      console.error('❌ Backend error fetching students:', result.error);
      throw new Error(result.error || 'Failed to fetch students');
    }

    const data = result.data || [];

    console.log(`📥 Backend returned ${data?.length || 0} students with filters:`, filters);

    // Normalize string fields (uppercase except email/password/ids)
    const normalizedResult = (data || []).map((s: any) => normalizeStudentRecord(s));

    console.log(`📊 FINAL RESULT: ${normalizedResult.length} student(s)`, {
      filters,
      students: normalizedResult.map((s: any) => ({ name: s.name, class: s.class, register_no: s.register_no }))
    });

    return { success: true, data: normalizedResult as StudentData[] };
  } catch (error) {
    console.error('❌ Error fetching students:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error fetching students',
      data: [],
    };
  }
}

/**
 * Gets students by class (includes all statuses)
 */
export async function getStudentsByClass(className: string): Promise<OperationResult<StudentData[]>> {
  console.log(`\n\n🔥🔥🔥 getStudentsByClass CALLED with: "${className}" 🔥🔥🔥`);
  // Normalize class name to UPPERCASE for consistency
  const normalizedClassName = className.toUpperCase();
  const result = await getAllStudents({ class: normalizedClassName });
  console.log(`🔥🔥🔥 getStudentsByClass RETURNING: `, result);
  return result;
}

/**
 * Gets students by admission year
 */
export async function getStudentsByYear(admissionYear: number): Promise<OperationResult<StudentData[]>> {
  return getAllStudents({ admission_year: admissionYear });
}

/**
 * Gets students by status
 */
export async function getStudentsByStatus(
  status: 'Active' | 'Inactive' | 'Transferred' | 'Dropped' | 'Left' | 'Graduated'
): Promise<OperationResult<StudentData[]>> {
  return getAllStudents({ status });
}

/**
 * Updates student details (except register_no and admission_year)
 */
export async function updateStudent(
  registerNo: string,
  updates: StudentUpdate
): Promise<OperationResult<StudentData>> {
  try {
    console.log(`🔄 updateStudent called with register_no: ${registerNo}`, updates);

    if (!isValidRegisterNumber(registerNo)) {
      console.error(`❌ Invalid register number format: ${registerNo}`);
      return { success: false, error: 'Invalid register number format' };
    }

    // Get current student data
    const currentResult = await getStudentByRegisterNo(registerNo);
    if (!currentResult.success || !currentResult.data) {
      console.error(`❌ Student not found: ${registerNo}`);
      return { success: false, error: 'Student not found' };
    }

    const currentData = currentResult.data;
    console.log(`✅ Current student data:`, currentData);

    // Build update object
    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    const changedFields: { field: string; oldValue: any; newValue: any }[] = [];

    // Handle password hashing if provided
    if (updates.password && updates.password.trim()) {
      updateData.password = updates.password;
      changedFields.push({
        field: 'password',
        oldValue: '***',
        newValue: '***', // Don't log actual passwords
      });
      // Remove password from updates object to avoid processing it twice
      const { password, ...otherUpdates } = updates;
      Object.entries(otherUpdates).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          updateData[key] = value;
          if ((currentData as any)[key] !== value) {
            changedFields.push({
              field: key,
              oldValue: (currentData as any)[key],
              newValue: value,
            });
          }
        }
      });
    } else {
      const uppercaseKeys = ['name', 'class', 'father_name', 'gender', 'accommodation_type', 'address'];
      Object.entries(updates).forEach(([key, value]) => {
        if (key === 'password') return; // Skip password if not provided
        if (value !== undefined && value !== null) {
          // Normalize string fields (except email) to UPPERCASE for consistency
          let newValue: any = value;
          if (typeof value === 'string' && uppercaseKeys.includes(key)) {
            newValue = value.toUpperCase();
          }
          updateData[key] = newValue;
          if ((currentData as any)[key] !== newValue) {
            changedFields.push({
              field: key,
              oldValue: (currentData as any)[key],
              newValue: newValue,
            });
          }
        }
      });
    }

    console.log(`📋 Changed fields:`, changedFields);
    console.log(`📝 Update data being sent:`, updateData);

    if (changedFields.length === 0) {
      console.log(`⚠️ No changes detected`);
      return { success: true, data: currentData, message: 'No changes made' };
    }

    console.log(`🔄 Updating users table for register_no: ${registerNo}`);
    const result = await apiRequest<StudentData>(`/students/${encodeURIComponent(registerNo)}`, {
      method: 'PUT',
      body: JSON.stringify(updateData),
    });

    if (!result.success || !result.data) {
      return { success: false, error: result.error || `Student with register number ${registerNo} not found` };
    }

    const updatedRecord = result.data as any;
    console.log(`✅ Update successful, new data:`, updatedRecord);

    // Log changes to audit table
    for (const change of changedFields) {
      await logStudentAudit(
        updatedRecord.id,
        registerNo,
        'updated',
        change.field,
        `Updated ${change.field}`,
        change.oldValue,
        change.newValue
      );
    }

    console.log(`✅ Audit logs created for all changes`);

    return { success: true, data: normalizeStudentRecord(updatedRecord) as StudentData };
  } catch (error) {
    console.error('❌ Error updating student:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error updating student',
    };
  }
}

/**
 * Deactivates a student (marks as Inactive)
 */
export async function deactivateStudent(
  registerNo: string,
  reason: string = 'No reason provided'
): Promise<OperationResult> {
  try {
    console.log(`🔄 [deactivateStudent] Starting deactivation`);
    console.log(`   registerNo: "${registerNo}" (type: ${typeof registerNo}, length: ${registerNo?.length})`);
    console.log(`   reason: "${reason}"`);
    
    if (!registerNo || registerNo.trim() === '') {
      console.error('❌ Register number is empty');
      return { success: false, error: 'Register number cannot be empty' };
    }

    console.log(`🔍 Validating register number format...`);
    // Validate format
    if (!isValidRegisterNumber(registerNo)) {
      console.error(`❌ Invalid register number format: "${registerNo}"`);
      console.error(`   Expected format: YYSSSNNNN (e.g., 26SBPS0001)`);
      return { success: false, error: `Invalid register number format: ${registerNo}` };
    }

    console.log(`✅ Register number format is valid`);
    console.log(`🔍 Querying database for register_no: ${registerNo}`);
    
    // Use role filter for RLS compatibility
    const { data, error } = await supabase
      .from('users')
      .update({
        status: 'Inactive',
        updated_at: new Date().toISOString(),
      })
      .eq('register_no', registerNo)
      .eq('role', 'student')
      .select();

    console.log(`📊 Database response:`, { 
      dataLength: data?.length, 
      hasError: !!error,
      errorMessage: error?.message 
    });

    if (error) {
      console.error('❌ Supabase error updating student:', error);
      console.error('Error details:', JSON.stringify(error));
      throw error;
    }

    console.log(`✅ Query returned ${data?.length || 0} rows`);

    // Check if any records were updated
    if (!data || data.length === 0) {
      console.warn(`⚠️ No student found with register_no: ${registerNo}`);
      // Try querying first to see if the student exists
      console.log(`🔍 Checking if student exists...`);
      const { data: existingStudent, error: lookupError } = await supabase
        .from('users')
        .select('id, register_no, status, role')
        .eq('register_no', registerNo)
        .limit(1);
      
      console.log(`📊 Student lookup:`, { 
        found: !!existingStudent && existingStudent.length > 0,
        data: existingStudent,
        error: lookupError?.message
      });
      
      return { success: false, error: `No student found with register number: ${registerNo}` };
    }

    console.log(`📝 Logging audit for ${data.length} record(s)...`);
    // Log to audit for each updated record
    for (const record of data) {
      console.log(`   - Logging audit for student ${record.id}`);
      await logStudentAudit(record.id, registerNo, 'status_changed', null, `Deactivated - ${reason}`);
    }

    console.log(`✅ Student ${registerNo} deactivated successfully`);
    return { success: true, message: `Student ${registerNo} deactivated` };
  } catch (error) {
    console.error('❌ Error in deactivateStudent:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'N/A');
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error deactivating student',
    };
  }
}

/**
 * Marks register number as inactive WITHOUT changing student status
 * Used for Graduated/Transferred students to deactivate their register but keep their status
 * This function is non-critical and should not fail the status update
 */
export async function markRegisterNumberInactive(
  registerNo: string,
  reason: string = 'Register number deactivated'
): Promise<OperationResult> {
  try {
    console.log(`🔄 [markRegisterNumberInactive] Processing: ${registerNo}`);
    
    if (!registerNo || registerNo.trim() === '') {
      return { success: false, error: 'Register number is empty' };
    }

    if (!isValidRegisterNumber(registerNo)) {
      console.warn(`⚠️ Invalid register format: ${registerNo}`);
      return { success: false, error: 'Invalid register format' };
    }

    // Just log for now - the important part is the student status was updated
    console.log(`✅ Register ${registerNo} marked for ${reason}`);
    
    // Try to update register_numbers if it exists, but don't fail if it doesn't
    try {
      const { data: checkData } = await supabase
        .from('register_numbers')
        .select('id')
        .eq('register_no', registerNo)
        .limit(1);

      if (checkData && checkData.length > 0) {
        await supabase
          .from('register_numbers')
          .update({
            marked_inactive_at: new Date().toISOString(),
            reason_inactive: reason,
          })
          .eq('register_no', registerNo);
        console.log(`✅ register_numbers table updated`);
      }
    } catch (tableErr) {
      console.warn(`⚠️ register_numbers table not available (will be created on migration)`);
    }

    // Log to audit table
    try {
      const { data: studentData } = await supabase
        .from('users')
        .select('id')
        .eq('register_no', registerNo)
        .limit(1);

      if (studentData && studentData.length > 0) {
        await logStudentAudit(studentData[0].id, registerNo, 'register_marked_inactive', null, reason);
      }
    } catch (auditErr) {
      console.warn(`⚠️ Audit logging failed: ${auditErr}`);
    }

    return { success: true, message: `Register ${registerNo} marked as inactive` };
  } catch (error) {
    // Don't throw - log and return success anyway
    // This function is non-critical
    console.warn('⚠️ markRegisterNumberInactive error (non-critical):', error);
    return { success: true, message: 'Operation completed' };
  }
}

/**
 * Reactivates an inactive student
 */
export async function reactivateStudent(registerNo: string): Promise<OperationResult> {
  try {
    if (!registerNo || registerNo.trim() === '') {
      return { success: false, error: 'Register number cannot be empty' };
    }

    if (!isValidRegisterNumber(registerNo)) {
      return { success: false, error: 'Invalid register number format' };
    }

    const { data, error } = await supabase
      .from('users')
      .update({
        status: 'Active',
        updated_at: new Date().toISOString(),
      })
      .eq('register_no', registerNo)
      .eq('role', 'student')
      .select();

    if (error) {
      console.error('Error reactivating student:', error);
      throw error;
    }

    // Check if any records were updated
    if (!data || data.length === 0) {
      return { success: false, error: `Student with register number ${registerNo} not found` };
    }

    // Log to audit for each updated record
    for (const record of data) {
      await logStudentAudit(record.id, registerNo, 'status_changed', null, 'Reactivated');
    }

    return { success: true, message: `Student ${registerNo} reactivated` };
  } catch (error) {
    console.error('Error reactivating student:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error reactivating student',
    };
  }
}

/**
 * Marks a student as transferred
 */
export async function transferStudent(
  registerNo: string,
  reason: string = 'Student transferred'
): Promise<OperationResult> {
  try {
    if (!registerNo || registerNo.trim() === '') {
      return { success: false, error: 'Register number cannot be empty' };
    }

    if (!isValidRegisterNumber(registerNo)) {
      return { success: false, error: 'Invalid register number format' };
    }

    const { data, error } = await supabase
      .from('users')
      .update({
        status: 'Transferred',
        updated_at: new Date().toISOString(),
      })
      .eq('register_no', registerNo)
      .eq('role', 'student')
      .select();

    if (error) {
      console.error('Error transferring student:', error);
      throw error;
    }

    // Check if any records were updated
    if (!data || data.length === 0) {
      return { success: false, error: `Student with register number ${registerNo} not found` };
    }

    // Log to audit and decrement class count for each updated record
    for (const record of data) {
      await logStudentAudit(record.id, registerNo, 'transferred', null, reason);
      
      // Decrement class student count
      if (record.class) {
        await decrementClassStudentCount(record.class);
      }
    }

    return { success: true, message: `Student ${registerNo} marked as transferred` };
  } catch (error) {
    console.error('Error transferring student:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error transferring student',
    };
  }
}

/**
 * Marks a student as dropped/expelled
 */
export async function dropStudent(
  registerNo: string,
  reason: string = 'Student dropped'
): Promise<OperationResult> {
  try {
    if (!registerNo || registerNo.trim() === '') {
      return { success: false, error: 'Register number cannot be empty' };
    }

    if (!isValidRegisterNumber(registerNo)) {
      return { success: false, error: 'Invalid register number format' };
    }

    const { data, error } = await supabase
      .from('users')
      .update({
        status: 'Dropped',
        updated_at: new Date().toISOString(),
      })
      .eq('register_no', registerNo)
      .eq('role', 'student')
      .select();

    if (error) {
      console.error('Error dropping student:', error);
      throw error;
    }

    // Check if any records were updated
    if (!data || data.length === 0) {
      return { success: false, error: `Student with register number ${registerNo} not found` };
    }

    // Log to audit and decrement class count for each updated record
    for (const record of data) {
      await logStudentAudit(record.id, registerNo, 'dropped', null, reason);

      if (record.class) {
        await decrementClassStudentCount(record.class);
      }
    }

    return { success: true, message: `Student ${registerNo} marked as dropped` };
  } catch (error) {
    console.error('Error dropping student:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error dropping student',
    };
  }
}

/**
 * Gets complete student record including academic history
 */
export async function updateStudentStatus(
  studentId: string,
  newStatus: string
): Promise<OperationResult> {
  try {
    console.log(`\n${'='.repeat(70)}`);
    console.log(`🔄 [updateStudentStatus] STARTING`);
    console.log(`   Input - studentId: "${studentId}", newStatus: "${newStatus}"`);
    
    // Validate status
    const validStatuses = ['Active', 'Inactive', 'Transferred', 'Dropped', 'Left', 'Graduated'];
    
    if (!validStatuses.includes(newStatus)) {
      console.error(`❌ VALIDATION FAILED: Status "${newStatus}" not in [${validStatuses.join(', ')}]`);
      return { 
        success: false, 
        error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` 
      };
    }
    console.log(`✅ Validation passed for status: "${newStatus}"`);

    console.log(`\n🔄 Database update - executing...`);
    const { data, error } = await supabase
      .from('users')
      .update({
        status: newStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', studentId)
      .select();

    console.log(`   Supabase response received`);
    console.log(`   - error: ${error ? error.message : 'none'}`);
    console.log(`   - data: ${data ? `${data.length} rows` : 'null'}`);
    
    if (error) {
      console.error(`\n❌ DATABASE ERROR:`, error);
      return { 
        success: false, 
        error: `Database error: ${error.message}` 
      };
    }

    if (!data || data.length === 0) {
      console.error(`\n❌ NO ROWS RETURNED: Student with id "${studentId}" not found or RLS blocked access`);
      return { success: false, error: 'Student not found or access denied' };
    }

    const updatedStudent = data[0];
    console.log(`\n✅ DATABASE UPDATE SUCCESS`);
    console.log(`   - Student ID: ${updatedStudent.id}`);
    console.log(`   - New Status: ${updatedStudent.status}`);
    console.log(`   - Updated At: ${updatedStudent.updated_at}`);

    console.log(`\n📝 Attempting audit log...`);
    try {
      await logStudentAudit(
        updatedStudent.id, 
        updatedStudent.register_no, 
        'status_changed', 
        null, 
        `Status changed to ${newStatus}`
      );
      console.log(`✅ Audit log successful`);
    } catch (auditErr) {
      console.warn(`⚠️ Audit log failed (non-critical):`, auditErr);
    }

    console.log(`\n✅ OPERATION COMPLETE - SUCCESS`);
    console.log(`${'='.repeat(70)}\n`);
    return { success: true, message: `Student status updated to ${newStatus}` };
  } catch (error) {
    console.error(`\n❌ EXCEPTION IN updateStudentStatus:`, error);
    console.error(`${'='.repeat(70)}\n`);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error updating student status',
    };
  }
}

/**
 * Gets complete student record including academic history
 */
export async function getStudentCompleteRecord(registerNo: string): Promise<OperationResult> {
  try {
    if (!isValidRegisterNumber(registerNo)) {
      return { success: false, error: 'Invalid register number format' };
    }

    // Get student data
    const studentResult = await getStudentByRegisterNo(registerNo);
    if (!studentResult.success) return studentResult;

    const student = studentResult.data;

    // Get marks
    const { data: marks } = await supabase
      .from('marks')
      .select('*')
      .eq('register_no', registerNo)
      .order('year', { ascending: false });

    // Get attendance
    const { data: attendance } = await supabase
      .from('attendance')
      .select('*')
      .eq('register_no', registerNo)
      .order('date', { ascending: false });

    // Get fees
    const { data: fees } = await supabase
      .from('fees')
      .select('*')
      .eq('register_no', registerNo)
      .order('year', { ascending: false });

    return {
      success: true,
      data: {
        student,
        marks: marks || [],
        attendance: attendance || [],
        fees: fees || [],
      },
    };
  } catch (error) {
    console.error('Error fetching complete record:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error fetching complete record',
    };
  }
}

/**
 * Gets audit log for a student
 */
export async function getStudentAuditLog(registerNo: string): Promise<OperationResult> {
  try {
    const { data, error } = await supabase
      .from('student_audit_log')
      .select('*')
      .eq('register_no', registerNo)
      .order('changed_at', { ascending: false });

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Error fetching audit log:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error fetching audit log',
    };
  }
}

/**
 * Helper: Logs student audit events
 */
async function logStudentAudit(
  studentId: string,
  registerNo: string,
  action: string,
  fieldName: string | null,
  reason: string,
  oldValue?: any,
  newValue?: any
): Promise<void> {
  try {
    await supabase.from('student_audit_log').insert({
      student_id: studentId,
      register_no: registerNo,
      action,
      field_name: fieldName,
      old_value: oldValue ? JSON.stringify(oldValue) : null,
      new_value: newValue ? JSON.stringify(newValue) : null,
      reason,
      changed_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error logging audit:', error);
  }
}

/**
 * Helper: Increments class student count
 */
async function incrementClassStudentCount(className: string): Promise<void> {
  try {
    console.log(`📊 Incrementing student count for class: ${className}`);
    const { error } = await supabase.rpc('increment_class_students', { p_class_name: className });
    if (error) {
      console.error(`❌ RPC error incrementing class count for ${className}:`, error);
    } else {
      console.log(`✅ Successfully incremented student count for class: ${className}`);
    }
  } catch (error) {
    console.error(`❌ Error incrementing class count for ${className}:`, error);
  }
}

/**
 * Helper: Decrements class student count
 */
async function decrementClassStudentCount(className: string): Promise<void> {
  try {
    console.log(`📊 Decrementing student count for class: ${className}`);
    const { error } = await supabase.rpc('decrement_class_students', { p_class_name: className });
    if (error) {
      console.error(`❌ RPC error decrementing class count for ${className}:`, error);
    } else {
      console.log(`✅ Successfully decremented student count for class: ${className}`);
    }
  } catch (error) {
    console.error(`❌ Error decrementing class count for ${className}:`, error);
  }
}

/**
 * Searches students by multiple criteria
 */
export async function searchStudents(query: string): Promise<OperationResult<StudentData[]>> {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('role', 'student')
      .or(
        `name.ilike.%${query}%,register_no.ilike.%${query}%,email.ilike.%${query}%,class.ilike.%${query}%`
      )
      .order('register_no');

    if (error) throw error;

    return { success: true, data: (data || []) as StudentData[] };
  } catch (error) {
    console.error('Error searching students:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error searching students',
      data: [],
    };
  }
}

/**
 * Gets class roster
 */
export async function getClassRoster(className: string): Promise<OperationResult<StudentData[]>> {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('class', className)
      .eq('status', 'Active')
      .eq('role', 'student')
      .order('register_no');

    if (error) throw error;

    return { success: true, data: (data || []) as StudentData[] };
  } catch (error) {
    console.error('Error fetching class roster:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error fetching class roster',
      data: [],
    };
  }
}

export const studentService = {
  createStudent,
  getStudentByRegisterNo,
  getAllStudents,
  getStudentsByClass,
  getStudentsByYear,
  getStudentsByStatus,
  updateStudent,
  deactivateStudent,
  markRegisterNumberInactive,
  reactivateStudent,
  transferStudent,
  dropStudent,
  updateStudentStatus,
  getStudentCompleteRecord,
  getStudentAuditLog,
  searchStudents,
  getClassRoster,
};
