import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  LayoutDashboard,
  Users,
  BookOpen,
  FileText,
  Bell,

  LogOut,
  X,
} from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

interface MenuItem {
  to: string;
  label: string;
  icon: React.ReactNode;
  roles: string[];
}

const menuItems: MenuItem[] = [
  {
    to: '/placeholder', // Will be replaced dynamically
    label: 'Dashboard',
    icon: <LayoutDashboard size={20} />,
    roles: ['admin', 'teacher', 'student', 'parent'],
  },
  {
    to: '/admin/users',
    label: 'USERS',
    icon: <Users size={20} />,
    roles: ['admin'],
  },
  {
    to: '/admin/fees',
    label: 'Fees',
    icon: <FileText size={20} />,
    roles: ['admin'],
  },
  {
    to: '/admin/performance',
    label: 'Performance',
    icon: <BookOpen size={20} />,
    roles: ['admin'],
  },
  {
    to: '/admin/notifications',
    label: 'Notifications',
    icon: <Bell size={20} />,
    roles: ['admin'],
  },
  {
    to: '/teacher/marks',
    label: 'Marks',
    icon: <BookOpen size={20} />,
    roles: ['teacher'],
  },
  {
    to: '/teacher/attendance',
    label: 'Attendance',
    icon: <FileText size={20} />,
    roles: ['teacher'],
  },
  {
    to: '/student/marks',
    label: 'My Marks',
    icon: <BookOpen size={20} />,
    roles: ['student', 'parent'],
  },
  {
    to: '/student/attendance',
    label: 'Attendance',
    icon: <FileText size={20} />,
    roles: ['student', 'parent'],
  },
  {
    to: '/student/fees',
    label: 'Fees',
    icon: <FileText size={20} />,
    roles: ['student', 'parent'],
  },
  {
    to: '/ai-assistant',
    label: 'AI Assistant',
    icon: <BookOpen size={20} />,
    roles: ['student', 'parent'],
  },
  {
    to: '/placeholder-gallery',
    label: 'Gallery',
    icon: <Users size={20} />,
    roles: ['admin', 'teacher', 'student', 'parent'],
  },
];

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { user, logout } = useAuth();
  const location = useLocation();

  // Determine correct dashboard path based on role
  const getDashboardPath = () => {
    switch (user?.role) {
      case 'admin':
        return '/dashboard';
      case 'teacher':
        return '/teacher/dashboard';
      case 'student':
        return '/student/dashboard';
      default:
        return '/dashboard';
    }
  };

  // Replace dashboard link with correct path
  const updatedMenuItems = menuItems.map((item) =>
    item.label === 'Dashboard'
      ? { ...item, to: getDashboardPath() }
      : item.label === 'Gallery'
      ? { ...item, to: (user?.role === 'admin' ? '/admin/gallery' : user?.role === 'teacher' ? '/teacher/gallery' : '/student/gallery') }
      : item
  );

  const filteredMenuItems = updatedMenuItems.filter((item) =>
    item.roles.includes(user?.role || 'student')
  );

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 md:hidden z-40"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 w-64 bg-gray-900 text-white transform transition-transform duration-300 z-40 flex flex-col overflow-y-auto overscroll-contain md:static md:translate-x-0 md:h-screen ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="p-6">
          <div className="flex justify-between items-center md:justify-center">
            <h2 className="text-xl font-bold">Menu</h2>
            <button
              onClick={onClose}
              className="md:hidden text-white hover:bg-gray-700 p-2 rounded"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <nav className="mt-8 flex-1 space-y-2 px-4 pb-6">
          {filteredMenuItems.map((item) => {
            const isActive = location.pathname.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => onClose()}
                className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-primary text-white'
                    : 'text-gray-300 hover:bg-gray-800'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Settings & Logout */}
        <div className="mt-auto border-t border-gray-700 p-4">
          <button
            onClick={logout}
            className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-gray-300 hover:bg-gray-800 transition-colors"
          >
            <LogOut size={20} />
            <span>Logout</span>
          </button>
        </div>
      </aside>
    </>
  );
};
