import React, { useState, useEffect } from 'react';
import { Card, Button, Input } from '../../components/common';
import { teacherService, classConfigService } from '../../services';
import { normalizeString } from '../../utils/normalize';
import { Users, BookOpen, Save, RotateCcw } from 'lucide-react';

export const AssignClassTeachersTab: React.FC = () => {
  const [classes, setClasses] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [assignments, setAssignments] = useState<{ [key: string]: string }>({});
  const [currentAssignments, setCurrentAssignments] = useState<{ [key: string]: any }>({});
  const [saveStatus, setSaveStatus] = useState<{ [key: string]: string }>({});

  const toClassKey = (value: unknown) =>
    normalizeString(value).replace(/\s+/g, '');

  const parseClassList = (value: unknown): string[] => {
    if (!value) return [];
    return String(value)
      .split(',')
      .map((c) => toClassKey(c.trim()))
      .filter((c) => c.length > 0);
  };

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load all classes
      const classResult = await classConfigService.getAllClassConfigs();
      console.log('Classes loaded:', classResult);
      if (classResult.success) {
        setClasses(classResult.data || []);
      }

      // Load all teachers
      const teacherResult = await teacherService.getAllTeachers();
      console.log('Teachers loaded:', teacherResult);
      if (teacherResult.success) {
        setTeachers(teacherResult.data || []);
        
        // Get current class teachers
        const current: { [key: string]: any } = {};
        if (classResult.success) {
          for (const cls of classResult.data || []) {
            const classTeacher = await teacherService.getClassTeacher(cls.class_name);
            console.log(`Class teacher for ${cls.class_name}:`, classTeacher);
            if (classTeacher.success && classTeacher.data) {
              current[cls.class_name] = classTeacher.data;
            }
          }
        }
        console.log('Current assignments:', current);
        setCurrentAssignments(current);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    }
    setLoading(false);
  };

  const getAssignedTeachersForClass = (className: string) => {
    const targetClass = toClassKey(className);

    const primaryMatches = teachers.filter((teacher: any) => {
      const assignedClasses = parseClassList(teacher.assigned_classes);
      const classTeacherFor = toClassKey(teacher.class_teacher_for || '');

      const teachesThisClass =
        assignedClasses.includes(targetClass) || classTeacherFor === targetClass;
      if (!teachesThisClass) return false;

      // Exclude teachers who are class teachers of another class.
      const isClassTeacherOfOtherClass =
        classTeacherFor.length > 0 && classTeacherFor !== targetClass;

      return !isClassTeacherOfOtherClass;
    });

    if (primaryMatches.length > 0) {
      return primaryMatches;
    }

    // Fallback: if no assigned_classes mapping exists, still allow free teachers to be assigned.
    return teachers.filter((teacher: any) => {
      const classTeacherFor = toClassKey(teacher.class_teacher_for || '');
      return classTeacherFor.length === 0 || classTeacherFor === targetClass;
    });
  };

  const handleAssignTeacher = async (className: string, teacherId: string) => {
    setLoading(true);
    setSaveStatus({ ...saveStatus, [className]: 'saving' });

    try {
      const result = await teacherService.assignClassTeacher(teacherId, className);
      
      if (result.success) {
        // Refresh from the server so the card reflects the saved assignment
        const refreshedTeacher = await teacherService.getClassTeacher(className);
        const teacher = refreshedTeacher.success && refreshedTeacher.data
          ? refreshedTeacher.data
          : teachers.find((t: any) => t.id === teacherId);
        setCurrentAssignments({
          ...currentAssignments,
          [className]: teacher,
        });
        // Reload all teachers so stale data doesn't cause issues on other classes
        const allTeachersResult = await teacherService.getAllTeachers();
        if (allTeachersResult.success) {
          setTeachers(allTeachersResult.data || []);
        }
        // Notify other admin tabs to refresh teacher lists
        try { window.dispatchEvent(new Event('teachersUpdated')); } catch (e) { /* ignore */ }
        setSaveStatus({ ...saveStatus, [className]: 'success' });
        setTimeout(() => {
          setSaveStatus({ ...saveStatus, [className]: '' });
        }, 2000);
      } else {
        setSaveStatus({ ...saveStatus, [className]: 'error' });
      }
    } catch (error) {
      console.error('Error assigning teacher:', error);
      setSaveStatus({ ...saveStatus, [className]: 'error' });
    }
    setLoading(false);
  };

  const handleRemoveClassTeacher = async (className: string) => {
    setLoading(true);
    setSaveStatus({ ...saveStatus, [className]: 'removing' });

    try {
      const currentTeacher = currentAssignments[className];
      if (currentTeacher) {
        const result = await teacherService.removeClassTeacher(className);
        
        if (result.success) {
          const newAssignments = { ...currentAssignments };
          delete newAssignments[className];
          setCurrentAssignments(newAssignments);
          // Reload all teachers to keep state fresh
          const allTeachersResult = await teacherService.getAllTeachers();
          if (allTeachersResult.success) {
            setTeachers(allTeachersResult.data || []);
          }
          // Notify other admin tabs to refresh
          try { window.dispatchEvent(new Event('teachersUpdated')); } catch (e) { /* ignore */ }
          setSaveStatus({ ...saveStatus, [className]: 'removed' });
          setTimeout(() => {
            setSaveStatus({ ...saveStatus, [className]: '' });
          }, 2000);
        }
      }
    } catch (error) {
      console.error('Error removing teacher:', error);
      setSaveStatus({ ...saveStatus, [className]: 'error' });
    }
    setLoading(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'saving':
        return 'text-blue-600';
      case 'success':
        return 'text-green-600';
      case 'removed':
        return 'text-green-600';
      case 'error':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const getStatusMessage = (status: string) => {
    switch (status) {
      case 'saving':
        return '⏳ Assigning...';
      case 'success':
        return '✅ Assigned!';
      case 'removed':
        return '✅ Removed!';
      case 'error':
        return '❌ Error! Please try again.';
      default:
        return '';
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Assign Class Teachers</h2>
        <p className="text-gray-600">
          Assign teachers as class teachers. Only teachers who are assigned to teach in a class will appear in the dropdown.
        </p>
      </div>

      {loading && classes.length === 0 ? (
        <Card>
          <div className="text-center py-8">
            <p className="text-gray-500">Loading classes and teachers...</p>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {classes.length > 0 ? (
            classes.map((cls: any) => {
              const currentTeacher = currentAssignments[cls.class_name];
              const availableTeachers = getAssignedTeachersForClass(cls.class_name);

              return (
                <Card key={cls.class_name} className="border-l-4 border-blue-500">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">Class {cls.class_name}</h3>
                      <p className="text-sm text-gray-600 mt-1">
                        Students: {cls.current_students} / {cls.max_students}
                      </p>
                    </div>
                    <span className={`text-sm font-semibold ${getStatusColor(saveStatus[cls.class_name])}`}>
                      {getStatusMessage(saveStatus[cls.class_name])}
                    </span>
                  </div>

                  <div className="space-y-4">
                    {/* Current Assignment */}
                    {currentTeacher ? (
                      <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                        <p className="text-sm text-gray-600 mb-2">Current Class Teacher:</p>
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="font-semibold text-gray-900">{currentTeacher.name}</p>
                            <p className="text-sm text-gray-600">
                              Reg No: {currentTeacher.register_no}
                            </p>
                            {currentTeacher.subjects && (
                              <p className="text-xs text-gray-500 mt-1">
                                Subjects: {currentTeacher.subjects}
                              </p>
                            )}
                          </div>
                          <Button
                            onClick={() => handleRemoveClassTeacher(cls.class_name)}
                            disabled={loading || saveStatus[cls.class_name] === 'removing'}
                            className="bg-red-600 hover:bg-red-700 text-sm"
                          >
                            <RotateCcw size={16} className="mr-1" />
                            Change
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                        <p className="text-yellow-800 font-semibold">No Class Teacher Assigned</p>
                      </div>
                    )}

                    {/* Assign Teachers */}
                    {availableTeachers.length > 0 ? (
                      <div className="space-y-3">
                        <p className="text-sm font-semibold text-gray-700">
                          Available Teachers for this Class:
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {availableTeachers.map((teacher: any) => (
                            <div
                              key={teacher.id}
                              className="p-3 border rounded-lg hover:bg-blue-50 transition"
                            >
                              <div className="flex justify-between items-start">
                                <div className="flex-1">
                                  <p className="font-semibold text-gray-900 text-sm">{teacher.name}</p>
                                  <p className="text-xs text-gray-600">Reg No: {teacher.register_no}</p>
                                  {teacher.subjects && (
                                    <p className="text-xs text-gray-500 mt-1">
                                      Teaches: {teacher.subjects}
                                    </p>
                                  )}
                                </div>
                                <Button
                                  onClick={() => handleAssignTeacher(cls.class_name, teacher.id)}
                                  disabled={
                                    loading ||
                                    saveStatus[cls.class_name] === 'saving' ||
                                    currentTeacher?.id === teacher.id
                                  }
                                  className={`text-sm flex-shrink-0 ml-2 ${
                                    currentTeacher?.id === teacher.id
                                      ? 'bg-green-600 hover:bg-green-700'
                                      : 'bg-blue-600 hover:bg-blue-700'
                                  }`}
                                >
                                  <Save size={14} />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                        <p className="text-gray-600 text-sm">
                          ℹ️ No teachers assigned to this class yet. Assign teachers to this class first.
                        </p>
                      </div>
                    )}
                  </div>
                </Card>
              );
            })
          ) : (
            <Card>
              <div className="text-center py-8">
                <p className="text-gray-500">No classes found. Please create classes first.</p>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Summary Card */}
      {classes.length > 0 && teachers.length > 0 && (
        <Card className="bg-blue-50 border-l-4 border-blue-500">
          <h3 className="font-bold text-gray-900 mb-3">📊 Summary</h3>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-gray-600 text-sm">Total Classes</p>
              <p className="text-2xl font-bold text-blue-600">{classes.length}</p>
            </div>
            <div>
              <p className="text-gray-600 text-sm">Teachers Assigned as Class Teachers</p>
              <p className="text-2xl font-bold text-green-600">{Object.keys(currentAssignments).length}</p>
            </div>
            <div>
              <p className="text-gray-600 text-sm">Unassigned Classes</p>
              <p className="text-2xl font-bold text-orange-600">{classes.length - Object.keys(currentAssignments).length}</p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};
