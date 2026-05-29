export type UserRole = 'admin' | 'teacher' | 'student';

export interface User {
  id: string;
  register_no: string;
  name: string;
  role: UserRole;
  class?: string;
  assigned_classes?: string;
  class_teacher_for?: string;
  subjects?: string;
  email?: string;
  phone?: string;
  fees?: string;
  first_login?: boolean;
  created_at?: string;
  status?: 'Active' | 'Inactive' | 'Transferred' | 'Dropped' | 'Left' | 'Graduated';
}

export interface Student {
  id: string;
  user_id: string;
  register_no: string;
  name: string;
  class: string;
  email?: string;
  phone?: string;
  created_at: string;
}

export interface Teacher {
  id: string;
  user_id: string;
  register_no: string;
  name: string;
  email?: string;
  phone?: string;
  subjects: string[];
  assigned_classes: string[];
  created_at: string;
}

export interface Mark {
  id: string;
  student_id: string;
  subject: string;
  marks: number;
  total: number;
  teacher_id: string;
  exam_name?: string;
  assessment_type?: 'formative' | 'summative';
  created_at: string;
  updated_at: string;
}

export interface Attendance {
  id: string;
  student_id: string;
  date: string;
  status: 'present' | 'absent' | 'leave';
  remarks?: string;
  created_at: string;
}

export interface Fee {
  id: string;
  student_id: string;
  month: string;
  year: number;
  total_amount: number;
  paid_amount: number;
  balance: number;
  status: 'pending' | 'partial' | 'paid';
  due_date: string;
  created_at: string;
}

export interface Notification {
  id: string;
  title?: string;
  message: string;
  target_role: UserRole | 'all';
  target_class?: string;
  type?: 'info' | 'warning' | 'error' | 'success';
  created_by: string;
  created_at: string;
  read_by?: string[];
  attachment_files?: Array<{ name: string; url: string }>;
}

export interface Performance {
  class: string;
  average_marks: number;
  students_count: number;
  attendance_rate: number;
}

export interface Exam {
  id: string;
  exam_name: string;
  class_name: string;
  exam_number: number;
  description?: string;
  is_active: boolean;
  assessment_type?: 'formative' | 'summative';
  year?: number;
  created_at: string;
  updated_at: string;
}
