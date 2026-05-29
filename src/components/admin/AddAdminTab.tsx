import { useState, useEffect } from 'react';
import { Card, Button, Input } from '../common';
import { AlertCircle, CheckCircle, Plus, Edit2, Trash2 } from 'lucide-react';
import { authService } from '../../services';
import { normalizeObject } from '../../utils/normalize';

interface AdminForm {
  registerNo: string;
  name: string;
  email: string;
  phone: string;
  password: string;
  gender: 'Male' | 'Female' | '';
}

interface Admin extends AdminForm {
  id: string;
  register_no: string;
}

export const AddAdminTab: React.FC = () => {
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [formData, setFormData] = useState<AdminForm>({
    registerNo: '',
    name: '',
    email: '',
    phone: '',
    password: '',
    gender: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    fetchAdmins();
  }, []);

  const fetchAdmins = async () => {
    try {
      const result = await authService.getUsersByRole('admin');

      if (!result.success) {
        console.error('Error fetching admins');
      } else {
        setAdmins((result.data || []).map((a: any) => normalizeObject(a)));
      }
    } catch (err) {
      console.error('Error:', err);
    }
  };

  const handleEditAdmin = (admin: Admin) => {
    setEditingId(admin.id);
    setFormData({
      registerNo: admin.register_no,
      name: admin.name,
      email: admin.email,
      phone: admin.phone || '',
      password: '',
      gender: (admin.gender as 'Male' | 'Female' | '') || '',
    });
    setError('');
  };

  const handleDeleteAdmin = async (adminId: string, adminName: string) => {
    if (!window.confirm(`Are you sure you want to delete admin "${adminName}"?`)) {
      return;
    }

    try {
      const result = await authService.deleteUser(adminId);

      if (!result.success) {
        setError(`Failed to delete admin: ${result.message || 'Unknown error'}`);
      } else {
        setSuccess(`✅ Admin "${adminName}" deleted successfully!`);
        fetchAdmins();
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (err) {
      setError(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.registerNo.trim() || !formData.name.trim() || !formData.email.trim()) {
      setError('Register number, name and email are required');
      return;
    }

    if (!editingId && !formData.password.trim()) {
      setError('Password is required for new admin');
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
        // Update existing admin
        const updateData: any = {
          register_no: formData.registerNo,
          name: formData.name,
          email: formData.email,
          phone: formData.phone || null,
          gender: formData.gender || null,
        };

        if (formData.password.trim()) {
          updateData.password = formData.password;
        }

        const result = await authService.updateUser(editingId, updateData);

        if (!result.success) {
          setError(`Failed to update admin: ${result.message || 'Unknown error'}`);
        } else {
          setSuccess(`✅ Admin "${formData.name}" updated successfully!`);
            setFormData({ registerNo: '', name: '', email: '', phone: '', password: '', gender: '' });
          setEditingId(null);
          fetchAdmins();
          setTimeout(() => setSuccess(''), 3000);
        }
      } else {
        // Create new admin
        const result = await authService.createUser(formData.registerNo, formData.name, 'admin', undefined, {
          email: formData.email,
          phone: formData.phone || null,
          password: formData.password,
          gender: formData.gender || null,
          first_login: false,
        });

        if (!result.success) {
          setError(`Failed to create admin: ${result.message || 'Unknown error'}`);
        } else {
          setSuccess(`✅ Admin "${formData.name}" created successfully!`);
            setFormData({ registerNo: '', name: '', email: '', phone: '', password: '', gender: '' });
          fetchAdmins();
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
      setFormData({ registerNo: '', name: '', email: '', phone: '', password: '', gender: '' });
    setError('');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">⚙️ Manage Admins</h2>
        <p className="text-gray-600 mt-1">Create and manage administrator accounts</p>
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

      {/* Existing Admins List */}
      <Card className="p-6 border-2 border-gray-300 bg-gray-50">
        <h3 className="text-lg font-semibold mb-4">👥 Existing Admins</h3>
        {admins.length === 0 ? (
          <p className="text-gray-600">No admins found. Create one using the form below.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-200 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Register No</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Name</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Email</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Phone</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Gender</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {admins.map((admin) => (
                  <tr key={admin.id} className="hover:bg-gray-100 transition">
                    <td className="px-4 py-3 font-medium text-gray-700">{admin.register_no}</td>
                    <td className="px-4 py-3 font-medium">{admin.name}</td>
                    <td className="px-4 py-3 text-gray-600">{admin.email}</td>
                    <td className="px-4 py-3 text-gray-600">{admin.phone || '-'}</td>
                    <td className="px-4 py-3 text-gray-600">{admin.gender || '-'}</td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex justify-center gap-2">
                        <button
                          onClick={() => handleEditAdmin(admin)}
                          className="text-blue-600 hover:text-blue-800 hover:bg-blue-50 p-2 rounded transition"
                          title="Edit"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button
                          onClick={() => handleDeleteAdmin(admin.id, admin.name)}
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

      {/* Form */}
      <Card className="p-8 border-2 border-red-300 bg-red-50">
        <h3 className="text-xl font-semibold mb-6 flex items-center gap-2">
          <div className="p-2 bg-red-200 rounded-lg">⚙️</div>
          {editingId ? 'Edit Admin Account' : 'Add New Admin Account'}
        </h3>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Register Number *</label>
              <Input
                type="text"
                placeholder="Enter register number"
                value={formData.registerNo}
                onChange={(e) => setFormData({ ...formData, registerNo: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Full Name *</label>
              <Input
                type="text"
                placeholder="Enter admin full name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email Address *</label>
              <Input
                type="email"
                placeholder="admin@school.com"
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
              <label className="block text-sm font-medium text-gray-700 mb-2">Gender</label>
              <select
                value={formData.gender}
                onChange={(e) => setFormData({ ...formData, gender: e.target.value as 'Male' | 'Female' | '' })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
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
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="submit"
              disabled={loading}
              className="flex-1 bg-red-600 hover:bg-red-700 flex items-center justify-center gap-2"
            >
              <Plus size={20} />
              {loading ? (editingId ? 'Updating...' : 'Creating...') : (editingId ? 'Update Admin' : 'Create Admin')}
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
                     setFormData({ registerNo: '', name: '', email: '', phone: '', password: '', gender: '' });
                  setError('');
                }}
                className="bg-gray-400 hover:bg-gray-500"
              >
                Clear
              </Button>
            )}
          </div>
        </form>

        <div className="mt-6 p-4 bg-white rounded border border-red-200">
          <p className="text-sm text-gray-700">
            <strong>📋 Note:</strong> {editingId ? 'Update admin details above. Leave password blank to keep current password.' : 'New admins can access the admin dashboard and manage all system features.'}
          </p>
        </div>
      </Card>
    </div>
  );
};
