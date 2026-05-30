// Test Supabase connection and setup demo users
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Read .env.local file
const envPath = path.join(process.cwd(), '.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');
const envVars = {};

envContent.split('\n').forEach(line => {
  const [key, value] = line.split('=');
  if (key && value) {
    envVars[key.trim()] = value.trim();
  }
});

const supabaseUrl = envVars.VITE_SUPABASE_URL;
const supabaseAnonKey = envVars.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  process.exit(1);
}

console.log('🔗 Connecting to Supabase...');
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function setupDemo() {
  try {
    // Test connection
    console.log('📡 Testing connection to Supabase...');
    const { data: testData, error: testError } = await supabase
      .from('users')
      .select('count', { count: 'exact' });

    if (testError) {
      console.error('❌ Connection failed:', testError.message);
      return;
    }

    console.log('✅ Connected to Supabase!');

    // Delete existing demo users
    console.log('\n🗑️  Removing old demo users...');
    const { error: deleteError } = await supabase
      .from('users')
      .delete()
      .in('register_no', ['admin', 'teacher1', 'TEASBPS0001', 'student1']);

    if (deleteError) {
      console.warn('⚠️  Warning (safe to ignore):', deleteError.message);
    }

    // Insert demo users
    console.log('➕ Inserting demo users...');
    const demoUsers = [
      { register_no: 'admin', password: 'admin', role: 'admin', name: 'Admin User', class: null, first_login: false },
      { register_no: 'TEASBPS0001', password: 'welcome', role: 'teacher', name: 'John Teacher', class: null, first_login: false },
      { register_no: 'student1', password: 'student1', role: 'student', name: 'Alex Student', class: 'Class 10A', first_login: false },
    ];

    const { error: insertError } = await supabase
      .from('users')
      .insert(demoUsers);

    if (insertError) {
      console.error('❌ Insert failed:', insertError.message);
      return;
    }

    console.log('✅ Demo users created!');

    // Verify
    console.log('\n📋 Verifying users...');
    const { data: users, error: selectError } = await supabase
      .from('users')
      .select('register_no, role, name');

    if (selectError) {
      console.error('❌ Verification failed:', selectError.message);
      return;
    }

    console.log('✅ Users in database:');
    users.forEach(user => {
      console.log(`   • ${user.register_no} (${user.role}) - ${user.name}`);
    });

    console.log('\n🎉 Setup complete!');
    console.log('\nYou can now login with:');
    console.log('   Admin:    admin / admin');
    console.log('   Teacher:  TEASBPS0001 / welcome');
    console.log('   Student:  student1 / student1');
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

setupDemo();
