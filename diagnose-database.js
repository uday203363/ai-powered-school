#!/usr/bin/env node

/**
 * Database Diagnostic - Check Schema and Data
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
  log(`${title}`, 'bold');
  log(`${'='.repeat(70)}`, 'cyan');
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

    header('DATABASE DIAGNOSTIC REPORT');

    // Check Users
    log('\n📋 Checking USERS Table', 'blue');
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('*');
    
    if (usersError) {
      log(`❌ Error: ${usersError.message}`, 'red');
    } else {
      log(`✅ Total Users: ${users.length}`, 'green');
      const roles = {};
      users.forEach(u => {
        roles[u.role] = (roles[u.role] || 0) + 1;
      });
      log('\nUsers by Role:', 'cyan');
      Object.entries(roles).forEach(([role, count]) => {
        log(`  - ${role}: ${count}`, 'cyan');
      });

      const classes = {};
      users.forEach(u => {
        if (u.class) {
          classes[u.class] = (classes[u.class] || 0) + 1;
        }
      });
      if (Object.keys(classes).length > 0) {
        log('\nUsers by Class:', 'cyan');
        Object.entries(classes).sort().forEach(([cls, count]) => {
          log(`  - ${cls}: ${count}`, 'cyan');
        });
      }
    }

    // Check Fees
    log('\n📋 Checking FEES Table', 'blue');
    const { data: fees, error: feesError } = await supabase
      .from('fees')
      .select('*');
    
    if (feesError) {
      log(`❌ Error: ${feesError.message}`, 'red');
    } else {
      log(`✅ Total Fees Records: ${fees.length}`, 'green');
      
      if (fees.length > 0) {
        // Check columns
        const sample = fees[0];
        log('\nFees Table Columns:', 'cyan');
        Object.keys(sample).forEach(key => {
          log(`  - ${key}`, 'cyan');
        });

        // Check for balance column
        if ('balance' in sample) {
          log('\n✅ Balance column exists', 'green');
        } else {
          log('\n❌ Balance column NOT found', 'red');
        }

        // Status breakdown
        const statusBreakdown = {};
        fees.forEach(f => {
          statusBreakdown[f.status] = (statusBreakdown[f.status] || 0) + 1;
        });
        log('\nFees by Status:', 'cyan');
        Object.entries(statusBreakdown).forEach(([status, count]) => {
          log(`  - ${status}: ${count}`, 'cyan');
        });

        // Financial summary
        let totalAmount = 0;
        let totalPaid = 0;
        let totalBalance = 0;
        fees.forEach(f => {
          totalAmount += f.total_amount || 0;
          totalPaid += f.paid_amount || 0;
          totalBalance += f.balance || 0;
        });
        log('\nFinancial Summary:', 'cyan');
        log(`  - Total Fees: ₹${totalAmount.toFixed(2)}`, 'cyan');
        log(`  - Total Paid: ₹${totalPaid.toFixed(2)}`, 'cyan');
        log(`  - Total Pending: ₹${totalBalance.toFixed(2)}`, 'cyan');
      } else {
        log('⚠️  No fees records found', 'yellow');
      }
    }

    // Check Exams
    log('\n📋 Checking EXAMS Table', 'blue');
    const { data: exams, error: examsError } = await supabase
      .from('exams')
      .select('count', { count: 'exact' });
    
    if (examsError) {
      log(`❌ Error: ${examsError.message}`, 'red');
    } else {
      log(`✅ Total Exam Records: ${exams || 0}`, 'green');
    }

    // Check Marks
    log('\n📋 Checking MARKS Table', 'blue');
    const { data: marks, error: marksError } = await supabase
      .from('marks')
      .select('count', { count: 'exact' });
    
    if (marksError) {
      log(`⚠️  Table may not exist: ${marksError.message}`, 'yellow');
    } else {
      log(`✅ Total Marks Records: ${marks || 0}`, 'green');
    }

    // Check Attendance
    log('\n📋 Checking ATTENDANCE Table', 'blue');
    const { data: attendance, error: attendanceError } = await supabase
      .from('attendance')
      .select('count', { count: 'exact' });
    
    if (attendanceError) {
      log(`⚠️  Table may not exist: ${attendanceError.message}`, 'yellow');
    } else {
      log(`✅ Total Attendance Records: ${attendance || 0}`, 'green');
    }

    header('DIAGNOSTIC SUMMARY');
    if (users && users.length > 0) {
      log('✅ User data exists', 'green');
    } else {
      log('⚠️  No user data found - may need to seed database', 'yellow');
    }

    if (fees && fees.length > 0) {
      log('✅ Fee data exists', 'green');
    } else {
      log('⚠️  No fee data found - may need to create test fees', 'yellow');
    }

  } catch (error) {
    log(`\n❌ Error: ${error.message}`, 'red');
  }
}

main();
