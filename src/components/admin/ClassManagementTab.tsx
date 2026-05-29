import { useState, useEffect } from 'react';
import { Plus, Edit2, Users, AlertCircle, BookOpen, Trash2 } from 'lucide-react';
import { classConfigService, studentService } from '../../services/database';
import { normalizeString } from '../../utils/normalize';

interface ClassConfig {
  id: string;
  class_name: string;
  max_students: number;
  current_students: number;
  subjects?: string;
}

interface AddStudentForm {
  classId: string;
  studentName: string;
  register_no: string;
  email: string;
  phone: string;
  password: string;
}

export default function ClassManagementTab() {
  const [classes, setClasses] = useState<ClassConfig[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showAddClass, setShowAddClass] = useState(false);
  const [showAddStudentModal, setShowAddStudentModal] = useState(false);
  const [selectedClass, setSelectedClass] = useState<ClassConfig | null>(null);
  const [deleteConfirmClass, setDeleteConfirmClass] = useState<ClassConfig | null>(null);

  // Form states
  const [newClass, setNewClass] = useState({ name: '', capacity: '', subjects: '' });
  const [editCapacity, setEditCapacity] = useState<{ [key: string]: number }>({});
  const [editSubjects, setEditSubjects] = useState<{ [key: string]: string }>({});
  const [newSubjectInput, setNewSubjectInput] = useState<{ [key: string]: string }>({});
  const [studentForm, setStudentForm] = useState<AddStudentForm>({
    classId: '',
    studentName: '',
    register_no: '',
    email: '',
    phone: '',
    password: '',
  });

  // Fetch classes
  useEffect(() => {
    fetchClasses();
  }, []);

  const fetchClasses = async () => {
    setLoading(true);
    const result = await classConfigService.getAllClassConfigs();
    if (result.success) {
      setClasses(result.data);
      setError('');
    } else {
      setError('Failed to load classes');
    }
    setLoading(false);
  };

  // Add new class
  const handleAddClass = async () => {
    if (!newClass.name.trim() || !newClass.capacity) {
      setError('Please fill in all fields');
      return;
    }

    const capacity = parseInt(newClass.capacity);
    if (capacity <= 0) {
      setError('Capacity must be greater than 0');
      return;
    }

    setLoading(true);
    setError(''); // Clear previous errors
    
    try {
      // Save class name in UPPERCASE for consistency
      const result = await classConfigService.setMaxStudents(
        newClass.name.toUpperCase(), 
        capacity, 
        newClass.subjects.trim().toUpperCase() || null
      );
      console.log('Class creation result:', result);
      
      if (result.success) {
        setNewClass({ name: '', capacity: '', subjects: '' });
        setShowAddClass(false);
        setError('');
        await fetchClasses();
      } else {
        setError(`Failed to create class: ${typeof result.error === 'string' ? result.error : 'Unknown error'}`);
        console.error('Class creation error:', result.error);
      }
    } catch (err) {
      console.error('Exception creating class:', err);
      setError(`Error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLoading(false);
    }
  };

  // Update class capacity
  const handleUpdateCapacity = async (classId: string, className: string) => {
    const newCapacity = editCapacity[classId];
    if (!newCapacity || newCapacity <= 0) {
      setError('Capacity must be greater than 0');
      return;
    }

    setLoading(true);
    const result = await classConfigService.setMaxStudents(className, newCapacity);
    
    if (result.success) {
      setEditCapacity({ ...editCapacity, [classId]: 0 });
      setError('');
      await fetchClasses();
    } else {
      setError('Failed to update capacity');
    }
    setLoading(false);
  };

  // Update class subjects
  const handleUpdateSubjects = async (classId: string, className: string) => {
    const newSubjects = editSubjects[classId];
    console.log('Saving subjects:', { classId, className, newSubjects });
    
    if (newSubjects === undefined || newSubjects.trim() === '') {
      setError('Please add at least one subject before saving');
      setSuccess('');
      return;
    }

    setLoading(true);
    const result = await classConfigService.updateSubjects(className, newSubjects);
    console.log('Save result:', result);
    
    if (result.success) {
      setSuccess('✓ Subjects saved successfully!');
      setEditSubjects({ ...editSubjects, [classId]: '' });
      setNewSubjectInput({ ...newSubjectInput, [classId]: '' });
      setError('');
      
      // Reload classes after a short delay to ensure database update
      setTimeout(async () => {
        await fetchClasses();
      }, 500);
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(''), 3000);
    } else {
      setError(`Failed to update subjects: ${result.error || 'Unknown error'}`);
      console.error('Save error:', result.error);
      setSuccess('');
    }
    setLoading(false);
  };

  // Add single subject
  const handleAddSingleSubject = (classId: string) => {
    const inputValue = newSubjectInput[classId] || '';
    const newSubject = inputValue.trim();
    
    console.log('Adding subject - Step 1:', { classId, inputValue, newSubject });
    
    if (!newSubject || newSubject.length === 0) {
      setError('Please enter a subject name');
      setSuccess('');
      console.log('Error: Empty subject name');
      return;
    }

    const currentSubjectsStr = (editSubjects[classId] || '').trim();
    console.log('Adding subject - Step 2:', { currentSubjectsStr });
    
    const subjectsList = currentSubjectsStr
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    console.log('Adding subject - Step 3:', { subjectsList });

    // Check if subject already exists
    if (subjectsList.some((s) => s.toLowerCase() === newSubject.toLowerCase())) {
      setError('This subject is already added');
      setSuccess('');
      console.log('Error: Subject already exists');
      return;
    }

    let updatedSubjects: string;
    if (currentSubjectsStr.length > 0) {
      updatedSubjects = `${currentSubjectsStr}, ${newSubject}`;
    } else {
      updatedSubjects = newSubject;
    }

    console.log('Adding subject - Step 4 Final:', { updatedSubjects });
    
    setEditSubjects(prev => {
      const newState = { ...prev, [classId]: updatedSubjects };
      console.log('State updated:', newState);
      return newState;
    });
    
    setNewSubjectInput(prev => ({ ...prev, [classId]: '' }));
    setError('');
    setSuccess(`✓ "${newSubject}" added successfully!`);
    
    // Clear success message after 3 seconds
    setTimeout(() => setSuccess(''), 3000);
  };

  // Delete single subject by name
  const handleDeleteSingleSubject = (classId: string, subjectToDelete: string) => {
    console.log('Deleting subject:', { classId, subjectToDelete });
    
    const currentSubjects = editSubjects[classId] || '';
    const subjectsList = currentSubjects
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && s !== subjectToDelete);

    const updatedSubjects = subjectsList.join(', ');
    console.log('After deletion:', { updatedSubjects, remainingCount: subjectsList.length });
    
    setEditSubjects(prev => ({ ...prev, [classId]: updatedSubjects }));
    setSuccess(`✓ "${subjectToDelete}" removed successfully!`);
    setError('');
    
    // Clear success message after 2 seconds
    setTimeout(() => setSuccess(''), 2000);
  };

  // Delete class
  const handleDeleteClass = async (classToDelete: ClassConfig) => {
    setLoading(true);
    setError('');
    
    try {
      const result = await classConfigService.deleteClass(classToDelete.id, classToDelete.class_name);
      
      if (result.success) {
        setSuccess(`✓ Class ${classToDelete.class_name} deleted successfully!`);
        setDeleteConfirmClass(null);
        await fetchClasses();
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(result.error || 'Failed to delete class');
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Error deleting class';
      setError(errorMsg);
      console.error('Exception deleting class:', err);
    } finally {
      setLoading(false);
    }
  };


  // Add student to class
  const handleAddStudent = async () => {
    if (!studentForm.classId || !studentForm.studentName.trim() || !studentForm.email.trim() || !studentForm.password.trim()) {
      setError('Please fill in all required fields (Name, Email, Password)');
      return;
    }

    if (studentForm.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    
    try {
      // Get class details
      const currentClass = classes.find(c => c.id === studentForm.classId);
      if (!currentClass) {
        setError('Class not found');
        setLoading(false);
        return;
      }

      // Generate register number if not provided
      let registerNo = studentForm.register_no;
      if (!registerNo.trim()) {
        const regResult = await studentService.getNextRegisterNoForClass(currentClass.class_name);
        if (!regResult.success) {
          setError(regResult.error || 'Failed to generate register number');
          setLoading(false);
          return;
        }
        registerNo = regResult.nextRegisterNo;
      }

      // Create student with all required fields including hashed password
      const createResult = await studentService.createStudent({
        name: studentForm.studentName,
        email: studentForm.email,
        phone: studentForm.phone,
        class: currentClass.class_name,
        register_no: registerNo,
        password: studentForm.password,
      } as any);

      if (createResult.success) {
        // Increment student count in class config
        await classConfigService.incrementStudentCount(currentClass.class_name);
        
        setStudentForm({ classId: '', studentName: '', register_no: '', email: '', phone: '', password: '' });
        setShowAddStudentModal(false);
        setError('');
        await fetchClasses();
      } else {
        let errorMsg = 'Failed to add student';
        if (createResult.error) {
          if (typeof createResult.error === 'string') {
            errorMsg = createResult.error;
          } else if (typeof createResult.error === 'object' && createResult.error !== null) {
            const err = createResult.error as any;
            errorMsg = err.message || err.details || 'Unknown error';
          }
          console.error('Student creation error details:', createResult.error);
        }
        setError(errorMsg);
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Error adding student';
      setError(errorMsg);
      console.error('Exception adding student:', err);
    }
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Class Management</h2>
        <button
          onClick={() => setShowAddClass(!showAddClass)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
        >
          <Plus size={20} />
          Add New Class
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded flex items-center gap-2">
          <AlertCircle size={20} />
          {error}
        </div>
      )}

      {/* Add New Class Form */}
      {showAddClass && (
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h3 className="text-lg font-semibold mb-4">Create New Class</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <input
              type="text"
              placeholder="Class Name (e.g., 10A, 11B)"
              value={newClass.name}
              onChange={(e) => setNewClass({ ...newClass, name: e.target.value })}
              className="border border-gray-300 rounded px-3 py-2"
            />
            <input
              type="number"
              placeholder="Capacity (Strength)"
              value={newClass.capacity}
              onChange={(e) => setNewClass({ ...newClass, capacity: e.target.value })}
              className="border border-gray-300 rounded px-3 py-2"
              min="1"
            />
            <input
              type="text"
              placeholder="Subjects (e.g., Math, Science, English)"
              value={newClass.subjects}
              onChange={(e) => setNewClass({ ...newClass, subjects: e.target.value })}
              className="border border-gray-300 rounded px-3 py-2"
            />
            <div className="flex gap-2">
              <button
                onClick={handleAddClass}
                disabled={loading}
                className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-4 py-2 rounded"
              >
                {loading ? 'Creating...' : 'Create'}
              </button>
              <button
                onClick={() => setShowAddClass(false)}
                className="flex-1 bg-gray-400 hover:bg-gray-500 text-white px-4 py-2 rounded"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Classes List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading && classes.length === 0 ? (
          <div className="col-span-full text-center py-8 text-gray-500">Loading classes...</div>
        ) : classes.length === 0 ? (
          <div className="col-span-full text-center py-8 text-gray-500">No classes yet. Create one to get started!</div>
        ) : (
          classes.map((classItem) => (
            <div key={classItem.id} className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition">
              {/* Class Header */}
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">{normalizeString(classItem.class_name)}</h3>
                </div>
              </div>

              {/* Capacity Info */}
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <Users size={18} className="text-blue-600" />
                  <span className="text-sm font-semibold">Capacity</span>
                </div>
                <div className="bg-blue-50 p-3 rounded">
                  <div className="text-sm text-gray-600">
                    <span className="font-semibold text-blue-700">{classItem.current_students}</span>
                    {' / '}
                    <span className="font-semibold text-blue-700">{classItem.max_students}</span> students
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all"
                      style={{
                        width: `${(classItem.current_students / classItem.max_students) * 100}%`,
                      }}
                    />
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {classItem.max_students - classItem.current_students} seats available
                  </div>
                </div>
              </div>

              {/* Edit Capacity */}
              <div className="mb-4">
                {editCapacity[classItem.id] ? (
                  <div className="flex gap-2">
                    <input
                      type="number"
                      value={editCapacity[classItem.id]}
                      onChange={(e) =>
                        setEditCapacity({ ...editCapacity, [classItem.id]: parseInt(e.target.value) })
                      }
                      className="flex-1 border border-gray-300 rounded px-2 py-1 text-sm"
                      min="1"
                    />
                    <button
                      onClick={() => handleUpdateCapacity(classItem.id, classItem.class_name)}
                      disabled={loading}
                      className="bg-green-600 hover:bg-green-700 text-white px-2 py-1 rounded text-sm"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setEditCapacity({ ...editCapacity, [classItem.id]: 0 })}
                      className="bg-gray-400 hover:bg-gray-500 text-white px-2 py-1 rounded text-sm"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setEditCapacity({ ...editCapacity, [classItem.id]: classItem.max_students })}
                    className="w-full flex items-center justify-center gap-2 text-blue-600 hover:text-blue-700 py-2"
                  >
                    <Edit2 size={16} />
                    Edit Capacity
                  </button>
                )}
              </div>

              {/* Edit Subjects */}
              <div className="mb-4">
                {editSubjects[classItem.id] !== undefined ? (
                  <div className="space-y-4 bg-gradient-to-br from-blue-50 to-indigo-50 p-5 rounded-lg border border-blue-100 shadow-sm">
                    <div className="flex items-center gap-2">
                      <BookOpen size={16} className="text-blue-600" />
                      <label className="text-sm font-semibold text-gray-700">Manage Class Subjects</label>
                    </div>
                    
                    {/* Success Message */}
                    {success && (
                      <div className="bg-green-50 border border-green-200 text-green-700 px-3 py-2 rounded text-xs">
                        {success}
                      </div>
                    )}
                    
                    {/* Error Message */}
                    {error && (
                      <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-xs">
                        {error}
                      </div>
                    )}
                    
                    {/* Current Subjects List */}
                    <div className="flex flex-col gap-2">
                      <label className="text-xs font-semibold text-gray-600">Current Subjects ({editSubjects[classItem.id]?.split(',').filter(s => s.trim()).length || 0})</label>
                      <div className="flex flex-wrap gap-2 bg-white p-4 rounded-lg border border-gray-200 min-h-[80px] items-center">
                        {editSubjects[classItem.id] && editSubjects[classItem.id].trim().length > 0 ? (
                          editSubjects[classItem.id]
                            .split(',')
                            .map((subject) => subject.trim())
                            .filter((s) => s.length > 0)
                            .map((subject, idx) => (
                              <span
                                key={`${subject}-${idx}`}
                                className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-500 to-indigo-500 text-white px-4 py-2 rounded-full text-sm font-medium shadow-sm hover:shadow-md transition"
                              >
                                {normalizeString(subject)}
                                <button
                                  onClick={() => handleDeleteSingleSubject(classItem.id, subject)}
                                  className="ml-1 text-white hover:bg-red-600 hover:bg-opacity-80 rounded-full p-0.5 transition"
                                  title="Remove this subject"
                                  type="button"
                                >
                                  <span className="text-lg font-bold">×</span>
                                </button>
                              </span>
                            ))
                        ) : (
                          <span className="text-gray-400 text-sm italic">
                            No subjects yet. Add one below.
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Add New Subject Section */}
                    <div className="flex flex-col gap-2 border-t border-blue-200 pt-3">
                      <label className="text-xs font-semibold text-gray-600">Add New Subject</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={newSubjectInput[classItem.id] || ''}
                          onChange={(e) =>
                            setNewSubjectInput({ ...newSubjectInput, [classItem.id]: e.target.value })
                          }
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              handleAddSingleSubject(classItem.id);
                            }
                          }}
                          placeholder="e.g., Mathematics, Physics..."
                          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                        />
                        <button
                          onClick={() => handleAddSingleSubject(classItem.id)}
                          disabled={loading}
                          className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg text-sm font-medium transition flex items-center gap-1"
                        >
                          <Plus size={16} />
                          Add
                        </button>
                      </div>
                      <p className="text-xs text-gray-500">Press Enter or click Add to add a subject</p>
                    </div>

                    {/* Save/Cancel Buttons */}
                    <div className="flex gap-2 pt-2 border-t border-blue-200">
                      <button
                        onClick={() => handleUpdateSubjects(classItem.id, classItem.class_name)}
                        disabled={loading}
                        className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-3 py-2 rounded-lg text-sm font-medium transition"
                      >
                        Save All Subjects
                      </button>
                      <button
                        onClick={() => {
                          // Remove the classItem.id key entirely from editSubjects to exit edit mode
                          const { [classItem.id]: _, ...restEditSubjects } = editSubjects;
                          setEditSubjects(restEditSubjects);
                          
                          // Clear the input
                          const { [classItem.id]: __, ...restNewSubjectInput } = newSubjectInput;
                          setNewSubjectInput(restNewSubjectInput);
                          
                          setError('');
                          setSuccess('');
                          console.log('Edit mode cancelled');
                        }}
                        className="flex-1 bg-gray-400 hover:bg-gray-500 text-white px-3 py-2 rounded-lg text-sm font-medium transition"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                        <BookOpen size={16} className="text-purple-600" />
                        Subjects
                      </span>
                      <button
                        onClick={() => setEditSubjects({ ...editSubjects, [classItem.id]: classItem.subjects || '' })}
                        className="text-blue-600 hover:text-blue-700 transition"
                      >
                        <Edit2 size={16} />
                      </button>
                    </div>
                    <div className="bg-gradient-to-br from-purple-50 to-indigo-50 p-4 rounded-lg border border-purple-100">
                      {classItem.subjects ? (
                        <div className="flex flex-wrap gap-2">
                          {classItem.subjects
                            .split(',')
                            .map((subject) => subject.trim())
                            .filter((s) => s)
                            .map((subject, idx) => (
                              <span
                                key={idx}
                                className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-500 to-indigo-500 text-white px-3 py-1 rounded-full text-xs font-medium shadow-sm hover:shadow-md transition"
                              >
                                {normalizeString(subject)}
                              </span>
                            ))}
                        </div>
                      ) : (
                        <div className="flex items-center justify-center py-6">
                          <span className="text-gray-400 text-sm italic">No subjects assigned yet</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Add Student Button */}
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setSelectedClass(classItem);
                    setStudentForm({ ...studentForm, classId: classItem.id });
                    setShowAddStudentModal(true);
                  }}
                  disabled={classItem.current_students >= classItem.max_students}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 py-2 rounded flex items-center justify-center gap-2"
                >
                  <Plus size={18} />
                  Add Student
                </button>
                <button
                  onClick={() => setDeleteConfirmClass(classItem)}
                  className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded flex items-center justify-center gap-2"
                  title="Delete this class"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add Student Modal */}
      {showAddStudentModal && selectedClass && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold mb-4">Add Student to {normalizeString(selectedClass.class_name)}</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Student Name *</label>
                <input
                  type="text"
                  placeholder="Full Name"
                  value={studentForm.studentName}
                  onChange={(e) => setStudentForm({ ...studentForm, studentName: e.target.value })}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                <input
                  type="email"
                  placeholder="student@example.com"
                  value={studentForm.email}
                  onChange={(e) => setStudentForm({ ...studentForm, email: e.target.value })}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input
                  type="tel"
                  placeholder="+91-XXXXXXXXXX"
                  value={studentForm.phone}
                  onChange={(e) => setStudentForm({ ...studentForm, phone: e.target.value })}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Initial Password *</label>
                <input
                  type="password"
                  placeholder="Enter initial password (min 6 characters)"
                  value={studentForm.password}
                  onChange={(e) => setStudentForm({ ...studentForm, password: e.target.value })}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                />
                <p className="text-xs text-gray-500 mt-1">Student will be required to change this on first login</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Register Number (Optional)</label>
                <input
                  type="text"
                  placeholder="Leave blank for auto-generation"
                  value={studentForm.register_no}
                  onChange={(e) => setStudentForm({ ...studentForm, register_no: e.target.value })}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                />
                <p className="text-xs text-gray-500 mt-1">If empty, will be auto-generated as STU001, STU002, etc.</p>
              </div>

              <div className="flex gap-2 pt-4">
                <button
                  onClick={handleAddStudent}
                  disabled={loading}
                  className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-4 py-2 rounded font-medium"
                >
                  {loading ? 'Adding...' : 'Add Student'}
                </button>
                <button
                  onClick={() => {
                    setShowAddStudentModal(false);
                    setSelectedClass(null);
                    setStudentForm({ classId: '', studentName: '', register_no: '', email: '', phone: '', password: '' });
                  }}
                  className="flex-1 bg-gray-400 hover:bg-gray-500 text-white px-4 py-2 rounded font-medium"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Class Confirmation Modal */}
      {deleteConfirmClass && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-md w-full mx-4">
            <h3 className="text-xl font-bold text-red-600 mb-4 flex items-center gap-2">
              <AlertCircle size={24} />
              Delete Class?
            </h3>
            
            <p className="text-gray-700 mb-2">
              Are you sure you want to delete the class <strong>{deleteConfirmClass.class_name}</strong>?
            </p>
            
            <p className="text-gray-600 text-sm mb-4">
              This action cannot be undone. Make sure all students have been transferred to another class first.
            </p>

            <div className="flex gap-3">
              <button
                onClick={async () => await handleDeleteClass(deleteConfirmClass)}
                disabled={loading}
                className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white px-4 py-2 rounded font-medium"
              >
                {loading ? 'Deleting...' : 'Delete'}
              </button>
              <button
                onClick={() => setDeleteConfirmClass(null)}
                disabled={loading}
                className="flex-1 bg-gray-400 hover:bg-gray-500 disabled:bg-gray-400 text-white px-4 py-2 rounded font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
