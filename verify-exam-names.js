import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://yqgjekjsggpzzxjuzpvt.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlxZ2pla2pzZ2dwenp4anV6cHZ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2MTA4MjMsImV4cCI6MjA5MDE4NjgyM30.WTkBf-fVlsAfIZe8HO_BUQDu4Y4Tn-ZiyvvWN2Euv9c';

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyExamNames() {
  console.log('=== EXAM NAME VERIFICATION ===\n');
  
  try {
    // STEP 1: Get all exams for class 10a
    console.log('STEP 1: Exams Table (class 10a)');
    const { data: exams } = await supabase
      .from('exams')
      .select('*')
      .eq('class_name', '10a');
    
    console.log(`Found ${exams.length} exams:`);
    exams.forEach(e => {
      console.log(`  - exam_name: "${e.exam_name}" (type: ${typeof e.exam_name}, length: ${e.exam_name.length})`);
      console.log(`    - exam_number: ${e.exam_number}`);
      console.log(`    - year: ${e.year}`);
      console.log(`    - id: ${e.id.substring(0, 8)}...`);
    });
    
    // STEP 2: Get all marks and check exam_name field
    console.log('\n\nSTEP 2: Marks Table - All exam_name Values');
    const { data: marks } = await supabase
      .from('marks')
      .select('*');
    
    if (!marks || marks.length === 0) {
      console.log('No marks found');
      process.exit(1);
    }
    
    const uniqueExamNames = new Set(marks.map(m => m.exam_name));
    
    console.log(`Found ${marks.length} total marks with ${uniqueExamNames.size} unique exam_name values:`);
    uniqueExamNames.forEach(name => {
      console.log(`  - exam_name: "${name}" (type: ${typeof name}, length: ${name.length})`);
      console.log(`    Count: ${marks.filter(m => m.exam_name === name).length} marks`);
    });
    
    // STEP 3: Comparison
    console.log('\n\nSTEP 3: Comparison - Exams vs Marks');
    exams.forEach(exam => {
      const matchingMarks = marks.filter(m => m.exam_name === exam.exam_name);
      console.log(`Exam: "${exam.exam_name}"`);
      console.log(`  Marks with exact match: ${matchingMarks.length}`);
      
      if (matchingMarks.length === 0) {
        console.log('  ⚠️  NO MATCHING MARKS!');
        console.log('  Similar exam_names in marks:');
        marks.forEach(m => {
          if (m.exam_name?.toLowerCase?.() === exam.exam_name.toLowerCase?.()) {
            console.log(`    - Found: "${m.exam_name}" (case difference!)`);
          }
        });
      }
    });
    
    // STEP 4: Get Raja's marks specifically
    console.log('\n\nSTEP 4: Raja\'s Marks - Exam Names');
    const { data: students } = await supabase
      .from('users')
      .select('*')
      .eq('role', 'student')
      .eq('class', '10a');
    
    const raja = students.find(s => s.name.toLowerCase() === 'raja');
    if (raja) {
      const { data: rajaMarks } = await supabase
        .from('marks')
        .select('*')
        .eq('student_id', raja.id);
      
      console.log(`Raja's marks:`);
      rajaMarks.forEach(m => {
        const matchingExam = exams.find(e => e.exam_name === m.exam_name);
        console.log(`  - exam_name: "${m.exam_name}" | subject: "${m.subject}" | marks: ${m.marks}/${m.total}`);
        console.log(`    Matches exam in exams table: ${matchingExam ? '✅ YES' : '❌ NO'}`);
      });
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
  
  process.exit(0);
}

verifyExamNames();
