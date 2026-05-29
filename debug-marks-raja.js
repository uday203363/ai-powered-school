import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://yqgjekjsggpzzxjuzpvt.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlxZ2pla2pzZ2dwenp4anV6cHZ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2MTA4MjMsImV4cCI6MjA5MDE4NjgyM30.WTkBf-fVlsAfIZe8HO_BUQDu4Y4Tn-ZiyvvWN2Euv9c';

const supabase = createClient(supabaseUrl, supabaseKey);

async function debug() {
  try {
    console.log('=== DEBUGGING MARKS ISSUE ===\n');

    // 1. Get ALL students with all details
    console.log('1️⃣  Fetching ALL students...');
    const { data: allStudents } = await supabase
      .from('users')
      .select('id, name, class, register_no, role')
      .eq('role', 'student');

    console.log(`Found ${allStudents?.length || 0} total students`);
    
    // Get unique classes
    const classes = [...new Set(allStudents?.map(s => s.class) || [])];
    console.log(`\nUnique classes in system: ${classes.join(', ')}`);

    // Show first 10 students
    console.log(`\nFirst 10 students:`);
    allStudents?.slice(0, 10).forEach(s => {
      console.log(`  - ${s.name} (Class: "${s.class}")`);
    });

    // Find Raja
    const rajaList = allStudents?.filter(s => s.name.toLowerCase().includes('raja')) || [];
    if (rajaList.length === 0) {
      console.log('\n❌ No student with "raja" in name');
      return;
    }

    console.log(`\n✓ Found ${rajaList.length} student(s) with "raja": ${rajaList.map(r => r.name).join(', ')}`);
    const rajaStudent = rajaList[0];
    console.log(`Using: ${rajaStudent.name} from class "${rajaStudent.class}"`);

    // 2. Get all marks for this student
    console.log(`\n2️⃣  Fetching marks for ${rajaStudent.name}...`);
    const { data: marks } = await supabase
      .from('marks')
      .select('*')
      .eq('student_id', rajaStudent.id);

    console.log(`Found ${marks?.length || 0} marks:`);
    marks?.forEach((mark, idx) => {
      console.log(`\nMark ${idx + 1}:`);
      console.log(`  Subject: "${mark.subject}"`);
      console.log(`  Exam Name: "${mark.exam_name}"`);
      console.log(`  Assessment Type: ${mark.assessment_type}`);
      console.log(`  Marks: ${mark.marks}/${mark.total}`);
    });

    // 3. Get all exams (regardless of class)
    console.log(`\n3️⃣  Fetching ALL exams...`);
    const { data: allExams } = await supabase
      .from('exams')
      .select('*');

    console.log(`Found ${allExams?.length || 0} exams total`);
    console.log(`\nExams for class "${rajaStudent.class}":`);
    const classExams = allExams?.filter(e => e.class_name === rajaStudent.class || e.class_name?.toLowerCase() === rajaStudent.class?.toLowerCase()) || [];
    console.log(`Found ${classExams.length} matching exams:`);
    classExams.forEach((exam, idx) => {
      console.log(`\nExam ${idx + 1}:`);
      console.log(`  Exam Name: "${exam.exam_name}"`);
      console.log(`  Class Name: "${exam.class_name}"`);
      console.log(`  Exam Number: ${exam.exam_number}`);
      console.log(`  Assessment Type: ${exam.assessment_type}`);
    });

    // 4. Test matching logic
    if (marks && marks.length > 0) {
      console.log('\n4️⃣  TESTING MATCH LOGIC...\n');
      const firstMark = marks[0];
      console.log(`First mark data:`);
      console.log(`  Exam Name: "${firstMark.exam_name}"`);
      console.log(`  Subject: "${firstMark.subject}"`);
      console.log(`  Assessment Type: "${firstMark.assessment_type}"`);

      const allExamsList = allExams || [];
      const matchingExam = allExamsList.find(e => e.exam_name === firstMark.exam_name);
      console.log(`\nSearching for exam with name "${firstMark.exam_name}"...`);
      console.log(`Match found: ${matchingExam ? '✓ YES' : '✗ NO'}`);

      if (!matchingExam) {
        console.log(`\n⚠️  ISSUE IDENTIFIED:`);
        console.log(`Marks has: "${firstMark.exam_name}"`);
        console.log(`Available exams: ${allExamsList.map(e => `"${e.exam_name}"`).join(', ')}`);
      }
    }

  } catch (error) {
    console.error('Error:', error.message);
  }
}

debug();
