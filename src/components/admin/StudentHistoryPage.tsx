import React, { useState } from 'react';
import { Card, Button, Input, Modal } from '../../components/common';
import { studentHistoryService } from '../../services';
import { Search, Download, TrendingUp, Calendar, DollarSign, BookOpen } from 'lucide-react';

export const StudentHistoryPage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [historyData, setHistoryData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'marks' | 'attendance' | 'fees' | 'summary'>('summary');

  const handleSearch = async () => {
    if (searchQuery.trim().length === 0) {
      alert('Please enter a student name or register number');
      return;
    }

    setLoading(true);
    const result = await studentHistoryService.searchStudentHistory(searchQuery);
    if (result.success) {
      setSearchResults(result.data || []);
    } else {
      alert('Failed to search students');
      setSearchResults([]);
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
      case 'Left':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-blue-100 text-blue-800';
    }
  };

  const getGradeColor = (grade: string) => {
    switch (grade) {
      case 'A':
        return 'bg-green-100 text-green-800';
      case 'B':
        return 'bg-blue-100 text-blue-800';
      case 'C':
        return 'bg-yellow-100 text-yellow-800';
      case 'D':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const renderMarksTab = () => {
    if (!historyData?.marks || historyData.marks.length === 0) {
      return <p className="text-gray-500 text-center py-4">No marks records available.</p>;
    }

    // Group marks by year
    const marksByYear: { [key: number]: any[] } = {};
    historyData.marks.forEach((mark: any) => {
      const year = new Date(mark.created_at).getFullYear();
      if (!marksByYear[year]) {
        marksByYear[year] = [];
      }
      marksByYear[year].push(mark);
    });

    return (
      <div className="space-y-6">
        {Object.entries(marksByYear)
          .sort(([yearA], [yearB]) => parseInt(yearB) - parseInt(yearA))
          .map(([year, marks]) => (
            <div key={year} className="border-l-4 border-blue-500 pl-4">
              <h4 className="font-bold text-gray-900 mb-3">Academic Year {year}</h4>
              <div className="space-y-2">
                {marks.map((mark: any, idx: number) => {
                  const percentage = ((mark.marks / mark.total) * 100).toFixed(1);
                  return (
                    <div key={idx} className="bg-gray-50 p-3 rounded-lg flex justify-between items-center">
                      <div>
                        <p className="font-semibold text-gray-900">{mark.subject}</p>
                        <p className="text-sm text-gray-600">{mark.exam_name || 'General'}</p>
                        <p className="text-xs text-gray-500">
                          {new Date(mark.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-lg text-blue-600">
                          {mark.marks}/{mark.total}
                        </p>
                        <p className="text-sm font-semibold text-green-600">{percentage}%</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
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

    const attendancePercentage = (
      (stats.present / historyData.attendance.length) *
      100
    ).toFixed(1);

    return (
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-green-50 p-4 rounded-lg border border-green-200">
            <p className="text-green-600 text-sm font-semibold">Present</p>
            <p className="text-2xl font-bold text-green-700">{stats.present}</p>
          </div>
          <div className="bg-red-50 p-4 rounded-lg border border-red-200">
            <p className="text-red-600 text-sm font-semibold">Absent</p>
            <p className="text-2xl font-bold text-red-700">{stats.absent}</p>
          </div>
          <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
            <p className="text-yellow-600 text-sm font-semibold">Leave</p>
            <p className="text-2xl font-bold text-yellow-700">{stats.leave}</p>
          </div>
        </div>
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <p className="text-blue-600 text-sm font-semibold">Attendance Percentage</p>
          <p className="text-3xl font-bold text-blue-700">{attendancePercentage}%</p>
        </div>

        <div className="mt-4">
          <h4 className="font-semibold text-gray-900 mb-2">Recent Attendance (Last 10)</h4>
          <div className="space-y-1">
            {historyData.attendance.slice(0, 10).map((record: any, idx: number) => (
              <div key={idx} className="flex justify-between p-2 bg-gray-50 rounded text-sm">
                <span>{new Date(record.date).toLocaleDateString()}</span>
                <span
                  className={`font-semibold ${
                    record.status === 'present'
                      ? 'text-green-600'
                      : record.status === 'absent'
                      ? 'text-red-600'
                      : 'text-yellow-600'
                  }`}
                >
                  {record.status.toUpperCase()}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderFeesTab = () => {
    if (!historyData?.fees || historyData.fees.length === 0) {
      return <p className="text-gray-500 text-center py-4">No fees records available.</p>;
    }

    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-green-50 p-4 rounded-lg border border-green-200">
            <p className="text-green-600 text-sm font-semibold">Total Paid</p>
            <p className="text-2xl font-bold text-green-700">₹{historyData.statistics.totalFeesPaid}</p>
          </div>
          <div className="bg-red-50 p-4 rounded-lg border border-red-200">
            <p className="text-red-600 text-sm font-semibold">Total Pending</p>
            <p className="text-2xl font-bold text-red-700">₹{historyData.statistics.totalFeesPending}</p>
          </div>
        </div>

        <div className="mt-4">
          <h4 className="font-semibold text-gray-900 mb-2">Fees Records</h4>
          <div className="space-y-2">
            {historyData.fees.map((fee: any, idx: number) => (
              <div key={idx} className="bg-gray-50 p-3 rounded-lg">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-semibold text-gray-900">
                      {fee.month} {fee.year}
                    </p>
                    <p className="text-sm text-gray-600">
                      Status:{' '}
                      <span
                        className={`font-semibold ${
                          fee.status === 'paid'
                            ? 'text-green-600'
                            : fee.status === 'partial'
                            ? 'text-yellow-600'
                            : 'text-red-600'
                        }`}
                      >
                        {fee.status.toUpperCase()}
                      </span>
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">₹{fee.paid_amount}</p>
                    <p className="text-sm text-gray-600">Pending: ₹{fee.balance}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderSummaryTab = () => {
    if (!historyData) return null;

    const stats = historyData.statistics;

    return (
      <div className="space-y-6">
        {/* Student Info */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-200">
          <h3 className="font-bold text-gray-900 mb-3">Student Information</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-600">Register Number</p>
              <p className="font-semibold text-gray-900">{historyData.student.register_no}</p>
            </div>
            <div>
              <p className="text-gray-600">Current Status</p>
              <span className={`inline-block px-2 py-1 rounded text-xs font-semibold ${getStatusColor(historyData.student.status)}`}>
                {historyData.student.status}
              </span>
            </div>
            <div>
              <p className="text-gray-600">Current Class</p>
              <p className="font-semibold text-gray-900">{historyData.student.class || 'N/A'}</p>
            </div>
            <div>
              <p className="text-gray-600">Joined On</p>
              <p className="font-semibold text-gray-900">{new Date(historyData.student.created_at).toLocaleDateString()}</p>
            </div>
          </div>
        </div>

        {/* Performance Statistics */}
        <div className="grid grid-cols-2 gap-4">
          <Card>
            <div className="flex items-center space-x-3">
              <div className="bg-blue-100 p-3 rounded-lg">
                <BookOpen className="text-blue-600" size={24} />
              </div>
              <div>
                <p className="text-gray-600 text-sm">Total Marks</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalMarksRecords}</p>
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-center space-x-3">
              <div className="bg-green-100 p-3 rounded-lg">
                <TrendingUp className="text-green-600" size={24} />
              </div>
              <div>
                <p className="text-gray-600 text-sm">Average %</p>
                <p className="text-2xl font-bold text-gray-900">{stats.averagePercentage}%</p>
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-center space-x-3">
              <div className="bg-yellow-100 p-3 rounded-lg">
                <Calendar className="text-yellow-600" size={24} />
              </div>
              <div>
                <p className="text-gray-600 text-sm">Attendance Days</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalAttendanceDays}</p>
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-center space-x-3">
              <div className="bg-green-100 p-3 rounded-lg">
                <DollarSign className="text-green-600" size={24} />
              </div>
              <div>
                <p className="text-gray-600 text-sm">Fees Paid</p>
                <p className="text-2xl font-bold text-gray-900">₹{stats.totalFeesPaid}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Performance Grade */}
        {stats.averagePercentage > 0 && (
          <div className="text-center py-6 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border border-purple-200">
            <p className="text-gray-600 text-sm mb-2">Overall Performance Grade</p>
            <div className={`inline-block w-24 h-24 rounded-full flex items-center justify-center text-3xl font-bold ${getGradeColor(
              stats.averagePercentage >= 80
                ? 'A'
                : stats.averagePercentage >= 60
                ? 'B'
                : stats.averagePercentage >= 40
                ? 'C'
                : 'D'
            )}`}>
              {stats.averagePercentage >= 80 ? 'A' : stats.averagePercentage >= 60 ? 'B' : stats.averagePercentage >= 40 ? 'C' : 'D'}
            </div>
          </div>
        )}

        {/* Attendance Percentage */}
        {stats.totalAttendanceDays > 0 && (
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <p className="text-blue-600 text-sm font-semibold mb-2">Attendance Information</p>
            <div className="flex justify-between items-center">
              <span>Present Days: {stats.presentDays}/{stats.totalAttendanceDays}</span>
              <span className="font-bold text-lg text-blue-700">
                {((stats.presentDays / stats.totalAttendanceDays) * 100).toFixed(1)}%
              </span>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Student Performance History</h1>
        <p className="text-gray-600">
          View complete history of student performance across years, even for deactivated students
        </p>
      </div>

      {/* Search Section */}
      <Card>
        <h2 className="text-xl font-bold mb-4">Search Student</h2>
        <div className="flex gap-2 mb-4">
          <Input
            placeholder="Enter student name or register number"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') handleSearch();
            }}
          />
          <Button onClick={handleSearch} disabled={loading} className="flex items-center space-x-2">
            <Search size={18} />
            <span>Search</span>
          </Button>
        </div>

        {/* Search Results */}
        {searchResults.length > 0 && (
          <div className="space-y-2">
            <h3 className="font-semibold text-gray-900 mb-3">Search Results ({searchResults.length})</h3>
            {searchResults.map((student) => (
              <div
                key={student.id}
                className="flex justify-between items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition"
              >
                <div>
                  <p className="font-semibold text-gray-900">{student.name}</p>
                  <p className="text-sm text-gray-600">Reg No: {student.register_no}</p>
                  <p className="text-xs text-gray-500">Class: {student.class || 'N/A'}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={`px-2 py-1 text-xs font-semibold rounded ${getStatusColor(
                      student.status
                    )}`}
                  >
                    {student.status}
                  </span>
                  <Button
                    onClick={() => handleViewHistory(student)}
                    disabled={loading}
                    className="bg-blue-600 hover:bg-blue-700 text-white text-sm"
                  >
                    View History
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {searchQuery && searchResults.length === 0 && !loading && (
          <p className="text-gray-500 text-center py-4">No students found matching your search.</p>
        )}
      </Card>

      {/* History Modal */}
      <Modal isOpen={showHistoryModal} onClose={() => setShowHistoryModal(false)} title={`${selectedStudent?.name} - Complete History`} size="lg">
        <div className="space-y-4">
          {/* Tabs */}
          <div className="flex border-b gap-2">
            {(['summary', 'marks', 'attendance', 'fees'] as const).map((tab) => (
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
          <div className="max-h-96 overflow-y-auto">
            {activeTab === 'summary' && renderSummaryTab()}
            {activeTab === 'marks' && renderMarksTab()}
            {activeTab === 'attendance' && renderAttendanceTab()}
            {activeTab === 'fees' && renderFeesTab()}
          </div>

          {/* Download Button */}
          <div className="flex gap-2 pt-4 border-t">
            <Button
              onClick={() => {
                // Generate and download report
                const report = {
                  student: selectedStudent?.name,
                  registerNo: selectedStudent?.register_no,
                  generatedAt: new Date().toLocaleString(),
                  statistics: historyData?.statistics,
                };
                const element = document.createElement('a');
                element.setAttribute(
                  'href',
                  'data:text/plain;charset=utf-8,' + encodeURIComponent(JSON.stringify(report, null, 2))
                );
                element.setAttribute('download', `${selectedStudent?.register_no}_history.txt`);
                element.style.display = 'none';
                document.body.appendChild(element);
                element.click();
                document.body.removeChild(element);
              }}
              className="flex items-center space-x-2 bg-green-600 hover:bg-green-700"
            >
              <Download size={18} />
              <span>Download Report</span>
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
