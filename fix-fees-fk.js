#!/usr/bin/env node

/**
 * Fix Fees Foreign Key Constraint
 * Change from students table to users table
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
  cyan: '\x1b[36m'
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

    log('\n' + '='.repeat(70), 'cyan');
    log('⚠️  FIX FEES FOREIGN KEY CONSTRAINT', 'cyan');
    log('='.repeat(70) + '\n', 'cyan');

    log('This script needs to be run in Supabase SQL Editor', 'yellow');
    log('\nCopy and paste this SQL in your Supabase SQL Editor:\n', 'blue');

    const sqlScript = `
-- ============================================================================
-- FIX FEES TABLE FOREIGN KEY CONSTRAINT
-- Change from students table to users table
-- ============================================================================

-- Step 1: Drop the existing foreign key constraint
ALTER TABLE fees
DROP CONSTRAINT IF EXISTS fees_student_id_fkey;

-- Step 2: Add new foreign key constraint pointing to users table
ALTER TABLE fees
ADD CONSTRAINT fees_student_id_fkey 
FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE;

-- Step 3: Verify the constraint was added
SELECT constraint_name, table_name, column_name
FROM information_schema.key_column_usage
WHERE table_name = 'fees' AND column_name = 'student_id';
`;

    console.log(sqlScript);
    log('\n' + '='.repeat(70), 'cyan');
    log('After running the SQL above, your fees table will work correctly!', 'green');
    log('='.repeat(70) + '\n', 'cyan');

  } catch (error) {
    log(`\n❌ Error: ${error.message}`, 'red');
  }
}

main();
