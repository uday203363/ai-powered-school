#!/usr/bin/env node

/**
 * Seed Class Fee Management Data - Debug Version
 * Creates sample fee records for testing
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

    log('\n📝 Fetching student list...', 'blue');
    const { data: students, error: studentsError } = await supabase
      .from('users')
      .select('id, name, class, register_no')
      .eq('role', 'student')
      .eq('status', 'Active');

    if (studentsError) {
      log(`❌ Error: ${studentsError.message}`, 'red');
      return;
    }

    log(`✅ Found ${students.length} students:`, 'green');
    students.forEach(s => {
      log(`   - ${s.name} (${s.register_no}) - Class ${s.class}`, 'cyan');
    });

    if (students.length === 0) {
      log('\n⚠️  No active students found!', 'yellow');
      return;
    }

    // Try inserting one test fee record with error handling
    log('\n🧪 Testing fee insertion...', 'blue');
    const testFeeData = {
      student_id: students[0].id,
      month: 'April',
      year: 2025,
      total_amount: 5000,
      paid_amount: 2500,
      balance: 2500,
      status: 'partial'
    };

    log(`   Student ID: ${testFeeData.student_id}`, 'cyan');
    log(`   Month: ${testFeeData.month}`, 'cyan');
    log(`   Total: ₹${testFeeData.total_amount}`, 'cyan');

    const { data, error } = await supabase
      .from('fees')
      .insert([testFeeData])
      .select();

    if (error) {
      log(`\n❌ Insert error: ${error.message}`, 'red');
      log(`   Code: ${error.code}`, 'red');
      log(`   Details: ${JSON.stringify(error.details, null, 2)}`, 'red');
    } else {
      log('\n✅ Test insert successful!', 'green');
      log(`   Created: ${JSON.stringify(data, null, 2)}`, 'green');
    }

  } catch (error) {
    log(`\n❌ Error: ${error.message}`, 'red');
  }
}

main();
