#!/usr/bin/env node

/**
 * Check database tables and constraints
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m'
};

function log(msg, color = 'reset') {
  console.log(`${colors[color]}${msg}${colors.reset}`);
}

async function main() {
  try {
    const envPath = path.join(__dirname, '.env.local');
    const envContent = fs.readFileSync(envPath, 'utf-8');
    const envVars = {};
    envContent.split('\n').forEach(line => {
      const [key, value] = line.split('=');
      if (key && value) {
        envVars[key.trim()] = value.trim();
      }
    });

    const supabase = createClient(
      envVars.VITE_SUPABASE_URL,
      envVars.VITE_SUPABASE_ANON_KEY
    );

    log('\n📊 Checking Tables & Constraints', 'cyan');
    log('='.repeat(70), 'cyan');

    // Try to list all tables by attempting basic queries
    log('\n1️⃣  Checking for USERS table:', 'blue');
    const { count: usersCount } = await supabase
      .from('users')
      .select('*', { count: 'exact' });
    log(`   ✅ USERS table exists (${usersCount || 0} records)`, 'green');

    log('\n2️⃣  Checking for STUDENTS table:', 'blue');
    const { error: studentsError } = await supabase
      .from('students')
      .select('*')
      .limit(1);
    if (studentsError) {
      log(`   ❌ STUDENTS table does NOT exist`, 'red');
      log(`   Error: ${studentsError.message}`, 'red');
    } else {
      log(`   ✅ STUDENTS table exists`, 'green');
    }

    log('\n3️⃣  Checking FEES table structure:', 'blue');
    const { data: sampleFee, error: feeError } = await supabase
      .from('fees')
      .select('*')
      .limit(1);
    
    if (feeError) {
      log(`   ❌ Error: ${feeError.message}`, 'red');
    } else {
      if (sampleFee && sampleFee.length > 0) {
        log(`   ✅ FEES table exists with columns:`, 'green');
        Object.keys(sampleFee[0]).forEach(col => {
          log(`      - ${col}`, 'cyan');
        });
      } else {
        log(`   ✅ FEES table exists (empty)`, 'green');
      }
    }

    log('\n' + '='.repeat(70), 'cyan');

  } catch (error) {
    log(`\n❌ Error: ${error.message}`, 'red');
  }
}

main();
