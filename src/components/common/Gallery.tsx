import React, { useEffect, useState } from 'react';
import { apiRequest, getStaticUrl } from '../../services/apiClient';
import { Trash2 } from 'lucide-react';

interface GalleryProps {
  canDelete?: boolean;
}

export const Gallery: React.FC<GalleryProps> = ({ canDelete = false }) => {
  const [photos, setPhotos] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const res = await apiRequest<any[]>('/photos');
    if (res.success && res.data) {
      setPhotos(res.data);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const handleDelete = async (photoId: string) => {
    const confirmed = window.confirm('Delete this photo?');
    if (!confirmed) return;

    setDeletingId(photoId);
    try {
      const res = await apiRequest(`/photos/${photoId}`, { method: 'DELETE' });
      if (!res.success) {
        alert(res.error || 'Delete failed');
        return;
      }

      setPhotos((current) => current.filter((photo) => photo.id !== photoId));
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) return <div>Loading gallery...</div>;

  if (!photos || photos.length === 0) return <div className="text-center text-gray-500">No photos uploaded yet.</div>;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {photos.map((p) => (
        <a
          key={p.id}
          href={getStaticUrl(p.url)}
          target="_blank"
          rel="noreferrer"
          className="relative rounded overflow-hidden shadow-sm bg-white block hover:shadow-md transition-shadow"
          title="Open image"
        >
          {canDelete && (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleDelete(p.id);
              }}
              disabled={deletingId === p.id}
              className="absolute right-2 top-2 z-10 inline-flex items-center gap-1 rounded-full bg-red-600 px-3 py-1 text-xs font-semibold text-white shadow hover:bg-red-700 disabled:opacity-60"
              title="Delete photo"
            >
              <Trash2 size={14} />
              {deletingId === p.id ? 'Deleting...' : 'Delete'}
            </button>
          )}
          <div className="bg-gray-50">
            <img
              src={getStaticUrl(p.url)}
              alt={p.eventName}
              className="w-full h-48 object-cover bg-gray-100"
              loading="lazy"
            />
          </div>
          <div className="p-2">
            <div className="font-semibold text-sm truncate">{p.eventName}</div>
            <div className="text-xs text-gray-500">{new Date(p.createdAt).toLocaleString()}</div>
          </div>
        </a>
      ))}
    </div>
  );
};

export default Gallery;
