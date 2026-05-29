import express from 'express';
import fs from 'fs';
import path from 'path';
import multer from 'multer';
import { query } from '../config/database.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

const DATA_DIR = path.join(process.cwd(), 'data');
const UPLOAD_DIR = path.join(process.cwd(), 'uploads', 'photos');
const METADATA_FILE = path.join(DATA_DIR, 'photos.json');
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 15 * 1024 * 1024, files: 20 } });

type PhotoRecord = {
  id: string;
  filename: string;
  url: string;
  eventName: string;
  uploadedBy: string | null;
  createdAt: string;
};

// Ensure directories exist
fs.mkdirSync(UPLOAD_DIR, { recursive: true });
fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(METADATA_FILE)) fs.writeFileSync(METADATA_FILE, JSON.stringify([]));

const readLocalPhotos = (): PhotoRecord[] => {
  try {
    const raw = fs.readFileSync(METADATA_FILE, 'utf-8');
    const parsed = JSON.parse(raw || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error('Error reading local gallery metadata', error);
    return [];
  }
};

const writeLocalPhotos = (photos: PhotoRecord[]): void => {
  fs.writeFileSync(METADATA_FILE, JSON.stringify(photos, null, 2));
};

const normalizeDbRow = (row: any): PhotoRecord => ({
  id: String(row.id),
  filename: String(row.file_name || row.filename || ''),
  url: String(row.file_url || row.url || ''),
  eventName: String(row.event_name || row.eventName || 'General'),
  uploadedBy: row.uploaded_by ? String(row.uploaded_by) : null,
  createdAt: String(row.created_at || row.createdAt || new Date().toISOString()),
});

const getPhotoKey = (photo: PhotoRecord): string => photo.url || photo.filename || photo.id;

const isUuid = (value: unknown): value is string =>
  typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

const deleteFileIfExists = (fileUrlOrName: string): void => {
  const relativePath = fileUrlOrName.startsWith('/uploads/')
    ? fileUrlOrName.replace('/uploads/', '')
    : fileUrlOrName;
  const filePath = path.join(process.cwd(), 'uploads', relativePath);
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (error) {
    console.warn('Unable to delete gallery file:', error);
  }
};

// GET /api/photos - list photos
router.get('/', async (req, res) => {
  try {
    const localPhotos = readLocalPhotos();

    try {
      const result = await query(
        `SELECT id, event_name, file_name, file_url, uploaded_by, created_at
         FROM public.gallery_photos
         ORDER BY created_at DESC`
      );

      const dbPhotos = result.rows.map((photo: any) => normalizeDbRow(photo));
      const mergedPhotos = [...dbPhotos];
      const knownKeys = new Set(dbPhotos.map((photo) => getPhotoKey(photo)));

      localPhotos.forEach((photo) => {
        const key = getPhotoKey(photo);
        if (!knownKeys.has(key)) {
          mergedPhotos.push(photo);
          knownKeys.add(key);
        }
      });

      res.json({ success: true, data: mergedPhotos });
      return;
    } catch (dbError) {
      console.warn('Falling back to local gallery metadata:', dbError);
    }

    res.json({ success: true, data: localPhotos });
  } catch (err) {
    console.error('Error reading photos metadata', err);
    res.status(500).json({ success: false, error: 'Failed to read photos' });
  }
});

// POST /api/photos - upload photos (admin only)
// Multipart form-data: field name = photos
router.post('/', authenticateToken, requireAdmin, upload.array('photos', 20), async (req, res) => {
  try {
    const { eventName } = req.body;
    const files = Array.isArray(req.files) ? req.files : [];

    if (files.length === 0) {
      return res.status(400).json({ success: false, error: 'At least one photo file is required' });
    }

    const uploadedBy = isUuid(req.user?.id) ? req.user.id : null;
    const timestampBase = Date.now();
    const localPhotos = readLocalPhotos();
    const uploadedPhotos: PhotoRecord[] = [];

    for (const [index, file] of files.entries()) {
      const originalName = file.originalname || 'photo';
      const safeName = `${timestampBase + index}-${originalName.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
      const outPath = path.join(UPLOAD_DIR, safeName);
      fs.writeFileSync(outPath, file.buffer);

      const localRecord: PhotoRecord = {
        id: String(timestampBase + index),
        filename: safeName,
        url: `/uploads/photos/${safeName}`,
        eventName: eventName || 'General',
        uploadedBy: req.user?.id ? String(req.user.id) : null,
        createdAt: new Date().toISOString(),
      };
      uploadedPhotos.push(localRecord);

      try {
        const dbResult = await query(
          `INSERT INTO public.gallery_photos (event_name, file_name, file_url, uploaded_by)
           VALUES ($1, $2, $3, $4)
           RETURNING id, event_name, file_name, file_url, uploaded_by, created_at`,
          [localRecord.eventName, localRecord.filename, localRecord.url, uploadedBy]
        );

        uploadedPhotos[uploadedPhotos.length - 1] = normalizeDbRow(dbResult.rows[0]);
      } catch (dbError) {
        console.warn('Gallery metadata DB insert failed for one file, using local fallback:', dbError);
        localPhotos.unshift(localRecord);
      }
    }

    if (localPhotos.length > 0) {
      writeLocalPhotos(localPhotos);
    }
    res.json({ success: true, data: uploadedPhotos });
  } catch (err) {
    console.error('Error uploading photo', err);
    res.status(500).json({ success: false, error: 'Upload failed' });
  }
});

// DELETE /api/photos/:id - admin only
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const localPhotos = readLocalPhotos();
    const localMatch = localPhotos.find((photo) => photo.id === id);

    let dbMatch: PhotoRecord | null = null;
    try {
      const lookup = await query(
        `SELECT id, event_name, file_name, file_url, uploaded_by, created_at
         FROM public.gallery_photos
         WHERE id = $1
         LIMIT 1`,
        [id]
      );
      dbMatch = lookup.rows.length > 0 ? normalizeDbRow(lookup.rows[0]) : null;
    } catch (dbLookupError) {
      console.warn('Gallery delete lookup failed, continuing with local fallback:', dbLookupError);
    }

    const targetFile = localMatch?.url || dbMatch?.url || localMatch?.filename || dbMatch?.filename;
    if (targetFile) {
      deleteFileIfExists(targetFile);
    }

    const filteredLocalPhotos = localPhotos.filter((photo) => photo.id !== id && photo.url !== targetFile && photo.filename !== targetFile);
    writeLocalPhotos(filteredLocalPhotos);

    try {
      await query(`DELETE FROM public.gallery_photos WHERE id = $1`, [id]);
    } catch (dbDeleteError) {
      console.warn('Gallery delete DB operation failed, using local fallback:', dbDeleteError);
    }

    res.json({ success: true, message: 'Photo deleted successfully' });
  } catch (err) {
    console.error('Error deleting photo', err);
    res.status(500).json({ success: false, error: 'Delete failed' });
  }
});

export default router;
