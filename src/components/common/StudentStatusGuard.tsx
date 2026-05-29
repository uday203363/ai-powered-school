import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { AlertCircle } from 'lucide-react';
import { Card } from './UI';
import { useAuth } from '../../contexts/AuthContext';

interface StudentStatusGuardProps {
  children: React.ReactNode;
}

export const StudentStatusGuard: React.FC<StudentStatusGuardProps> = ({ children }) => {
  const { user, loading, refreshUserProfile, isAuthenticated } = useAuth();
  const [checkingStatus, setCheckingStatus] = useState(true);
  const [resolvedStatus, setResolvedStatus] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const verifyStatus = async () => {
      setCheckingStatus(true);
      setResolvedStatus(null);
      if (isAuthenticated && user?.role === 'student') {
        const latestUser = await refreshUserProfile();
        if (isMounted) {
          setResolvedStatus(String(latestUser?.status || user?.status || 'Active'));
        }
      } else if (isMounted) {
        setResolvedStatus(String(user?.status || 'Active'));
      }
      if (isMounted) {
        setCheckingStatus(false);
      }
    };

    verifyStatus();

    return () => {
      isMounted = false;
    };
  }, [isAuthenticated, refreshUserProfile, user?.id, user?.role]);

  if (loading || checkingStatus) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="text-lg font-semibold text-gray-700">Checking account status...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  const statusToCheck = String(resolvedStatus || user?.status || 'Active').trim().toLowerCase();

  if (user?.role === 'student' && statusToCheck !== 'active') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100 p-4">
        <Card className="max-w-md w-full text-center border-2 border-red-200 shadow-lg">
          <div className="flex justify-center mb-4">
            <div className="p-4 bg-red-100 rounded-full">
              <AlertCircle className="text-red-600" size={32} />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Student Access Blocked</h2>
          <p className="text-gray-600 mb-4">
            Your account status is <strong>{resolvedStatus || user.status}</strong>. Student dashboard access is available only for Active students.
          </p>
          <p className="text-gray-500 text-sm">
            Please contact the school administration to restore access.
          </p>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
};