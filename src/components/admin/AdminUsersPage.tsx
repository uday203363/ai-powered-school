import React, { useState, useEffect } from 'react';
import { Card, Button, Input, Modal } from '../../components/common';
import { authService } from '../../services';
import { normalizeString } from '../../utils/normalize';
import { Trash2 } from 'lucide-react';

export const AdminUsersPage: React.FC = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<any>(null);
  const [selectedRole, setSelectedRole] = useState<string>('all');
  const [formData, setFormData] = useState({
    register_no: '',
    name: '',
    password: '',
    confirmPassword: '',
    role: 'student',
    class: '',
    email: '',
    phone: '',
    subjects: '',
    assigned_classes: '',
    fees: '',
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadUsers();
  }, [selectedRole]);

  const loadUsers = async () => {
    setLoading(true);
    try {
      if (selectedRole === 'all') {
        const result = await authService.getAllUsers();
        if (result.success) {
          setUsers(result.data || []);
        }
      } else {
        const result = await authService.getUsersByRole(selectedRole);
        if (result.success) {
          setUsers(result.data || []);
        }
      }
    } catch (error) {
      console.error('Error loading users:', error);
    }
    setLoading(false);
  };

  const handleEditUser = (user: any) => {
    setEditingUser(user);
    setFormData({
      register_no: user.register_no,
      name: user.name,
      password: '',
      confirmPassword: '',
      role: user.role,
      class: user.class || '',
      email: user.email || '',
      phone: user.phone || '',
      subjects: user.subjects || '',
      assigned_classes: user.assigned_classes || '',
      fees: user.fees || '',
    });
    setShowModal(true);
  };

  const handleDeleteUser = async () => {
    if (!deleteConfirm) return;
    
    setLoading(true);
    try {
      const result = await authService.deleteUser(deleteConfirm.id);

      if (!result.success) {
        alert('Error deleting user: ' + (result.message || 'Unknown error'));
      } else {
        alert(`✅ User "${deleteConfirm.name}" deleted successfully`);
        loadUsers();
        setDeleteConfirm(null);
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      alert('Error: ' + (error as any).message);
    }
    setLoading(false);
  };

  const handleSaveUser = async () => {
    if (!formData.register_no || !formData.name) {
      alert('Please fill in all required fields');
      return;
    }

    if (!editingUser && !formData.password) {
      alert('Please set a password for new user');
      return;
    }

    if (formData.password && formData.password !== formData.confirmPassword) {
      alert('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      if (editingUser) {
        const updates: any = {
          register_no: formData.register_no,
          name: formData.name,
          role: formData.role,
          class: formData.class || null,
          email: formData.email || null,
          phone: formData.phone || null,
        };
        
        // Add role-specific fields
        if (formData.role === 'teacher') {
          updates.assigned_classes = formData.assigned_classes || null;
          updates.subjects = formData.subjects || null;
          updates.class = null;
        }

        if (formData.role === 'student') {
          updates.fees = formData.fees || null;
        }

        if (formData.password) {
          updates.password = formData.password;
        }

        const result = await authService.updateUser(editingUser.id, updates);

        if (!result.success) {
          alert('Error: ' + (result.message || 'Unknown error'));
        } else {
          loadUsers();
          setShowModal(false);
          alert('✅ User updated successfully');
        }
      } else {
        const insertData: any = {
          register_no: formData.register_no,
          role: formData.role,
          name: formData.name,
          class: formData.class || null,
          email: formData.email || null,
          phone: formData.phone || null,
          first_login: true,  // Set first login flag
          password: formData.password,
        };

        // Add role-specific fields for teachers
        if (formData.role === 'teacher') {
          insertData.assigned_classes = formData.assigned_classes || null;
          insertData.subjects = formData.subjects || null;
          insertData.class = null;
        }

        if (formData.role === 'student') {
          insertData.fees = formData.fees || null;
        }

        const result = await authService.createUser(
          formData.register_no,
          formData.name,
          formData.role,
          formData.role === 'teacher' ? formData.assigned_classes : formData.class,
          insertData
        );

        if (!result.success) {
          alert('Error: ' + (result.message || 'Unknown error'));
        } else {
          loadUsers();
          setShowModal(false);
          alert(
            `✅ User Created Successfully!\n\n` +
            `Register No: ${formData.register_no}\n` +
            `Name: ${formData.name}\n` +
            `Role: ${formData.role.toUpperCase()}\n` +
            `Default Password: ${formData.password}\n\n` +
            `📋 User will be forced to change password on first login.`
          );
        }
      }
    } catch (error) {
      console.error('Error saving user:', error);
      alert('Error: ' + (error as any).message);
    }
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Manage Users</h1>
        <p className="text-gray-600 text-sm mt-1">View and manage all system users</p>
      </div>

      {/* Role Filter */}
      <Card className="bg-blue-50 border border-blue-200">
        <div className="flex items-center gap-4">
          <label className="text-sm font-semibold text-gray-700">Filter by Role:</label>
          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-white"
          >
            <option value="all">All Users</option>
            <option value="admin">Admin</option>
            <option value="teacher">Teacher</option>
            <option value="student">Student</option>
            <option value="parent">Parent</option>
          </select>
          <span className="text-sm text-gray-600 ml-auto">
            Total: <strong>{users.length}</strong> users
          </span>
        </div>
      </Card>

      <Card>
        {loading ? (
          <div className="text-center py-8">Loading...</div>
        ) : users.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>No users found. Use the Admin Dashboard tabs to create admin or teacher accounts.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-100 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Register No</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Name</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Role</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Assigned Class / Classes</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold">Action</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user, idx) => (
                  <tr key={idx} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm">{user.register_no}</td>
                    <td className="px-4 py-3 text-sm">{normalizeString(user.name)}</td>
                    <td className="px-4 py-3 text-sm">
                      <span className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
                        {user.role.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {user.role === 'teacher'
                        ? normalizeString(user.assigned_classes || '-')
                        : normalizeString(user.class || '-')
                      }
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex justify-center gap-2">
                        <Button
                          onClick={() => handleEditUser(user)}
                          className="bg-primary text-white px-4 py-1 rounded text-sm hover:bg-blue-700"
                        >
                          Edit
                        </Button>
                        <Button
                          onClick={() => setDeleteConfirm(user)}
                          className="bg-red-600 text-white px-4 py-1 rounded text-sm hover:bg-red-700 flex items-center gap-1"
                        >
                          <Trash2 size={16} />
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingUser ? 'Edit User' : 'Add New User'}
      >
        <div className="space-y-4 max-h-96 overflow-y-auto">
          {/* Basic Fields */}
          <Input
            label="Register Number*"
            placeholder="e.g., ADM001, TEA001, STU001"
            value={formData.register_no}
            onChange={(e) =>
              setFormData({ ...formData, register_no: e.target.value })
            }
          />

          <Input
            label="Full Name*"
            placeholder="Enter full name"
            value={formData.name}
            onChange={(e) =>
              setFormData({ ...formData, name: e.target.value })
            }
          />

          {/* Role Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Role*
            </label>
            <select
              value={formData.role}
              onChange={(e) =>
                setFormData({ ...formData, role: e.target.value })
              }
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="admin">Admin</option>
              <option value="teacher">Teacher</option>
              <option value="student">Student</option>
              <option value="parent">Parent</option>
            </select>
          </div>

          {/* Password Fields (for new users) */}
          {!editingUser && (
            <>
              <div className="bg-blue-50 p-3 rounded border border-blue-200 flex justify-between items-center">
                <p className="text-sm text-blue-900 font-semibold">👤 Set Default Password (Only Admin can change)</p>
                <button
                  type="button"
                  onClick={() => {
                    const defaultPass = `Welcome@${formData.register_no}`;
                    setFormData({
                      ...formData,
                      password: defaultPass,
                      confirmPassword: defaultPass,
                    });
                  }}
                  className="bg-blue-600 text-white px-3 py-1 rounded text-xs font-semibold hover:bg-blue-700"
                >
                  Generate
                </button>
              </div>
              <Input
                label="Password* (Example: welcome, pass123)"
                type="text"
                placeholder="e.g., welcome or Welcome@123"
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
              />
              <Input
                label="Confirm Password*"
                type="text"
                placeholder="Confirm password"
                value={formData.confirmPassword}
                onChange={(e) =>
                  setFormData({ ...formData, confirmPassword: e.target.value })
                }
              />
              <div className="bg-amber-50 p-3 rounded border border-amber-200 text-sm">
                <p className="text-amber-900 font-semibold mb-1">ℹ️ First Login Process:</p>
                <ul className="text-amber-800 text-xs space-y-1">
                  <li>✓ User logs in with this default password</li>
                  <li>✓ System forces password change</li>
                  <li>✓ User sets new permanent password</li>
                  <li>✓ Then accesses dashboard</li>
                </ul>
              </div>
            </>
          )}

          {/* Edit Password Option */}
          {editingUser && (
            <>
              <div className="bg-amber-50 p-3 rounded border border-amber-200">
                <p className="text-sm text-amber-900 font-semibold mb-2">Optional: Change Password</p>
              </div>
              <Input
                label="New Password (leave blank to keep current)"
                type="password"
                placeholder="Leave empty to keep current password"
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
              />
              {formData.password && (
                <Input
                  label="Confirm New Password"
                  type="password"
                  placeholder="Confirm new password"
                  value={formData.confirmPassword}
                  onChange={(e) =>
                    setFormData({ ...formData, confirmPassword: e.target.value })
                  }
                />
              )}
            </>
          )}

          {/* Role-Specific Fields */}
          {formData.role === 'teacher' && (
            <>
              <div className="bg-green-50 p-3 rounded border border-green-200">
                <p className="text-sm text-green-900 font-semibold">👨‍🏫 Teacher Details</p>
              </div>
              <Input
                label="Assigned Classes (Classes teaching)"
                placeholder="e.g., 10A, 10B, 11A (comma separated)"
                value={formData.assigned_classes}
                onChange={(e) =>
                  setFormData({ ...formData, assigned_classes: e.target.value })
                }
              />
              <Input
                label="Subjects/Specialization"
                placeholder="e.g., Mathematics, Science (comma separated)"
                value={formData.subjects}
                onChange={(e) =>
                  setFormData({ ...formData, subjects: e.target.value })
                }
              />
              <Input
                label="Email"
                type="email"
                placeholder="teacher@school.com"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
              />
              <Input
                label="Phone"
                placeholder="+91-XXXXXXXXXX"
                value={formData.phone}
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value })
                }
              />
            </>
          )}

          {formData.role === 'student' && (
            <>
              <div className="bg-purple-50 p-3 rounded border border-purple-200">
                <p className="text-sm text-purple-900 font-semibold">👨‍🎓 Student Details</p>
              </div>
              <Input
                label="Class*"
                placeholder="e.g., 10A, 11B"
                value={formData.class}
                onChange={(e) =>
                  setFormData({ ...formData, class: e.target.value })
                }
              />
              <Input
                label="Email"
                type="email"
                placeholder="student@school.com"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
              />
              <Input
                label="Phone"
                placeholder="+91-XXXXXXXXXX"
                value={formData.phone}
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value })
                }
              />
              <Input
                label="Fees (Registration/Annual)"
                placeholder="e.g., 5000 or Leave empty if not applicable"
                value={formData.fees}
                onChange={(e) =>
                  setFormData({ ...formData, fees: e.target.value })
                }
              />
            </>
          )}

          {formData.role === 'parent' && (
            <>
              <div className="bg-orange-50 p-3 rounded border border-orange-200">
                <p className="text-sm text-orange-900 font-semibold">👨‍👩‍👧 Parent Details</p>
              </div>
              <Input
                label="Email"
                type="email"
                placeholder="parent@email.com"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
              />
              <Input
                label="Phone"
                placeholder="+91-XXXXXXXXXX"
                value={formData.phone}
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value })
                }
              />
              <Input
                label="Student Register Number (Link to)"
                placeholder="e.g., STU001"
                value={formData.class}
                onChange={(e) =>
                  setFormData({ ...formData, class: e.target.value })
                }
              />
            </>
          )}

          {formData.role === 'admin' && (
            <div className="bg-red-50 p-3 rounded border border-red-200">
              <p className="text-sm text-red-900 font-semibold">🔐 Admin Account</p>
              <p className="text-xs text-red-800 mt-1">Full access to all system features</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 pt-4 border-t">
            <Button 
              onClick={handleSaveUser} 
              disabled={loading} 
              className="w-full"
            >
              {loading ? 'Saving...' : editingUser ? 'Update User' : 'Create User'}
            </Button>
            <Button 
              onClick={() => setShowModal(false)} 
              className="w-full bg-gray-300 text-gray-700 hover:bg-gray-400"
            >
              Cancel
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        title="Delete User"
      >
        <div className="space-y-4">
          <div className="bg-red-50 p-4 rounded border border-red-200">
            <p className="text-red-900 font-semibold">⚠️ Confirm Delete</p>
            <p className="text-red-800 text-sm mt-2">
              Are you sure you want to delete user <strong>"{deleteConfirm?.name}"</strong> (Register No: {deleteConfirm?.register_no})?
            </p>
            <p className="text-red-700 text-xs mt-3 font-semibold">
              ⚠️ This action cannot be undone. All associated data will be deleted.
            </p>
          </div>
          
          <div className="flex gap-2 pt-4 border-t">
            <Button 
              onClick={handleDeleteUser} 
              disabled={loading}
              className="w-full bg-red-600 text-white hover:bg-red-700"
            >
              {loading ? 'Deleting...' : 'Yes, Delete User'}
            </Button>
            <Button 
              onClick={() => setDeleteConfirm(null)} 
              className="w-full bg-gray-300 text-gray-700 hover:bg-gray-400"
            >
              Cancel
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
