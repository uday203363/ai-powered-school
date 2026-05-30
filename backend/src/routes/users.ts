import express, { Request, Response } from 'express';
import { query } from '../config/database.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';

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

const normalizeEmail = (value: unknown): string => String(value || '').trim().toLowerCase();

const router = express.Router();

// GET /api/users - List all users (ADMIN ONLY)
router.get('/', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const result = await query(
      `SELECT id, register_no, name, email, role, class, phone, gender, assigned_classes, class_teacher_of, class_teacher_of AS class_teacher_for, subjects, status, admission_year, father_name, created_at, updated_at
       FROM users 
       ORDER BY created_at DESC`
    );

    res.json({
      success: true,
      data: result.rows,
    });
  } catch (error: any) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// GET /api/users/:id - Get single user (ADMIN ONLY)
router.get('/:id', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const result = await query(
      `SELECT id, register_no, name, email, role, class, phone, gender, assigned_classes, class_teacher_of, class_teacher_of AS class_teacher_for, subjects, status, admission_year, father_name, created_at, updated_at
       FROM users 
       WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error: any) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// POST /api/users - Create user (ADMIN ONLY)
router.post('/', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const {
      register_no,
      name,
      email,
      role,
      class: userClass,
      phone,
      password,
      assigned_classes,
      subjects,
      fees,
      gender,
      first_login,
      status,
      admission_year,
      father_name,
      parent_email,
      parent_phone,
      address,
      date_of_birth,
      current_fee,
      initial_fee,
      accommodation_type,
    } = req.body;

    if (!register_no || !name || !role || !password) {
      res.status(400).json({ error: 'Register number, name, role, and password required' });
      return;
    }

    const normalizedEmail = normalizeEmail(email);
    const isStudentRegistration = String(role || '').trim().toLowerCase() === 'student';
    if (isStudentRegistration && normalizedEmail) {
      const emailUsage = await query(
        `SELECT COUNT(*)::int AS usage_count
         FROM users
         WHERE LOWER(COALESCE(email, '')) = $1`,
        [normalizedEmail]
      );

      const currentEmailUsage = emailUsage.rows?.[0]?.usage_count || 0;
      if (currentEmailUsage >= 3) {
        res.status(400).json({ error: 'This email has already been used 3 times' });
        return;
      }
    }

    // Hash password (same as frontend)
    const hashedPassword = simpleHash(password);

    const result = await query(
      `INSERT INTO users (
        register_no, name, email, role, class, phone, password, status, created_at,
        assigned_classes, subjects, fees, gender, first_login, admission_year,
        father_name, parent_email, parent_phone, address, date_of_birth,
        current_fee, initial_fee, accommodation_type
      )
       VALUES (
        $1, $2, $3, $4, $5, $6, $7,
        COALESCE($8, 'Active'), NOW(),
        $9, $10, $11, $12, COALESCE($13, false), $14,
        $15, $16, $17, $18, $19,
        $20, $21, $22
       )
       RETURNING *`,
      [
        register_no,
        name,
        email,
        role,
        userClass,
        phone,
        hashedPassword,
        status || 'Active',
        assigned_classes || null,
        subjects || null,
        fees || null,
        gender || null,
        first_login,
        admission_year || null,
        father_name || null,
        parent_email || null,
        parent_phone || null,
        address || null,
        date_of_birth || null,
        current_fee || null,
        initial_fee || null,
        accommodation_type || null,
      ]
    );

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: result.rows[0],
    });
  } catch (error: any) {
    console.error('Create user error:', error);
    if (error.code === '23505') {
      const detailText = String(error.detail || error.message || '').toLowerCase();
      if (detailText.includes('email')) {
        res.status(400).json({ error: 'Email already exists' });
      } else {
        res.status(400).json({ error: 'Register number already exists' });
      }
    } else {
      res.status(500).json({ error: 'Failed to create user' });
    }
  }
});

// PUT /api/users/:id - Update user (ADMIN ONLY)
router.put('/:id', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      currentPassword,
      name,
      email,
      role,
      class: userClass,
      phone,
      password,
      assigned_classes,
      subjects,
      fees,
      gender,
      first_login,
      status,
      admission_year,
      father_name,
      parent_email,
      parent_phone,
      address,
      date_of_birth,
      current_fee,
      initial_fee,
      accommodation_type,
    } = req.body;

    // If currentPassword provided, verify it before allowing password change
    if (currentPassword) {
      const existing = await query(`SELECT COALESCE(NULLIF(password, ''), NULLIF(encrypted_password, '')) AS password FROM users WHERE id = $1`, [id]);
      const stored = existing.rows?.[0]?.password || '';
      const hashedCurrent = simpleHash(currentPassword);
      if (stored !== hashedCurrent && stored !== currentPassword) {
        res.status(401).json({ error: 'Current password incorrect' });
        return;
      }
    }

    let updateQuery = `UPDATE users SET `;
    const updateParams: any[] = [];
    let paramCount = 1;

    if (name) {
      updateQuery += `name = $${paramCount++}, `;
      updateParams.push(name);
    }
    if (email) {
      const normalizedEmail = normalizeEmail(email);
      const isStudentUpdate = String(role || '').trim().toLowerCase() === 'student';
      if (isStudentUpdate && normalizedEmail) {
        const emailUsage = await query(
          `SELECT COUNT(*)::int AS usage_count
           FROM users
           WHERE LOWER(COALESCE(email, '')) = $1
             AND id <> $2`,
          [normalizedEmail, id]
        );

        const currentEmailUsage = emailUsage.rows?.[0]?.usage_count || 0;
        if (currentEmailUsage >= 3) {
          res.status(400).json({ error: 'This email has already been used 3 times' });
          return;
        }
      }

      updateQuery += `email = $${paramCount++}, `;
      updateParams.push(email);
    }
    if (role) {
      updateQuery += `role = $${paramCount++}, `;
      updateParams.push(role);
    }
    if (userClass) {
      updateQuery += `class = $${paramCount++}, `;
      updateParams.push(userClass);
    }
    if (phone) {
      updateQuery += `phone = $${paramCount++}, `;
      updateParams.push(phone);
    }
    if (password) {
      const hashedPassword = simpleHash(password);
      updateQuery += `password = $${paramCount++}, `;
      updateParams.push(hashedPassword);
    }

    if (assigned_classes !== undefined) {
      updateQuery += `assigned_classes = $${paramCount++}, `;
      updateParams.push(assigned_classes);
    }
    if (subjects !== undefined) {
      updateQuery += `subjects = $${paramCount++}, `;
      updateParams.push(subjects);
    }
    if (fees !== undefined) {
      updateQuery += `fees = $${paramCount++}, `;
      updateParams.push(fees);
    }
    if (gender !== undefined) {
      updateQuery += `gender = $${paramCount++}, `;
      updateParams.push(gender);
    }
    if (first_login !== undefined) {
      updateQuery += `first_login = $${paramCount++}, `;
      updateParams.push(first_login);
    }
    if (status !== undefined) {
      updateQuery += `status = $${paramCount++}, `;
      updateParams.push(status);
    }
    if (admission_year !== undefined) {
      updateQuery += `admission_year = $${paramCount++}, `;
      updateParams.push(admission_year);
    }
    if (father_name !== undefined) {
      updateQuery += `father_name = $${paramCount++}, `;
      updateParams.push(father_name);
    }
    if (parent_email !== undefined) {
      updateQuery += `parent_email = $${paramCount++}, `;
      updateParams.push(parent_email);
    }
    if (parent_phone !== undefined) {
      updateQuery += `parent_phone = $${paramCount++}, `;
      updateParams.push(parent_phone);
    }
    if (address !== undefined) {
      updateQuery += `address = $${paramCount++}, `;
      updateParams.push(address);
    }
    if (date_of_birth !== undefined) {
      updateQuery += `date_of_birth = $${paramCount++}, `;
      updateParams.push(date_of_birth);
    }
    if (current_fee !== undefined) {
      updateQuery += `current_fee = $${paramCount++}, `;
      updateParams.push(current_fee);
    }
    if (initial_fee !== undefined) {
      updateQuery += `initial_fee = $${paramCount++}, `;
      updateParams.push(initial_fee);
    }
    if (accommodation_type !== undefined) {
      updateQuery += `accommodation_type = $${paramCount++}, `;
      updateParams.push(accommodation_type);
    }

    updateQuery += `updated_at = NOW() WHERE id = $${paramCount++} RETURNING id, register_no, name, email, role, class, phone, gender, updated_at`;
    updateParams.push(id);

    const result = await query(updateQuery, updateParams);

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json({
      success: true,
      message: 'User updated successfully',
      data: result.rows[0],
    });
  } catch (error: any) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// DELETE /api/users/:id - Delete user (ADMIN ONLY)
router.delete('/:id', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const result = await query(
      'DELETE FROM users WHERE id = $1 RETURNING register_no, name',
      [id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json({
      success: true,
      message: 'User deleted successfully',
      data: result.rows[0],
    });
  } catch (error: any) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// GET /api/users/teachers - List all teachers
router.get('/teachers/all', authenticateToken, async (req: Request, res: Response) => {
  try {
    const result = await query(
      `SELECT id, register_no, name, email, role, class, phone, assigned_classes, class_teacher_of, class_teacher_of AS class_teacher_for, subjects, status, admission_year, created_at, updated_at
       FROM users 
       WHERE role = 'teacher'
       ORDER BY name ASC`
    );

    res.json({
      success: true,
      data: result.rows,
    });
  } catch (error: any) {
    console.error('Get teachers error:', error);
    res.status(500).json({ error: 'Failed to fetch teachers' });
  }
});

export default router;
