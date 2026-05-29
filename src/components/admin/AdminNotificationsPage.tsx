import React, { useState } from 'react';
import { Card, Button, Input } from '../../components/common';
import { notificationService } from '../../services';
import { useAuth } from '../../contexts/AuthContext';
import { Send } from 'lucide-react';

export const AdminNotificationsPage: React.FC = () => {
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [targetRole, setTargetRole] = useState('all');
  const [targetClass, setTargetClass] = useState('');
  const [pdfFiles, setPdfFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const handlePdfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPdfFiles(Array.from(e.target.files || []).filter((file) => file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')));
  };

  const handleSendNotification = async () => {
    if (!message.trim()) {
      setError('Please enter a message');
      setSuccess('');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const result = await notificationService.sendNotification({
        title: title || message.slice(0, 40),
        message,
        target_role: targetRole as any,
        target_class: targetClass || undefined,
        created_by: user?.id || '',
        attachments: pdfFiles,
      });

      if (result.success) {
        setSuccess('Notification sent successfully!');
        setTitle('');
        setMessage('');
        setTargetRole('all');
        setTargetClass('');
        setPdfFiles([]);
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(typeof result.error === 'string' ? result.error : 'Failed to send notification');
      }
    } catch (error) {
      console.error('Error sending notification:', error);
      setError(error instanceof Error ? error.message : 'Failed to send notification');
    }
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">Send Notifications</h1>

      {success && (
        <div className="bg-secondary bg-opacity-10 border border-secondary text-secondary px-4 py-3 rounded-lg">
          {success}
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      <Card>
        <h2 className="text-xl font-bold mb-6">Compose Message</h2>

        <div className="space-y-4">
          <Input
            label="Notification Title"
            placeholder="e.g., Exam Schedule"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Target Audience
            </label>
            <select
              value={targetRole}
              onChange={(e) => setTargetRole(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="all">All Users</option>
              <option value="admin">Admins Only</option>
              <option value="teacher">Teachers Only</option>
              <option value="student">Students Only</option>
              <option value="parent">Parents Only</option>
            </select>
          </div>

          {(targetRole === 'student' || targetRole === 'parent') && (
            <Input
              label="Target Class (Optional)"
              placeholder="e.g., Class A"
              value={targetClass}
              onChange={(e) => setTargetClass(e.target.value)}
            />
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Message
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Enter your notification message..."
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              rows={6}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Attach PDF(s) to Notification
            </label>
            <input
              type="file"
              accept="application/pdf,.pdf"
              multiple
              onChange={handlePdfChange}
              className="w-full text-sm text-gray-700 file:mr-4 file:rounded-lg file:border-0 file:bg-primary file:px-4 file:py-2 file:text-white hover:file:bg-blue-700"
            />
            <p className="mt-2 text-xs text-gray-500">
              {pdfFiles.length > 0 ? `${pdfFiles.length} PDF(s) selected` : 'Optional. Add one or more PDFs for students and teachers to open or download.'}
            </p>
          </div>

          <Button
            onClick={handleSendNotification}
            disabled={loading}
            className="w-full flex items-center justify-center space-x-2"
          >
            <Send size={18} />
            <span>{loading ? 'Sending...' : 'Send Notification'}</span>
          </Button>
        </div>
      </Card>

      <Card>
        <h2 className="text-xl font-bold mb-4">Notification Templates</h2>
        <div className="space-y-2">
          <button
            onClick={() => setMessage('Attendance will be conducted tomorrow. Please be on time.')}
            className="w-full text-left p-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            📌 Attendance Reminder
          </button>
          <button
            onClick={() => setMessage('Fee payment deadline is approaching. Please complete your payment.')}
            className="w-full text-left p-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            💰 Fee Payment Reminder
          </button>
          <button
            onClick={() => setMessage('Exam schedule has been released. Please check the notice board.')}
            className="w-full text-left p-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            📝 Exam Announcement
          </button>
        </div>
      </Card>
    </div>
  );
};
