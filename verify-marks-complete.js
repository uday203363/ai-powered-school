import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://yqgjekjsggpzzxjuzpvt.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlxZ2pla2pzZ2dwenp4anV6cHZ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2MTA4MjMsImV4cCI6MjA5MDE4NjgyM30.WTkBf-fVlsAfIZe8HO_BUQDu4Y4Tn-ZiyvvWN2Euv9c';

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyMarksData() {
  try {
    console.log('=== COMPREHENSIVE MARKS VERIFICATION ===\n');

    // 1. Get raja's student data
    console.log('1️⃣  Getting Raja student data...');
    const { data: rajastudents } = await supabase
      .from('users')
      .select('id, name, class, register_no')
      .eq('role', 'student')
      .ilike('name', 'raja');

    if (!rajastudents || rajastudents.length === 0) {
      console.log('❌ Raja not found');
      return;
    }

    const raja = rajastudents[0];
    console.log(`✓ Found Raja: ${raja.name}, Class: ${raja.class}, ID: ${raja.id}\n`);

    // 2. Get all marks for the class (what component loads)
    console.log('2️⃣  Getting marks for class 10a (simulating getMarksByClass)...');
    const { data: allStudents } = await supabase
      .from('users')
      .select('id')
      .eq('role', 'student');

    const classStudents = allStudents?.filter(s => {
      // This is what the backend does
      return true; // Just get all, we'll filter in code
    }) || [];

    // Get marks like the service does
    const { data: allMarks } = await supabase
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

    // Filter for 10a like the service does
    const classMarks = allMarks?.filter(m => 
      m.student?.class?.toLowerCase() === '10a'
    ) || [];

    console.log(`Found ${classMarks.length} marks for class 10a:`);
    classMarks.forEach(m => {
      console.log(`  - Student: ${m.student?.name}, Subject: ${m.subject}, Exam: ${m.exam_name}, Marks: ${m.marks}/${m.total}`);
    });

    // 3. Get exams for 10a
    console.log('\n3️⃣  Getting exams for class 10a...');
    const { data: exams } = await supabase
      .from('exams')
      .select('*')
      .eq('class_name', '10a');

    console.log(`Found ${exams?.length || 0} exams:`);
    exams?.forEach(e => {
      console.log(`  - ${e.exam_name} (Number: ${e.exam_number}, Assessment: ${e.assessment_type})`);
    });

    // 4. Test matching logic
    console.log('\n4️⃣  TESTING MATCHING LOGIC (what component does):\n');
    
    // Simulate user selecting Raja, telugu, fa
    const selectedStudentId = raja.id;
    const selectedSubject = 'telugu';
    const selectedExamName = 'fa';

    console.log(`User selects:`);
    console.log(`  Student: ${raja.name}`);
    console.log(`  Subject: ${selectedSubject}`);
    console.log(`  Exam Name (from dropdown): ${selectedExamName}`);
    console.log('');

    // Step 1: When student is selected (filter marks by student_id)
    console.log('Step 1️⃣  - Student selected (filtering marks by student_id):');
    const marksForStudent = classMarks.filter(m => m.student_id === selectedStudentId);
    console.log(`  Found ${marksForStudent.length} marks for student:`);
    marksForStudent.forEach(m => {
      console.log(`    - ${m.subject}, ${m.exam_name}, ${m.marks}/${m.total}`);
    });

    // Step 2: When all three are selected (search for exact combination)
    console.log('\nStep 2️⃣  - All three selected (searching for student + exam + subject):');
    const searchCriteria = {
      student_id: selectedStudentId,
      exam_name: selectedExamName,
      subject: selectedSubject
    };
    
    console.log(`  Searching for:`);
    console.log(`    student_id: ${searchCriteria.student_id}`);
    console.log(`    exam_name: "${searchCriteria.exam_name}"`);
    console.log(`    subject: "${searchCriteria.subject}"`);
    console.log('');

    const existingMark = classMarks.find(m =>
      m.student_id === searchCriteria.student_id &&
      m.exam_name === searchCriteria.exam_name &&
      m.subject.toLowerCase() === searchCriteria.subject.toLowerCase()
    );

    if (existingMark) {
      console.log('✅ MATCH FOUND!');
      console.log(`  Exam Name: "${existingMark.exam_name}"`);
      console.log(`  Subject: "${existingMark.subject}"`);
      console.log(`  Marks: ${existingMark.marks}/${existingMark.total}`);
      console.log(`  Status: Should show ORANGE box with existing marks`);
    } else {
      console.log('❌ NO MATCH FOUND');
      console.log(`  Status: Will show BLUE box "No marks found"`);
      console.log('');
      console.log('  Debug - comparing each mark:');
      marksForStudent.forEach(m => {
        console.log(`    Mark: id=${m.student_id}, exam="${m.exam_name}", subject="${m.subject}"`);
        console.log(`      ✓ student_id match: ${m.student_id === selectedStudentId}`);
        console.log(`      ✓ exam_name match: "${m.exam_name}" === "${selectedExamName}" = ${m.exam_name === selectedExamName}`);
        console.log(`      ✓ subject match: "${m.subject.toLowerCase()}" === "${selectedSubject.toLowerCase()}" = ${m.subject.toLowerCase() === selectedSubject.toLowerCase()}`);
        console.log('');
      });
    }

    // 5. Check database state
    console.log('\n5️⃣  DATABASE STATE CHECK:\n');
    console.log('Raw marks from database for Raja:');
    const { data: rajaRawMarks } = await supabase
      .from('marks')
      .select('*')
      .eq('student_id', raja.id);

    rajaRawMarks?.forEach(m => {
      console.log(`  ID: ${m.id}`);
      console.log(`  Student ID: ${m.student_id}`);
      console.log(`  Exam Name: "${m.exam_name}" (length: ${m.exam_name?.length})`);
      console.log(`  Subject: "${m.subject}" (length: ${m.subject?.length})`);
      console.log(`  Assessment Type: ${m.assessment_type}`);
      console.log('');
    });

  } catch (error) {
    console.error('Error:', error.message);
  }
}

verifyMarksData();
