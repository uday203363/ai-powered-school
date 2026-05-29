# Fee Management - Quick Start for Admins

## What Changed?

**Old System:** Students had a fee_status (Paid/Pending/Overdue)
**New System:** Students have specific fee amounts:
- **Initial Fee**: Fee amount when they first joined
- **Current Fee**: Fee amount for their current class (can change when promoted)

## Quick Operations

### Register New Student

1. Click **"Add New Student"** button
2. Fill in student details
3. Enter **"Initial Fee at Joining"** - this is what they pay for this class
4. Click **"Register Student"**

Example:
```
Name: Ram Kumar
Email: ram@school.com
Class: 1A
Initial Fee: ₹50,000
```

**Result:** Student created with initial_fee = ₹50,000 and current_fee = ₹50,000

---

### Edit Student Details

1. Find student in the table
2. Click **Edit** (pencil icon)
3. Change: Name, Email, Phone, Gender, Accommodation
4. Click **"Update Student"**

⚠️ **Note:** To change fees, use the "Promote to Next Class" section below
(Fee changes are only done during class promotions)

---

### Promote Student to Next Class

1. Scroll to **"🎓 Promote Student to Next Class"** section
2. Enter student's **Register Number** (e.g., 26SBPSD0001)
3. Click **Search** button
4. Verify student details appear
5. Select **"New Class for Next Year"**
6. Update **"Current Fee"** if different for new class (optional)
7. Click **"✅ Promote to Next Class"**

**Example 1 - Same Fee:**
```
Student: Ram Kumar (26SBPSD0001)
Current: Class 1A | Fee ₹50,000
→ Promote to: Class 2A | Fee ₹50,000 (no change)
```

**Example 2 - Fee Increase:**
```
Student: Priya Sharma (26SBPSD0002)
Current: Class 1A | Fee ₹45,000
→ Promote to: Class 2A | Fee ₹50,000 (increased by ₹5,000)
```

---

## Important Concepts

### Initial Fee (Joining Fee)
- Set when student first registers
- Never changes automatically
- Historical reference of original fee
- Shows in registration table

### Current Fee (Active Fee)
- Used for current fee tracking
- Can be updated when promoting to next class
- Reflects what student currently owes
- Updated during class promotion

### Fee Payment Status
- Separate from registration (tracked in Fees section)
- Admin/Teacher dashboard shows fee payment status
- Not related to initial_fee or current_fee values

---

## Common Scenarios

### Scenario 1: New Admission
```
Action: Register New Student
Field: "Initial Fee at Joining" = ₹50,000
Result: Both initial_fee and current_fee set to ₹50,000
```

### Scenario 2: Annual Promotion (Same Fees)
```
Action: Promote to Next Class
Current Fee: ₹50,000 → (not changed) → ₹50,000
Result: Only class changes, fees remain same
```

### Scenario 3: Annual Promotion (Fee Increase)
```
Action: Promote to Next Class
Current Fee: ₹50,000 → Changed to ₹55,000 → ₹55,000
Result: Class changes AND current_fee updated
Message: "Ram promoted to 2A with updated fee ₹55,000"
```

### Scenario 4: Student Transfer (Mid-Year)
```
Action: Edit Student → Change Class
Result: Only class changes
Note: This is for mid-year changes without promotion
```

---

## Fee Amount Tables to Reference

Use these before registering or promoting:

### Class-wise Fee Structure
| Class | Fee Amount |
|-------|-----------|
| 1A, 1B | ₹50,000 |
| 2A, 2B | ₹55,000 |
| 3A, 3B | ₹60,000 |
| 4A, 4B | ₹65,000 |
| etc. | |

### Special Cases
| Type | Amount | Notes |
|------|--------|-------|
| Scholarship | Varies | Covered by scholarship policy |
| Hostel | +₹15,000 | Add to base fee if applicable |
| Late Registration | Base + 5% | Applied at registration time |

---

## Visibility: Where Fees Show Up

### 1. Student Table (Registration Tab)
- **Column:** "Initial Fee"
- **Shows:** ₹50,000
- **What it is:** Fee when student joined this class

### 2. Promotion Section
- **Field:** "Updated Current Fee"
- **Current Value:** Pre-filled from student's initial_fee
- **Edit:** Change if fee is different for new class
- **Example:** 50,000 → 55,000 for class promotion

### 3. Student History (Admin Dashboard)
- **Summary Tab:** Shows both initial_fee and current_fee
- **Useful for:** Tracking fee progression over years
- **Report:** Can download student history including fees

---

## Troubleshooting

### Q: Can I change fees without promoting?
**A:** For now, only during promotion. Contact system admin for mid-year adjustments.

### Q: Does changing current fee affect payment status?
**A:** No. Payment status is tracked separately in the Fees section.

### Q: What if I registered with wrong fee?
**A:** 
- Click Edit student
- Current setup doesn't allow fee editing in edit form
- Contact admin to update via promotion or direct database change

### Q: How do I see what students owe?
**A:** Check the Fees section in Admin Dashboard
- Shows total fees due per student
- Separate from initial_fee/current_fee values

### Q: Can I bulk update fees?
**A:** Currently only one at a time. Use promotion for annual bulk updates.

---

## Important Reminders

✅ **DO:**
- Set appropriate initial_fee at registration time
- Use Promotion feature for class changes and fee updates
- Verify fees match agreed rates before registration
- Update current_fee when promoting if fees change

❌ **DON'T:**
- Register without initial_fee
- Assume current_fee stays same during promotion
- Confuse initial_fee with payment status
- Edit student just to change fees (use Promote instead)

---

## Need Help?

1. **Registration Issues:** Check if fee amount is valid number (no symbols, text)
2. **Promotion Issues:** Verify register number format (26SBPSD0001)
3. **Fee Display:** Check Student History tab in Admin Dashboard
4. **Database Issues:** Check if migration ran successfully

Run these in SQL editor to verify:
```sql
-- Check columns exist
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'users' 
AND column_name IN ('initial_fee', 'current_fee');

-- Check sample student
SELECT name, initial_fee, current_fee FROM users
WHERE role = 'student' LIMIT 1;
```

---

**Last Updated:** 2024 | Fee Management System v1.0
