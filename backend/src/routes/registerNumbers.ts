import express, { Request, Response } from 'express';
import { query } from '../config/database.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

const validateSchoolCode = (code: string) => /^[A-Z]{3,4}$/.test(code);

const padNumber = (num: number, length: number) => String(num).padStart(length, '0');

const generateRegisterNumber = (admissionYear: number, schoolCode: string, sequenceNumber: number) => {
  return `${String(admissionYear).slice(-2)}${schoolCode}${padNumber(sequenceNumber, 4)}`;
};

router.get('/current', authenticateToken, async (req: Request, res: Response) => {
  try {
    const admissionYear = Number(req.query.year || new Date().getFullYear());
    const schoolCode = String(req.query.schoolCode || 'SBPS').toUpperCase();

    const result = await query(
      'SELECT id, current_sequence FROM student_register_sequence WHERE admission_year = $1 AND school_code = $2 LIMIT 1',
      [admissionYear, schoolCode]
    );

    res.json({ success: true, data: result.rows[0] || null });
  } catch (error: any) {
    console.error('Get current sequence error:', error);
    res.status(500).json({ error: 'Failed to fetch current sequence' });
  }
});

router.post('/next', authenticateToken, async (req: Request, res: Response) => {
  try {
    const admissionYear = Number(req.body.admissionYear || new Date().getFullYear());
    const schoolCode = String(req.body.schoolCode || 'SBPS').toUpperCase();

    if (!validateSchoolCode(schoolCode)) {
      res.status(400).json({ error: 'Invalid school code' });
      return;
    }

    const existing = await query(
      'SELECT id, current_sequence FROM student_register_sequence WHERE admission_year = $1 AND school_code = $2 LIMIT 1',
      [admissionYear, schoolCode]
    );

    let sequenceId = existing.rows[0]?.id;
    let currentSequence = existing.rows[0]?.current_sequence ?? 0;

    if (!sequenceId) {
      const inserted = await query(
        `INSERT INTO student_register_sequence (admission_year, school_code, current_sequence, max_sequence, created_at, updated_at)
         VALUES ($1, $2, 0, 9999, NOW(), NOW())
         RETURNING id, current_sequence`,
        [admissionYear, schoolCode]
      );
      sequenceId = inserted.rows[0].id;
      currentSequence = inserted.rows[0].current_sequence;
    }

    const nextSequence = currentSequence + 1;
    await query(
      'UPDATE student_register_sequence SET current_sequence = $1, updated_at = NOW() WHERE id = $2',
      [nextSequence, sequenceId]
    );

    res.json({
      success: true,
      data: {
        register_no: generateRegisterNumber(admissionYear, schoolCode, nextSequence),
        current_sequence: nextSequence,
      },
    });
  } catch (error: any) {
    console.error('Generate register number error:', error);
    res.status(500).json({ error: 'Failed to generate register number' });
  }
});

router.post('/reset', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const admissionYear = Number(req.body.admissionYear);
    const schoolCode = String(req.body.schoolCode || 'SBPS').toUpperCase();

    await query(
      'UPDATE student_register_sequence SET current_sequence = 0, updated_at = NOW() WHERE admission_year = $1 AND school_code = $2',
      [admissionYear, schoolCode]
    );

    res.json({ success: true, message: 'Sequence reset successfully' });
  } catch (error: any) {
    console.error('Reset sequence error:', error);
    res.status(500).json({ error: 'Failed to reset sequence' });
  }
});

router.get('/exist', authenticateToken, async (req: Request, res: Response) => {
  try {
    const registerNo = String(req.query.registerNo || '');
    const result = await query('SELECT id FROM users WHERE register_no = $1 LIMIT 1', [registerNo]);
    res.json({ success: true, data: { exists: result.rows.length > 0 } });
  } catch (error: any) {
    console.error('Register exists error:', error);
    res.status(500).json({ error: 'Failed to check register number' });
  }
});

router.get('/year/:admissionYear', authenticateToken, async (req: Request, res: Response) => {
  try {
    const admissionYear = Number(req.params.admissionYear);
    const schoolCode = String(req.query.schoolCode || 'SBPS').toUpperCase();
    const result = await query(
      `SELECT register_no FROM users
       WHERE admission_year = $1 AND role = 'student' AND status = 'Active' AND register_no ILIKE $2
       ORDER BY register_no`,
      [admissionYear, `${String(admissionYear).slice(-2)}${schoolCode}%`]
    );
    res.json({ success: true, data: result.rows.map((row: any) => row.register_no) });
  } catch (error: any) {
    console.error('Register numbers by year error:', error);
    res.status(500).json({ error: 'Failed to fetch register numbers' });
  }
});

router.get('/stats', authenticateToken, async (req: Request, res: Response) => {
  try {
    const year = Number(req.query.year || new Date().getFullYear());
    const schoolCode = String(req.query.schoolCode || 'SBPS').toUpperCase();
    const prefix = `${String(year).slice(-2)}${schoolCode}`;

    const result = await query(
      `SELECT status, register_no FROM users
       WHERE admission_year = $1 AND role = 'student' AND register_no ILIKE $2
       ORDER BY register_no`,
      [year, `${prefix}%`]
    );

    const students = result.rows as Array<{ status: string; register_no: string }>;
    const active = students.filter((s: { status: string }) => s.status === 'Active').length;
    const inactive = students.filter((s: { status: string }) => s.status === 'Inactive').length;
    const transferred = students.filter((s: { status: string }) => s.status === 'Transferred').length;

    res.json({
      success: true,
      data: {
        totalStudents: students.length,
        activeStudents: active,
        inactiveStudents: inactive,
        transferredStudents: transferred,
        startRegisterNo: students[0]?.register_no || `${prefix}0001`,
        endRegisterNo: students[students.length - 1]?.register_no || `${prefix}0000`,
      },
    });
  } catch (error: any) {
    console.error('Register stats error:', error);
    res.status(500).json({ error: 'Failed to fetch register stats' });
  }
});

router.get('/teacher/next', authenticateToken, async (req: Request, res: Response) => {
  try {
    const schoolCode = String(req.query.schoolCode || 'SBPS').toUpperCase();
    const result = await query(
      'SELECT id, current_sequence FROM teacher_register_sequence WHERE school_code = $1 LIMIT 1',
      [schoolCode]
    );

    let sequenceId = result.rows[0]?.id;
    let currentSequence = result.rows[0]?.current_sequence ?? 0;

    if (!sequenceId) {
      const inserted = await query(
        `INSERT INTO teacher_register_sequence (school_code, current_sequence, max_sequence, created_at, updated_at)
         VALUES ($1, 0, 9999, NOW(), NOW())
         RETURNING id, current_sequence`,
        [schoolCode]
      );
      sequenceId = inserted.rows[0].id;
      currentSequence = inserted.rows[0].current_sequence;
    }

    const nextSequence = currentSequence + 1;
    await query(
      'UPDATE teacher_register_sequence SET current_sequence = $1, updated_at = NOW() WHERE id = $2',
      [nextSequence, sequenceId]
    );

    res.json({ success: true, data: { register_no: `TEA${schoolCode}${padNumber(nextSequence, 4)}` } });
  } catch (error: any) {
    console.error('Teacher register generation error:', error);
    res.status(500).json({ error: 'Failed to generate teacher register number' });
  }
});

export default router;