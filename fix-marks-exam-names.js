import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://yqgjekjsggpzzxjuzpvt.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlxZ2pla2pzZ2dwenp4anV6cHZ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2MTA4MjMsImV4cCI6MjA5MDE4NjgyM30.WTkBf-fVlsAfIZe8HO_BUQDu4Y4Tn-ZiyvvWN2Euv9c';

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixMarksExamNames() {
  try {
    console.log('=== FIXING MARKS EXAM NAMES ===\n');

    // 1. Get all marks with "Assessment " prefix
    console.log('1️⃣  Fetching marks with "Assessment " prefix...');
    const { data: marksToFix } = await supabase
      .from('marks')
      .select('*')
      .like('exam_name', 'Assessment%');

    console.log(`Found ${marksToFix?.length || 0} marks with "Assessment " prefix\n`);

    if (!marksToFix || marksToFix.length === 0) {
      console.log('✓ No marks to fix!');
      return;
    }

    // 2. Update each mark to remove "Assessment " prefix
    console.log('2️⃣  Updating marks...\n');
    let successCount = 0;
    let errorCount = 0;

    for (const mark of marksToFix) {
      const newExamName = mark.exam_name.replace('Assessment ', '').trim();
      console.log(`Updating: "${mark.exam_name}" → "${newExamName}"`);

      const { error } = await supabase
        .from('marks')
        .update({ exam_name: newExamName })
        .eq('id', mark.id);

      if (error) {
        console.error(`  ✗ Error: ${error.message}`);
        errorCount++;
      } else {
        console.log(`  ✓ Updated`);
        successCount++;
      }
    }

    console.log(`\n3️⃣  Summary:`);
    console.log(`  ✓ Successfully updated: ${successCount}`);
    console.log(`  ✗ Errors: ${errorCount}`);
    console.log('\n✅ Migration complete!');

  } catch (error) {
    console.error('Error:', error.message);
  }
}

fixMarksExamNames();
