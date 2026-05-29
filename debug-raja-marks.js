import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Read .env.local
const envPath = path.resolve('.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const [key, value] = line.split('=');
  if (key && value) {
    env[key.trim()] = value.trim();
  }
});

const supabase = createClient(
  env.VITE_SUPABASE_URL,
  env.VITE_SUPABASE_ANON_KEY
);

async function debugRajaMarks() {
  try {
    // Get Raja's student ID and class
    const { data: students } = await supabase
      .from('users')
      .select('id, name, class')
      .ilike('name', '%raja%');

    if (!students || students.length === 0) {
      console.log('❌ Raja not found in users table');
      return;
    }

    const raja = students[0];
    console.log('✓ Found Raja:', { id: raja.id.substring(0, 8) + '...', name: raja.name, class: raja.class });
    console.log('');

    // Get all marks for Raja
    const { data: rajaMarks } = await supabase
      .from('marks')
      .select('id, student_id, exam_name, subject, marks, total, created_at')
      .eq('student_id', raja.id);

    console.log(`✓ Raja's Marks in Database (${rajaMarks.length}):`);
    console.log('');
    rajaMarks.forEach((mark, i) => {
      console.log(`${i + 1}. exam_name: "${mark.exam_name}" | subject: "${mark.subject}" | marks: ${mark.marks}/${mark.total}`);
    });
    console.log('');

    // Check for telugu/fa-1 specifically
    const telugu_fa1 = rajaMarks.find(m => m.exam_name === 'fa-1' && m.subject === 'telugu');
    
    if (telugu_fa1) {
      console.log('✅ telugu/fa-1 FOUND:');
      console.log(`   exam_name: "${telugu_fa1.exam_name}"`);
      console.log(`   subject: "${telugu_fa1.subject}"`);
      console.log(`   marks: ${telugu_fa1.marks}/${telugu_fa1.total}`);
    } else {
      console.log('❌ telugu/fa-1 NOT FOUND');
      console.log('');
      console.log('Available combinations:');
      rajaMarks.forEach(m => {
        console.log(`   - ${m.subject}/${m.exam_name}`);
      });
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
  
  process.exit(0);
}

debugRajaMarks();
