import express, { Request, Response } from 'express';
import { query } from '../config/database.js';
import { authenticateToken, requireAdmin, requireTeacher } from '../middleware/auth.js';

const router = express.Router();

// GET /api/fees/class/:className - list fees for a class
router.get('/class/:className', authenticateToken, requireTeacher, async (req: Request, res: Response) => {
  try {
    const { className } = req.params;
    const result = await query(
      `SELECT f.*
       FROM fees f
       JOIN users u ON u.id = f.student_id
       WHERE UPPER(u.class) = UPPER($1)
       ORDER BY f.year DESC, f.month DESC, f.created_at DESC`,
      [className]
    );

    res.json({ success: true, data: result.rows });
  } catch (error: any) {
    console.error('Get fees by class error:', error);
    res.status(500).json({ error: 'Failed to fetch fees' });
  }
});

// POST /api/fees - create fee record
router.post('/', authenticateToken, requireTeacher, async (req: Request, res: Response) => {
  try {
    const { student_id, month, year, total_amount, paid_amount, balance, status } = req.body;

    if (!student_id || !month || !year || total_amount === undefined) {
      res.status(400).json({ error: 'student_id, month, year and total_amount are required' });
      return;
    }

    // Resolve student by id/register_no/name (case-insensitive for text keys).
    const studentKey = String(student_id).trim();
    const studentLookup = await query(
      `SELECT id, register_no, name, status
       FROM users
       WHERE role = 'student'
         AND (
           CAST(id AS TEXT) ILIKE $1
           OR register_no ILIKE $1
           OR name ILIKE $1
         )
       LIMIT 1`,
      [studentKey]
    );

    if (studentLookup.rows.length === 0) {
      res.status(400).json({ error: `Student not found for key: ${studentKey}` });
      return;
    }

    const resolvedStudent = studentLookup.rows[0];
    const studentStatus = String(resolvedStudent.status || '').trim().toLowerCase();
    if (studentStatus && studentStatus !== 'active') {
      res.status(400).json({
        error: `Student ${resolvedStudent.name} is ${resolvedStudent.status}, cannot add fee`,
      });
      return;
    }

    const normalizedMonth = String(month).trim();
    const normalizedStatus = String(status || '').trim().toLowerCase();

    const effectiveBalance = balance !== undefined ? balance : Number(total_amount) - Number(paid_amount || 0);
    const computedStatus = Number(paid_amount || 0) >= Number(total_amount)
      ? 'paid'
      : Number(paid_amount || 0) > 0
      ? 'partial'
      : 'pending';
    const effectiveStatus = ['pending', 'partial', 'paid'].includes(normalizedStatus)
      ? normalizedStatus
      : computedStatus;

    const insertFee = async (studentIdForFee: string) => {
      return query(
        `INSERT INTO fees (student_id, month, year, total_amount, paid_amount, balance, status, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
         RETURNING *`,
        [studentIdForFee, normalizedMonth, year, total_amount, paid_amount || 0, effectiveBalance, effectiveStatus]
      );
    };

    let result;
    try {
      // Primary path: fees.student_id -> users.id
      result = await insertFee(resolvedStudent.id);
    } catch (insertError: any) {
      // Fallback path: some DBs still have fees.student_id referencing students.id
      if (insertError?.code === '23503' || String(insertError?.message || '').toLowerCase().includes('foreign key')) {
        try {
          const studentsTable = await query(`SELECT to_regclass('public.students') AS regclass`);
          const studentsTableExists = !!studentsTable.rows?.[0]?.regclass;

          if (studentsTableExists) {
            let altStudentId: string | null = null;

            // Try mapping from users.id -> students.user_id first
            try {
              const byUserId = await query(
                `SELECT id FROM students WHERE user_id = $1 LIMIT 1`,
                [resolvedStudent.id]
              );
              altStudentId = byUserId.rows?.[0]?.id || null;
            } catch (_e) {
              // Ignore if students.user_id column doesn't exist in this schema.
            }

            // Fallback by register_no/name (case-insensitive)
            if (!altStudentId) {
              try {
                const byRegisterOrName = await query(
                  `SELECT id
                   FROM students
                   WHERE register_no ILIKE $1 OR name ILIKE $1
                   LIMIT 1`,
                  [studentKey]
                );
                altStudentId = byRegisterOrName.rows?.[0]?.id || null;
              } catch (_e) {
                // Ignore if columns are different; we will surface original error below.
              }
            }

            if (altStudentId) {
              result = await insertFee(altStudentId);
            } else {
              throw insertError;
            }
          } else {
            throw insertError;
          }
        } catch (fallbackError: any) {
          throw fallbackError;
        }
      } else {
        throw insertError;
      }
    }

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error: any) {
    console.error('Create fee error:', {
      message: error?.message,
      code: error?.code,
      detail: error?.detail,
      constraint: error?.constraint,
      where: error?.where,
    });
    res.status(500).json({
      error: error?.message || 'Failed to create fee record',
      code: error?.code,
      detail: error?.detail,
      constraint: error?.constraint,
    });
  }
});

// PUT /api/fees/:id - update fee record
router.put('/:id', authenticateToken, requireTeacher, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { total_amount, paid_amount, balance, status } = req.body;

    const result = await query(
      `UPDATE fees
       SET total_amount = COALESCE($1, total_amount),
           paid_amount = COALESCE($2, paid_amount),
           balance = COALESCE($3, balance),
           status = COALESCE($4, status),
           updated_at = NOW()
       WHERE id = $5
       RETURNING *`,
      [total_amount, paid_amount, balance, status, id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Fee record not found' });
      return;
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error: any) {
    console.error('Update fee error:', error);
    res.status(500).json({ error: 'Failed to update fee record' });
  }
});

// GET /api/fee-status-updates - audit log table
router.get('/status-updates', authenticateToken, requireAdmin, async (_req: Request, res: Response) => {
  try {
    const result = await query(
      'SELECT * FROM fee_status_updates ORDER BY updated_at DESC'
    );
    res.json({ success: true, data: result.rows });
  } catch (error: any) {
    console.error('Get fee status updates error:', error);
    res.status(500).json({ error: 'Failed to fetch fee status updates' });
  }
});

export default router;
