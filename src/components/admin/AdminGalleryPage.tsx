import React, { useState } from 'react';
import { Gallery } from '../common/Gallery';
import { getApiUrl } from '../../services/apiClient';

export const AdminGalleryPage: React.FC = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [eventName, setEventName] = useState('');
  const [uploading, setUploading] = useState(false);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFiles(Array.from(e.target.files || []));
  };

  const handleUpload = async () => {
    if (files.length === 0) return alert('Pick one or more files');
    setUploading(true);
    try {
      const formData = new FormData();
      files.forEach((file) => {
        formData.append('photos', file);
      });
      formData.append('eventName', eventName);

      const response = await fetch(getApiUrl('/photos'), {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        alert(payload.error || 'Upload failed');
        return;
      }

      alert(`${Array.isArray(payload.data) ? payload.data.length : files.length} photo(s) uploaded`);
      window.location.reload();
    } catch (error) {
      console.error('Upload failed:', error);
      alert('Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Photo Gallery (Admin)</h1>
          <p className="text-gray-600">Upload photos for events — teachers and students can view them.</p>
        </div>
      </div>

      <div className="p-4 bg-white rounded shadow-sm">
        <div className="flex flex-col md:flex-row gap-3 items-center">
          <input type="file" multiple onChange={handleFile} />
          <input value={eventName} onChange={(e) => setEventName(e.target.value)} placeholder="Event name" className="px-3 py-2 border rounded" />
          <button onClick={handleUpload} className="px-4 py-2 bg-blue-600 text-white rounded" disabled={uploading}>{uploading ? 'Uploading...' : 'Upload'}</button>
        </div>
        <div className="mt-2 text-sm text-gray-500">
          {files.length > 0 ? `${files.length} file(s) selected` : 'You can select multiple photos at once'}
        </div>
      </div>

      <Gallery canDelete />
    </div>
  );
};

export default AdminGalleryPage;
