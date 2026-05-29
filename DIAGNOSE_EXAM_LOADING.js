// Diagnostic: Check exam loading and state management
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://pvpklvzsrcfbvdltqvvg.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB2cGtsdnpzcmNmYnZkbHRxdnZnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MDk0NzMyMDgsImV4cCI6MjAyNTA0MzIwOH0.nqPB5tVJvHkSXdE3s6KmL7yXxFqF9mIY6rDqhXvNpKw";

const supabase = createClient(supabaseUrl, supabaseKey);

async function diagnoseExamLoadingIssue() {
  console.log("🔍 DIAGNOSTIC: Exam Loading for Different Students\n");

  try {
    // 1. Get all exams
    console.log("📋 STEP 1: Checking all exams in database");
    const { data: allExams, error: examsError } = await supabase
      .from("exams")
      .select("id, class, exam_name, exam_number, assessment_type, description");

    if (examsError) {
      console.log("❌ Error fetching exams:", examsError.message);
      return;
    }

    console.log(`✅ Total exams found: ${allExams.length}`);
    
    // Group by class
    const examsByClass = {};
    allExams.forEach((exam) => {
      if (!examsByClass[exam.class]) {
        examsByClass[exam.class] = [];
      }
      examsByClass[exam.class].push(exam);
    });

    console.log("\n📚 Exams by Class:");
    Object.entries(examsByClass).forEach(([className, exams]) => {
      console.log(`\n  Class: ${className}`);
      (exams as any[]).forEach((exam) => {
        console.log(`    - ${exam.exam_name} (#${exam.exam_number}) [${exam.assessment_type}]`);
      });
    });

    // 2. Check which classes have students and marks
    console.log("\n\n📊 STEP 2: Checking students and marks per class");
    
    Object.entries(examsByClass).forEach(async ([className]) => {
      const { data: students } = await supabase
        .from("users")
        .select("id, name, register_no, class")
        .eq("class", className)
        .eq("role", "student")
        .eq("status", "Active");

      if (students && students.length > 0) {
        console.log(`\n  Class: ${className} (${students.length} students)`);

        for (const student of students) {
          const { data: studentMarks } = await supabase
            .from("marks")
            .select("id, exam_name, subject")
            .eq("student_id", student.id);

          const markCount = studentMarks?.length || 0;
          console.log(
            `    - ${student.name} (${student.register_no}): ${markCount} marks`
          );
          
          if (markCount > 0) {
            studentMarks.forEach((mark) => {
              console.log(`        📌 ${mark.exam_name} - ${mark.subject}`);
            });
          }
        }
      }
    });

    // 3. Identify the issue
    console.log("\n\n" + "=".repeat(60));
    console.log("🔧 POSSIBLE ISSUES:");
    console.log("=".repeat(60));

    const classesWithoutExams = Object.entries(examsByClass)
      .filter(([, exams]) => (exams as any[]).length === 0);

    if (classesWithoutExams.length > 0) {
      console.log(
        "\n❌ Classes WITHOUT any exams:"
      );
      classesWithoutExams.forEach(([className]) => {
        console.log(`   - ${className}`);
      });
    }

    console.log("\n✅ If exams exist but form still shows warning:");
    console.log("   → Issue: Modal state not being reset properly");
    console.log("   → Solution: Clear form data when modal opens");
    console.log("   → Code location: TeacherMarksPage.tsx - showModal state change");

  } catch (error) {
    console.error("❌ Error:", error.message);
  }
}

diagnoseExamLoadingIssue();
