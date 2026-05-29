/**
 * Check classes in database
 */
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Load .env.local file
const envLocalPath = path.join(process.cwd(), '.env.local');
dotenv.config({ path: envLocalPath });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

console.log('🔍 Checking classes in database...\n');

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: Could not load Supabase credentials from .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkClasses() {
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
      console.log('⚠️  No classes found in the database\n');
      console.log('📝 To create classes:');
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
      console.log(`   • Max Students: ${cls.max_students}`);
      console.log(`   • Current Students: ${cls.current_students}`);
      if (cls.subjects) console.log(`   • Subjects: ${cls.subjects}`);
      console.log('');
    });

  } catch (err) {
    console.error('❌ Exception:', err.message);
  }
}

checkClasses();
