# AI-Powered School Management System

A complete production-ready web application for managing school operations with admin, teacher, student, and parent roles. Built with React, Vite, TypeScript, Tailwind CSS, and Supabase with OpenAI integration for AI-powered features.

## Features

### 🔐 Security & Authentication
- Register number-based login (not email)
- Secure password hashing with SHA-256
- Force password change on first login
- Role-based access control (Admin, Teacher, Student, Parent)
- Protected routes with permission checking

### 👨‍💼 Admin Dashboard
- User management (create, edit, delete students/teachers)
- Fee tracking and management
- Performance analytics with charts
- Notification system with role-based filtering
- Real-time notifications for key events

### 👨‍🏫 Teacher Dashboard
- Manage assigned classes
- Upload and track marks
- Mark attendance for students
- View class performance reports

### 📚 Student/Parent Dashboard
- View marks and grades
- Check attendance records
- View fee status and payment history
- Receive notifications
- Access AI Assistant for academic help

### 🤖 AI Assistant
- Real-time chat for academic queries
- Generate study guides for topics
- Explain difficult concepts
- Integrated with OpenAI API

### 📊 Features
- Responsive Tailwind CSS design
- Charts and visualizations (Recharts)
- Pagination and filtering
- Real-time notifications
- Dark mode support (ready)

## Project Structure

```
src/
├── components/
│   ├── common/          # Shared components (Navbar, Sidebar, UI elements)
│   ├── admin/           # Admin-specific components
│   ├── teacher/         # Teacher-specific components
│   └── student/         # Student/Parent components
├── pages/
│   ├── LoginPage.tsx
│   ├── ChangePasswordPage.tsx
│   └── DashboardLayout.tsx
├── services/
│   ├── supabase.ts      # Supabase configuration
│   ├── auth.ts          # Authentication logic
│   ├── database.ts      # Database operations
│   └── ai.ts            # OpenAI integration
├── contexts/
│   └── AuthContext.tsx  # Global auth state
├── types/
│   └── index.ts         # TypeScript definitions
└── App.tsx              # Main app with routing
```

## Database Schema (Supabase/PostgreSQL)

### Tables

**users**
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  register_no VARCHAR(50) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL, -- admin, teacher, student, parent
  name VARCHAR(255) NOT NULL,
  class VARCHAR(50),
  first_login BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**students**
```sql
CREATE TABLE students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  register_no VARCHAR(50) UNIQUE,
  name VARCHAR(255),
  class VARCHAR(50),
  email VARCHAR(255),
  phone VARCHAR(20),
  guardian_name VARCHAR(255),
  guardian_phone VARCHAR(20),
  created_at TIMESTAMP DEFAULT NOW()
);
```

**teachers**
```sql
CREATE TABLE teachers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  register_no VARCHAR(50) UNIQUE,
  name VARCHAR(255),
  email VARCHAR(255),
  phone VARCHAR(20),
  subjects TEXT[],
  assigned_classes TEXT[],
  created_at TIMESTAMP DEFAULT NOW()
);
```

**marks**
```sql
CREATE TABLE marks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES students(id),
  subject VARCHAR(100),
  marks NUMERIC,
  total NUMERIC,
  teacher_id UUID REFERENCES teachers(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**attendance**
```sql
CREATE TABLE attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES students(id),
  date DATE,
  status VARCHAR(20), -- present, absent, leave
  remarks TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

**fees**
```sql
CREATE TABLE fees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES students(id),
  month VARCHAR(20),
  year INTEGER,
  total_amount NUMERIC,
  paid_amount NUMERIC DEFAULT 0,
  balance NUMERIC,
  status VARCHAR(20), -- pending, partial, paid
  due_date DATE,
  created_at TIMESTAMP DEFAULT NOW()
);
```

**notifications**
```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message TEXT NOT NULL,
  target_role VARCHAR(20), -- admin, teacher, student, parent, all
  target_class VARCHAR(50),
  created_by UUID REFERENCES users(id),
  read_by TEXT[],
  created_at TIMESTAMP DEFAULT NOW()
);
```

## Setup Instructions

### Prerequisites
- Node.js 18+ and npm
- Supabase account
- OpenAI API key
- Git

### 1. Clone and Install

```bash
cd "d:\ai powered school"  # Your project directory
npm install
```

### 2. Configure Supabase

1. Create a Supabase project at [supabase.com](https://supabase.com)
2. Copy your project URL and anon key
3. Update `.env.local`:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_OPENROUTER_API_KEY=your_openrouter_api_key
```

### 3. Create Database Tables

In Supabase SQL Editor, run the SQL scripts from above to create all tables.

### 4. Seed Demo Data

```sql
-- Create demo admin user
INSERT INTO users (register_no, password, role, name, first_login)
VALUES ('admin', 'admin', 'admin', 'Administrator', false);

-- Create demo teacher
INSERT INTO users (register_no, password, role, name, class, first_login)
VALUES ('TEASBPS0001', 'welcome', 'teacher', 'John Teacher', 'Class A', false);

-- Create demo student
INSERT INTO users (register_no, password, role, name, class, first_login)
VALUES ('student1', 'student1', 'student', 'Jane Student', 'Class A', false);
```

### 5. Run Development Server

```bash
npm run dev
```

Application will open at `http://localhost:5173`

**Demo Credentials:**
- Admin: `admin` / `admin`
- Teacher: `TEASBPS0001` / `welcome`
- Student: `student1` / `student1`

## Development

### Build

```bash
npm run build
```

### Lint

```bash
npm run lint
```

## Deployment

### Deploy to Vercel

1. Push your code to GitHub
2. Create Vercel account at [vercel.com](https://vercel.com)
3. Import the GitHub repository into Vercel
4. Set environment variables in Vercel dashboard:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_OPENROUTER_API_KEY`

5. Deploy

```bash
vercel deploy
```

### Environment Variables

Create `.env.production` for production deployment:

```env
VITE_SUPABASE_URL=your_production_supabase_url
VITE_SUPABASE_ANON_KEY=your_production_anon_key
VITE_OPENROUTER_API_KEY=your_production_openrouter_key
```

## API Integration

### Supabase
- Database: PostgreSQL
- Authentication: Custom (register number + password)
- Real-time: Subscriptions ready

### OpenAI
- Model: gpt-3.5-turbo
- Features: Chat, study guides, concept explanations
- Usage: Limited to production keys

## Best Practices Implemented

✅ **Security**
- Password hashing with SHA-256
- Protected routes with role verification
- Environment variables for sensitive data
- Secure token storage in localStorage

✅ **Performance**
- Lazy loading of components
- Pagination on tables
- Data caching
- Optimized re-renders

✅ **Code Quality**
- TypeScript for type safety
- Component modularity
- Service layer abstraction
- Clean separation of concerns

✅ **UX/UI**
- Responsive design (mobile-first)
- Loading states
- Error handling
- Notification system

## Future Enhancements

- Real-time notifications with WebSockets
- Advanced analytics dashboards
- Mobile app (React Native)
- Assignment submissions
- Parent-Teacher communication portal
- SMS/Email notifications
- Multi-language support
- Dark mode toggle
- Offline support with service workers

## Troubleshooting

### Supabase Connection Issues
- Verify environment variables
- Check Supabase project is active
- Verify table permissions in Supabase

### OpenAI Integration Not Working
- Verify API key is valid
- Check OpenAI account has credits
- Review API usage limits

### Build Errors
```bash
npm run lint
npm audit fix
npm install
```

## Support

For issues or questions:
1. Check the troubleshooting section
2. Review component documentation in code comments
3. Check Supabase and OpenAI documentation

## License

This project is licensed under the MIT License - see LICENSE file for details.

## Contributors

Created as a complete production-ready school management system.

---

**Happy Learning! 🚀**
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
