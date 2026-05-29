// DIAGNOSTIC: Verify if students are loading properly for teachers
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.VITE_SUPABASE_URL || "https://pvpklvzsrcfbvdltqvvg.supabase.co";
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB2cGtsdnpzcmNmYnZkbHRxdnZnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MDk0NzMyMDgsImV4cCI6MjAyNTA0MzIwOH0.nqPB5tVJvHkSXdE3s6KmL7yXxFqF9mIY6rDqhXvNpKw";

const supabase = createClient(supabaseUrl, supabaseKey);

async function diagnoseStudentLoading() {
  console.log("🔍 DIAGNOSTIC: Verifying Student Loading\n");

  try {
    // 1. Check all teachers
    console.log("📋 STEP 1: Finding all teachers with class_teacher_for assigned");
    const { data: teachers, error: teachersError } = await supabase
      .from("users")
      .select("id, register_no, name, email, role, class_teacher_for")
      .eq("role", "teacher")
      .neq("class_teacher_for", null);

    if (teachersError) {
      console.log("❌ Error fetching teachers:", teachersError.message);
      return;
    }

    console.log(`✅ Found ${teachers.length} teachers`);
    teachers.forEach((teacher) => {
      console.log(`   - ${teacher.name} (${teacher.email})`);
      console.log(`     Classes: ${teacher.class_teacher_for}`);
    });

    if (teachers.length === 0) {
      console.log("⚠️ No teachers found with class assignments");
      return;
    }

    // 2. For each teacher, check their assigned classes
    console.log("\n📋 STEP 2: Checking students in each class");
    for (const teacher of teachers) {
      console.log(`\n👨‍🏫 Teacher: ${teacher.name}`);
      const classes = teacher.class_teacher_for.split(",").map((c) => c.trim());

      for (const className of classes) {
        console.log(`\n   📚 Class: ${className}`);

        // Get students in this class
        const { data: students, error: studentError } = await supabase
          .from("users")
          .select("id, register_no, name, class, status, current_fee")
          .eq("class", className)
          .eq("role", "student")
          .eq("status", "Active");

        if (studentError) {
          console.log(`   ❌ Error fetching students: ${studentError.message}`);
          continue;
        }

        console.log(`   ✅ Found ${students.length} active students`);
        if (students.length > 0) {
          students.forEach((student) => {
            console.log(
              `      - ${student.register_no} | ${student.name} | Fee: ₹${student.current_fee || 0}`
            );
          });

          // 3. Check fees for each student
          const studentIds = students.map((s) => s.id);
          const { data: fees, error: feeError } = await supabase
            .from("fees")
            .select("id, student_id, month, year, total_amount, paid_amount, status")
            .in("student_id", studentIds);

          if (feeError) {
            console.log(`   ⚠️ Error fetching fees: ${feeError.message}`);
          } else {
            console.log(
              `   📊 Found ${fees.length} fee records for this class`
            );
            if (fees.length > 0) {
              const feesGrouped = {};
              fees.forEach((f) => {
                const key = `${f.month}/${f.year}`;
                feesGrouped[key] = (feesGrouped[key] || 0) + 1;
              });
              console.log(
                `      Fee breakdown: ${Object.entries(feesGrouped)
                  .map(([date, count]) => `${date} (${count} records)`)
                  .join(", ")}`
              );
            }
          }
        } else {
          console.log(
            `   ⚠️ No active students found in ${className}`
          );
        }
      }
    }

    // 4. Summary
    console.log("\n" + "=".repeat(60));
    console.log("📊 SUMMARY");
    console.log("=".repeat(60));

    // Count total students across all classes
    const { data: allStudents, error: allStudentsError } = await supabase
      .from("users")
      .select("class, role, status")
      .eq("role", "student")
      .eq("status", "Active");

    if (!allStudentsError && allStudents) {
      console.log(`\n✅ Total Active Students: ${allStudents.length}`);

      const byClass = {};
      allStudents.forEach((s) => {
        byClass[s.class] = (byClass[s.class] || 0) + 1;
      });
      console.log("\nBreakdown by class:");
      Object.entries(byClass).forEach(([cls, count]) => {
        console.log(`   - ${cls}: ${count} students`);
      });
    }

    const { data: allFees, error: allFeesError } = await supabase
      .from("fees")
      .select("id");

    if (!allFeesError && allFees) {
      console.log(`\n✅ Total Fee Records: ${allFees.length}`);
    }

    console.log("\n" + "=".repeat(60));
    console.log(
      "✅ DIAGNOSTIC COMPLETE - Check above if students are loading"
    );
    console.log("=".repeat(60));
  } catch (error) {
    console.error("❌ FATAL ERROR:", error.message);
  }
}

diagnoseStudentLoading();
