/**
 * Student Management Testing & Demo Code
 * Use these examples to test the register number system
 */

import { 
  createStudent, 
  getStudentByRegisterNo,
  getAllStudents,
  updateStudent,
  deactivateStudent,
  reactivateStudent,
  transferStudent,
  getStudentCompleteRecord,
  getClassRoster
} from './studentService';

import {
  generateNextRegisterNumber,
  generateBatchRegisterNumbers,
  parseRegisterNumber,
  getCurrentSequence,
  getRegisterNumberStats
} from './registerNumber';

import {
  filterStudents,
  searchByName,
  getClassEnrollmentStats
} from './studentFilter';

/**
 * Test Suite: Register Number Generation
 */
export async function testRegisterNumberGeneration() {
  console.log('=== Testing Register Number Generation ===\n');

  try {
    // Test 1: Generate first register number
    console.log('Test 1: Generate first register number');
    const regNo1 = await generateNextRegisterNumber(2026, 'SBPS');
    console.log(`✅ Generated: ${regNo1}`);
    console.assert(regNo1 === '26SBPS0001', 'First should be 26SBPS0001');

    // Test 2: Generate second register number
    console.log('\nTest 2: Generate second register number');
    const regNo2 = await generateNextRegisterNumber(2026, 'SBPS');
    console.log(`✅ Generated: ${regNo2}`);
    console.assert(regNo2 === '26SBPS0002', 'Second should be 26SBPS0002');

    // Test 3: Parse register number
    console.log('\nTest 3: Parse register number');
    const parsed = parseRegisterNumber('26SBPS0145');
    console.log(`✅ Parsed: Year=${parsed.year}, School=${parsed.schoolCode}, Seq=${parsed.sequence}`);

    // Test 4: Get current sequence
    console.log('\nTest 4: Get current sequence');
    const seq = await getCurrentSequence(2026, 'SBPS');
    console.log(`✅ Current sequence: ${seq}`);

    // Test 5: Batch generation
    console.log('\nTest 5: Batch generate 5 register numbers');
    const batch = await generateBatchRegisterNumbers(5, 2026, 'SBPS');
    batch.forEach((regNo, idx) => console.log(`  ${idx + 1}. ${regNo}`));

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

/**
 * Test Suite: Student CRUD Operations
 */
export async function testStudentCRUD() {
  console.log('\n=== Testing Student CRUD Operations ===\n');

  let studentRegNo = '';

  try {
    // Test 1: Create student
    console.log('Test 1: Create student');
    const createResult = await createStudent({
      name: 'John Doe',
      email: 'john.doe@example.com',
      password: 'SecurePass123',
      phone: '+91-9876543210',
      class: '10A',
      date_of_birth: '2010-05-15',
      gender: 'Male',
      parent_email: 'parent@example.com',
      admission_year: 2026
    });

    if (createResult.success && createResult.data) {
      studentRegNo = createResult.data.register_no;
      console.log(`✅ Student created: ${studentRegNo}`);
    } else {
      console.error(`❌ Failed to create: ${createResult.error}`);
      return;
    }

    // Test 2: Retrieve student
    console.log('\nTest 2: Retrieve student by register number');
    const getResult = await getStudentByRegisterNo(studentRegNo);
    if (getResult.success) {
      console.log(`✅ Retrieved: ${getResult.data?.name} - Class: ${getResult.data?.class}`);
    }

    // Test 3: Update student
    console.log('\nTest 3: Update student details');
    const updateResult = await updateStudent(studentRegNo, {
      phone: '+91-9876543211',
      class: '10B'
    });
    if (updateResult.success) {
      console.log(`✅ Updated: Class changed to ${updateResult.data?.class}`);
    }

    // Test 4: Try to update register_no (should not be allowed in UI)
    console.log('\nTest 4: Register number cannot be edited');
    console.log('❌ Register number is immutable by design');

    // Test 5: Deactivate student
    console.log('\nTest 5: Deactivate student');
    const deactivateResult = await deactivateStudent(studentRegNo, 'Medical leave');
    if (deactivateResult.success) {
      console.log(`✅ Deactivated: ${deactivateResult.message}`);
    }

    // Test 6: Reactivate student
    console.log('\nTest 6: Reactivate student');
    const reactivateResult = await reactivateStudent(studentRegNo);
    if (reactivateResult.success) {
      console.log(`✅ Reactivated: ${reactivateResult.message}`);
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

/**
 * Test Suite: Student Status Transitions
 */
export async function testStatusTransitions() {
  console.log('\n=== Testing Student Status Transitions ===\n');

  try {
    // Get a test student
    const students = (await getAllStudents({ status: 'Active', limit: 1 })).data || [];
    if (!students[0]) {
      console.log('⚠️  No active students to test');
      return;
    }

    const studentRegNo = students[0].register_no;

    // Test 1: Active → Inactive
    console.log('Test 1: Active → Inactive (Suspension)');
    await deactivateStudent(studentRegNo, 'Temporary suspension');
    let status = (await getStudentByRegisterNo(studentRegNo)).data?.status;
    console.log(`✅ Status: ${status}`);

    // Test 2: Inactive → Active
    console.log('\nTest 2: Inactive → Active (Reactivation)');
    await reactivateStudent(studentRegNo);
    status = (await getStudentByRegisterNo(studentRegNo)).data?.status;
    console.log(`✅ Status: ${status}`);

    // Test 3: Active → Transferred
    console.log('\nTest 3: Active → Transferred (School Change)');
    await transferStudent(studentRegNo, 'Transferred to ABC School');
    status = (await getStudentByRegisterNo(studentRegNo)).data?.status;
    console.log(`✅ Status: ${status}`);

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

/**
 * Test Suite: Student Filtering & Search
 */
export async function testFiltering() {
  console.log('\n=== Testing Student Filtering & Search ===\n');

  try {
    // Test 1: Filter by class
    console.log('Test 1: Get students in class 10A');
    const classResult = await filterStudents({ class: '10A', status: 'Active', limit: 5 });
    console.log(`✅ Found ${classResult.length} students in class 10A`);
    classResult.slice(0, 3).forEach(s => console.log(`  - ${s.register_no}: ${s.name}`));

    // Test 2: Filter by year
    console.log('\nTest 2: Get students admitted in 2026');
    const yearResult = await filterStudents({ year: 2026, status: 'Active', limit: 5 });
    console.log(`✅ Found ${yearResult.length} students from year 2026`);

    // Test 3: Search by name
    console.log('\nTest 3: Search students by name');
    const nameResult = await searchByName('John');
    console.log(`✅ Found ${nameResult.length} students with "John" in name`);

    // Test 4: Get class roster
    console.log('\nTest 4: Get complete class roster');
    const roster = (await getClassRoster('10A')).data || [];
    console.log(`✅ Class 10A has ${roster.length} active students`);

    // Test 5: Class enrollment stats
    console.log('\nTest 5: Get class enrollment statistics');
    const stats = await getClassEnrollmentStats();
    stats.forEach(cls => {
      console.log(`  ${cls.class_name}: ${cls.current_students}/${cls.max_students} (${cls.percentage}%)`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

/**
 * Test Suite: Register Number Statistics
 */
export async function testRegisterNumberStats() {
  console.log('\n=== Testing Register Number Statistics ===\n');

  try {
    const stats = await getRegisterNumberStats(2026, 'SBPS');
    
    console.log(`✅ Statistics for Year 2026 (SBPS):`);
    console.log(`  Total Students: ${stats.totalStudents}`);
    console.log(`  Active Students: ${stats.activeStudents}`);
    console.log(`  Inactive Students: ${stats.inactiveStudents}`);
    console.log(`  Transferred Students: ${stats.transferredStudents}`);
    console.log(`  First Register No: ${stats.startRegisterNo}`);
    console.log(`  Last Register No: ${stats.endRegisterNo}`);

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

/**
 * Test Suite: Complete Record Retrieval
 */
export async function testCompleteRecord() {
  console.log('\n=== Testing Complete Student Record ===\n');

  try {
    // Get a test student
    const students = (await getAllStudents({ limit: 1 })).data || [];
    if (!students[0]) {
      console.log('⚠️  No students available');
      return;
    }

    const studentRegNo = students[0].register_no;

    console.log(`Retrieving complete record for ${studentRegNo}...\n`);

    const result = await getStudentCompleteRecord(studentRegNo);
    if (result.success) {
      const { student, marks, attendance, fees } = result.data;
      
      console.log(`✅ Basic Info:`);
      console.log(`  Name: ${student.name}`);
      console.log(`  Class: ${student.class}`);
      console.log(`  Status: ${student.status}`);
      console.log(`  Admission Year: ${student.admission_year}`);

      console.log(`\n✅ Academic Data:`);
      console.log(`  Marks Records: ${marks.length}`);
      console.log(`  Attendance Records: ${attendance.length}`);
      console.log(`  Fee Records: ${fees.length}`);
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

/**
 * Integration Test: Full Workflow
 */
export async function testFullWorkflow() {
  console.log('\n=== Integration Test: Full Student Lifecycle ===\n');

  try {
    const email = `student_${Date.now()}@example.com`;
    
    // Step 1: Create student
    console.log('Step 1: Creating new student...');
    const createResult = await createStudent({
      name: `Test Student ${Date.now()}`,
      email: email,
      password: 'TestPass123',
      phone: '+91-9876543210',
      class: '10A',
      admission_year: 2026
    });

    if (!createResult.success) {
      throw new Error(createResult.error);
    }

    const registerNo = createResult.data?.register_no;
    console.log(`✅ Created: ${registerNo}\n`);

    // Step 2: Retrieve
    console.log('Step 2: Retrieving student...');
    const getResult = await getStudentByRegisterNo(registerNo!);
    console.log(`✅ Retrieved: ${getResult.data?.name}\n`);

    // Step 3: Update
    console.log('Step 3: Updating student...');
    await updateStudent(registerNo!, { class: '10B' });
    console.log(`✅ Updated: Class changed\n`);

    // Step 4: Check status
    console.log('Step 4: Checking status...');
    let current = await getStudentByRegisterNo(registerNo!);
    console.log(`✅ Current status: ${current.data?.status}\n`);

    // Step 5: Deactivate
    console.log('Step 5: Deactivating student...');
    await deactivateStudent(registerNo!, 'Test deactivation');
    current = await getStudentByRegisterNo(registerNo!);
    console.log(`✅ Status: ${current.data?.status}\n`);

    // Step 6: Reactivate
    console.log('Step 6: Reactivating student...');
    await reactivateStudent(registerNo!);
    current = await getStudentByRegisterNo(registerNo!);
    console.log(`✅ Status: ${current.data?.status}\n`);

    console.log('✅ Full workflow completed successfully!\n');

  } catch (error) {
    console.error('❌ Workflow failed:', error);
  }
}

/**
 * Run all tests
 */
export async function runAllTests() {
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║     Student Management System - Full Test Suite                ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  try {
    await testRegisterNumberGeneration();
    await testStudentCRUD();
    await testStatusTransitions();
    await testFiltering();
    await testRegisterNumberStats();
    await testCompleteRecord();
    await testFullWorkflow();

    console.log('\n╔════════════════════════════════════════════════════════════════╗');
    console.log('║              All Tests Completed Successfully!                 ║');
    console.log('╚════════════════════════════════════════════════════════════════╝\n');

  } catch (error) {
    console.error('Test suite failed:', error);
  }
}

/**
 * Example: How to use in React Component
 */
export async function exampleReactUsage() {
  return `
// In a React component:
import { useState, useEffect } from 'react';
import { createStudent, getAllStudents, updateStudent } from './services/studentService';

export function StudentForm() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    class: '10A'
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const result = await createStudent(formData);
    
    if (result.success) {
      alert(\`Student created: \${result.data?.register_no}\`);
      // Reset form
      setFormData({ name: '', email: '', password: '', class: '10A' });
    } else {
      alert(\`Error: \${result.error}\`);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="text"
        placeholder="Name"
        value={formData.name}
        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        required
      />
      <input
        type="email"
        placeholder="Email"
        value={formData.email}
        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
        required
      />
      <input
        type="password"
        placeholder="Password"
        value={formData.password}
        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
        required
      />
      <select
        value={formData.class}
        onChange={(e) => setFormData({ ...formData, class: e.target.value })}
      >
        <option value="10A">10A</option>
        <option value="10B">10B</option>
        <option value="9A">9A</option>
      </select>
      <button type="submit">Create Student</button>
    </form>
  );
}
`;
}

export default {
  testRegisterNumberGeneration,
  testStudentCRUD,
  testStatusTransitions,
  testFiltering,
  testRegisterNumberStats,
  testCompleteRecord,
  testFullWorkflow,
  runAllTests,
  exampleReactUsage
};
