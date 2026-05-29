#!/usr/bin/env node

/**
 * Diagnose Fee Foreign Key Status
 * Check if the constraint has been fixed
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

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

    // Get a student ID
    const { data: students, error: studentError } = await supabase
      .from('users')
      .select('id, register_no, name')
      .eq('role', 'student')
      .limit(1);

    if (studentError || !students || students.length === 0) {
      console.error('❌ Could not find student');
      return;
    }

    const studentId = students[0].id;
    const studentName = students[0].name;

    console.log('\n📋 CHECKING FEE SYSTEM STATUS');
    console.log('='.repeat(70));
    console.log(`\n🧪 Test Student: ${studentName} (${studentId})\n`);

    // Test 1: Try to insert a fee record
    console.log('1️⃣  TESTING FEE INSERT...');
    const testFee = {
      student_id: studentId,
      month: 'April',
      year: 2025,
      total_amount: 5000,
      paid_amount: 0,
      balance: 5000,
      status: 'pending'
    };

    const { data: insertResult, error: insertError } = await supabase
      .from('fees')
      .insert([testFee])
      .select();

    if (insertError) {
      console.log(`   ❌ FAILED: ${insertError.message}`);
      console.log(`   Code: ${insertError.code}`);
      if (insertError.details) {
        console.log(`   Details: ${insertError.details}`);
      }
      
      // Check what the FK constraint references
      console.log('\n2️⃣  CHECKING FOREIGN KEY CONSTRAINT...');
      console.log('   The error indicates the FK constraint is still incorrectly configured.');
      console.log('   To fix, run this in Supabase SQL Editor:\n');
      console.log(`
-- Drop old constraint
ALTER TABLE fees DROP CONSTRAINT IF EXISTS fees_student_id_fkey;

-- Add correct constraint
ALTER TABLE fees ADD CONSTRAINT fees_student_id_fkey 
FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE;

-- Verify
SELECT constraint_name FROM information_schema.table_constraints 
WHERE table_name='fees' AND constraint_type='FOREIGN KEY';
      `);
    } else {
      console.log(`   ✅ SUCCESS - Fee inserted!`);
      console.log(`   Fee ID: ${insertResult[0].id}`);
      
      // Clean up test record
      await supabase
        .from('fees')
        .delete()
        .eq('id', insertResult[0].id);
      
      console.log('   (Test record cleaned up)');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

main();
