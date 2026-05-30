import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Input, Button } from '../components/common';

export const LoginPage: React.FC = () => {
  const [registerNo, setRegisterNo] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, user, loading: authLoading, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const getDashboardPath = (role?: string | null) => {
    const normalizedRole = role?.trim().toLowerCase();
    if (normalizedRole === 'admin') return '/dashboard';
    if (normalizedRole === 'teacher') return '/teacher/dashboard';
    if (normalizedRole === 'student') return '/student/dashboard';
    return '/dashboard';
  };

  useEffect(() => {
    if (authLoading || !isAuthenticated || !user) return;
    navigate(getDashboardPath(user.role), { replace: true });
  }, [authLoading, isAuthenticated, navigate, user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await login(registerNo, password);

      if (!result.success) {
        setError(result.message || 'Login failed');
      } else {
        if (result.firstLogin) {
          navigate('/change-password', { replace: true });
        } else {
          navigate(getDashboardPath(result.user?.role), { replace: true });
        }
      }
    } catch (err) {
      setError('An error occurred during login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-lg bg-white rounded-lg shadow-2xl p-8 md:p-12">
        <div className="text-center mb-8">
          <div className="mb-4 flex justify-center">
            <img 
              src="/logo.jpeg" 
              alt="Sri Bhashyam Public School" 
              className="w-24 h-24 rounded-full shadow-lg object-cover border-4 border-primary"
            />
          </div>
          <h1 className="text-3xl font-bold text-primary mb-1">Sri Bhashyam</h1>
          <p className="text-lg font-semibold text-gray-700 mb-2">Public School</p>
          <p className="text-sm text-gray-600">AI-Powered Management System</p>
        </div>
        <div className="border-t pt-6 mb-6">
          <p className="text-center text-gray-600 font-medium">Login to your account</p>
        </div>

        {error && (
          <div className="bg-danger bg-opacity-10 border border-danger text-danger px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Register Number"
            type="text"
            placeholder="Enter your register number"
            value={registerNo}
            onChange={(e) => setRegisterNo(e.target.value)}
            error={error && registerNo === '' ? 'Required' : ''}
          />

          <Input
            label="Password"
            type="password"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={error && password === '' ? 'Required' : ''}
          />

          <Button
            type="submit"
            disabled={loading}
            className="w-full"
          >
            {loading ? 'Logging in...' : 'Login'}
          </Button>
        </form>

      </div>
    </div>
  );
};
