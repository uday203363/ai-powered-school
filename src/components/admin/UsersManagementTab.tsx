import { useState, useEffect } from 'react';
import { Search, Trash2 } from 'lucide-react';
import { authService } from '../../services';
import { normalizeObject } from '../../utils/normalize';

interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  class?: string;
  register_no?: string;
}

export default function UsersManagementTab() {
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState<string>('all');

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    filterUsers();
  }, [users, searchQuery, selectedRole]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const result = await authService.getAllUsers();

      if (!result.success) {
        setError('Failed to load users');
        console.error('Fetch users error');
      } else {
        const data = (result.data || []).filter((user: any) => ['teacher', 'admin'].includes(user.role));
        setUsers(data.map((u: any) => normalizeObject(u)));
        setError('');
      }
    } catch (err) {
      setError('Error loading users');
      console.error(err);
    }
    setLoading(false);
  };

  const filterUsers = () => {
    let filtered = users;

    // Filter by role
    if (selectedRole !== 'all') {
      filtered = filtered.filter(u => u.role === selectedRole);
    }

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(u =>
        u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (u.register_no && u.register_no.includes(searchQuery))
      );
    }

    setFilteredUsers(filtered);
  };

  const getRoleColor = (role: string) => {
    const colors: { [key: string]: string } = {
      student: 'bg-blue-50 text-blue-700 border-blue-200',
      teacher: 'bg-green-50 text-green-700 border-green-200',
      admin: 'bg-red-50 text-red-700 border-red-200',
    };
    return colors[role] || 'bg-gray-50 text-gray-700 border-gray-200';
  };

  const getRoleIcon = (role: string) => {
    const icons: { [key: string]: string } = {
      student: '👨‍🎓',
      teacher: '👨‍🏫',
      admin: '⚙️',
    };
    return icons[role] || '👤';
  };

  const handleDeleteUser = async (userId: string, userName: string) => {
    if (!window.confirm(`Are you sure you want to delete ${userName}? This action cannot be undone.`)) {
      return;
    }

    try {
      setError('');
      const result = await authService.deleteUser(userId);

      if (!result.success) {
        setError(`Failed to delete user: ${result.message || 'Unknown error'}`);
        console.error('Delete error');
      } else {
        // Remove user from local state
        setUsers(users.filter(u => u.id !== userId));
      }
    } catch (err) {
      setError('Error deleting user');
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">👥 All Users</h2>
        <p className="text-gray-600 mt-1">View all admin and teacher accounts</p>
      </div>

      {/* Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-4 items-center flex-wrap">
        <div className="flex-1 min-w-xs relative">
          <Search className="absolute left-3 top-2.5 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
          />
        </div>
        <select
          value={selectedRole}
          onChange={(e) => setSelectedRole(e.target.value)}
          className="border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary focus:border-transparent"
        >
          <option value="all">All Users</option>
          <option value="teacher">👨‍🏫 Teachers</option>
          <option value="admin">⚙️ Admins</option>
        </select>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-green-50 border border-green-200 p-4 rounded-lg text-center">
          <div className="text-2xl font-bold text-green-700">
            {users.filter(u => u.role === 'teacher').length}
          </div>
          <div className="text-sm text-green-600">👨‍🏫 Teachers</div>
        </div>
        <div className="bg-red-50 border border-red-200 p-4 rounded-lg text-center">
          <div className="text-2xl font-bold text-red-700">
            {users.filter(u => u.role === 'admin').length}
          </div>
          <div className="text-sm text-red-600">⚙️ Admins</div>
        </div>
      </div>

      {/* Users List */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading users...</div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No users found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Sr. No.</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Name</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Email</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Phone</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Role</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Delete</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredUsers.map((user, idx) => (
                  <tr key={user.id} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4 font-medium text-gray-600">{idx + 1}</td>
                    <td className="px-6 py-4 font-medium text-gray-900">{user.name}</td>
                    <td className="px-6 py-4 text-gray-600">{user.email}</td>
                    <td className="px-6 py-4 text-gray-600">{user.phone || '-'}</td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getRoleColor(user.role)}`}>
                        {getRoleIcon(user.role)} {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleDeleteUser(user.id, user.name)}
                        className="text-red-600 hover:text-red-800 hover:bg-red-50 p-2 rounded transition"
                        title="Delete user"
                      >
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
        ℹ️ To add new admin or teacher accounts, use the <strong>Add Admin</strong> or <strong>Add Teacher</strong> tabs.
      </div>
    </div>
  );
}
