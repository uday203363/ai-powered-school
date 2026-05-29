import { useState, useEffect } from 'react';
import { Card, Button, Input } from '../common';
import { AlertCircle, CheckCircle, Plus, Edit2, Trash2 } from 'lucide-react';
import { authService } from '../../services';
import { generateNextTeacherRegisterNumber } from '../../services/registerNumber';
import { normalizeObject } from '../../utils/normalize';

interface TeacherForm {
  name: string;
  email: string;
  phone: string;
  register_no: string;
  password: string;
  subjects: string;
  gender: 'Male' | 'Female' | '';
}

interface Teacher extends TeacherForm {
  id: string;
  register_no: string;
}

export const AddTeacherTab: React.FC = () => {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [formData, setFormData] = useState<TeacherForm>({
    name: '',
    email: '',
    phone: '',
    register_no: '',
    password: '',
    subjects: '',
    gender: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    fetchTeachers();
  }, []);

  const fetchTeachers = async () => {
    try {
      const result = await authService.getUsersByRole('teacher');

      if (!result.success) {
        console.error('Error fetching teachers');
      } else {
        const normalized = (result.data || []).map((t: any) => normalizeObject(t));
        setTeachers(normalized);
      }
    } catch (err) {
      console.error('Error:', err);
    }
  };

  const handleEditTeacher = (teacher: Teacher) => {
    setEditingId(teacher.id);
    setFormData({
      name: teacher.name,
      email: teacher.email,
      phone: teacher.phone || '',
      register_no: teacher.register_no || '',
      password: '',
      subjects: teacher.subjects || '',
      gender: (teacher.gender as 'Male' | 'Female' | '') || '',
    });
    setError('');
  };

  const handleDeleteTeacher = async (teacherId: string, teacherName: string) => {
    if (!window.confirm(`Are you sure you want to delete teacher "${teacherName}"?`)) {
      return;
    }

    try {
      const result = await authService.deleteUser(teacherId);

      if (!result.success) {
        setError(`Failed to delete teacher: ${result.message || 'Unknown error'}`);
      } else {
        setSuccess(`✅ Teacher "${teacherName}" deleted successfully!`);
        fetchTeachers();
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (err) {
      setError(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim() || !formData.email.trim()) {
      setError('Name and email are required');
      return;
    }

    if (!editingId && !formData.password.trim()) {
      setError('Password is required for new teacher');
      return;
    }

    if (formData.email.length < 3) {
      setError('Please enter a valid email');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
        if (editingId) {
        // Update existing teacher
        const updateData: any = {
          name: formData.name ? formData.name.toUpperCase() : formData.name,
          email: formData.email,
          phone: formData.phone || null,
          register_no: formData.register_no || null,
          subjects: formData.subjects ? formData.subjects.toUpperCase() : formData.subjects,
          gender: formData.gender ? formData.gender.toUpperCase() : formData.gender,
        };

        if (formData.password.trim()) {
          updateData.password = formData.password;
        }

        const result = await authService.updateUser(editingId, updateData);

        if (!result.success) {
          setError(`Failed to update teacher: ${result.message || 'Unknown error'}`);
        } else {
          setSuccess(`✅ Teacher "${formData.name}" updated successfully!`);
          setFormData({ name: '', email: '', phone: '', register_no: '', password: '', subjects: '', gender: '' });
          setEditingId(null);
          fetchTeachers();
          setTimeout(() => setSuccess(''), 3000);
        }
      } else {
        // Create new teacher
        
        // Generate auto-increment teacher register number
        let registerNo = '';
        try {
          registerNo = await generateNextTeacherRegisterNumber('SBPS'); // Using SBPS as school code
          console.log('Generated teacher register number:', registerNo);
        } catch (genError) {
          console.error('Error generating teacher register number:', genError);
          setError(`Error generating teacher ID: ${genError instanceof Error ? genError.message : 'Unknown error'}`);
          setLoading(false);
          return;
        }

        const result = await authService.createUser(registerNo, formData.name.toUpperCase(), 'teacher', undefined, {
          email: formData.email,
          phone: formData.phone || null,
          password: formData.password,
          subjects: formData.subjects ? formData.subjects.toUpperCase() : formData.subjects,
          gender: formData.gender ? formData.gender.toUpperCase() : formData.gender,
          first_login: false,
        });

        if (!result.success) {
          setError(`Failed to create teacher: ${result.message || 'Unknown error'}`);
        } else {
          setSuccess(`✅ Teacher "${formData.name}" created successfully!`);
          setFormData({ name: '', email: '', phone: '', register_no: '', password: '', subjects: '', gender: '' });
          fetchTeachers();
          setTimeout(() => setSuccess(''), 3000);
        }
      }
    } catch (err) {
      setError(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setEditingId(null);
    setFormData({ name: '', email: '', phone: '', register_no: '', password: '', subjects: '', gender: '' });
    setError('');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">👨‍🏫 Manage Teachers</h2>
        <p className="text-gray-600 mt-1">Create and manage teacher accounts</p>
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

      {/* Existing Teachers List */}
      <Card className="p-6 border-2 border-gray-300 bg-gray-50">
        <h3 className="text-lg font-semibold mb-4">👥 Existing Teachers</h3>
        {teachers.length === 0 ? (
          <p className="text-gray-600">No teachers found. Create one using the form below.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-200 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Name</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Email</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Register No</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Subjects</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Gender</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {teachers.map((teacher) => (
                  <tr key={teacher.id} className="hover:bg-gray-100 transition">
                    <td className="px-4 py-3 font-medium">{teacher.name}</td>
                    <td className="px-4 py-3 text-gray-600">{teacher.email}</td>
                    <td className="px-4 py-3 text-gray-600 font-mono text-sm">{teacher.register_no || '-'}</td>
                    <td className="px-4 py-3 text-gray-600">{teacher.subjects || '-'}</td>
                    <td className="px-4 py-3 text-gray-600">{teacher.gender || '-'}</td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex justify-center gap-2">
                        <button
                          onClick={() => handleEditTeacher(teacher)}
                          className="text-blue-600 hover:text-blue-800 hover:bg-blue-50 p-2 rounded transition"
                          title="Edit"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button
                          onClick={() => handleDeleteTeacher(teacher.id, teacher.name)}
                          className="text-red-600 hover:text-red-800 hover:bg-red-50 p-2 rounded transition"
                          title="Delete"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Add/Edit Teacher Form */}
      <Card className="p-8 border-2 border-green-300 bg-green-50">
        <h3 className="text-xl font-semibold mb-6 flex items-center gap-2">
          <div className="p-2 bg-green-200 rounded-lg">👨‍🏫</div>
          {editingId ? 'Edit Teacher Account' : 'Add New Teacher Account'}
        </h3>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Full Name *</label>
              <Input
                type="text"
                placeholder="Enter teacher full name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email Address *</label>
              <Input
                type="email"
                placeholder="teacher@school.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
              <Input
                type="tel"
                placeholder="Enter phone number"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Teacher Register Number</label>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-gray-100 border border-gray-300 rounded px-3 py-2 text-sm font-mono text-gray-700">
                  {editingId && formData.register_no ? formData.register_no : 'Auto-generated (TEASBPS + 4 digits)'}
                </div>
                {!editingId && (
                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded font-medium">Auto</span>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-1">✨ Automatically generated in format: TEASBPS0001, TEASBPS0002, etc.</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Gender</label>
              <select
                value={formData.gender}
                onChange={(e) => setFormData({ ...formData, gender: e.target.value as 'Male' | 'Female' | '' })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="">Select Gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password {editingId ? '(leave blank to keep current)' : '*'}
              </label>
              <Input
                type="password"
                placeholder={editingId ? 'Leave blank to keep current password' : 'Enter secure password'}
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Subjects (comma-separated)</label>
              <Input
                type="text"
                placeholder="e.g., Mathematics, Physics, Chemistry"
                value={formData.subjects}
                onChange={(e) => setFormData({ ...formData, subjects: e.target.value })}
              />
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="submit"
              disabled={loading}
              className="flex-1 bg-green-600 hover:bg-green-700 flex items-center justify-center gap-2"
            >
              <Plus size={20} />
              {loading ? (editingId ? 'Updating...' : 'Creating...') : (editingId ? 'Update Teacher' : 'Create Teacher')}
            </Button>
            {editingId && (
              <Button
                type="button"
                onClick={handleCancel}
                className="bg-gray-400 hover:bg-gray-500"
              >
                Cancel
              </Button>
            )}
            {!editingId && (
              <Button
                type="button"
                onClick={() => {
                  setFormData({ name: '', email: '', phone: '', register_no: '', password: '', subjects: '', gender: '' });
                  setError('');
                }}
                className="bg-gray-400 hover:bg-gray-500"
              >
                Clear
              </Button>
            )}
          </div>
        </form>

        <div className="mt-6 p-4 bg-white rounded border border-green-200">
          <p className="text-sm text-gray-700">
            <strong>📋 Note:</strong> {editingId ? 'Update teacher details above. Leave password blank to keep current password.' : 'New teachers can access the teacher dashboard.'}
          </p>
        </div>
      </Card>
    </div>
  );
};
