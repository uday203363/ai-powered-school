import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://yqgjekjsggpzzxjuzpvt.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInJlZiI6InlxZ2pla2pzZ2dwenp4anV6cHZ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2MTA4MjMsImV4cCI6MjA5MDE4NjgyM30.WTkBf-fVlsAfIZe8HO_BUQDu4Y4Tn-ZiyvvWN2Euv9c';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkOldExamNames() {
  console.log('=== CHECKING FOR OLD EXAM NAME FORMAT ===\n');
  
  try {
    // Get Raja
    const { data: students, error: studentError } = await supabase
      .from('users')
      .select('*')
      .eq('role', 'student')
      .eq('class', '10a');
    
    if (studentError || !students || students.length === 0) {
      console.log('❌ Error fetching students:', studentError);
      process.exit(1);
    }
    
    const raja = students.find(s => s.name.toLowerCase() === 'raja');
    
    if (!raja) {
      console.log('❌ Raja not found');
      process.exit(1);
    }
    
    console.log(`Found Raja: ${raja.name}\n`);
    
    // Get all marks for Raja
    const { data: rajaMarks, error: marksError } = await supabase
      .from('marks')
      .select('*')
      .eq('student_id', raja.id);
    
    if (marksError || !rajaMarks) {
      console.log('❌ Error fetching marks:', marksError);
      process.exit(1);
    }
    
    console.log(`Raja has ${rajaMarks.length} marks:\n`);
    
    rajaMarks.forEach((m, idx) => {
      console.log(`Mark ${idx + 1}:`);
      console.log(`  exam_name: "${m.exam_name}"`);
      console.log(`  subject: "${m.subject}"`);
      console.log(`  marks: ${m.marks}/${m.total}`);
      
      // Check format
      if (m.exam_name === 'fa') {
        console.log(`  ✅ Format: "fa" (correct)`);
      } else if (m.exam_name.startsWith('fa-')) {
        console.log(`  ⚠️  Format: "fa-1" or "fa-X" (OLD FORMAT - needs update!)`);
      } else {
        console.log(`  ❌ Format: "${m.exam_name}" (unknown format)`);
      }
      console.log('');
    });
    
    // Check for marks with "fa-" pattern
    console.log('\n=== SCANNING ALL MARKS FOR OLD FORMAT ===');
    const { data: allMarks, error: allError } = await supabase
      .from('marks')
      .select('*');
    
    if (allError || !allMarks) {
      console.log('❌ Error fetching all marks:', allError);
      process.exit(1);
    }
    
    const oldFormatMarks = allMarks.filter(m => m.exam_name?.includes('-'));
    const newFormatMarks = allMarks.filter(m => m.exam_name === 'fa');
    
    console.log(`Total marks: ${allMarks.length}`);
    console.log(`  - With new format "fa": ${newFormatMarks.length}`);
    console.log(`  - With old format "fa-X": ${oldFormatMarks.length}`);
    
    if (oldFormatMarks.length > 0) {
      console.log('\n⚠️  FOUND MARKS WITH OLD FORMAT!');
      console.log('Sample:');
      oldFormatMarks.slice(0, 3).forEach(m => {
        console.log(`  - exam_name: "${m.exam_name}" | subject: "${m.subject}" | marks: ${m.marks}/${m.total}`);
      });
    } else {
      console.log('\n✅ All marks use new format "fa"');
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
  
  process.exit(0);
}

checkOldExamNames();
