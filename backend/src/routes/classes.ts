import express, { Request, Response } from 'express';
import { query } from '../config/database.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// GET /api/classes - List all classes
router.get('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    const result = await query(
      `SELECT id, class_name, max_students, current_students, subjects, created_at, updated_at
       FROM class_config 
       ORDER BY class_name ASC`
    );

    res.json({
      success: true,
      data: result.rows,
    });
  } catch (error: any) {
    console.error('Get classes error:', error);
    res.status(500).json({ error: 'Failed to fetch classes' });
  }
});

// GET /api/classes/teacher/:className - Get class teacher for a class
router.get('/teacher/:className', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { className } = req.params;
    const normalizedClassName = String(className || '').trim().toUpperCase();

    // Support single class_teacher_of value (one teacher per class only)
    const result = await query(
      `SELECT id, register_no, name, email, role, assigned_classes, class_teacher_of, class_teacher_of AS class_teacher_for, subjects, status
       FROM users
       WHERE role = 'teacher'
       AND TRIM(UPPER(class_teacher_of)) = $1`,
      [normalizedClassName]
    );

    if (result.rows.length === 0) {
      return res.json({
        success: true,
        data: null,
      });
    }

    res.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error: any) {
    console.error('Get class teacher error:', error);
    res.status(500).json({ error: 'Failed to fetch class teacher' });
  }
});

// PUT /api/classes/teacher/:className - Assign teacher to class
router.put('/teacher/:className', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { className } = req.params;
    const normalizedClassName = String(className || '').trim().toUpperCase();
    const { teacherId } = req.body;

    if (!teacherId) {
      res.status(400).json({ error: 'Teacher ID required' });
      return;
    }

    // Step 1: Remove this class from any other teacher who currently has it
    await query(
      `UPDATE users
       SET class_teacher_of = NULL
       WHERE role = 'teacher' AND TRIM(UPPER(class_teacher_of)) = $1`,
      [normalizedClassName]
    );

    // Step 2: Clear any previous class assignment for this teacher (one teacher = one class only)
    await query(
      `UPDATE users
       SET class_teacher_of = NULL
       WHERE id = $1 AND role = 'teacher'`,
      [teacherId]
    );

    // Step 3: Assign the new class to this teacher
    const result = await query(
      `UPDATE users
       SET class_teacher_of = $1
       WHERE id = $2 AND role = 'teacher'
       RETURNING id, register_no, name, email, role, assigned_classes, class_teacher_of, class_teacher_of AS class_teacher_for, subjects, status`,
      [normalizedClassName, teacherId]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Teacher not found' });
      return;
    }

    res.json({
      success: true,
      message: 'Class teacher assigned successfully',
      data: result.rows[0],
    });
  } catch (error: any) {
    console.error('Assign class teacher error:', error);
    res.status(500).json({ error: 'Failed to assign class teacher' });
  }
});

// PUT /api/classes/teacher/:className/remove - Remove class teacher from class
router.put('/teacher/:className/remove', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { className } = req.params;
    const normalizedClassName = String(className || '').trim().toUpperCase();

    // Remove the class from the teacher who has it
    const result = await query(
      `UPDATE users
       SET class_teacher_of = NULL
       WHERE role = 'teacher' AND TRIM(UPPER(class_teacher_of)) = $1
       RETURNING id, register_no, name, email, role, assigned_classes, class_teacher_of, class_teacher_of AS class_teacher_for, subjects, status`,
      [normalizedClassName]
    );

    res.json({
      success: true,
      message: 'Class teacher removed successfully',
      data: result.rows,
    });
  } catch (error: any) {
    console.error('Remove class teacher error:', error);
    res.status(500).json({ error: 'Failed to remove class teacher' });
  }
});

// GET /api/classes/:id - Get single class
router.get('/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const result = await query(
      `SELECT id, class_name, max_students, current_students, subjects, created_at, updated_at
       FROM class_config 
       WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Class not found' });
      return;
    }

    res.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error: any) {
    console.error('Get class error:', error);
    res.status(500).json({ error: 'Failed to fetch class' });
  }
});

// POST /api/classes - Create class (ADMIN ONLY)
router.post('/', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { class_name, max_students, subjects } = req.body;

    if (!class_name || max_students === undefined || max_students === null) {
      res.status(400).json({ error: 'Class name and max students required' });
      return;
    }

    const maxStudentsNum = parseInt(String(max_students), 10);
    if (isNaN(maxStudentsNum) || maxStudentsNum <= 0) {
      res.status(400).json({ error: 'Max students must be a positive number' });
      return;
    }

    console.log('Creating class with:', { class_name, max_students: maxStudentsNum, subjects });

    const result = await query(
      `INSERT INTO class_config (class_name, max_students, current_students, subjects, created_at)
       VALUES ($1, $2, 0, $3, NOW())
       RETURNING id, class_name, max_students, current_students, subjects, created_at`,
      [class_name.toUpperCase(), maxStudentsNum, subjects || null]
    );

    res.status(201).json({
      success: true,
      message: 'Class created successfully',
      data: result.rows[0],
    });
  } catch (error: any) {
    const errorMsg = error.message || String(error);
    console.error('Create class error:', { message: errorMsg, code: error.code, detail: error.detail });
    if (error.code === '23505') {
      res.status(400).json({ error: 'Class already exists' });
    } else {
      res.status(500).json({ error: `Failed to create class: ${errorMsg}` });
    }
  }
});

// PUT /api/classes/:id - Update class (ADMIN ONLY)
router.put('/:id', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { max_students, subjects } = req.body;

    const result = await query(
      `UPDATE class_config 
       SET max_students = COALESCE($1, max_students),
           subjects = COALESCE($2, subjects),
           updated_at = NOW()
       WHERE id = $3
       RETURNING id, class_name, max_students, current_students, subjects, updated_at`,
      [max_students, subjects, id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Class not found' });
      return;
    }

    res.json({
      success: true,
      message: 'Class updated successfully',
      data: result.rows[0],
    });
  } catch (error: any) {
    console.error('Update class error:', error);
    res.status(500).json({ error: 'Failed to update class' });
  }
});

// DELETE /api/classes/:id - Delete class (ADMIN ONLY)
router.delete('/:id', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const result = await query(
      'DELETE FROM class_config WHERE id = $1 RETURNING class_name',
      [id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Class not found' });
      return;
    }

    res.json({
      success: true,
      message: 'Class deleted successfully',
      data: result.rows[0],
    });
  } catch (error: any) {
    console.error('Delete class error:', error);
    res.status(500).json({ error: 'Failed to delete class' });
  }
});

export default router;
