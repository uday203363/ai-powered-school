import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { notificationService } from '../../services';
import { Bell, FileText, LogOut, Menu, X } from 'lucide-react';
import { getStaticUrl } from '../../services/apiClient';

const notificationTimeFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium',
  timeStyle: 'short',
});

function formatNotificationTime(value: unknown): string {
  const date = new Date(String(value || ''));
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return notificationTimeFormatter.format(date);
}

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const [showMenu, setShowMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const loadNotifications = async () => {
    if (!user) return;

    let result;
    if (user.role === 'admin') {
      result = await notificationService.getNotifications(10);
    } else {
      result = await notificationService.getNotificationsByRole(user.role, user.class);
    }

    if (result.success) {
      setNotifications(result.data || []);
      setUnreadCount(result.data?.length || 0);
    }
  };

  return (
    <nav className="bg-gradient-to-r from-primary to-blue-600 text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          {/* Logo */}
          <div className="flex-shrink-0 flex items-center space-x-3">
            <img 
              src="/logo.jpeg" 
              alt="Sri Bhashyam Public School" 
              className="w-10 h-10 rounded-full object-cover border-2 border-white"
            />
            <div>
              <h1 className="text-xl font-bold leading-none">Sri Bhashyam</h1>
              <p className="text-xs opacity-90">Public School</p>
            </div>
          </div>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center space-x-8">
            <span>{user?.name}</span>
            <span className="text-sm bg-white bg-opacity-20 px-3 py-1 rounded">
              {user?.role.toUpperCase()}
            </span>

            {/* Notifications */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative hover:bg-white hover:bg-opacity-20 p-2 rounded"
              >
                <Bell size={20} />
                {unreadCount > 0 && (
                  <span className="absolute top-0 right-0 bg-danger text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    {unreadCount}
                  </span>
                )}
              </button>

              {/* Notifications Dropdown */}
              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 bg-white text-gray-800 rounded-lg shadow-xl z-50 max-h-96 overflow-y-auto">
                  <div className="p-4 border-b font-bold">Notifications</div>
                  {notifications.length > 0 ? (
                    notifications.map((notif) => (
                      <div
                        key={notif.id}
                        className="p-3 border-b hover:bg-gray-100 cursor-pointer text-sm"
                      >
                        <p>{notif.message}</p>
                        {Array.isArray(notif.attachment_files) && notif.attachment_files.length > 0 && (
                          <div className="mt-2 space-y-1">
                            {notif.attachment_files.map((file: { name: string; url: string }) => (
                              <a
                                key={file.url}
                                href={getStaticUrl(file.url)}
                                target="_blank"
                                rel="noreferrer"
                                className="flex items-center gap-2 text-primary font-medium hover:underline"
                              >
                                <FileText size={14} />
                                <span>{file.name || 'PDF attachment'}</span>
                              </a>
                            ))}
                          </div>
                        )}
                        <span className="text-xs text-gray-500">
                          {formatNotificationTime(notif.created_at)}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="p-4 text-center text-gray-500">
                      No notifications
                    </div>
                  )}
                </div>
              )}
            </div>

            <button
              onClick={logout}
              className="flex items-center space-x-2 hover:bg-white hover:bg-opacity-20 px-3 py-2 rounded"
            >
              <LogOut size={18} />
              <span>Logout</span>
            </button>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="md:hidden text-white"
          >
            {showMenu ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Menu */}
        {showMenu && (
          <div className="md:hidden pb-4">
            <div className="text-sm space-y-2">
              <p>{user?.name}</p>
              <button
                onClick={() => {
                  logout();
                  setShowMenu(false);
                }}
                className="w-full text-left hover:bg-white hover:bg-opacity-20 px-3 py-2 rounded flex items-center space-x-2"
              >
                <LogOut size={18} />
                <span>Logout</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};
