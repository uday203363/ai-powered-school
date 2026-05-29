import express, { Request, Response } from 'express';
import path from 'path';
import cors from 'cors';
import dotenv from 'dotenv';
import { authenticateToken } from './middleware/auth.js';
import authRoutes from './routes/auth.js';
import studentRoutes from './routes/students.js';
import classRoutes from './routes/classes.js';
import feeRoutes from './routes/fees.js';
import registerNumberRoutes from './routes/registerNumbers.js';
import userRoutes from './routes/users.js';
import notificationRoutes from './routes/notifications.js';
import photosRoutes from './routes/photos.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/api/health', (req: Request, res: Response) => {
  res.json({ 
    status: 'Backend is running',
    timestamp: new Date().toISOString(),
    port: PORT,
  });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/students', authenticateToken, studentRoutes);
app.use('/api/classes', authenticateToken, classRoutes);
app.use('/api/fees', authenticateToken, feeRoutes);
app.use('/api/register-numbers', authenticateToken, registerNumberRoutes);
app.use('/api/users', authenticateToken, userRoutes);
app.use('/api/notifications', authenticateToken, notificationRoutes);
// Serve uploaded files
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// Photos route (list + admin upload)
app.use('/api/photos', photosRoutes);

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Error handler
app.use((err: any, req: Request, res: Response) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════╗
║   School Management Backend Started   ║
╠════════════════════════════════════════╣
║  Server: http://localhost:${PORT}        ║
║  Environment: ${process.env.NODE_ENV}                ║
║  Database: Connected                  ║
╠════════════════════════════════════════╣
║  Available Endpoints:                  ║
║  POST   /api/auth/login               ║
║  GET    /api/auth/me                  ║
║  GET    /api/students                 ║
║  PUT    /api/students/:id/promote     ║
║  GET    /api/classes                  ║
║  GET    /api/users (admin)            ║
╚════════════════════════════════════════╝
  `);
});
