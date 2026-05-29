import express, { Request, Response } from 'express';
import { query } from '../config/database.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

function normalizeStudentStatus(status: unknown): string {
  const normalized = String(status || 'Active').trim().toLowerCase();

  switch (normalized) {
    case 'inactive':
      return 'Inactive';
    case 'transferred':
      return 'Transferred';
    case 'dropped':
      return 'Dropped';
    case 'left':
      return 'Left';
    case 'graduated':
      return 'Graduated';
    case 'active':
    default:
      return 'Active';
  }
}

// GET /api/students/debug/check - Debug endpoint to check student data
router.get('/debug/check', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    // Get ALL students regardless of role to see what's in the database
    const allUsersResult = await query(`
      SELECT id, register_no, name, role, class, status, admission_year
      FROM users
      WHERE role = 'student'
      ORDER BY class, name
      LIMIT 100
    `);

    // Get class distribution
    const classDistResult = await query(`
      SELECT class, COUNT(*) as count
      FROM users
      WHERE role = 'student' AND class IS NOT NULL AND class != ''
      GROUP BY class
      ORDER BY class
    `);

    // Get students with NULL class
    const nullClassResult = await query(`
      SELECT COUNT(*) as count
      FROM users
      WHERE role = 'student' AND (class IS NULL OR class = '')
    `);

    res.json({
      success: true,
      debug: {
        totalStudents: allUsersResult.rows.length,
        studentsByClass: classDistResult.rows,
        studentsWithNullClass: nullClassResult.rows[0]?.count || 0,
        sampleStudents: allUsersResult.rows.slice(0, 10),
        allStudents: allUsersResult.rows,
      },
    });
  } catch (error: any) {
    console.error('Debug check error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/students - List all students with optional filters
router.get('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { class: className, admission_year, status, search, sortBy = 'register_no', sortOrder = 'asc', limit, offset, registerNo } = req.query;

    const conditions: string[] = ["role = 'student'"];
    const params: any[] = [];

    if (className) {
      params.push(String(className));
      conditions.push(`UPPER(class) = UPPER($${params.length})`);
    }
    if (admission_year) {
      params.push(Number(admission_year));
      conditions.push(`admission_year = $${params.length}`);
    }
    if (status) {
      params.push(String(status));
      conditions.push(`status = $${params.length}`);
    }
    if (registerNo) {
      params.push(String(registerNo));
      conditions.push(`register_no = $${params.length}`);
    }
    if (search) {
      params.push(`%${String(search)}%`);
      conditions.push(`(name ILIKE $${params.length} OR register_no ILIKE $${params.length} OR email ILIKE $${params.length})`);
    }

    const limitValue = limit ? Number(limit) : null;
    const offsetValue = offset ? Number(offset) : null;

    let sql = `SELECT id, register_no, name, email, class, admission_year, status, 
              phone, father_name, gender, accommodation_type, initial_fee, current_fee,
              created_at, updated_at
       FROM users 
       WHERE ${conditions.join(' AND ')}
       ORDER BY ${String(sortBy)} ${String(sortOrder).toUpperCase() === 'DESC' ? 'DESC' : 'ASC'}`;

    if (limitValue !== null) {
      params.push(limitValue);
      sql += ` LIMIT $${params.length}`;
      if (offsetValue !== null) {
        params.push(offsetValue);
        sql += ` OFFSET $${params.length}`;
      }
    }

    const result = await query(sql, params);

    console.log(`\n📝 SQL EXECUTED:`, sql);
    console.log(`📌 PARAMS:`, params);
    console.log(`✅ [GET /students] Retrieved ${result.rows.length} student(s) with filters:`, { className, admission_year, status, search });
    console.log(`📋 Students:`, result.rows.map((s: any) => ({ register_no: s.register_no, name: s.name, class: s.class, id: s.id })));

    res.json({
      success: true,
      data: result.rows,
    });
  } catch (error: any) {
    console.error('Get students error:', error);
    res.status(500).json({ error: 'Failed to fetch students' });
  }
});

// GET /api/students/register/:register_no - Get single student by register number
router.get('/register/:register_no', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { register_no } = req.params;

    const result = await query(
      `SELECT id, register_no, name, email, class, admission_year, status,
              phone, father_name, gender, accommodation_type, initial_fee, current_fee,
              created_at, updated_at
       FROM users 
       WHERE register_no = $1 AND role = 'student'`,
      [register_no]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Student not found' });
      return;
    }

    res.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error: any) {
    console.error('Get student error:', error);
    res.status(500).json({ error: 'Failed to fetch student' });
  }
});

// GET /api/students/:id - Get single student by id
router.get('/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const result = await query(
      `SELECT id, register_no, name, email, class, admission_year, status,
              phone, father_name, gender, accommodation_type, initial_fee, current_fee,
              created_at, updated_at
       FROM users 
       WHERE id = $1 AND role = 'student'`,
      [id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Student not found' });
      return;
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error: any) {
    console.error('Get student error:', error);
    res.status(500).json({ error: 'Failed to fetch student' });
  }
});

// PUT /api/students/register/:register_no - Update student by register number
router.put('/register/:register_no', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { register_no } = req.params;
    const { name, email, class: studentClass, phone, father_name, gender,
      accommodation_type, initial_fee, current_fee, status, password, admission_year } = req.body;
    const normalizedStatus = status !== undefined ? normalizeStudentStatus(status) : undefined;

    const result = await query(
      `UPDATE users 
       SET name = COALESCE($1, name),
           email = COALESCE($2, email),
           class = COALESCE($3, class),
           phone = COALESCE($4, phone),
           father_name = COALESCE($5, father_name),
           gender = COALESCE($6, gender),
           accommodation_type = COALESCE($7, accommodation_type),
           initial_fee = COALESCE($8, initial_fee),
           current_fee = COALESCE($9, current_fee),
           status = COALESCE($10, status),
           password = COALESCE($11, password),
           admission_year = COALESCE($12, admission_year),
           updated_at = NOW()
       WHERE register_no = $13 AND role = 'student'
       RETURNING id, register_no, name, class, email, phone, current_fee, updated_at, status`,
      [name, email, studentClass, phone, father_name, gender, accommodation_type, initial_fee, current_fee, normalizedStatus, password, admission_year, register_no]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Student not found' });
      return;
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error: any) {
    console.error('Update student by register error:', error);
    res.status(500).json({ error: 'Failed to update student' });
  }
});

// DELETE /api/students/register/:register_no - Delete student by register number
router.delete('/register/:register_no', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { register_no } = req.params;
    const result = await query(
      "DELETE FROM users WHERE register_no = $1 AND role = 'student' RETURNING register_no, name",
      [register_no]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Student not found' });
      return;
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error: any) {
    console.error('Delete student by register error:', error);
    res.status(500).json({ error: 'Failed to delete student' });
  }
});

// PUT /api/students/:register_no/promote - Promote student (ADMIN ONLY)
router.put('/:register_no/promote', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { register_no } = req.params;
    const { class: newClass, current_fee } = req.body;

    if (!newClass) {
      res.status(400).json({ error: 'New class is required' });
      return;
    }

    // Update student's class and fee
    const result = await query(
      `UPDATE users 
       SET class = $1, current_fee = $2, updated_at = NOW()
       WHERE register_no = $3 AND role = 'student'
       RETURNING id, register_no, name, class, current_fee, updated_at`,
      [newClass.toUpperCase(), current_fee || 0, register_no]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Student not found' });
      return;
    }

    res.json({
      success: true,
      message: `Student promoted to ${newClass}`,
      data: result.rows[0],
    });
  } catch (error: any) {
    console.error('Promote student error:', error);
    res.status(500).json({ error: 'Failed to promote student' });
  }
});

// POST /api/students - Create student (ADMIN ONLY)
router.post('/', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const {
      register_no, name, email, class: studentClass,
      phone, father_name, gender, accommodation_type,
      initial_fee, current_fee, admission_year, status
    } = req.body;
    const normalizedStatus = normalizeStudentStatus(status);

    if (!register_no || !name) {
      res.status(400).json({ error: 'Register number and name required' });
      return;
    }

    const result = await query(
      `INSERT INTO users (register_no, name, role, email, class, phone, father_name, 
                   gender, accommodation_type, initial_fee, current_fee, admission_year, status, created_at)
       VALUES ($1, $2, 'student', $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())
       RETURNING id, register_no, name, class, email, phone, created_at`,
      [register_no, name, email, studentClass, phone, father_name, gender, 
       accommodation_type, initial_fee, current_fee, admission_year, normalizedStatus]
    );

    res.status(201).json({
      success: true,
      message: 'Student created successfully',
      data: result.rows[0],
    });
  } catch (error: any) {
    console.error('Create student error:', error);
    if (error.code === '23505') {
      res.status(400).json({ error: 'Register number already exists' });
    } else {
      res.status(500).json({ error: 'Failed to create student' });
    }
  }
});

// PUT /api/students/:id - Update student (ADMIN ONLY)
router.put('/:id', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, email, class: studentClass, phone, father_name, gender, 
            accommodation_type, initial_fee, current_fee } = req.body;

    const result = await query(
      `UPDATE users 
       SET name = COALESCE($1, name),
           email = COALESCE($2, email),
           class = COALESCE($3, class),
           phone = COALESCE($4, phone),
           father_name = COALESCE($5, father_name),
           gender = COALESCE($6, gender),
           accommodation_type = COALESCE($7, accommodation_type),
           initial_fee = COALESCE($8, initial_fee),
           current_fee = COALESCE($9, current_fee),
           updated_at = NOW()
       WHERE id = $10 AND role = 'student'
       RETURNING id, register_no, name, class, email, phone, current_fee, updated_at`,
      [name, email, studentClass, phone, father_name, gender, accommodation_type, initial_fee, current_fee, id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Student not found' });
      return;
    }

    res.json({
      success: true,
      message: 'Student updated successfully',
      data: result.rows[0],
    });
  } catch (error: any) {
    console.error('Update student error:', error);
    res.status(500).json({ error: 'Failed to update student' });
  }
});

// DELETE /api/students/:id - Delete student (ADMIN ONLY)
router.delete('/:id', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const result = await query(
      "DELETE FROM users WHERE id = $1 AND role = 'student' RETURNING register_no, name",
      [id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Student not found' });
      return;
    }

    res.json({
      success: true,
      message: `Student deleted successfully`,
      data: result.rows[0],
    });
  } catch (error: any) {
    console.error('Delete student error:', error);
    res.status(500).json({ error: 'Failed to delete student' });
  }
});

export default router;
