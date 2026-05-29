import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRoles?: string[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredRoles = [],
}) => {
  const { isAuthenticated, user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-2xl font-bold">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  // If no required roles specified, allow access
  if (requiredRoles.length === 0) {
    return <>{children}</>;
  }

  // Check if user role matches required roles
  const userRole = user?.role?.trim().toLowerCase() || '';
  const normalizedRequiredRoles = requiredRoles.map(r => r.trim().toLowerCase());
  const roleMatches = normalizedRequiredRoles.includes(userRole);

  // Better debugging
  if (!roleMatches) {
    console.error('❌ Access Denied:', {
      userRole: `"${userRole}"`,
      requiredRoles: normalizedRequiredRoles,
      fullUser: user,
    });
    
    // Show detailed unauthorized message
    return (
      <div className="flex items-center justify-center h-screen bg-red-50">
        <div className="text-center p-8 bg-white rounded-lg shadow-lg">
          <h1 className="text-4xl font-bold text-red-600 mb-4">❌ Access Denied</h1>
          <p className="text-gray-700 mb-4">
            Your role: <strong>{userRole || 'unknown'}</strong>
          </p>
          <p className="text-gray-700 mb-6">
            Required role(s): <strong>{normalizedRequiredRoles.join(', ') || 'none'}</strong>
          </p>
          <a 
            href="/login" 
            className="inline-block bg-primary text-white px-6 py-2 rounded hover:bg-blue-700"
          >
            Back to Login
          </a>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
