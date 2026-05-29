/**
 * Quick script to check classes in database
 */
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: Supabase credentials not found in environment variables');
  console.error('Make sure .env file has VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkClasses() {
  console.log('🔍 Checking classes in database...\n');
  
  try {
    const { data, error } = await supabase
      .from('class_config')
      .select('*')
      .order('class_name');

    if (error) {
      console.error('❌ Error fetching classes:', error);
      return;
    }

    if (!data || data.length === 0) {
      console.log('⚠️  No classes found in the database');
      console.log('\n📝 To create classes:');
      console.log('1. Go to Admin Dashboard → Class Management');
      console.log('2. Click "Add New Class"');
      console.log('3. Enter class name (e.g., 1A, 2B, 10A)');
      console.log('4. Enter capacity (e.g., 30, 40)');
      console.log('5. Click Save');
      return;
    }

    console.log(`✅ Found ${data.length} class(es) in database:\n`);
    
    data.forEach((cls, index) => {
      console.log(`${index + 1}. ${cls.class_name}`);
      console.log(`   - ID: ${cls.id}`);
      console.log(`   - Max Students: ${cls.max_students}`);
      console.log(`   - Current Students: ${cls.current_students}`);
      console.log(`   - Subjects: ${cls.subjects || 'None'}`);
      console.log(`   - Created: ${cls.created_at}`);
      console.log('');
    });

  } catch (err) {
    console.error('❌ Exception:', err.message);
  }
}

checkClasses();
