# School Management Backend

Custom Node.js + Express backend for AI Powered School Management System.

## Features

- **JWT Authentication**: Secure login with token-based auth
- **Role-Based Access Control**: Admin, teacher, student, parent roles
- **Student Management**: CRUD operations with promotion feature
- **Class Management**: Manage school classes
- **User Management**: Admin user management
- **PostgreSQL Integration**: Direct database connection to Supabase

## Tech Stack

- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js
- **Database**: PostgreSQL (via Supabase)
- **Authentication**: JWT (JSON Web Tokens)
- **Password Hashing**: bcryptjs

## Installation

### Prerequisites

- Node.js 16+ installed
- npm or yarn package manager
- PostgreSQL database (Supabase recommended)

### Setup Steps

1. **Navigate to backend directory**:
   ```bash
   cd backend
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure environment variables**:
   - Copy `.env.example` to `.env`
   - Update `DATABASE_URL` with your Supabase connection string
   - Update `JWT_SECRET` with a strong random key

4. **Update DATABASE_URL in .env**:
   ```
   DATABASE_URL=postgresql://postgres:password@db.supabase.co:5432/postgres
   JWT_SECRET=your_super_secret_key_here_change_this
   FRONTEND_URL=http://localhost:5175
   PORT=5000
   ```

## Running the Backend

### Development Mode (with auto-reload)
```bash
npm run dev
```

### Production Build
```bash
npm run build
npm start
```

The server will start on `http://localhost:5000`

## API Endpoints

### Authentication

- **POST** `/api/auth/login` - User login
  ```json
  {
    "register_no": "STU001",
    "password": "password123"
  }
  ```
  Returns: `{ token, user }`

- **GET** `/api/auth/me` - Get current user (requires token)

### Students (Requires Authentication)

- **GET** `/api/students` - List all students
- **GET** `/api/students/:id` - Get single student
- **POST** `/api/students` - Create student (admin only)
- **PUT** `/api/students/:id` - Update student (admin only)
- **PUT** `/api/students/:register_no/promote` - Promote student (admin only)
- **DELETE** `/api/students/:id` - Delete student (admin only)

### Classes (Requires Authentication)

- **GET** `/api/classes` - List all classes
- **GET** `/api/classes/:id` - Get single class
- **POST** `/api/classes` - Create class (admin only)
- **PUT** `/api/classes/:id` - Update class (admin only)
- **DELETE** `/api/classes/:id` - Delete class (admin only)

### Users (Admin Only)

- **GET** `/api/users` - List all users
- **GET** `/api/users/:id` - Get single user
- **POST** `/api/users` - Create user
- **PUT** `/api/users/:id` - Update user
- **DELETE** `/api/users/:id` - Delete user

## Authentication Headers

All protected endpoints require:
```
Authorization: Bearer <token>
```

## Example Requests

### Login
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"register_no": "ADM001", "password": "password"}'
```

### Promote Student (Admin Only)
```bash
curl -X PUT http://localhost:5000/api/students/STU001/promote \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"class": "11A", "current_fee": 5000}'
```

### Get Students
```bash
curl -X GET http://localhost:5000/api/students \
  -H "Authorization: Bearer <token>"
```

## Frontend Integration

Update your React frontend to use backend APIs:

```typescript
const API_URL = 'http://localhost:5000/api';

export const loginUser = async (registerNo: string, password: string) => {
  const response = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ register_no: registerNo, password })
  });
  const data = await response.json();
  localStorage.setItem('token', data.token);
  return data;
};

export const getStudents = async () => {
  const token = localStorage.getItem('token');
  const response = await fetch(`${API_URL}/students`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  return response.json();
};

export const promoteStudent = async (registerNo: string, newClass: string, fee: number) => {
  const token = localStorage.getItem('token');
  const response = await fetch(`${API_URL}/students/${registerNo}/promote`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ class: newClass, current_fee: fee })
  });
  return response.json();
};
```

## Environment Variables

- `DATABASE_URL`: PostgreSQL connection string
- `JWT_SECRET`: Secret key for JWT signing
- `PORT`: Server port (default: 5000)
- `NODE_ENV`: Environment (development/production)
- `FRONTEND_URL`: CORS allowed frontend URL

## Error Handling

All endpoints return consistent error format:
```json
{
  "error": "Error message"
}
```

HTTP Status Codes:
- `200`: Success
- `201`: Created
- `400`: Bad request
- `401`: Unauthorized
- `403`: Forbidden
- `404`: Not found
- `500`: Server error

## Security Features

- JWT token-based authentication
- Role-based access control
- Password hashing (base64 matching frontend)
- CORS protection
- Input validation
- SQL error handling

## Next Steps

1. Install dependencies: `npm install`
2. Configure `.env` with database URL
3. Run development server: `npm run dev`
4. Update React frontend to call backend APIs
5. Test student promotion feature
6. Deploy backend to production server

## Troubleshooting

### Database Connection Error
- Verify `DATABASE_URL` in `.env`
- Check PostgreSQL is running
- Verify credentials and network access

### CORS Errors
- Update `FRONTEND_URL` in `.env`
- Ensure backend is running on port 5000

### JWT Errors
- Verify token is sent with `Authorization: Bearer <token>` header
- Check `JWT_SECRET` matches between backend runs
- Token expires in 7 days by default

## License

ISC
