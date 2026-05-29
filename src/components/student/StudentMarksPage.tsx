import React, { useState, useEffect } from 'react';
import { Card, Table } from '../../components/common';
import { marksService } from '../../services';
import { useAuth } from '../../contexts/AuthContext';
import { normalizeObject } from '../../utils/normalize';
import { Search, AlertCircle } from 'lucide-react';

export const StudentMarksPage: React.FC = () => {
  const { user } = useAuth();
  const [marks, setMarks] = useState<any[]>([]);
  const [filteredMarks, setFilteredMarks] = useState<any[]>([]);
  const [selectedExam, setSelectedExam] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

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
    loadMarks();
  }, []);

  useEffect(() => {
    // Filter marks by exam first, then by subject search
    let filtered = marks;

    if (selectedExam) {
      filtered = filtered.filter(mark => (mark.exam_name || '').toUpperCase() === selectedExam.toUpperCase());
    }

    if (searchTerm.trim()) {
      filtered = filtered.filter(mark =>
        (mark.subject || '').toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredMarks(filtered);
  }, [searchTerm, selectedExam, marks]);

  const loadMarks = async () => {
    setLoading(true);
    if (user?.id) {
      const result = await marksService.getMarksByStudent(user.id);
      if (result.success) {
        const normalized = (result.data || []).map((m: any) => normalizeObject(m));
        setMarks(normalized);
      }
    }
    setLoading(false);
  };

  const tableRows = filteredMarks.map((mark) => [
    mark.subject,
    mark.marks,
    mark.total,
    ((mark.marks / mark.total) * 100).toFixed(1) + '%',
    new Date(mark.created_at).toLocaleDateString(),
  ]);

  const visibleAverageMarks = filteredMarks.length > 0
    ? Math.round((filteredMarks.reduce((sum, mark) => sum + (mark.marks / mark.total) * 100, 0) / filteredMarks.length) * 100) / 100
    : 0;

  const availableExams = Array.from(
    new Set(marks.map((mark) => (mark.exam_name || '').toUpperCase()).filter(Boolean))
  ).sort();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">My Marks</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <p className="text-gray-600 text-sm">Average Marks</p>
          <p className="text-4xl font-bold text-primary">{visibleAverageMarks}%</p>
        </Card>
        <Card>
          <p className="text-gray-600 text-sm">Total Subjects</p>
          <p className="text-4xl font-bold text-secondary">{filteredMarks.length}</p>
        </Card>
      </div>

      <Card>
        <div className="mb-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Select Exam</label>
            <select
              value={selectedExam}
              onChange={(e) => setSelectedExam(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">All Exams</option>
              {availableExams.map((exam) => (
                <option key={exam} value={exam}>
                  {exam}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Search Subject</label>
            <div className="flex items-center gap-2">
              <Search size={20} className="text-gray-500" />
              <input
                type="text"
                placeholder="Search by subject name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center mb-4 gap-2">
          <span className="text-sm text-gray-600">
            Showing {selectedExam ? `subjects for ${selectedExam}` : 'all exams'}
          </span>
        </div>

        <h2 className="text-xl font-bold mb-4">Marks Details</h2>
        {loading ? (
          <div className="text-center py-8">Loading...</div>
        ) : filteredMarks.length > 0 ? (
          <Table
            headers={['Subject', 'Marks', 'Total', 'Percentage', 'Date']}
            rows={tableRows}
          />
        ) : (
          <div className="text-center py-8 text-gray-500">
            {selectedExam && searchTerm
              ? 'No subjects match the selected exam and search'
              : selectedExam
              ? 'No marks available for the selected exam'
              : searchTerm
              ? 'No subjects match your search'
              : 'No marks available yet'}
          </div>
        )}
      </Card>
    </div>
  );
};
