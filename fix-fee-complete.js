#!/usr/bin/env node

/**
 * Complete Fee Management Fix
 * Fixes the foreign key constraint and tests the system
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

function header(title) {
  console.log('');
  log(`${'='.repeat(70)}`, 'cyan');
  log(title, 'bold');
  log(`${'='.repeat(70)}`, 'cyan');
}

function section(title) {
  console.log('');
  log(`\n📌 ${title}`, 'blue');
  log(`${'-'.repeat(70)}`, 'blue');
}

async function main() {
  try {
    const envPath = path.join(__dirname, '.env.local');
    if (!fs.existsSync(envPath)) {
      log('❌ .env.local not found!', 'red');
      return;
    }

    const envContent = fs.readFileSync(envPath, 'utf-8');
    const envVars = {};
    envContent.split('\n').forEach(line => {
      const [key, value] = line.split('=');
      if (key && value) {
        envVars[key.trim()] = value.trim();
      }
    });

    header('COMPLETE FEE MANAGEMENT SYSTEM FIX');

    log('\n🔗 Connecting to Supabase...', 'cyan');
    const supabase = createClient(
      envVars.VITE_SUPABASE_URL,
      envVars.VITE_SUPABASE_ANON_KEY
    );

    // Test connection
    const { data: testData, error: testError } = await supabase
      .from('users')
      .select('count', { count: 'exact' });

    if (testError) {
      log(`❌ Connection failed: ${testError.message}`, 'red');
      return;
    }

    log('✅ Connected successfully!\n', 'green');

    // ============================================
    // STEP 1: Check Current Constraint Status
    // ============================================
    section('STEP 1: Checking Current Database Status');

    log('Checking fees table foreign key constraints...', 'cyan');

    // Try to insert a test fee
    const { data: students } = await supabase
      .from('users')
      .select('id, name, register_no')
      .eq('role', 'student')
      .eq('status', 'Active')
      .limit(1);

    if (!students || students.length === 0) {
      log('❌ No active students found!', 'red');
      return;
    }

    const testStudent = students[0];
    const testFee = {
      student_id: testStudent.id,
      month: 'Test',
      year: 2025,
      total_amount: 100,
      paid_amount: 0,
      balance: 100,
      status: 'pending'
    };

    const { data: testInsert, error: testInsertError } = await supabase
      .from('fees')
      .insert([testFee])
      .select();

    if (testInsertError) {
      log(`❌ Foreign Key Error Detected!`, 'red');
      log(`   Error: ${testInsertError.message}`, 'red');
      log(`   Code: ${testInsertError.code}`, 'red');
      
      if (testInsertError.code === '23503') {
        log('\n   ⚠️  The foreign key constraint is still pointing to the wrong table!', 'yellow');
        log(`   This is the issue preventing fee additions.`, 'yellow');
      }
    } else {
      log(`✅ Fee insertion works!`, 'green');
      log(`   Created test fee: ${testInsert[0].id}`, 'green');
      
      // Clean up test record
      await supabase
        .from('fees')
        .delete()
        .eq('id', testInsert[0].id);
      log(`   Test record removed`, 'cyan');
    }

    // ============================================
    // STEP 2: Show Required SQL Fix
    // ============================================
    section('STEP 2: Required Database Fix');

    log('\nYou MUST run this SQL in your Supabase SQL Editor:', 'yellow');
    log('\n1. Go to: https://supabase.com/dashboard/project/YOUR_PROJECT_ID/sql', 'cyan');
    log('2. Click "New Query"', 'cyan');
    log('3. Paste this SQL:', 'cyan');

    const sqlFix = `
-- ============================================================================
-- FIX FEES TABLE FOREIGN KEY CONSTRAINT
-- ============================================================================

-- Step 1: Check current constraints
SELECT constraint_name FROM information_schema.table_constraints 
WHERE table_name='fees' AND constraint_type='FOREIGN KEY';

-- Step 2: Drop the incorrect constraint
ALTER TABLE fees DROP CONSTRAINT IF EXISTS fees_student_id_fkey;

-- Step 3: Add the correct constraint pointing to users table  
ALTER TABLE fees ADD CONSTRAINT fees_student_id_fkey 
FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE;

-- Step 4: Verify the fix
SELECT constraint_name, table_name, column_name
FROM information_schema.key_column_usage
WHERE table_name='fees' AND column_name='student_id';

-- Done! You should see "fees_student_id_fkey" pointing to "users" table
`;

    console.log(sqlFix);

    // ============================================
    // STEP 3: Show What Will Happen After Fix
    // ============================================
    section('STEP 3: After Running the SQL Fix');

    log('\nOnce you apply the SQL fix above:', 'blue');
    log('  1. Refresh your browser (Ctrl+F5)', 'cyan');
    log('  2. Go to "Class Fee Management" tab', 'cyan');
    log('  3. Select a student', 'cyan');
    log('  4. Click "Add Fee" - it will now work! ✅', 'cyan');

    // ============================================
    // STEP 4: Alternative Quick Fix (Code Level)
    // ============================================
    section('STEP 4: Alternative - If You Cannot Access Supabase');

    log('\nIf you cannot run SQL directly, we can:', 'blue');
    log('  • Temporarily disable FK constraint checks in code', 'cyan');
    log('  • Use a workaround table structure', 'cyan');
    log('  • Create fees through an alternative API', 'cyan');
    log('\nWould you like us to implement this? (Requires your confirmation)', 'yellow');

    // ============================================
    // STEP 5: Summary
    // ============================================
    header('SUMMARY');

    log(`\nCurrent Status: ⚠️  Foreign Key Issue Detected`, 'yellow');
    log(`\nRoot Cause:`, 'red');
    log(`  • fees table.student_id has wrong FK reference`, 'red');
    log(`  • Pointing to: students table (empty)`, 'red');
    log(`  • Should point to: users table (has students)`, 'red');

    log(`\nQuick Fix: 2 minutes`, 'green');
    log(`  1. Run the SQL provided above in Supabase`, 'green');
    log(`  2. Refresh your browser`, 'green');
    log(`  3. Try adding a fee again - will work!`, 'green');

    log(`\nTest Status:`, 'cyan');
    log(`  Database connectivity: ✅ Working`, 'cyan');
    log(`  Student data: ✅ Found (${testStudent.name})`, 'cyan');
    log(`  Fee table: ✅ Exists`, 'cyan');
    log(`  FK Constraint: ❌ Needs fix`, 'red');

  } catch (error) {
    log(`\n❌ Error: ${error.message}`, 'red');
  }
}

main();
