import express, { Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { query } from '../config/database.js';
import { generateToken } from '../config/jwt.js';

const router = express.Router();

// Simple hash function for password (matching frontend)
const simpleHash = (password: string): string => {
  if (!password) return '';
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash.toString(36);
};

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { register_no, password } = req.body;

    if (!register_no || !password) {
      res.status(400).json({ error: 'Register number and password required' });
      return;
    }

    // Find user by register_no
    const result = await query(
      `SELECT id, register_no, name, role, password, class, assigned_classes,
              email, phone, subjects,
              NULLIF(TRIM(class_teacher_of), '') AS class_teacher_for
       FROM users
       WHERE register_no = $1`,
      [register_no]
    );

    if (result.rows.length === 0) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const user = result.rows[0];

    // Verify password (try both plain and hashed for backward compatibility)
    const hashedPassword = simpleHash(password);
    const isValid = user.password === hashedPassword || user.password === password;
    
    if (!isValid) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    // Generate token
    const token = generateToken(user.id, user.register_no, user.role);

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        register_no: user.register_no,
        name: user.name,
        role: user.role,
        class: user.class,
        assigned_classes: user.assigned_classes,
        email: user.email,
        phone: user.phone,
        subjects: user.subjects,
        status: user.status,
        class_teacher_for: user.class_teacher_for,
      },
    });
  } catch (error: any) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// GET /api/auth/me
router.get('/me', authenticateToken, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const result = await query(
      `SELECT id, register_no, name, role, email, class, assigned_classes, phone,
              subjects, status, NULLIF(TRIM(class_teacher_of), '') AS class_teacher_for
       FROM users
       WHERE id = $1`,
      [req.user.id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json({ success: true, user: result.rows[0] });
  } catch (error: any) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// POST /api/auth/change-password - Change password for authenticated user
router.post('/change-password', authenticateToken, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const { currentPassword, newPassword } = req.body;
    if (!newPassword) {
      res.status(400).json({ error: 'New password required' });
      return;
    }

    const result = await query(
      `SELECT id, password, first_login FROM users WHERE id = $1`,
      [req.user.id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const user = result.rows[0];

    // If not first_login, require currentPassword and verify
    if (!user.first_login) {
      if (!currentPassword) {
        res.status(400).json({ error: 'Current password required' });
        return;
      }

      if (simpleHash(currentPassword) !== user.password) {
        res.status(401).json({ error: 'Current password incorrect' });
        return;
      }
    }

    const hashed = simpleHash(newPassword);
    await query(`UPDATE users SET password = $1, first_login = false, updated_at = NOW() WHERE id = $2`, [hashed, req.user.id]);

    res.json({ success: true, message: 'Password changed successfully' });
  } catch (error: any) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Failed to change password' });
  }
});

export default router;
