import React, { useState, useEffect } from 'react';
import { Card, Button, Input } from '../../components/common';
import { studentService, studentHistoryService, teacherService } from '../../services';
import { useAuth } from '../../contexts/AuthContext';
import { normalizeString } from '../../utils/normalize';
import { Search, History } from 'lucide-react';

export const TeacherStudentHistoryPage: React.FC = () => {
  const { user } = useAuth();
  const [classStudents, setClassStudents] = useState<any[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [historyData, setHistoryData] = useState<any>(null);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'marks' | 'attendance' | 'summary'>('summary');
  const [resolvedClassTeacherFor, setResolvedClassTeacherFor] = useState('');

  const parseNormalizedList = (value?: string): string[] => {
    if (!value) return [];
    return value
      .split(',')
      .map((entry: string) => normalizeString(entry.trim()))
      .filter((entry: string) => entry.length > 0);
  };

  const effectiveClassTeacherFor = user?.class_teacher_for || resolvedClassTeacherFor;
  const historyClass = parseNormalizedList(effectiveClassTeacherFor)[0] || normalizeString(user?.class || '');

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

        const currentTeacher = (teachersResult.data || []).find((teacher: any) => teacher.id === user.id);
        const fallbackClassTeacherFor = currentTeacher?.class_teacher_for || currentTeacher?.class_teacher_of || '';
        if (fallbackClassTeacherFor) {
          setResolvedClassTeacherFor(String(fallbackClassTeacherFor));
        }
      } catch (error) {
        console.error('Error resolving class teacher assignment for history tab:', error);
      }
    };

    resolveClassTeacherAssignment();
  }, [user?.id, user?.class_teacher_for]);

  useEffect(() => {
    loadClassStudents();
  }, [historyClass]);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredStudents(classStudents);
    } else {
      const filtered = classStudents.filter((student: any) =>
        String(student.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        String(student.register_no || '').toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredStudents(filtered);
    }
  }, [searchQuery, classStudents]);

  const loadClassStudents = async () => {
    setLoading(true);
    if (historyClass) {
      // Load all students from the class (including inactive ones)
      const { data: allStudents } = await studentService.getAllStudents();
      const studentsInClass = (allStudents || []).filter((s: any) => normalizeString(s.class || '') === historyClass);
      setClassStudents(studentsInClass);
      setFilteredStudents(studentsInClass);
    } else {
      setClassStudents([]);
      setFilteredStudents([]);
    }
    setLoading(false);
  };

  const handleViewHistory = async (student: any) => {
    setLoading(true);
    const result = await studentHistoryService.getStudentCompleteHistory(student.id);
    if (result.success) {
      setHistoryData(result.data);
      setSelectedStudent(student);
      setShowHistoryModal(true);
      setActiveTab('summary');
    } else {
      alert('Failed to load student history');
    }
    setLoading(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active':
        return 'bg-green-100 text-green-800';
      case 'Deactivated':
      case 'Inactive':
        return 'bg-red-100 text-red-800';
      case 'Transferred':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-blue-100 text-blue-800';
    }
  };

  const getGradeColor = (average: number) => {
    if (average >= 80) return 'bg-green-100 text-green-800';
    if (average >= 60) return 'bg-blue-100 text-blue-800';
    if (average >= 40) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  const renderMarksTab = () => {
    if (!historyData?.marks || historyData.marks.length === 0) {
      return <p className="text-gray-500 text-center py-4">No marks records available.</p>;
    }

    const marksBySubject: { [key: string]: any[] } = {};
    historyData.marks.forEach((mark: any) => {
      if (!marksBySubject[mark.subject]) {
        marksBySubject[mark.subject] = [];
      }
      marksBySubject[mark.subject].push(mark);
    });

    return (
      <div className="space-y-4">
        {Object.entries(marksBySubject).map(([subject, marks]) => {
          const avgPercentage = marks.reduce((sum, m) => sum + (m.marks / m.total) * 100, 0) / marks.length;
          return (
            <div key={subject} className="bg-gray-50 p-4 rounded-lg border">
              <div className="flex justify-between items-center mb-2">
                <h4 className="font-semibold text-gray-900">{subject}</h4>
                <span className={`px-2 py-1 text-xs font-semibold rounded ${getGradeColor(avgPercentage)}`}>
                  {avgPercentage >= 80 ? 'A' : avgPercentage >= 60 ? 'B' : avgPercentage >= 40 ? 'C' : 'D'}
                </span>
              </div>
              <div className="space-y-1 text-sm">
                {marks.map((mark: any, idx: number) => (
                  <div key={idx} className="flex justify-between text-gray-700">
                    <span>{mark.exam_name || 'General'}</span>
                    <span className="font-semibold">{mark.marks}/{mark.total} ({((mark.marks/mark.total)*100).toFixed(1)}%)</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderAttendanceTab = () => {
    if (!historyData?.attendance || historyData.attendance.length === 0) {
      return <p className="text-gray-500 text-center py-4">No attendance records available.</p>;
    }

    const stats = {
      present: historyData.attendance.filter((a: any) => a.status === 'present').length,
      absent: historyData.attendance.filter((a: any) => a.status === 'absent').length,
      leave: historyData.attendance.filter((a: any) => a.status === 'leave').length,
    };

    const attendancePercentage = ((stats.present / historyData.attendance.length) * 100).toFixed(1);

    return (
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-green-50 p-3 rounded border border-green-200">
            <p className="text-green-600 text-xs font-semibold">Present</p>
            <p className="text-xl font-bold text-green-700">{stats.present}</p>
          </div>
          <div className="bg-red-50 p-3 rounded border border-red-200">
            <p className="text-red-600 text-xs font-semibold">Absent</p>
            <p className="text-xl font-bold text-red-700">{stats.absent}</p>
          </div>
          <div className="bg-yellow-50 p-3 rounded border border-yellow-200">
            <p className="text-yellow-600 text-xs font-semibold">Leave</p>
            <p className="text-xl font-bold text-yellow-700">{stats.leave}</p>
          </div>
        </div>
        <div className="bg-blue-50 p-3 rounded border border-blue-200">
          <p className="text-blue-600 text-xs font-semibold">Attendance %</p>
          <p className="text-2xl font-bold text-blue-700">{attendancePercentage}%</p>
        </div>
      </div>
    );
  };

  const renderSummaryTab = () => {
    if (!historyData) return null;

    const stats = historyData.statistics;

    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-blue-50 p-3 rounded border border-blue-200">
            <p className="text-blue-600 text-xs font-semibold">Total Marks Records</p>
            <p className="text-2xl font-bold text-blue-700">{stats.totalMarksRecords}</p>
          </div>
          <div className="bg-green-50 p-3 rounded border border-green-200">
            <p className="text-green-600 text-xs font-semibold">Average %</p>
            <p className="text-2xl font-bold text-green-700">{stats.averagePercentage}%</p>
          </div>
          <div className="bg-yellow-50 p-3 rounded border border-yellow-200">
            <p className="text-yellow-600 text-xs font-semibold">Attendance Days</p>
            <p className="text-2xl font-bold text-yellow-700">{stats.totalAttendanceDays}</p>
          </div>
          <div className="bg-purple-50 p-3 rounded border border-purple-200">
            <p className="text-purple-600 text-xs font-semibold">Present Days</p>
            <p className="text-2xl font-bold text-purple-700">{stats.presentDays}</p>
          </div>
        </div>

        {stats.averagePercentage > 0 && (
          <div className="text-center py-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded border border-purple-200">
            <p className="text-purple-600 text-xs font-semibold mb-2">Overall Grade</p>
            <div className={`inline-block w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold ${getGradeColor(stats.averagePercentage)}`}>
              {stats.averagePercentage >= 80 ? 'A' : stats.averagePercentage >= 60 ? 'B' : stats.averagePercentage >= 40 ? 'C' : 'D'}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Student Performance History</h2>
        <p className="text-gray-600">View comprehensive performance history of your class students, including deactivated ones</p>
      </div>

      {/* Search Section */}
      <Card>
        <div className="flex gap-2 mb-4">
          <Input
            placeholder="Search by student name or register number"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <Button className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700">
            <Search size={18} />
            <span>Search</span>
          </Button>
        </div>

        {/* Students List */}
        {filteredStudents.length > 0 ? (
          <div className="space-y-2">
            <p className="text-sm text-gray-600 font-semibold">
              Showing {filteredStudents.length} student(s) in class {historyClass || 'N/A'}
            </p>
            {filteredStudents.map((student) => (
              <div
                key={student.id}
                className="flex justify-between items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition boundary"
              >
                <div>
                  <p className="font-semibold text-gray-900">{student.name}</p>
                  <p className="text-sm text-gray-600">Reg No: {student.register_no}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`px-2 py-1 text-xs font-semibold rounded ${getStatusColor(student.status)}`}>
                    {student.status}
                  </span>
                  <Button
                    onClick={() => handleViewHistory(student)}
                    disabled={loading}
                    className="bg-blue-600 hover:bg-blue-700 text-white text-sm flex items-center gap-1"
                  >
                    <History size={16} />
                    View
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-center py-4">No students found in your class.</p>
        )}
      </Card>

      {/* History Modal Content */}
      {showHistoryModal && selectedStudent && historyData && (
        <Card>
          <div className="space-y-4">
            <div className="border-b pb-4">
              <h3 className="text-xl font-bold text-gray-900">{selectedStudent.name} - History</h3>
              <p className="text-sm text-gray-600">Register No: {selectedStudent.register_no}</p>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 border-b">
              {(['summary', 'marks', 'attendance'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2 font-semibold border-b-2 transition ${
                    activeTab === tab
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div className="max-h-60 overflow-y-auto">
              {activeTab === 'summary' && renderSummaryTab()}
              {activeTab === 'marks' && renderMarksTab()}
              {activeTab === 'attendance' && renderAttendanceTab()}
            </div>

            <div className="flex gap-2 pt-4 border-t">
              <Button
                onClick={() => setShowHistoryModal(false)}
                className="flex-1 bg-gray-500 hover:bg-gray-600"
              >
                Close
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};
