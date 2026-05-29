#!/usr/bin/env node

/**
 * Configuration Validator
 * Ensures all frontend, backend, and database configs are compatible
 */

import fs from 'fs';
import path from 'path';

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

function checkmark(text) {
  log(colors.green, `✓ ${text}`);
}

function error(text) {
  log(colors.red, `✗ ${text}`);
}

function warning(text) {
  log(colors.yellow, `⚠ ${text}`);
}

function section(title) {
  console.log('\n' + colors.bright + colors.blue + title + colors.reset);
  console.log('-'.repeat(60));
}

// Parse env files
function parseEnv(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const vars = {};
  content.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length) {
      const value = valueParts.join('=').trim();
      vars[key.trim()] = value.replace(/^["']|["']$/g, '');
    }
  });
  return vars;
}

function validateConfig() {
  section('📋 Configuration Validation');

  const issues = [];
  const warnings_list = [];

  // Check files exist
  console.log('\n1️⃣  Checking Configuration Files...');
  
  const files = [
    { path: '.env.local', name: 'Frontend Environment' },
    { path: 'backend/.env', name: 'Backend Environment' },
    { path: 'vite.config.ts', name: 'Vite Configuration' },
    { path: 'backend/src/app.ts', name: 'Backend Server' },
    { path: 'src/services/apiClient.ts', name: 'API Client' },
  ];

  for (const file of files) {
    if (fs.existsSync(file.path)) {
      checkmark(`Found: ${file.name} (${file.path})`);
    } else {
      error(`Missing: ${file.name} (${file.path})`);
      issues.push(`Missing file: ${file.path}`);
    }
  }

  // Parse environment files
  console.log('\n2️⃣  Validating Environment Variables...');

  let frontendEnv = {};
  let backendEnv = {};

  try {
    frontendEnv = parseEnv('.env.local');
    checkmark('Frontend .env.local loaded');
  } catch (err) {
    error(`Cannot read .env.local: ${err.message}`);
    issues.push('Cannot read .env.local');
  }

  try {
    backendEnv = parseEnv('backend/.env');
    checkmark('Backend .env loaded');
  } catch (err) {
    error(`Cannot read backend/.env: ${err.message}`);
    issues.push('Cannot read backend/.env');
  }

  // Validate frontend config
  console.log('\n3️⃣  Frontend Configuration...');
  
  if (frontendEnv.VITE_API_URL) {
    if (frontendEnv.VITE_API_URL === 'http://localhost:5000/api') {
      checkmark(`API URL: ${frontendEnv.VITE_API_URL}`);
    } else {
      warning(`Custom API URL: ${frontendEnv.VITE_API_URL}`);
      warnings_list.push('Non-standard API URL (expected http://localhost:5000/api)');
    }
  } else {
    error('Missing: VITE_API_URL');
    issues.push('VITE_API_URL not set in .env.local');
  }

  if (frontendEnv.VITE_SUPABASE_URL) {
    checkmark(`Supabase URL configured`);
  } else {
    warning('Missing: VITE_SUPABASE_URL (may be needed for direct DB access)');
  }

  if (frontendEnv.VITE_SUPABASE_ANON_KEY) {
    checkmark(`Supabase Key configured`);
  } else {
    warning('Missing: VITE_SUPABASE_ANON_KEY');
  }

  // Validate backend config
  console.log('\n4️⃣  Backend Configuration...');

  if (backendEnv.DATABASE_URL) {
    if (backendEnv.DATABASE_URL.includes('postgresql://')) {
      checkmark(`Database URL configured`);
      // Check if it includes password (basic validation)
      if (backendEnv.DATABASE_URL.split(':').length > 3) {
        checkmark('Database credentials present');
      } else {
        warning('Database URL may be missing credentials');
        warnings_list.push('DATABASE_URL might be incomplete');
      }
    } else {
      error('Invalid DATABASE_URL format');
      issues.push('DATABASE_URL does not appear to be a PostgreSQL connection string');
    }
  } else {
    error('Missing: DATABASE_URL');
    issues.push('DATABASE_URL not set in backend/.env');
  }

  if (backendEnv.JWT_SECRET && backendEnv.JWT_SECRET.length > 10) {
    checkmark(`JWT Secret configured (${backendEnv.JWT_SECRET.length} chars)`);
  } else {
    warning('JWT_SECRET is weak or missing');
    warnings_list.push('JWT_SECRET should be at least 32 random characters');
  }

  if (backendEnv.PORT === '5000') {
    checkmark(`Backend Port: ${backendEnv.PORT}`);
  } else {
    warning(`Backend Port: ${backendEnv.PORT || '(not set, defaults to 5000)'}`);
  }

  if (backendEnv.FRONTEND_URL) {
    checkmark(`Frontend URL configured: ${backendEnv.FRONTEND_URL}`);
  } else {
    warning(`FRONTEND_URL not set (defaults to http://localhost:5173)`);
  }

  if (backendEnv.NODE_ENV) {
    checkmark(`Node Environment: ${backendEnv.NODE_ENV}`);
  } else {
    warning('NODE_ENV not set');
  }

  // Check compatibility
  console.log('\n5️⃣  Compatibility Check...');

  const apiUrl = frontendEnv.VITE_API_URL || 'http://localhost:5000/api';
  const backendPort = backendEnv.PORT || '5000';

  if (apiUrl.includes(':' + backendPort)) {
    checkmark('Frontend API URL matches backend port');
  } else {
    warning(`Potential port mismatch: Frontend points to port in VITE_API_URL, backend runs on ${backendPort}`);
  }

  // Check if Supabase domains match
  const frontendSupabaseUrl = frontendEnv.VITE_SUPABASE_URL || '';
  const backendDbUrl = backendEnv.DATABASE_URL || '';
  
  if (frontendSupabaseUrl && backendDbUrl) {
    const frontendProject = frontendSupabaseUrl.match(/https:\/\/([^.]+)\.supabase/)?.[1];
    const backendProject = backendDbUrl.match(/db\.([^.]+)\.supabase/)?.[1];
    
    if (frontendProject && backendProject && frontendProject === backendProject) {
      checkmark(`Frontend and Backend use same Supabase project: ${frontendProject}`);
    } else if (frontendProject && backendProject && frontendProject !== backendProject) {
      error(`Supabase project mismatch! Frontend: ${frontendProject}, Backend: ${backendProject}`);
      issues.push('Frontend and Backend pointing to different Supabase projects');
    }
  }

  // Summary
  section('📊 Summary');

  if (issues.length === 0 && warnings_list.length === 0) {
    log(colors.green + colors.bright, '\n✓ All configurations are valid!\n');
    return true;
  } else if (issues.length === 0) {
    log(colors.yellow + colors.bright, `\n⚠ ${warnings_list.length} warning(s) found\n`);
    warnings_list.forEach((w, i) => {
      console.log(`  ${i + 1}. ${w}`);
    });
    return true;
  } else {
    log(colors.red + colors.bright, `\n✗ ${issues.length} issue(s) found\n`);
    issues.forEach((issue, i) => {
      console.log(`  ${i + 1}. ${issue}`);
    });
    return false;
  }
}

function main() {
  log(colors.bright + colors.cyan,
    `
╔══════════════════════════════════════════════════════╗
║     Frontend-Backend-Database Configuration         ║
║              Validator & Checker                     ║
╚══════════════════════════════════════════════════════╝
  `
  );

  const isValid = validateConfig();

  console.log('\n' + colors.bright + colors.blue + '═'.repeat(60) + colors.reset);
  console.log('\n📖 Configuration Files:\n');
  console.log('  Frontend Config:  .env.local');
  console.log('  Backend Config:   backend/.env');
  console.log('  Build Config:     vite.config.ts');
  console.log('  Backend Entry:    backend/src/app.ts');
  console.log('  API Client:       src/services/apiClient.ts');

  console.log('\n🚀 To start services:\n');
  console.log('  Terminal 1:  cd backend && npm run dev');
  console.log('  Terminal 2:  npm run dev');
  console.log('  Terminal 3:  node verify-full-connection.js (optional)');

  console.log('\n' + colors.bright + colors.blue + '═'.repeat(60) + colors.reset + '\n');

  process.exit(isValid ? 0 : 1);
}

main();
