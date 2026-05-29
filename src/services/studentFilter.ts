/**
 * Student Filtering and Search Utilities
 */

import { supabase } from './supabase';
import { apiRequest } from './apiClient';

export interface StudentFilterOptions {
  class?: string;
  year?: number;
  status?: string;
  search?: string;
  sortBy?: 'register_no' | 'name' | 'class' | 'admission_year';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

export interface StudentSearchResult {
  id: string;
  register_no: string;
  name: string;
  email: string;
  class: string;
  admission_year: number;
  status: string;
}

/**
 * Advanced student filtering with multiple criteria
 */
export async function filterStudents(
  options: StudentFilterOptions
): Promise<StudentSearchResult[]> {
  try {
    const params = new URLSearchParams();
    if (options.class) params.set('class', options.class);
    if (options.year) params.set('admission_year', String(options.year));
    if (options.status) params.set('status', options.status);
    if (options.search) params.set('search', options.search);
    if (options.sortBy) params.set('sortBy', options.sortBy);
    if (options.sortOrder) params.set('sortOrder', options.sortOrder);
    if (options.limit) params.set('limit', String(options.limit));
    if (options.offset) params.set('offset', String(options.offset));

    const result = await apiRequest<StudentSearchResult[]>(`/students?${params.toString()}`);
    return result.success && result.data ? result.data : [];
  } catch (error) {
    console.error('Error filtering students:', error);
    return [];
  }
}

/**
 * Get students by status filters
 */
export async function getStudentsByStatusGroup(groupBy: 'Active' | 'Inactive' | 'All'): Promise<{
  active: StudentSearchResult[];
  inactive: StudentSearchResult[];
  transferred: StudentSearchResult[];
  dropped: StudentSearchResult[];
}> {
  try {
    const params = new URLSearchParams();
    if (groupBy !== 'All') params.set('status', groupBy);
    const result = await apiRequest<StudentSearchResult[]>(`/students?${params.toString()}`);
    const data = result.success && result.data ? result.data : [];

    const grouped = {
      active: data.filter((s) => s.status === 'Active'),
      inactive: data.filter((s) => s.status === 'Inactive'),
      transferred: data.filter((s) => s.status === 'Transferred'),
      dropped: data.filter((s) => s.status === 'Dropped'),
    };

    return grouped;
  } catch (error) {
    console.error('Error grouping students by status:', error);
    return { active: [], inactive: [], transferred: [], dropped: [] };
  }
}

/**
 * Search students by register number with year/school parsing
 */
export async function searchByRegisterNumber(registerNo: string): Promise<StudentSearchResult | null> {
  try {
    const result = await apiRequest<StudentSearchResult>(`/students?registerNo=${encodeURIComponent(registerNo)}`);
    if (!result.success || !result.data) {
      console.warn('Student not found:', registerNo);
      return null;
    }

    return result.data;
  } catch (error) {
    console.error('Error searching by register number:', error);
    return null;
  }
}

/**
 * Search students by name (partial match)
 */
export async function searchByName(name: string): Promise<StudentSearchResult[]> {
  try {
    const result = await apiRequest<StudentSearchResult[]>(`/students?search=${encodeURIComponent(name)}&sortBy=register_no&sortOrder=asc`);
    return result.success && result.data ? result.data : [];
  } catch (error) {
    console.error('Error searching by name:', error);
    return [];
  }
}

/**
 * Get all students in a specific class
 */
export async function getStudentsByClassName(className: string): Promise<StudentSearchResult[]> {
  try {
    const result = await apiRequest<StudentSearchResult[]>(`/students?class=${encodeURIComponent(className)}&status=Active&sortBy=register_no&sortOrder=asc`);
    return result.success && result.data ? result.data : [];
  } catch (error) {
    console.error('Error fetching class roster:', error);
    return [];
  }
}

/**
 * Get students by admission year
 */
export async function getStudentsByAdmissionYear(year: number): Promise<StudentSearchResult[]> {
  try {
    const result = await apiRequest<StudentSearchResult[]>(`/students?admission_year=${year}&sortBy=register_no&sortOrder=asc`);
    return result.success && result.data ? result.data : [];
  } catch (error) {
    console.error('Error fetching students by year:', error);
    return [];
  }
}

/**
 * Get statistics by register number prefix (year/school code)
 */
export async function getStatisticsByRegisterPrefix(prefix: string): Promise<{
  total: number;
  active: number;
  inactive: number;
  transferred: number;
  dropped: number;
}> {
  try {
    const result = await apiRequest<StudentSearchResult[]>(`/students?search=${encodeURIComponent(prefix)}`);
    const students = result.success && result.data ? result.data.filter((s) => s.register_no.startsWith(prefix)) : [];

    return {
      total: students.length,
      active: students.filter((s) => s.status === 'Active').length,
      inactive: students.filter((s) => s.status === 'Inactive').length,
      transferred: students.filter((s) => s.status === 'Transferred').length,
      dropped: students.filter((s) => s.status === 'Dropped').length,
    };
  } catch (error) {
    console.error('Error getting statistics:', error);
    return { total: 0, active: 0, inactive: 0, transferred: 0, dropped: 0 };
  }
}

/**
 * Get all classes and their enrollment
 */
export async function getClassEnrollmentStats(): Promise<
  Array<{
    class_name: string;
    max_students: number;
    current_students: number;
    percentage: number;
  }>
> {
  try {
    const result = await apiRequest<any[]>('/classes');
    const data = result.success && result.data ? result.data : [];

    return (data || []).map((c) => ({
      class_name: c.class_name,
      max_students: c.max_students,
      current_students: c.current_students,
      percentage: ((c.current_students / c.max_students) * 100).toFixed(2),
    }));
  } catch (error) {
    console.error('Error getting enrollment stats:', error);
    return [];
  }
}

/**
 * Get students with attendance data for reporting
 */
export async function getStudentsWithAttendanceStats(
  className: string,
  month: number,
  year: number
): Promise<
  Array<{
    register_no: string;
    name: string;
    present: number;
    absent: number;
    leave: number;
    percentage: number;
  }>
> {
  try {
    // Get students in class
    const students = await getStudentsByClassNameWithAttendance(className, month, year);
    return students;
  } catch (error) {
    console.error('Error getting attendance stats:', error);
    return [];
  }
}

/**
 * Helper: Get students with attendance data
 */
async function getStudentsByClassNameWithAttendance(
  className: string,
  month: number,
  year: number
): Promise<
  Array<{
    register_no: string;
    name: string;
    present: number;
    absent: number;
    leave: number;
    percentage: number;
  }>
> {
  try {
    // Get students in class
    const students = await getStudentsByClassNameWithoutAttendance(className);

    // Get attendance for each student
    const enriched = await Promise.all(
      students.map(async (student) => {
        const { data: attendance } = await supabase
          .from('attendance')
          .select('status')
          .eq('register_no', student.register_no)
          .eq('class', className)
          .gte('date', `${year}-${String(month).padStart(2, '0')}-01`)
          .lte('date', `${year}-${String(month).padStart(2, '0')}-31`);

        const attendanceData = attendance || [];
        const present = attendanceData.filter((a) => a.status === 'present').length;
        const absent = attendanceData.filter((a) => a.status === 'absent').length;
        const leave = attendanceData.filter((a) => a.status === 'leave').length;
        const total = attendanceData.length || 1;

        return {
          register_no: student.register_no,
          name: student.name,
          present,
          absent,
          leave,
          percentage: ((present / total) * 100).toFixed(2),
        };
      })
    );

    return enriched;
  } catch (error) {
    console.error('Error enriching with attendance data:', error);
    return [];
  }
}

/**
 * Helper: Get class students without attendance data
 */
async function getStudentsByClassNameWithoutAttendance(className: string): Promise<
  Array<{ register_no: string; name: string; class: string }>
> {
  try {
    const result = await apiRequest<any[]>(`/students?class=${encodeURIComponent(className)}&status=Active&sortBy=register_no&sortOrder=asc`);
    return result.success && result.data ? result.data : [];
  } catch (error) {
    console.error('Error getting class students:', error);
    return [];
  }
}

/**
 * Get students sorted by grade/performance
 */
export async function getStudentsByPerformance(
  className: string,
  year: number,
  limit: number = 10
): Promise<
  Array<{
    register_no: string;
    name: string;
    average_marks: number;
    total_subjects: number;
  }>
> {
  try {
    const students = await getStudentsByClassNameWithoutAttendance(className);

    const enriched = await Promise.all(
      students.map(async (student) => {
        const { data: marks } = await supabase
          .from('marks')
          .select('marks, total')
          .eq('register_no', student.register_no)
          .eq('year', year);

        const marksData = marks || [];
        const average =
          marksData.length > 0
            ? marksData.reduce((sum, m) => sum + (m.marks / m.total), 0) / marksData.length
            : 0;

        return {
          register_no: student.register_no,
          name: student.name,
          average_marks: parseFloat((average * 100).toFixed(2)),
          total_subjects: marksData.length,
        };
      })
    );

    return enriched.sort((a, b) => b.average_marks - a.average_marks).slice(0, limit);
  } catch (error) {
    console.error('Error getting performance stats:', error);
    return [];
  }
}

/**
 * Export student data (for reports)
 */
export async function exportStudentData(
  filters: StudentFilterOptions
): Promise<Array<Record<string, any>>> {
  try {
    const students = await filterStudents(filters);

    const enriched = await Promise.all(
      students.map(async (student) => {
        const { data: marks } = await supabase
          .from('marks')
          .select('COUNT(*)', { count: 'exact' })
          .eq('register_no', student.register_no);

        const { data: attendance } = await supabase
          .from('attendance')
          .select('COUNT(*)', { count: 'exact' })
          .eq('register_no', student.register_no);

        const { data: fees } = await supabase
          .from('fees')
          .select('*')
          .eq('register_no', student.register_no);

        const feeStats = (fees || []).reduce(
          (acc, f) => ({
            total: acc.total + f.total_amount,
            paid: acc.paid + f.paid_amount,
            balance: acc.balance + f.balance,
          }),
          { total: 0, paid: 0, balance: 0 }
        );

        return {
          register_no: student.register_no,
          name: student.name,
          email: student.email,
          class: student.class,
          admission_year: student.admission_year,
          status: student.status,
          marks_count: marks?.[0]?.count || 0,
          attendance_count: attendance?.[0]?.count || 0,
          total_fees: feeStats.total,
          fees_paid: feeStats.paid,
          fees_balance: feeStats.balance,
        };
      })
    );

    return enriched;
  } catch (error) {
    console.error('Error exporting student data:', error);
    return [];
  }
}

export default {
  filterStudents,
  getStudentsByStatusGroup,
  searchByRegisterNumber,
  searchByName,
  getStudentsByClassNameWithoutAttendance,
  getStudentsByAdmissionYear,
  getStatisticsByRegisterPrefix,
  getClassEnrollmentStats,
  getStudentsWithAttendanceStats,
  getStudentsByPerformance,
  exportStudentData,
};
