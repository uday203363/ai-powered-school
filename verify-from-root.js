import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://yqgjekjsggpzzxjuzpvt.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlxZ2pla2pzZ2dwenp4anV6cHZ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2MTA4MjMsImV4cCI6MjA5MDE4NjgyM30.WTkBf-fVlsAfIZe8HO_BUQDu4Y4Tn-ZiyvvWN2Euv9c';

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyFromRoot() {
  console.log('=== ROOT LEVEL VERIFICATION ===\n');
  
  try {
    // STEP 1: Get Raja
    console.log('STEP 1: Find Raja in class 10a');
    const { data: students } = await supabase
      .from('users')
      .select('*')
      .eq('role', 'student')
      .eq('class', '10a');
    
    const raja = students?.find(s => s.name.toLowerCase() === 'raja');
    if (!raja) {
      console.log('❌ Raja not found in class 10a');
      process.exit(1);
    }
    
    console.log(`✅ Found Raja: ID=${raja.id.substring(0, 8)}..., Name=${raja.name}`);
    
    // STEP 2: Get all marks for Raja
    console.log('\n\nSTEP 2: Get All Marks for Raja from Database');
    const { data: rajaMarks, error: marksError } = await supabase
      .from('marks')
      .select('*')
      .eq('student_id', raja.id);
    
    if (marksError) {
      console.error('❌ Error fetching marks:', marksError);
      process.exit(1);
    }
    
    console.log(`✅ Raja has ${rajaMarks.length} marks in database:`);
    rajaMarks.forEach((m, idx) => {
      console.log(`  ${idx + 1}. subject="${m.subject}" | exam_name="${m.exam_name}" | marks=${m.marks}/${m.total}`);
    });
    
    // STEP 3: Check for telugu/fa
    console.log('\n\nSTEP 3: Look for telugu/fa Combination');
    const teluguFa = rajaMarks.find(m => 
      m.subject.toLowerCase() === 'telugu' && 
      m.exam_name === 'fa'
    );
    
    if (teluguFa) {
      console.log(`✅ FOUND telugu/fa marks: ${teluguFa.marks}/${teluguFa.total}`);
      console.log(`   Full record:`);
      console.log(`   - student_id: ${teluguFa.student_id}`);
      console.log(`   - subject: "${teluguFa.subject}"`);
      console.log(`   - exam_name: "${teluguFa.exam_name}"`);
      console.log(`   - marks: ${teluguFa.marks}`);
      console.log(`   - total: ${teluguFa.total}`);
    } else {
      console.log('❌ NO telugu/fa marks found for Raja!');
    }
    
    // STEP 4: Test component matching logic
    console.log('\n\nSTEP 4: Test Component Matching Logic');
    console.log('Testing: marks.find(m =>');
    console.log(`  m.student_id === ${raja.id.substring(0, 8)}... &&`);
    console.log(`  m.exam_name === "fa" &&`);
    console.log(`  m.subject.toLowerCase() === "telugu"`);
    console.log(')\n');
    
    const match = rajaMarks.find(m =>
      m.student_id === raja.id &&
      m.exam_name === 'fa' &&
      m.subject.toLowerCase() === 'telugu'
    );
    
    if (match) {
      console.log(`✅ MATCH FOUND: ${match.marks}/${match.total}`);
      console.log('   -> ORANGE BOX should display ✓');
    } else {
      console.log('❌ NO MATCH FOUND');
      console.log('   -> BLUE BOX will display ✗');
      
      // Debug
      console.log('\n   Debugging each mark:');
      rajaMarks.forEach((m, idx) => {
        const studentOk = m.student_id === raja.id;
        const examOk = m.exam_name === 'fa';
        const subjectOk = m.subject.toLowerCase() === 'telugu';
        console.log(`   Mark ${idx + 1}: ${m.subject} | ${m.exam_name}`);
        console.log(`     ✓ student_id: ${studentOk ? 'OK' : 'FAIL'}`);
        console.log(`     ✓ exam_name: ${examOk ? 'OK' : 'FAIL'} (got "${m.exam_name}")`);
        console.log(`     ✓ subject: ${subjectOk ? 'OK' : 'FAIL'} (got "${m.subject}")`);
      });
    }
    
    // STEP 5: Check exams
    console.log('\n\nSTEP 5: Check Exams for 10a');
    const { data: exams } = await supabase
      .from('exams')
      .select('*')
      .eq('class_name', '10a');
    
    console.log(`✅ Found ${exams.length} exams:`);
    exams.forEach(e => {
      console.log(`   - exam_name="${e.exam_name}" | exam_number=${e.exam_number} | year=${e.year}`);
    });
    
    // FINAL RESULT
    console.log('\n\n=== VERIFICATION RESULT ===');
    console.log(`Database Mark: ${teluguFa ? '✅ EXISTS' : '❌ MISSING'}`);
    console.log(`Matching Logic: ${match ? '✅ WORKS' : '❌ FAILS'}`);
    console.log(`Expected UI: ${match ? '🟠 ORANGE BOX (Mark Already Entered)' : '🔵 BLUE BOX (Add New)'}`);
    
    if (!match && teluguFa) {
      console.log('\n⚠️  ISSUE: Mark exists but component will not show it!');
      console.log('   Root cause: Matching logic has a bug');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  }
  
  process.exit(0);
}

verifyFromRoot();
