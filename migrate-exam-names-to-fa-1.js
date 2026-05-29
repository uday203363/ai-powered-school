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
  try {
    // Get all marks with exam_name = "fa"
    const { data: marks, error: fetchError } = await supabase
      .from('marks')
      .select('id, exam_name, subject, marks, total')
      .eq('exam_name', 'fa');

    if (fetchError) {
      console.log('Error fetching marks:', fetchError.message);
      return;
    }

    console.log(`Found ${marks.length} marks with exam_name="fa"`);
    console.log('');

    if (marks.length === 0) {
      console.log('No marks to update');
      return;
    }

    // Update all marks to use "fa-1"
    const { error: updateError } = await supabase
      .from('marks')
      .update({ exam_name: 'fa-1' })
      .eq('exam_name', 'fa');

    if (updateError) {
      console.log('Error updating marks:', updateError.message);
      return;
    }

    console.log(`✅ Successfully updated ${marks.length} marks:`);
    console.log('Changed: exam_name="fa" → exam_name="fa-1"');
    console.log('');

    // Verify the update
    const { data: updatedMarks } = await supabase
      .from('marks')
      .select('id, exam_name, subject, marks, total')
      .eq('exam_name', 'fa-1');

    console.log(`Verification: Now have ${updatedMarks.length} marks with exam_name="fa-1"`);
    console.log('');
    console.log('Recent updated marks:');
    updatedMarks.slice(0, 5).forEach((mark, i) => {
      console.log(`${i + 1}. exam_name: "${mark.exam_name}" | subject: "${mark.subject}" | marks: ${mark.marks}/${mark.total}`);
    });

  } catch (err) {
    console.log('Unexpected error:', err);
  }
})();
