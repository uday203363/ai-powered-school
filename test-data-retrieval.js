#!/usr/bin/env node

/**
 * Test Data Retrieval
 * Simulates frontend API calls to test data flow
 */

import fetch from 'node-fetch';

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

const API_URL = 'http://localhost:5000/api';

async function testBackendHealth() {
  header('1️⃣  Backend Health Check');

  try {
    const response = await fetch(`${API_URL}/health`);
    
    if (!response.ok) {
      error(`Backend returned status ${response.status}`);
      return false;
    }

    const data = await response.json();
    checkmark('Backend is running');
    info(`Response: ${JSON.stringify(data)}`);
    return true;
  } catch (err) {
    error(`Cannot reach backend: ${err.message}`);
    info('Make sure backend is running: cd backend && npm run dev');
    return false;
  }
}

async function testLogin(registerNo = 'admin', password = 'admin') {
  header('2️⃣  Authentication Test');

  info(`Attempting login with register_no="${registerNo}"...`);

  try {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ register_no: registerNo, password }),
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      error(`Login failed: ${data.error || 'Unknown error'}`);
      info(`Available logins: Try register_no with matching password`);
      return null;
    }

    checkmark(`Logged in as ${data.user.name} (${data.user.role})`);
    info(`Token: ${data.token.substring(0, 50)}...`);
    return data.token;
  } catch (err) {
    error(`Login request failed: ${err.message}`);
    return null;
  }
}

async function testStudentsEndpoint(token) {
  header('3️⃣  Students Data Retrieval Test');

  if (!token) {
    error('No authentication token - skipping');
    return;
  }

  try {
    info('Fetching all students...');
    const response = await fetch(`${API_URL}/students`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    if (!response.ok) {
      error(`API returned status ${response.status}`);
      error(`Error: ${data.error || 'Unknown error'}`);
      return;
    }

    if (!data.success) {
      error(`API error: ${data.error || 'Unknown error'}`);
      return;
    }

    const students = data.data || [];
    checkmark(`Retrieved ${students.length} students`);

    if (students.length === 0) {
      error('⚠️  No students found in database!');
      info('You need to add student data first.');
      info('Options:');
      info('1. Use Admin Dashboard → Student Registration tab');
      info('2. Add students via Supabase console');
      info('3. Run SQL: INSERT INTO users ...');
    } else {
      info('First 10 students:');
      students.slice(0, 10).forEach((student, idx) => {
        console.log(`  ${idx + 1}. ${student.register_no} | ${student.name} | Class: ${student.class || 'N/A'} | Status: ${student.status || 'N/A'}`);
      });

      // Check for class values
      const studentsWithoutClass = students.filter(s => !s.class);
      if (studentsWithoutClass.length > 0) {
        error(`⚠️  ${studentsWithoutClass.length} students have no class value!`);
        info('These students will not appear when filtering by class.');
        info('Solution: Update student records to set class values.');
      }
    }
  } catch (err) {
    error(`Students endpoint request failed: ${err.message}`);
  }
}

async function testStudentsByClass(token, className = '10-A') {
  header('4️⃣  Filter by Class Test');

  if (!token) {
    error('No authentication token - skipping');
    return;
  }

  try {
    info(`Fetching students from class "${className}"...`);
    const response = await fetch(`${API_URL}/students?class=${className}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    if (!response.ok) {
      error(`API returned status ${response.status}`);
      return;
    }

    const students = data.data || [];
    checkmark(`Retrieved ${students.length} students from class ${className}`);

    if (students.length === 0) {
      error(`No students found in class ${className}`);
      info('Possible reasons:');
      info('1. No students in this class');
      info('2. Class name mismatch (check uppercase/format)');
      info('3. Students have empty class field');
    } else {
      students.forEach((student) => {
        console.log(`  • ${student.register_no} | ${student.name} | ${student.class}`);
      });
    }
  } catch (err) {
    error(`Class filter request failed: ${err.message}`);
  }
}

async function testDatabaseDirectQuery() {
  header('5️⃣  Direct Database Query Test');

  info('This would require database credentials...');
  info('Use diagnose-data-retrieval.js for detailed database inspection');
}

async function main() {
  log(colors.bright + colors.cyan,
    `
╔════════════════════════════════════════════════════════════════╗
║          Data Retrieval Testing - API Simulation              ║
║       Simulates how frontend fetches data from backend         ║
╚════════════════════════════════════════════════════════════════╝
  `
  );

  // Test backend health
  const backendOk = await testBackendHealth();
  if (!backendOk) {
    log(colors.red + colors.bright,
      `\n❌ Backend is not running!

Start it with:
  cd backend
  npm run dev

Then run this script again.
    `
    );
    process.exit(1);
  }

  // Test authentication
  const token = await testLogin('admin', 'admin');
  
  // If default login fails, try other common ones
  if (!token) {
    info('Trying other common login credentials...');
    const credentials = [
      { registerNo: '1', password: 'password' },
      { registerNo: 'teacher', password: 'password' },
      { registerNo: 'admin1', password: 'admin1' },
    ];

    for (const cred of credentials) {
      const testToken = await testLogin(cred.registerNo, cred.password);
      if (testToken) {
        token = testToken;
        break;
      }
    }
  }

  // Test data retrieval
  if (token) {
    await testStudentsEndpoint(token);
    await testStudentsByClass(token, '10-A');
  }

  // Summary
  header('📊 Summary');

  console.log(`
If you see:
  ✓ Backend is running
  ✓ Login successful
  ✓ Retrieved N students
  
Then your data retrieval is working!

If you see:
  ✗ No students found
  
Then you need to:
  1. Add student data to the database
  2. Ensure students have 'class' values
  3. Check student status is 'Active'

If you see:
  ✗ Cannot reach backend
  
Then:
  1. Start backend: cd backend && npm run dev
  2. Wait for "Backend is running" message
  3. Run this script again

💡 For detailed database analysis:
  node diagnose-data-retrieval.js
  `);
}

main().catch(console.error);
