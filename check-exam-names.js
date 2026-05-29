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
  const { data: exams, error } = await supabase.from('exams').select('id, exam_name, exam_number, class_name, year');
  
  if (error) {
    console.log('Error:', error.message);
    return;
  }
  
  console.log('EXAMS CREATED BY ADMIN:\n');
  exams.forEach((exam, i) => {
    console.log(`${i + 1}. exam_name: "${exam.exam_name}" | exam_number: ${exam.exam_number} | class: ${exam.class_name}`);
  });
})();
