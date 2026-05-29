import { supabase } from './supabase';
import type { Student, Mark, Attendance, Fee, Notification } from '../types';
import { normalizeObject } from '../utils/normalize';
import { apiRequest, getApiUrl } from './apiClient';

const normalizeEmail = (value: unknown): string => String(value || '').trim().toLowerCase();

// ==================== STUDENT SERVICE ====================
export const studentService = {
  async getAllStudents() {
    try {
      // Fetch from users table where role = 'student'
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('role', 'student')
        .order('name');

      return { success: !error, data: data || [], error };
    } catch (error) {
      console.error('Get students error:', error);
      return { success: false, data: [] };
    }
  },

  async getStudentById(studentId: string) {
    try {
      // Fetch from users table
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', studentId)
        .eq('role', 'student')
        .single();

      return { success: !error, data, error };
    } catch (error) {
      console.error('Get student error:', error);
      return { success: false, data: null };
    }
  },

  async getStudentsByClass(className: string) {
    try {
      if (!className) {
        console.warn('getStudentsByClass called with empty className');
        return { success: false, data: [], error: 'Class name is required' };
      }

      const normalizedClassName = className.trim();
      console.log('Fetching students for class:', normalizedClassName);

      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('role', 'student')
        .order('name');

      if (error) {
        console.error('Error fetching students:', error);
        return { success: false, data: [], error };
      }

      const filteredData = (data || []).filter((student: any) => 
        student.class && student.class.trim().toLowerCase() === normalizedClassName.toLowerCase()
      );

      console.log(`Found ${filteredData.length} students for class ${normalizedClassName}`);
      return { success: true, data: filteredData, error: null };
    } catch (error) {
      console.error('Get students by class error:', error);
      return { success: false, data: [], error };
    }
  },

  async getNextRegisterNoForClass(className: string) {
    try {
      // Get the highest register number for this class and generate next one
      const normalizedClassName = className.trim();
      const { data: allStudents, error } = await supabase
        .from('users')
        .select('register_no')
        .eq('role', 'student')
        .order('register_no', { ascending: false });
      
      if (error || !allStudents) {
        return { success: true, nextRegisterNo: 'STU001' };
      }
      
      // Filter for matching class (case-insensitive)
      const classStudents = allStudents.filter((s: any) => 
        s.class && s.class.trim().toLowerCase() === normalizedClassName.toLowerCase()
      );
      
      const data = classStudents.length > 0 ? classStudents.slice(0, 1) : [];

      if (error || !data || data.length === 0) {
        // First student in this class - start from STU001
        return { success: true, nextRegisterNo: 'STU001' };
      }

      const lastRegNo = data[0].register_no;
      // Extract number from format like "STU001" and increment
      const match = lastRegNo.match(/STU(\d+)$/);
      if (match) {
        const num = parseInt(match[1]) + 1;
        const nextNo = `STU${String(num).padStart(3, '0')}`;
        
        // Check if we've reached the max limit for this class
      const normalizedForCheck = className.trim();
      const { data: config } = await supabase
        .from('class_config')
        .select('*')
        .ilike('class_name', normalizedForCheck);
      const matchedConfig = config?.[0];
        if (matchedConfig && num - 1 >= matchedConfig.max_students) {
          return { 
            success: false, 
            error: `Class ${className} is full (Max: ${matchedConfig.max_students} students)`,
            nextRegisterNo: '' 
          };
        }

        return { success: true, nextRegisterNo: nextNo };
      }

      return { success: true, nextRegisterNo: 'STU001' };
    } catch (error) {
      console.error('Get next register number error:', error);
      return { success: false, nextRegisterNo: '' };
    }
  },

  async createStudent(studentData: Partial<Student> & { password?: string }) {
    try {
      const normalizedEmail = normalizeEmail(studentData.email);
      if (normalizedEmail) {
        const { count, error: countError } = await supabase
          .from('users')
          .select('id', { count: 'exact', head: true })
          .eq('role', 'student')
          .ilike('email', normalizedEmail);

        if (countError) {
          console.error('Count student email usage error:', countError);
          return { success: false, data: null, error: countError.message };
        }

        if ((count || 0) >= 3) {
          return { success: false, data: null, error: 'This email has already been used 3 times' };
        }
      }

      // Prepare data with required fields only
      const dataToInsert = {
        name: studentData.name || '',
        email: studentData.email || '',
        phone: studentData.phone || '',
        class: studentData.class || '',
        register_no: studentData.register_no || '',
        role: 'student',
        first_login: true,  // Students must change password on first login
        password: studentData.password || '',  // Include password if provided
      };

      console.log('Creating student with data:', dataToInsert);

      const { data, error } = await supabase
        .from('users')
        .insert([dataToInsert])
        .select()
        .single();

      if (error) {
        console.error('Create student database error:', {
          error: error,
          details: error.details,
          hint: error.hint,
          message: error.message,
          dataInserted: dataToInsert
        });
        return { success: false, data: null, error };
      }

      console.log('Student created successfully:', data);
      return { success: true, data, error: null };
    } catch (error) {
      console.error('Create student catch error:', error);
      return { success: false, data: null, error };
    }
  },

  async updateStudent(studentId: string, updates: Partial<Student>) {
    try {
      if (updates.email) {
        const normalizedEmail = normalizeEmail(updates.email);
        const { count, error: countError } = await supabase
          .from('users')
          .select('id', { count: 'exact', head: true })
          .eq('role', 'student')
          .neq('id', studentId)
          .ilike('email', normalizedEmail);

        if (countError) {
          console.error('Update student email usage error:', countError);
          return { success: false, data: null, error: countError.message };
        }

        if ((count || 0) >= 3) {
          return { success: false, data: null, error: 'This email has already been used 3 times' };
        }
      }

      const { data, error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', studentId)
        .select()
        .single();

      return { success: !error, data, error };
    } catch (error) {
      console.error('Update student error:', error);
      return { success: false, data: null };
    }
  },

  async deleteStudent(studentId: string) {
    try {
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', studentId);

      return { success: !error, error };
    } catch (error) {
      console.error('Delete student error:', error);
      return { success: false };
    }
  },

  async updateStudentStatus(studentId: string, newStatus: string) {
    try {
      console.log(`🔄 [database.ts] updateStudentStatus called: studentId=${studentId}, newStatus=${newStatus}`);
      
      const validStatuses = ['Active', 'Inactive', 'Transferred', 'Dropped', 'Left', 'Graduated'];
      if (!validStatuses.includes(newStatus)) {
        console.error(`❌ Invalid status: ${newStatus}`);
        return { 
          success: false, 
          error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` 
        };
      }

      const { data, error } = await supabase
        .from('users')
        .update({
          status: newStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('id', studentId)
        .eq('role', 'student')
        .select();

      if (error) {
        console.error('❌ Update student status error:', error);
        return { success: false, error: error.message };
      }

      // Check if any records were updated
      if (!data || data.length === 0) {
        console.error('❌ No student found with id:', studentId);
        return { success: false, error: 'Student not found' };
      }

      console.log(`✅ Student status updated successfully:`, data[0]);
      return { success: true, message: `Student status updated to ${newStatus}` };
    } catch (error) {
      console.error('❌ Update student status error:', error);
      return { success: false, error: String(error) };
    }
  },
};

// ==================== MARKS SERVICE ====================
export const marksService = {
  async getMarksByStudent(studentId: string) {
    try {
      const { data, error } = await supabase
        .from('marks')
        .select('*')
        .eq('student_id', studentId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Get marks error:', error);
        return { success: false, data: [], error };
      }

      // Normalize text fields to UPPERCASE for consistency
      const normalizedData = (data || []).map((mark: any) => ({
        ...mark,
        subject: mark.subject ? mark.subject.toUpperCase() : '',
        exam_name: mark.exam_name ? mark.exam_name.toUpperCase() : '',
        class: mark.class ? mark.class.toUpperCase() : '',
      }));

      return { success: true, data: normalizedData || [] };
    } catch (error) {
      console.error('Get marks error:', error);
      return { success: false, data: [] };
    }
  },

  async getMarksByClass(className: string) {
    try {
      const normalizedClassName = className.trim().toUpperCase(); // ✅ UPPERCASE
      
      // Get all marks from database
      const { data, error } = await supabase
        .from('marks')
        .select(`
          *,
          student:student_id (
            id,
            name,
            register_no,
            class
          )
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Get class marks error:', error);
        return { success: false, data: [], error };
      }

      // Filter marks by class - check both marks.class and student.class (both in UPPERCASE)
      const filteredData = (data || []).filter((mark: any) => {
        const markClass = mark.class ? mark.class.trim().toUpperCase() : '';
        const studentClass = mark.student?.class ? mark.student.class.trim().toUpperCase() : '';
        
        return markClass === normalizedClassName || studentClass === normalizedClassName;
      });

      // Flatten the nested student object to top level
      const flattenedData = filteredData.map((mark: any) => ({
        ...mark,
        student_name: mark.student?.name || mark.student_name || '',
        register_no: mark.student?.register_no || mark.register_no || '',
        class: (mark.class || mark.student?.class || '').toUpperCase(), // ✅ UPPERCASE
        subject: mark.subject ? mark.subject.toUpperCase() : '', // ✅ UPPERCASE
        exam_name: mark.exam_name ? mark.exam_name.toUpperCase() : '', // ✅ UPPERCASE
      }));

      console.log('📊 GET MARKS BY CLASS:', {
        className: normalizedClassName,
        totalMarksInDb: data?.length || 0,
        marksForThisClass: flattenedData.length,
        marks: flattenedData.map((m: any) => ({
          id: m.id?.substring(0, 8),
          student_id: m.student_id?.substring(0, 8),
          student_name: m.student_name,
          exam_name: m.exam_name,
          subject: m.subject,
          class: m.class,
        })),
      });

      return { success: true, data: flattenedData || [] };
    } catch (error) {
      console.error('Get class marks error:', error);
      return { success: false, data: [] };
    }
  },

  async getMarksByCriteria(className?: string, studentId?: string, subject?: string) {
    try {
      let query = supabase.from('marks').select(`
        *,
        student:student_id (
          id,
          name,
          register_no,
          class
        )
      `);

      if (studentId) {
        query = query.eq('student_id', studentId);
      }
      if (subject) {
        // Search with UPPERCASE for consistency
        query = query.eq('subject', subject.toUpperCase());
      }

      const { data, error } = await query.order('created_at', { ascending: false });
      
      if (error) {
        console.error('Get marks by criteria error:', error);
        return { success: false, data: [], error };
      }

      // Filter by class if provided (using UPPERCASE comparison)
      let result = data || [];
      if (className) {
        const normalizedClass = className.trim().toUpperCase();
        result = result.filter((item: any) => {
          const itemClass = (item.class || item.student?.class || '').trim().toUpperCase();
          return itemClass === normalizedClass;
        });
      }

      // Normalize all text fields to UPPERCASE
      result = result.map((mark: any) => ({
        ...mark,
        subject: mark.subject ? mark.subject.toUpperCase() : '',
        exam_name: mark.exam_name ? mark.exam_name.toUpperCase() : '',
        class: (mark.class || mark.student?.class || '').toUpperCase(),
      }));

      return { success: true, data: result };
    } catch (error) {
      console.error('Get marks by criteria error:', error);
      return { success: false, data: [] };
    }
  },

  async addMarks(markData: Partial<Mark>) {
    try {
      // Ensure subject/exam are stored in uppercase
      const sanitized = {
        ...markData,
        subject: markData.subject ? (markData.subject as string).toUpperCase() : markData.subject,
        exam_name: markData.exam_name ? (markData.exam_name as string).toUpperCase() : markData.exam_name,
      } as any;

      const { data, error } = await supabase
        .from('marks')
        .insert([sanitized])
        .select()
        .single();

      if (error) {
        // Some environments may have legacy/strict FK constraints on teacher_id.
        // If teacher_id cannot be resolved to a valid FK, retry once with NULL teacher_id.
        if (
          sanitized.teacher_id &&
          (String(error.message || '').includes('marks_teacher_id_fkey') ||
            String(error.details || '').includes('marks_teacher_id_fkey') ||
            String(error.message || '').toLowerCase().includes('foreign key'))
        ) {
          console.warn('teacher_id FK failed while adding marks, retrying with NULL teacher_id', {
            teacher_id: sanitized.teacher_id,
            error: error.message,
          });

          const retryPayload = {
            ...sanitized,
            teacher_id: null,
          };

          const { data: retryData, error: retryError } = await supabase
            .from('marks')
            .insert([retryPayload])
            .select()
            .single();

          if (!retryError) {
            return { success: true, data: retryData, error: null };
          }

          console.error('Supabase add marks retry error:', retryError);
          return { success: false, data: null, error: retryError.message };
        }

        console.error('Supabase add marks error:', error);
        return { success: false, data: null, error: error.message };
      }

      return { success: true, data, error: null };
    } catch (error) {
      console.error('Add marks error:', error);
      return { success: false, data: null, error: String(error) };
    }
  },

  async updateMarks(markId: string, updates: Partial<Mark>) {
    try {
      // Normalize updates to uppercase for consistency
      const sanitizedUpdates = {
        ...updates,
        subject: updates.subject ? (updates.subject as string).toUpperCase() : updates.subject,
        exam_name: updates.exam_name ? (updates.exam_name as string).toUpperCase() : updates.exam_name,
      } as any;

      const { data, error } = await supabase
        .from('marks')
        .update(sanitizedUpdates)
        .eq('id', markId)
        .select()
        .single();

      if (error) {
        console.error('Supabase update marks error:', error);
        return { success: false, data: null, error: error.message };
      }

      return { success: true, data, error: null };
    } catch (error) {
      console.error('Update marks error:', error);
      return { success: false, data: null, error: String(error) };
    }
  },

  async deleteMarks(markId: string) {
    try {
      const { error } = await supabase
        .from('marks')
        .delete()
        .eq('id', markId);

      if (error) {
        console.error('Supabase delete marks error:', error);
        return { success: false, error: error.message };
      }

      return { success: true, error: null };
    } catch (error) {
      console.error('Delete marks error:', error);
      return { success: false, error: String(error) };
    }
  },
};

// ==================== ATTENDANCE SERVICE ====================
export const attendanceService = {
  async getAttendanceByStudent(studentId: string) {
    try {
      const { data, error } = await supabase
        .from('attendance')
        .select('*')
        .eq('student_id', studentId)
        .order('date', { ascending: false });

      return { success: !error, data: data || [], error };
    } catch (error) {
      console.error('Get attendance error:', error);
      return { success: false, data: [] };
    }
  },

  async getAttendanceStats(studentId: string) {
    try {
      const { data, error } = await supabase
        .from('attendance')
        .select('status')
        .eq('student_id', studentId);

      if (error || !data) {
        return { success: false, stats: { present: 0, absent: 0, leave: 0 } };
      }

      const stats: { [key: string]: number } = data.reduce(
        (acc: any, record: any) => {
          const status = record.status as string;
          if (status in acc) {
            acc[status] = (acc[status] || 0) + 1;
          }
          return acc;
        },
        { present: 0, absent: 0, leave: 0 }
      );

      return { success: true, stats };
    } catch (error) {
      console.error('Get attendance stats error:', error);
      return { success: false, stats: { present: 0, absent: 0, leave: 0 } };
    }
  },

  async getAttendanceByDate(date: string) {
    try {
      const { data, error } = await supabase
        .from('attendance')
        .select('*')
        .eq('date', date)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Get attendance by date error:', error);
        return { success: false, data: [], error };
      }

      return { success: true, data: data || [], error: null };
    } catch (error) {
      console.error('Get attendance by date error:', error);
      return { success: false, data: [] };
    }
  },

  async markAttendance(attendanceData: Partial<Attendance>) {
    try {
      // Check if record exists (don't use .single() as it throws on no results)
      const { data: existingRecords, error: fetchError } = await supabase
        .from('attendance')
        .select('id')
        .eq('student_id', attendanceData.student_id)
        .eq('date', attendanceData.date);

      if (fetchError) {
        console.error('Check attendance error:', fetchError.message);
        return { success: false, data: null, error: fetchError.message };
      }

      const existingRecord = existingRecords && existingRecords.length > 0 ? existingRecords[0] : null;

      if (existingRecord) {
        // Update existing record
        const { data, error } = await supabase
          .from('attendance')
          .update({ status: attendanceData.status })
          .eq('id', existingRecord.id)
          .select()
          .single();

        if (error) {
          console.error('Mark attendance update error:', error.message);
          return { success: false, data: null, error: error.message };
        }

        return { success: true, data, error: null };
      } else {
        // Insert new record
        const { data, error } = await supabase
          .from('attendance')
          .insert([{
            student_id: attendanceData.student_id,
            date: attendanceData.date,
            status: attendanceData.status,
          }])
          .select()
          .single();

        if (error) {
          console.error('Mark attendance insert error:', error.message);
          return { success: false, data: null, error: error.message };
        }

        return { success: true, data, error: null };
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error('Mark attendance error:', errorMsg);
      return { success: false, data: null, error: errorMsg };
    }
  },

  async markBulkAttendance(attendanceList: Partial<Attendance>[]) {
    try {
      console.log('=== BULK ATTENDANCE SERVICE DEBUG ===');
      console.log('Raw input attendanceList:', attendanceList);
      
      // Validate input
      if (!attendanceList || attendanceList.length === 0) {
        console.warn('Empty or null attendance list received');
        return { success: false, error: 'Empty attendance list' };
      }

      // Filter and validate records
      const validRecords: any[] = [];
      const invalidRecords: any[] = [];
      
      for (const record of attendanceList) {
        console.log(`Validating record:`, {
          student_id: record.student_id,
          student_id_type: typeof record.student_id,
          student_id_truthy: !!record.student_id,
          date: record.date,
          status: record.status,
        });
        
        // Check if all required fields exist and are valid
        if (!record.student_id || !record.date || !record.status) {
          console.warn('Record missing required fields:', record);
          invalidRecords.push(record);
          continue;
        }
        
        // Check if student_id is a valid UUID format (basic check)
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(String(record.student_id))) {
          console.warn('Record has invalid UUID format:', {
            student_id: record.student_id,
            type: typeof record.student_id
          });
          invalidRecords.push(record);
          continue;
        }
        
        // Validate status value
        if (!['present', 'absent', 'leave'].includes(record.status)) {
          console.warn('Record has invalid status:', record.status);
          invalidRecords.push(record);
          continue;
        }
        
        validRecords.push({
          student_id: record.student_id,
          date: record.date,
          status: record.status,
        });
      }

      console.log(`Validation summary:`, {
        totalReceivedRecords: attendanceList.length,
        validRecords: validRecords.length,
        invalidRecords: invalidRecords.length,
      });

      if (invalidRecords.length > 0) {
        console.error('Invalid records detected:', invalidRecords);
        return { success: false, error: `${invalidRecords.length} records are invalid (missing data or wrong format)` };
      }

      if (validRecords.length === 0) {
        return { success: false, error: 'No valid records to submit' };
      }

      console.log('Processing attendance records individually...');
      let successCount = 0;
      let errorCount = 0;
      let lastError = '';
      
      for (const record of validRecords) {
        try {
          console.log(`\nProcessing: student_id="${record.student_id}", date="${record.date}", status="${record.status}"`);
          
          // Check if record exists (don't use .single() as it throws on no results)
          const { data: existingRecords, error: fetchError } = await supabase
            .from('attendance')
            .select('id')
            .eq('student_id', record.student_id)
            .eq('date', record.date);
          
          if (fetchError) {
            console.error('Fetch error:', fetchError);
            errorCount++;
            lastError = fetchError.message;
            continue;
          }

          const existingRecord = existingRecords && existingRecords.length > 0 ? existingRecords[0] : null;

          if (existingRecord) {
            console.log(`Found existing record, updating...`);
            // Update existing record
            const { error: updateError } = await supabase
              .from('attendance')
              .update({ status: record.status })
              .eq('id', existingRecord.id);
            
            if (updateError) {
              console.error('Update error for', record.student_id, ':', updateError.message);
              errorCount++;
              lastError = updateError.message;
            } else {
              successCount++;
              console.log(`✓ Updated successfully`);
            }
          } else {
            console.log(`No existing record, inserting new...`);
            // Insert new record
            const { data: insertedData, error: insertError } = await supabase
              .from('attendance')
              .insert({
                student_id: record.student_id,
                date: record.date,
                status: record.status,
              })
              .select();
            
            if (insertError) {
              console.error('Insert error for', record.student_id, ':', insertError);
              console.error('Detailed error:', {
                code: (insertError as any)?.code,
                message: insertError.message,
                details: (insertError as any)?.details,
                hint: (insertError as any)?.hint,
              });
              errorCount++;
              lastError = insertError.message;
            } else {
              successCount++;
              console.log(`✓ Inserted successfully`, insertedData);
            }
          }
        } catch (itemError) {
          console.error('Item processing error:', itemError);
          errorCount++;
          lastError = itemError instanceof Error ? itemError.message : String(itemError);
        }
      }

      console.log(`\nResults: ${successCount} successful, ${errorCount} failed`);
      
      if (errorCount > 0) {
        const errorMsg = `${successCount}/${validRecords.length} records saved. Error: ${lastError}`;
        console.error(errorMsg);
        return { success: false, error: errorMsg };
      }

      console.log(`✓ Bulk attendance saved: ${validRecords.length} records`);
      return { success: true, error: null };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error('Bulk attendance exception:', { message: errorMsg, stack: error instanceof Error ? error.stack : 'N/A' });
      return { success: false, error: errorMsg };
    } finally {
      console.log('=== END BULK ATTENDANCE SERVICE ===');
    }
  },
};

// ==================== FEE SERVICE ====================
export const feeService = {
  async getFeesByStudent(studentId: string) {
    try {
      // First try to get fees from the fees table
      const { data: feesData, error: feesError } = await supabase
        .from('fees')
        .select('*')
        .eq('student_id', studentId)
        .order('year', { ascending: false });

      if (!feesError && feesData && feesData.length > 0) {
        // Calculate balance for each fee (total_amount - paid_amount)
        const feesWithBalance = feesData.map((fee: any) => ({
          ...fee,
          balance: (fee.total_amount || 0) - (fee.paid_amount || 0)
        }));
        return { success: true, data: feesWithBalance, error: null };
      }

      // If no fees in fees table, check users table for initial/current fees
      console.log(`📌 No fees in fees table, checking users table for student ${studentId}`);
      
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id, register_no, name, class, initial_fee, current_fee')
        .eq('id', studentId)
        .single();

      if (userError || !userData) {
        console.warn(`⚠️ [getFeesByStudent] Student not found: ${studentId}`);
        return { success: true, data: [], error: null };
      }

      // Convert user fees to fees format
      const userFees = [];
      const currentYear = new Date().getFullYear();
      
      if (userData.current_fee && userData.current_fee > 0) {
        userFees.push({
          id: `user-fee-${userData.id}`,
          student_id: userData.id,
          month: 'Registration',
          year: currentYear,
          total_amount: userData.current_fee,
          paid_amount: 0,
          balance: userData.current_fee,
          status: 'pending',
          created_at: new Date().toISOString()
        });
      }

      console.log(`✅ [getFeesByStudent] Found ${userFees.length} fees from users table for student ${studentId}`);
      return { success: true, data: userFees, error: null };
    } catch (error) {
      console.error('Get fees error:', error);
      return { success: false, data: [] };
    }
  },

  async getFeeStatistics(className?: string) {
    try {
      let query = supabase.from('fees').select('*');

      if (className) {
        query = query.eq('students.class', className);
      }

      const { data, error } = await query;

      if (error || !data) {
        return { success: false, stats: { total: 0, paid: 0, pending: 0 } };
      }

      const stats = data.reduce(
        (acc: any, fee: any) => {
          acc.total += fee.total_amount || 0;
          acc.paid += fee.paid_amount || 0;
          acc.pending += fee.balance || 0;
          return acc;
        },
        { total: 0, paid: 0, pending: 0 }
      );

      return { success: true, stats };
    } catch (error) {
      console.error('Get fee stats error:', error);
      return { success: false, stats: { total: 0, paid: 0, pending: 0 } };
    }
  },

  async addFee(feeData: Partial<Fee>) {
    try {
      console.log('📝 [addFee] Attempting to insert fee:', feeData);
      
      // Verify student exists and is active
      if (feeData.student_id) {
        const { data: studentCheck, error: studentError } = await supabase
          .from('users')
          .select('id, name, status')
          .eq('id', feeData.student_id)
          .single();

        if (studentError || !studentCheck) {
          console.error('❌ [addFee] Student not found:', feeData.student_id);
          return { success: false, data: null, error: { message: 'Student not found in database' } };
        }

        if (studentCheck.status !== 'Active') {
          console.error('❌ [addFee] Student is not active:', studentCheck.status);
          return { success: false, data: null, error: { message: `Student is ${studentCheck.status}, cannot add fee` } };
        }

        console.log('✅ [addFee] Student verified:', studentCheck.name);
      }

      // Attempt normal insert
      const { data, error } = await supabase
        .from('fees')
        .insert([feeData])
        .select()
        .single();

      if (error) {
        console.error('❌ [addFee] Insert error:', error);

        // If FK constraint error, try alternative approach
        if (error.code === '23503' || error.message?.includes('foreign key')) {
          console.warn('⚠️ [addFee] FK constraint issue detected, attempting workaround...');
          
          // Try without balance column if it exists
          const feeDataWithoutBalance = { ...feeData };
          if ('balance' in feeDataWithoutBalance) {
            delete (feeDataWithoutBalance as any).balance;
          }

          const { data: retryData, error: retryError } = await supabase
            .from('fees')
            .insert([feeDataWithoutBalance])
            .select()
            .single();

          if (retryError) {
            console.error('❌ [addFee] Workaround also failed:', retryError);
            return { success: false, data: null, error: retryError };
          }

          console.log('✅ [addFee] Fee added via workaround:', retryData);
          return { success: true, data: retryData, error: null };
        }

        return { success: false, data: null, error };
      }

      console.log('✅ [addFee] Fee added successfully:', data);
      return { success: true, data, error: null };
    } catch (error) {
      console.error('❌ [addFee] Exception:', error);
      return { success: false, data: null, error: { message: error instanceof Error ? error.message : 'Unknown error' } };
    }
  },

  async updateFeePayment(feeId: string, paidAmount: number) {
    try {
      const { data: fee } = await supabase
        .from('fees')
        .select('*')
        .eq('id', feeId)
        .single();

      if (!fee) {
        return { success: false, data: null };
      }

      const newBalance = fee.total_amount - (fee.paid_amount + paidAmount);

      const { data, error } = await supabase
        .from('fees')
        .update({
          paid_amount: fee.paid_amount + paidAmount,
          balance: newBalance,
          status: newBalance <= 0 ? 'paid' : newBalance < fee.total_amount ? 'partial' : 'pending',
        })
        .eq('id', feeId)
        .select()
        .single();

      return { success: !error, data, error };
    } catch (error) {
      console.error('Update fee error:', error);
      return { success: false, data: null };
    }
  },

  async getFeesByClass(className: string) {
    try {
      console.log(`🔍 [getFeesByClass] Starting - looking for class: "${className}"`);
      
      if (!className || className.trim().length === 0) {
        console.error('❌ [getFeesByClass] Invalid class name provided');
        return { success: false, data: [], error: 'Invalid class name' };
      }

      // Get all active students in the class with their fee fields
      console.log(`📌 [getFeesByClass] Querying students table...`);
      const { data: students, error: studentError } = await supabase
        .from('users')
        .select('id, register_no, name, class, email, phone, initial_fee, current_fee')
        .eq('class', className)
        .eq('role', 'student')
        .eq('status', 'Active');

      if (studentError) {
        console.error(`❌ [getFeesByClass] Student fetch error:`, studentError);
        return { success: false, data: [], error: `Student fetch failed: ${studentError.message}` };
      }

      if (!students || students.length === 0) {
        console.warn(`⚠️ [getFeesByClass] No students found in class: ${className}`);
        console.log(`   - Searched for class: "${className}"`);
        console.log(`   - Looking for role: "student" and status: "Active"`);
        return { success: true, data: [] };
      }

      console.log(`✅ [getFeesByClass] Found ${students.length} students in ${className}`);
      students.forEach((s: any) => {
        console.log(`   - ID: ${s.id} | Register: ${s.register_no} | Name: ${s.name}`);
      });

      // Get historical fees from the fees table
      console.log(`📌 [getFeesByClass] Querying fees table for ${students.length} students...`);
      const studentIds = students.map((s: any) => s.id);
      const currentYear = new Date().getFullYear();
      
      const { data: fees, error: feeError } = await supabase
        .from('fees')
        .select('id, student_id, month, year, total_amount, paid_amount, status, created_at')
        .in('student_id', studentIds)
        .order('year', { ascending: false })
        .order('month', { ascending: false });

      if (feeError) {
        console.warn(`⚠️ [getFeesByClass] Fee fetch error (non-critical):`, feeError.message);
      }

      console.log(`✅ [getFeesByClass] Found ${fees?.length || 0} fee records in fees table`);

      // Combine students with their fees from both sources
      const result = students.map((student: any) => {
        // Get fees from fees table
        const feesFromTable = (fees || [])
          .filter((f: any) => f.student_id === student.id)
          .map((f: any) => ({
            ...f,
            balance: (f.total_amount || 0) - (f.paid_amount || 0)
          }));

        // Create a fee record from current_fee in users table
        const feesFromUser = [];
        if (student.current_fee && student.current_fee > 0) {
          feesFromUser.push({
            id: `user-fee-${student.id}`,
            student_id: student.id,
            month: 'Registration',
            year: currentYear,
            total_amount: student.current_fee,
            paid_amount: 0,
            balance: student.current_fee,
            status: 'pending',
            created_at: new Date().toISOString()
          });
        }

        // Combine both sources (fees table + user fees)
        const allFees = [...feesFromTable, ...feesFromUser];

        return {
          id: student.id,
          register_no: student.register_no,
          name: student.name,
          class: student.class,
          email: student.email,
          phone: student.phone,
          initial_fee: student.initial_fee,
          current_fee: student.current_fee,
          fees: allFees,
        };
      });

      console.log(`✅ [getFeesByClass] Combined result for ${result.length} students:`, 
        result.map((s: any) => ({ 
          id: s.id, 
          register_no: s.register_no, 
          name: s.name,
          current_fee: s.current_fee,
          fee_count: s.fees.length 
        }))
      );
      return { success: true, data: result };
    } catch (error: any) {
      console.error(`❌ [getFeesByClass] Exception:`, error);
      return { success: false, data: [], error: error?.message || 'Unknown error' };
    }
  },

  async getAllFees() {
    try {
      console.log(`🔍 [getAllFees] Fetching all fees from all classes`);
      
      // Get all active students
      const { data: students, error: studentError } = await supabase
        .from('users')
        .select('id, register_no, name, class, email, phone, initial_fee, current_fee')
        .eq('role', 'student')
        .eq('status', 'Active')
        .order('class', { ascending: true });

      if (studentError) {
        console.error(`❌ [getAllFees] Student fetch error:`, studentError);
        return { success: false, data: [], error: `Student fetch failed: ${studentError.message}` };
      }

      if (!students || students.length === 0) {
        console.warn(`⚠️ [getAllFees] No active students found`);
        return { success: true, data: [] };
      }

      console.log(`✅ [getAllFees] Found ${students.length} students`);

      // Get all fees from fees table
      const studentIds = students.map((s: any) => s.id);
      const { data: fees, error: feeError } = await supabase
        .from('fees')
        .select('id, student_id, month, year, total_amount, paid_amount, balance, status, created_at')
        .in('student_id', studentIds)
        .order('created_at', { ascending: false });

      if (feeError) {
        console.warn(`⚠️ [getAllFees] Fee fetch error:`, feeError.message);
      }

      console.log(`✅ [getAllFees] Found ${fees?.length || 0} fee records`);

      // Flatten all fees into a single array with student info
      const allFees: any[] = [];
      const currentYear = new Date().getFullYear();

      students.forEach((student: any) => {
        // Add fees from fees table
        const studentFees = (fees || []).filter((f: any) => f.student_id === student.id);
        
        studentFees.forEach((fee: any) => {
          allFees.push({
            ...fee,
            register_no: student.register_no,
            student_name: student.name,
            class: student.class,
            email: student.email,
            phone: student.phone,
            balance: (fee.total_amount || 0) - (fee.paid_amount || 0)
          });
        });

        // Add registration fee from user record if exists
        if (student.current_fee && student.current_fee > 0) {
          // Check if already added as a fee record
          const registrationFeeExists = studentFees.some((f: any) => f.month === 'Registration');
          if (!registrationFeeExists) {
            allFees.push({
              id: `user-fee-${student.id}`,
              student_id: student.id,
              register_no: student.register_no,
              student_name: student.name,
              class: student.class,
              email: student.email,
              phone: student.phone,
              month: 'Registration',
              year: currentYear,
              total_amount: student.current_fee,
              paid_amount: 0,
              balance: student.current_fee,
              status: 'pending',
              created_at: new Date().toISOString()
            });
          }
        }
      });

      console.log(`✅ [getAllFees] Total fees to display: ${allFees.length}`);
      return { success: true, data: allFees };
    } catch (error: any) {
      console.error(`❌ [getAllFees] Exception:`, error);
      return { success: false, data: [], error: error?.message || 'Unknown error' };
    }
  },

  // Diagnostic function to help debug student loading issues
  async getStudentDiagnostics(className?: string) {
    try {
      console.log(`🔍 [getStudentDiagnostics] Starting diagnostics${className ? ` for class: "${className}"` : ''}`);
      
      // Get all students
      const { data: allStudents, error: allError } = await supabase
        .from('users')
        .select('id, register_no, name, class, role, status, email')
        .eq('role', 'student')
        .limit(100);

      if (allError) {
        console.error(`❌ [getStudentDiagnostics] Error fetching all students:`, allError);
        return { success: false, data: null };
      }

      console.log(`📊 [getStudentDiagnostics] Total students in database: ${allStudents?.length || 0}`);
      
      if (allStudents && allStudents.length > 0) {
        const classes = new Set(allStudents.map((s: any) => s.class));
        console.log(`📚 [getStudentDiagnostics] Classes in database:`, Array.from(classes));
        
        if (className) {
          const classStudents = allStudents.filter((s: any) => s.class === className);
          console.log(`👥 [getStudentDiagnostics] Students in class "${className}":`, classStudents.length);
          classStudents.forEach((s: any) => {
            console.log(`   - ${s.register_no}: ${s.name} (Status: ${s.status})`);
          });
        }

        console.log(`\n📋 [getStudentDiagnostics] All students:`);
        allStudents.forEach((s: any) => {
          console.log(`   - ${s.register_no}: ${s.name} (Class: ${s.class}, Status: ${s.status})`);
        });
      }

      return { success: true, data: allStudents };
    } catch (error: any) {
      console.error(`❌ [getStudentDiagnostics] Exception:`, error);
      return { success: false, data: null };
    }
  },

  async updateFeeStatusByClassTeacher(feeId: string, status: 'pending' | 'partial' | 'paid', teacherId: string) {
    try {
      // First get current fee data
      const { data: fee } = await supabase
        .from('fees')
        .select('*')
        .eq('id', feeId)
        .single();

      if (!fee) {
        return { success: false, error: 'Fee record not found' };
      }

      // Update fee status
      const { data, error } = await supabase
        .from('fees')
        .update({
          status: status,
          updated_at: new Date().toISOString(),
        })
        .eq('id', feeId)
        .select()
        .single();

      if (error) {
        return { success: false, error: error.message };
      }

      // Log the update to audit/tracking
      await supabase
        .from('fee_status_updates')
        .insert({
          fee_id: feeId,
          student_id: fee.student_id,
          old_status: fee.status,
          new_status: status,
          updated_by: teacherId,
          updated_by_role: 'teacher',
          updated_at: new Date().toISOString(),
          notes: `Fee status updated by class teacher`,
        })
        .select();

      return { success: !error, data };
    } catch (error) {
      console.error('Update fee status error:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Error updating fee status' };
    }
  },
};

// ==================== FEE STATUS UPDATES SERVICE ====================
export const feeStatusUpdateService = {
  async getClassTeacherFeeUpdates(teacherId: string) {
    try {
      const { data, error } = await supabase
        .from('fee_status_updates')
        .select('*')
        .eq('updated_by', teacherId)
        .order('updated_at', { ascending: false });

      return { success: !error, data: data || [], error };
    } catch (error) {
      console.error('Get fee updates error:', error);
      return { success: false, data: [] };
    }
  },
};

// ==================== TEACHER SERVICE ====================
export const teacherService = {
  async getAllTeachers() {
    try {
      // Call backend API to get all teachers
      const response = await apiRequest<any>('/users/teachers/all', { method: 'GET' });
      
      if (!response.success) {
        console.error('Get teachers error:', response);
        return { success: false, data: [] };
      }

      // Normalize teacher objects to uppercase fields (except email/password/ids)
      const normalized = (response.data || []).map((t: any) => normalizeObject(t));
      return { success: true, data: normalized };
    } catch (error) {
      console.error('Get teachers error:', error);
      return { success: false, data: [] };
    }
  },

  async getTeacherById(teacherId: string) {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', teacherId)
        .eq('role', 'teacher')
        .single();

      const normalized = data ? normalizeObject(data) : data;
      return { success: !error, data: normalized, error };
    } catch (error) {
      console.error('Get teacher error:', error);
      return { success: false, data: null };
    }
  },

  async getClassTeacher(className: string) {
    try {
      // Call backend API to get class teacher
      const response = await apiRequest<any>(`/classes/teacher/${className}`, { method: 'GET' });

      if (!response.success) {
        console.error('Get class teacher error:', response);
        return { success: false, data: null };
      }

      const data = response.data ? normalizeObject(response.data) : null;
      return { success: true, data };
    } catch (error) {
      console.error('Get class teacher error:', error);
      return { success: false, data: null };
    }
  },

  async assignClassTeacher(teacherId: string, className: string) {
    try {
      // Call backend API to assign teacher to class
      const response = await apiRequest<any>(`/classes/teacher/${className}`, {
        method: 'PUT',
        body: JSON.stringify({ teacherId }),
      });

      if (!response.success) {
        console.error('Assign class teacher error:', response);
        return { success: false, data: null };
      }

      return { success: true, data: response.data };
    } catch (error) {
      console.error('Assign class teacher error:', error);
      return { success: false, data: null };
    }
  },

  async removeClassTeacher(className: string) {
    try {
      const response = await apiRequest<any>(`/classes/teacher/${className}/remove`, {
        method: 'PUT',
      });

      if (!response.success) {
        console.error('Remove class teacher error:', response);
        return { success: false, data: null };
      }

      return { success: true, data: response.data };
    } catch (error) {
      console.error('Remove class teacher error:', error);
      return { success: false, data: null };
    }
  },

  async getTeachersByClass(className: string) {
    try {
      // Get all teachers who teach in a specific class
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('role', 'teacher')
        .contains('assigned_classes', [className]);

      return { success: !error, data: data || [], error };
    } catch (error) {
      console.error('Get teachers by class error:', error);
      return { success: false, data: [] };
    }
  },

  async updateTeacherSubjects(teacherId: string, subjects: string[]) {
    try {
      const { data, error } = await supabase
        .from('users')
        .update({ subjects: subjects.join(',') })
        .eq('id', teacherId)
        .select()
        .single();

      return { success: !error, data, error };
    } catch (error) {
      console.error('Update teacher subjects error:', error);
      return { success: false, data: null };
    }
  },
};

// ==================== CLASS CONFIGURATION SERVICE ====================
export const classConfigService = {
  async getAllClassConfigs() {
    try {
      const result = await apiRequest<any[]>('/classes');
      if (!result.success) {
        console.error('❌ Error fetching class configs:', result.error);
        return { success: false, data: [] };
      }

      // Normalize class names to UPPERCASE for consistency
      const normalizedData = (result.data || []).map((config: any) => ({
        ...config,
        class_name: config.class_name ? config.class_name.toUpperCase() : '',
      }));

      return { success: true, data: normalizedData || [] };
    } catch (error) {
      console.error('Get class configs error:', error);
      return { success: false, data: [] };
    }
  },

  async getClassConfig(className: string) {
    try {
      const result = await apiRequest<any[]>('/classes');
      const data = result.data || [];

      const matched = data.find((item: any) => item.class_name?.toUpperCase() === className.toUpperCase());

      if (!result.success || !matched) {
        return { success: false, data: null, error: result.error };
      }

      return { success: true, data: matched, error: null };
    } catch (error) {
      console.error('Get class config error:', error);
      return { success: false, data: null };
    }
  },

  async setMaxStudents(className: string, maxStudents: number, subjects: string | null = null) {
    try {
      const normalizedClassName = className.trim();
      console.log('setMaxStudents called with:', { className: normalizedClassName, maxStudents, subjects });
      
      const existing = await this.getClassConfig(normalizedClassName);
      const method = existing.success && existing.data ? 'PUT' : 'POST';
      const path = existing.success && existing.data ? `/classes/${existing.data.id}` : '/classes';

      const result = await apiRequest<any>(path, {
        method,
        body: JSON.stringify({
          class_name: normalizedClassName,
          max_students: maxStudents,
          subjects,
        }),
      });

      return { success: result.success, data: result.data || null, error: result.error };
    } catch (error) {
      console.error('Exception in setMaxStudents:', error);
      return { success: false, data: null, error };
    }
  },

  async updateSubjects(className: string, subjects: string) {
    try {
      const normalizedClassName = className.trim();
      console.log('updateSubjects called with:', { className: normalizedClassName, subjects });
      
      const { data, error } = await supabase
        .from('class_config')
        .update({ 
          subjects: subjects.trim(),
          updated_at: new Date().toISOString()
        })
        .ilike('class_name', normalizedClassName)
        .select();

      console.log('Update subjects result:', { data, error });
      return { success: !error, data: data?.[0] || null, error };
    } catch (error) {
      console.error('Exception in updateSubjects:', error);
      return { success: false, data: null, error };
    }
  },

  async getAvailableClasses() {
    try {
      // Get all classes and filter in JavaScript
      const { data, error } = await supabase
        .from('class_config')
        .select('*');

      if (error) {
        return { success: false, data: [], error };
      }

      // Filter for available classes (where current < max)
      const available = (data || []).filter(c => c.current_students < c.max_students);
      return { success: true, data: available, error: null };
    } catch (error) {
      console.error('Get available classes error:', error);
      return { success: false, data: [] };
    }
  },

  async getClassCapacity(className: string) {
    try {
      // Get how many more students can be added to this class (case-insensitive)
      const normalizedClassName = className.trim();
      const { data, error } = await supabase
        .from('class_config')
        .select('max_students, current_students')
        .ilike('class_name', normalizedClassName);

      if (error || !data || data.length === 0) {
        return { success: false, capacity: 0, used: 0, available: 0 };
      }

      const classData = data[0];
      const available = classData.max_students - classData.current_students;
      return {
        success: true,
        capacity: classData.max_students,
        used: classData.current_students,
        available: Math.max(0, available),
      };
    } catch (error) {
      console.error('Get class capacity error:', error);
      return { success: false, capacity: 0, used: 0, available: 0 };
    }
  },

  async incrementStudentCount(className: string) {
    try {
      // Fetch current count
      const { data: current, error: selectError } = await supabase
        .from('class_config')
        .select('current_students')
        .eq('class_name', className);

      if (selectError || !current || current.length === 0) {
        return { success: false, data: null, error: selectError };
      }

      const newCount = (current[0].current_students || 0) + 1;

      // Update with new count
      const { data, error } = await supabase
        .from('class_config')
        .update({
          current_students: newCount,
          updated_at: new Date().toISOString(),
        })
        .eq('class_name', className)
        .select();

      return { success: !error, data: data?.[0] || null, error };
    } catch (error) {
      console.error('Increment student count error:', error);
      return { success: false, data: null };
    }
  },

  async decrementStudentCount(className: string) {
    try {
      // Fetch current count
      const { data: current, error: selectError } = await supabase
        .from('class_config')
        .select('current_students')
        .eq('class_name', className);

      if (selectError || !current || current.length === 0) {
        return { success: false, data: null, error: selectError };
      }

      const newCount = Math.max(0, (current[0].current_students || 1) - 1);

      // Update with new count
      const { data, error } = await supabase
        .from('class_config')
        .update({
          current_students: newCount,
          updated_at: new Date().toISOString(),
        })
        .eq('class_name', className)
        .select();

      return { success: !error, data: data?.[0] || null, error };
    } catch (error) {
      console.error('Decrement student count error:', error);
      return { success: false, data: null };
    }
  },

  async deleteClass(classId: string, className: string) {
    try {
      console.log('Deleting class via backend API:', { classId, className });

      const result = await apiRequest<any>(`/classes/${encodeURIComponent(String(classId))}`, {
        method: 'DELETE',
      });

      if (!result.success) {
        console.error('Backend delete failed:', result.error);
        return { success: false, error: result.error || 'Failed to delete class' };
      }

      return { success: true, message: result.message || `Class ${className} deleted successfully`, data: result.data || null };
    } catch (error) {
      console.error('Exception in deleteClass (API):', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error deleting class',
      };
    }
  },
};

// ==================== NOTIFICATION SERVICE ====================
export const notificationService = {
  async getNotifications(limit: number = 10) {
    try {
      const result = await apiRequest<any[]>(`/notifications?limit=${encodeURIComponent(String(limit))}`);
      return { success: result.success, data: result.data || [], error: result.error };
    } catch (error) {
      console.error('Get notifications error:', error);
      return { success: false, data: [] };
    }
  },

  async getNotificationsByRole(role: string, className?: string) {
    try {
      const queryParts = new URLSearchParams();
      queryParts.append('role', String(role || '').trim().toLowerCase());
      if (className) {
        queryParts.append('class', String(className).trim());
      }

      const result = await apiRequest<any[]>(`/notifications?${queryParts.toString()}`);
      return { success: result.success, data: result.data || [], error: result.error };
    } catch (error) {
      console.error('Get role notifications error:', error);
      return { success: false, data: [] };
    }
  },

  async sendNotification(notification: Partial<Notification> & { attachments?: File[] }) {
    try {
      const title = String(notification.title || notification.message || 'Notification').trim().slice(0, 120) || 'Notification';
      const message = String(notification.message || '').trim();
      if (!message) {
        return { success: false, data: null, error: 'Notification message is required' };
      }

      const attachments = (notification as Partial<Notification> & { attachments?: File[] }).attachments || [];

      if (attachments.length > 0) {
        const formData = new FormData();
        formData.append('title', title);
        formData.append('message', message);
        formData.append('target_role', String(notification.target_role || 'all').trim().toLowerCase());
        if (notification.target_class) {
          formData.append('target_class', String(notification.target_class).trim().toUpperCase());
        }
        formData.append('type', String(notification.type || 'info'));
        attachments.forEach((file) => formData.append('pdfs', file));

        const token = localStorage.getItem('auth_token');
        const response = await fetch(getApiUrl('/notifications/pdfs'), {
          method: 'POST',
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          body: formData,
        });

        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
          return { success: false, data: null, error: payload.error || 'Failed to send notification' };
        }

        return { success: true, data: payload.data || null, error: undefined };
      }

      const result = await apiRequest<any>('/notifications', {
        method: 'POST',
        body: JSON.stringify({
          title,
          message,
          target_role: String(notification.target_role || 'all').trim().toLowerCase(),
          target_class: notification.target_class ? String(notification.target_class).trim().toUpperCase() : null,
          type: notification.type || 'info',
        }),
      });

      return { success: result.success, data: result.data || null, error: result.error };
    } catch (error) {
      console.error('Send notification error:', error);
      return { success: false, data: null, error: error instanceof Error ? error.message : String(error) };
    }
  },
};

// ==================== STUDENT HISTORY SERVICE ====================
// Provides complete history of student performance across years
// Works even for deactivated/inactive students
export const studentHistoryService = {
  async getStudentCompleteHistory(studentId: string) {
    try {
      // Get student info (regardless of status)
      const { data: student, error: studentError } = await supabase
        .from('users')
        .select('*')
        .eq('id', studentId)
        .eq('role', 'student')
        .single();

      if (studentError || !student) {
        return { success: false, error: 'Student not found', data: null };
      }

      // Get all marks across all years
      const { data: marks } = await supabase
        .from('marks')
        .select('*')
        .eq('student_id', studentId)
        .order('created_at', { ascending: false });

      // Get all attendance records
      const { data: attendance } = await supabase
        .from('attendance')
        .select('*')
        .eq('student_id', studentId)
        .order('date', { ascending: false });

      // Get all fee records
      const { data: fees } = await supabase
        .from('fees')
        .select('*')
        .eq('student_id', studentId)
        .order('created_at', { ascending: false });

      // Calculate statistics
      const stats = {
        totalMarksRecords: marks?.length || 0,
        averagePercentage: 0,
        totalAttendanceDays: attendance?.length || 0,
        presentDays: attendance?.filter((a: any) => a.status === 'present').length || 0,
        totalFeesRecords: fees?.length || 0,
        totalFeesPaid: 0,
        totalFeesPending: 0,
      };

      // Calculate average percentage
      if (marks && marks.length > 0) {
        const totalPercentage = marks.reduce((sum: number, mark: any) => {
          return sum + ((mark.marks / mark.total) * 100);
        }, 0);
        stats.averagePercentage = Math.round((totalPercentage / marks.length) * 100) / 100;
      }

      // Calculate fees statistics
      if (fees && fees.length > 0) {
        stats.totalFeesPaid = fees.reduce((sum: number, fee: any) => sum + (fee.paid_amount || 0), 0);
        stats.totalFeesPending = fees.reduce((sum: number, fee: any) => sum + (fee.balance || 0), 0);
      }

      return {
        success: true,
        data: {
          student,
          marks: marks || [],
          attendance: attendance || [],
          fees: fees || [],
          statistics: stats,
        },
      };
    } catch (error) {
      console.error('Get student complete history error:', error);
      return { success: false, error: String(error), data: null };
    }
  },

  async getStudentByRegisterNo(registerNo: string) {
    try {
      // Get student by register number (regardless of status)
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('register_no', registerNo)
        .eq('role', 'student')
        .single();

      if (error || !data) {
        return { success: false, error: 'Student not found', data: null };
      }

      return { success: true, data };
    } catch (error) {
      console.error('Get student by register number error:', error);
      return { success: false, error: String(error), data: null };
    }
  },

  async searchStudentHistory(query: string) {
    try {
      // Search by name or register number (regardless of status)
      const { data, error } = await supabase
        .from('users')
        .select('id, register_no, name, class, status, created_at')
        .eq('role', 'student')
        .or(`name.ilike.%${query}%,register_no.ilike.%${query}%`)
        .order('name');

      if (error) {
        return { success: false, error: String(error), data: [] };
      }

      return { success: true, data: data || [] };
    } catch (error) {
      console.error('Search student history error:', error);
      return { success: false, error: String(error), data: [] };
    }
  },

  async getStudentsPerformanceSummary(className?: string) {
    try {
      const { data: allStudents, error: studentError } = await supabase
        .from('users')
        .select('id, register_no, name, class, status')
        .eq('role', 'student')
        .order('name');
      
      let students = allStudents;
      if (className) {
        const normalizedClassName = className.trim();
        students = (allStudents || []).filter((s: any) => 
          s.class && s.class.trim().toLowerCase() === normalizedClassName.toLowerCase()
        );
      }

      if (studentError || !students) {
        return { success: false, error: 'Failed to fetch students', data: [] };
      }

      // Fetch marks for performance calculation
      const { data: allMarks, error: marksError } = await supabase
        .from('marks')
        .select('student_id, marks, total, created_at');

      if (marksError) {
        return { success: false, error: 'Failed to fetch marks', data: [] };
      }

      // Group marks by student and calculate performance
      const studentPerformance = students.map((student: any) => {
        const studentMarks = allMarks?.filter((m: any) => m.student_id === student.id) || [];
        const avgPercentage = studentMarks.length > 0
          ? Math.round(
              (studentMarks.reduce((sum: number, m: any) => sum + (m.marks / m.total) * 100, 0) /
                studentMarks.length) *
                100
            ) / 100
          : 0;

        return {
          ...student,
          marksCount: studentMarks.length,
          averagePercentage: avgPercentage,
          performanceGrade: avgPercentage >= 80 ? 'A' : avgPercentage >= 60 ? 'B' : avgPercentage >= 40 ? 'C' : 'D',
        };
      });

      return { success: true, data: studentPerformance };
    } catch (error) {
      console.error('Get students performance summary error:', error);
      return { success: false, error: String(error), data: [] };
    }
  },
};

// ==================== EXAM SERVICE ====================
export const examService = {
  async getAllExams() {
    try {
      const { data, error } = await supabase
        .from('exams')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Get exams error:', error);
        return { success: false, data: [], error };
      }

      // Normalize text fields to UPPERCASE for consistency
      const normalizedData = (data || []).map((exam: any) => ({
        ...exam,
        exam_name: exam.exam_name ? exam.exam_name.toUpperCase() : '',
        class_name: exam.class_name ? exam.class_name.toUpperCase() : '',
        classes: exam.classes ? exam.classes.split(',').map((c: string) => c.trim().toUpperCase()).join(',') : '',
      }));

      return { success: true, data: normalizedData || [], error: null };
    } catch (error) {
      console.error('Get exams error:', error);
      return { success: false, data: [] };
    }
  },

  async getExamsByClass(className: string) {
    try {
      const normalizedClassName = className.trim().toUpperCase(); // ✅ UPPERCASE
      const { data, error } = await supabase
        .from('exams')
        .select('*')
        .ilike('class_name', normalizedClassName)
        .eq('is_active', true)
        .order('exam_number', { ascending: true });

      if (error) {
        console.error('Get exams by class error:', error);
        return { success: false, data: [], error };
      }

      // Normalize text fields to UPPERCASE for consistency
      const normalizedData = (data || []).map((exam: any) => ({
        ...exam,
        exam_name: exam.exam_name ? exam.exam_name.toUpperCase() : '',
        class_name: exam.class_name ? exam.class_name.toUpperCase() : '',
        classes: exam.classes ? exam.classes.split(',').map((c: string) => c.trim().toUpperCase()).join(',') : '',
      }));

      return { success: true, data: normalizedData || [], error: null };
    } catch (error) {
      console.error('Get exams by class error:', error);
      return { success: false, data: [] };
    }
  },

  async createExam(examData: any) {
    try {
      const { data, error } = await supabase
        .from('exams')
        .insert([{ ...examData, is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }])
        .select()
        .single();

      if (error) {
        console.error('Create exam error:', error);
        return { success: false, data: null, error: error.message };
      }

      return { success: true, data, error: null };
    } catch (error) {
      console.error('Create exam error:', error);
      return { success: false, data: null, error: String(error) };
    }
  },

  async updateExam(examId: string, examData: any) {
    try {
      const { data, error } = await supabase
        .from('exams')
        .update({ ...examData, updated_at: new Date().toISOString() })
        .eq('id', examId)
        .select()
        .single();

      if (error) {
        console.error('Update exam error:', error);
        return { success: false, data: null, error: error.message };
      }

      return { success: true, data, error: null };
    } catch (error) {
      console.error('Update exam error:', error);
      return { success: false, data: null, error: String(error) };
    }
  },

  async deleteExam(examId: string) {
    try {
      const { error } = await supabase
        .from('exams')
        .delete()
        .eq('id', examId);

      if (error) {
        console.error('Delete exam error:', error);
        return { success: false, error: error.message };
      }

      return { success: true, error: null };
    } catch (error) {
      console.error('Delete exam error:', error);
      return { success: false, error: String(error) };
    }
  },
};
