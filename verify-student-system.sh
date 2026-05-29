#!/bin/bash

# Student Register System - Quick Start Script
# Run this to verify all components are in place

echo "╔════════════════════════════════════════════════════════════╗"
echo "║   Student Register Number System - Installation Verify    ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

check_file() {
  if [ -f "$1" ]; then
    echo -e "${GREEN}✓${NC} $1"
    return 0
  else
    echo -e "${RED}✗${NC} $1 (MISSING)"
    return 1
  fi
}

check_dir() {
  if [ -d "$1" ]; then
    echo -e "${GREEN}✓${NC} $1/"
    return 0
  else
    echo -e "${RED}✗${NC} $1/ (MISSING)"
    return 1
  fi
}

echo "Checking Service Files..."
echo "========================"
check_file "src/services/registerNumber.ts" || exit 1
check_file "src/services/studentService.ts" || exit 1
check_file "src/services/studentFilter.ts" || exit 1
check_file "src/services/studentTestSuite.ts" || exit 1
check_file "src/services/index.ts" || exit 1

echo ""
echo "Checking Documentation..."
echo "========================"
check_file "STUDENT_REGISTER_SYSTEM_README.md" || exit 1
check_file "docs/STUDENT_REGISTER_SYSTEM_DESIGN.md" || exit 1
check_file "docs/STUDENT_MANAGEMENT_IMPLEMENTATION_GUIDE.md" || exit 1
check_file "STUDENT_REGISTER_SYSTEM_DEPLOYMENT_GUIDE.md" || exit 1

echo ""
echo "Checking Database Migration..."
echo "=============================="
check_file "DATABASE_MIGRATION_REGISTER_SYSTEM.sql" || exit 1

echo ""
echo "Checking Git Status..."
echo "===================="
if command -v git &> /dev/null; then
    git status | head -20
else
    echo "Git not found (optional)"
fi

echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo -e "${GREEN}✓ All components verified!${NC}"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""
echo "Next Steps:"
echo "1. Run database migration in Supabase SQL Editor"
echo "   File: DATABASE_MIGRATION_REGISTER_SYSTEM.sql"
echo ""
echo "2. Read quick start guide"
echo "   File: STUDENT_REGISTER_SYSTEM_README.md"
echo ""
echo "3. Run tests"
echo "   npm run test (or in React component)"
echo ""
echo "4. Review implementation guide"
echo "   File: docs/STUDENT_MANAGEMENT_IMPLEMENTATION_GUIDE.md"
echo ""
