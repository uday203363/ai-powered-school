#!/usr/bin/env node

/**
 * Database & API Diagnostic Tool
 * Checks why data is not being retrieved properly
 */

import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load backend environment
dotenv.config({ path: path.join(__dirname, 'backend', '.env') });

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(color, ...args) {
  console.log(color, ...args, colors.reset);
}

function header(title) {
  console.log('\n' + colors.bright + colors.blue + '═'.repeat(70));
  console.log(`  ${title}`);
  console.log('═'.repeat(70) + colors.reset + '\n');
}

function checkmark(text) {
  log(colors.green, `✓ ${text}`);
}

function error(text) {
  log(colors.red, `✗ ${text}`);
}

function info(text) {
  log(colors.cyan, `ℹ ${text}`);
}

async function checkDatabaseConnection() {
  header('1️⃣  DATABASE CONNECTION CHECK');

  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    error('DATABASE_URL not found in backend/.env');
    return false;
  }

  info(`Connecting to database...`);

  const pool = new pg.Pool({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false },
  });

  try {
    const client = await pool.connect();
    checkmark('Connected to PostgreSQL database');

    // Test simple query
    const result = await client.query('SELECT 1');
    checkmark('Database is responding to queries');

    await client.release();
    await pool.end();
    return true;
  } catch (err) {
    error(`Database connection failed: ${err.message}`);
    return false;
  }
}

async function checkTableStructure() {
  header('2️⃣  TABLE STRUCTURE CHECK');

  const dbUrl = process.env.DATABASE_URL;
  const pool = new pg.Pool({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false },
  });

  try {
    const client = await pool.connect();

    // Check if users table exists
    const tableCheck = await client.query(`
      SELECT EXISTS(
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'users'
      );
    `);

    if (tableCheck.rows[0].exists) {
      checkmark('users table exists');
    } else {
      error('users table does not exist');
      await client.release();
      await pool.end();
      return false;
    }

    // Check table structure
    const structureCheck = await client.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'users'
      ORDER BY ordinal_position;
    `);

    info(`users table has ${structureCheck.rows.length} columns:`);
    structureCheck.rows.forEach((col) => {
      const nullable = col.is_nullable === 'YES' ? '(nullable)' : '(required)';
      console.log(`  • ${col.column_name}: ${col.data_type} ${nullable}`);
    });

    await client.release();
    await pool.end();
    return true;
  } catch (err) {
    error(`Table structure check failed: ${err.message}`);
    return false;
  }
}

async function checkDataInDatabase() {
  header('3️⃣  DATA IN DATABASE CHECK');

  const dbUrl = process.env.DATABASE_URL;
  const pool = new pg.Pool({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false },
  });

  try {
    const client = await pool.connect();

    // Count total records
    const totalCheck = await client.query('SELECT COUNT(*) as count FROM users;');
    const totalCount = totalCheck.rows[0].count;
    info(`Total users in database: ${totalCount}`);

    // Count by role
    const roleCheck = await client.query(`
      SELECT role, COUNT(*) as count 
      FROM users 
      GROUP BY role;
    `);
    info(`Users by role:`);
    roleCheck.rows.forEach((row) => {
      console.log(`  • ${row.role}: ${row.count}`);
    });

    // Check students specifically
    const studentCheck = await client.query(`
      SELECT id, register_no, name, class, status, role 
      FROM users 
      WHERE role = 'student'
      ORDER BY register_no
      LIMIT 20;
    `);

    if (studentCheck.rows.length === 0) {
      error('No students found in database!');
      info('This is the main issue - the database has no student records.');
      info('You need to add student data first.');
    } else {
      checkmark(`Found ${studentCheck.rows.length} students (showing first 20)`);
      info('Student records:');
      studentCheck.rows.forEach((student) => {
        console.log(
          `  • ${student.register_no} | ${student.name} | Class: ${student.class || 'N/A'} | Status: ${student.status || 'N/A'}`
        );
      });
    }

    // Check for duplicate register numbers
    const dupCheck = await client.query(`
      SELECT register_no, COUNT(*) as count 
      FROM users 
      WHERE register_no IS NOT NULL
      GROUP BY register_no 
      HAVING COUNT(*) > 1;
    `);

    if (dupCheck.rows.length > 0) {
      error(`Found duplicate register numbers:`);
      dupCheck.rows.forEach((row) => {
        console.log(`  • ${row.register_no}: ${row.count} times`);
      });
    } else {
      checkmark('No duplicate register numbers');
    }

    await client.release();
    await pool.end();
    return true;
  } catch (err) {
    error(`Data check failed: ${err.message}`);
    return false;
  }
}

async function checkStudentsByClass() {
  header('4️⃣  STUDENTS BY CLASS');

  const dbUrl = process.env.DATABASE_URL;
  const pool = new pg.Pool({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false },
  });

  try {
    const client = await pool.connect();

    // Get classes and their student counts
    const classCheck = await client.query(`
      SELECT 
        class, 
        COUNT(*) as count,
        STRING_AGG(DISTINCT status, ', ') as statuses
      FROM users 
      WHERE role = 'student' AND class IS NOT NULL
      GROUP BY class
      ORDER BY class;
    `);

    if (classCheck.rows.length === 0) {
      error('No classes found with students');
    } else {
      checkmark(`Found ${classCheck.rows.length} classes with students:`);
      classCheck.rows.forEach((row) => {
        console.log(
          `  • ${row.class}: ${row.count} students (Statuses: ${row.statuses || 'None'})`
        );
      });
    }

    await client.release();
    await pool.end();
    return true;
  } catch (err) {
    error(`Class check failed: ${err.message}`);
    return false;
  }
}

async function checkAuthUsers() {
  header('5️⃣  AUTHENTICATION USERS CHECK');

  const dbUrl = process.env.DATABASE_URL;
  const pool = new pg.Pool({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false },
  });

  try {
    const client = await pool.connect();

    // Get admin users
    const adminCheck = await client.query(`
      SELECT register_no, name, role 
      FROM users 
      WHERE role = 'admin'
      LIMIT 10;
    `);

    info(`Admin users (for testing login):`);
    if (adminCheck.rows.length === 0) {
      error('No admin users found - you cannot log in!');
    } else {
      adminCheck.rows.forEach((admin) => {
        console.log(`  • Register No: ${admin.register_no} | Name: ${admin.name}`);
      });
    }

    // Check for test users
    const testCheck = await client.query(`
      SELECT register_no, name, role, class 
      FROM users 
      WHERE register_no IN ('1', '2', '3', 'admin', 'teacher')
      ORDER BY register_no;
    `);

    info(`Common test users:`);
    if (testCheck.rows.length === 0) {
      error('No common test users found');
    } else {
      testCheck.rows.forEach((user) => {
        console.log(
          `  • ${user.register_no} | ${user.name} | ${user.role} | ${user.class || 'N/A'}`
        );
      });
    }

    await client.release();
    await pool.end();
    return true;
  } catch (err) {
    error(`Auth check failed: ${err.message}`);
    return false;
  }
}

async function checkAPIEndpoints() {
  header('6️⃣  API ENDPOINTS CHECK');

  info('Testing if backend is running...');

  try {
    const response = await fetch('http://localhost:5000/api/health', {
      method: 'GET',
      timeout: 5000,
    });

    if (response.ok) {
      checkmark('Backend API is running on http://localhost:5000');
      const data = await response.json();
      info(`Response: ${JSON.stringify(data)}`);
    } else {
      error(`Backend responded with status ${response.status}`);
    }
  } catch (err) {
    error(`Cannot reach backend: ${err.message}`);
    info('Make sure to start the backend with: cd backend && npm run dev');
  }
}

async function main() {
  log(colors.bright + colors.cyan,
    `
╔════════════════════════════════════════════════════════════════╗
║         Database & API Data Retrieval Diagnostic Tool         ║
║                   Find Why Data is Missing                     ║
╚════════════════════════════════════════════════════════════════╝
  `
  );

  const dbConnected = await checkDatabaseConnection();
  if (!dbConnected) {
    error('Cannot connect to database. Fix this first.');
    process.exit(1);
  }

  await checkTableStructure();
  await checkDataInDatabase();
  await checkStudentsByClass();
  await checkAuthUsers();
  await checkAPIEndpoints();

  header('📊 SUMMARY & NEXT STEPS');

  console.log(`
✅ What to check:
  1. Are there any students in the database?
  2. Do students have proper 'class' values?
  3. Are there any admin users to log in with?
  4. Is the backend API running?

🔧 If data is missing:
  1. Add students to the database (use StudentRegistrationTab in Admin Dashboard)
  2. Or run a data seeding script
  3. Make sure student 'class' field is not empty

🚀 If data exists but not showing:
  1. Check browser console for API errors (F12)
  2. Check backend console for query errors
  3. Verify authentication token is valid
  4. Check if CORS is allowing requests

💡 Common Issues:
  1. Students in database but class field is NULL → Filter won't work
  2. Status field is NULL or doesn't match filter → Students hidden
  3. Database connection string is wrong → No data at all
  4. Backend not running → API calls fail
  5. Authentication token expired → 401 errors

🔗 Connection Flow:
  Frontend → API Call with JWT Token → Backend → SQL Query → Database
  
If data exists but not showing, the issue is in the API or filter logic.
  `);
}

main().catch(console.error);
