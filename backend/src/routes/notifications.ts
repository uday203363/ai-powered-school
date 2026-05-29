import express, { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import multer from 'multer';
import { query } from '../config/database.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

const normalizeRole = (value: unknown): string => String(value || '').trim().toLowerCase();
const normalizeClass = (value: unknown): string => String(value || '').trim().toUpperCase();
const UPLOAD_DIR = path.join(process.cwd(), 'uploads', 'notifications');
const ATTACHMENTS_FILE = path.join(process.cwd(), 'data', 'notification_attachments.json');
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 15 * 1024 * 1024, files: 10 } });

let notificationColumnsCache: Set<string> | null = null;

const getNotificationColumns = async (): Promise<Set<string>> => {
  if (notificationColumnsCache) {
    return notificationColumnsCache;
  }

  const result = await query(
    `SELECT column_name
     FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'notifications'`
  );

  notificationColumnsCache = new Set(result.rows.map((row: any) => String(row.column_name).toLowerCase()));
  return notificationColumnsCache;
};

const buildNotificationSelect = (columns: Set<string>): string => {
  const selectColumns = ['id', 'message', 'target_role', 'target_class', 'created_at'];

  if (columns.has('title')) selectColumns.splice(1, 0, 'title');
  if (columns.has('type')) selectColumns.splice(selectColumns.indexOf('created_at'), 0, 'type');
  if (columns.has('is_read')) selectColumns.splice(selectColumns.indexOf('created_at'), 0, 'is_read');
  if (columns.has('attachment_files')) selectColumns.splice(selectColumns.indexOf('created_at'), 0, 'attachment_files');

  return selectColumns.join(', ');
};

const normalizeAttachmentFiles = (value: unknown): Array<{ name: string; url: string }> => {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value
      .map((item: any) => ({ name: String(item?.name || 'PDF'), url: String(item?.url || '') }))
      .filter((item) => item.name && item.url);
  }

  if (typeof value === 'string') {
    try {
      return normalizeAttachmentFiles(JSON.parse(value));
    } catch {
      return [];
    }
  }

  return [];
};

const saveAttachmentFile = (file: Express.Multer.File, prefix: string): { name: string; url: string } => {
  if (file.mimetype !== 'application/pdf' && !String(file.originalname || '').toLowerCase().endsWith('.pdf')) {
    throw new Error('Only PDF files are allowed');
  }

  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  const safeName = `${Date.now()}-${prefix}-${(file.originalname || 'file.pdf').replace(/[^a-zA-Z0-9._-]/g, '_')}`;
  fs.writeFileSync(path.join(UPLOAD_DIR, safeName), file.buffer);
  return { name: file.originalname || 'file.pdf', url: `/uploads/notifications/${safeName}` };
};

const readLocalAttachments = (): Record<string, Array<{ name: string; url: string }>> => {
  try {
    fs.mkdirSync(path.dirname(ATTACHMENTS_FILE), { recursive: true });
    if (!fs.existsSync(ATTACHMENTS_FILE)) {
      fs.writeFileSync(ATTACHMENTS_FILE, JSON.stringify({}));
    }

    const raw = fs.readFileSync(ATTACHMENTS_FILE, 'utf-8');
    const parsed = JSON.parse(raw || '{}');
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch (error) {
    console.error('Error reading local notification attachments', error);
    return {};
  }
};

const writeLocalAttachments = (attachments: Record<string, Array<{ name: string; url: string }>>): void => {
  fs.mkdirSync(path.dirname(ATTACHMENTS_FILE), { recursive: true });
  fs.writeFileSync(ATTACHMENTS_FILE, JSON.stringify(attachments, null, 2));
};

const attachLocalFiles = (notifications: any[]): any[] => {
  const localAttachments = readLocalAttachments();
  return notifications.map((notification) => {
    const existingAttachments = normalizeAttachmentFiles(notification.attachment_files);
    const localForNotification = localAttachments[String(notification.id)] || [];
    const mergedAttachments = [...existingAttachments];
    const seen = new Set(mergedAttachments.map((item) => item.url));

    localForNotification.forEach((item) => {
      if (item?.url && !seen.has(item.url)) {
        mergedAttachments.push(item);
        seen.add(item.url);
      }
    });

    return {
      ...notification,
      attachment_files: mergedAttachments,
    };
  });
};

router.get('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    const limit = Math.min(Math.max(Number(req.query.limit || 10), 1), 100);
    const role = normalizeRole(req.query.role);
    const className = String(req.query.class || req.query.className || '').trim();

    const userResult = await query(
      `SELECT id, role, class
       FROM users
       WHERE id = $1
       LIMIT 1`,
      [req.user?.id]
    );

    if (userResult.rows.length === 0) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const currentUser = userResult.rows[0];
    const currentRole = normalizeRole(currentUser.role);
    const currentClass = normalizeClass(currentUser.class);
    const notificationColumns = await getNotificationColumns();
    const selectColumns = buildNotificationSelect(notificationColumns);

    if (currentRole === 'admin') {
      const result = await query(
        `SELECT ${selectColumns}
         FROM notifications
         ORDER BY created_at DESC
         LIMIT $1`,
        [limit]
      );

      res.json({ success: true, data: attachLocalFiles(result.rows) });
      return;
    }

    const requestedRole = role || currentRole;
    const requestedClass = className ? normalizeClass(className) : currentClass;

    const result = await query(
      `SELECT ${selectColumns}
       FROM notifications
       WHERE (LOWER(COALESCE(target_role, 'all')) = 'all' OR LOWER(COALESCE(target_role, '')) = $1)
         AND (target_class IS NULL OR UPPER(COALESCE(target_class, '')) = $2)
       ORDER BY created_at DESC
       LIMIT $3`,
      [requestedRole, requestedClass, limit]
    );

    res.json({ success: true, data: attachLocalFiles(result.rows) });
  } catch (error: any) {
    console.error('Get notifications error:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// Admin-only: recent notifications (quick view)
router.get('/recent-admin', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const limit = Math.min(Math.max(Number(req.query.limit || 5), 1), 50);
    const notificationColumns = await getNotificationColumns();
    const selectColumns = buildNotificationSelect(notificationColumns);

    const result = await query(
      `SELECT ${selectColumns}
       FROM notifications
       ORDER BY created_at DESC
       LIMIT $1`,
      [limit]
    );

    res.json({ success: true, data: attachLocalFiles(result.rows) });
  } catch (error: any) {
    console.error('Recent admin notifications error:', error);
    res.status(500).json({ error: 'Failed to fetch recent notifications' });
  }
});

// Admin-only: important notifications (warnings/errors or admin-targeted)
router.get('/important-admin', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const limit = Math.min(Math.max(Number(req.query.limit || 10), 1), 100);
    const notificationColumns = await getNotificationColumns();
    const selectColumns = buildNotificationSelect(notificationColumns);

    const result = await query(
      `SELECT ${selectColumns}
       FROM notifications
       WHERE type IN ('warning','error') OR LOWER(COALESCE(target_role,'') ) = 'admin'
       ORDER BY created_at DESC
       LIMIT $1`,
      [limit]
    );

    res.json({ success: true, data: attachLocalFiles(result.rows) });
  } catch (error: any) {
    console.error('Important admin notifications error:', error);
    res.status(500).json({ error: 'Failed to fetch important notifications' });
  }
});

router.post('/', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const {
      title,
      message,
      target_role,
      target_class,
      type = 'info',
    } = req.body;

    const normalizedMessage = String(message || '').trim();
    if (!normalizedMessage) {
      res.status(400).json({ error: 'Message is required' });
      return;
    }

    const normalizedTitle = String(title || normalizedMessage || 'Notification').trim().slice(0, 120);
    const normalizedRole = normalizeRole(target_role || 'all');
    const normalizedClass = target_class ? normalizeClass(target_class) : null;
    const notificationColumns = await getNotificationColumns();
    const attachmentFiles = normalizeAttachmentFiles((req.body as any).attachment_files);
    const uploadedPdfs = (Array.isArray((req as any).files) ? (req as any).files : []) as Express.Multer.File[];
    const combinedAttachments = [...attachmentFiles, ...uploadedPdfs.map((file, index) => saveAttachmentFile(file, String(index + 1)))];

    const insertColumns: string[] = [];
    const insertValues: any[] = [];
    const placeholders: string[] = [];

    insertColumns.push('message');
    insertValues.push(normalizedMessage);
    placeholders.push(`$${insertValues.length}`);

    if (notificationColumns.has('title')) {
      insertColumns.push('title');
      insertValues.push(normalizedTitle);
      placeholders.push(`$${insertValues.length}`);
    }

    if (notificationColumns.has('target_role')) {
      insertColumns.push('target_role');
      insertValues.push(normalizedRole);
      placeholders.push(`$${insertValues.length}`);
    }

    if (notificationColumns.has('target_class')) {
      insertColumns.push('target_class');
      insertValues.push(normalizedClass);
      placeholders.push(`$${insertValues.length}`);
    }

    if (notificationColumns.has('type')) {
      insertColumns.push('type');
      insertValues.push(type);
      placeholders.push(`$${insertValues.length}`);
    }

    if (notificationColumns.has('attachment_files')) {
      insertColumns.push('attachment_files');
      insertValues.push(combinedAttachments.length > 0 ? JSON.stringify(combinedAttachments) : null);
      placeholders.push(`$${insertValues.length}`);
    }

    if (notificationColumns.has('is_read')) {
      insertColumns.push('is_read');
      insertValues.push(false);
      placeholders.push(`$${insertValues.length}`);
    }

    if (notificationColumns.has('created_at')) {
      insertColumns.push('created_at');
      insertValues.push(new Date().toISOString());
      placeholders.push(`$${insertValues.length}`);
    }

    const returningColumns = buildNotificationSelect(notificationColumns);
    const result = await query(
      `INSERT INTO notifications (${insertColumns.join(', ')})
       VALUES (${placeholders.join(', ')})
       RETURNING ${returningColumns}`,
      insertValues
    );

    if (!notificationColumns.has('attachment_files') && combinedAttachments.length > 0) {
      const localAttachments = readLocalAttachments();
      const notificationId = String(result.rows[0]?.id);
      localAttachments[notificationId] = combinedAttachments;
      writeLocalAttachments(localAttachments);
    }

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error: any) {
    console.error('Create notification error:', error);
    res.status(500).json({ error: 'Failed to send notification' });
  }
});

router.post('/pdfs', authenticateToken, requireAdmin, upload.array('pdfs', 10), async (req: Request, res: Response) => {
  try {
    const { title, message, target_role, target_class, type = 'info' } = req.body;
    const normalizedMessage = String(message || '').trim();
    if (!normalizedMessage) {
      res.status(400).json({ error: 'Message is required' });
      return;
    }

    const pdfFiles = Array.isArray((req as any).files) ? ((req as any).files as Express.Multer.File[]) : [];
    if (pdfFiles.length === 0) {
      res.status(400).json({ error: 'At least one PDF file is required' });
      return;
    }

    const notificationColumns = await getNotificationColumns();
    const normalizedTitle = String(title || normalizedMessage || 'Notification').trim().slice(0, 120);
    const normalizedRole = normalizeRole(target_role || 'all');
    const normalizedClass = target_class ? normalizeClass(target_class) : null;
    const attachments = pdfFiles.map((file, index) => saveAttachmentFile(file, `pdf-${index + 1}`));

    const insertColumns: string[] = ['message'];
    const insertValues: any[] = [normalizedMessage];
    const placeholders: string[] = ['$1'];

    if (notificationColumns.has('title')) {
      insertColumns.push('title');
      insertValues.push(normalizedTitle);
      placeholders.push(`$${insertValues.length}`);
    }

    if (notificationColumns.has('target_role')) {
      insertColumns.push('target_role');
      insertValues.push(normalizedRole);
      placeholders.push(`$${insertValues.length}`);
    }

    if (notificationColumns.has('target_class')) {
      insertColumns.push('target_class');
      insertValues.push(normalizedClass);
      placeholders.push(`$${insertValues.length}`);
    }

    if (notificationColumns.has('type')) {
      insertColumns.push('type');
      insertValues.push(type);
      placeholders.push(`$${insertValues.length}`);
    }

    if (notificationColumns.has('attachment_files')) {
      insertColumns.push('attachment_files');
      insertValues.push(JSON.stringify(attachments));
      placeholders.push(`$${insertValues.length}`);
    }

    if (notificationColumns.has('is_read')) {
      insertColumns.push('is_read');
      insertValues.push(false);
      placeholders.push(`$${insertValues.length}`);
    }

    if (notificationColumns.has('created_at')) {
      insertColumns.push('created_at');
      insertValues.push(new Date().toISOString());
      placeholders.push(`$${insertValues.length}`);
    }

    const returningColumns = buildNotificationSelect(notificationColumns);
    const result = await query(
      `INSERT INTO notifications (${insertColumns.join(', ')})
       VALUES (${placeholders.join(', ')})
       RETURNING ${returningColumns}`,
      insertValues
    );

    const notificationId = String(result.rows[0]?.id);
    if (!notificationColumns.has('attachment_files') && attachments.length > 0) {
      const localAttachments = readLocalAttachments();
      localAttachments[notificationId] = attachments;
      writeLocalAttachments(localAttachments);
    }

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error: any) {
    console.error('Create PDF notification error:', error);
    res.status(500).json({ error: 'Failed to send notification with PDFs' });
  }
});

export default router;