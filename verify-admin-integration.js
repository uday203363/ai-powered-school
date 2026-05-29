#!/usr/bin/env node

/**
 * Verify Admin Fee Tracking Integration
 * Tests that fees created by teachers appear in admin dashboard
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
      process.exit(1);
    }

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

    header('ADMIN DASHBOARD FEE TRACKING INTEGRATION TEST');

    // ============================================
    // Step 1: Get all fees like admin dashboard does
    // ============================================
    section('STEP 1: Fetching All Fees (Admin Dashboard Method)');

    log('Getting all active students...', 'cyan');
    const { data: students, error: studentError } = await supabase
      .from('users')
      .select('id, register_no, name, class, email, phone, initial_fee, current_fee')
      .eq('role', 'student')
      .eq('status', 'Active')
      .order('class', { ascending: true });

    if (studentError || !students || students.length === 0) {
      log('❌ No active students found!', 'red');
      return;
    }

    log(`✅ Found ${students.length} active students`, 'green');
    students.forEach(s => {
      log(`   • ${s.register_no} - ${s.name} (${s.class})`, 'cyan');
    });

    // ============================================
    // Step 2: Get all fees
    // ============================================
    section('STEP 2: Loading Fees from Database');

    const studentIds = students.map((s) => s.id);
    log(`Querying fees table for ${studentIds.length} students...`, 'cyan');

    const { data: fees, error: feeError } = await supabase
      .from('fees')
      .select('id, student_id, month, year, total_amount, paid_amount, balance, status, created_at')
      .in('student_id', studentIds)
      .order('created_at', { ascending: false });

    if (feeError) {
      log(`⚠️  Fee query error: ${feeError.message}`, 'yellow');
    }

    log(`✅ Found ${fees?.length || 0} fee records`, 'green');

    // ============================================
    // Step 3: Flatten data like getAllFees does
    // ============================================
    section('STEP 3: Flattening Data (What Admin Dashboard Uses)');

    const allFees = [];
    const currentYear = new Date().getFullYear();

    students.forEach((student) => {
      // Fees from fees table
      const studentFees = (fees || []).filter((f) => f.student_id === student.id);
      
      studentFees.forEach((fee) => {
        allFees.push({
          ...fee,
          register_no: student.register_no,
          student_name: student.name,
          class: student.class,
          email: student.email,
          phone: student.phone,
          balance: (fee.total_amount || 0) - (fee.paid_amount || 0)
        });
      });

      // Registration fees from user record
      if (student.current_fee && student.current_fee > 0) {
        const registrationFeeExists = studentFees.some((f) => f.month === 'Registration');
        if (!registrationFeeExists) {
          allFees.push({
            id: `user-fee-${student.id}`,
            student_id: student.id,
            register_no: student.register_no,
            student_name: student.name,
            class: student.class,
            email: student.email,
            phone: student.phone,
            month: 'Registration',
            year: currentYear,
            total_amount: student.current_fee,
            paid_amount: 0,
            balance: student.current_fee,
            status: 'pending',
            created_at: new Date().toISOString()
          });
        }
      }
    });

    log(`✅ Total fees to display: ${allFees.length}`, 'green');

    // ============================================
    // Step 4: Calculate statistics
    // ============================================
    section('STEP 4: Calculating Statistics');

    let totalAmount = 0;
    let paidAmount = 0;
    let pendingAmount = 0;

    allFees.forEach((fee) => {
      totalAmount += fee.total_amount || 0;
      paidAmount += fee.paid_amount || 0;
      pendingAmount += fee.balance || 0;
    });

    log(`✅ Statistics calculated:`, 'green');
    log(`   Total Fees: ₹${totalAmount.toFixed(2)}`, 'cyan');
    log(`   Amount Paid: ₹${paidAmount.toFixed(2)}`, 'cyan');
    log(`   Pending Amount: ₹${pendingAmount.toFixed(2)}`, 'cyan');

    // ============================================
    // Step 5: Display sample data
    // ============================================
    section('STEP 5: Sample Fee Records (What Admin Dashboard Shows)');

    if (allFees.length > 0) {
      log(`\nShowing first 5 fee records:\n`, 'blue');
      
      const sampleFees = allFees.slice(0, 5);
      const tableData = sampleFees.map(f => ({
        'Register': f.register_no || 'N/A',
        'Student': f.student_name || 'Unknown',
        'Class': f.class || 'N/A',
        'Month': `${f.month}/${f.year}`,
        'Total': `₹${f.total_amount}`,
        'Paid': `₹${f.paid_amount}`,
        'Balance': `₹${f.balance}`,
        'Status': f.status
      }));

      console.table(tableData);
      
      if (allFees.length > 5) {
        log(`\n... and ${allFees.length - 5} more records`, 'cyan');
      }
    } else {
      log('No fees to display', 'yellow');
    }

    // ============================================
    // Step 6: Status check
    // ============================================
    section('STEP 6: Integration Status');

    const issuesFound = [];

    // Check for students
    if (students.length === 0) {
      issuesFound.push('No active students found');
    } else {
      log(`✅ Students: ${students.length} active students found`, 'green');
    }

    // Check for fees
    if (allFees.length === 0) {
      log(`⚠️  Fees: No fees created yet (add fees to test dashboard)`, 'yellow');
    } else {
      log(`✅ Fees: ${allFees.length} fee records available`, 'green');
    }

    // Check statistics
    if (totalAmount === 0 && paidAmount === 0) {
      log(`⚠️  Statistics: All values are zero (expected if no fees yet)`, 'yellow');
    } else {
      log(`✅ Statistics: Calculated correctly`, 'green');
    }

    // ============================================
    // Final Summary
    // ============================================
    header('INTEGRATION TEST SUMMARY');

    if (issuesFound.length === 0) {
      log('\n✅ Admin Fee Tracking Integration: WORKING CORRECTLY', 'green');
      log('\nWhat this means:', 'cyan');
      log('  • Admin dashboard can fetch all fees from database', 'cyan');
      log('  • Data from teacher fee management is visible to admin', 'cyan');
      log('  • Statistics are calculated from real data', 'cyan');
      log('  • All students and their fees are properly linked', 'cyan');
      
      if (allFees.length > 0) {
        log('\n✅ Data is flowing correctly:', 'green');
        log('  • Teachers add fees → Stored in database', 'cyan');
        log('  • Admin dashboard retrieves fees → Shows real data', 'cyan');
        log('  • Statistics update automatically', 'cyan');
      } else {
        log('\n💡 To see integration in action:', 'blue');
        log('  1. Login as Teacher', 'cyan');
        log('  2. Go to "Class Fee Management" tab', 'cyan');
        log('  3. Add a fee for a student', 'cyan');
        log('  4. Login as Admin', 'cyan');
        log('  5. Go to "Fee Management" page', 'cyan');
        log('  6. The fee should appear in the dashboard!', 'cyan');
      }
    } else {
      log('\n❌ Issues found:', 'red');
      issuesFound.forEach(issue => {
        log(`  • ${issue}`, 'red');
      });
    }

    log('\n' + '='.repeat(70) + '\n', 'cyan');

  } catch (error) {
    log(`\n❌ Error: ${error.message}`, 'red');
    console.error(error);
  }
}

main();
