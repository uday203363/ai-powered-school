import React, { useState, useEffect } from 'react';
import { Card, Button, ChangePasswordModal } from '../../components/common';
import { useAuth } from '../../contexts/AuthContext';
import { marksService, attendanceService, feeService, teacherService } from '../../services';
import { normalizeObject } from '../../utils/normalize';
import { BookOpen, CheckCircle, FileText, Lock, AlertCircle, User, Phone, Mail, Briefcase } from 'lucide-react';

export const StudentDashboard: React.FC = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalMarks: 0,
    avgMarks: 0,
    attendanceRate: 0,
    feesPending: 0,
  });
  const [studentMarks, setStudentMarks] = useState<any[]>([]);
  const [classTeacher, setClassTeacher] = useState<any>(null);
  const [loadingTeacher, setLoadingTeacher] = useState(true);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [showMyInfo, setShowMyInfo] = useState(false);

  // Check if student is active
  if (user?.role === 'student' && user?.status && user.status !== 'Active') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <Card className="max-w-md w-full text-center">
          <div className="flex justify-center mb-4">
            <div className="p-4 bg-red-100 rounded-full">
              <AlertCircle className="text-red-600" size={32} />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Account Inactive</h2>
          <p className="text-gray-600 mb-4">
            Your account status is <strong>{user.status}</strong>. 
            You cannot access the student dashboard at this time.
          </p>
          <p className="text-gray-500 text-sm">
            Please contact the school administration for more information.
          </p>
        </Card>
      </div>
    );
  }

  useEffect(() => {
    loadDashboardData();
    loadClassTeacherInfo();
  }, [user]);

  const loadDashboardData = async () => {
    try {
      if (!user?.id) return;

      const marksResult = await marksService.getMarksByStudent(user.id);
      const attendanceResult = await attendanceService.getAttendanceStats(user.id);
      const feesResult = await feeService.getFeesByStudent(user.id);

      const normalizedMarks = (marksResult.data || []).map((mark: any) => normalizeObject(mark));
      setStudentMarks(normalizedMarks);

      let avgMarks = 0;
      if (normalizedMarks.length > 0) {
        const total = normalizedMarks.reduce((sum: number, mark: any) => sum + mark.marks, 0);
        avgMarks = Math.round(total / normalizedMarks.length);
      }

      let attendanceRate = 0;
      if (attendanceResult.stats && Object.keys(attendanceResult.stats).length > 0) {
        const stats = attendanceResult.stats;
        const total = (stats.present || 0) + (stats.absent || 0) + (stats.leave || 0);
        attendanceRate = total > 0 ? Math.round(((stats.present || 0) / total) * 100) : 0;
      }

      setStats({
        totalMarks: normalizedMarks.length,
        avgMarks,
        attendanceRate,
        feesPending: feesResult.data?.filter((f: any) => f.status !== 'paid').length || 0,
      });
    } catch (error) {
      console.error('Error loading dashboard:', error);
    }
  };

  const loadClassTeacherInfo = async () => {
    setLoadingTeacher(true);
    try {
      if (!user?.class) {
        setLoadingTeacher(false);
        return;
      }

      const result = await teacherService.getClassTeacher(user.class);
      if (result.success && result.data) {
        const normalized = normalizeObject(result.data);
        setClassTeacher(normalized);
      }
    } catch (error) {
      console.error('Error loading class teacher info:', error);
    } finally {
      setLoadingTeacher(false);
    }
  };

  const groupedMarks = studentMarks.reduce((groups: { [exam: string]: any[] }, mark) => {
    const examName = (mark.exam_name || 'UNSPECIFIED EXAM').toUpperCase();
    if (!groups[examName]) {
      groups[examName] = [];
    }
    groups[examName].push(mark);
    return groups;
  }, {});

  const examEntries = Object.entries(groupedMarks).sort(([a], [b]) => a.localeCompare(b));

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Student Dashboard</h1>
          <p className="text-gray-600 mt-1">Welcome back, {user?.name}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => setShowMyInfo((prev) => !prev)}
            className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700"
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
        <Card className="border-2 border-blue-100 bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="p-4 rounded-2xl bg-blue-600 text-white shadow-lg">
                <User size={28} />
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-blue-600 font-bold">My Info</p>
                <h2 className="text-2xl font-bold text-gray-900">{user?.name}</h2>
                <p className="text-sm text-gray-600 mt-1">
                  Class: <strong>{user?.class || 'Not Assigned'}</strong> · Role: <strong>{user?.role?.toUpperCase()}</strong>
                </p>
              </div>
            </div>
            <button onClick={() => setShowMyInfo(false)} className="text-gray-500 hover:text-gray-800 font-semibold">
              Close
            </button>
          </div>
        </Card>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="flex items-center space-x-4">
          <div className="p-3 bg-blue-100 rounded-lg">
            <BookOpen className="text-primary" size={24} />
          </div>
          <div>
            <p className="text-gray-600 text-sm">Total Marks</p>
            <p className="text-3xl font-bold text-gray-900">{stats.totalMarks}</p>
          </div>
        </Card>

        <Card className="flex items-center space-x-4">
          <div className="p-3 bg-green-100 rounded-lg">
            <CheckCircle className="text-secondary" size={24} />
          </div>
          <div>
            <p className="text-gray-600 text-sm">Average</p>
            <p className="text-3xl font-bold text-gray-900">{stats.avgMarks}%</p>
          </div>
        </Card>

        <Card className="flex items-center space-x-4">
          <div className="p-3 bg-yellow-100 rounded-lg">
            <CheckCircle className="text-accent" size={24} />
          </div>
          <div>
            <p className="text-gray-600 text-sm">Attendance</p>
            <p className="text-3xl font-bold text-gray-900">{stats.attendanceRate}%</p>
          </div>
        </Card>

        <Card className="flex items-center space-x-4">
          <div className="p-3 bg-red-100 rounded-lg">
            <FileText className="text-danger" size={24} />
          </div>
          <div>
            <p className="text-gray-600 text-sm">Fees Pending</p>
            <p className="text-3xl font-bold text-gray-900">{stats.feesPending}</p>
          </div>
        </Card>
      </div>

      {/* Exam-wise Marks */}
      <Card className="border-2 border-blue-100 bg-gradient-to-br from-white to-blue-50">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Exam-wise Marks</h2>
            <p className="text-sm text-gray-600 mt-1">Quick view of each exam and the subject marks inside it</p>
          </div>
          <div className="px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-sm font-semibold">
            {studentMarks.length} records
          </div>
        </div>

        {examEntries.length > 0 ? (
          <div className="space-y-4">
            {examEntries.map(([examName, examMarks]) => {
              const examAverage = Math.round(
                examMarks.reduce((sum: number, mark: any) => sum + ((mark.marks / mark.total) * 100), 0) / examMarks.length
              );

              return (
                <div key={examName} className="rounded-xl border border-blue-100 bg-white shadow-sm overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 bg-blue-600 text-white">
                    <div>
                      <h3 className="text-lg font-bold">{examName}</h3>
                      <p className="text-blue-100 text-sm">{examMarks.length} subject marks</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs uppercase tracking-wide text-blue-100">Average</p>
                      <p className="text-xl font-bold">{examAverage}%</p>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-blue-50">
                        <tr>
                          <th className="px-4 py-3 text-left font-semibold text-gray-700">Subject</th>
                          <th className="px-4 py-3 text-center font-semibold text-gray-700">Marks</th>
                          <th className="px-4 py-3 text-center font-semibold text-gray-700">Total</th>
                          <th className="px-4 py-3 text-center font-semibold text-gray-700">Percentage</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {examMarks.map((mark: any) => {
                          const percentage = Math.round((mark.marks / mark.total) * 1000) / 10;
                          return (
                            <tr key={`${examName}-${mark.subject}-${mark.id || mark.created_at}`} className="hover:bg-blue-50/50 transition">
                              <td className="px-4 py-3 font-semibold text-gray-900">{mark.subject}</td>
                              <td className="px-4 py-3 text-center font-bold text-primary">{mark.marks}</td>
                              <td className="px-4 py-3 text-center text-gray-700">{mark.total}</td>
                              <td className="px-4 py-3 text-center">
                                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${
                                  percentage >= 80 ? 'bg-green-100 text-green-700' : percentage >= 60 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'
                                }`}>
                                  {percentage}%
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-10 text-gray-500 bg-white rounded-xl border border-dashed border-gray-300">
            No marks available yet
          </div>
        )}
      </Card>

      {/* Class Teacher Information */}
      {loadingTeacher ? (
        <Card className="animate-pulse">
          <div className="h-32 bg-gray-200 rounded"></div>
        </Card>
      ) : classTeacher ? (
        <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-l-4 border-blue-500">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h2 className="text-xl font-bold text-gray-900 mb-4">👨‍🏫 Your Class Teacher</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-blue-200 rounded-full">
                    <User size={20} className="text-blue-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 font-medium">Name</p>
                    <p className="text-lg font-bold text-gray-900">{classTeacher.name}</p>
                  </div>
                </div>

                {classTeacher.email && (
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-blue-200 rounded-full">
                      <Mail size={20} className="text-blue-600" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 font-medium">Email</p>
                      <p className="text-lg font-bold text-gray-900 break-all">{classTeacher.email}</p>
                    </div>
                  </div>
                )}

                {classTeacher.phone && (
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-blue-200 rounded-full">
                      <Phone size={20} className="text-blue-600" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 font-medium">Phone</p>
                      <p className="text-lg font-bold text-gray-900">{classTeacher.phone}</p>
                    </div>
                  </div>
                )}

                {classTeacher.subjects && (
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-blue-200 rounded-full">
                      <Briefcase size={20} className="text-blue-600" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 font-medium">Subjects</p>
                      <p className="text-lg font-bold text-gray-900">{classTeacher.subjects}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="hidden md:block text-6xl opacity-20">👨‍🏫</div>
          </div>
        </Card>
      ) : null}

      {/* Quick Actions */}
      <Card>
        <h2 className="text-xl font-bold mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <a href="/student/marks" className="p-4 bg-blue-50 hover:bg-blue-100 rounded-lg text-center font-semibold text-primary transition-colors">
            My Marks
          </a>
          <a href="/student/attendance" className="p-4 bg-green-50 hover:bg-green-100 rounded-lg text-center font-semibold text-secondary transition-colors">
            Attendance
          </a>
          <a href="/student/fees" className="p-4 bg-yellow-50 hover:bg-yellow-100 rounded-lg text-center font-semibold text-accent transition-colors">
            Fees
          </a>
          <a href="/ai-assistant" className="p-4 bg-purple-50 hover:bg-purple-100 rounded-lg text-center font-semibold text-purple-600 transition-colors">
            AI Assistant
          </a>
        </div>
      </Card>

      {/* Change Password Modal */}
      <ChangePasswordModal 
        isOpen={showChangePassword} 
        onClose={() => setShowChangePassword(false)} 
      />
    </div>
  );
};
