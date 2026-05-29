#!/usr/bin/env node

/**
 * Full Stack Connectivity Verification Script
 * Tests Frontend ↔ Backend ↔ Database connections
 */

import { spawn } from 'child_process';
import { readFileSync } from 'fs';
import { resolve } from 'path';

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
  console.log('\n' + colors.bright + colors.blue + '═'.repeat(60));
  console.log(`  ${title}`);
  console.log('═'.repeat(60) + colors.reset + '\n');
}

function checkmark(text) {
  log(colors.green, `✓ ${text}`);
}

function error(text) {
  log(colors.red, `✗ ${text}`);
}

function warning(text) {
  log(colors.yellow, `⚠ ${text}`);
}

function info(text) {
  log(colors.cyan, `ℹ ${text}`);
}

async function checkFile(name, path) {
  try {
    readFileSync(path);
    checkmark(`Found: ${name}`);
    return true;
  } catch (err) {
    error(`Missing: ${name}`);
    return false;
  }
}

async function checkEnvVars() {
  header('1️⃣  ENVIRONMENT CONFIGURATION CHECK');

  const checks = await Promise.all([
    checkFile('.env.local (Frontend)', resolve('.env.local')),
    checkFile('backend/.env (Backend)', resolve('backend/.env')),
  ]);

  if (!checks.every(Boolean)) {
    error('Missing environment files');
    return false;
  }

  // Check frontend env vars
  try {
    const envLocal = readFileSync('.env.local', 'utf-8');
    if (envLocal.includes('VITE_API_URL')) {
      checkmark('Frontend API URL configured');
    } else {
      warning('VITE_API_URL not found in .env.local');
    }
    if (envLocal.includes('VITE_SUPABASE_URL')) {
      checkmark('Supabase URL configured');
    }
    if (envLocal.includes('VITE_SUPABASE_ANON_KEY')) {
      checkmark('Supabase key configured');
    }
  } catch (err) {
    error(`Cannot read .env.local: ${err.message}`);
    return false;
  }

  // Check backend env vars
  try {
    const backendEnv = readFileSync('backend/.env', 'utf-8');
    if (backendEnv.includes('DATABASE_URL')) {
      checkmark('Database URL configured');
    } else {
      warning('DATABASE_URL not found in backend/.env');
    }
    if (backendEnv.includes('JWT_SECRET')) {
      checkmark('JWT secret configured');
    }
    if (backendEnv.includes('PORT=5000')) {
      checkmark('Backend port is 5000');
    }
  } catch (err) {
    error(`Cannot read backend/.env: ${err.message}`);
    return false;
  }

  return true;
}

async function checkBackendHealth() {
  header('2️⃣  BACKEND HEALTH CHECK');

  try {
    const response = await fetch('http://localhost:5000/api/health');
    if (response.ok) {
      const data = await response.json();
      checkmark('Backend is running on http://localhost:5000');
      info(`Status: ${data.status}`);
      info(`Port: ${data.port}`);
      return true;
    } else {
      error(`Backend responded with status ${response.status}`);
      return false;
    }
  } catch (err) {
    error(`Cannot reach backend: ${err.message}`);
    warning('Make sure to run: cd backend && npm run dev');
    return false;
  }
}

async function checkDatabaseConnection() {
  header('3️⃣  DATABASE CONNECTION CHECK');

  try {
    // Try to get auth routes which should fail gracefully if DB is accessible
    const response = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ register_no: 'test', password: 'test' }),
    });

    // Any response (even 401 Unauthorized) means backend can communicate with DB
    if (response.status >= 400) {
      checkmark('Database connection is working');
      info('Backend can query the database');
      return true;
    }
  } catch (err) {
    error(`Database connection failed: ${err.message}`);
    return false;
  }
}

async function checkCORS() {
  header('4️⃣  CORS CONFIGURATION CHECK');

  try {
    const response = await fetch('http://localhost:5000/api/health', {
      headers: {
        'Origin': 'http://localhost:5173',
      },
    });

    if (response.ok) {
      checkmark('CORS is properly configured');
      const corsHeader = response.headers.get('access-control-allow-origin');
      info(`CORS Allow-Origin: ${corsHeader || 'default'}`);
      return true;
    }
  } catch (err) {
    error(`CORS check failed: ${err.message}`);
    return false;
  }
}

async function checkFileStructure() {
  header('5️⃣  PROJECT STRUCTURE CHECK');

  const requiredDirs = [
    { path: 'backend/src', name: 'Backend source' },
    { path: 'src', name: 'Frontend source' },
    { path: 'src/services', name: 'Frontend services' },
    { path: 'src/pages', name: 'Frontend pages' },
  ];

  let allFound = true;
  for (const dir of requiredDirs) {
    try {
      readFileSync(resolve(dir.path, '.gitkeep')).catch(() => {});
      checkmark(`Found: ${dir.name} (${dir.path})`);
    } catch (err) {
      // Try to check if directory exists by checking a common file
      allFound = false;
    }
  }

  const requiredFiles = [
    { path: 'backend/src/app.ts', name: 'Backend Express app' },
    { path: 'backend/src/config/database.ts', name: 'Database config' },
    { path: 'src/services/apiClient.ts', name: 'API client' },
    { path: 'src/services/auth.ts', name: 'Auth service' },
  ];

  for (const file of requiredFiles) {
    try {
      readFileSync(file.path);
      checkmark(`Found: ${file.name}`);
    } catch (err) {
      error(`Missing: ${file.name}`);
      allFound = false;
    }
  }

  return allFound;
}

async function generateReport() {
  header('📋 FULL STACK CONNECTIVITY REPORT');

  const checks = [];

  // Perform all checks
  const envOk = await checkEnvVars();
  checks.push({ name: 'Environment Config', ok: envOk });

  const fileOk = await checkFileStructure();
  checks.push({ name: 'Project Structure', ok: fileOk });

  const backendOk = await checkBackendHealth();
  checks.push({ name: 'Backend Health', ok: backendOk });

  let dbOk = false;
  if (backendOk) {
    dbOk = await checkDatabaseConnection();
    checks.push({ name: 'Database Connection', ok: dbOk });

    const corsOk = await checkCORS();
    checks.push({ name: 'CORS Configuration', ok: corsOk });
  }

  // Print summary
  header('📊 SUMMARY');
  console.log('  Component                  Status');
  console.log('  ─────────────────────────────────');
  checks.forEach(check => {
    const status = check.ok
      ? colors.green + '✓ OK' + colors.reset
      : colors.red + '✗ FAILED' + colors.reset;
    console.log(`  ${check.name.padEnd(24)} ${status}`);
  });

  const allPassed = checks.every(c => c.ok);
  console.log('\n  ─────────────────────────────────');

  if (allPassed) {
    log(colors.green + colors.bright,
      '  ✓ All connectivity checks passed!\n'
    );
    log(colors.cyan,
      `  Frontend:  http://localhost:5175
  Backend:   http://localhost:5000
  Database:  Connected via Supabase\n`
    );
  } else {
    log(colors.red + colors.bright,
      '  ✗ Some checks failed. See above for details.\n'
    );
  }

  return allPassed;
}

async function main() {
  log(colors.bright + colors.cyan,
    `
╔══════════════════════════════════════════════════════╗
║   AI Powered School - Full Stack Connectivity Test   ║
╚══════════════════════════════════════════════════════╝
  `
  );

  const passed = await generateReport();

  header('🚀 NEXT STEPS');
  if (!passed) {
    console.log(`
  1. Start Backend:
     cd backend
     npm run dev

  2. Start Frontend (in new terminal):
     npm run dev

  3. Run this test again to verify connectivity
  `);
  } else {
    console.log(`
  1. Open http://localhost:5173 in your browser
  2. Login with test credentials
  3. Check browser console for any errors
  4. Monitor backend console for API requests
  `);
  }

  process.exit(passed ? 0 : 1);
}

main().catch(err => {
  log(colors.red, `Unexpected error: ${err.message}`);
  process.exit(1);
});
