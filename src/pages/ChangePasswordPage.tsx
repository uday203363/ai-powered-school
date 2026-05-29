import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Input, Button } from '../components/common';

export const ChangePasswordPage: React.FC = () => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const { user, changePassword } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      if (!newPassword || !confirmPassword) {
        setError('All fields are required');
        setLoading(false);
        return;
      }

      if (newPassword !== confirmPassword) {
        setError('Passwords do not match');
        setLoading(false);
        return;
      }

      if (newPassword.length < 6) {
        setError('Password must be at least 6 characters');
        setLoading(false);
        return;
      }

      const result = await changePassword(newPassword);

      if (result.success) {
        setSuccess('Password changed successfully! Redirecting...');
        setTimeout(() => {
          // Redirect based on role
          const role = localStorage.getItem('auth_user') 
            ? JSON.parse(localStorage.getItem('auth_user') || '{}').role 
            : 'student';
          
          if (role === 'admin') {
            navigate('/dashboard');
          } else if (role === 'teacher') {
            navigate('/teacher/dashboard');
          } else if (role === 'student') {
            navigate('/student/dashboard');
          } else {
            navigate('/dashboard');
          }
        }, 2000);
      } else {
        setError(result.message || 'Failed to change password');
      }
    } catch (err) {
      setError('An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white rounded-lg shadow-xl p-8">
        <div className="text-center mb-8">
          <div className="mb-4 flex justify-center">
            <img 
              src="/logo.jpeg" 
              alt="Sri Bhashyam Public School" 
              className="w-16 h-16 rounded-full shadow-lg object-cover border-4 border-primary"
            />
          </div>
          <h1 className="text-2xl font-bold text-primary mb-1">Sri Bhashyam Public School</h1>
          <p className="text-sm text-accent font-semibold mb-3">First Login - Change Password</p>
          <p className="text-sm text-gray-600">
            For your security, please change your password now.
          </p>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-blue-900 mb-3">
            <strong>ℹ️ This is your first login!</strong><br />
            After changing your password, you'll be able to access your dashboard.
          </p>
          {user && (
            <div className="bg-white rounded p-3 mt-3 border border-blue-100">
              <div className="text-xs text-gray-600 mb-2">
                <div><strong>Name:</strong> {user.name}</div>
                <div><strong>Register No:</strong> {user.register_no}</div>
                <div><strong>Role:</strong> {(user.role || '').toUpperCase()}</div>
              </div>
            </div>
          )}
        </div>

        {error && (
          <div className="bg-danger bg-opacity-10 border border-danger text-danger px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-secondary bg-opacity-10 border border-secondary text-secondary px-4 py-3 rounded-lg mb-6">
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="New Password"
            type="password"
            placeholder="Enter new password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />

          <Input
            label="Confirm Password"
            type="password"
            placeholder="Confirm new password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />

          <Button
            type="submit"
            disabled={loading}
            className="w-full"
          >
            {loading ? 'Changing...' : 'Change Password'}
          </Button>
        </form>
      </div>
    </div>
  );
};
