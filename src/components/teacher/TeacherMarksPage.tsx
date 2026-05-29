import React, { useState, useEffect } from 'react';
import { Card, Button, Input, Modal, Table } from '../../components/common';
import { marksService, studentService, examService } from '../../services';
import { useAuth } from '../../contexts/AuthContext';
import { normalizeString } from '../../utils/normalize';
import { apiRequest } from '../../services/apiClient';
import { Plus, History, ChevronDown, ChevronUp } from 'lucide-react';

export const TeacherMarksPage: React.FC = () => {
  const { user } = useAuth();
  const isUuid = (value?: string): boolean =>
    !!value && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
  const [assignedClasses, setAssignedClasses] = useState<string[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [students, setStudents] = useState<any[]>([]);
  const [marks, setMarks] = useState<any[]>([]);
  const [exams, setExams] = useState<any[]>([]);
  const [selectedExam, setSelectedExam] = useState<string>('');
  const [showModal, setShowModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [studentHistory, setStudentHistory] = useState<any[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [expandedStudent, setExpandedStudent] = useState<string | null>(null);
  const [teacherSubjects, setTeacherSubjects] = useState<string[]>([]);
  const [isClassTeacher, setIsClassTeacher] = useState(false);
  const [formData, setFormData] = useState({
    student_id: '',
    subject: '',
    marks: '',
    total: '100',
    exam_name: '',
    assessment_type: 'formative' as 'formative' | 'summative',
  });

  // Initialize assigned classes
  useEffect(() => {
    if (user?.assigned_classes) {
      const classes = user.assigned_classes
        .split(',')
        .map((c: string) => normalizeString(c.trim()))
        .filter((c: string) => c.length > 0);
      setAssignedClasses(classes);
      if (classes.length > 0) {
        setSelectedClass(classes[0]);
      } else if (user?.class) {
        const normalizedClass = normalizeString(user.class);
        setAssignedClasses([normalizedClass]);
        setSelectedClass(normalizedClass);
      }
    } else if (user?.class) {
      const normalizedClass = normalizeString(user.class);
      setAssignedClasses([normalizedClass]);
      setSelectedClass(normalizedClass);
    }
  }, [user]);

  // Load data when class changes
  useEffect(() => {
    if (selectedClass) {
      loadData(selectedClass);
    }
  }, [selectedClass]);

  const loadData = async (classToLoad: string) => {
    setLoading(true);
    if (classToLoad) {
      // Parse teacher's subjects
      const subjects = user?.subjects 
        ? user.subjects.split(',').map((s: string) => s.trim()).filter((s: string) => s.length > 0)
        : [];
      setTeacherSubjects(subjects);

      // Check if teacher is a class teacher for this class (case-insensitive)
      const normalizedClassToLoad = classToLoad.trim().toLowerCase();
      const normalizedClassTeacherFor = user?.class_teacher_for?.trim().toLowerCase();
      const isTeacherForClass = normalizedClassTeacherFor === normalizedClassToLoad;
      setIsClassTeacher(isTeacherForClass);

      // Load students
      const studentResult = await studentService.getStudentsByClass(classToLoad);
      if (studentResult.success) {
        console.log(`✓ Students loaded for class "${classToLoad}":`, {
          count: studentResult.data?.length || 0,
          students: studentResult.data?.map(s => ({
            id: s.id,
            name: s.name,
            register_no: s.register_no,
            class: s.class,
          })) || [],
        });
        setStudents(studentResult.data || []);
      } else {
        console.error('✗ Failed to load students:', studentResult.error);
        alert(`Failed to load students for class ${classToLoad}: ${studentResult.error}`);
        setStudents([]);
      }

      // Load marks for the class
      const marksResult = await marksService.getMarksByClass(classToLoad);
      if (marksResult.success) {
        let filteredMarks = marksResult.data || [];
        
        // Validate data structure BEFORE any filtering
        console.log('📊 RAW DATA FROM DATABASE:', {
          success: marksResult.success,
          rawDataCount: filteredMarks.length,
          isArray: Array.isArray(filteredMarks),
        });
        
        // Show first few marks with all fields
        if (filteredMarks.length > 0) {
          console.log('📋 FIRST 3 MARKS STRUCTURE:');
          filteredMarks.slice(0, 3).forEach((m: any, idx: number) => {
            console.log(`Mark ${idx + 1}:`, {
              id: m.id?.substring(0, 8),
              student_id: m.student_id,
              student_id_length: m.student_id?.length,
              student_name: m.student_name,
              subject: m.subject,
              exam_name: m.exam_name,
              marks: m.marks,
              total: m.total,
              class: m.class,
              allKeys: Object.keys(m),
            });
          });
        }
        
        // If not a class teacher, filter to only show their subject marks
        if (!isTeacherForClass && subjects.length > 0) {
          const beforeFilter = filteredMarks.length;
          filteredMarks = filteredMarks.filter((mark: any) =>
            subjects.some((subject: string) =>
              subject.toLowerCase() === (mark.subject || '').toLowerCase()
            )
          );
          console.log(`📌 SUBJECT FILTER: ${beforeFilter} → ${filteredMarks.length} marks`);
        }
        
        setMarks(filteredMarks);
        console.log(`✅ FINAL MARKS STATE SET:`, {
          totalMarksLoaded: filteredMarks.length,
          classTeacher: isTeacherForClass,
          marks: filteredMarks.map((m: any) => ({
            id: m.id?.substring(0, 8),
            student_id: m.student_id?.substring(0, 8),
            student_name: m.student_name,
            register_no: m.register_no,
            subject: m.subject,
            exam_name: m.exam_name,
            marks: m.marks,
            total: m.total,
          })),
        });

      // Load exams for this class
      const examsResult = await examService.getExamsByClass(classToLoad);
      if (examsResult.success) {
        console.log(`✓ Exams loaded for class "${classToLoad}":`, examsResult.data);
        setExams(examsResult.data || []);
      } else {
        console.log('No exams found for this class');
        setExams([]);
      }
      }
    }
    setLoading(false);
  };

  const handleLoadStudentHistory = async (studentId: string) => {
    setLoading(true);
    const result = await marksService.getMarksByStudent(studentId);
    console.log('Student history loaded:', result);
    if (result.success) {
      let history = result.data || [];
      
      // If not a class teacher, filter to only show their subject marks
      if (!isClassTeacher && teacherSubjects.length > 0) {
        history = history.filter((mark: any) =>
          teacherSubjects.some((subject: string) =>
            subject.toLowerCase() === (mark.subject || '').toLowerCase()
          )
        );
      }
      
      setStudentHistory(history);
      const student = students.find((s) => s.id === studentId);
      setSelectedStudent(student);
      setShowHistoryModal(true);
    } else {
      alert('Failed to load student history');
    }
    setLoading(false);
  };

  const handleAddMarks = async () => {
    // STEP 1: Validate all required fields are filled
    if (!formData.student_id) {
      alert('Please select a student');
      return;
    }
    if (!formData.subject) {
      alert('Please select a subject');
      return;
    }
    if (!formData.exam_name || !selectedExam) {
      alert('Please select an exam');
      return;
    }
    if (!formData.marks) {
      alert('Please enter marks');
      return;
    }

    setLoading(true);
    
    try {
      let validTeacherId = user?.id || '';
      if (!isUuid(validTeacherId)) {
        const meResult = await apiRequest<any>('/auth/me', { method: 'GET' });
        const profileId = meResult.success ? meResult.data?.id : '';
        if (isUuid(profileId)) {
          validTeacherId = profileId;
        }
      }

      // STEP 2: Check if marks already exist for this exact combination (using UPPERCASE for consistency)
      const existingMark = marks.find((mark: any) =>
        mark.student_id === formData.student_id &&
        (mark.exam_name || '').toUpperCase() === formData.exam_name.toUpperCase() &&
        (mark.subject || '').toUpperCase() === formData.subject.toUpperCase()
      );

      console.log('🔍 Checking for existing marks:', {
        student_id: formData.student_id,
        exam_name: formData.exam_name,
        subject: formData.subject,
        found: !!existingMark,
        existingMarks: existingMark ? `${existingMark.marks}/${existingMark.total}` : 'none',
      });

      // STEP 3: Prepare marks data (convert text to UPPERCASE for consistency)
      const marksData = {
        student_id: formData.student_id,
        subject: formData.subject.toUpperCase(), // ✅ UPPERCASE
        marks: parseInt(formData.marks),
        total: parseInt(formData.total),
        teacher_id: isUuid(validTeacherId) ? validTeacherId : undefined,
        exam_name: formData.exam_name.toUpperCase(), // ✅ UPPERCASE
        assessment_type: formData.assessment_type,
      };

      let result;
      let actionType = 'added';

      if (existingMark) {
        // Update existing marks
        console.log('🔄 UPDATING EXISTING MARKS:', {
          markId: existingMark.id?.substring(0, 8),
          subject: formData.subject,
          exam: formData.exam_name,
          oldMarks: `${existingMark.marks}/${existingMark.total}`,
          newMarks: `${parseInt(formData.marks)}/${parseInt(formData.total)}`,
        });

        result = await marksService.updateMarks(existingMark.id, marksData);
        actionType = 'updated';
      } else {
        // Add new marks
        console.log('➕ ADDING NEW MARKS:', {
          subject: formData.subject,
          exam: formData.exam_name,
          marks: parseInt(formData.marks),
          total: parseInt(formData.total),
        });

        result = await marksService.addMarks(marksData);
      }

      if (result.success) {
        console.log(`✅ MARKS ${actionType.toUpperCase()} SUCCESSFULLY`);
        alert(`Marks ${actionType} successfully!`);
        // Reload all data to show updated marks
        await loadData(selectedClass);
        
        setShowModal(false);
        setSelectedExam('');
        setFormData({
          student_id: '',
          subject: '',
          marks: '',
          total: '100',
          exam_name: '',
          assessment_type: 'formative',
        });
      } else {
        const errorMsg = result.error || `Failed to ${actionType} marks. Please try again.`;
        console.error('Error details:', result.error);
        alert(`Failed to ${actionType} marks: ${errorMsg}`);
      }
    } catch (error) {
      console.error('Error in handleAddMarks:', error);
      alert('An error occurred while saving marks. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = () => {
    console.log('🎯 OPENING ADD MARKS MODAL');
    
    setFormData({
      student_id: '',
      subject: '',
      marks: '',
      total: '100',
      exam_name: '',
      assessment_type: 'formative',
    });
    setSelectedExam(''); // Clear previous exam
    setShowModal(true);
  };

  const mockMarksData = marks.length > 0 ? marks : [];

  const tableRows = mockMarksData.map((mark: any) => [
    normalizeString(mark.student?.name || mark.student_name || 'Unknown'),
    mark.subject?.toUpperCase() || '-',
    mark.exam_name?.toUpperCase() || '-',
    mark.marks,
    mark.total,
    ((mark.marks / mark.total) * 100).toFixed(1) + '%',
  ]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Upload Marks - {selectedClass}</h1>
        <div className="flex items-center space-x-4">
          {isClassTeacher ? (
            <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-semibold">
              Class Teacher
            </span>
          ) : (
            <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-semibold">
              Subject: {teacherSubjects.join(', ') || 'N/A'}
            </span>
          )}
          <Button onClick={handleOpenModal} className="flex items-center space-x-2">
            <Plus size={18} />
            <span>Add Marks</span>
          </Button>
        </div>
      </div>

      {assignedClasses.length > 1 && (
        <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-gray-900">Select Class</h3>
              <p className="text-sm text-gray-600 mt-1">Managing marks for {assignedClasses.length} classes</p>
            </div>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value.toUpperCase())}
              className="px-4 py-2 border-2 border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold bg-white"
            >
              {assignedClasses.map((cls) => (
                <option key={cls} value={cls.toUpperCase()}>
                  {cls.toUpperCase()}
                </option>
              ))}
            </select>
          </div>
        </Card>
      )}

      <Card>
        <h2 className="text-xl font-bold mb-4">Marks Record</h2>
        {tableRows.length > 0 ? (
          <Table
            headers={['Student', 'Subject', 'Exam Name', 'Marks', 'Total', 'Percentage']}
            rows={tableRows}
          />
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-500">No marks records yet. Add marks to get started.</p>
          </div>
        )}
      </Card>

      {/* Student History Expander */}
      <Card>
        <h2 className="text-xl font-bold mb-4">View Student Mark History</h2>
        <div className="space-y-2">
          {students.map((student) => (
            <div key={student.id} className="border rounded-lg">
              <button
                onClick={() => setExpandedStudent(expandedStudent === student.id ? null : student.id)}
                className="w-full p-4 flex justify-between items-center hover:bg-gray-50 transition"
              >
                <div className="text-left">
                  <p className="font-semibold text-gray-900">{student.name}</p>
                  <p className="text-sm text-gray-500">Reg No: {student.register_no}</p>
                </div>
                {expandedStudent === student.id ? (
                  <ChevronUp size={20} className="text-gray-500" />
                ) : (
                  <ChevronDown size={20} className="text-gray-500" />
                )}
              </button>

              {expandedStudent === student.id && (
                <div className="border-t p-4 bg-gray-50 space-y-3">
                  <Button
                    onClick={() => handleLoadStudentHistory(student.id)}
                    disabled={loading}
                    className="w-full flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    <History size={18} />
                    <span>View Complete History</span>
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      </Card>

      {/* Add Marks Modal */}
      <Modal 
        isOpen={showModal} 
        onClose={() => {
          setShowModal(false);
          setSelectedExam('');
          setFormData({
            student_id: '',
            subject: '',
            marks: '',
            total: '100',
            exam_name: '',
            assessment_type: 'formative',
          });
        }} 
        title="Add/Update Marks"
      >
        <div className="space-y-4">
          
          {/* 1. STUDENT SELECTION */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Student *</label>
            <select
              value={formData.student_id}
              onChange={async (e) => {
                const studentId = e.target.value;
                // Reset form when changing student
                setFormData({
                  student_id: studentId,
                  subject: '',
                  exam_name: '',
                  marks: '',
                  total: '100',
                  assessment_type: 'formative',
                });
                setSelectedExam('');
                
                // Load fresh marks from database
                if (studentId) {
                  const freshMarksResult = await marksService.getMarksByClass(selectedClass);
                  const freshMarks = freshMarksResult.data || [];
                  
                  console.log('👤 STUDENT SELECTED - Fresh marks loaded:', {
                    student_id: studentId.substring(0, 8) + '...',
                    total_marks_in_class: freshMarks.length,
                    marks_with_exam_names: freshMarks.map(m => ({
                      student_id: m.student_id?.substring(0, 8) + '...',
                      exam_name: m.exam_name,
                      subject: m.subject,
                      marks: `${m.marks}/${m.total}`,
                    })),
                  });
                  
                  setMarks(freshMarks);
                }
              }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">-- Select Student --</option>
              {students.map((student) => (
                <option key={student.id} value={student.id}>
                  {student.name} ({student.register_no})
                </option>
              ))}
            </select>
          </div>

          {/* 2. SUBJECT SELECTION */}
          {formData.student_id && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Subject *</label>
              {teacherSubjects.length > 0 ? (
                <select
                  value={formData.subject}
                  onChange={async (e) => {
                    const subject = e.target.value;
                    // Refresh marks when subject changes to ensure latest data
                    if (formData.student_id) {
                      const freshMarksResult = await marksService.getMarksByClass(selectedClass);
                      setMarks(freshMarksResult.data || []);
                    }
                    setFormData({ ...formData, subject: subject.toUpperCase() });
                  }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">-- Select Subject --</option>
                  {teacherSubjects.map((subject) => (
                    <option key={subject} value={subject}>{subject?.toUpperCase()}</option>
                  ))}
                </select>
              ) : (
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded text-yellow-800 text-sm">
                  No assigned subjects found for this teacher. Please ask admin to assign subjects.
                </div>
              )}
            </div>
          )}

          {/* 3. EXAM SELECTION */}
          {formData.student_id && formData.subject && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Exam Name *</label>
              {exams.length === 0 ? (
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded text-yellow-800 text-sm">
                  ⚠️ No exams created by admin
                </div>
              ) : (
                <select
                  value={selectedExam}
                  onChange={async (e) => {
                    const examId = e.target.value;
                    const exam = exams.find((ex) => ex.id === examId);
                    if (exam) {
                      // Combine exam_name with exam_number (fa-1)
                      const combinedExamName = exam.exam_number ? `${exam.exam_name}-${exam.exam_number}` : exam.exam_name;
                      
                      console.log('📝 EXAM SELECTED:', {
                        examId: examId,
                        exam_name_from_db: exam.exam_name,
                        exam_number: exam.exam_number,
                        combined_exam_name: combinedExamName,
                        year: exam.year,
                        class_name: exam.class_name,
                      });
                      
                      // Load fresh marks to ensure we have latest data
                      const freshMarksResult = await marksService.getMarksByClass(selectedClass);
                      const freshMarks = freshMarksResult.data || [];
                      
                      console.log('📊 FRESH MARKS LOADED:', {
                        totalMarksCount: freshMarks.length,
                        allMarksData: freshMarks.map((m: any) => ({
                          student_id: m.student_id?.substring(0, 8),
                          student_name: m.student_name,
                          exam_name: m.exam_name,
                          subject: m.subject,
                          marks: m.marks,
                          total: m.total,
                        })),
                      });
                      
                      // Check for existing marks with fresh data
                      const existingMark = freshMarks.find((m: any) => {
                        const studentMatch = m.student_id === formData.student_id;
                        const examMatch = (m.exam_name || '').toUpperCase() === combinedExamName.toUpperCase();
                        const subjectMatch = (m.subject || '').toUpperCase() === formData.subject.toUpperCase();
                        
                        console.log('🔎 CHECKING MARK:', {
                          mark: { exam: m.exam_name, subject: m.subject, student: m.student_id?.substring(0, 8) },
                          searching: { exam: combinedExamName, subject: formData.subject, student: formData.student_id?.substring(0, 8) },
                          matches: { studentMatch, examMatch, subjectMatch },
                        });
                        
                        return studentMatch && examMatch && subjectMatch;
                      });
                      
                      console.log('✨ FINAL RESULT:', {
                        found: !!existingMark,
                        existingMark: existingMark ? {
                          marks: existingMark.marks,
                          total: existingMark.total,
                          exam_name: existingMark.exam_name,
                          subject: existingMark.subject,
                        } : null,
                      });

                      // If existing marks found, pre-fill the form fields
                      if (existingMark) {
                        console.log('📌 PRE-FILLING FORM WITH EXISTING MARKS:', {
                          marks: existingMark.marks,
                          total: existingMark.total,
                        });
                        setFormData((prevFormData) => ({ 
                          ...prevFormData, 
                          exam_name: combinedExamName,
                          marks: String(existingMark.marks),
                          total: String(existingMark.total),
                        }));
                      } else {
                        console.log('✅ NO EXISTING MARKS - READY FOR NEW ENTRY');
                        setFormData((prevFormData) => ({ ...prevFormData, exam_name: combinedExamName }));
                      }
                      
                      setSelectedExam(examId);
                      setMarks(freshMarks);
                    }
                  }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">-- Select Exam --</option>
                  {exams.map((exam) => (
                    <option key={exam.id} value={exam.id}>
                      {exam.exam_number ? `${exam.exam_name}-${exam.exam_number}` : exam.exam_name}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          {/* 4. CHECK IF MARKS ALREADY EXIST */}
          {formData.student_id && formData.subject && formData.exam_name && (
            <>
              {(() => {
                // DEBUG: Log what we're searching for
                console.log('🔍 SEARCHING FOR MATCHING MARKS:', {
                  formData_student_id: formData.student_id.substring(0, 8) + '...',
                  formData_exam_name: formData.exam_name,
                  formData_subject: formData.subject,
                  marks_count: marks.length,
                  marks_list: marks.map((m: any) => ({
                    student_id: m.student_id?.substring(0, 8) + '...',
                    exam_name: m.exam_name,
                    subject: m.subject,
                  })),
                });

                const existing = marks.find((m: any) => {
                  const studentMatch = m.student_id === formData.student_id;
                  const examMatch = m.exam_name === formData.exam_name;
                  const subjectMatch = m.subject.toLowerCase() === formData.subject.toLowerCase();
                  
                  if (studentMatch && examMatch && subjectMatch) {
                    console.log('✅ FOUND MATCH:', {
                      student: studentMatch,
                      exam: examMatch,
                      subject: subjectMatch,
                      marks: `${m.marks}/${m.total}`,
                    });
                  }
                  
                  return studentMatch && examMatch && subjectMatch;
                });

                if (!existing) {
                  console.log('❌ NO MATCH FOUND. Debugging:');
                  marks.forEach((m: any) => {
                    console.log(`  Checking: ${m.subject} | ${m.exam_name}`);
                    console.log(`    student: ${m.student_id === formData.student_id} (${m.student_id.substring(0, 8)}... === ${formData.student_id.substring(0, 8)}...)`);
                    console.log(`    exam: ${m.exam_name === formData.exam_name} ("${m.exam_name}" === "${formData.exam_name}")`);
                    console.log(`    subject: ${m.subject.toLowerCase() === formData.subject.toLowerCase()} ("${m.subject}" === "${formData.subject}")`);
                  });
                }

                if (existing) {
                  return (
                    <div className="p-4 bg-orange-50 border-2 border-orange-300 rounded-lg">
                      <div className="font-bold text-orange-900 mb-2">
                        ⚠️ Marks Already Entered for This Combination
                      </div>
                      <div className="bg-white p-3 rounded border border-orange-200">
                        <div className="flex justify-between items-center">
                          <div>
                            <div className="font-semibold text-gray-900">{existing.subject}</div>
                            <div className="text-sm text-gray-600">{existing.exam_name}</div>
                          </div>
                          <div className="text-right">
                            <div className="text-2xl font-bold text-orange-700">
                              {existing.marks}/{existing.total}
                            </div>
                            <div className="text-xs text-orange-600">
                              ({((existing.marks / existing.total) * 100).toFixed(1)}%)
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="text-xs text-orange-700 mt-2 italic">
                        💡 Enter new marks below to update
                      </div>
                    </div>
                  );
                } else {
                  return (
                    <div className="p-3 bg-blue-50 border border-blue-300 rounded text-blue-800 text-sm">
                      ✓ Ready to add new marks
                    </div>
                  );
                }
              })()}
            </>
          )}

          {/* 5. MARKS INPUTS */}
          {formData.student_id && formData.subject && formData.exam_name && (
            <>
              {/* DEBUG: Show current form state */}
              <div className="p-2 bg-purple-100 border border-purple-300 rounded text-xs text-purple-800 mb-3">
                <div className="font-bold mb-1">🔍 DEBUG STATE:</div>
                <div>marks: "{formData.marks}" | total: "{formData.total}"</div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Marks *"
                  type="number"
                  placeholder="0"
                  value={formData.marks}
                  onChange={(e) => setFormData({ ...formData, marks: e.target.value })}
                />
                <Input
                  label="Total Marks"
                  type="number"
                  placeholder="100"
                  value={formData.total}
                  onChange={(e) => setFormData({ ...formData, total: e.target.value })}
                />
              </div>

              <Button 
                onClick={handleAddMarks} 
                disabled={loading} 
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-lg"
              >
                {loading ? '⏳ Saving...' : '✓ Save Marks'}
              </Button>
            </>
          )}
        </div>
      </Modal>

      {/* Student History Modal */}
      <Modal isOpen={showHistoryModal} onClose={() => setShowHistoryModal(false)} title={`Mark History - ${selectedStudent?.name}`}>
        <div className="space-y-4 max-h-96 overflow-y-auto">
          {studentHistory && studentHistory.length > 0 ? (
            <div className="space-y-3">
              {studentHistory.map((mark, index) => (
                <div key={index} className="border rounded-lg p-4 bg-gradient-to-r from-gray-50 to-white">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-semibold text-gray-900">{mark.subject}</p>
                      <p className="text-sm text-gray-600">{mark.exam_name || 'N/A'}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <p className="text-xs text-gray-500">Marks</p>
                      <p className="text-lg font-bold text-blue-600">{mark.marks}/{mark.total}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Percentage</p>
                      <p className="text-lg font-bold text-green-600">
                        {((mark.marks / mark.total) * 100).toFixed(1)}%
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Date</p>
                      <p className="text-sm text-gray-700">
                        {new Date(mark.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500">No marks history available for this student.</p>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};
