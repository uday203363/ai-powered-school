import React, { useState, useEffect } from 'react';
import { Card, Button, ChangePasswordModal } from '../../components/common';
import { useAuth } from '../../contexts/AuthContext';
import { normalizeString } from '../../utils/normalize';
import { studentService, marksService, feeService, teacherService } from '../../services';
import { apiRequest } from '../../services/apiClient';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { Users, BookOpen, TrendingUp, Lock, Award, Target, History, CreditCard, Plus, X, RefreshCw, User } from 'lucide-react';
import { TeacherStudentHistoryPage } from './TeacherStudentHistoryPage';

const TABS = [
  { id: 'overview', label: 'Overview', icon: null },
  { id: 'class-info', label: 'My Class Info', icon: null },
  { id: 'performance', label: 'Performance', icon: null },
  { id: 'analytics', label: 'Analytics', icon: null },
  { id: 'assigned-classes-marks', label: 'Assigned Classes Marks', icon: null },
  { id: 'class-fee-management', label: 'Class Fee Management', icon: CreditCard },
  { id: 'student-history', label: 'Student History', icon: History },
] as const;

export const TeacherDashboard: React.FC = () => {
  const { user, refreshUserProfile } = useAuth();

  const parseNormalizedList = (value?: string): string[] => {
    if (!value) return [];
    return value
      .split(',')
      .map((v: string) => normalizeString(v.trim()))
      .filter((v: string) => v.length > 0);
  };

  const getUniqueClasses = (...lists: string[][]): string[] => {
    return Array.from(new Set(lists.flat().filter((v) => v.length > 0)));
  };

  const [activeTab, setActiveTab] = useState<'overview' | 'class-info' | 'performance' | 'analytics' | 'assigned-classes-marks' | 'class-fee-management' | 'student-history'>('overview');
  const [stats, setStats] = useState({
    classStudents: 0,
    totalMarks: 0,
    avgAttendance: 0,
  });
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [classStudents, setClassStudents] = useState<any[]>([]);
  const [classMarks, setClassMarks] = useState<any[]>([]);
  const [classPerformance, setClassPerformance] = useState<any[]>([]);
  const [topPerformers, setTopPerformers] = useState<any[]>([]);
  const [needsSupport, setNeedsSupport] = useState<any[]>([]);
  const [analyticsMetrics, setAnalyticsMetrics] = useState({
    stdDeviation: 0,
    medianScore: 0,
    range: 0,
    variance: 0,
  });
  const [assignedClasses, setAssignedClasses] = useState<string[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [classTeacherStudentsMarks, setClassTeacherStudentsMarks] = useState<any[]>([]);
  const [allSubjects, setAllSubjects] = useState<string[]>([]);
  const [loadingClassTeacherMarks, setLoadingClassTeacherMarks] = useState(false);
  
  // Fee management state
  const [classStudentsWithFees, setClassStudentsWithFees] = useState<any[]>([]);
  const [loadingFees, setLoadingFees] = useState(false);
  const [feeUpdateSuccess, setFeeUpdateSuccess] = useState('');
  const [feeUpdateError, setFeeUpdateError] = useState('');
  const [feeStats, setFeeStats] = useState({ totalAmount: 0, paidAmount: 0, pendingAmount: 0 });
  const [showAddFeeModal, setShowAddFeeModal] = useState(false);
  const [selectedStudentForFee, setSelectedStudentForFee] = useState<string>('');
  const [selectedStudentFees, setSelectedStudentFees] = useState<any[]>([]);
  const [feeFormData, setFeeFormData] = useState({
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    totalAmount: '',
    paidAmount: '0'
  });
  const [isSubmittingFee, setIsSubmittingFee] = useState(false);
  const [showMyInfo, setShowMyInfo] = useState(false);
  const [resolvedClassTeacherFor, setResolvedClassTeacherFor] = useState<string>('');

  const effectiveClassTeacherFor = user?.class_teacher_for || resolvedClassTeacherFor;
  const classTeacherClasses = parseNormalizedList(effectiveClassTeacherFor);
  const isViewingClassTeacherClass = !!selectedClass && classTeacherClasses.includes(normalizeString(selectedClass));

  useEffect(() => {
    const resolveClassTeacherAssignment = async () => {
      if (!user?.id) return;
      if (user?.class_teacher_for) {
        setResolvedClassTeacherFor('');
        return;
      }

      try {
        const teachersResult = await teacherService.getAllTeachers();
        if (!teachersResult.success || !teachersResult.data) return;

        const currentTeacher = (teachersResult.data || []).find((t: any) => t.id === user.id);
        const fallbackClassTeacherFor = currentTeacher?.class_teacher_for || currentTeacher?.class_teacher_of || '';
        if (fallbackClassTeacherFor) {
          console.log('✅ Resolved class teacher assignment from teachers API:', fallbackClassTeacherFor);
          setResolvedClassTeacherFor(String(fallbackClassTeacherFor));
        }
      } catch (error) {
        console.error('Error resolving class teacher assignment:', error);
      }
    };

    resolveClassTeacherAssignment();
  }, [user?.id, user?.class_teacher_for]);

  useEffect(() => {
    const assigned = parseNormalizedList(user?.assigned_classes);
    const ownClass = user?.class ? [normalizeString(user.class)] : [];
    const classTeacher = parseNormalizedList(effectiveClassTeacherFor);
    const merged = getUniqueClasses(assigned, ownClass, classTeacher);

    setAssignedClasses(merged);

    if (merged.length === 0) {
      setSelectedClass('');
      return;
    }

    // Prefer class-teacher class as default view when available.
    const preferredClass = classTeacher[0] || merged[0];
    setSelectedClass((prev) => (prev && merged.includes(prev) ? prev : preferredClass));
  }, [user, effectiveClassTeacherFor]);

  // Refresh auth state so class teacher assignment is reflected immediately in UI.
  useEffect(() => {
    refreshUserProfile();
  }, [user?.id, refreshUserProfile]);

  useEffect(() => {
    if (selectedClass) {
      loadDashboardData(selectedClass);
    }
  }, [selectedClass, user, assignedClasses]);

  // Separate effect for loading class teacher data
  useEffect(() => {
    if (activeTab === 'assigned-classes-marks' && effectiveClassTeacherFor) {
      loadClassTeacherStudentsMarks();
    }
  }, [activeTab, selectedClass, user, effectiveClassTeacherFor]);

  // Effect for loading class fees
  useEffect(() => {
    if (activeTab === 'class-fee-management' && effectiveClassTeacherFor) {
      loadClassFees();
    }
  }, [activeTab, selectedClass, user, effectiveClassTeacherFor]);

  // Effect for loading selected student's fees
  useEffect(() => {
    if (selectedStudentForFee && showAddFeeModal) {
      loadSelectedStudentFees();
    } else {
      setSelectedStudentFees([]);
    }
  }, [selectedStudentForFee, showAddFeeModal]);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (showAddFeeModal) {
      // Reset form to defaults
      setFeeFormData({
        month: new Date().getMonth() + 1,
        year: new Date().getFullYear(),
        totalAmount: '',
        paidAmount: '0'
      });
      setSelectedStudentForFee('');
      setSelectedStudentFees([]);
    }
  }, [showAddFeeModal]);

  const loadSelectedStudentFees = async () => {
    try {
      const result = await feeService.getFeesByStudent(selectedStudentForFee);
      if (result.success) {
        console.log(`✅ [Modal] Fetched fees for student ${selectedStudentForFee}:`, result.data);
        setSelectedStudentFees(result.data || []);

        // Auto-fill Total Amount with student's current_fee
        const selectedStudent = classStudentsWithFees.find((s: any) => s.id === selectedStudentForFee);
        if (selectedStudent && selectedStudent.current_fee) {
          console.log(`💡 [Modal] Auto-filling Total Amount with student's current_fee: ₹${selectedStudent.current_fee}`);
          setFeeFormData(prev => ({
            ...prev,
            totalAmount: selectedStudent.current_fee.toString()
          }));
        } else {
          console.warn(`⚠️ [Modal] Student not found or no current_fee`);
        }
      } else {
        console.warn(`⚠️ [Modal] Failed to fetch fees: ${result.error}`);
        setSelectedStudentFees([]);
      }
    } catch (error) {
      console.error('Error loading student fees:', error);
      setSelectedStudentFees([]);
    }
  };

  const loadDashboardData = async (classToLoad: string) => {
    try {
      if (!classToLoad) return;
      const normalizedClassToLoad = normalizeString(classToLoad);
      
      // IMPORTANT: Only load data for assigned classes
      if (!assignedClasses.includes(normalizedClassToLoad)) {
        console.warn(`⚠️ Unauthorized access attempt: Class ${normalizedClassToLoad} not in assigned classes [${assignedClasses.join(', ')}]`);
        return;
      }

      const classTeacherClassList = parseNormalizedList(effectiveClassTeacherFor);
      const isClassTeacherClass = classTeacherClassList.includes(normalizedClassToLoad);
      const teacherSubjectList = parseNormalizedList(user?.subjects);

      const result = await studentService.getStudentsByClass(normalizedClassToLoad);
      setClassStudents(result.data || []);

      // Load real marks data from database
      const marksResult = await marksService.getMarksByClass(normalizedClassToLoad);
      const allClassMarks = marksResult.data || [];

      // Non-class-teacher view: restrict marks to assigned subjects only.
      const allMarks = isClassTeacherClass || teacherSubjectList.length === 0
        ? allClassMarks
        : allClassMarks.filter((mark: any) => teacherSubjectList.includes(normalizeString(mark.subject)));

      // Group marks by subject and calculate statistics
      const marksBySubject: { [key: string]: number[] } = {};
      allMarks.forEach((mark: any) => {
        if (!marksBySubject[mark.subject]) {
          marksBySubject[mark.subject] = [];
        }
        marksBySubject[mark.subject].push(mark.marks);
      });

      // Generate class marks summary with real data
      const classMarksSummary = Object.entries(marksBySubject).map(([subject, marks]) => {
        const avg = marks.reduce((a, b) => a + b, 0) / marks.length;
        const topper = Math.max(...marks);
        const passed = marks.filter((m) => m >= 40).length;
        return { subject, avg: Math.round(avg), topper, passed, total: marks.length };
      });

      // Calculate analytics metrics from actual marks
      const allStudentMarks = allMarks.map((m: any) => m.marks);
      if (allStudentMarks.length > 0) {
        const avg = allStudentMarks.reduce((a, b) => a + b, 0) / allStudentMarks.length;
        const sorted = [...allStudentMarks].sort((a, b) => a - b);
        const median = sorted.length % 2 === 0 ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2 : sorted[Math.floor(sorted.length / 2)];
        const variance = allStudentMarks.reduce((sum, mark) => sum + Math.pow(mark - avg, 2), 0) / allStudentMarks.length;
        const stdDev = Math.sqrt(variance);
        const range = Math.max(...allStudentMarks) - Math.min(...allStudentMarks);

        setAnalyticsMetrics({
          stdDeviation: parseFloat(stdDev.toFixed(1)),
          medianScore: parseFloat(median.toFixed(1)),
          range,
          variance: parseFloat(variance.toFixed(0)),
        });

        // Get top 5 performers with real data
        const studentMarksMap = new Map();
        allMarks.forEach((mark: any) => {
          if (!studentMarksMap.has(mark.student_id)) {
            studentMarksMap.set(mark.student_id, []);
          }
          studentMarksMap.get(mark.student_id).push(mark.marks);
        });

        const performers = Array.from(studentMarksMap.entries())
          .map(([studentId, marks]) => {
            const student = result.data?.find((s: any) => s.id === studentId);
            const avgMarks = marks.reduce((a: number, b: number) => a + b, 0) / marks.length;
            return {
              id: studentId,
              name: student?.name || 'Unknown',
              avg: parseFloat(avgMarks.toFixed(1)),
            };
          })
          .sort((a, b) => b.avg - a.avg);

        setTopPerformers(performers.slice(0, 5));
        setNeedsSupport(performers.slice(-3).reverse());
      } else {
        const mockClassMarks = [
          { subject: 'Mathematics', avg: 82, topper: 95, passed: 28, total: 30 },
          { subject: 'English', avg: 78, topper: 92, passed: 25, total: 30 },
          { subject: 'Science', avg: 85, topper: 98, passed: 29, total: 30 },
          { subject: 'History', avg: 75, topper: 88, passed: 24, total: 30 },
        ];
        setClassMarks(mockClassMarks);
      }

      if (classMarksSummary.length > 0) {
        setClassMarks(classMarksSummary);
      }

      // Generate mock performance trend
      const mockPerformanceData = [
        { name: 'Week 1', avg: 75 },
        { name: 'Week 2', avg: 77 },
        { name: 'Week 3', avg: 79 },
        { name: 'Week 4', avg: 82 },
        { name: 'Week 5', avg: 81 },
      ];

      setStats({
        classStudents: result.data?.length || 0,
        totalMarks: classMarksSummary.length || 0,
        avgAttendance: 85,
      });
      setClassPerformance(mockPerformanceData);
    } catch (error) {
      console.error('Error loading dashboard:', error);
    }
  };

  const loadClassTeacherStudentsMarks = async () => {
    setLoadingClassTeacherMarks(true);
    try {
      if (!effectiveClassTeacherFor) {
        console.warn('⚠️ User is not assigned as a class teacher');
        setClassTeacherStudentsMarks([]);
        setAllSubjects([]);
        setLoadingClassTeacherMarks(false);
        return;
      }

      const classTeacherClasses = effectiveClassTeacherFor.split(',').map((c: string) => normalizeString(c.trim())).filter((c: string) => c.length > 0);
      
      if (classTeacherClasses.length === 0) {
        setClassTeacherStudentsMarks([]);
        setAllSubjects([]);
        setLoadingClassTeacherMarks(false);
        return;
      }

      // Load data for all class teacher classes (or the first one if multiple)
      const classToLoad = classTeacherClasses[0];
      console.log(`📚 Loading class teacher students for: ${classToLoad}`);

      // Fetch students from the class teacher class
      const studentsResult = await studentService.getStudentsByClass(classToLoad);
      const allStudents = studentsResult.data || [];
      
      // Fetch marks for this class
      const marksResult = await marksService.getMarksByClass(classToLoad);
      const allMarksData = marksResult.data || [];
      
      const subjectsSet = new Set<string>();
      allMarksData.forEach((mark: any) => {
        subjectsSet.add(mark.subject);
      });

      setAllSubjects(Array.from(subjectsSet).sort());

      // Create a map of student marks by student_id and subject
      const marksMap: { [key: string]: { [key: string]: any } } = {};
      allMarksData.forEach((mark: any) => {
        if (!marksMap[mark.student_id]) {
          marksMap[mark.student_id] = {};
        }
        marksMap[mark.student_id][mark.subject] = mark.marks;
      });

      // Combine students with their marks
      const studentsWithMarks = allStudents.map((student: any) => ({
        ...student,
        marks: marksMap[student.id] || {},
      }));

      console.log(`✅ Loaded ${allStudents.length} students with marks for class: ${classToLoad}`);
      setClassTeacherStudentsMarks(studentsWithMarks);
    } catch (error) {
      console.error('❌ Error loading class teacher students marks:', error);
      setClassTeacherStudentsMarks([]);
    } finally {
      setLoadingClassTeacherMarks(false);
    }
  };

  const loadClassFees = async () => {
    setLoadingFees(true);
    setFeeUpdateError('');
    try {
      if (!effectiveClassTeacherFor) {
        const msg = 'You are not assigned as a class teacher';
        console.error(`❌ [loadClassFees] ${msg}`);
        setFeeUpdateError(msg);
        setClassStudentsWithFees([]);
        return;
      }

      const classTeacherClasses = effectiveClassTeacherFor.split(',').map((c: string) => normalizeString(c.trim())).filter((c: string) => c.length > 0);
      
      if (classTeacherClasses.length === 0) {
        const msg = 'No classes assigned to you';
        console.error(`❌ [loadClassFees] ${msg}`);
        setFeeUpdateError(msg);
        setClassStudentsWithFees([]);
        return;
      }

      // Load data for the first class teacher class
      const classToLoad = classTeacherClasses[0];
      console.log(`📚 [loadClassFees] Loading class fees for: "${classToLoad}"`);

      // Fetch students and their fees for the class
      const result = await feeService.getFeesByClass(classToLoad);
      
      if (result.success) {
        console.log(`✅ [loadClassFees] Successfully loaded fees for ${classToLoad}:`, result.data);
        setClassStudentsWithFees(result.data || []);
        
        // Calculate fee statistics
        let totalAmount = 0;
        let paidAmount = 0;
        let pendingAmount = 0;
        
        (result.data || []).forEach((student: any) => {
          if (student.fees && student.fees.length > 0) {
            student.fees.forEach((fee: any) => {
              totalAmount += fee.total_amount || 0;
              paidAmount += fee.paid_amount || 0;
              pendingAmount += (fee.balance || 0);
            });
          }
        });
        
        setFeeStats({ totalAmount, paidAmount, pendingAmount });
        
        if (!result.data || result.data.length === 0) {
          console.warn(`⚠️ [loadClassFees] No students found in ${classToLoad}`);
        }
      } else {
        const errorMsg = result.error || 'Failed to load fees for class';
        console.error(`❌ [loadClassFees] Error: ${errorMsg}`);
        setFeeUpdateError(errorMsg);
        setClassStudentsWithFees([]);
        setFeeStats({ totalAmount: 0, paidAmount: 0, pendingAmount: 0 });
      }
    } catch (error: any) {
      const errorMsg = error?.message || 'Error loading class fees';
      console.error(`❌ [loadClassFees] Exception: ${errorMsg}`, error);
      setFeeUpdateError(errorMsg);
      setClassStudentsWithFees([]);
      setFeeStats({ totalAmount: 0, paidAmount: 0, pendingAmount: 0 });
    } finally {
      setLoadingFees(false);
    }
  };

  const runDiagnostics = async () => {
    console.log('🔍 Running diagnostics...');
    const classToCheck = effectiveClassTeacherFor?.split(',')[0]?.trim() || '';
    console.log(`Checking class: "${classToCheck}"`);
    
    const diagResult = await feeService.getStudentDiagnostics(classToCheck);
    if (diagResult.success) {
      console.log('✅ Diagnostics complete. Check console for details.');
      setFeeUpdateError(`✅ Diagnostics completed. Check browser console (F12) for detailed information about available students.`);
    } else {
      setFeeUpdateError('❌ Diagnostics failed. Check console.');
    }
  };

  const handleUpdateFeeStatus = async (feeId: string, newStatus: 'pending' | 'partial' | 'paid') => {
    try {
      setFeeUpdateError('');
      setFeeUpdateSuccess('');
      
      if (!user?.id) return;

      const result = await feeService.updateFeeStatusByClassTeacher(feeId, newStatus, user.id);
      
      if (result.success) {
        setFeeUpdateSuccess('✅ Fee status updated successfully');
        // Reload fees
        await loadClassFees();
        setTimeout(() => setFeeUpdateSuccess(''), 3000);
      } else {
        setFeeUpdateError(`❌ Error: ${result.error}`);
      }
    } catch (error) {
      console.error('Error updating fee status:', error);
      setFeeUpdateError('Error updating fee status');
    }
  };

  const handleAddFee = async () => {
    try {
      setIsSubmittingFee(true);
      setFeeUpdateError('');
      setFeeUpdateSuccess('');

      const selectedKey = String(selectedStudentForFee || '').trim();
      const normalizeKey = (value: unknown) => String(value || '').trim().toLowerCase();
      const selectedStudentResolved = classStudentsWithFees.find((s: any) => {
        const sid = normalizeKey(s.id);
        const sreg = normalizeKey(s.register_no);
        const sname = normalizeKey(s.name);
        const key = normalizeKey(selectedKey);
        return sid === key || sreg === key || sname === key;
      });

      const resolvedStudentId = selectedStudentResolved?.id || selectedKey;

      // Validation checks
      if (!resolvedStudentId || String(resolvedStudentId).trim().length === 0) {
        console.error('❌ [handleAddFee] No student selected:', selectedStudentForFee);
        setFeeUpdateError('❌ Please select a student first');
        setIsSubmittingFee(false);
        return;
      }

      if (!feeFormData.totalAmount || parseFloat(feeFormData.totalAmount) <= 0) {
        console.error('❌ [handleAddFee] Invalid total amount:', feeFormData.totalAmount);
        setFeeUpdateError('❌ Please enter a valid total amount');
        setIsSubmittingFee(false);
        return;
      }

      // Find student details from the cached data
      let studentData = classStudentsWithFees.find((s: any) => s.id === resolvedStudentId);
      
      // If not found in cache, fetch directly from database
      if (!studentData) {
        console.warn('⚠️ [handleAddFee] Student not in cache, fetching from database...');
        const studentResult = await apiRequest<any>(`/students/${resolvedStudentId}`);

        if (!studentResult.success || !studentResult.data) {
          console.error('❌ [handleAddFee] Student not found in database:', studentResult.error);
          setFeeUpdateError('❌ Student not found. Please try selecting again');
          setIsSubmittingFee(false);
          return;
        }
        studentData = studentResult.data;
      }

      if (!studentData) {
        console.error('❌ [handleAddFee] Student not found in class data:', {
          selectedStudentForFee,
          availableStudents: classStudentsWithFees.map(s => ({ id: s.id, name: s.name }))
        });
        setFeeUpdateError('❌ Student not found. Please try selecting again');
        setIsSubmittingFee(false);
        return;
      }

      console.log('✅ [handleAddFee] Preparing to add fee:', {
        student_id: resolvedStudentId,
        student_name: studentData.name,
        month: feeFormData.month,
        year: feeFormData.year,
        total_amount: parseFloat(feeFormData.totalAmount),
        paid_amount: parseFloat(feeFormData.paidAmount) || 0
      });

      // Verify student exists in users table before inserting
      console.log('🔍 [handleAddFee] Verifying student exists in database...');
      const studentCheckResult = await apiRequest<any>(`/students/${resolvedStudentId}`);

      if (!studentCheckResult.success || !studentCheckResult.data) {
        console.error('❌ [handleAddFee] Student verification failed:', {
          student_id: resolvedStudentId,
          error: studentCheckResult.error || 'Student not found'
        });
        setFeeUpdateError(`❌ Error: Student "${studentData.name}" (ID: ${resolvedStudentId}) not found in database or deleted. Please refresh and select again.`);
        setIsSubmittingFee(false);
        return;
      }

      const studentCheck = studentCheckResult.data;

      // Check if student is Active
      if (studentCheck.status !== 'Active') {
        console.warn('⚠️ [handleAddFee] Student is not Active:', {
          student_id: resolvedStudentId,
          status: studentCheck.status
        });
        setFeeUpdateError(`❌ Error: Student "${studentData.name}" is not Active (Status: ${studentCheck.status}). Cannot add fee for inactive students.`);
        setIsSubmittingFee(false);
        return;
      }

      console.log('✅ [handleAddFee] Student verified in database:', studentCheck);

      const paidAmount = parseFloat(feeFormData.paidAmount) || 0;
      const totalAmount = parseFloat(feeFormData.totalAmount);
      const status = paidAmount >= totalAmount ? 'paid' : paidAmount > 0 ? 'partial' : 'pending';

      console.log('📝 [handleAddFee] Inserting fee record...');

      // Call API to add fee
      const feeResult = await apiRequest('/fees', {
        method: 'POST',
        body: JSON.stringify({
          student_id: resolvedStudentId,
          month: feeFormData.month,
          year: feeFormData.year,
          total_amount: totalAmount,
          paid_amount: paidAmount,
          balance: totalAmount - paidAmount,
          status: status,
        }),
      });

      if (!feeResult.success) {
        console.error('❌ [handleAddFee] Database error:', feeResult.error);
        
        // Error code 23503 = foreign key constraint violation
        if (String(feeResult.error || '').includes('foreign key')) {
          setFeeUpdateError(`❌ Database Error: Cannot link fee to student. This usually means the student record is invalid. Please refresh the page and try again.`);
        } 
        // If balance column doesn't exist, try inserting without it
        else if (String(feeResult.error || '').includes('balance')) {
          console.log('ℹ️ [handleAddFee] Balance column error detected, retrying without balance...');
          
          const retryResult = await apiRequest('/fees', {
            method: 'POST',
            body: JSON.stringify({
              student_id: resolvedStudentId,
              month: feeFormData.month,
              year: feeFormData.year,
              total_amount: totalAmount,
              paid_amount: paidAmount,
              status: status,
            }),
          });

          if (!retryResult.success) {
            console.error('❌ [handleAddFee] Retry also failed:', retryResult.error);
            setFeeUpdateError(`❌ Failed to add fee: ${retryResult.error || 'Unknown error'}`);
          } else {
            console.log('✅ [handleAddFee] Fee added successfully (without balance):', retryResult.data);
            setFeeUpdateSuccess('✅ Fee record added successfully!');
            
            setFeeFormData({
              month: new Date().getMonth() + 1,
              year: new Date().getFullYear(),
              totalAmount: '',
              paidAmount: '0'
            });
            setSelectedStudentForFee('');
            setShowAddFeeModal(false);
            await loadClassFees();
            setTimeout(() => setFeeUpdateSuccess(''), 3000);
          }
        } 
        else {
          setFeeUpdateError(`❌ Failed to add fee: ${feeResult.error || 'Unknown error'}`);
        }
        setIsSubmittingFee(false);
        return;
      }

      console.log('✅ [handleAddFee] Fee added successfully:', feeResult.data);
      setFeeUpdateSuccess('✅ Fee record added successfully!');
      
      // Reset form
      setFeeFormData({
        month: new Date().getMonth() + 1,
        year: new Date().getFullYear(),
        totalAmount: '',
        paidAmount: '0'
      });
      setSelectedStudentForFee('');
      setShowAddFeeModal(false);

      // Reload fees
      await loadClassFees();
      setTimeout(() => setFeeUpdateSuccess(''), 3000);
    } catch (error: any) {
      console.error('❌ [handleAddFee] Exception:', error);
      setFeeUpdateError(`❌ Error adding fee record: ${error?.message || 'Unknown error'}`);
    } finally {
      setIsSubmittingFee(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-bold text-gray-900">Teacher Dashboard</h1>
          <p className="text-gray-600 mt-1">Welcome, {user?.name}</p>
          <div className="flex gap-4 mt-2">
            <span className="inline-block px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-semibold">Viewing Class: <strong>{selectedClass}</strong></span>
            <span className="inline-block px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-semibold">Class Teacher For: {effectiveClassTeacherFor ? normalizeString(effectiveClassTeacherFor) : 'Not Assigned'}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => setShowMyInfo((prev) => !prev)}
            className="flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-700"
          >
            <User size={18} />
            <span>My Info</span>
          </Button>
          <Button 
            onClick={() => setShowChangePassword(true)}
            className="flex items-center space-x-2 bg-amber-500 hover:bg-amber-600"
          >
            <Lock size={18} />
            <span>Change Password</span>
          </Button>
        </div>
      </div>

      {showMyInfo && (
        <Card className="border-2 border-indigo-100 bg-gradient-to-r from-indigo-50 to-blue-50">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="p-4 rounded-2xl bg-indigo-600 text-white shadow-lg">
                <User size={28} />
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-indigo-600 font-bold">My Info</p>
                <h2 className="text-2xl font-bold text-gray-900">{user?.name}</h2>
                <p className="text-sm text-gray-600 mt-1">
                  Class: <strong>{selectedClass || 'Not Assigned'}</strong> · Subjects: <strong>{user?.subjects || 'N/A'}</strong>
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {isViewingClassTeacherClass
                    ? 'Viewing class-teacher class: all subject performance visible.'
                    : 'Viewing assigned class: only your assigned-subject marks are visible.'}
                </p>
              </div>
            </div>
            <button onClick={() => setShowMyInfo(false)} className="text-gray-500 hover:text-gray-800 font-semibold">
              Close
            </button>
          </div>
        </Card>
      )}

      {/* Assigned Classes Selector */}
      {assignedClasses.length > 0 && (
        <Card className="bg-gradient-to-r from-indigo-50 to-blue-50 border-l-4 border-indigo-500">
          <div className="space-y-3">
            <h3 className="text-lg font-bold text-gray-900">📚 Your Assigned Classes ({assignedClasses.length})</h3>
            <div className="flex flex-wrap gap-2">
              {assignedClasses.map((cls) => (
                <button
                  key={cls}
                  onClick={() => setSelectedClass(cls)}
                  className={`px-4 py-2 rounded-lg font-semibold transition ${
                    selectedClass === cls
                      ? 'bg-indigo-600 text-white shadow-lg'
                      : 'bg-white text-indigo-600 border-2 border-indigo-600 hover:bg-indigo-50'
                  }`}
                >
                  {cls}
                </button>
              ))}
            </div>
          </div>
        </Card>
      )}
      <div className="flex gap-1 border-b border-gray-200 overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-2 font-semibold transition-colors whitespace-nowrap flex items-center gap-1 ${
              activeTab === tab.id
                ? 'text-primary border-b-2 border-primary'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {tab.icon && <tab.icon size={16} />}
            {tab.label}
          </button>
        ))}
      </div>

      {/* OVERVIEW TAB */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Class Teacher Badge */}
          <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">Class Teacher For: {effectiveClassTeacherFor ? normalizeString(effectiveClassTeacherFor) : 'Not Assigned'}</h2>
                <p className="mt-1 opacity-90">You are assigned as class teacher for: {effectiveClassTeacherFor ? effectiveClassTeacherFor.split(',').map((c: string) => normalizeString(c.trim())).join(', ') : 'No classes assigned'}</p>
              </div>
              <Award size={48} className="opacity-50" />
            </div>
          </Card>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="flex items-center space-x-4 border-l-4 border-blue-500">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Users className="text-primary" size={28} />
              </div>
              <div>
                <p className="text-gray-600 text-sm font-medium">Students in Class</p>
                <p className="text-3xl font-bold text-gray-900">{stats.classStudents}</p>
                <p className="text-xs text-gray-500 mt-1">Total enrolled students</p>
              </div>
            </Card>

            <Card className="flex items-center space-x-4 border-l-4 border-green-500">
              <div className="p-3 bg-green-100 rounded-lg">
                <BookOpen className="text-secondary" size={28} />
              </div>
              <div>
                <p className="text-gray-600 text-sm font-medium">Subjects Teaching</p>
                <p className="text-3xl font-bold text-gray-900">{stats.totalMarks}</p>
                <p className="text-xs text-gray-500 mt-1">{isViewingClassTeacherClass ? 'All class subjects visible' : 'Your assigned subjects visible'}</p>
              </div>
            </Card>

            <Card className="flex items-center space-x-4 border-l-4 border-purple-500">
              <div className="p-3 bg-purple-100 rounded-lg">
                <TrendingUp className="text-accent" size={28} />
              </div>
              <div>
                <p className="text-gray-600 text-sm font-medium">Avg Attendance</p>
                <p className="text-3xl font-bold text-gray-900">{stats.avgAttendance}%</p>
                <p className="text-xs text-gray-500 mt-1">Current rate</p>
              </div>
            </Card>
          </div>

          {/* Class Overview Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <p className="text-gray-600 text-sm font-medium">Class Average</p>
              <p className="text-2xl font-bold text-primary mt-1">80.5</p>
              <p className="text-xs text-gray-500 mt-2">Out of 100 marks</p>
            </Card>
            <Card>
              <p className="text-gray-600 text-sm font-medium">Class Topper Score</p>
              <p className="text-2xl font-bold text-green-600 mt-1">97</p>
              <p className="text-xs text-gray-500 mt-2">Highest performance</p>
            </Card>
            <Card>
              <p className="text-gray-600 text-sm font-medium">Pass Rate</p>
              <p className="text-2xl font-bold text-blue-600 mt-1">96.7%</p>
              <p className="text-xs text-gray-500 mt-2">29 out of 30 students</p>
            </Card>
            <Card>
              <p className="text-gray-600 text-sm font-medium">Subjects Avg</p>
              <p className="text-2xl font-bold text-accent mt-1">81.3</p>
              <p className="text-xs text-gray-500 mt-2">Across all subjects</p>
            </Card>
          </div>

          {/* Quick Actions */}
          <Card>
            <h2 className="text-xl font-bold mb-4">⚡ Quick Actions</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <a href="/teacher/marks" className="p-4 bg-blue-50 hover:bg-blue-100 rounded-lg text-center font-semibold text-primary transition-colors text-sm">
                📝 Upload Marks
              </a>
              <a href="/dashboard" className="p-4 bg-yellow-50 hover:bg-yellow-100 rounded-lg text-center font-semibold text-accent transition-colors text-sm">
                📊 View Reports
              </a>
              <a href="/dashboard" className="p-4 bg-purple-50 hover:bg-purple-100 rounded-lg text-center font-semibold text-purple-600 transition-colors text-sm">
                📢 Send Notice
              </a>
              <a href="/dashboard" className="p-4 bg-pink-50 hover:bg-pink-100 rounded-lg text-center font-semibold text-pink-600 transition-colors text-sm">
                📞 Contact Parents
              </a>
            </div>
          </Card>
        </div>
      )}

      {/* MY CLASS INFO TAB */}
      {activeTab === 'class-info' && (
        <div className="space-y-6">
          <Card>
            <h2 className="text-2xl font-bold mb-4">👥 Class Students</h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-4 py-2 text-left text-sm font-semibold">Register No</th>
                    <th className="px-4 py-2 text-left text-sm font-semibold">Student Name</th>
                    <th className="px-4 py-2 text-center text-sm font-semibold">Class</th>
                    <th className="px-4 py-2 text-center text-sm font-semibold">Avg Score</th>
                    <th className="px-4 py-2 text-center text-sm font-semibold">Attendance</th>
                    <th className="px-4 py-2 text-center text-sm font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {classStudents.length > 0 ? (
                    classStudents.map((student: any, idx: number) => (
                      <tr key={idx} className="border-b hover:bg-gray-50">
                        <td className="px-4 py-3 font-bold text-primary">{student.register_no}</td>
                        <td className="px-4 py-3">{student.name}</td>
                        <td className="px-4 py-3 text-center">{student.class}</td>
                        <td className="px-4 py-3 text-center">
                          <span className="px-2 py-1 bg-blue-100 text-primary rounded font-bold">
                            {(75 + Math.random() * 20).toFixed(1)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="px-2 py-1 bg-green-100 text-green-700 rounded font-bold">
                            {(80 + Math.random() * 15).toFixed(0)}%
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="px-2 py-1 bg-green-200 text-green-800 rounded text-xs font-bold">Active</span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="px-4 py-3 text-center text-gray-500">No students found in this class</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* CLASS PERFORMANCE TAB */}
      {activeTab === 'performance' && (
        <div className="space-y-6">
          <Card>
            <p className="text-sm text-gray-700">
              {isViewingClassTeacherClass
                ? 'Class-teacher mode: showing all subjects performance for your class-teacher class.'
                : 'Assigned-class mode: showing marks only for your assigned subjects in this class.'}
            </p>
          </Card>
          <Card>
            <h2 className="text-2xl font-bold mb-4">📊 Class Marks Summary</h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-4 py-2 text-left text-sm font-semibold">Subject</th>
                    <th className="px-4 py-2 text-center text-sm font-semibold">Class Average</th>
                    <th className="px-4 py-2 text-center text-sm font-semibold">Topper Marks</th>
                    <th className="px-4 py-2 text-center text-sm font-semibold">Passed/Total</th>
                    <th className="px-4 py-2 text-center text-sm font-semibold">Pass %</th>
                    <th className="px-4 py-2 text-center text-sm font-semibold">Performance</th>
                  </tr>
                </thead>
                <tbody>
                  {classMarks.map((mark: any, idx: number) => {
                    const passPercentage = ((mark.passed / mark.total) * 100).toFixed(1);
                    const perfLevel = mark.avg >= 85 ? 'Excellent' : mark.avg >= 75 ? 'Good' : 'Average';
                    const perfColor = mark.avg >= 85 ? 'bg-green-100 text-green-700' : mark.avg >= 75 ? 'bg-blue-100 text-blue-700' : 'bg-yellow-100 text-yellow-700';
                    return (
                      <tr key={idx} className="border-b hover:bg-gray-50">
                        <td className="px-4 py-3 font-bold">{mark.subject}</td>
                        <td className="px-4 py-3 text-center">
                          <span className="px-2 py-1 bg-blue-100 text-primary rounded font-bold">{mark.avg}</span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="px-2 py-1 bg-green-100 text-green-700 rounded font-bold">{mark.topper}</span>
                        </td>
                        <td className="px-4 py-3 text-center font-semibold">{mark.passed}/{mark.total}</td>
                        <td className="px-4 py-3 text-center font-bold text-green-600">{passPercentage}%</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`px-3 py-1 rounded font-bold text-xs ${perfColor}`}>{perfLevel}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>

          <Card>
            <h2 className="text-xl font-bold mb-4">Subject-wise Performance Trend</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={classMarks}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="subject" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="avg" fill="#2563eb" name="Class Average" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          <Card>
            <h2 className="text-xl font-bold mb-4">Subject Pass Rates</h2>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={classMarks}
                  dataKey="passed"
                  nameKey="subject"
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  label
                >
                  {classMarks.map((_entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={['#2563eb', '#10b981', '#f59e0b', '#ef4444'][index % 4]}
                    />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        </div>
      )}

      {/* ANALYTICS TAB */}
      {activeTab === 'analytics' && (
        <div className="space-y-6">
          <Card>
            <h2 className="text-2xl font-bold mb-4">📈 Class Performance Analytics</h2>
            <ResponsiveContainer width="100%" height={350}>
              <LineChart data={classPerformance}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Line 
                  type="monotone" 
                  dataKey="avg" 
                  stroke="#2563eb" 
                  strokeWidth={3}
                  dot={{ fill: '#2563eb', r: 6 }}
                  activeDot={{ r: 8 }}
                />
              </LineChart>
            </ResponsiveContainer>
            <p className="text-sm text-gray-600 mt-4">📊 Class average marks over the last 5 weeks show positive growth trend</p>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <h3 className="text-lg font-bold mb-4">Top 5 Performers</h3>
              <div className="space-y-2">
{topPerformers.length > 0 ? topPerformers.map((performer, idx) => (
                  <div key={performer.id} className="flex items-center justify-between p-3 bg-green-50 rounded hover:bg-green-100 transition">
                    <div className="flex items-center gap-3">
                      <span className="text-lg font-bold text-green-600">#{idx + 1}</span>
                      <span className="font-semibold">{performer.name} - {performer.avg}/100</span>
                    </div>
                    <Award size={18} className="text-green-600" />
                  </div>
                )) : <p className="text-gray-500 text-sm">No performance data available</p>}
              </div>
            </Card>

            <Card>
              <h3 className="text-lg font-bold mb-4">Students Needing Support</h3>
              <div className="space-y-2">
                {needsSupport.length > 0 ? needsSupport.map((student) => (
                  <div key={student.id} className="flex items-center justify-between p-3 bg-orange-50 rounded hover:bg-orange-100 transition">
                    <span className="font-semibold text-orange-800">{student.name} - {student.avg}/100</span>
                    <Target size={18} className="text-orange-600" />
                  </div>
                )) : <p className="text-gray-500 text-sm">No support data available</p>}
              </div>
            </Card>
          </div>

          <Card>
            <h3 className="text-lg font-bold mb-4">Class Performance Metrics</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 bg-blue-50 rounded text-center">
                <p className="text-xs text-gray-600 mb-1">Std Deviation</p>
                <p className="text-2xl font-bold text-blue-600">{analyticsMetrics.stdDeviation || '0'}</p>
              </div>
              <div className="p-4 bg-green-50 rounded text-center">
                <p className="text-xs text-gray-600 mb-1">Median Score</p>
                <p className="text-2xl font-bold text-green-600">{analyticsMetrics.medianScore || '0'}</p>
              </div>
              <div className="p-4 bg-purple-50 rounded text-center">
                <p className="text-xs text-gray-600 mb-1">Range</p>
                <p className="text-2xl font-bold text-purple-600">{analyticsMetrics.range || '0'}</p>
              </div>
              <div className="p-4 bg-pink-50 rounded text-center">
                <p className="text-xs text-gray-600 mb-1">Variance</p>
                <p className="text-2xl font-bold text-pink-600">{analyticsMetrics.variance || '0'}</p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* ASSIGNED CLASSES MARKS TAB */}
      {activeTab === 'assigned-classes-marks' && (
        <div className="space-y-6">
          {effectiveClassTeacherFor ? (
            <>
              <Card>
                <h2 className="text-2xl font-bold mb-4">📊 Class Teacher - Students All Subject Marks</h2>
              </Card>

              {loadingClassTeacherMarks ? (
                <div className="flex justify-center items-center py-12">
                  <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-2"></div>
                    <p className="text-gray-500">Loading all subject marks...</p>
                  </div>
                </div>
              ) : classTeacherStudentsMarks.length > 0 ? (
                <>
                  <Card>
                    <h3 className="text-lg font-bold mb-4">📋 Student Personal Details & Academic Performance</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-gradient-to-r from-blue-50 to-blue-100">
                          <tr>
                            <th className="px-3 py-3 text-left font-semibold text-blue-900">Reg No</th>
                            <th className="px-3 py-3 text-left font-semibold text-blue-900">Student Name</th>
                            <th className="px-3 py-3 text-left font-semibold text-blue-900">Email</th>
                            <th className="px-3 py-3 text-left font-semibold text-blue-900">Phone</th>
                            <th className="px-3 py-3 text-left font-semibold text-blue-900">Father's Name</th>
                            <th className="px-3 py-3 text-center font-semibold text-blue-900">Class</th>
                          </tr>
                        </thead>
                        <tbody>
                          {classTeacherStudentsMarks.map((student: any, idx: number) => (
                            <tr key={idx} className="border-b hover:bg-blue-50 transition">
                              <td className="px-3 py-3 font-bold text-primary">{student.register_no}</td>
                              <td className="px-3 py-3 font-semibold text-gray-900">{student.name}</td>
                              <td className="px-3 py-3 text-gray-700 break-all">{student.email || <span className="text-gray-400">-</span>}</td>
                              <td className="px-3 py-3 text-gray-700">{student.phone || <span className="text-gray-400">-</span>}</td>
                              <td className="px-3 py-3 text-gray-700">{student.father_name || <span className="text-gray-400">-</span>}</td>
                              <td className="px-3 py-3 text-center font-semibold">{student.class}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </Card>

                  <Card>
                    <h3 className="text-lg font-bold mb-4">📊 Subject-wise Marks Performance</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-gradient-to-r from-green-50 to-green-100">
                          <tr>
                            <th className="px-4 py-3 text-left font-semibold text-green-900">Register No</th>
                            <th className="px-4 py-3 text-left font-semibold text-green-900">Student Name</th>
                            {allSubjects.map((subject) => (
                              <th key={subject} className="px-3 py-3 text-center font-semibold text-green-900">{subject?.toUpperCase()}</th>
                            ))}
                            <th className="px-4 py-3 text-center font-semibold text-green-900">Average</th>
                          </tr>
                        </thead>
                        <tbody>
                          {classTeacherStudentsMarks.map((student: any, idx: number) => {
                            const marks = student.marks;
                            const marksValues = Object.values(marks).filter((m: any) => typeof m === 'number') as number[];
                            const average = marksValues.length > 0 ? (marksValues.reduce((a: number, b: number) => a + b, 0) / marksValues.length).toFixed(1) : 'N/A';
                            
                            return (
                              <tr key={idx} className="border-b hover:bg-green-50 transition">
                                <td className="px-4 py-3 font-bold text-primary">{student.register_no}</td>
                                <td className="px-4 py-3">{student.name}</td>
                                {allSubjects.map((subject) => (
                                  <td key={subject} className="px-3 py-3 text-center">
                                    {marks[subject] ? (
                                      <span className={`px-2 py-1 rounded font-semibold ${
                                        marks[subject] >= 80
                                          ? 'bg-green-100 text-green-700'
                                          : marks[subject] >= 60
                                          ? 'bg-yellow-100 text-yellow-700'
                                          : 'bg-red-100 text-red-700'
                                      }`}>
                                        {marks[subject]}
                                      </span>
                                    ) : (
                                      <span className="text-gray-400">-</span>
                                    )}
                                  </td>
                                ))}
                                <td className="px-4 py-3 text-center font-bold text-green-600">{average}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </Card>
                </>
              ) : (
                <Card>
                  <p className="text-center text-gray-500 py-8">No students found in this class or you are not the class teacher</p>
                </Card>
              )}
            </>
          ) : (
            <Card>
              <p className="text-center text-gray-500 py-8">You are not assigned as a class teacher for any class</p>
            </Card>
          )}
        </div>
      )}

      {/* CLASS FEE MANAGEMENT TAB */}
      {activeTab === 'class-fee-management' && (
        <div className="space-y-6">
          {effectiveClassTeacherFor ? (
            <>
              {feeUpdateSuccess && (
                <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg">
                  {feeUpdateSuccess}
                </div>
              )}
              {feeUpdateError && (
                <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
                  {feeUpdateError}
                </div>
              )}

              <Card>
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h2 className="text-2xl font-bold mb-4">💳 Class Fee Management</h2>
                    <p className="text-gray-600 mb-2">Update fee status for students in your class. Changes will be logged and visible to admin.</p>
                    <p className="text-sm text-blue-600">Class Teacher For: <strong>{effectiveClassTeacherFor ? normalizeString(effectiveClassTeacherFor) : 'Not Assigned'}</strong></p>
                  </div>
                  <button
                    onClick={() => setShowAddFeeModal(true)}
                    className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition flex items-center gap-2 whitespace-nowrap"
                  >
                    <Plus size={18} /> Add Fee
                  </button>
                </div>
              </Card>

              {/* Fee Statistics Cards */}
              {!loadingFees && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-l-4 border-blue-500">
                    <p className="text-gray-600 text-sm font-semibold uppercase tracking-wide">Total Fee Amount</p>
                    <p className="text-3xl font-bold text-blue-700 mt-2">₹{feeStats.totalAmount.toLocaleString()}</p>
                    <p className="text-xs text-gray-500 mt-2">All students in class</p>
                  </Card>
                  <Card className="bg-gradient-to-br from-green-50 to-green-100 border-l-4 border-green-500">
                    <p className="text-gray-600 text-sm font-semibold uppercase tracking-wide">Total Paid</p>
                    <p className="text-3xl font-bold text-green-700 mt-2">₹{feeStats.paidAmount.toLocaleString()}</p>
                    <p className="text-xs text-gray-500 mt-2">{feeStats.totalAmount > 0 ? Math.round((feeStats.paidAmount / feeStats.totalAmount) * 100) : 0}% collected</p>
                  </Card>
                  <Card className="bg-gradient-to-br from-red-50 to-red-100 border-l-4 border-red-500">
                    <p className="text-gray-600 text-sm font-semibold uppercase tracking-wide">Total Pending</p>
                    <p className="text-3xl font-bold text-red-700 mt-2">₹{feeStats.pendingAmount.toLocaleString()}</p>
                    <p className="text-xs text-gray-500 mt-2">{feeStats.totalAmount > 0 ? Math.round((feeStats.pendingAmount / feeStats.totalAmount) * 100) : 0}% outstanding</p>
                  </Card>
                </div>
              )}

              {loadingFees ? (
                <div className="flex justify-center items-center py-12">
                  <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-2"></div>
                    <p className="text-gray-500">Loading student fees...</p>
                  </div>
                </div>
              ) : classStudentsWithFees && classStudentsWithFees.length > 0 ? (
                <Card>
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h3 className="text-xl font-bold">📋 Student Fee Management</h3>
                      <p className="text-gray-600 text-sm mt-1">{classStudentsWithFees.length} students • Update status and track payments</p>
                    </div>
                    <button
                      onClick={loadClassFees}
                      className="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
                      title="Refresh"
                    >
                      <RefreshCw size={18} />
                    </button>
                  </div>

                  <div className="overflow-x-auto border border-gray-200 rounded-lg">
                    <table className="w-full text-xs md:text-sm">
                      <thead className="bg-gradient-to-r from-purple-50 via-purple-100 to-purple-50 sticky top-0 border-b-2 border-purple-300">
                        <tr>
                          <th className="px-3 py-3 text-left font-bold text-purple-900 whitespace-nowrap">Register No</th>
                          <th className="px-3 py-3 text-left font-bold text-purple-900 whitespace-nowrap">Student Name</th>
                          <th className="px-3 py-3 text-center font-bold text-purple-900 whitespace-nowrap">Month/Year</th>
                          <th className="px-3 py-3 text-right font-bold text-purple-900 whitespace-nowrap">💵 Total</th>
                          <th className="px-3 py-3 text-right font-bold text-purple-900 whitespace-nowrap">✓ Paid</th>
                          <th className="px-3 py-3 text-right font-bold text-purple-900 whitespace-nowrap">⏳ Balance</th>
                          <th className="px-3 py-3 text-center font-bold text-purple-900 whitespace-nowrap">Status</th>
                          <th className="px-3 py-3 text-center font-bold text-purple-900 whitespace-nowrap">Update</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {classStudentsWithFees.map((student: any, idx: number) => (
                          student.fees && student.fees.length > 0 ? (
                            student.fees.map((fee: any, feeIdx: number) => (
                              <tr key={`${idx}-${feeIdx}`} className="hover:bg-purple-50 transition duration-200">
                                {feeIdx === 0 && (
                                  <>
                                    <td rowSpan={student.fees.length} className="px-3 py-2 font-bold text-purple-700 align-middle bg-purple-50">
                                      {student.register_no}
                                    </td>
                                    <td rowSpan={student.fees.length} className="px-3 py-2 font-semibold text-gray-900 align-middle bg-purple-50">
                                      {normalizeString(student.name)}
                                    </td>
                                  </>
                                )}
                                <td className="px-3 py-2 text-center whitespace-nowrap text-gray-700">
                                  {fee.month === 'Registration' ? '📋 Reg' : `📅 ${fee.month}`}/{fee.year}
                                </td>
                                <td className="px-3 py-2 text-right font-bold text-blue-600 whitespace-nowrap">
                                  ₹{(fee.total_amount || 0).toLocaleString()}
                                </td>
                                <td className="px-3 py-2 text-right font-bold text-green-600 whitespace-nowrap">
                                  ₹{(fee.paid_amount || 0).toLocaleString()}
                                </td>
                                <td className="px-3 py-2 text-right font-bold text-red-600 whitespace-nowrap">
                                  ₹{(fee.balance || 0).toLocaleString()}
                                </td>
                                <td className="px-3 py-2 text-center whitespace-nowrap">
                                  <span className={`px-3 py-1 rounded-full text-xs font-bold inline-block transition ${
                                    fee.status === 'paid' ? 'bg-green-100 text-green-700 border border-green-300' :
                                    fee.status === 'partial' ? 'bg-yellow-100 text-yellow-700 border border-yellow-300' :
                                    'bg-red-100 text-red-700 border border-red-300'
                                  }`}>
                                    {fee.status === 'paid' ? '✓ PAID' : fee.status === 'partial' ? '⚠️ PARTIAL' : '⏳ PENDING'}
                                  </span>
                                </td>
                                <td className="px-3 py-2 text-center whitespace-nowrap">
                                  <select
                                    value={fee.status || 'pending'}
                                    onChange={(e) => handleUpdateFeeStatus(fee.id, e.target.value as 'pending' | 'partial' | 'paid')}
                                    className="px-2 py-1 text-xs border border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent font-semibold cursor-pointer hover:border-purple-400"
                                    disabled={loadingFees}
                                  >
                                    <option value="pending">Pending</option>
                                    <option value="partial">Partial</option>
                                    <option value="paid">Paid</option>
                                  </select>
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr key={idx} className="hover:bg-purple-50">
                              <td className="px-3 py-2 font-bold text-purple-700 bg-purple-50">{student.register_no}</td>
                              <td className="px-3 py-2 font-semibold text-gray-900 bg-purple-50">{normalizeString(student.name)}</td>
                              <td colSpan={6} className="px-3 py-2 text-center text-gray-400 italic">
                                No fee records yet
                              </td>
                            </tr>
                          )
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              ) : (
                <Card>
                  <div className="text-center py-8">
                    {feeUpdateError ? (
                      <>
                        <p className="text-red-600 font-bold mb-4">⚠️ {feeUpdateError}</p>
                        <p className="text-gray-600 text-sm mb-4">Class assigned: <strong>{effectiveClassTeacherFor ? normalizeString(effectiveClassTeacherFor) : 'None'}</strong></p>
                      </>
                    ) : (
                      <p className="text-gray-500 mb-4">No students found in your class or no fee records available</p>
                    )}
                    {!loadingFees && (
                      <div className="flex gap-2 justify-center">
                        <button
                          onClick={loadClassFees}
                          className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition"
                        >
                          🔄 Refresh Data
                        </button>
                        <button
                          onClick={runDiagnostics}
                          className="mt-4 px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 transition text-sm"
                        >
                          🔍 Debug (See Console)
                        </button>
                      </div>
                    )}
                  </div>
                </Card>
              )}

              {/* ADD FEE MODAL */}
              {showAddFeeModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                  <div className="bg-white rounded-lg shadow-lg w-full max-w-md max-h-[85vh] flex flex-col">
                    {/* Fixed Header */}
                    <div className="flex justify-between items-center mb-4 p-6 border-b flex-shrink-0">
                      <h3 className="text-xl font-bold">➕ Add New Fee Record</h3>
                      <button
                        onClick={() => setShowAddFeeModal(false)}
                        className="p-1 hover:bg-gray-100 rounded"
                      >
                        <X size={20} />
                      </button>
                    </div>

                    {/* Scrollable Content */}
                    <div className="overflow-y-auto flex-1 px-6 py-4">
                    <div className="space-y-4">
                      {/* Student Selection */}
                      <div>
                        <label className="block text-sm font-semibold mb-2">👤 Student</label>
                        {classStudentsWithFees && classStudentsWithFees.length > 0 && (
                          <p className="text-xs text-gray-500 mb-2">
                            📊 {classStudentsWithFees.length} students loaded
                          </p>
                        )}
                        <select
                          value={selectedStudentForFee}
                          onChange={(e) => {
                            const newValue = e.target.value;
                            setSelectedStudentForFee(newValue);
                            console.log('📌 [Modal] Student selected:', {
                              value: newValue,
                              type: typeof newValue,
                              length: newValue.length
                            });
                            // Log the student data
                            const student = classStudentsWithFees.find((s: any) => s.id === newValue);
                            if (student) {
                              console.log('✅ [Modal] Student found:', {
                                id: student.id,
                                register_no: student.register_no,
                                name: student.name,
                                current_fee: student.current_fee
                              });
                            } else {
                              console.warn('⚠️ [Modal] Student not found in classStudentsWithFees for ID:', newValue);
                            }
                          }}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="">Select a student...</option>
                          {classStudentsWithFees.map((student: any) => {
                            console.log('📋 [Modal] Rendering student option:', {
                              id: student.id,
                              register_no: student.register_no,
                              name: student.name
                            });
                            return (
                              <option key={student.id} value={student.id}>
                                {student.register_no} - {normalizeString(student.name)}
                              </option>
                            );
                          })}
                        </select>
                      </div>

                      {/* Selected Student Debug Info - REMOVED FOR CLEAN UI */}

                      {/* Existing Fees Summary */}
                      {selectedStudentForFee && (() => {
                        // Use the directly fetched fees instead of trying to find them in the class data
                        const existingFees = selectedStudentFees || [];
                        
                        console.log(`📋 [Fee Modal] Selected student ID:`, selectedStudentForFee);
                        console.log(`📋 [Fee Modal] Existing fees (directly fetched):`, existingFees);
                        
                        const totalExistingAmount = existingFees.reduce((sum: number, f: any) => sum + (f.total_amount || 0), 0);
                        const totalPaidAmount = existingFees.reduce((sum: number, f: any) => sum + (f.paid_amount || 0), 0);
                        const totalPendingAmount = existingFees.reduce((sum: number, f: any) => sum + (f.balance || (f.total_amount - f.paid_amount) || 0), 0);
                        const paidPercentage = totalExistingAmount > 0 ? Math.round((totalPaidAmount / totalExistingAmount) * 100) : 0;
                        const pendingPercentage = totalExistingAmount > 0 ? Math.round((totalPendingAmount / totalExistingAmount) * 100) : 0;
                        
                        return (
                          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-300 rounded-lg p-4 space-y-3">
                            <div className="flex justify-between items-center">
                              <p className="text-sm font-bold text-blue-900 flex items-center gap-2">
                                <span className="text-lg">📋</span> Student Fee Summary (Added by Admin)
                              </p>
                              <button
                                onClick={loadSelectedStudentFees}
                                className="text-xs px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 transition"
                                title="Click to refresh fees from database"
                              >
                                🔄 Refresh
                              </button>
                            </div>
                            
                            {existingFees.length > 0 ? (
                              <>
                                {/* Fee Records List */}
                                <div className="bg-white rounded p-2 space-y-1 max-h-40 overflow-y-auto border border-blue-100">
                                  {existingFees.map((fee: any, idx: number) => (
                                    <div key={idx} className="text-xs text-gray-700 flex justify-between items-center p-2 hover:bg-blue-50 rounded border border-gray-100">
                                      <div className="flex-1">
                                        <div className="font-medium text-gray-900">{fee.month}/{fee.year}</div>
                                        <div className="text-xs text-gray-500 mt-1 grid grid-cols-3 gap-2">
                                          <span>Total: <span className="text-blue-700 font-bold">₹{fee.total_amount || 0}</span></span>
                                          <span>Paid: <span className="text-green-600 font-bold">₹{fee.paid_amount || 0}</span></span>
                                          <span>Pending: <span className="text-red-600 font-bold">₹{fee.balance || 0}</span></span>
                                        </div>
                                      </div>
                                      <span className={`px-2 py-0.5 rounded text-xs font-bold whitespace-nowrap ml-2 ${
                                        fee.status === 'paid' ? 'bg-green-100 text-green-700' : 
                                        fee.status === 'partial' ? 'bg-yellow-100 text-yellow-700' : 
                                        'bg-red-100 text-red-700'
                                      }`}>
                                        {fee.status?.toUpperCase() || 'PENDING'}
                                      </span>
                                    </div>
                                  ))}
                                </div>

                                {/* Summary Stats */}
                                <div className="space-y-2 border-t-2 border-blue-200 pt-3">
                                  {/* Total Amount - PROMINENT */}
                                  <div className="bg-gradient-to-r from-blue-100 to-blue-50 rounded p-3 border-2 border-blue-300">
                                    <div className="flex justify-between items-center mb-1">
                                      <span className="text-xs font-bold text-gray-700">💵 Total Amount</span>
                                      <span className="text-lg font-bold text-blue-700">₹{totalExistingAmount.toLocaleString()}</span>
                                    </div>
                                  </div>

                                  {/* Total Paid with Progress Bar */}
                                  <div className="bg-white rounded p-2 border border-green-100">
                                    <div className="flex justify-between items-center mb-1">
                                      <span className="text-xs font-bold text-gray-700">✓ Total Paid</span>
                                      <span className="text-sm font-bold text-green-700">₹{totalPaidAmount.toLocaleString()} ({paidPercentage}%)</span>
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                                      <div 
                                        className="bg-gradient-to-r from-green-400 to-green-600 h-2 rounded-full transition-all"
                                        style={{ width: `${paidPercentage}%` }}
                                      ></div>
                                    </div>
                                  </div>

                                  {/* Total Pending with Progress Bar */}
                                  <div className="bg-white rounded p-2 border border-red-100">
                                    <div className="flex justify-between items-center mb-1">
                                      <span className="text-xs font-bold text-gray-700">⚠️ Total Pending</span>
                                      <span className="text-sm font-bold text-red-700">₹{totalPendingAmount.toLocaleString()} ({pendingPercentage}%)</span>
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                                      <div 
                                        className="bg-gradient-to-r from-red-400 to-red-600 h-2 rounded-full transition-all"
                                        style={{ width: `${pendingPercentage}%` }}
                                      ></div>
                                    </div>
                                  </div>
                                </div>
                              </>
                            ) : (
                              <div className="bg-white rounded p-3 text-center">
                                <p className="text-xs text-gray-500">ℹ️ No existing fees for this student</p>
                                <p className="text-xs text-gray-400 mt-1">Click "Refresh" to reload, or add a new fee record below</p>
                              </div>
                            )}
                          </div>
                        );
                      })()}

                      {/* Month */}
                      <div className="pt-4 border-t-2 border-gray-300 mt-4">
                        <h4 className="text-sm font-bold text-gray-800 mb-4 pb-2 border-b-2 border-blue-500">➕ Add New Fee Record Details</h4>
                      </div>

                      <div>
                        <label className="block text-sm font-semibold mb-2">📅 Month</label>
                        <input
                          type="number"
                          min="1"
                          max="12"
                          value={feeFormData.month}
                          onChange={(e) => setFeeFormData({...feeFormData, month: parseInt(e.target.value)})}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>

                      {/* Year */}
                      <div>
                        <label className="block text-sm font-semibold mb-2">📆 Year</label>
                        <input
                          type="number"
                          value={feeFormData.year}
                          onChange={(e) => setFeeFormData({...feeFormData, year: parseInt(e.target.value)})}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>

                      {/* Total Amount */}
                      <div className="bg-gradient-to-r from-blue-50 to-blue-100 border-2 border-blue-400 rounded-lg p-3">
                        <label className="block text-sm font-bold mb-2 text-blue-900">💵 Total Amount (Required)</label>
                        <div>
                          <input
                            type="number"
                            min="0"
                            step="100"
                            value={feeFormData.totalAmount}
                            onChange={(e) => setFeeFormData({...feeFormData, totalAmount: e.target.value})}
                            placeholder="Enter total fee amount"
                            className="w-full px-4 py-3 border-2 border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent text-lg font-semibold"
                          />
                          {feeFormData.totalAmount && (
                            <p className="text-xs text-blue-600 mt-2 font-semibold">✓ Amount entered: ₹{parseFloat(feeFormData.totalAmount).toLocaleString()}</p>
                          )}
                          {selectedStudentForFee && !feeFormData.totalAmount && (
                            <p className="text-xs text-blue-600 mt-2">💡 Tip: Field auto-filled with student's current fee. You can change it.</p>
                          )}
                        </div>
                      </div>

                      {/* Paid Amount */}
                      <div>
                        <label className="block text-sm font-semibold mb-2">✓ Paid Amount (Optional)</label>
                        <input
                          type="number"
                          min="0"
                          step="100"
                          value={feeFormData.paidAmount}
                          onChange={(e) => setFeeFormData({...feeFormData, paidAmount: e.target.value})}
                          placeholder="0"
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>

                      {/* Balance Display */}
                      <div className="bg-gradient-to-r from-green-50 to-green-100 border-2 border-green-400 rounded-lg p-3">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-bold text-green-900">⚖️ Balance (Pending)</span>
                          <span className="text-lg font-bold text-green-700">
                            ₹{(parseFloat(feeFormData.totalAmount || '0') - parseFloat(feeFormData.paidAmount || '0')).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-xs text-green-600 mt-2">
                          Total Amount: ₹{parseFloat(feeFormData.totalAmount || '0').toLocaleString()} | Paid: ₹{parseFloat(feeFormData.paidAmount || '0').toLocaleString()}
                        </p>
                      </div>
                    </div>
                    </div>
                    
                    {/* Fixed Footer with buttons */}
                    <div className="border-t p-6 flex-shrink-0 bg-gray-50 rounded-b-lg">
                      <div className="flex gap-2">
                        <button
                          onClick={() => setShowAddFeeModal(false)}
                          className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleAddFee}
                          disabled={isSubmittingFee}
                          className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition disabled:bg-gray-400 disabled:cursor-not-allowed font-semibold"
                        >
                          {isSubmittingFee ? 'Adding...' : 'Add Fee'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <Card className="bg-blue-50 border-l-4 border-blue-500">
                <h3 className="text-lg font-bold mb-3">ℹ️ Fee Management Information</h3>
                <ul className="space-y-2 text-sm text-gray-700">
                  <li>✅ Click "Add Fee" button to create new fee records for students</li>
                  <li>✅ Use the dropdown in the "Update Status" column to change fee status</li>
                  <li>✅ Status options: <strong>Pending</strong> (not paid), <strong>Partial</strong> (partially paid), <strong>Paid</strong> (fully paid)</li>
                  <li>✅ All changes are logged and visible to administrators</li>
                  <li>✅ You can only update fees for students in your class</li>
                  <li>⚠️ Changes are immediately saved to the system</li>
                </ul>
              </Card>
            </>
          ) : (
            <Card>
              <p className="text-center text-gray-500 py-8">You are not assigned as a class teacher for any class</p>
            </Card>
          )}
        </div>
      )}

      {/* STUDENT HISTORY TAB */}
      {activeTab === 'student-history' && (
        <TeacherStudentHistoryPage />
      )}

      {/* Change Password Modal */}
      <ChangePasswordModal 
        isOpen={showChangePassword} 
        onClose={() => setShowChangePassword(false)} 
      />
    </div>
  );
};
