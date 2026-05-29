import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://yqgjekjsggpzzxjuzpvt.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlxZ2pla2pzZ2dwenp4anV6cHZ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2MTA4MjMsImV4cCI6MjA5MDE4NjgyM30.WTkBf-fVlsAfIZe8HO_BUQDu4Y4Tn-ZiyvvWN2Euv9c';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testExactScenario() {
  try {
    console.log('=== TESTING EXACT USER SCENARIO ===\n');

    // Step 1: Get all students in 10a
    console.log('Step 1: Get class 10a students');
    const { data: allStudents } = await supabase
      .from('users')
      .select('id, name, class')
      .eq('role', 'student');

    const classStudents = allStudents?.filter(s => s.class?.toLowerCase() === '10a') || [];
    console.log(`Found ${classStudents.length} students in 10a\n`);

    // Step 2: Get all marks (like getMarksByClass does)
    console.log('Step 2: Get marks for class 10a');
    const { data: rawMarks } = await supabase
      .from('marks')
      .select('*,student:student_id(id,name,class,register_no)')
      .order('created_at', { ascending: false });

    const classMarks = rawMarks?.filter(m => m.student?.class?.toLowerCase() === '10a') || [];
    console.log(`Found ${classMarks.length} marks for class 10a:`);
    classMarks.forEach(m => {
      console.log(`  - ${m.student?.name} | ${m.subject} | exam:"${m.exam_name}" | ${m.marks}/${m.total}`);
    });

    // Step 3: Get exams
    console.log('\nStep 3: Get exams for class 10a');
    const { data: exams } = await supabase
      .from('exams')
      .select('*')
      .eq('class_name', '10a');

    console.log(`Found ${exams?.length} exams:`);
    exams?.forEach(e => {
      console.log(`  - "${e.exam_name}"`);
    });

    // Step 4: Simulate user actions
    console.log('\n=== SIMULATING USER ACTIONS ===\n');

    const raja = classStudents.find(s => s.name.toLowerCase().includes('raja'));
    if (!raja) {
      console.log('❌ Raja not found');
      return;
    }

    console.log(`User selects: STUDENT = ${raja.name}`);
    const marksForRaja = classMarks.filter(m => m.student_id === raja.id);
    console.log(`Result: Found ${marksForRaja.length} marks for Raja`);
    marksForRaja.forEach(m => {
      console.log(`  - Subject: "${m.subject}", Exam: "${m.exam_name}", Marks: ${m.marks}`);
    });

    console.log(`\nUser selects: SUBJECT = "telugu"`);
    const rajaTeluguMarks = marksForRaja.filter(m => m.subject.toLowerCase() === 'telugu');
    console.log(`Result: Found ${rajaTeluguMarks.length} marks`);

    console.log(`\nUser selects: EXAM from dropdown`);
    const faExam = exams?.find(e => e.exam_name === 'fa');
    if (!faExam) {
      console.log('❌ Exam "fa" not found!');
      return;
    }
    console.log(`Selected exam: "${faExam.exam_name}"`);

    // Step 5: THE MATCHING LOGIC
    console.log('\n=== MATCHING LOGIC (Component does this) ===\n');
    
    const searchFor = {
      student_id: raja.id,
      exam_name: faExam.exam_name,  // This should be "fa"
      subject: 'telugu'
    };

    console.log('Searching for:');
    console.log(`  student_id: "${searchFor.student_id}"`);
    console.log(`  exam_name: "${searchFor.exam_name}"`);
    console.log(`  subject: "${searchFor.subject}"`);
    console.log('');

    console.log('Checking marks in classMarks array:');
    let found = false;
    classMarks.forEach((m, idx) => {
      const studentMatch = m.student_id === searchFor.student_id;
      const examMatch = m.exam_name === searchFor.exam_name;
      const subjectMatch = m.subject.toLowerCase() === searchFor.subject.toLowerCase();
      const allMatch = studentMatch && examMatch && subjectMatch;

      if (m.student_id === raja.id) {  // Only show Raja's marks
        console.log(`Mark ${idx}:`);
        console.log(`  student_id: "${m.student_id}" === "${searchFor.student_id}" ? ${studentMatch}`);
        console.log(`  exam_name: "${m.exam_name}" === "${searchFor.exam_name}" ? ${examMatch}`);
        console.log(`  subject: "${m.subject}" === "${searchFor.subject}" ? ${subjectMatch}`);
        console.log(`  ➜ MATCH: ${allMatch ? '✅ YES' : '❌ NO'}`);
        console.log('');
        
        if (allMatch) found = true;
      }
    });

    if (found) {
      console.log('✅ SUCCESS: Should show ORANGE box');
      const existingMark = classMarks.find(m =>
        m.student_id === searchFor.student_id &&
        m.exam_name === searchFor.exam_name &&
        m.subject.toLowerCase() === searchFor.subject.toLowerCase()
      );
      if (existingMark) {
        console.log(`Displaying: "${existingMark.subject}" • "${existingMark.exam_name}" = ${existingMark.marks}/${existingMark.total}`);
      }
    } else {
      console.log('❌ FAILURE: Would show BLUE box (no match found)');
      console.log('\nDEBUG INFO:');
      const rajaMarks = classMarks.filter(m => m.student_id === raja.id);
      console.log(`Raja has ${rajaMarks.length} marks:`);
      rajaMarks.forEach(m => {
        console.log(`  - exam_name="${m.exam_name}"`);
      });
      console.log(`Looking for: exam_name="${searchFor.exam_name}"`);
    }

  } catch (error) {
    console.error('Error:', error.message);
  }
}

testExactScenario();
