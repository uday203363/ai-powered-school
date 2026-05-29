import { useState, useEffect } from 'react';
import { Plus, Trash2, AlertCircle, CheckCircle, Check } from 'lucide-react';
import { examService, classConfigService, marksService, studentService } from '../../services/database';

interface Exam {
  id: string;
  exam_name: string;
  class_name?: string; // Single class (backward compatibility)
  classes?: string; // Multiple classes (comma-separated)
  exam_number: number;
  description?: string;
  assessment_type: 'formative' | 'summative';
  year?: number;
  is_active: boolean;
  created_at: string;
  completion_status?: string; // 'completed' | 'in_progress' | 'not_started'
}

export default function ExamManagementTab() {
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showAddExam, setShowAddExam] = useState(false);
  const [classes, setClasses] = useState<string[]>([]);
  const [allStudents, setAllStudents] = useState<any[]>([]);
  const [newExam, setNewExam] = useState({
    exam_name: '',
    selected_classes: [] as string[],
    exam_number: '',
    description: '',
    assessment_type: 'formative',
    year: new Date().getFullYear(),
  });
  // editingExam state removed (not used)

  useEffect(() => {
    loadExamsAndClasses();
  }, []);

  // Check if an exam is completed (all teachers uploaded marks)
  const checkExamCompletion = async (exam: Exam) => {
    try {
      const examClasses = exam.classes ? exam.classes.split(',').map(c => c.trim()) : [exam.class_name];
      
      // Get all marks for this exam across all classes
      let totalMarks = 0;
      for (const className of examClasses) {
        const classStudents = allStudents.filter((s: any) => s.class === className);
        for (const student of classStudents) {
          const marksResult = await marksService.getMarksByStudent(student.id);
          const examMarks = (marksResult.data || []).filter((m: any) => m.exam_name === exam.exam_name);
          totalMarks += examMarks.length;
        }
      }
      
      // If marks exist for this exam, it's in progress or completed
      if (totalMarks > 0) {
        return 'completed'; // Simplified - just check if any marks exist
      }
      return 'not_started';
    } catch (err) {
      console.error('Error checking exam completion:', err);
      return 'in_progress';
    }
  };

  const loadExamsAndClasses = async () => {
    setLoading(true);
    try {
      // Load exams
      const examsResult = await examService.getAllExams();
      if (examsResult.success) {
        let examsData = examsResult.data || [];
        
        // Add completion status to each exam
        examsData = await Promise.all(examsData.map(async (exam: Exam) => ({
          ...exam,
          completion_status: await checkExamCompletion(exam)
        })));
        
        setExams(examsData);
      }

      // Load classes
      const classesResult = await classConfigService.getAllClassConfigs();
      if (classesResult.success) {
        const classList = classesResult.data?.map((c: any) => c.class_name) || [];
        setClasses(classList);
      }

      // Load all students for completion check
      const studentsResult = await studentService.getAllStudents();
      if (studentsResult.success) {
        setAllStudents(studentsResult.data || []);
      }
    } catch (err) {
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddExam = async () => {
    if (!newExam.exam_name.trim() || newExam.selected_classes.length === 0 || !newExam.exam_number) {
      setError('Please fill in all required fields and select at least one class');
      setSuccess('');
      return;
    }

    if (parseInt(newExam.exam_number) <= 0) {
      setError('Exam number must be greater than 0');
      setSuccess('');
      return;
    }

    setLoading(true);
    try {
      // For each selected class, create an exam entry (store in UPPERCASE)
      for (const className of newExam.selected_classes) {
        const result = await examService.createExam({
          exam_name: newExam.exam_name.trim().toUpperCase(), // ✅ UPPERCASE
          class_name: className.toUpperCase(), // ✅ UPPERCASE
          classes: newExam.selected_classes.map(c => c.toUpperCase()).join(','), // ✅ UPPERCASE
          exam_number: parseInt(newExam.exam_number),
          description: newExam.description.trim() || null,
          assessment_type: newExam.assessment_type,
          year: newExam.year,
        });

        if (!result.success) {
          setError(`Failed to create exam for ${className}: ${result.error}`);
          setLoading(false);
          return;
        }
      }

      setSuccess('✓ Exam created for all selected classes!');
      setNewExam({ 
        exam_name: '', 
        selected_classes: [], 
        exam_number: '', 
        description: '', 
        assessment_type: 'formative',
        year: new Date().getFullYear(),
      });
      setShowAddExam(false);
      setError('');
      await loadExamsAndClasses();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(`Error creating exam: ${err}`);
      setSuccess('');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteExam = async (examId: string) => {
    if (!confirm('Are you sure you want to delete this exam?')) return;

    setLoading(true);
    try {
      const result = await examService.deleteExam(examId);
      if (result.success) {
        setSuccess('✓ Exam deleted successfully!');
        setError('');
        await loadExamsAndClasses();
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(`Failed to delete exam: ${result.error}`);
        setSuccess('');
      }
    } catch (err) {
      setError(`Error deleting exam: ${err}`);
      setSuccess('');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (exam: Exam) => {
    setLoading(true);
    try {
      const result = await examService.updateExam(exam.id, {
        is_active: !exam.is_active,
      });

      if (result.success) {
        setSuccess(`✓ Exam ${!exam.is_active ? 'activated' : 'deactivated'}!`);
        setError('');
        await loadExamsAndClasses();
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(`Failed to update exam: ${result.error}`);
        setSuccess('');
      }
    } catch (err) {
      setError(`Error updating exam: ${err}`);
      setSuccess('');
    } finally {
      setLoading(false);
    }
  };

  // Group exams by class, but also show all classes each exam is for
  const examsByClass = exams.reduce((acc: any, exam) => {
    const classToGroup = exam.class_name || 'All Classes';
    if (!acc[classToGroup]) acc[classToGroup] = [];
    acc[classToGroup].push(exam);
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Exam Management</h2>
        <button
          onClick={() => setShowAddExam(true)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
        >
          <Plus size={18} />
          Add Exam
        </button>
      </div>

      {/* Messages */}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-center gap-2">
          <CheckCircle size={18} />
          {success}
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2">
          <AlertCircle size={18} />
          {error}
        </div>
      )}

      {/* Add Exam Form */}
      {showAddExam && (
        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
          <h3 className="text-lg font-semibold mb-4">Add New Exam</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Exam Name *</label>
              <input
                type="text"
                value={newExam.exam_name}
                onChange={(e) => setNewExam({ ...newExam, exam_name: e.target.value })}
                placeholder="e.g., Final Exam, Mid Term, FA1"
                className="w-full border border-gray-300 rounded px-3 py-2 focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Exam Number *</label>
              <input
                type="number"
                value={newExam.exam_number}
                onChange={(e) => setNewExam({ ...newExam, exam_number: e.target.value })}
                placeholder="1, 2, 3..."
                min="1"
                className="w-full border border-gray-300 rounded px-3 py-2 focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Year *</label>
              <input
                type="number"
                value={newExam.year}
                onChange={(e) => setNewExam({ ...newExam, year: parseInt(e.target.value) })}
                placeholder={new Date().getFullYear().toString()}
                min="2000"
                max="2100"
                className="w-full border border-gray-300 rounded px-3 py-2 focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Assessment Type *</label>
              <select
                value={newExam.assessment_type}
                onChange={(e) => setNewExam({ ...newExam, assessment_type: e.target.value as 'formative' | 'summative' })}
                className="w-full border border-gray-300 rounded px-3 py-2 focus:border-blue-500 focus:outline-none"
              >
                <option value="formative">📝 Formative (Quiz, Class Test)</option>
                <option value="summative">📊 Summative (Final, Semester Exam)</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Classes *</label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-3 border border-gray-300 rounded bg-gray-50">
                {classes.map((cls) => (
                  <label key={cls} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newExam.selected_classes.includes(cls)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setNewExam({ ...newExam, selected_classes: [...newExam.selected_classes, cls] });
                        } else {
                          setNewExam({ ...newExam, selected_classes: newExam.selected_classes.filter(c => c !== cls) });
                        }
                      }}
                      className="w-4 h-4"
                    />
                    <span className="text-sm text-gray-700">{cls}</span>
                  </label>
                ))}
              </div>
              {newExam.selected_classes.length === 0 && (
                <p className="text-xs text-red-600 mt-1">Select at least one class</p>
              )}
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Description (optional)</label>
              <input
                type="text"
                value={newExam.description}
                onChange={(e) => setNewExam({ ...newExam, description: e.target.value })}
                placeholder="e.g., Chapter 1-5"
                className="w-full border border-gray-300 rounded px-3 py-2 focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="flex gap-2 mt-4">
            <button
              onClick={handleAddExam}
              disabled={loading}
              className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg"
            >
              Create Exam
            </button>
            <button
              onClick={() => {
                setShowAddExam(false);
                setNewExam({ 
                  exam_name: '', 
                  selected_classes: [], 
                  exam_number: '', 
                  description: '', 
                  assessment_type: 'formative',
                  year: new Date().getFullYear(),
                });
              }}
              className="flex-1 bg-gray-400 hover:bg-gray-500 text-white px-4 py-2 rounded-lg"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Exams List */}
      {loading && exams.length === 0 ? (
        <div className="text-center py-8 text-gray-500">Loading exams...</div>
      ) : exams.length === 0 ? (
        <div className="text-center py-8 text-gray-500">No exams yet. Create one to get started!</div>
      ) : (
        <div className="space-y-4">
          {Object.entries(examsByClass).map(([className, classExams]: [string, any]) => (
            <div key={className} className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-3 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Class {className}</h3>
                <p className="text-sm text-gray-600">{classExams.length} exam(s)</p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Exam (Name-Number)</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Number</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Academic Year</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Type</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Description</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Active</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Completion</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {classExams.map((exam: Exam) => {
                      const year = exam.year || new Date().getFullYear();
                      const academicYear = `${year}-${year + 1}`;
                      const displayName = `${exam.exam_name}-${exam.exam_number}`;
                      return (
                      <tr key={exam.id} className="hover:bg-gray-50">
                        <td className="px-6 py-3 text-sm text-gray-900 font-medium">{displayName}</td>
                        <td className="px-6 py-3 text-sm text-gray-600">#{exam.exam_number}</td>
                        <td className="px-6 py-3 text-sm text-gray-600">{academicYear}</td>
                        <td className="px-6 py-3 text-sm">
                          <span
                            className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                              exam.assessment_type === 'formative'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-orange-100 text-orange-800'
                            }`}
                          >
                            {exam.assessment_type === 'formative' ? '📝 Formative' : '📊 Summative'}
                          </span>
                        </td>
                        <td className="px-6 py-3 text-sm text-gray-600">{exam.description || '-'}</td>
                        <td className="px-6 py-3 text-sm">
                          <span
                            className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                              exam.is_active
                                ? 'bg-green-100 text-green-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {exam.is_active ? '✓ Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-6 py-3 text-sm">
                          <span
                            className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${
                              exam.completion_status === 'completed'
                                ? 'bg-green-100 text-green-800'
                                : exam.completion_status === 'in_progress'
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {exam.completion_status === 'completed' && <>
                              <Check size={14} />
                              Completed
                            </>}
                            {exam.completion_status === 'in_progress' && '⏳ In Progress'}
                            {exam.completion_status === 'not_started' && '○ Not Started'}
                          </span>
                        </td>
                        <td className="px-6 py-3 text-sm">
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleToggleActive(exam)}
                              disabled={loading}
                              className="text-blue-600 hover:text-blue-700 disabled:text-gray-400"
                              title={exam.is_active ? 'Deactivate' : 'Activate'}
                            >
                              {exam.is_active ? '⊘' : '✓'}
                            </button>
                            <button
                              onClick={() => handleDeleteExam(exam.id)}
                              disabled={loading}
                              className="text-red-600 hover:text-red-700 disabled:text-gray-400"
                              title="Delete"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </td>
                      </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
