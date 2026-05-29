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

(async () => {
  const { data: marks, error } = await supabase.from('marks').select('id, exam_name, subject, marks, total, created_at');
  
  if (error) {
    console.log('Error:', error.message);
    return;
  }
  
  console.log('EXAM NAMES STORED IN MARKS TABLE:\n');
  
  // Get unique exam names
  const uniqueExamNames = [...new Set(marks.map(m => m.exam_name))];
  console.log('Unique exam_name values:', uniqueExamNames);
  console.log('');
  
  // Show first 10 marks
  console.log('Recent marks:');
  marks.slice(0, 10).forEach((mark, i) => {
    console.log(`${i + 1}. exam_name: "${mark.exam_name}" | subject: "${mark.subject}" | marks: ${mark.marks}/${mark.total}`);
  });
})();
