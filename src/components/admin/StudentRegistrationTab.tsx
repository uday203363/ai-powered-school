/**
 * Student Registration Management Tab
 * Handles creation, search, and lifecycle management of students with register numbers
 */

import React, { useState, useEffect } from 'react';
import { Card, Button, Input } from '../common';
import { 
  createStudent, 
  getAllStudents, 
  updateStudent, 
  updateStudentStatus,
  reactivateStudent 
} from '../../services/studentService';
import { classConfigService } from '../../services/database';
import { generateNextRegisterNumber } from '../../services/registerNumber';
import { supabase } from '../../services/supabase';
import { apiRequest } from '../../services/apiClient';
import { Search, Plus, Trash2, Edit2, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

interface Student {
  id: string;
  register_no: string;
  name: string;
  email: string;
  class: string;
  admission_year: number;
  status: 'Active' | 'Inactive' | 'Transferred' | 'Dropped' | 'Left' | 'Graduated';
  phone?: string;
  father_name?: string;
  gender?: 'Male' | 'Female' | '';
  accommodation_type?: 'Hostel' | 'Day Scholar' | '';
  initial_fee?: number;
  current_fee?: number;
}

interface ClassConfig {
  id: string;
  class_name: string;
  max_students: number;
  current_students: number;
}

export const StudentRegistrationTab: React.FC = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    class: '',
    status: 'Active' as 'Active' | 'Inactive' | 'Transferred' | 'Dropped' | 'Left' | 'Graduated',
    password: '',
    phone: '',
    father_name: '',
    gender: '' as 'Male' | 'Female' | '',
    accommodation_type: '' as 'Hostel' | 'Day Scholar' | '',
    initial_fee: 0,
  });
  const [statusFilter, setStatusFilter] = useState<'All' | 'Active' | 'Inactive' | 'Transferred' | 'Dropped' | 'Left' | 'Graduated'>('All');
  const [updatingStatusFor, setUpdatingStatusFor] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [availableClasses, setAvailableClasses] = useState<ClassConfig[]>([]);
  const [classesLoading, setClassesLoading] = useState(false);

  // For class promotion feature
  const [searchRegisterNo, setSearchRegisterNo] = useState('');
  const [foundStudent, setFoundStudent] = useState<Student | null>(null);
  const [newCurrentFee, setNewCurrentFee] = useState(0);
  const [promoteFromClass, setPromoteFromClass] = useState<string>('');
  const [selectedStudentForPromotion, setSelectedStudentForPromotion] = useState<string>('');

  useEffect(() => {
    loadStudents();
    loadAvailableClasses();
  }, []);

  // Debug: log students loaded for the select dropdown
  useEffect(() => {
    try {
      console.log('🔎 Dropdown students (active):', students.filter(s => !s.status || s.status === 'Active').map(s => ({ name: s.name, register_no: s.register_no })));
    } catch (err) {
      console.error('Error logging students for dropdown', err);
    }
  }, [students]);

  useEffect(() => {
    filterStudents();
  }, [students, searchTerm, statusFilter]);

  const loadAvailableClasses = async () => {
    setClassesLoading(true);
    try {
      console.log('📚 Loading available classes...');
      const result = await classConfigService.getAllClassConfigs();
      console.log('📚 Classes loaded:', { success: result.success, count: result.data?.length, data: result.data });
      
      if (result.success) {
        setAvailableClasses(result.data);
        // Set default class to first available class
        if (result.data.length > 0 && !formData.class) {
          setFormData(prev => ({ ...prev, class: result.data[0].class_name }));
        }
      } else {
        console.error('❌ Failed to load classes:', result.error);
        setErrorMessage(`Failed to load classes: ${result.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('❌ Error loading classes:', error);
      setErrorMessage(`Error loading classes: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setClassesLoading(false);
    }
  };

  const loadStudents = async () => {
    setIsLoading(true);
    try {
      const result = await getAllStudents();
      if (result.data) {
        setStudents(result.data);
      }
    } catch (error) {
      console.error('Error loading students:', error);
      setErrorMessage('Failed to load students');
    } finally {
      setIsLoading(false);
    }
  };

  const filterStudents = () => {
    let filtered = students;

    // Filter by status
    if (statusFilter !== 'All') {
      filtered = filtered.filter(s => s.status === statusFilter);
    }

    // Filter by search term (register_no, name, email)
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(s => 
        s.register_no.toLowerCase().includes(term) ||
        s.name.toLowerCase().includes(term) ||
        s.email.toLowerCase().includes(term)
      );
    }

    setFilteredStudents(filtered);
  };

  const handleCreateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const year = new Date().getFullYear();
      console.log('🔄 Creating student...', { name: formData.name, email: formData.email });
      
      const result = await createStudent({
        name: formData.name.toUpperCase(), // ✅ UPPERCASE
        email: formData.email,
        password: formData.password || 'DefaultPassword123!',
        class: formData.class.toUpperCase(), // ✅ UPPERCASE
        status: formData.status,
        phone: formData.phone,
        father_name: formData.father_name.toUpperCase(), // ✅ UPPERCASE
        gender: formData.gender || null,
        accommodation_type: formData.accommodation_type?.toUpperCase() || null, // ✅ UPPERCASE
        initial_fee: formData.initial_fee || 0,
      });

      console.log('📋 Creation result:', result);

      if (result.success) {
        // Automatically create fee record if initial_fee is set
        if (formData.initial_fee && formData.initial_fee > 0 && result.data?.id) {
          const currentMonth = new Date().getMonth() + 1;
          const currentYear = new Date().getFullYear();
          
          try {
            const feeResult = await apiRequest('/fees', {
              method: 'POST',
              body: JSON.stringify({
                student_id: result.data.id,
                month: currentMonth,
                year: currentYear,
                total_amount: formData.initial_fee,
                paid_amount: 0,
                status: 'pending',
                notes: `Initial fee set during student registration for ${formData.name}`,
              }),
            });

            if (!feeResult.success) {
              console.warn('⚠️ Warning: Could not create initial fee record:', feeResult.error);
            } else {
              console.log('✅ Initial fee record created');
            }
          } catch (feeErr) {
            console.warn('⚠️ Warning: Error creating fee record:', feeErr);
          }
        }
        
        setSuccessMessage(`✅ Student created successfully with Register No: ${result.data?.register_no || '(generating...)'}`);
        setFormData({ name: '', email: '', class: '1A', status: 'Active', password: '', phone: '', father_name: '', gender: '', accommodation_type: '', initial_fee: 0 });
        setShowForm(false);
        loadStudents();
        loadAvailableClasses(); // Refresh class strength
      } else {
        const errorMsg = result.error || 'Failed to create student';
        console.error('❌ Error:', errorMsg);
        setErrorMessage(errorMsg);
      }
    } catch (error: any) {
      const errMsg = error.message || 'Error creating student';
      console.error('❌ Exception:', error);
      setErrorMessage(errMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent) return;

    setIsLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      console.log(`📝 Updating student: ${editingStudent.register_no}`);
      console.log('Form data:', {
        name: formData.name,
        email: formData.email,
        class: formData.class,
        phone: formData.phone,
        father_name: formData.father_name,
        password: formData.password ? '***' : 'not set',
      });

      const result = await updateStudent(editingStudent.register_no, {
        name: formData.name.toUpperCase(), // ✅ UPPERCASE
        email: formData.email,
        class: formData.class.toUpperCase(), // ✅ UPPERCASE
        status: formData.status,
        phone: formData.phone,
        father_name: formData.father_name.toUpperCase(), // ✅ UPPERCASE
        gender: formData.gender || null,
        accommodation_type: formData.accommodation_type?.toUpperCase() || null, // ✅ UPPERCASE
        initial_fee: formData.initial_fee || 0,
        ...(formData.password && { password: formData.password }),
      });

      console.log('📋 Update result:', result);

      if (result.success) {
        setSuccessMessage(`✅ ${formData.name} updated successfully`);
        setFormData({ name: '', email: '', class: '1A', status: 'Active', password: '', phone: '', father_name: '', gender: '', accommodation_type: '', initial_fee: 0 });
        setEditingStudent(null);
        setShowForm(false);
        loadStudents();
        loadAvailableClasses(); // Refresh class strength
      } else {
        const errorMsg = result.error || 'Failed to update student';
        console.error('❌ Update error:', errorMsg);
        setErrorMessage(errorMsg);
      }
    } catch (error: any) {
      const errorMsg = error.message || String(error);
      console.error('❌ Exception during update:', error);
      setErrorMessage(`Error updating student: ${errorMsg}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditClick = (student: Student) => {
    setEditingStudent(student);
    setFormData({
      name: student.name,
      email: student.email,
      class: student.class,
      status: (student.status as 'Active' | 'Inactive' | 'Transferred' | 'Dropped' | 'Left' | 'Graduated') || 'Active',
      password: '',
      phone: student.phone || '',
      father_name: student.father_name || '',
      gender: (student.gender as 'Male' | 'Female' | '') || '',
      accommodation_type: (student.accommodation_type as 'Hostel' | 'Day Scholar' | '') || '',
        initial_fee: student.initial_fee || 0,
    });
    setShowForm(true);
  };

  const handleDeactivateStudent = async (student: Student) => {
    if (!confirm(`Are you sure you want to deactivate ${student.name}?`)) return;

    setIsLoading(true);
    setErrorMessage('');
    setSuccessMessage('');
    try {
      console.log(`🔄 Deactivating student: ${student.register_no}`);
      const result = await deactivateStudent(student.register_no);
      console.log(`📊 Deactivate result:`, result);
      if (result.success) {
        setSuccessMessage(`✅ ${student.name} deactivated successfully`);
        await loadStudents();
      } else {
        setErrorMessage(result.error || 'Failed to deactivate student');
      }
    } catch (error: any) {
      console.error('❌ Error deactivating student:', error);
      setErrorMessage(error.message || 'Error deactivating student');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReactivateStudent = async (student: Student) => {
    setIsLoading(true);
    setErrorMessage('');
    setSuccessMessage('');
    try {
      console.log(`🔄 Reactivating student: ${student.register_no}`);
      const result = await reactivateStudent(student.register_no);
      console.log(`📊 Reactivate result:`, result);
      if (result.success) {
        setSuccessMessage(`✅ ${student.name} reactivated successfully`);
        await loadStudents();
      } else {
        setErrorMessage(result.error || 'Failed to reactivate student');
      }
    } catch (error: any) {
      console.error('❌ Error reactivating student:', error);
      setErrorMessage(error.message || 'Error reactivating student');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearchStudentByRegisterNo = async () => {
    if (!searchRegisterNo.trim()) {
      setErrorMessage('Please enter a register number');
      return;
    }

    setErrorMessage('');
    setSuccessMessage('');
    
    const student = students.find(s => s.register_no === searchRegisterNo);
    if (student) {
      setFoundStudent(student);
      setNewClass(student.class); // Pre-fill with current class
      setNewCurrentFee(student.initial_fee || 0); // Pre-fill with student's initial fee
    } else {
      setErrorMessage(`Student with register number ${searchRegisterNo} not found`);
      setFoundStudent(null);
      setNewClass('');
      setNewCurrentFee(0);
    }
  };

  const handlePromoteStudentToNextClass = async () => {
    if (!foundStudent || !promoteFromClass.trim()) {
      setErrorMessage('Please select a class to promote to');
      return;
    }

    if (promoteFromClass === foundStudent.class) {
      setErrorMessage('New class must be different from current class');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      console.log(`🎓 Promoting student ${foundStudent.register_no} to class ${promoteFromClass} with current fee: ₹${newCurrentFee}`);
      const result = await updateStudent(foundStudent.register_no, {
        class: promoteFromClass.toUpperCase(), // ✅ UPPERCASE
        current_fee: newCurrentFee || 0,
      });

      if (result.success) {
        setSuccessMessage(`✅ ${foundStudent.name} promoted to class ${promoteFromClass} with updated fee ₹${newCurrentFee} for next academic year`);
        setSearchRegisterNo('');
        setFoundStudent(null);
        setNewCurrentFee(0);
        setPromoteFromClass('');
        setSelectedStudentForPromotion('');
        await loadStudents();
        await loadAvailableClasses(); // Refresh class strength
      } else {
        setErrorMessage(result.error || 'Failed to promote student');
      }
    } catch (error: any) {
      console.error('❌ Error promoting student:', error);
      setErrorMessage(error.message || 'Error promoting student');
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusColors: { [key: string]: string } = {
      'Active': 'bg-green-100 text-green-800',
      'Inactive': 'bg-gray-100 text-gray-800',
      'Transferred': 'bg-blue-100 text-blue-800',
      'Dropped': 'bg-red-100 text-red-800',
      'Left': 'bg-yellow-100 text-yellow-800',
    };
    return statusColors[status] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="space-y-6">
      {/* Messages */}
      {successMessage && (
        <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg flex items-center gap-2">
          <CheckCircle size={20} />
          {successMessage}
        </div>
      )}
      {errorMessage && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg flex items-center gap-2">
          <XCircle size={20} />
          {errorMessage}
        </div>
      )}

      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Student Registration Management</h2>
          <p className="text-gray-600 mt-1">Total Students: {students.length}</p>
        </div>
        <Button
          onClick={() => {
            setShowForm(!showForm);
            setEditingStudent(null);
            if (!showForm) {
              const defaultClass = availableClasses.length > 0 ? availableClasses[0].class_name : '';
              setFormData({ name: '', email: '', class: defaultClass, status: 'Active', password: '', phone: '', father_name: '', gender: '', accommodation_type: '', initial_fee: 0 });
            }
          }}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
        >
          <Plus size={20} />
          Add New Student
        </Button>
      </div>

      {/* Registration Form */}
      {showForm && (
        <Card className="p-6 border-2 border-blue-300 bg-blue-50">
          <h3 className="text-lg font-semibold mb-4">
            {editingStudent ? 'Edit Student' : 'Register New Student'}
          </h3>
          <form onSubmit={editingStudent ? handleUpdateStudent : handleCreateStudent} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Student Name *</label>
                <Input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter student name"
                  required
                  disabled={isLoading}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email *</label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="student@school.com"
                  required
                  disabled={isLoading}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Class *</label>
                {availableClasses.length > 0 ? (
                  <select
                    value={formData.class}
                    onChange={(e) => setFormData({ ...formData, class: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    required
                    disabled={isLoading || classesLoading}
                  >
                    <option value="">Select a class</option>
                    {availableClasses.map((cls) => (
                      <option key={cls.id} value={cls.class_name}>
                        {cls.class_name} ({cls.current_students}/{cls.max_students})
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex items-center gap-2 text-sm text-yellow-800">
                    <AlertCircle size={16} />
                    <span>No classes configured. Please create classes first.</span>
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Status *</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as 'Active' | 'Inactive' | 'Transferred' | 'Dropped' | 'Left' | 'Graduated' })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  required
                  disabled={isLoading}
                >
                  <option value="Active">Active</option>
                  <option value="Graduated">Graduated</option>
                  <option value="Inactive">Inactive</option>
                  <option value="Transferred">Transferred</option>
                  <option value="Dropped">Dropped</option>
                  <option value="Left">Left</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Initial Password *</label>
                <Input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Enter initial password for student"
                  required={!editingStudent}
                  disabled={isLoading}
                />
                {editingStudent && <p className="text-xs text-gray-500 mt-1">Leave blank to keep existing password</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                <Input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="Enter phone number"
                  disabled={isLoading}
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Father's Name</label>
                <Input
                  type="text"
                  value={formData.father_name}
                  onChange={(e) => setFormData({ ...formData, father_name: e.target.value })}
                  placeholder="Enter father's name"
                  disabled={isLoading}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Gender</label>
                <select
                  value={formData.gender}
                  onChange={(e) => setFormData({ ...formData, gender: e.target.value as 'Male' | 'Female' | '' })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  disabled={isLoading}
                >
                  <option value="">Select Gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Accommodation Type</label>
                <select
                  value={formData.accommodation_type}
                  onChange={(e) => setFormData({ ...formData, accommodation_type: e.target.value as 'Hostel' | 'Day Scholar' | '' })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  disabled={isLoading}
                >
                  <option value="">Select Accommodation</option>
                  <option value="Hostel">Hostel</option>
                  <option value="Day Scholar">Day Scholar</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Initial Fee at Joining</label>
                <Input
                  type="number"
                  value={formData.initial_fee}
                  onChange={(e) => setFormData({ ...formData, initial_fee: e.target.value ? parseInt(e.target.value) : 0 })}
                  placeholder="Enter initial fee amount for this class"
                  disabled={isLoading}
                />
                <p className="text-xs text-gray-500 mt-1">This is the fee amount when student joins this class</p>
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditingStudent(null);
                }}
                className="bg-gray-500 hover:bg-gray-600"
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isLoading}
                className="bg-green-600 hover:bg-green-700"
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <span className="inline-block animate-spin">⏳</span>
                    {editingStudent ? 'Updating...' : 'Registering...'}
                  </span>
                ) : (
                  editingStudent ? 'Update Student' : 'Register Student'
                )}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Filters */}
      <div className="flex gap-4 items-end">
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
          <div className="relative">
            <Search className="absolute left-3 top-3 text-gray-400" size={20} />
            <Input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by Register No, Name, or Email"
              className="pl-10"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 rounded-lg"
          >
            <option>All</option>
            <option>Active</option>
            <option>Graduated</option>
            <option>Inactive</option>
            <option>Transferred</option>
            <option>Dropped</option>
            <option>Left</option>
          </select>
        </div>
      </div>

      {/* Students List */}
      <Card className="p-6">
        {filteredStudents.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">No students found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-gray-200">
                  <th className="text-left py-3 px-4 font-semibold">Register No</th>
                  <th className="text-left py-3 px-4 font-semibold">Name</th>
                  <th className="text-left py-3 px-4 font-semibold">Email</th>
                  <th className="text-left py-3 px-4 font-semibold">Class</th>
                  <th className="text-left py-3 px-4 font-semibold">Gender</th>
                  <th className="text-left py-3 px-4 font-semibold">Accommodation</th>
                  <th className="text-left py-3 px-4 font-semibold">Initial Fee</th>
                  <th className="text-left py-3 px-4 font-semibold">Year</th>
                  <th className="text-left py-3 px-4 font-semibold">Status</th>
                  <th className="text-left py-3 px-4 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map(student => (
                  <tr key={student.id} className="border-b border-gray-200 hover:bg-gray-50">
                    <td className="py-3 px-4 font-mono text-sm">{student.register_no}</td>
                    <td className="py-3 px-4">{student.name}</td>
                    <td className="py-3 px-4 text-sm">{student.email}</td>
                    <td className="py-3 px-4">{student.class}</td>
                    <td className="py-3 px-4 text-sm">{student.gender || '-'}</td>
                    <td className="py-3 px-4 text-sm">{student.accommodation_type || '-'}</td>
                    <td className="py-3 px-4 text-sm">₹{student.initial_fee || 0}</td>
                    <td className="py-3 px-4">{student.admission_year}</td>
                    <td className="py-3 px-4">
                      <select
                        value={student.status || 'Active'}
                        onChange={async (e) => {
                          setUpdatingStatusFor(student.id);
                          console.log(`\n${'='.repeat(60)}`);
                          console.log(`🔔 STATUS CHANGE EVENT TRIGGERED`);
                          console.log(`   Student: ${student.name}`);
                          console.log(`   Current register_no: ${student.register_no}`);
                          console.log(`   Event target value: "${e.target.value}"`);
                          console.log(`${'='.repeat(60)}\n`);
                          try {
                            const newStatus = e.target.value;
                            console.log(`📝 Processing new status: "${newStatus}"`);
                            console.log(`   Type: ${typeof newStatus}, Length: ${newStatus.length}`);
                            
                            // First update the status
                            console.log(`\n🔄 STEP 1: Calling updateStudentStatus`);
                            console.log(`   Parameters: id="${student.id}", status="${newStatus}"`);
                            const result = await updateStudentStatus(student.id, newStatus);
                            console.log(`📊 updateStudentStatus result:`, result);
                            
                            if (!result.success) {
                              console.error(`❌ FAILED: Status update failed with error: ${result.error}`);
                              setErrorMessage(result.error || 'Failed to update status');
                              setUpdatingStatusFor(null);
                              setTimeout(() => setErrorMessage(''), 3000);
                              return;
                            }
                            
                            console.log(`✅ Status updated successfully in database`);
                            
                            // Update local state with new status
                            console.log(`\n✅ STEP 2: Updating local UI state`);
                            const updatedStudents = students.map(s => 
                              s.id === student.id ? { ...s, status: newStatus as any } : s
                            );
                            setStudents(updatedStudents);
                            setSuccessMessage(`✓ Student status updated to ${newStatus}`);
                            setTimeout(() => setSuccessMessage(''), 3000);
                            console.log(`${'='.repeat(60)}\n`);
                          } catch (error) {
                            console.error(`\n❌ EXCEPTION CAUGHT: Error updating status`);
                            console.error(`   Error message: ${error instanceof Error ? error.message : String(error)}`);
                            console.error(`   Error stack: ${error instanceof Error ? error.stack : 'N/A'}`);
                            setErrorMessage(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
                            setTimeout(() => setErrorMessage(''), 3000);
                            console.log(`${'='.repeat(60)}\n`);
                          } finally {
                            setUpdatingStatusFor(null);
                          }
                        }}
                        disabled={updatingStatusFor === student.id}
                        className={`px-2 py-1 rounded-full text-xs font-semibold border cursor-pointer ${
                          student.status === 'Graduated'
                            ? 'bg-blue-100 text-blue-700 border-blue-300'
                            : student.status === 'Active'
                            ? 'bg-green-100 text-green-700 border-green-300'
                            : student.status === 'Inactive'
                            ? 'bg-yellow-100 text-yellow-700 border-yellow-300'
                            : student.status === 'Dropped'
                            ? 'bg-red-100 text-red-700 border-red-300'
                            : 'bg-gray-100 text-gray-700 border-gray-300'
                        }`}
                      >
                        <option value="Active">🟢 Active</option>
                        <option value="Graduated">🎓 Graduated</option>
                        <option value="Inactive">🟡 Inactive</option>
                        <option value="Transferred">🔄 Transferred</option>
                        <option value="Dropped">❌ Dropped</option>
                        <option value="Left">🚫 Left</option>
                      </select>
                    </td>
                    <td className="py-3 px-4">
                      <button
                        onClick={() => handleEditClick(student)}
                        className="p-2 hover:bg-blue-100 rounded text-blue-600 transition"
                        title="Edit"
                      >
                        <Edit2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Class Promotion Section */}
      <Card className="p-6 border-2 border-purple-300 bg-purple-50">
        <h3 className="text-lg font-semibold mb-4">🎓 Promote Student to Next Class (Next Academic Year)</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Search by Register Number *</label>
            <div className="flex gap-2">
              <Input
                type="text"
                value={searchRegisterNo}
                onChange={(e) => setSearchRegisterNo(e.target.value)}
                placeholder="e.g., 26SBPS0001"
                onKeyPress={(e) => e.key === 'Enter' && handleSearchStudentByRegisterNo()}
              />
              <Button
                onClick={handleSearchStudentByRegisterNo}
                className="bg-purple-600 hover:bg-purple-700 whitespace-nowrap"
              >
                <Search size={18} />
              </Button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Or Select Register Number *</label>
            <select
              value={selectedStudentForPromotion}
              onChange={(e) => {
                const val = e.target.value;
                setSelectedStudentForPromotion(val);

                if (!val) {
                  setFoundStudent(null);
                  setSearchRegisterNo('');
                  return;
                }

                const student = students.find(s => String(s.id) === String(val) || String(s.register_no) === String(val));
                if (student) {
                  // populate related fields for clarity
                  setFoundStudent(student);
                  setSearchRegisterNo(student.register_no || '');
                  setPromoteFromClass(student.class || '');
                  setNewCurrentFee((student as any).current_fee || 0);
                  console.log('Selected student for promotion:', student);
                } else {
                  console.warn('Selected student not found:', val);
                  setFoundStudent(null);
                }
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              <option value="">Select register number</option>
              {students.map((student) => (
                <option key={student.id} value={student.register_no} style={{ color: '#111' }}>
                  {student.register_no}
                </option>
              ))}
            </select>
          </div>
        </div>

        {foundStudent && (
          <div className="bg-white p-4 border border-purple-200 rounded-lg mb-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <p className="text-sm text-gray-600">Student Name</p>
                <p className="font-semibold">{foundStudent.name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Register Number</p>
                <p className="font-mono font-semibold">{foundStudent.register_no}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Current Class</p>
                <p className="font-semibold text-blue-600">{foundStudent.class}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Status</p>
                <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${getStatusBadge(foundStudent.status)}`}>
                  {foundStudent.status}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Promote Class *</label>
                {availableClasses.length > 0 ? (
                  <select
                    value={promoteFromClass}
                    onChange={(e) => setPromoteFromClass(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    required
                    disabled={classesLoading}
                  >
                    <option value="">Select class to promote from</option>
                    {availableClasses.map((cls) => (
                      <option key={cls.id} value={cls.class_name}>
                        {cls.class_name} ({cls.current_students}/{cls.max_students})
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex items-center gap-2 text-sm text-yellow-800">
                    <AlertCircle size={16} />
                    <span>No classes configured. Please create classes first.</span>
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Updated Current Fee (Optional)</label>
                <Input
                  type="number"
                  value={newCurrentFee}
                  onChange={(e) => setNewCurrentFee(e.target.value ? parseInt(e.target.value) : 0)}
                  placeholder="Enter fee for new class (if different)"
                />
                <p className="text-xs text-gray-500 mt-1">Leave as is or update the fee amount for the new class</p>
              </div>
            </div>

            <div className="mt-4 flex gap-2">
              <Button
                onClick={handlePromoteStudentToNextClass}
                disabled={isLoading}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                {isLoading ? 'Promoting...' : '✅ Promote to Next Class'}
              </Button>
              <Button
                onClick={() => {
                  setSearchRegisterNo('');
                  setFoundStudent(null);
                  setNewCurrentFee(0);
                  setPromoteFromClass('');
                  setSelectedStudentForPromotion('');
                }}
                className="bg-gray-600 hover:bg-gray-700"
              >
                Clear
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};
