import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://pvpklvzsrcfbvdltqvvg.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB2cGtsdnpzcmNmYnZkbHRxdnZnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MDk0NzMyMDgsImV4cCI6MjAyNTA0MzIwOH0.nqPB5tVJvHkSXdE3s6KmL7yXxFqF9mIY6rDqhXvNpKw";

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkStudentFeeData() {
  console.log("🔍 Checking student fee data for janu and raja\n");

  try {
    // Get student data
    const { data: students, error } = await supabase
      .from("users")
      .select("id, register_no, name, class, initial_fee, current_fee, status")
      .in("name", ["janu", "raja"]);

    if (error) {
      console.log("❌ Error:", error.message);
      return;
    }

    console.log("📋 Student Data from users table:");
    students.forEach((s) => {
      console.log(`\n👤 ${s.name} (${s.register_no})`);
      console.log(`   ID: ${s.id}`);
      console.log(`   Class: ${s.class}`);
      console.log(`   Status: ${s.status}`);
      console.log(`   Initial Fee: ₹${s.initial_fee || 0}`);
      console.log(`   Current Fee: ₹${s.current_fee || "NOT SET ❌"}`);
    });

    // Check fees table
    console.log("\n\n📊 Checking fees table for these students:");
    const studentIds = students.map((s) => s.id);
    const { data: fees } = await supabase
      .from("fees")
      .select("id, student_id, month, year, total_amount, paid_amount, status")
      .in("student_id", studentIds);

    console.log(`\nFee Records Found: ${fees.length}`);
    if (fees.length > 0) {
      fees.forEach((f) => {
        const student = students.find((s) => s.id === f.student_id);
        console.log(
          `   ${student.name}: ${f.month}/${f.year} - ₹${f.total_amount} (${f.status})`
        );
      });
    } else {
      console.log("   ❌ No fee records found in fees table");
    }

    // Summary
    console.log("\n" + "=".repeat(60));
    console.log("🔧 SOLUTION:");
    console.log("=".repeat(60));

    const needsCurrentFee = students.filter((s) => !s.current_fee || s.current_fee === 0);
    if (needsCurrentFee.length > 0) {
      console.log(
        `\n⚠️ ${needsCurrentFee.length} student(s) missing current_fee:`
      );
      needsCurrentFee.forEach((s) => {
        console.log(
          `   - ${s.name}: Set current_fee to ${s.initial_fee || "50000"}`
        );
      });
      console.log("\nTo fix, run this SQL:");
      needsCurrentFee.forEach((s) => {
        const fee = s.initial_fee || 50000;
        console.log(`UPDATE users SET current_fee = ${fee} WHERE id = '${s.id}';`);
      });
    }
  } catch (error) {
    console.error("❌ Error:", error.message);
  }
}

checkStudentFeeData();
