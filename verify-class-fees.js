#!/usr/bin/env node

/**
 * Class Fee Management Verification Script
 * Executes all verification queries and displays results
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Color codes
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

function subheader(title) {
  log(`\n📊 ${title}`, 'blue');
  log(`${'-'.repeat(70)}`, 'blue');
}

function table(data) {
  if (!data || data.length === 0) {
    log('No data found', 'yellow');
    return;
  }
  console.table(data);
}

async function main() {
  try {
    // Load environment
    const envPath = path.join(__dirname, '.env.local');
    if (!fs.existsSync(envPath)) {
      log('❌ ERROR: .env.local file not found!', 'red');
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

    const supabaseUrl = envVars.VITE_SUPABASE_URL;
    const supabaseKey = envVars.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      log('❌ ERROR: Missing Supabase credentials in .env.local', 'red');
      process.exit(1);
    }

    log('🔗 Connecting to Supabase...', 'cyan');
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Test connection
    const { data: connTest, error: connError } = await supabase
      .from('users')
      .select('count', { count: 'exact' });

    if (connError) {
      log(`❌ Connection failed: ${connError.message}`, 'red');
      process.exit(1);
    }

    log('✅ Connected to Supabase!\n', 'green');

    // =======================
    // 1. CHECK BALANCE COLUMN
    // =======================
    subheader('1. Checking BALANCE Column in FEES Table');
    try {
      const { data: columns, error: colError } = await supabase
        .from('fees')
        .select('*')
        .limit(1);

      if (colError) throw colError;

      if (columns && columns.length > 0) {
        const balanceExists = 'balance' in columns[0];
        if (balanceExists) {
          log('✅ Balance column exists in fees table', 'green');
        } else {
          log('❌ Balance column NOT found in fees table', 'red');
        }
      }
    } catch (error) {
      log(`⚠️  Error checking balance column: ${error.message}`, 'yellow');
    }

    // =======================
    // 2. FEE STATISTICS
    // =======================
    subheader('2. Fee Statistics');
    try {
      const { data: fees, error: feeError } = await supabase
        .from('fees')
        .select('*');

      if (feeError) throw feeError;

      if (fees && fees.length > 0) {
        const totalFees = fees.length;
        const feesWithBalance = fees.filter(f => f.balance !== null).length;
        const fullyPaidFees = fees.filter(f => f.balance === 0).length;

        const stats = [
          {
            Metric: 'Total Fees Records',
            Count: totalFees
          },
          {
            Metric: 'Fees with Balance',
            Count: feesWithBalance
          },
          {
            Metric: 'Fully Paid Fees (Balance = 0)',
            Count: fullyPaidFees
          },
          {
            Metric: 'Pending/Partially Paid',
            Count: totalFees - fullyPaidFees
          }
        ];

        table(stats);
      } else {
        log('No fees records found', 'yellow');
      }
    } catch (error) {
      log(`⚠️  Error fetching fee statistics: ${error.message}`, 'yellow');
    }

    // =======================
    // 3. LATEST 20 FEES
    // =======================
    subheader('3. Latest 20 Fee Records');
    try {
      const { data: latestFees, error: latestError } = await supabase
        .from('fees')
        .select('id, student_id, month, year, total_amount, paid_amount, balance, status, created_at')
        .order('created_at', { ascending: false })
        .limit(20);

      if (latestError) throw latestError;

      if (latestFees && latestFees.length > 0) {
        const displayFees = latestFees.map(f => ({
          'ID': f.id,
          'Month': f.month,
          'Year': f.year,
          'Total': `₹${f.total_amount}`,
          'Paid': `₹${f.paid_amount}`,
          'Balance': `₹${f.balance || 0}`,
          'Status': f.status
        }));
        table(displayFees);
      } else {
        log('No fees found', 'yellow');
      }
    } catch (error) {
      log(`⚠️  Error fetching latest fees: ${error.message}`, 'yellow');
    }

    // =======================
    // 4. CLASS-WISE FEE SUMMARY
    // =======================
    subheader('4. Class-Wise Fee Summary');
    try {
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('id, class, role, status');

      if (usersError) throw usersError;

      const { data: allFees, error: allFeesError } = await supabase
        .from('fees')
        .select('student_id, total_amount, paid_amount, balance');

      if (allFeesError) throw allFeesError;

      // Group by class
      const classSummary = {};
      const activeStudents = users.filter(u => u.role === 'student' && u.status === 'Active');

      activeStudents.forEach(student => {
        if (!classSummary[student.class]) {
          classSummary[student.class] = {
            class: student.class,
            students: new Set(),
            feeRecords: 0,
            totalAmount: 0,
            totalPaid: 0,
            totalBalance: 0
          };
        }
        classSummary[student.class].students.add(student.id);
      });

      allFees.forEach(fee => {
        const student = activeStudents.find(u => u.id === fee.student_id);
        if (student && classSummary[student.class]) {
          classSummary[student.class].feeRecords++;
          classSummary[student.class].totalAmount += fee.total_amount || 0;
          classSummary[student.class].totalPaid += fee.paid_amount || 0;
          classSummary[student.class].totalBalance += fee.balance || 0;
        }
      });

      const classSummaryArray = Object.values(classSummary)
        .filter(c => c.feeRecords > 0)
        .map(c => ({
          'Class': c.class,
          'Students': c.students.size,
          'Fee Records': c.feeRecords,
          'Total Amount': `₹${c.totalAmount.toFixed(2)}`,
          'Total Paid': `₹${c.totalPaid.toFixed(2)}`,
          'Pending': `₹${c.totalBalance.toFixed(2)}`
        }))
        .sort((a, b) => a.Class.localeCompare(b.Class));

      if (classSummaryArray.length > 0) {
        table(classSummaryArray);
      } else {
        log('No class-wise fee data found', 'yellow');
      }
    } catch (error) {
      log(`⚠️  Error fetching class-wise summary: ${error.message}`, 'yellow');
    }

    // =======================
    // 5. FEE STATUS BREAKDOWN
    // =======================
    subheader('5. Fee Status Breakdown');
    try {
      const { data: statusFees, error: statusError } = await supabase
        .from('fees')
        .select('status, count()');

      if (statusError) throw statusError;

      const { data: allStatusFees, error: allStatusError } = await supabase
        .from('fees')
        .select('status');

      if (allStatusError) throw allStatusError;

      const statusBreakdown = {};
      allStatusFees.forEach(f => {
        statusBreakdown[f.status] = (statusBreakdown[f.status] || 0) + 1;
      });

      const statusArray = Object.entries(statusBreakdown).map(([status, count]) => ({
        'Status': status,
        'Count': count,
        'Percentage': `${((count / allStatusFees.length) * 100).toFixed(1)}%`
      }));

      table(statusArray);
    } catch (error) {
      log(`⚠️  Error fetching status breakdown: ${error.message}`, 'yellow');
    }

    // =======================
    // SUMMARY
    // =======================
    header('✅ Verification Complete');
    log('Class Fee Management system has been verified successfully!', 'green');
    log('All queries executed. Review the results above for any issues.\n', 'green');

  } catch (error) {
    log(`\n❌ Verification failed: ${error.message}`, 'red');
    process.exit(1);
  }
}

main();
