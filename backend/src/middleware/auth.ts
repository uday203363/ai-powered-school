import express, { Request, Response, NextFunction } from 'express';
import { verifyToken, DecodedToken } from '../config/jwt.js';

declare global {
  namespace Express {
    interface Request {
      user?: DecodedToken;
    }
  }
}

export const authenticateToken = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Prefer server session if present (session cookie)
  try {
    const sess = (req as any).session;
    if (sess && sess.user) {
      req.user = sess.user as DecodedToken;
      next();
      return;
    }

    // Fallback to Authorization header (JWT)
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      res.status(401).json({ error: 'No token provided' });
      return;
    }

    const decoded = verifyToken(token);
    req.user = decoded;
    next();
  } catch (error: any) {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
};

export const requireRole = (allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({ error: `Only ${allowedRoles.join(', ')} can access this` });
      return;
    }

    next();
  };
};

export const requireAdmin = requireRole(['admin']);
export const requireTeacher = requireRole(['admin', 'teacher']);
export const requireStudent = requireRole(['admin', 'student']);
