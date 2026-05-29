import React, { useState, useEffect } from 'react';
import { Card, Button, ChangePasswordModal, Input } from '../../components/common';
import { useAuth } from '../../contexts/AuthContext';
import { marksService, examService, attendanceService, feeService } from '../../services';
import { updateStudentStatus, getAllStudents } from '../../services/studentService';
import { apiRequest } from '../../services/apiClient';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { Users, BookOpen, TrendingUp, Lock, Search, RefreshCw, Plus, History, ChevronDown, ChevronRight, CreditCard, User } from 'lucide-react';
import ClassManagementTab from './ClassManagementTab';
import UsersManagementTab from './UsersManagementTab';
import { StudentRegistrationTab } from './StudentRegistrationTab';
import { AddAdminTab } from './AddAdminTab';
import { AddTeacherTab } from './AddTeacherTab';
import { AssignClassesTab } from './AssignClassesTab';
import { AssignClassTeachersTab } from './AssignClassTeachersTab';
import { StudentHistoryPage } from './StudentHistoryPage';
import ExamManagementTab from './ExamManagementTab';

export const AdminDashboard: React.FC = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalTeachers: 0,
    totalClasses: 0,
  });
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'add-admin' | 'add-teacher' | 'assign-classes' | 'assign-class-teacher' | 'classes' | 'exams' | 'marks' | 'attendance' | 'class-analytics' | 'subject-analytics' | 'class-students' | 'student-performance' | 'toppers' | 'low-performers' | 'student-registration' | 'student-history' | 'fee-tracking'>('overview');
  const [expandedGroups, setExpandedGroups] = useState({ management: true, analytics: false, data: false });
  const [performanceData, setPerformanceData] = useState<any[]>([]);
  const [classData, setClassData] = useState<any[]>([]);
  const [allStudents, setAllStudents] = useState<any[]>([]);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [searchRegisterNo, setSearchRegisterNo] = useState('');
  const [searchedStudent, setSearchedStudent] = useState<any>(null);
  const [studentMarks, setStudentMarks] = useState<any[]>([]);
  const [subjectAnalytics, setSubjectAnalytics] = useState<any[]>([]);
  const [classAnalytics, setClassAnalytics] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [recentActivities, setRecentActivities] = useState<any[]>([]);
  const [importantActivities, setImportantActivities] = useState<any[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [selectedStudent, setSelectedStudent] = useState<string>('');
  const [selectedPerformanceYear, setSelectedPerformanceYear] = useState<string>('');
  const [selectedPerformanceExam, setSelectedPerformanceExam] = useState<string>('');
  const [selectedExam, setSelectedExam] = useState<string>('');
  const [classExams, setClassExams] = useState<any[]>([]);
  const [classesDropdown, setClassesDropdown] = useState<string[]>([]);
  const [classStudents, setClassStudents] = useState<any[]>([]);
  const [toppers, setToppers] = useState<any[]>([]);
  const [lowPerformers, setLowPerformers] = useState<any[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<any[]>([]);
  const [selectedAttendanceDate, setSelectedAttendanceDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedAttendanceClass, setSelectedAttendanceClass] = useState<string>('all');
  const [allClassesForAttendance, setAllClassesForAttendance] = useState<string[]>([]);
  const [studentStatusUpdate, setStudentStatusUpdate] = useState<string | null>(null);
  
  // Fee tracking state
  const [feeUpdates, setFeeUpdates] = useState<any[]>([]);
  const [classwiseFees, setClasswiseFees] = useState<any[]>([]);
  const [selectedFeeClass, setSelectedFeeClass] = useState<string>('');
  const [feeLoadingClasses, setFeeLoadingClasses] = useState<string[]>([]);
  const [loadingFeeUpdates, setLoadingFeeUpdates] = useState(false);
  const [selectedFeeYear, setSelectedFeeYear] = useState<number>(new Date().getFullYear());
  const [showMyInfo, setShowMyInfo] = useState(false);

  const isStudentActive = (status: unknown) => {
    if (status === null || status === undefined || String(status).trim() === '') return true;
    return String(status).trim().toLowerCase() === 'active';
  };

  useEffect(() => {
    loadDashboardData();
    loadActivityLists();
  }, []);

  const loadActivityLists = async () => {
    try {
      setIsLoading(true);
      const recent = await apiRequest<any[]>('/notifications/recent-admin?limit=5');
      if (recent.success) setRecentActivities(recent.data || []);

      const important = await apiRequest<any[]>('/notifications/important-admin?limit=5');
      if (important.success) setImportantActivities(important.data || []);
    } catch (err) {
      console.error('Error loading activities:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // When selectedClass changes, update classStudents, classExams, and load marks
  useEffect(() => {
    if (selectedClass && allStudents.length > 0) {
      const studentsInClass = allStudents.filter((s: any) => 
        s.class &&
        s.class.toLowerCase() === selectedClass.toLowerCase() &&
        isStudentActive(s.status)
      );
      console.log(`Updated classStudents for ${selectedClass}:`, studentsInClass);
      setClassStudents(studentsInClass);
      
      // Get exams for this class
      const classData = classAnalytics.find((c: any) => c.class === selectedClass);
      if (classData && classData.exams) {
        setClassExams(classData.exams);
      } else {
        setClassExams([]);
      }
      
      // Load marks for all students in the class
      const loadClassMarks = async () => {
        try {
          let allClassMarks: any[] = [];
          for (const student of studentsInClass) {
            const marksResult = await marksService.getMarksByStudent(student.id);
            const marks = marksResult.data || [];
            console.log(`Student ${student.name} (${student.id}): ${marks.length} marks`, marks);
            allClassMarks = [...allClassMarks, ...marks];
          }
          console.log(`Total marks loaded for class ${selectedClass}: ${allClassMarks.length}`, allClassMarks);
          setStudentMarks(allClassMarks);
        } catch (error) {
          console.error('Error loading marks for class:', error);
          setStudentMarks([]);
        }
      };
      loadClassMarks();
      
      // Reset exam selection when class changes
      setSelectedExam('');
    }
  }, [selectedClass, allStudents, classAnalytics]);

  // Load fee updates when fee-tracking tab is opened
  useEffect(() => {
    if (activeTab === 'fee-tracking') {
      loadFeeUpdates();
    }
  }, [activeTab]);

  const loadDashboardData = async () => {
    setIsLoading(true);
    try {
      const studentsResult = await getAllStudents();
      const students = studentsResult.data || [];

      // Get real marks data from database
      let allMarks: any[] = [];
      let classSubjectStats: { [key: string]: { [subject: string]: { marks: number[], count: number } } } = {};

      for (const student of students) {
        if (!student.id) continue;
        const marksResult = await marksService.getMarksByStudent(student.id);
        const marks = marksResult.data || [];
        allMarks = [...allMarks, ...marks];

        // Organize marks by class and subject
        if (!classSubjectStats[student.class]) {
          classSubjectStats[student.class] = {};
        }
        marks.forEach((mark: any) => {
          if (!classSubjectStats[student.class][mark.subject]) {
            classSubjectStats[student.class][mark.subject] = { marks: [], count: 0 };
          }
          classSubjectStats[student.class][mark.subject].marks.push(mark.marks);
          classSubjectStats[student.class][mark.subject].count += 1;
        });
      }

      // Calculate real performance data by class from actual marks
      const classwiseData: { [key: string]: any } = {};
      Object.keys(classSubjectStats).forEach((className) => {
        const classMarks = Object.values(classSubjectStats[className]).flat() as any[];
        const allClassMarks = classMarks.reduce((acc: number[], item: any) => [...acc, ...item.marks], []);
        const avgMarks = allClassMarks.length > 0 ? Math.round(allClassMarks.reduce((a: number, b: number) => a + b, 0) / allClassMarks.length) : 0;

        classwiseData[className] = {
          name: className,
          average: avgMarks,
          students: students.filter((s: any) => s.class === className).length,
        };
      });

      const realPerformanceData = Object.values(classwiseData);

      // Real subject analytics - aggregated per student per subject
      const subjectStats: {
        [subject: string]: {
          students: {
            [studentId: string]: { scored: number; possible: number };
          };
        };
      } = {};

      allMarks.forEach((mark: any) => {
        const subjectKey = String(mark.subject || '').trim().toUpperCase();
        const studentId = String(mark.student_id || '').trim();
        const scored = Number(mark.marks || 0);
        const possible = Number(mark.total || 100);

        if (!subjectKey || !studentId || !Number.isFinite(scored) || !Number.isFinite(possible) || possible <= 0) {
          return;
        }

        if (!subjectStats[subjectKey]) {
          subjectStats[subjectKey] = { students: {} };
        }

        if (!subjectStats[subjectKey].students[studentId]) {
          subjectStats[subjectKey].students[studentId] = { scored: 0, possible: 0 };
        }

        subjectStats[subjectKey].students[studentId].scored += scored;
        subjectStats[subjectKey].students[studentId].possible += possible;
      });

      const subjectWiseAnalytics = Object.keys(subjectStats)
        .sort()
        .map((subject) => {
          const perStudent = Object.values(subjectStats[subject].students);
          const studentCount = perStudent.length;

          const avg = studentCount > 0
            ? Math.round(
                perStudent.reduce((sum: number, item: any) => sum + ((item.scored / item.possible) * 100), 0) / studentCount
              )
            : 0;

          const pass = perStudent.filter((item: any) => ((item.scored / item.possible) * 100) >= 50).length;

          return {
            name: subject,
            subject,
            avg,
            average: avg,
            students: studentCount,
            pass,
          };
        });

      // Fetch all exams
      const examsResult = await examService.getAllExams();
      const allExams = examsResult.data || [];

      // Real class analytics - from actual marks data
      const realClassAnalytics = Object.keys(classSubjectStats).map((className) => {
        const classMarks = Object.values(classSubjectStats[className]).flat() as any[];
        const allClassMarks = classMarks.reduce((acc: number[], item: any) => [...acc, ...item.marks], []);
        const totalMarks = allClassMarks.reduce((a: number, b: number) => a + b, 0);
        const avgMarks = allClassMarks.length > 0 ? Math.round(totalMarks / allClassMarks.length) : 0;
        const maxMarks = allClassMarks.length > 0 ? Math.max(...allClassMarks) : 0;
        const minMarks = allClassMarks.length > 0 ? Math.min(...allClassMarks) : 0;
        
        // Count actual students in this class (case-insensitive)
        const studentsInClass = students.filter((s: any) => 
          s.class && s.class.toLowerCase() === className.toLowerCase()
        ).length;

        // Filter exams for this class
        const classExams = allExams.filter((exam: any) => 
          exam.class_name && exam.class_name.toLowerCase() === className.toLowerCase()
        );

        return {
          class: className,
          totalStudents: studentsInClass,
          totalMarks: totalMarks,
          avgMarks: avgMarks,
          topperMarks: maxMarks,
          lowMarks: minMarks,
          exams: classExams,
        };
      });

      setStats({
        totalStudents: students.length,
        totalTeachers: 15,
        totalClasses: new Set(students.map((s: any) => s.class)).size || 0,
      });
      
      setAllStudents(students);
      const allClasses = Array.from(new Set(students.map((s: any) => s.class))).sort();
      setClassesDropdown(allClasses);
      setAllClassesForAttendance(allClasses);
      
      // Only set default class if no class is selected yet
      if (!selectedClass) {
        const defaultClass = allClasses[0];
        setSelectedClass(defaultClass);
      }
      
      // Only show real database data
      setPerformanceData(realPerformanceData);
      setClassData(realPerformanceData);
      setSubjectAnalytics(subjectWiseAnalytics);
      setClassAnalytics(realClassAnalytics);
      
      // Calculate toppers and low performers
      const studentPerformance: { [key: string]: any } = {};
      
      allMarks.forEach((mark: any) => {
        const student = students.find((s: any) => s.id === mark.student_id);
        if (student) {
          if (!studentPerformance[mark.student_id]) {
            studentPerformance[mark.student_id] = {
              id: mark.student_id,
              name: student.name,
              register_no: student.register_no,
              class: student.class,
              totalMarks: 0,
              count: 0,
            };
          }
          studentPerformance[mark.student_id].totalMarks += mark.marks;
          studentPerformance[mark.student_id].count += 1;
        }
      });

      const performanceArray = Object.values(studentPerformance)
        .map((p: any) => ({ ...p, averageMarks: Math.round(p.totalMarks / p.count) }));

      const sortedToppers = performanceArray
        .sort((a: any, b: any) => b.averageMarks - a.averageMarks)
        .slice(0, 10);
      
      const sortedLowPerformers = performanceArray
        .sort((a: any, b: any) => a.averageMarks - b.averageMarks)
        .slice(0, 10);
      
      setToppers(sortedToppers);
      setLowPerformers(sortedLowPerformers);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClassChange = (className: string) => {
    setSelectedClass(className);
    setSelectedStudent('');
    setSelectedPerformanceYear('');
    setSelectedPerformanceExam('');
    setSearchedStudent(null);
    setStudentMarks([]);
    // Filter students in the selected class (Active or when status is not set)
    const studentsInClass = allStudents.filter((s: any) => 
      s.class &&
      s.class.toLowerCase() === className.toLowerCase() &&
      isStudentActive(s.status)
    );
    console.log(`Class: ${className}, Students found: ${studentsInClass.length}`, studentsInClass);
    setClassStudents(studentsInClass);
  };

  const handleStudentPerformanceSearch = async () => {
    if (!selectedClass || !selectedStudent || !selectedPerformanceExam || !selectedPerformanceYear) {
      alert('Please select class, student, exam and year');
      return;
    }
    
    const student = classStudents.find((s: any) => s.register_no === selectedStudent);
    if (student) {
      setSearchedStudent(student);
      const marksResult = await marksService.getMarksByStudent(student.id);
      const classExamMeta = classAnalytics.find((c: any) => c.class === selectedClass);
      const classExamsForPerformance = classExamMeta?.exams || [];
      const selectedExamObj = classExamsForPerformance.find((e: any) => e.id === selectedPerformanceExam);
      const examName = selectedExamObj?.exam_name;
      const examNumber = selectedExamObj?.exam_number;
      const combinedExamName = examName ? (examNumber ? `${examName}-${examNumber}` : examName) : '';

      let filteredMarks = marksResult.data || [];
      if (combinedExamName) {
        const normalizedCombinedExam = combinedExamName.toUpperCase().trim();
        const normalizedBaseExam = String(examName || '').toUpperCase().trim();

        filteredMarks = filteredMarks.filter((m: any) => {
          const markExamName = String(m.exam_name || '').toUpperCase().trim();
          return markExamName === normalizedCombinedExam || markExamName === normalizedBaseExam;
        });
      }

      // Legacy-safe year filter: if year is missing in old marks rows, still include them.
      filteredMarks = filteredMarks.filter((m: any) => {
        const markYear = String(m.year || '').trim();
        if (!markYear) return true;
        return markYear === selectedPerformanceYear;
      });
      setStudentMarks(filteredMarks);
    } else {
      alert('Student not found in selected class');
      setSearchedStudent(null);
      setStudentMarks([]);
    }
  };

  const handleSearchStudent = async () => {
    if (!searchRegisterNo.trim()) return;
    try {
      const studentsResult = await getAllStudents();
      const student = studentsResult.data?.find((s: any) => s.register_no === searchRegisterNo);
      
      if (student && student.id) {
        setSearchedStudent(student);
        const marksResult = await marksService.getMarksByStudent(student.id);
        setStudentMarks(marksResult.data || []);
      } else {
        alert('Student not found');
        setSearchedStudent(null);
        setStudentMarks([]);
      }
    } catch (error) {
      console.error('Error searching student:', error);
    }
  };

  const updateStudentStatusHandler = async (studentId: string, newStatus: string) => {
    try {
      setStudentStatusUpdate(studentId);
      
      // Find the student to get their register_no
      const student = allStudents.find((s: any) => s.id === studentId);
      if (!student) {
        alert('Student not found');
        setStudentStatusUpdate(null);
        return;
      }
      
      // First update the status
      const result = await updateStudentStatus(studentId, newStatus);
      
      if (!result.success) {
        alert(`Error updating status: ${result.error || 'Unknown error'}`);
        setStudentStatusUpdate(null);
        return;
      }
      
      // Update the local student data
      const updatedStudents = allStudents.map((s: any) => 
        s.id === studentId ? { ...s, status: newStatus } : s
      );
      setAllStudents(updatedStudents);
      
      // Update classStudents if viewing a class
      const updatedClassStudents = classStudents.map((s: any) =>
        s.id === studentId ? { ...s, status: newStatus } : s
      );
      setClassStudents(updatedClassStudents);
        
      alert(`✓ Student status updated to: ${newStatus}`);
    } catch (error) {
      console.error('Error updating student status:', error);
      alert('Failed to update status');
    } finally {
      setStudentStatusUpdate(null);
    }
  };

  const loadFeeUpdates = async () => {
    setLoadingFeeUpdates(true);
    try {
      // Load all fee status updates from the audit table
      const result = await apiRequest<any[]>('/fees/status-updates');

      if (result.success && result.data) {
        console.log('Fee updates loaded:', result.data);
        setFeeUpdates(result.data);
      }
    } catch (error) {
      console.error('Error loading fee updates:', error);
      setFeeUpdates([]);
    } finally {
      setLoadingFeeUpdates(false);
    }
  };

  const loadClassFees = async (className: string) => {
    if (!className) return;
    
    try {
      setFeeLoadingClasses([...feeLoadingClasses, className]);
      const result = await feeService.getFeesByClass(className);
      
      if (result.success && result.data) {
        console.log(`Loaded fees for ${className}:`, result.data);
        setClasswiseFees(result.data);
      }
    } catch (error) {
      console.error(`Error loading fees for ${className}:`, error);
    } finally {
      setFeeLoadingClasses(feeLoadingClasses.filter(c => c !== className));
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-600 mt-1">School Management & Analytics</p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => setShowMyInfo((prev) => !prev)}
            className="flex items-center space-x-2 bg-purple-600 hover:bg-purple-700"
          >
            <User size={18} />
            <span>My Info</span>
          </Button>
          <Button 
            onClick={loadDashboardData}
            disabled={isLoading}
            className="flex items-center space-x-2 bg-blue-500 hover:bg-blue-600"
          >
            <RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} />
            <span>{isLoading ? 'Refreshing...' : 'Refresh Data'}</span>
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
        <Card className="border-2 border-purple-100 bg-gradient-to-r from-purple-50 to-pink-50">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="p-4 rounded-2xl bg-purple-600 text-white shadow-lg">
                <User size={28} />
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-purple-600 font-bold">My Info</p>
                <h2 className="text-2xl font-bold text-gray-900">{user?.name || 'Administrator'}</h2>
                <p className="text-sm text-gray-600 mt-1">
                  Role: <strong>{user?.role?.toUpperCase() || 'ADMIN'}</strong> · Email: <strong>{user?.email || 'N/A'}</strong>
                </p>
              </div>
            </div>
            <button onClick={() => setShowMyInfo(false)} className="text-gray-500 hover:text-gray-800 font-semibold">
              Close
            </button>
          </div>
        </Card>
      )}

      {/* Tab Navigation - Organized Groups */}
      <div className="space-y-3">
        {/* Quick Navigation - Always Visible */}
        <div className="flex gap-2 border-b border-gray-300 pb-2">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2 font-semibold transition-colors whitespace-nowrap rounded-t-lg ${
              activeTab === 'overview'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            📊 Overview
          </button>
          <button
            onClick={() => setActiveTab('classes')}
            className={`px-4 py-2 font-semibold transition-colors whitespace-nowrap rounded-t-lg ${
              activeTab === 'classes'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            📚 Classes
          </button>
          <button
            onClick={() => setActiveTab('exams')}
            className={`px-4 py-2 font-semibold transition-colors whitespace-nowrap rounded-t-lg ${
              activeTab === 'exams'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            📝 Exams
          </button>
          <button
            onClick={() => setActiveTab('attendance')}
            className={`px-4 py-2 font-semibold transition-colors whitespace-nowrap rounded-t-lg ${
              activeTab === 'attendance'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            📋 Attendance
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`px-4 py-2 font-semibold transition-colors whitespace-nowrap rounded-t-lg ${
              activeTab === 'users'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            👥 Users
          </button>
        </div>
        <div className="border border-gray-300 rounded-lg bg-white">
          <button
            onClick={() => setExpandedGroups({ ...expandedGroups, management: !expandedGroups.management })}
            className="w-full px-4 py-3 flex items-center justify-between font-semibold text-gray-800 hover:bg-gray-50 border-b border-gray-300"
          >
            <span className="flex items-center gap-2">
              {expandedGroups.management ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
              ⚙️ Management
            </span>
          </button>
          {expandedGroups.management && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 p-4">
              <button
                onClick={() => setActiveTab('add-admin')}
                className={`p-3 rounded-lg font-medium text-sm transition-colors ${
                  activeTab === 'add-admin'
                    ? 'bg-red-500 text-white'
                    : 'bg-red-50 text-red-700 hover:bg-red-100'
                }`}
              >
                <Plus size={16} className="inline mr-1" /> Add Admin
              </button>
              <button
                onClick={() => setActiveTab('add-teacher')}
                className={`p-3 rounded-lg font-medium text-sm transition-colors ${
                  activeTab === 'add-teacher'
                    ? 'bg-green-500 text-white'
                    : 'bg-green-50 text-green-700 hover:bg-green-100'
                }`}
              >
                <Plus size={16} className="inline mr-1" /> Add Teacher
              </button>
              <button
                onClick={() => setActiveTab('assign-class-teacher')}
                className={`p-3 rounded-lg font-medium text-sm transition-colors ${
                  activeTab === 'assign-class-teacher'
                    ? 'bg-blue-500 text-white'
                    : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                }`}
              >
                👨‍🏫 Class Teachers
              </button>
              <button
                onClick={() => setActiveTab('assign-classes')}
                className={`p-3 rounded-lg font-medium text-sm transition-colors ${
                  activeTab === 'assign-classes'
                    ? 'bg-cyan-500 text-white'
                    : 'bg-cyan-50 text-cyan-700 hover:bg-cyan-100'
                }`}
              >
                📚 Assign Classes
              </button>
              <button
                onClick={() => setActiveTab('student-registration')}
                className={`p-3 rounded-lg font-medium text-sm transition-colors ${
                  activeTab === 'student-registration'
                    ? 'bg-purple-500 text-white'
                    : 'bg-purple-50 text-purple-700 hover:bg-purple-100'
                }`}
              >
                📝 Register Student
              </button>
              <button
                onClick={() => setActiveTab('student-history')}
                className={`p-3 rounded-lg font-medium text-sm transition-colors ${
                  activeTab === 'student-history'
                    ? 'bg-purple-600 text-white'
                    : 'bg-purple-50 text-purple-700 hover:bg-purple-100'
                }`}
              >
                <History size={16} className="inline mr-1" /> History
              </button>
              <button
                onClick={() => setActiveTab('fee-tracking')}
                className={`p-3 rounded-lg font-medium text-sm transition-colors ${
                  activeTab === 'fee-tracking'
                    ? 'bg-orange-500 text-white'
                    : 'bg-orange-50 text-orange-700 hover:bg-orange-100'
                }`}
              >
                <CreditCard size={16} className="inline mr-1" /> Fee Tracking
              </button>
            </div>
          )}
        </div>

        {/* Analytics Group */}
        <div className="border border-gray-300 rounded-lg bg-white">
          <button
            onClick={() => setExpandedGroups({ ...expandedGroups, analytics: !expandedGroups.analytics })}
            className="w-full px-4 py-3 flex items-center justify-between font-semibold text-gray-800 hover:bg-gray-50 border-b border-gray-300"
          >
            <span className="flex items-center gap-2">
              {expandedGroups.analytics ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
              📈 Analytics
            </span>
          </button>
          {expandedGroups.analytics && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 p-4">
              <button
                onClick={() => setActiveTab('class-analytics')}
                className={`p-3 rounded-lg font-medium text-sm transition-colors ${
                  activeTab === 'class-analytics'
                    ? 'bg-blue-500 text-white'
                    : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                }`}
              >
                📊 Class Analytics
              </button>
              <button
                onClick={() => setActiveTab('subject-analytics')}
                className={`p-3 rounded-lg font-medium text-sm transition-colors ${
                  activeTab === 'subject-analytics'
                    ? 'bg-indigo-500 text-white'
                    : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
                }`}
              >
                📚 Subject Analytics
              </button>
              <button
                onClick={() => setActiveTab('student-performance')}
                className={`p-3 rounded-lg font-medium text-sm transition-colors ${
                  activeTab === 'student-performance'
                    ? 'bg-orange-500 text-white'
                    : 'bg-orange-50 text-orange-700 hover:bg-orange-100'
                }`}
              >
                👤 Performance
              </button>
              <button
                onClick={() => setActiveTab('toppers')}
                className={`p-3 rounded-lg font-medium text-sm transition-colors ${
                  activeTab === 'toppers'
                    ? 'bg-yellow-500 text-white'
                    : 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100'
                }`}
              >
                🏆 Toppers
              </button>
              <button
                onClick={() => setActiveTab('low-performers')}
                className={`p-3 rounded-lg font-medium text-sm transition-colors ${
                  activeTab === 'low-performers'
                    ? 'bg-orange-600 text-white'
                    : 'bg-orange-50 text-orange-700 hover:bg-orange-100'
                }`}
              >
                ⚠️ Need Help
              </button>
            </div>
          )}
        </div>

        {/* Data & Records Group */}
        <div className="border border-gray-300 rounded-lg bg-white">
          <button
            onClick={() => setExpandedGroups({ ...expandedGroups, data: !expandedGroups.data })}
            className="w-full px-4 py-3 flex items-center justify-between font-semibold text-gray-800 hover:bg-gray-50 border-b border-gray-300"
          >
            <span className="flex items-center gap-2">
              {expandedGroups.data ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
              📋 Data & Records
            </span>
          </button>
          {expandedGroups.data && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 p-4">
              <button
                onClick={() => setActiveTab('marks')}
                className={`p-3 rounded-lg font-medium text-sm transition-colors ${
                  activeTab === 'marks'
                    ? 'bg-cyan-500 text-white'
                    : 'bg-cyan-50 text-cyan-700 hover:bg-cyan-100'
                }`}
              >
                📌 Student Marks
              </button>
              <button
                onClick={() => { setActiveTab('class-students'); handleClassChange(selectedClass || classesDropdown[0]); }}
                className={`p-3 rounded-lg font-medium text-sm transition-colors ${
                  activeTab === 'class-students'
                    ? 'bg-teal-500 text-white'
                    : 'bg-teal-50 text-teal-700 hover:bg-teal-100'
                }`}
              >
                👨‍🎓 Class Students
              </button>
            </div>
          )}
        </div>
      </div>

      {/* OVERVIEW TAB */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="flex items-center space-x-4 border-l-4 border-blue-500">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Users className="text-primary" size={28} />
              </div>
              <div>
                <p className="text-gray-600 text-sm font-medium">Total Students</p>
                <p className="text-3xl font-bold text-gray-900">{stats.totalStudents}</p>
                <p className="text-xs text-gray-500 mt-1">↑ 5% this semester</p>
              </div>
            </Card>

            <Card className="flex items-center space-x-4 border-l-4 border-green-500">
              <div className="p-3 bg-green-100 rounded-lg">
                <BookOpen className="text-secondary" size={28} />
              </div>
              <div>
                <p className="text-gray-600 text-sm font-medium">Total Teachers</p>
                <p className="text-3xl font-bold text-gray-900">{stats.totalTeachers}</p>
                <p className="text-xs text-gray-500 mt-1">All active & present</p>
              </div>
            </Card>

            <Card className="flex items-center space-x-4 border-l-4 border-purple-500">
              <div className="p-3 bg-purple-100 rounded-lg">
                <TrendingUp className="text-accent" size={28} />
              </div>
              <div>
                <p className="text-gray-600 text-sm font-medium">Total Classes</p>
                <p className="text-3xl font-bold text-gray-900">{stats.totalClasses}</p>
                <p className="text-xs text-gray-500 mt-1">Evenly distributed</p>
              </div>
            </Card>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <h2 className="text-xl font-bold mb-4">Class Performance Overview</h2>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={performanceData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="average" fill="#2563eb" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Card>

            <Card>
              <h2 className="text-xl font-bold mb-4">Student Distribution</h2>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={classData}
                    dataKey="students"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label
                  >
                    {classData.map((_entry, index) => (
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

          {/* System Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <p className="text-gray-600 text-sm font-medium">Average Attendance</p>
              <p className="text-2xl font-bold text-green-600 mt-1">92.5%</p>
              <p className="text-xs text-gray-500 mt-2"><TrendingUp size={14} className="inline mr-1" />2.3% improvement</p>
            </Card>
            <Card>
              <p className="text-gray-600 text-sm font-medium">Avg Class Score</p>
              <p className="text-2xl font-bold text-purple-600 mt-1">80.2</p>
              <p className="text-xs text-gray-500 mt-2">Out of 100 marks</p>
            </Card>
            <Card>
              <p className="text-gray-600 text-sm font-medium">Active Teachers</p>
              <p className="text-2xl font-bold text-orange-600 mt-1">{stats.totalTeachers}</p>
              <p className="text-xs text-gray-500 mt-2">Fully operational</p>
            </Card>
          </div>

          {/* Recent Activities */}
          <Card>
            <h2 className="text-xl font-bold mb-4">📊 Recent Activities</h2>
            <div className="space-y-3">
              {recentActivities.length === 0 ? (
                <div className="text-sm text-gray-500">No recent activities</div>
              ) : (
                recentActivities.map((act) => (
                  <div key={act.id} className="flex items-center justify-between p-3 bg-gray-50 rounded hover:bg-gray-100 transition">
                    <p className="text-sm">{act.title ? <strong>{act.title}: </strong> : null}{act.message}</p>
                    <p className="text-xs text-gray-500">{new Date(act.created_at).toLocaleString()}</p>
                  </div>
                ))
              )}
            </div>
          </Card>

          {/* Important Alerts */}
          <Card>
            <h2 className="text-xl font-bold mb-4">⚠️ Important Alerts</h2>
            <div className="space-y-2">
              {importantActivities.length === 0 ? (
                <div className="text-sm text-gray-500">No important alerts</div>
              ) : (
                importantActivities.map((it) => (
                  <div key={it.id} className="p-3 bg-yellow-50 border-l-4 border-yellow-500 rounded">
                    <p className="text-yellow-800 text-sm">{it.title ? <strong>{it.title}: </strong> : null}{it.message}</p>
                    <p className="text-xs text-gray-500 mt-1">{new Date(it.created_at).toLocaleString()}</p>
                  </div>
                ))
              )}
            </div>
          </Card>

          {/* Quick Actions */}
          <Card>
            <h2 className="text-xl font-bold mb-4">⚡ Quick Actions</h2>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <a href="/admin/users" className="p-4 bg-blue-50 hover:bg-blue-100 rounded-lg text-center font-semibold text-primary transition-colors text-sm">
                👥 Manage Users
              </a>
              <a href="/admin/performance" className="p-4 bg-yellow-50 hover:bg-yellow-100 rounded-lg text-center font-semibold text-accent transition-colors text-sm">
                📈 Performance
              </a>
              <a href="/admin/notifications" className="p-4 bg-purple-50 hover:bg-purple-100 rounded-lg text-center font-semibold text-purple-600 transition-colors text-sm">
                🔔 Notifications
              </a>
              <a href="/dashboard" className="p-4 bg-pink-50 hover:bg-pink-100 rounded-lg text-center font-semibold text-pink-600 transition-colors text-sm">
                📊 Reports
              </a>
            </div>
          </Card>
        </div>
      )}

      {/* MARKS SEARCH TAB */}
      {activeTab === 'marks' && (
        <div className="space-y-6">
          <Card>
            <h2 className="text-2xl font-bold mb-4">🔍 Search Student Marks</h2>
            <div className="flex gap-2 mb-6">
              <Input
                type="text"
                placeholder="Enter Register Number (e.g., STU001)"
                value={searchRegisterNo}
                onChange={(e) => setSearchRegisterNo(e.target.value)}
              />
              <Button onClick={handleSearchStudent} className="flex items-center gap-2">
                <Search size={18} />
                Search
              </Button>
            </div>

            {searchedStudent && (
              <div className="space-y-4">
                <div className="p-4 bg-blue-50 rounded-lg border-l-4 border-blue-500">
                  <h3 className="font-bold text-lg">{searchedStudent.name}</h3>
                  <p className="text-sm text-gray-600">Register No: {searchedStudent.register_no} | Class: {searchedStudent.class}</p>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="px-4 py-2 text-left text-sm font-semibold">Subject</th>
                        <th className="px-4 py-2 text-center text-sm font-semibold">Marks Obtained</th>
                        <th className="px-4 py-2 text-center text-sm font-semibold">Total Marks</th>
                        <th className="px-4 py-2 text-center text-sm font-semibold">Percentage</th>
                        <th className="px-4 py-2 text-center text-sm font-semibold">Grade</th>
                      </tr>
                    </thead>
                    <tbody>
                      {studentMarks.length > 0 ? (
                        studentMarks.map((mark: any, idx: number) => {
                          const percentage = (mark.marks / mark.total) * 100;
                          const grade = percentage >= 90 ? 'A+' : percentage >= 80 ? 'A' : percentage >= 70 ? 'B' : percentage >= 60 ? 'C' : 'D';
                          return (
                            <tr key={idx} className="border-b hover:bg-gray-50">
                              <td className="px-4 py-3 font-medium">{mark.subject?.toUpperCase() || '-'}</td>
                              <td className="px-4 py-3 text-center">{mark.marks}</td>
                              <td className="px-4 py-3 text-center">{mark.total}</td>
                              <td className="px-4 py-3 text-center font-semibold text-blue-600">{percentage.toFixed(1)}%</td>
                              <td className="px-4 py-3 text-center">
                                <span className={`px-2 py-1 rounded font-bold text-white ${
                                  grade === 'A+' ? 'bg-green-600' : grade === 'A' ? 'bg-green-500' : grade === 'B' ? 'bg-blue-500' : 'bg-orange-500'
                                }`}>{grade}</span>
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan={5} className="px-4 py-3 text-center text-gray-500">No marks available for this student</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {studentMarks.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card>
                      <p className="text-gray-600 text-sm">Total Marks Obtained</p>
                      <p className="text-2xl font-bold text-primary mt-1">
                        {studentMarks.reduce((sum: number, m: any) => sum + m.marks, 0)}
                      </p>
                    </Card>
                    <Card>
                      <p className="text-gray-600 text-sm">Total Marks</p>
                      <p className="text-2xl font-bold text-secondary mt-1">
                        {studentMarks.reduce((sum: number, m: any) => sum + m.total, 0)}
                      </p>
                    </Card>
                    <Card>
                      <p className="text-gray-600 text-sm">Average Percentage</p>
                      <p className="text-2xl font-bold text-accent mt-1">
                        {(studentMarks.reduce((sum: number, m: any) => sum + (m.marks / m.total) * 100, 0) / studentMarks.length).toFixed(1)}%
                      </p>
                    </Card>
                    <Card>
                      <p className="text-gray-600 text-sm">Subjects Enrolled</p>
                      <p className="text-2xl font-bold text-purple-600 mt-1">{studentMarks.length}</p>
                    </Card>
                  </div>
                )}
              </div>
            )}
          </Card>
        </div>
      )}

      {/* CLASS ANALYTICS TAB */}
      {activeTab === 'class-analytics' && (
        <div className="space-y-6">
          {/* Class Selector */}
          <Card className="p-6 border border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 shadow-sm">
            <h3 className="text-lg font-bold text-gray-900 mb-1">🎯 Class Analytics Filters</h3>
            <p className="text-sm text-gray-600 mb-5">Choose class and exam to view exam-wise student performance.</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-gray-700 mb-2">Class</label>
                <select
                  value={selectedClass}
                  onChange={(e) => setSelectedClass(e.target.value)}
                  className="w-full px-3 py-2.5 border border-blue-200 bg-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- Select a class --</option>
                  {classAnalytics.map((cls: any) => (
                    <option key={cls.class} value={cls.class}>
                      {cls.class} ({cls.totalStudents} students)
                    </option>
                  ))}
                </select>
              </div>

              {selectedClass && (
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide text-gray-700 mb-2">Exam (required)</label>
                  <select
                    value={selectedExam}
                    onChange={(e) => setSelectedExam(e.target.value)}
                    className="w-full px-3 py-2.5 border border-green-200 bg-white rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    <option value="">-- Select Exam --</option>
                    {classExams.map((exam: any) => {
                      const year = exam.year || new Date().getFullYear();
                      const academicYear = `${year}-${year + 1}`;
                      const displayName = `${exam.exam_name}-${exam.exam_number}`;
                      return (
                      <option key={exam.id} value={exam.id}>
                        {displayName} ({academicYear})
                      </option>
                      );
                    })}
                  </select>
                </div>
              )}

              {selectedClass && (
                <div className="p-3.5 bg-white rounded-lg border border-blue-200 shadow-sm">
                  <p className="text-sm text-gray-700 flex items-center justify-between">
                    <span className="font-medium">Selected Class</span>
                    <span className="text-blue-700 font-bold">{selectedClass}</span>
                  </p>
                  <p className="text-sm text-gray-700 mt-1 flex items-center justify-between">
                    <span className="font-medium">Students</span>
                    <span className="font-bold text-gray-900">{classStudents.length}</span>
                  </p>
                  {selectedExam && (() => {
                      const selectedExamObj = classExams.find((e: any) => e.id === selectedExam);
                      const year = selectedExamObj?.year || new Date().getFullYear();
                      const academicYear = `${year}-${year + 1}`;
                      const displayName = `${selectedExamObj?.exam_name}-${selectedExamObj?.exam_number}`;
                      return (
                      <p className="text-sm text-gray-700 mt-1 flex items-center justify-between">
                        <span className="font-medium">Exam</span>
                        <span className="font-semibold text-indigo-700">{displayName} ({academicYear})</span>
                      </p>
                      );
                    })()}
                </div>
              )}
            </div>
          </Card>

          {/* Class Students with Marks */}
          {selectedClass && !selectedExam ? (
            <Card className="p-8 text-center border border-amber-200 bg-amber-50">
              <p className="text-amber-900 font-semibold text-lg">Please select an exam to view marks</p>
              <p className="text-sm text-amber-700 mt-2">Class analytics now shows marks only for the selected exam.</p>
            </Card>
          ) : selectedClass && classStudents.length > 0 ? (
            <Card className="p-6 border border-green-200 bg-gradient-to-r from-green-50 to-emerald-50 shadow-sm">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-gray-900">📚 Students in {selectedClass} {selectedExam ? (() => {
                  const selectedExamObj = classExams.find((e: any) => e.id === selectedExam);
                  const displayName = `${selectedExamObj?.exam_name}-${selectedExamObj?.exam_number}`;
                  return `- ${displayName}`;
                })() : ''}</h3>
                <button
                  onClick={() => {
                    if (selectedClass && allStudents.length > 0) {
                      const studentsInClass = allStudents.filter((s: any) => 
                        s.class &&
                        s.class.toLowerCase() === selectedClass.toLowerCase() &&
                        isStudentActive(s.status)
                      );
                      const loadClassMarks = async () => {
                        try {
                          let allClassMarks: any[] = [];
                          for (const student of studentsInClass) {
                            const marksResult = await marksService.getMarksByStudent(student.id);
                            const marks = marksResult.data || [];
                            console.log(`Refresh - Student ${student.name}: ${marks.length} marks`, marks);
                            allClassMarks = [...allClassMarks, ...marks];
                          }
                          console.log(`Refreshed total marks: ${allClassMarks.length}`, allClassMarks);
                          setStudentMarks(allClassMarks);
                        } catch (error) {
                          console.error('Error refreshing marks:', error);
                        }
                      };
                      loadClassMarks();
                    }
                  }}
                  className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition"
                >
                  <RefreshCw size={16} />
                  Refresh
                </button>
              </div>
              
              <div className="overflow-x-auto">
                {(() => {
                  let filteredMarks = studentMarks.filter((m: any) => classStudents.find((cs) => cs.id === m.student_id));
                  
                  if (selectedExam) {
                    const selectedExamObj = classExams.find((e: any) => e.id === selectedExam);
                    const selectedExamName = selectedExamObj?.exam_name;
                    const selectedExamNumber = selectedExamObj?.exam_number;
                    const combinedExamName = selectedExamName ? (selectedExamNumber ? `${selectedExamName}-${selectedExamNumber}` : selectedExamName) : null;

                    if (combinedExamName) {
                      filteredMarks = filteredMarks.filter((m: any) => (m.exam_name || '').toUpperCase() === combinedExamName.toUpperCase());
                      console.log(`Filtering by exam_name "${combinedExamName}": ${filteredMarks.length} marks found`);
                    }
                  }

                  if (filteredMarks.length === 0) {
                    return (
                      <div className="p-8 text-center bg-white rounded-lg border border-dashed border-green-200">
                        <p className="text-gray-700 font-semibold">No marks found for the selected filters.</p>
                        <p className="text-sm text-gray-500 mt-1">Try selecting another exam or click Refresh.</p>
                      </div>
                    );
                  }

                  return (
                    <table className="w-full border-separate border-spacing-0 overflow-hidden rounded-lg">
                      <thead className="bg-green-100">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide border border-green-200">Register No.</th>
                          <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide border border-green-200">Student Name</th>
                          
                          {/* Subject columns */}
                          {Array.from(
                            new Set(
                              filteredMarks
                                .map((m: any) => m.subject)
                            )
                          )
                            .sort()
                            .map((subject: string) => (
                              <th
                                key={subject}
                                className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wide border border-green-200 bg-green-50"
                              >
                                {subject}
                              </th>
                            ))}
                          
                          <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wide border border-green-200">Total</th>
                          <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wide border border-green-200">Average</th>
                        </tr>
                      </thead>
                      <tbody>
                        {classStudents.map((student: any) => {
                          // Get filtered marks for this student
                          let studentMarksList = filteredMarks.filter(
                            (m: any) => m.student_id === student.id
                          );
                          const totalMarks = studentMarksList.reduce((sum: number, m: any) => sum + (m.marks || 0), 0);
                          const avgMarks = studentMarksList.length > 0 ? Math.round(totalMarks / studentMarksList.length) : 0;

                          // Get unique subjects from filtered marks
                          const subjects = Array.from(
                            new Set(
                              filteredMarks
                                .map((m: any) => m.subject)
                            )
                          ).sort();

                          return (
                            <tr key={student.id} className="hover:bg-green-50 transition bg-white even:bg-green-50/40">
                              <td className="px-4 py-3 font-semibold text-gray-700 border border-green-100">{student.register_no}</td>
                              <td className="px-4 py-3 font-medium text-gray-900 border border-green-100">{student.name}</td>
                              
                              {/* Subject marks */}
                              {subjects.map((subject: string) => {
                                const markRecord = studentMarksList.find(
                                  (m: any) => m.subject === subject
                                );
                                const marks = markRecord?.marks || '-';
                                
                                return (
                                  <td
                                    key={subject}
                                    className="px-4 py-3 text-center font-semibold border border-green-100 bg-transparent"
                                  >
                                    <span className={`px-2 py-1 rounded text-sm font-bold inline-block ${
                                      marks === '-' 
                                        ? 'bg-gray-100 text-gray-600'
                                        : marks >= 50
                                        ? 'bg-green-100 text-green-800'
                                        : 'bg-red-100 text-red-800'
                                    }`}>
                                      {marks}
                                    </span>
                                  </td>
                                );
                              })}
                              
                              <td className="px-4 py-3 text-center font-bold text-gray-900 border border-green-100 bg-yellow-50">
                                {totalMarks}
                              </td>
                              <td className="px-4 py-3 text-center border border-green-100 bg-blue-50">
                                <span className="px-3 py-1 bg-blue-200 text-blue-800 text-sm font-bold rounded-full">
                                  {avgMarks}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  );
                })()}
              </div>

              {/* Summary Stats */}
              {(() => {
                let filteredMarks = studentMarks.filter((m: any) => classStudents.find((cs) => cs.id === m.student_id));
                if (selectedExam) {
                  const selectedExamObj = classExams.find((e: any) => e.id === selectedExam);
                  const selectedExamName = selectedExamObj?.exam_name;
                  const selectedExamNumber = selectedExamObj?.exam_number;
                  const combinedExamName = selectedExamName ? (selectedExamNumber ? `${selectedExamName}-${selectedExamNumber}` : selectedExamName) : null;
                  if (combinedExamName) {
                    filteredMarks = filteredMarks.filter((m: any) => (m.exam_name || '').toUpperCase() === combinedExamName.toUpperCase());
                  }
                }

                const classAvg = classStudents.length > 0
                  ? Math.round(
                      classStudents.reduce((sum: number, student: any) => {
                        const marks = filteredMarks.filter((m: any) => m.student_id === student.id);
                        const avg = marks.length > 0 ? Math.round(marks.reduce((s: number, m: any) => s + (m.marks || 0), 0) / marks.length) : 0;
                        return sum + avg;
                      }, 0) / classStudents.length
                    )
                  : 0;

                const passCount = classStudents.filter((student: any) => {
                  const marks = filteredMarks.filter((m: any) => m.student_id === student.id);
                  const avg = marks.length > 0 ? Math.round(marks.reduce((s: number, m: any) => s + (m.marks || 0), 0) / marks.length) : 0;
                  return avg >= 50;
                }).length;

                const passRate = classStudents.length > 0 ? Math.round((passCount / classStudents.length) * 100) : 0;

                const subjectCount = Array.from(new Set(filteredMarks.map((m: any) => m.subject))).length;

                return (
                  <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="p-4 bg-white rounded-xl border border-green-100 shadow-sm">
                      <p className="text-xs text-gray-600 font-semibold uppercase">Total Students</p>
                      <p className="text-2xl font-bold text-gray-900 mt-1">{classStudents.length}</p>
                    </div>
                    <div className="p-4 bg-white rounded-xl border border-blue-100 shadow-sm">
                      <p className="text-xs text-gray-600 font-semibold uppercase">Class Average</p>
                      <p className="text-2xl font-bold text-blue-600 mt-1">{classAvg}</p>
                    </div>
                    <div className="p-4 bg-white rounded-xl border border-green-100 shadow-sm">
                      <p className="text-xs text-gray-600 font-semibold uppercase">Pass Rate</p>
                      <p className="text-2xl font-bold text-green-600 mt-1">{passRate}%</p>
                    </div>
                    <div className="p-4 bg-white rounded-xl border border-orange-100 shadow-sm">
                      <p className="text-xs text-gray-600 font-semibold uppercase">Subjects</p>
                      <p className="text-2xl font-bold text-orange-600 mt-1">{subjectCount}</p>
                    </div>
                  </div>
                );
              })()}

              {/* Subject-wise Summary */}
              {(() => {
                let filteredMarks = studentMarks.filter((m: any) => classStudents.find((cs) => cs.id === m.student_id));
                if (selectedExam) {
                  const selectedExamObj = classExams.find((e: any) => e.id === selectedExam);
                  const selectedExamName = selectedExamObj?.exam_name;
                  const selectedExamNumber = selectedExamObj?.exam_number;
                  const combinedExamName = selectedExamName ? (selectedExamNumber ? `${selectedExamName}-${selectedExamNumber}` : selectedExamName) : null;
                  if (combinedExamName) {
                    filteredMarks = filteredMarks.filter((m: any) => (m.exam_name || '').toUpperCase() === combinedExamName.toUpperCase());
                  }
                }
                return Array.from(new Set(filteredMarks.map((m: any) => m.subject))).length > 0 && (
                  <div className="mt-6 p-4 bg-white rounded-lg border border-green-200">
                    <h4 className="font-semibold text-gray-900 mb-3">📊 Subject Performance Summary</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {Array.from(new Set(filteredMarks.map((m: any) => m.subject)))
                        .sort()
                        .map((subject: any) => {
                          const subjectMarks = filteredMarks.filter(
                            (m: any) => m.subject === subject && classStudents.find((cs) => cs.id === m.student_id)
                          );
                          const avgSubjectMarks = subjectMarks.length > 0 
                            ? Math.round(subjectMarks.reduce((s: number, m: any) => s + (m.marks || 0), 0) / subjectMarks.length)
                            : 0;
                          
                          return (
                            <div key={subject} className="p-3 bg-blue-50 rounded border border-blue-200">
                              <p className="font-semibold text-gray-800">{subject}</p>
                              <p className="text-xs text-gray-600 mt-1">Students: {subjectMarks.length}</p>
                              <p className="text-lg font-bold text-blue-600 mt-1">Avg: {avgSubjectMarks}</p>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                );
              })()}
            </Card>
          ) : selectedClass ? (
            <Card className="p-6 text-center">
              <p className="text-gray-600 text-lg">No students found in class {selectedClass}</p>
            </Card>
          ) : null}

          {/* Overall Class Statistics */}
          <Card>
            <h2 className="text-2xl font-bold mb-4">📊 Overall Class-wise Performance</h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-4 py-2 text-left text-sm font-semibold">Class</th>
                    <th className="px-4 py-2 text-center text-sm font-semibold">Total Students</th>
                    <th className="px-4 py-2 text-center text-sm font-semibold">Average Marks</th>
                    <th className="px-4 py-2 text-center text-sm font-semibold">Topper Marks</th>
                    <th className="px-4 py-2 text-center text-sm font-semibold">Lowest Marks</th>
                    <th className="px-4 py-2 text-center text-sm font-semibold">Spread</th>
                  </tr>
                </thead>
                <tbody>
                  {classAnalytics.map((cls: any, idx: number) => (
                    <tr
                      key={idx}
                      className={`border-b hover:bg-gray-50 cursor-pointer ${
                        selectedClass === cls.class ? 'bg-blue-50' : ''
                      }`}
                      onClick={() => setSelectedClass(cls.class)}
                    >
                      <td className="px-4 py-3 font-bold text-primary">{cls.class}</td>
                      <td className="px-4 py-3 text-center font-bold">{cls.totalStudents} students</td>
                      <td className="px-4 py-3 text-center">
                        <span className="px-2 py-1 bg-blue-100 text-primary rounded font-bold">{cls.avgMarks}</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="px-2 py-1 bg-green-100 text-green-700 rounded font-bold">{cls.topperMarks}</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded font-bold">{cls.lowMarks}</span>
                      </td>
                      <td className="px-4 py-3 text-center font-semibold">{cls.topperMarks - cls.lowMarks}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Chart */}
          <Card>
            <h2 className="text-xl font-bold mb-4">Average Performance by Class</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={classAnalytics}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="class" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="avgMarks" fill="#2563eb" name="Average Marks" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </div>
      )}

      {/* SUBJECT ANALYTICS TAB */}
      {activeTab === 'subject-analytics' && (
        <div className="space-y-6">
          <Card>
            <h2 className="text-2xl font-bold mb-4">📚 Subject-wise Performance Analytics</h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-4 py-2 text-left text-sm font-semibold">Subject</th>
                    <th className="px-4 py-2 text-center text-sm font-semibold">Total Students</th>
                    <th className="px-4 py-2 text-center text-sm font-semibold">Average Score</th>
                    <th className="px-4 py-2 text-center text-sm font-semibold">Passed</th>
                    <th className="px-4 py-2 text-center text-sm font-semibold">Pass Rate</th>
                    <th className="px-4 py-2 text-center text-sm font-semibold">Performance</th>
                  </tr>
                </thead>
                <tbody>
                  {subjectAnalytics.map((subject: any, idx: number) => {
                    const passRate = ((subject.pass / subject.students) * 100).toFixed(1);
                    const performanceLevel = subject.avg >= 85 ? 'Excellent' : subject.avg >= 75 ? 'Good' : 'Average';
                    const performanceColor = subject.avg >= 85 ? 'bg-green-100 text-green-700' : subject.avg >= 75 ? 'bg-blue-100 text-blue-700' : 'bg-yellow-100 text-yellow-700';
                    return (
                      <tr key={idx} className="border-b hover:bg-gray-50">
                        <td className="px-4 py-3 font-bold">{subject.name?.toUpperCase() || '-'}</td>
                        <td className="px-4 py-3 text-center">{subject.students}</td>
                        <td className="px-4 py-3 text-center">
                          <span className="px-2 py-1 bg-blue-100 text-primary rounded font-bold">{subject.avg}</span>
                        </td>
                        <td className="px-4 py-3 text-center">{subject.pass}/{subject.students}</td>
                        <td className="px-4 py-3 text-center font-semibold text-green-600">{passRate}%</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`px-3 py-1 rounded font-bold ${performanceColor}`}>{performanceLevel}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>

          <Card>
            <h2 className="text-xl font-bold mb-4">Subject Average Performance</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={subjectAnalytics}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="avg" fill="#10b981" name="Average Score" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          <Card>
            <h2 className="text-xl font-bold mb-4">Pass Rate by Subject</h2>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={subjectAnalytics}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip formatter={(value: any) => [`${((value / 120) * 100).toFixed(1)}%`, 'Pass Rate']} />
                <Line 
                  type="monotone" 
                  dataKey="pass" 
                  stroke="#f59e0b" 
                  strokeWidth={3}
                  dot={{ fill: '#f59e0b', r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </div>
      )}

      {/* CLASS STUDENTS LIST TAB */}
      {activeTab === 'class-students' && (
        <div className="space-y-6">
          <Card>
            <h2 className="text-2xl font-bold mb-4">👥 Class-wise Students List</h2>
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">Select Class:</label>
              <select
                value={selectedClass}
                onChange={(e) => handleClassChange(e.target.value)}
                className="w-full md:w-48 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value="">Choose a class...</option>
                {classesDropdown.map((cls) => (
                  <option key={cls} value={cls}>{cls}</option>
                ))}
              </select>
            </div>

            {selectedClass && classStudents.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-4 py-2 text-left text-sm font-semibold">Sr. No.</th>
                      <th className="px-4 py-2 text-left text-sm font-semibold">Register No</th>
                      <th className="px-4 py-2 text-left text-sm font-semibold">Student Name</th>
                      <th className="px-4 py-2 text-center text-sm font-semibold">Email</th>
                      <th className="px-4 py-2 text-center text-sm font-semibold">Phone</th>
                      <th className="px-4 py-2 text-center text-sm font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {classStudents.map((student: any, idx: number) => (
                      <tr key={idx} className="border-b hover:bg-blue-50 transition">
                        <td className="px-4 py-3 font-semibold text-gray-600">{idx + 1}</td>
                        <td className="px-4 py-3 font-bold text-primary">{student.register_no}</td>
                        <td className="px-4 py-3 font-semibold">{student.name}</td>
                        <td className="px-4 py-3 text-center text-sm text-gray-600">{student.email || 'N/A'}</td>
                        <td className="px-4 py-3 text-center text-sm text-gray-600">{student.phone || 'N/A'}</td>
                        <td className="px-4 py-3 text-center">
                          <select
                            value={student.status || 'Active'}
                            onChange={(e) => updateStudentStatusHandler(student.id, e.target.value)}
                            disabled={studentStatusUpdate === student.id}
                            className={`px-2 py-1 rounded-full text-xs font-semibold border cursor-pointer ${
                              student.status === 'Graduated'
                                ? 'bg-blue-100 text-blue-700 border-blue-300'
                                : student.status === 'Active'
                                ? 'bg-green-100 text-green-700 border-green-300'
                                : student.status === 'Inactive'
                                ? 'bg-yellow-100 text-yellow-700 border-yellow-300'
                                : student.status === 'Dropped'
                                ? 'bg-red-100 text-red-700 border-red-300'
                                : 'bg-gray-100 text-gray-700 border-gray-300'
                            }`}
                          >
                            <option value="Active">🟢 Active</option>
                            <option value="Graduated">🎓 Graduated</option>
                            <option value="Inactive">🟡 Inactive</option>
                            <option value="Transferred">🔄 Transferred</option>
                            <option value="Dropped">❌ Dropped</option>
                            <option value="Left">🚫 Left</option>
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm text-gray-600"><strong>Total Students:</strong> {classStudents.length}</p>
                </div>
              </div>
            )}

            {selectedClass && classStudents.length === 0 && (
              <div className="p-4 bg-yellow-50 rounded-lg border-l-4 border-yellow-500">
                <p className="text-yellow-800">No students found in class {selectedClass}</p>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* STUDENT PERFORMANCE DETAILS TAB */}
      {activeTab === 'student-performance' && (
        <div className="space-y-6">
          <Card>
            <h2 className="text-2xl font-bold mb-4">📈 Student Performance by Class & Register Number</h2>
            {(() => {
              const classExamMeta = classAnalytics.find((c: any) => c.class === selectedClass);
              const allClassExams = classExamMeta?.exams || [];
              const availableYears = allClassExams.reduce((acc: string[], exam: any) => {
                const yearValue = String(exam.year || '').trim();
                if (yearValue && !acc.includes(yearValue)) {
                  acc.push(yearValue);
                }
                return acc;
              }, []).sort((a: string, b: string) => Number(b) - Number(a));
              const examsForSelectedYear = selectedPerformanceYear
                ? allClassExams.filter((e: any) => String(e.year || '') === selectedPerformanceYear)
                : allClassExams;

              return (
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Select Class:</label>
                <select
                  value={selectedClass}
                  onChange={(e) => handleClassChange(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  <option value="">Choose a class...</option>
                  {classesDropdown.map((cls) => (
                    <option key={cls} value={cls}>{cls}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Select Student:</label>
                <select
                  value={selectedStudent}
                  onChange={(e) => setSelectedStudent(e.target.value)}
                  disabled={!selectedClass}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent disabled:bg-gray-100"
                >
                  <option value="">Choose a student...</option>
                  {classStudents.map((student: any) => (
                    <option key={student.id} value={student.register_no}>{student.name} ({student.register_no})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Select Year:</label>
                <select
                  value={selectedPerformanceYear}
                  onChange={(e) => {
                    setSelectedPerformanceYear(e.target.value);
                    setSelectedPerformanceExam('');
                  }}
                  disabled={!selectedClass || availableYears.length === 0}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent disabled:bg-gray-100"
                >
                  <option value="">Choose a year...</option>
                  {availableYears.map((year: string) => (
                    <option key={year} value={year}>{year}-{Number(year) + 1}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Select Exam:</label>
                <select
                  value={selectedPerformanceExam}
                  onChange={(e) => setSelectedPerformanceExam(e.target.value)}
                  disabled={!selectedClass || !selectedPerformanceYear}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent disabled:bg-gray-100"
                >
                  <option value="">Choose an exam...</option>
                  {examsForSelectedYear.map((exam: any) => (
                    <option key={exam.id} value={exam.id}>
                      {exam.exam_name}{exam.exam_number ? `-${exam.exam_number}` : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-end gap-2">
                <Button onClick={handleStudentPerformanceSearch} className="flex-1 bg-primary hover:bg-primary-dark">
                  View Performance
                </Button>
                <Button 
                  onClick={() => {
                    loadDashboardData();
                  }} 
                  className="bg-secondary hover:bg-secondary-dark"
                >
                  <RefreshCw size={18} />
                </Button>
              </div>
            </div>
              );
            })()}

            {searchedStudent && (
              <div className="space-y-4">
                <div className="p-4 bg-blue-50 rounded-lg border-l-4 border-blue-500">
                  <h3 className="font-bold text-lg">{searchedStudent.name}</h3>
                  <p className="text-sm text-gray-600">Register No: {searchedStudent.register_no} | Class: {searchedStudent.class}</p>
                  <p className="text-sm text-gray-600 mt-1">Year: {selectedPerformanceYear}-{Number(selectedPerformanceYear) + 1}</p>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="px-4 py-2 text-left text-sm font-semibold">Subject</th>
                        <th className="px-4 py-2 text-center text-sm font-semibold">Marks Obtained</th>
                        <th className="px-4 py-2 text-center text-sm font-semibold">Total Marks</th>
                        <th className="px-4 py-2 text-center text-sm font-semibold">Percentage</th>
                        <th className="px-4 py-2 text-center text-sm font-semibold">Grade</th>
                      </tr>
                    </thead>
                    <tbody>
                      {studentMarks.length > 0 ? (
                        studentMarks.map((mark: any, idx: number) => {
                          const percentage = (mark.marks / mark.total) * 100;
                          const grade = percentage >= 90 ? 'A+' : percentage >= 80 ? 'A' : percentage >= 70 ? 'B' : percentage >= 60 ? 'C' : 'D';
                          return (
                            <tr key={idx} className="border-b hover:bg-gray-50">
                              <td className="px-4 py-3 font-medium">{mark.subject}</td>
                              <td className="px-4 py-3 text-center">{mark.marks}</td>
                              <td className="px-4 py-3 text-center">{mark.total}</td>
                              <td className="px-4 py-3 text-center font-semibold text-blue-600">{percentage.toFixed(1)}%</td>
                              <td className="px-4 py-3 text-center">
                                <span className={`px-2 py-1 rounded font-bold text-white ${
                                  grade === 'A+' ? 'bg-green-600' : grade === 'A' ? 'bg-green-500' : grade === 'B' ? 'bg-blue-500' : 'bg-orange-500'
                                }`}>{grade}</span>
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan={5} className="px-4 py-3 text-center text-gray-500">No marks available for this student</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {studentMarks.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card>
                      <p className="text-gray-600 text-sm">Total Marks Obtained</p>
                      <p className="text-2xl font-bold text-primary mt-1">{studentMarks.reduce((sum: number, m: any) => sum + m.marks, 0)}</p>
                    </Card>
                    <Card>
                      <p className="text-gray-600 text-sm">Total Marks</p>
                      <p className="text-2xl font-bold text-secondary mt-1">{studentMarks.reduce((sum: number, m: any) => sum + m.total, 0)}</p>
                    </Card>
                    <Card>
                      <p className="text-gray-600 text-sm">Average Percentage</p>
                      <p className="text-2xl font-bold text-accent mt-1">{(studentMarks.reduce((sum: number, m: any) => sum + (m.marks / m.total) * 100, 0) / studentMarks.length).toFixed(1)}%</p>
                    </Card>
                    <Card>
                      <p className="text-gray-600 text-sm">Best Score</p>
                      <p className="text-2xl font-bold text-green-600 mt-1">{Math.max(...studentMarks.map((m: any) => m.marks))}</p>
                    </Card>
                  </div>
                )}
              </div>
            )}
          </Card>
        </div>
      )}

      {/* TOPPERS TAB */}
      {activeTab === 'toppers' && (
        <div className="space-y-6">
          <Card>
            <h2 className="text-2xl font-bold mb-4">🏆 Top Performing Students</h2>
            {toppers.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {toppers.map((topper: any, idx: number) => (
                  <div key={idx} className={`p-4 rounded-lg border-l-4 ${idx === 0 ? 'bg-yellow-50 border-yellow-500' : idx === 1 ? 'bg-gray-50 border-gray-500' : idx === 2 ? 'bg-orange-50 border-orange-500' : 'bg-blue-50 border-blue-500'}`}>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-bold text-lg">{idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : '⭐'} {topper.name}</h3>
                      <span className="text-2xl font-bold text-primary">{topper.averageMarks}%</span>
                    </div>
                    <p className="text-sm text-gray-600">Register No: {topper.register_no}</p>
                    <p className="text-sm text-gray-600">Class: {topper.class}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-gray-600">No student data available yet</p>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* CLASSES TAB */}
      {activeTab === 'classes' && (
        <ClassManagementTab />
      )}

      {/* EXAMS TAB */}
      {activeTab === 'exams' && (
        <ExamManagementTab />
      )}

      {/* ATTENDANCE TAB */}
      {activeTab === 'attendance' && (
        <div className="space-y-6">
          <Card>
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">📋 Attendance Management</h2>
                <p className="text-gray-600 mt-1">Monitor and manage student attendance records</p>
              </div>
              <Button 
                onClick={async () => {
                  const result = await attendanceService.getAttendanceByDate(selectedAttendanceDate);
                  let records = result.data || [];
                  
                  // Enrich attendance records with student details
                  const enrichedRecords = records.map((record: any) => {
                    const student = allStudents.find((s: any) => s.id === record.student_id);
                    return {
                      ...record,
                      student_name: student?.name || 'Unknown',
                      register_no: student?.register_no || 'N/A',
                      class: student?.class || 'N/A',
                    };
                  });
                  
                  // Filter by class if a specific class is selected
                  if (selectedAttendanceClass !== 'all') {
                    records = enrichedRecords.filter((r: any) => r.class === selectedAttendanceClass);
                  } else {
                    records = enrichedRecords;
                  }
                  
                  setAttendanceRecords(records);
                }}
                className="bg-blue-500 hover:bg-blue-600"
              >
                Load Records
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Select Date</label>
                <input
                  type="date"
                  value={selectedAttendanceDate}
                  onChange={(e) => setSelectedAttendanceDate(e.target.value)}
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Select Class</label>
                <select
                  value={selectedAttendanceClass}
                  onChange={(e) => setSelectedAttendanceClass(e.target.value)}
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                >
                  <option value="all">📊 All Classes</option>
                  {allClassesForAttendance.map((cls) => (
                    <option key={cls} value={cls}>
                      {cls}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Attendance Summary */}
            {attendanceRecords.length > 0 && (
              <>
                {/* Filter Info */}
                <div className="mb-4 p-3 bg-blue-50 border-l-4 border-blue-500 rounded">
                  <p className="text-sm text-blue-700">
                    <strong>Viewing:</strong> Date: {selectedAttendanceDate} | Class: {selectedAttendanceClass === 'all' ? 'All Classes' : selectedAttendanceClass}
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                  <Card className="bg-green-50 border-l-4 border-green-500">
                    <p className="text-sm text-gray-600">Total Present</p>
                    <p className="text-3xl font-bold text-green-600">{attendanceRecords.filter((r: any) => r.status === 'present').length}</p>
                  </Card>
                  <Card className="bg-red-50 border-l-4 border-red-500">
                    <p className="text-sm text-gray-600">Total Absent</p>
                    <p className="text-3xl font-bold text-red-600">{attendanceRecords.filter((r: any) => r.status === 'absent').length}</p>
                  </Card>
                  <Card className="bg-yellow-50 border-l-4 border-yellow-500">
                    <p className="text-sm text-gray-600">Total Leave</p>
                    <p className="text-3xl font-bold text-yellow-600">{attendanceRecords.filter((r: any) => r.status === 'leave').length}</p>
                  </Card>
                  <Card className="bg-blue-50 border-l-4 border-blue-500">
                    <p className="text-sm text-gray-600">Total Records</p>
                    <p className="text-3xl font-bold text-blue-600">{attendanceRecords.length}</p>
                  </Card>
                </div>

                {/* Attendance Records Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="px-4 py-2 text-left font-semibold">Register No</th>
                        <th className="px-4 py-2 text-left font-semibold">Student Name</th>
                        <th className="px-4 py-2 text-center font-semibold">Class</th>
                        <th className="px-4 py-2 text-center font-semibold">Date</th>
                        <th className="px-4 py-2 text-center font-semibold">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {attendanceRecords.map((record: any, idx: number) => (
                        <tr key={idx} className="border-b hover:bg-gray-50 transition">
                          <td className="px-4 py-2 font-semibold">{record.register_no || 'N/A'}</td>
                          <td className="px-4 py-2">{record.student_name || 'N/A'}</td>
                          <td className="px-4 py-2 text-center">{record.class || 'N/A'}</td>
                          <td className="px-4 py-2 text-center">{record.date || 'N/A'}</td>
                          <td className="px-4 py-2 text-center">
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                              record.status === 'present'
                                ? 'bg-green-100 text-green-700'
                                : record.status === 'absent'
                                ? 'bg-red-100 text-red-700'
                                : 'bg-yellow-100 text-yellow-700'
                            }`}>
                              {record.status?.charAt(0).toUpperCase() + record.status?.slice(1) || 'Unknown'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {attendanceRecords.length === 0 && selectedAttendanceDate && (
              <div className="p-4 bg-gray-50 border-l-4 border-gray-300 rounded-lg">
                <p className="text-gray-700">No attendance records found for {selectedAttendanceDate} {selectedAttendanceClass !== 'all' ? `in class ${selectedAttendanceClass}` : 'in all classes'}. Try selecting a different date or class.</p>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* USERS TAB */}
      {activeTab === 'users' && (
        <UsersManagementTab />
      )}

      {/* ADD ADMIN TAB */}
      {activeTab === 'add-admin' && (
        <AddAdminTab />
      )}

      {/* ADD TEACHER TAB */}
      {activeTab === 'add-teacher' && (
        <AddTeacherTab />
      )}

      {/* ASSIGN CLASS TEACHER TAB */}
      {activeTab === 'assign-class-teacher' && (
        <AssignClassTeachersTab />
      )}

      {/* ASSIGN CLASSES TAB */}
      {activeTab === 'assign-classes' && (
        <AssignClassesTab />
      )}

      {activeTab === 'low-performers' && (
        <div className="space-y-6">
          <Card>
            <h2 className="text-2xl font-bold mb-4">⚠️ Students Needing Support</h2>
            <p className="text-gray-600 mb-4">These students scored below 60% average and may need additional support.</p>
            {lowPerformers.length > 0 ? (
              <div className="space-y-3">
                {lowPerformers.map((student: any, idx: number) => (
                  <div key={idx} className="p-4 bg-orange-50 border-l-4 border-orange-500 rounded-lg hover:bg-orange-100 transition">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-bold text-lg">{idx + 1}. {student.name}</h3>
                      <span className={`text-2xl font-bold ${student.averageMarks < 40 ? 'text-red-600' : student.averageMarks < 50 ? 'text-orange-600' : 'text-yellow-600'}`}>
                        {student.averageMarks}%
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-sm">
                      <p className="text-gray-600">Register: {student.register_no}</p>
                      <p className="text-gray-600">Class: {student.class}</p>
                      <p className="text-gray-600">Status: {student.averageMarks < 40 ? '🔴 Critical' : student.averageMarks < 50 ? '🟠 Needs Help' : '🟡 At Risk'}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 bg-green-50 border-l-4 border-green-500 rounded-lg">
                <p className="text-green-700">✓ Great! No students are struggling. All students are performing well!</p>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* STUDENT REGISTRATION TAB */}
      {activeTab === 'student-registration' && (
        <StudentRegistrationTab />
      )}

      {/* STUDENT HISTORY TAB */}
      {activeTab === 'student-history' && (
        <StudentHistoryPage />
      )}

      {/* FEE TRACKING TAB */}
      {activeTab === 'fee-tracking' && (
        <div className="space-y-6">
          <Card>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-3xl font-bold">💳 Fee Tracking & Management</h2>
                <p className="text-gray-600 mt-2">Monitor fee collection across all classes with academic year filtering and balance tracking.</p>
              </div>
              <button
                onClick={() => {
                  if (selectedFeeClass) loadClassFees(selectedFeeClass);
                }}
                className="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
                title="Refresh data"
              >
                <RefreshCw size={20} />
              </button>
            </div>

            {/* Filter Controls */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">📚 Select Class</label>
                <select
                  value={selectedFeeClass}
                  onChange={(e) => {
                    setSelectedFeeClass(e.target.value);
                    if (e.target.value) {
                      loadClassFees(e.target.value);
                    }
                  }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select a class...</option>
                  {classesDropdown.map((cls) => (
                    <option key={cls} value={cls}>{cls}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">📅 Academic Year</label>
                <div className="flex gap-2">
                  {[2024, 2025, 2026].map((year) => (
                    <button
                      key={year}
                      onClick={() => setSelectedFeeYear(year)}
                      className={`flex-1 px-4 py-2 rounded-lg font-semibold transition ${
                        selectedFeeYear === year
                          ? 'bg-blue-600 text-white'
                          : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {year}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Two-column layout */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left: Class-wise Fee Collection */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold">📋 Fee Records</h3>
                  <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full">
                    Year: {selectedFeeYear}
                  </span>
                </div>

                {!selectedFeeClass ? (
                  <div className="p-8 bg-gray-50 rounded-lg text-center text-gray-500">
                    <p className="text-base">👈 Please select a class to view fees</p>
                  </div>
                ) : feeLoadingClasses.includes(selectedFeeClass) ? (
                  <div className="text-center py-8">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-2"></div>
                    <p className="text-gray-500">Loading fees for {selectedFeeClass}...</p>
                  </div>
                ) : classwiseFees.length > 0 ? (
                  <div className="border border-gray-300 rounded-lg overflow-x-auto">
                    <table className="w-full text-xs md:text-sm">
                      <thead className="bg-gradient-to-r from-purple-50 to-purple-100 sticky top-0">
                        <tr>
                          <th className="px-3 py-3 text-left font-semibold text-purple-900 whitespace-nowrap">Reg No</th>
                          <th className="px-3 py-3 text-left font-semibold text-purple-900 whitespace-nowrap">Student</th>
                          <th className="px-3 py-3 text-center font-semibold text-purple-900 whitespace-nowrap">Month</th>
                          <th className="px-3 py-3 text-center font-semibold text-purple-900 whitespace-nowrap">💰 Total</th>
                          <th className="px-3 py-3 text-center font-semibold text-purple-900 whitespace-nowrap">✓ Paid</th>
                          <th className="px-3 py-3 text-center font-semibold text-purple-900 whitespace-nowrap">⏳ Pending</th>
                          <th className="px-3 py-3 text-center font-semibold text-purple-900 whitespace-nowrap">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {classwiseFees.map((student: any, idx: number) => {
                          const yearFees = (student.fees || []).filter((f: any) => f.year === selectedFeeYear);

                          return yearFees.length > 0 ? (
                            yearFees.map((fee: any, fIdx: number) => (
                              <tr key={`${idx}-${fIdx}`} className="border-b hover:bg-purple-50 transition">
                                {fIdx === 0 && (
                                  <>
                                    <td rowSpan={yearFees.length} className="px-3 py-2 font-semibold text-purple-600 align-middle text-xs md:text-sm">
                                      {student.register_no}
                                    </td>
                                    <td rowSpan={yearFees.length} className="px-3 py-2 align-middle text-xs md:text-sm">
                                      {student.name}
                                    </td>
                                  </>
                                )}
                                <td className="px-3 py-2 text-center whitespace-nowrap text-xs md:text-sm">
                                  {fee.month === 'Registration' ? 'Reg' : fee.month}
                                </td>
                                <td className="px-3 py-2 text-center font-bold text-blue-600 whitespace-nowrap text-xs md:text-sm">
                                  ₹{fee.total_amount || 0}
                                </td>
                                <td className="px-3 py-2 text-center font-bold text-green-600 whitespace-nowrap text-xs md:text-sm">
                                  ₹{fee.paid_amount || 0}
                                </td>
                                <td className="px-3 py-2 text-center font-bold text-red-600 whitespace-nowrap text-xs md:text-sm">
                                  ₹{fee.balance || 0}
                                </td>
                                <td className="px-3 py-2 text-center whitespace-nowrap">
                                  <span className={`px-2 py-1 rounded text-xs font-bold inline-block ${
                                    fee.status === 'paid' ? 'bg-green-100 text-green-700' :
                                    fee.status === 'partial' ? 'bg-yellow-100 text-yellow-700' :
                                    'bg-red-100 text-red-700'
                                  }`}>
                                    {fee.status?.toUpperCase() || 'PENDING'}
                                  </span>
                                </td>
                              </tr>
                            ))
                          ) : null;
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-8 bg-gray-50 rounded-lg text-center text-gray-500">
                    <p>No fee records for {selectedFeeClass} in {selectedFeeYear}</p>
                  </div>
                )}

                {/* Balance Before Year */}
                {selectedFeeClass && classwiseFees.length > 0 && (
                  <div className="p-4 bg-amber-50 border border-amber-300 rounded-lg">
                    <h4 className="text-sm font-bold text-amber-900 mb-3">💳 Balance Before {selectedFeeYear}</h4>
                    <div className="space-y-2">
                      {classwiseFees
                        .filter((s: any) => {
                          const beforeYearBalance = (s.fees || [])
                            .filter((f: any) => f.year < selectedFeeYear)
                            .reduce((sum: number, f: any) => sum + (f.balance || 0), 0);
                          return beforeYearBalance > 0;
                        })
                        .map((student: any, idx: number) => {
                          const beforeYearBalance = (student.fees || [])
                            .filter((f: any) => f.year < selectedFeeYear)
                            .reduce((sum: number, f: any) => sum + (f.balance || 0), 0);
                          return (
                            <div key={idx} className="flex justify-between items-center p-2 bg-white rounded border border-amber-200">
                              <span className="text-sm font-medium text-gray-700">
                                {student.register_no} - {student.name}
                              </span>
                              <span className="font-bold text-amber-700">₹{beforeYearBalance}</span>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                )}
              </div>

              {/* Right: Fee Update Audit Trail */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold">📝 Fee Update Audit Trail</h3>
                  <button
                    onClick={loadFeeUpdates}
                    className="p-2 hover:bg-gray-100 rounded-lg transition"
                    title="Refresh"
                  >
                    <RefreshCw size={16} />
                  </button>
                </div>

                {loadingFeeUpdates ? (
                  <div className="text-center py-8">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-2"></div>
                    <p className="text-gray-500">Loading fee updates...</p>
                  </div>
                ) : feeUpdates.length > 0 ? (
                  <div className="max-h-96 overflow-y-auto border border-gray-300 rounded-lg">
                    <div className="space-y-2 p-4">
                      {feeUpdates.slice(0, 20).map((update: any, idx: number) => (
                        <div key={idx} className="border-l-4 border-blue-500 bg-blue-50 p-3 rounded">
                          <div className="flex justify-between items-start mb-2">
                            <span className="font-semibold text-sm">Update {feeUpdates.length - idx}</span>
                            <span className="text-xs text-gray-500">
                              {new Date(update.updated_at).toLocaleDateString()} {new Date(update.updated_at).toLocaleTimeString()}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-xs text-gray-700">
                            <div><strong>Status:</strong> {update.old_status?.toUpperCase() || 'PENDING'} → {update.new_status?.toUpperCase()}</div>
                            <div><strong>Role:</strong> {update.updated_by_role}</div>
                            {update.notes && <div className="col-span-2"><strong>Notes:</strong> {update.notes}</div>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="p-4 bg-gray-50 rounded-lg text-center text-gray-500">
                    No fee updates yet. Click refresh to load.
                  </div>
                )}
              </div>
            </div>
          </Card>

          {/* Fee Status Summary */}
          <Card>
            <h3 className="text-lg font-bold mb-4">📊 Fee Status Summary</h3>
            {feeUpdates.length > 0 ? (
              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 bg-red-50 rounded-lg text-center">
                  <div className="text-2xl font-bold text-red-600">
                    {feeUpdates.filter(u => u.new_status === 'pending').length}
                  </div>
                  <p className="text-gray-600 text-sm">Pending</p>
                </div>
                <div className="p-4 bg-yellow-50 rounded-lg text-center">
                  <div className="text-2xl font-bold text-yellow-600">
                    {feeUpdates.filter(u => u.new_status === 'partial').length}
                  </div>
                  <p className="text-gray-600 text-sm">Partial</p>
                </div>
                <div className="p-4 bg-green-50 rounded-lg text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {feeUpdates.filter(u => u.new_status === 'paid').length}
                  </div>
                  <p className="text-gray-600 text-sm">Paid</p>
                </div>
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">No data available</p>
            )}
          </Card>
        </div>
      )}

      {/* Change Password Modal */}
      <ChangePasswordModal 
        isOpen={showChangePassword} 
        onClose={() => setShowChangePassword(false)} 
      />
    </div>
  );
};
