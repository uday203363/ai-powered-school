import React, { useState, useEffect } from 'react';
import { Card, Button, Table } from '../../components/common';
import { studentService, attendanceService } from '../../services';
import { useAuth } from '../../contexts/AuthContext';
import { AlertCircle, CheckCircle } from 'lucide-react';
import { normalizeString, normalizeObject } from '../../utils/normalize';

export const TeacherAttendancePage: React.FC = () => {
  const { user } = useAuth();
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [students, setStudents] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<{ [key: string]: string }>({});
  const [loading, setLoading] = useState(false);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [assignedClasses, setAssignedClasses] = useState<string[]>([]);
  const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0]);
  const [submittedAttendance, setSubmittedAttendance] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    if (user?.assigned_classes) {
      const classes = user.assigned_classes
        .split(',')
        .map((c: string) => c.trim())
        .filter((c: string) => c.length > 0);
      const normalizedClasses = classes.map((c) => normalizeString(c));
      setAssignedClasses(normalizedClasses);
      if (normalizedClasses.length > 0) {
        setSelectedClass(normalizedClasses[0]);
      } else if (user?.class) {
        const nc = normalizeString(user.class);
        setAssignedClasses([nc]);
        setSelectedClass(nc);
      }
    } else if (user?.class) {
      const nc = normalizeString(user.class);
      setAssignedClasses([nc]);
      setSelectedClass(nc);
    }
  }, [user]);

  useEffect(() => {
    if (selectedClass) {
      loadStudents(selectedClass);
    }
  }, [selectedClass]);

  const loadStudents = async (classToLoad: string) => {
    setLoading(true);
    setError('');
    
    if (classToLoad) {
      try {
        const result = await studentService.getStudentsByClass(classToLoad);
        
        if (result.success && result.data && result.data.length > 0) {
          const normalized = result.data.map((s: any) => normalizeObject(s));
          setStudents(normalized);
          const newAttendance: { [key: string]: string } = {};
          normalized.forEach((student: any) => {
            if (student.id) {
              newAttendance[student.id] = 'present';
            }
          });
          setAttendance(newAttendance);
        } else {
          setError(`No students found in class ${classToLoad}`);
          setStudents([]);
          setAttendance({});
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        setError(`Error loading students: ${errorMsg}`);
        setStudents([]);
        setAttendance({});
      }
    }
    setLoading(false);
  };

  const handleSubmitAttendance = async () => {
    if (!selectedClass) {
      setError('Please select a class first');
      return;
    }

    if (!date) {
      setError('Please select a date');
      return;
    }

    if (students.length === 0) {
      setError('No students found in this class');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');
    
    try {
      const attendanceList = Object.entries(attendance).map(([studentId, status]) => ({
        student_id: studentId,
        date,
        status,
      }));

      if (attendanceList.length === 0) {
        setError('No attendance records to submit');
        setLoading(false);
        return;
      }

      const result = await attendanceService.markBulkAttendance(attendanceList as any);
      
      if (result.success) {
        setSuccess(`✅ Attendance marked successfully for ${attendanceList.length} students`);
        setTimeout(() => setSuccess(''), 3000);
      } else {
        const errorMsg = result.error || 'Unknown error';
        setError(`❌ Error: ${errorMsg}`);
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      setError(`Error: ${errorMsg}`);
    } finally {
      setLoading(false);
    }
  };

  const tableRows = students.map((student: any) => [
    student.name,
    student.register_no,
    <select
      key={student.id}
      value={attendance[student.id] || 'present'}
      onChange={(e) =>
        setAttendance({
          ...attendance,
          [student.id]: e.target.value,
        })
      }
      className="px-3 py-1 border border-gray-300 rounded"
    >
      <option value="present">Present</option>
      <option value="absent">Absent</option>
      <option value="leave">Leave</option>
    </select>,
  ]);

  const loadSubmittedAttendance = async () => {
    if (!selectedClass || !filterDate) {
      setError('Please select both class and date to view attendance');
      return;
    }

    setLoadingHistory(true);
    setError('');

    try {
      const studentsResult = await studentService.getStudentsByClass(selectedClass);
      
      if (!studentsResult.success || !studentsResult.data) {
        setError('Could not load students');
        setLoadingHistory(false);
        return;
      }

      const classStudents = (studentsResult.data || []).map((s: any) => normalizeObject(s));
      const attendanceResult = await attendanceService.getAttendanceByDate(filterDate);
      const attendanceMap: { [key: string]: string } = {};
      
      if (attendanceResult.success && attendanceResult.data) {
        attendanceResult.data.forEach((record: any) => {
          attendanceMap[record.student_id] = record.status;
        });
      }

      const combined = classStudents.map((student: any) => ({
        student_id: student.id,
        name: student.name,
        register_no: student.register_no,
        status: attendanceMap[student.id] || 'Not Marked',
      }));

      setSubmittedAttendance(combined);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      setError(`Error: ${errorMsg}`);
    } finally {
      setLoadingHistory(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">📋 Mark Attendance</h1>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2">
          <AlertCircle size={18} />
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-center gap-2">
          <CheckCircle size={18} />
          {success}
        </div>
      )}

      {/* MARK ATTENDANCE SECTION */}
      <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-l-4 border-green-500">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">✏️ Mark Attendance for Today</h2>
        
        <label className="block text-sm font-medium text-gray-700 mb-2 font-semibold">
          Select Your Class
        </label>
        {assignedClasses.length > 0 ? (
          <select
            value={selectedClass}
            onChange={(e) => setSelectedClass(normalizeString(e.target.value))}
            className="w-full px-4 py-2 border-2 border-green-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 font-semibold bg-white mb-4"
          >
            <option value="">-- Select a class --</option>
            {assignedClasses.map((cls) => (
              <option key={cls} value={cls}>
                {cls}
              </option>
            ))}
          </select>
        ) : (
          <div className="px-4 py-2 bg-white border-2 border-red-300 rounded-lg text-red-600 font-semibold mb-4">
            No classes assigned
          </div>
        )}

        <div className="flex items-end gap-4 mb-6">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">Select Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
          <Button 
            onClick={handleSubmitAttendance} 
            disabled={loading || students.length === 0 || !selectedClass} 
            className="bg-green-500 hover:bg-green-600"
          >
            {loading ? 'Marking...' : '✓ Submit Attendance'}
          </Button>
        </div>

        {students.length > 0 ? (
          <>
            <div className="mb-4 p-3 bg-blue-50 border-l-4 border-blue-500 rounded">
              <p className="text-sm font-semibold text-blue-900">
                👥 {students.length} student(s) in {selectedClass}
              </p>
            </div>
            <Table
              headers={['Student Name', 'Register No', 'Status']}
              rows={tableRows}
            />
          </>
        ) : loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-green-500 mb-2"></div>
              <p className="text-gray-500">Loading students...</p>
            </div>
          </div>
        ) : selectedClass ? (
          <p className="text-center text-gray-500 py-8">No students found in {selectedClass}</p>
        ) : (
          <p className="text-center text-gray-500 py-8">Select a class to mark attendance</p>
        )}
      </Card>

      {/* ATTENDANCE HISTORY SECTION */}
      <Card className="bg-gradient-to-r from-blue-50 to-cyan-50 border-l-4 border-blue-500">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">📜 View Attendance History</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Select Date</label>
            <input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Class</label>
            <div className="px-4 py-2 bg-white border border-gray-300 rounded-lg font-semibold text-gray-900">
              {selectedClass || '-- Select class --'}
            </div>
          </div>

          <Button onClick={loadSubmittedAttendance} disabled={loadingHistory || !selectedClass} className="w-full">
            {loadingHistory ? 'Loading...' : '📋 View History'}
          </Button>
        </div>

        {submittedAttendance.length > 0 && (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-100 border-b">
                <tr>
                  <th className="px-4 py-2 text-left text-sm font-semibold">Register No</th>
                  <th className="px-4 py-2 text-left text-sm font-semibold">Student Name</th>
                  <th className="px-4 py-2 text-center text-sm font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {submittedAttendance.map((record: any) => (
                  <tr key={record.student_id} className="hover:bg-gray-50">
                    <td className="px-4 py-2 text-sm">{record.register_no}</td>
                    <td className="px-4 py-2 text-sm">{record.name}</td>
                    <td className="px-4 py-2 text-center">
                      <span
                        className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                          record.status === 'present'
                            ? 'bg-green-100 text-green-700'
                            : record.status === 'absent'
                            ? 'bg-red-100 text-red-700'
                            : record.status === 'leave'
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {String(record.status).toUpperCase()}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {submittedAttendance.length === 0 && !loadingHistory && (
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded text-yellow-700 text-sm">
            📭 No attendance records found for {filterDate}. Click "View History" to load records.
          </div>
        )}
      </Card>
    </div>
  );
};
