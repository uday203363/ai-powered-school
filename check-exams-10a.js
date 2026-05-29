import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const envPath = path.resolve('.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const [key, value] = line.split('=');
  if (key && value) {
    env[key.trim()] = value.trim();
  }
});

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

(async () => {
  const { data: exams } = await supabase
    .from('exams')
    .select('id, exam_name, exam_number, class_name')
    .eq('class_name', '10a');
  
  console.log('EXAMS FOR CLASS 10a:');
  exams.forEach(e => {
    const display = e.exam_number ? `${e.exam_name}-${e.exam_number}` : e.exam_name;
    console.log(`  exam_name: "${e.exam_name}" | exam_number: ${e.exam_number} | Displays as: "${display}"`);
  });
})();
