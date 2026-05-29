/**
 * Check classes in database - using dotenv to load .env
 */
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Load .env file
const envPath = path.join(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
} else {
  const envLocalPath = path.join(process.cwd(), '.env.local');
  if (fs.existsSync(envLocalPath)) {
    dotenv.config({ path: envLocalPath });
  }
}

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

console.log('🔍 Looking for environment variables...');
console.log('   VITE_SUPABASE_URL:', supabaseUrl ? '✅ Found' : '❌ Not found');
console.log('   VITE_SUPABASE_ANON_KEY:', supabaseKey ? '✅ Found' : '❌ Not found');

if (!supabaseUrl || !supabaseKey) {
  console.log('\n❌ Error: Supabase credentials not found!');
  console.log('\n📝 Solution:');
  console.log('1. Check if .env or .env.local file exists in project root');
  console.log('2. Make sure it contains:');
  console.log('   VITE_SUPABASE_URL=your_url');
  console.log('   VITE_SUPABASE_ANON_KEY=your_key');
  console.log('3. Then run this script again');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkClasses() {
  console.log('\n🔍 Checking classes in database...\n');
  
  try {
    const { data, error } = await supabase
      .from('class_config')
      .select('*')
      .order('class_name');

    if (error) {
      console.error('❌ Error fetching classes:', error.message);
      return;
    }

    if (!data || data.length === 0) {
      console.log('⚠️  No classes found in the database');
      console.log('\n📝 To create classes:');
      console.log('1. Go to Admin Dashboard → Class Management');
      console.log('2. Click "Add New Class"');
      console.log('3. Enter class name (e.g., 1A, 2B, 10A)');
      console.log('4. Enter capacity (e.g., 30, 40)');
      console.log('5. Click Save\n');
      return;
    }

    console.log(`✅ Found ${data.length} class(es):\n`);
    
    data.forEach((cls, index) => {
      console.log(`${index + 1}. ${cls.class_name}`);
      console.log(`   Max Students: ${cls.max_students}`);
      console.log(`   Current Students: ${cls.current_students}`);
      if (cls.subjects) console.log(`   Subjects: ${cls.subjects}`);
      console.log('');
    });

  } catch (err) {
    console.error('❌ Exception:', err.message);
  }
}

checkClasses();
