import React, { useState, useEffect } from 'react';
import { Card, Table } from '../../components/common';
import { attendanceService } from '../../services';
import { useAuth } from '../../contexts/AuthContext';
import { AlertCircle } from 'lucide-react';

export const StudentAttendancePage: React.FC = () => {
  const { user } = useAuth();
  const [attendance, setAttendance] = useState<any[]>([]);
  const [stats, setStats] = useState({ present: 0, absent: 0, leave: 0 });
  const [loading, setLoading] = useState(false);

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
            You cannot access this page.
          </p>
          <p className="text-gray-500 text-sm">
            Please contact the school administration for more information.
          </p>
        </Card>
      </div>
    );
  }

  useEffect(() => {
    loadAttendance();
  }, []);

  const loadAttendance = async () => {
    setLoading(true);
    if (user?.id) {
      const [attendanceResult, statsResult] = await Promise.all([
        attendanceService.getAttendanceByStudent(user.id),
        attendanceService.getAttendanceStats(user.id),
      ]);

      if (attendanceResult.success) {
        setAttendance(attendanceResult.data || []);
      }
      if (statsResult.success && statsResult.stats) {
        setStats(statsResult.stats as { present: number; absent: number; leave: number });
      }
    }
    setLoading(false);
  };

  const attendanceRate = stats.present + stats.absent + stats.leave > 0
    ? Math.round((stats.present / (stats.present + stats.absent + stats.leave)) * 100)
    : 0;

  const tableRows = attendance.map((record) => [
    new Date(record.date).toLocaleDateString(),
    record.status.toUpperCase(),
    record.remarks ? record.remarks.toUpperCase() : '-',
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">My Attendance</h1>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <p className="text-gray-600 text-sm">Attendance Rate</p>
          <p className="text-3xl font-bold text-primary">{attendanceRate}%</p>
        </Card>
        <Card>
          <p className="text-gray-600 text-sm">Present</p>
          <p className="text-3xl font-bold text-secondary">{stats.present}</p>
        </Card>
        <Card>
          <p className="text-gray-600 text-sm">Absent</p>
          <p className="text-3xl font-bold text-danger">{stats.absent}</p>
        </Card>
        <Card>
          <p className="text-gray-600 text-sm">Leave</p>
          <p className="text-3xl font-bold text-accent">{stats.leave}</p>
        </Card>
      </div>

      <Card>
        <h2 className="text-xl font-bold mb-4">Attendance Details</h2>
        {loading ? (
          <div className="text-center py-8">Loading...</div>
        ) : attendance.length > 0 ? (
          <Table
            headers={['Date', 'Status', 'Remarks']}
            rows={tableRows}
          />
        ) : (
          <div className="text-center py-8 text-gray-500">
            No attendance records available
          </div>
        )}
      </Card>
    </div>
  );
};
