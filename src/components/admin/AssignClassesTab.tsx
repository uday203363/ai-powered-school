import { useState, useEffect } from 'react';
import { Card, Button, Input } from '../common';
import { AlertCircle, CheckCircle, Save, Plus, Trash2 } from 'lucide-react';
import { authService, classConfigService } from '../../services';
import { normalizeObject } from '../../utils/normalize';

interface Teacher {
  id: string;
  name: string;
  email: string;
  register_no: string;
  subjects: string;
  assigned_classes: string;
  class_teacher_for: string;
}

interface ClassAssignment {
  teacherId: string;
  teacherName: string;
  assignedClasses: string;
  classTeacherFor: string;
}

export const AssignClassesTab: React.FC = () => {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [selectedTeacher, setSelectedTeacher] = useState<string>('');
  const [assignedClasses, setAssignedClasses] = useState('');
  const [classTeacherFor, setClassTeacherFor] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [allClasses, setAllClasses] = useState<string[]>([]);

  useEffect(() => {
    fetchTeachers();
    fetchAllClasses();
    const onUpdated = () => fetchTeachers();
    window.addEventListener('teachersUpdated', onUpdated);
    return () => window.removeEventListener('teachersUpdated', onUpdated);
  }, []);

  const fetchTeachers = async () => {
    try {
      const result = await authService.getUsersByRole('teacher');

      if (!result.success) {
        console.error('Error fetching teachers');
      } else {
        setTeachers((result.data || []).map((t: any) => normalizeObject(t)));
      }
    } catch (err) {
      console.error('Error:', err);
    }
  };

  const fetchAllClasses = async () => {
    try {
      const result = await classConfigService.getAllClassConfigs();
      if (result.success && result.data) {
        const uniqueClasses = [...new Set(result.data.map((cls: any) => cls.class_name))].sort();
        setAllClasses(uniqueClasses as string[]);
      }
    } catch (err) {
      console.error('Error fetching classes:', err);
    }
  };

  const handleTeacherSelect = (teacherId: string) => {
    setSelectedTeacher(teacherId);
    const teacher = teachers.find((t) => t.id === teacherId);
    if (teacher) {
      setAssignedClasses(teacher.assigned_classes || '');
      setClassTeacherFor(teacher.class_teacher_for || '');
    }
    setError('');
  };

  const handleSaveAssignment = async () => {
    if (!selectedTeacher) {
      setError('Please select a teacher');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // Normalize classes to UPPERCASE
      const normalizedClasses = assignedClasses
        .split(',')
        .map(c => c.trim().toUpperCase()) // ✅ UPPERCASE each class
        .filter(c => c.length > 0)
        .join(', ');

      const result = await authService.updateUser(selectedTeacher, {
        assigned_classes: normalizedClasses || null,
        class_teacher_for: classTeacherFor.trim().toUpperCase() || null,
      } as any);

      if (!result.success) {
        setError(`Failed to save assignment: ${result.message || 'Unknown error'}`);
      } else {
        const teacher = teachers.find((t) => t.id === selectedTeacher);
        setSuccess(`✅ Classes assigned to "${teacher?.name}" successfully!`);
        fetchTeachers();
        setTimeout(() => {
          setSuccess('');
          setSelectedTeacher('');
          setAssignedClasses('');
          setClassTeacherFor('');
        }, 3000);
      }
    } catch (err) {
      setError(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setSelectedTeacher('');
    setAssignedClasses('');
    setClassTeacherFor('');
    setError('');
  };

  const toggleClass = (className: string, isAssigned: boolean) => {
    const classesList = assignedClasses
      .split(',')
      .map((c) => c.trim())
      .filter((c) => c);

    if (isAssigned) {
      // Remove class
      const updated = classesList.filter((c) => c !== className).join(', ');
      setAssignedClasses(updated);
    } else {
      // Add class
      classesList.push(className);
      setAssignedClasses(classesList.join(', '));
    }
  };

  const toggleClassTeacher = (className: string, isSelected: boolean) => {
    const classesList = classTeacherFor
      .split(',')
      .map((c) => c.trim())
      .filter((c) => c);

    if (isSelected) {
      // Remove class
      const updated = classesList.filter((c) => c !== className).join(', ');
      setClassTeacherFor(updated);
    } else {
      // Add class
      classesList.push(className);
      setClassTeacherFor(classesList.join(', '));
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">📚 Assign Classes to Teachers</h2>
        <p className="text-gray-600 mt-1">Manage which classes teachers teach and class teacher assignments</p>
      </div>

      {/* Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg flex items-center gap-2">
          <AlertCircle size={20} />
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg flex items-center gap-2">
          <CheckCircle size={20} />
          {success}
        </div>
      )}

      {/* Select Teacher */}
      <Card className="p-6 border-2 border-blue-300 bg-blue-50">
        <h3 className="text-lg font-semibold mb-4">👨‍🏫 Select Teacher</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Choose a Teacher *</label>
            <select
              value={selectedTeacher}
              onChange={(e) => handleTeacherSelect(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">-- Select a teacher --</option>
              {teachers.map((teacher) => (
                <option key={teacher.id} value={teacher.id}>
                  {teacher.name} ({teacher.email})
                </option>
              ))}
            </select>
          </div>

          {selectedTeacher && teachers.find((t) => t.id === selectedTeacher) && (
            <div className="p-3 bg-white rounded border border-blue-200">
              <p className="text-sm text-gray-700">
                <strong>Subjects:</strong>{' '}
                {teachers.find((t) => t.id === selectedTeacher)?.subjects || 'Not specified'}
              </p>
            </div>
          )}
        </div>
      </Card>

      {/* Assign Classes */}
      {selectedTeacher && (
        <Card className="p-6 border-2 border-green-300 bg-green-50">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <div className="p-2 bg-green-200 rounded-lg">📚</div>
            Assign Classes to Teach
          </h3>

          <div className="space-y-4">
            {/* Manual Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Or type classes manually (comma-separated)
              </label>
              <Input
                type="text"
                placeholder="e.g., 1A, 1B, 2A, 2C"
                value={assignedClasses}
                onChange={(e) => setAssignedClasses(e.target.value.toUpperCase())}
              />
              <p className="text-xs text-gray-500 mt-1">Enter class names separated by commas</p>
            </div>

            {/* Class Selection Grid */}
            {allClasses.length > 0 && (
              <div>
                <p className="text-sm font-medium text-gray-700 mb-3">Or select from available classes:</p>
                <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                  {allClasses.map((cls) => {
                    const isAssigned = assignedClasses
                      .split(',')
                      .map((c) => c.trim())
                      .includes(cls);
                    return (
                      <button
                        key={cls}
                        onClick={() => toggleClass(cls, isAssigned)}
                        className={`px-3 py-2 rounded font-medium text-sm transition-colors ${
                          isAssigned
                            ? 'bg-blue-500 text-white'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                      >
                        {cls}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {assignedClasses && (
              <div className="p-3 bg-white rounded border border-green-200">
                <p className="text-sm text-gray-700">
                  <strong>Assigned Classes:</strong> {assignedClasses}
                </p>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Class Teacher Assignment */}
      {selectedTeacher && (
        <Card className="p-6 border-2 border-purple-300 bg-purple-50">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <div className="p-2 bg-purple-200 rounded-lg">👑</div>
            Assign as Class Teacher
          </h3>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Which classes should this teacher be class teacher for? (comma-separated)
              </label>
              <Input
                type="text"
                placeholder="e.g., 1A or 1A, 1B"
                value={classTeacherFor}
                onChange={(e) => setClassTeacherFor(e.target.value.toUpperCase())}
              />
              <p className="text-xs text-gray-500 mt-1">
                📝 Class teacher handles attendance and class-level tasks
              </p>
            </div>

            {/* Class Teacher Selection from Assigned Classes */}
            {assignedClasses && (
              <div>
                <p className="text-sm font-medium text-gray-700 mb-3">
                  Or select from assigned classes:
                </p>
                <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                  {assignedClasses
                    .split(',')
                    .map((c) => c.trim())
                    .filter((c) => c)
                    .map((cls) => {
                      const isSelected = classTeacherFor
                        .split(',')
                        .map((c) => c.trim())
                        .includes(cls);
                      return (
                        <button
                          key={cls}
                          onClick={() => toggleClassTeacher(cls, isSelected)}
                          className={`px-3 py-2 rounded font-medium text-sm transition-colors ${
                            isSelected
                              ? 'bg-purple-600 text-white'
                              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                          }`}
                        >
                          {cls}
                        </button>
                      );
                    })}
                </div>
              </div>
            )}

            {classTeacherFor && (
              <div className="p-3 bg-white rounded border border-purple-200">
                <p className="text-sm text-gray-700">
                  <strong>Class Teacher For:</strong> {classTeacherFor}
                </p>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Save and Cancel Buttons */}
      {selectedTeacher && (
        <div className="flex gap-3">
          <Button
            onClick={handleSaveAssignment}
            disabled={loading}
            className="flex-1 bg-blue-600 hover:bg-blue-700 flex items-center justify-center gap-2"
          >
            <Save size={20} />
            {loading ? 'Saving...' : 'Save Assignment'}
          </Button>
          <Button
            onClick={handleClear}
            className="bg-gray-400 hover:bg-gray-500"
          >
            Cancel
          </Button>
        </div>
      )}

      {/* Teachers Summary */}
      <Card className="p-6 border-2 border-gray-300 bg-gray-50">
        <h3 className="text-lg font-semibold mb-4">📋 Teacher Assignments Summary</h3>
        {teachers.length === 0 ? (
          <p className="text-gray-600">No teachers found.</p>
        ) : (
          <div className="space-y-3">
            {teachers.map((teacher) => (
              <div
                key={teacher.id}
                className="p-3 bg-white rounded border border-gray-200 hover:border-gray-400 transition"
              >
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm font-semibold text-gray-700">{teacher.name}</p>
                    <p className="text-xs text-gray-500">{teacher.email}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-600">Teaches:</p>
                    <p className="text-sm text-gray-700">
                      {teacher.assigned_classes ? (
                        <span className="inline-flex flex-wrap gap-1">
                          {teacher.assigned_classes.split(',').map((cls) => (
                            <span
                              key={cls}
                              className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded"
                            >
                              {cls.trim()}
                            </span>
                          ))}
                        </span>
                      ) : (
                        <span className="text-gray-400">Not assigned</span>
                      )}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-600">Class Teacher For:</p>
                    <p className="text-sm text-gray-700">
                      {teacher.class_teacher_for ? (
                        <span className="inline-flex flex-wrap gap-1">
                          {teacher.class_teacher_for.split(',').map((cls) => (
                            <span
                              key={cls}
                              className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded"
                            >
                              {cls.trim()}
                            </span>
                          ))}
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};

export default AssignClassesTab;
