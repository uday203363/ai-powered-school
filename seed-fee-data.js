#!/usr/bin/env node

/**
 * Seed Class Fee Management Data
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

    header('SEEDING CLASS FEE DATA');

    // Get all students
    log('\n📝 Fetching student list...', 'blue');
    const { data: students, error: studentsError } = await supabase
      .from('users')
      .select('id, name, class, register_no')
      .eq('role', 'student')
      .eq('status', 'Active');

    if (studentsError) {
      log(`❌ Error fetching students: ${studentsError.message}`, 'red');
      return;
    }

    log(`✅ Found ${students.length} active students`, 'green');

    // Fee structure by class
    const feeStructure = {
      '6a': 5000,
      '7a': 5500,
      '8a': 6000,
      '9a': 6500,
      '10a': 7000
    };

    // Create fee records for last 6 months
    const months = [
      { month: 'April', monthNum: 4 },
      { month: 'March', monthNum: 3 },
      { month: 'February', monthNum: 2 },
      { month: 'January', monthNum: 1 },
      { month: 'December', monthNum: 12 },
      { month: 'November', monthNum: 11 }
    ];

    let feesCreated = 0;
    let feesSkipped = 0;

    log('\n🔄 Creating fee records...', 'blue');
    log('-'.repeat(70), 'blue');

    for (const student of students) {
      for (const monthData of months) {
        const totalFee = feeStructure[student.class] || 5000;
        
        // Vary payment status
        let paidAmount, balance, status;
        const random = Math.random();
        
        if (random < 0.3) {
          // 30% fully paid
          paidAmount = totalFee;
          balance = 0;
          status = 'Paid';
        } else if (random < 0.6) {
          // 30% partially paid
          paidAmount = Math.floor(totalFee * 0.7);
          balance = totalFee - paidAmount;
          status = 'Partial';
        } else {
          // 40% unpaid
          paidAmount = 0;
          balance = totalFee;
          status = 'Unpaid';
        }

        const year = monthData.monthNum > 3 ? 2024 : 2025; // Academic year
        const feeData = {
          student_id: student.id,
          month: monthData.month,
          year: year,
          total_amount: totalFee,
          paid_amount: paidAmount,
          balance: balance,
          status: status,
          created_at: new Date().toISOString()
        };

        const { error } = await supabase
          .from('fees')
          .insert([feeData]);

        if (error) {
          feesSkipped++;
        } else {
          feesCreated++;
        }
      }
    }

    log(`\n✅ Fee records created: ${feesCreated}`, 'green');
    if (feesSkipped > 0) {
      log(`⚠️  Fee records skipped: ${feesSkipped}`, 'yellow');
    }

    // Verify the data
    header('VERIFICATION');

    const { data: allFees } = await supabase
      .from('fees')
      .select('*');

    log(`\n✅ Total fees in database: ${allFees.length}`, 'green');

    // Calculate summary
    let totalAmount = 0;
    let totalPaid = 0;
    let totalBalance = 0;
    const statusCount = {};

    allFees.forEach(f => {
      totalAmount += f.total_amount || 0;
      totalPaid += f.paid_amount || 0;
      totalBalance += f.balance || 0;
      statusCount[f.status] = (statusCount[f.status] || 0) + 1;
    });

    log('\n📊 Financial Summary:', 'cyan');
    log(`  Total Fees: ₹${totalAmount.toFixed(2)}`, 'cyan');
    log(`  Total Paid: ₹${totalPaid.toFixed(2)}`, 'cyan');
    log(`  Total Pending: ₹${totalBalance.toFixed(2)}`, 'cyan');

    log('\n📊 Status Breakdown:', 'cyan');
    Object.entries(statusCount).forEach(([status, count]) => {
      log(`  ${status}: ${count}`, 'cyan');
    });

    header('✅ SEEDING COMPLETE');
    log('Fee data has been successfully created!\n', 'green');

  } catch (error) {
    log(`\n❌ Error: ${error.message}`, 'red');
  }
}

main();
