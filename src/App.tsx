import React from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ProtectedRoute, StudentStatusGuard } from './components/common';
import { DashboardLayout } from './pages/DashboardLayout';
import { LoginPage } from './pages/LoginPage';
import { ChangePasswordPage } from './pages/ChangePasswordPage';

// Admin Components
import {
  AdminDashboard,
  AdminUsersPage,
  AdminNotificationsPage,
  AdminGalleryPage,
} from './components/admin';

// Teacher Components
import {
  TeacherDashboard,
  TeacherMarksPage,
  TeacherAttendancePage,
  TeacherGalleryPage,
} from './components/teacher';

// Student Components
import {
  StudentDashboard,
  StudentMarksPage,
  StudentAttendancePage,
  StudentFeesPage,
  AIAssistant,
  StudentGalleryPage,
} from './components/student';

const UnauthorizedPage: React.FC = () => (
  <div className="flex items-center justify-center h-screen">
    <div className="text-center">
      <h1 className="text-4xl font-bold text-gray-900">Unauthorized</h1>
      <p className="text-gray-600 mt-2">You don't have permission to access this page</p>
      <a href="/dashboard" className="text-primary font-semibold mt-4 inline-block">
        Back to Dashboard
      </a>
    </div>
  </div>
);

export const AppRoutes: React.FC = () => {
  const { isAuthenticated, user } = useAuth();

  return (
    <Routes>
      {/* Public Routes */}
      <Route
        path="/login"
        element={
          isAuthenticated && user ? (
            user.role === 'admin' ? (
              <Navigate to="/dashboard" />
            ) : user.role === 'teacher' ? (
              <Navigate to="/teacher/dashboard" />
            ) : (
              <Navigate to="/student/dashboard" />
            )
          ) : (
            <LoginPage />
          )
        }
      />

      <Route
        path="/change-password"
        element={
          <ProtectedRoute>
            <ChangePasswordPage />
          </ProtectedRoute>
        }
      />

      {/* Unauthorized */}
      <Route path="/unauthorized" element={<UnauthorizedPage />} />

      {/* Protected Routes - Admin */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute requiredRoles={['admin']}>
            <DashboardLayout>
              <AdminDashboard />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/users"
        element={
          <ProtectedRoute requiredRoles={['admin']}>
            <DashboardLayout>
              <AdminUsersPage />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/notifications"
        element={
          <ProtectedRoute requiredRoles={['admin']}>
            <DashboardLayout>
              <AdminNotificationsPage />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/gallery"
        element={
          <ProtectedRoute requiredRoles={[ 'admin' ]}>
            <DashboardLayout>
              <AdminGalleryPage />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />

      {/* Protected Routes - Teacher */}
      <Route
        path="/teacher/dashboard"
        element={
          <ProtectedRoute requiredRoles={['teacher']}>
            <DashboardLayout>
              <TeacherDashboard />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/teacher/marks"
        element={
          <ProtectedRoute requiredRoles={['teacher']}>
            <DashboardLayout>
              <TeacherMarksPage />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/teacher/attendance"
        element={
          <ProtectedRoute requiredRoles={['teacher']}>
            <DashboardLayout>
              <TeacherAttendancePage />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/teacher/gallery"
        element={
          <ProtectedRoute requiredRoles={[ 'teacher' ]}>
            <DashboardLayout>
              <TeacherGalleryPage />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />

      {/* Protected Routes - Student */}
      <Route
        path="/student/dashboard"
        element={
          <ProtectedRoute requiredRoles={['student']}>
            <StudentStatusGuard>
              <DashboardLayout>
                <StudentDashboard />
              </DashboardLayout>
            </StudentStatusGuard>
          </ProtectedRoute>
        }
      />

      <Route
        path="/student/marks"
        element={
          <ProtectedRoute requiredRoles={['student']}>
            <StudentStatusGuard>
              <DashboardLayout>
                <StudentMarksPage />
              </DashboardLayout>
            </StudentStatusGuard>
          </ProtectedRoute>
        }
      />

      <Route
        path="/student/attendance"
        element={
          <ProtectedRoute requiredRoles={['student']}>
            <StudentStatusGuard>
              <DashboardLayout>
                <StudentAttendancePage />
              </DashboardLayout>
            </StudentStatusGuard>
          </ProtectedRoute>
        }
      />

      <Route
        path="/student/fees"
        element={
          <ProtectedRoute requiredRoles={['student']}>
            <StudentStatusGuard>
              <DashboardLayout>
                <StudentFeesPage />
              </DashboardLayout>
            </StudentStatusGuard>
          </ProtectedRoute>
        }
      />

      <Route
        path="/student/gallery"
        element={
          <ProtectedRoute requiredRoles={[ 'student' ]}>
            <StudentStatusGuard>
              <DashboardLayout>
                <StudentGalleryPage />
              </DashboardLayout>
            </StudentStatusGuard>
          </ProtectedRoute>
        }
      />

      <Route
        path="/ai-assistant"
        element={
          <ProtectedRoute requiredRoles={['student']}>
            <StudentStatusGuard>
              <DashboardLayout>
                <AIAssistant />
              </DashboardLayout>
            </StudentStatusGuard>
          </ProtectedRoute>
        }
      />

      {/* Default Redirects */}
      <Route
        path="/"
        element={<Navigate to="/login" />}
      />

      {/* 404 */}
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
};

function App() {
  return (
    <Router>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </Router>
);
}

export default App;
