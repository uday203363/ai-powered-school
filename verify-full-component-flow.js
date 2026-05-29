import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://yqgjekjsggpzzxjuzpvt.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlxZ2pla2pzZ2dwenp4anV6cHZ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2MTA4MjMsImV4cCI6MjA5MDE4NjgyM30.WTkBf-fVlsAfIZe8HO_BUQDu4Y4Tn-ZiyvvWN2Euv9c';

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyFullFlow() {
  try {
    console.log('=== COMPREHENSIVE VERIFICATION ===\n');

    // Get Raja
    const { data: students } = await supabase
      .from('users')
      .select('id, name, class')
      .eq('role', 'student')
      .ilike('name', 'raja');

    if (!students || students.length === 0) {
      console.log('❌ Raja not found');
      return;
    }

    const raja = students[0];
    console.log(`✓ Found: ${raja.name}, Class: ${raja.class}, ID: ${raja.id}\n`);

    // STEP 1: Component loads - calls loadData
    console.log('STEP 1️⃣: COMPONENT LOADS (loadData called)\n');
    const marksResult = await supabase
      .from('marks')
      .select(`
        *,
        student:student_id (
          id,
          name,
          register_no,
          class
        )
      `)
      .order('created_at', { ascending: false });

    let initialMarks = marksResult.data || [];
    const classMarks = initialMarks.filter(m => m.student?.class?.toLowerCase() === '10a');
    
    console.log(`Marks loaded by component: ${classMarks.length}`);
    classMarks.forEach(m => {
      console.log(`  - ${m.student?.name} | ${m.subject} | "${m.exam_name}" | ${m.marks}/${m.total}`);
    });

    // Get exams
    const { data: exams } = await supabase
      .from('exams')
      .select('*')
      .eq('class_name', '10a');

    console.log(`\nExams loaded: ${exams?.length}`);
    exams?.forEach(e => {
      console.log(`  - "${e.exam_name}"`);
    });

    // STEP 2: Modal opens
    console.log('\n\nSTEP 2️⃣: ADD MARKS MODAL OPENS\n');
    console.log('Form reset:');
    console.log('  student_id: ""');
    console.log('  subject: ""');
    console.log('  exam_name: ""');

    // STEP 3: User selects student
    console.log('\n\nSTEP 3️⃣: USER SELECTS STUDENT = "raja"\n');
    console.log('Student onChange handler called:');
    console.log('  → Reload fresh marks from getMarksByClass()');
    
    const freshMarksResult = await supabase
      .from('marks')
      .select(`
        *,
        student:student_id (
          id,
          name,
          register_no,
          class
        )
      `)
      .order('created_at', { ascending: false });

    let freshMarks = freshMarksResult.data || [];
    const freshClassMarks = freshMarks.filter(m => m.student?.class?.toLowerCase() === '10a');
    
    console.log(`\n✓ Fresh marks returned: ${freshClassMarks.length}`);
    freshClassMarks.forEach(m => {
      console.log(`  - ${m.student?.name} | ${m.subject} | "${m.exam_name}" | ${m.marks}/${m.total}`);
    });

    // Filter for Raja
    const rajaMarks = freshClassMarks.filter(m => m.student_id === raja.id);
    console.log(`\n✓ Marks for Raja: ${rajaMarks.length}`);
    rajaMarks.forEach(m => {
      console.log(`  - ${m.subject} | "${m.exam_name}" | ${m.marks}/${m.total}`);
    });

    // STEP 4: User selects subject
    console.log('\n\nSTEP 4️⃣: USER SELECTS SUBJECT = "telugu"\n');
    console.log('Form updated: { student_id: raja_id, subject: "telugu" }');
    console.log('Marks state contains: fresh marks from step 3');

    // STEP 5: User selects exam
    console.log('\n\nSTEP 5️⃣: USER SELECTS EXAM = "fa"\n');
    console.log('Exam onChange handler:');
    console.log('  exam_name set to: "fa"');
    console.log('  Form now: { student_id, subject: "telugu", exam_name: "fa" }');

    // STEP 6: Component renders matching logic
    console.log('\n\nSTEP 6️⃣: RENDER MATCHING SECTION (all three fields selected)\n');
    console.log('Matching code runs:');
    console.log(`  const marks = [... ${freshClassMarks.length} marks from state ...]`);
    console.log('  marks.find(m => ');
    console.log(`    m.student_id === "${raja.id}" &&`);
    console.log(`    m.exam_name === "fa" &&`);
    console.log(`    m.subject.toLowerCase() === "telugu"`);
    console.log('  )');

    const existingMark = freshClassMarks.find(m =>
      m.student_id === raja.id &&
      m.exam_name === 'fa' &&
      m.subject.toLowerCase() === 'telugu'
    );

    console.log('\nMatching Result:');
    if (existingMark) {
      console.log(`✅ FOUND!`);
      console.log(`  student_id: ${existingMark.student_id} ✓`);
      console.log(`  exam_name: "${existingMark.exam_name}" ✓`);
      console.log(`  subject: "${existingMark.subject}" ✓`);
      console.log(`  marks: ${existingMark.marks}/${existingMark.total}`);
      console.log('\n📊 SHOULD SHOW ORANGE BOX:');
      console.log(`  ⚠️ Marks Already Entered for This Combination`);
      console.log(`  ${existingMark.subject} • fa-1 (2025-2026)`);
      console.log(`  ${existingMark.marks}/${existingMark.total} (${((existingMark.marks / existingMark.total) * 100).toFixed(1)}%)`);
    } else {
      console.log(`❌ NOT FOUND`);
      console.log('\n❌ WOULD SHOW BLUE BOX (WRONG!):');
      console.log(`  ✓ No marks found for this combination`);
      
      // Debug why
      console.log('\n\nDEBUG WHY NO MATCH:');
      console.log('Checking each mark:');
      freshClassMarks.forEach(m => {
        if (m.student_id === raja.id) {
          console.log(`  Mark: ${m.subject} | "${m.exam_name}"`);
          console.log(`    student match: ${m.student_id === raja.id}`);
          console.log(`    exam match: "${m.exam_name}" === "fa" ? ${m.exam_name === 'fa'}`);
          console.log(`    subject match: "${m.subject.toLowerCase()}" === "telugu" ? ${m.subject.toLowerCase() === 'telugu'}`);
          console.log(`    ALL MATCH: ${m.student_id === raja.id && m.exam_name === 'fa' && m.subject.toLowerCase() === 'telugu'}`);
        }
      });
    }

  } catch (error) {
    console.error('Error:', error.message);
  }
}

verifyFullFlow();
