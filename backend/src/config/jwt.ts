import jwt from 'jsonwebtoken';

export interface DecodedToken {
  id: string;
  register_no: string;
  role: 'admin' | 'teacher' | 'student' | 'parent';
  iat: number;
  exp: number;
}

export const generateToken = (userId: string, registerNo: string, role: string): string => {
  const secret = process.env.JWT_SECRET || 'secret';
  return jwt.sign(
    { id: userId, register_no: registerNo, role },
    secret,
    { expiresIn: '7d' }
  );
};

export const verifyToken = (token: string): DecodedToken => {
  const secret = process.env.JWT_SECRET || 'secret';
  return jwt.verify(token, secret) as DecodedToken;
};
