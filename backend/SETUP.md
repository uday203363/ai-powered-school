# Backend Setup Guide

## Quick Start (5 minutes)

### Step 1: Install Dependencies
```bash
cd backend
npm install
```

### Step 2: Configure Database
Edit `backend/.env`:
```env
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@db.supabase.co:5432/postgres
JWT_SECRET=change_this_to_a_random_long_string_12345
PORT=5000
FRONTEND_URL=http://localhost:5175
```

To find your Supabase connection string:
1. Open Supabase Dashboard
2. Go to Settings → Database
3. Copy PostgreSQL connection string
4. Replace password with your actual password

### Step 3: Start Backend
```bash
npm run dev
```

Expected output:
```
╔════════════════════════════════════════╗
║   School Management Backend Started   ║
╠════════════════════════════════════════╣
║  Server: http://localhost:5000        ║
║  Environment: development             ║
║  Database: Connected                  ║
╚════════════════════════════════════════╝
```

### Step 4: Test Backend
```bash
curl http://localhost:5000/api/health
```

Should return:
```json
{
  "status": "Backend is running",
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

## Update Frontend Services

Update `src/services/studentService.ts`:

```typescript
const API_URL = 'http://localhost:5000/api';

export const getAllStudents = async (filters?: any) => {
  try {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_URL}/students`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!response.ok) throw new Error('Failed to fetch');
    const data = await response.json();
    return { success: true, data: data.data };
  } catch (error) {
    return { success: false, error: (error as any).message };
  }
};

export const updateStudent = async (registerNo: string, updates: any) => {
  try {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_URL}/students/${registerNo}/promote`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ class: updates.class, current_fee: updates.current_fee })
    });
    if (!response.ok) throw new Error('Failed to update');
    const data = await response.json();
    return { success: true, data: data.data };
  } catch (error) {
    return { success: false, error: (error as any).message };
  }
};

export const getStudentByRegisterNo = async (registerNo: string) => {
  try {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_URL}/students`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await response.json();
    const student = data.data.find((s: any) => s.register_no === registerNo);
    return { success: !!student, data: student };
  } catch (error) {
    return { success: false, error: (error as any).message };
  }
};
```

Update `src/services/classConfigService.ts`:

```typescript
const API_URL = 'http://localhost:5000/api';

export const getAllClassConfigs = async () => {
  try {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_URL}/classes`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!response.ok) throw new Error('Failed to fetch');
    const data = await response.json();
    return { success: true, data: data.data };
  } catch (error) {
    return { success: false, error: (error as any).message };
  }
};

export const setMaxStudents = async (className: string, maxStudents: number, subjects?: string) => {
  try {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_URL}/classes`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ class_name: className, max_students: maxStudents, subjects })
    });
    if (!response.ok) throw new Error('Failed to create/update');
    const data = await response.json();
    return { success: true, data: data.data };
  } catch (error) {
    return { success: false, error: (error as any).message };
  }
};
```

## Verify Everything Works

1. **Login with admin account**:
   ```bash
   curl -X POST http://localhost:5000/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"register_no": "ADM001", "password": "admin123"}'
   ```

2. **Copy the token** from response
3. **Get students**:
   ```bash
   curl http://localhost:5000/api/students \
     -H "Authorization: Bearer YOUR_TOKEN_HERE"
   ```

4. **Test promote endpoint**:
   ```bash
   curl -X PUT http://localhost:5000/api/students/STU001/promote \
     -H "Authorization: Bearer YOUR_TOKEN_HERE" \
     -H "Content-Type: application/json" \
     -d '{"class": "11A", "current_fee": 5000}'
   ```

## Troubleshooting

### "Cannot find module" error
```bash
npm install
npm run build
npm run dev
```

### Database connection failed
1. Check `DATABASE_URL` in `.env`
2. Verify password is correct
3. Test connection:
   ```bash
   psql "YOUR_DATABASE_URL"
   ```

### CORS Error in browser console
- Make sure backend is running on port 5000
- Update `FRONTEND_URL` in `.env` if using different frontend URL
- Restart backend

### Token expired error
- Users need to login again
- Token is valid for 7 days by default

## Running Backend in Production

### Build
```bash
npm run build
```

### Start
```bash
NODE_ENV=production npm start
```

### Deploy to Render/Railway
1. Push code to GitHub
2. Connect repository to Render/Railway
3. Set environment variables
4. Deploy

Example Render commands:
- Build: `npm install && npm run build`
- Start: `npm start`

## Next Steps

- ✓ Backend running locally
- ✓ Frontend updated to use backend APIs
- Next: Deploy to production server (Render, Railway, Heroku, etc.)

For questions, refer to README.md for full API documentation.
