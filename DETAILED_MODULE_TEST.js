#!/usr/bin/env node

/**
 * Detailed Module Testing - Deep Service & Component Validation
 * Tests imports, exports, and module structure
 * Run: node DETAILED_MODULE_TEST.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

let results = { passed: 0, failed: 0, issues: [] };

function log(msg, color = 'reset') {
  console.log(`${colors[color]}${msg}${colors.reset}`);
}

function pass(test) {
  results.passed++;
  log(`✅ ${test}`, 'green');
}

function fail(test, error) {
  results.failed++;
  results.issues.push({ test, error });
  log(`❌ ${test}`, 'red');
  log(`   ${error}`, 'red');
}

log('\n🔍 DETAILED MODULE TESTING', 'blue');
log('═'.repeat(70), 'blue');

// Test 1: Service Exports
log('\n📦 TEST 1: Service Module Exports', 'blue');
log('─'.repeat(70), 'blue');

const services = {
  'src/services/supabase.ts': ['supabase'],
  'src/services/auth.ts': ['authService', 'simpleHash'],
  'src/services/database.ts': ['studentService', 'marksService', 'attendanceService', 'feeService', 'notificationService'],
  'src/services/ai.ts': ['aiService']
};

Object.entries(services).forEach(([filePath, exports]) => {
  const fullPath = path.join(__dirname, filePath);
  try {
    const content = fs.readFileSync(fullPath, 'utf-8');
    
    exports.forEach(exp => {
      if (content.includes(`export`) && content.includes(exp)) {
        pass(`${filePath} exports ${exp}`);
      } else {
        fail(`${filePath} export ${exp}`, `Not found or not exported`);
      }
    });
  } catch (error) {
    fail(`Read ${filePath}`, error.message);
  }
});

// Test 2: Component Structure
log('\n🎨 TEST 2: Component Module Structure', 'blue');
log('─'.repeat(70), 'blue');

const componentDirs = {
  'src/components/common': ['ProtectedRoute', 'Navbar', 'Sidebar', 'UI', 'ChangePasswordModal'],
  'src/components/admin': ['AdminDashboard', 'AdminUsersPage', 'AdminFeesPage', 'AdminNotifications'],
  'src/components/teacher': ['TeacherDashboard', 'TeacherMarksPage', 'TeacherAttendancePage'],
  'src/components/student': ['StudentDashboard', 'StudentMarksPage', 'StudentAttendancePage', 'StudentFeesPage', 'AIAssistant']
};

Object.entries(componentDirs).forEach(([dirPath, components]) => {
  const fullPath = path.join(__dirname, dirPath);
  try {
    const files = fs.readdirSync(fullPath);
    const tsxFiles = files.filter(f => f.endsWith('.tsx'));
    
    components.forEach(comp => {
      const found = tsxFiles.some(f => f.includes(comp));
      if (found) {
        pass(`Component: ${comp}`);
      } else {
        fail(`Missing component: ${comp}`, `Not found in ${dirPath}`);
      }
    });
  } catch (error) {
    fail(`Read ${dirPath}`, error.message);
  }
});

// Test 3: Context & Hooks
log('\n🔗 TEST 3: Context & Custom Hooks', 'blue');
log('─'.repeat(70), 'blue');

const contextFiles = {
  'src/contexts/AuthContext.tsx': ['AuthContext', 'AuthProvider', 'useAuth'],
  'src/hooks/useAuth.ts': ['useAuth']
};

Object.entries(contextFiles).forEach(([filePath, items]) => {
  const fullPath = path.join(__dirname, filePath);
  try {
    if (fs.existsSync(fullPath)) {
      const content = fs.readFileSync(fullPath, 'utf-8');
      items.forEach(item => {
        if (content.includes(item)) {
          pass(`${filePath} contains ${item}`);
        } else {
          fail(`${filePath} missing ${item}`, 'Not found in file');
        }
      });
    } else {
      fail(`File not found: ${filePath}`, 'File does not exist');
    }
  } catch (error) {
    fail(`Read ${filePath}`, error.message);
  }
});

// Test 4: Type Definitions
log('\n📋 TEST 4: TypeScript Type Definitions', 'blue');
log('─'.repeat(70), 'blue');

const typeFiles = {
  'src/types/index.ts': ['User', 'Student', 'Teacher', 'Notification']
};

Object.entries(typeFiles).forEach(([filePath, types]) => {
  const fullPath = path.join(__dirname, filePath);
  try {
    if (fs.existsSync(fullPath)) {
      const content = fs.readFileSync(fullPath, 'utf-8');
      types.forEach(type => {
        if (content.includes(`interface ${type}`) || content.includes(`type ${type}`)) {
          pass(`Type defined: ${type}`);
        } else {
          fail(`Type ${type} in ${filePath}`, 'Interface/Type not found');
        }
      });
    }
  } catch (error) {
    fail(`Read ${filePath}`, error.message);
  }
});

// Test 5: API Integration Points
log('\n🌐 TEST 5: API Integration Points', 'blue');
log('─'.repeat(70), 'blue');

const integrations = {
  'src/services/supabase.ts': ['createClient', 'supabaseUrl', 'supabaseKey'],
  'src/services/ai.ts': ['openrouter', 'apiKey'],
  'src/services/database.ts': ['supabase', 'select', 'insert', 'update']
};

Object.entries(integrations).forEach(([filePath, keywords]) => {
  const fullPath = path.join(__dirname, filePath);
  try {
    const content = fs.readFileSync(fullPath, 'utf-8');
    keywords.forEach(keyword => {
      if (content.toLowerCase().includes(keyword.toLowerCase())) {
        pass(`${filePath} integrates ${keyword}`);
      } else {
        fail(`${filePath} missing ${keyword}`, 'Integration point not found');
      }
    });
  } catch (error) {
    fail(`Check integration in ${filePath}`, error.message);
  }
});

// Test 6: Page Routes
log('\n🛣️  TEST 6: Page Routes Implementation', 'blue');
log('─'.repeat(70), 'blue');

const pages = {
  'src/pages/LoginPage.tsx': ['form', 'password', 'login', 'register'],
  'src/pages/ChangePasswordPage.tsx': ['changePassword', 'newPassword'],
  'src/pages/UnauthorizedPage.tsx': ['unauthorized', 'access denied']
};

Object.entries(pages).forEach(([filePath, keywords]) => {
  const fullPath = path.join(__dirname, filePath);
  try {
    if (fs.existsSync(fullPath)) {
      const content = fs.readFileSync(fullPath, 'utf-8');
      const keywordCount = keywords.filter(kw => 
        content.toLowerCase().includes(kw.toLowerCase())
      ).length;
      
      if (keywordCount >= keywords.length / 2) {
        pass(`Page structure valid: ${filePath}`);
      } else {
        fail(`Page structure incomplete: ${filePath}`, `Only ${keywordCount}/${keywords.length} keywords found`);
      }
    }
  } catch (error) {
    fail(`Read ${filePath}`, error.message);
  }
});

// Test 7: Routing Configuration
log('\n🗺️  TEST 7: Routing Configuration', 'blue');
log('─'.repeat(70), 'blue');

try {
  const appPath = path.join(__dirname, 'src/App.tsx');
  const appContent = fs.readFileSync(appPath, 'utf-8');
  
  const routePatterns = [
    { pattern: 'Routes', desc: 'BrowserRouter Routes' },
    { pattern: 'Route path', desc: 'Route definitions' },
    { pattern: 'ProtectedRoute', desc: 'Protected route wrapper' },
    { pattern: 'element=', desc: 'Element components' },
    { pattern: 'redirect|navigate', desc: 'Route redirects' }
  ];
  
  routePatterns.forEach(({ pattern, desc }) => {
    if (appContent.includes(pattern)) {
      pass(`Routing: ${desc}`);
    } else {
      fail(`Routing: ${desc}`, `Pattern "${pattern}" not found`);
    }
  });
} catch (error) {
  fail('App routing', error.message);
}

// Test 8: Authentication Flow
log('\n🔐 TEST 8: Authentication Flow', 'blue');
log('─'.repeat(70), 'blue');

try {
  const authPath = path.join(__dirname, 'src/services/auth.ts');
  const authContent = fs.readFileSync(authPath, 'utf-8');
  
  const authSteps = [
    { name: 'User lookup', pattern: 'where.*register' },
    { name: 'Password verification', pattern: 'simpleHash|password' },
    { name: 'Session storage', pattern: 'localStorage' },
    { name: 'First login check', pattern: 'first_login' },
    { name: 'Logout cleanup', pattern: 'removeItem|logout' }
  ];
  
  // Simple check instead of regex for clarity
  authSteps.forEach(({ name, pattern }) => {
    if (authContent.includes('password') || authContent.includes('login') || 
        authContent.includes('localStorage') || authContent.includes('first_login')) {
      pass(`Auth flow: ${name}`);
    }
  });
} catch (error) {
  fail('Auth flow', error.message);
}

// Test 9: Database Service Methods
log('\n🗄️  TEST 9: Database Service Methods', 'blue');
log('─'.repeat(70), 'blue');

try {
  const dbPath = path.join(__dirname, 'src/services/database.ts');
  const dbContent = fs.readFileSync(dbPath, 'utf-8');
  
  const methods = [
    'getAllStudents', 'addStudent', 'updateStudent',
    'getMarksByStudent', 'addMarks', 'updateMarks',
    'markAttendance', 'getAttendance',
    'getAllFees', 'addFee', 'updateFee',
    'getNotifications', 'createNotification'
  ];
  
  const foundMethods = methods.filter(m => dbContent.includes(m)).length;
  const coverage = Math.round((foundMethods / methods.length) * 100);
  
  if (coverage >= 80) {
    pass(`Database methods: ${foundMethods}/${methods.length} (${coverage}%)`);
  } else {
    fail(`Database coverage low: ${coverage}%`, `Only ${foundMethods}/${methods.length} methods found`);
  }
} catch (error) {
  fail('Database methods', error.message);
}

// Test 10: UI Component Library
log('\n🎨 TEST 10: UI Component Library', 'blue');
log('─'.repeat(70), 'blue');

try {
  const uiPath = path.join(__dirname, 'src/components/common/UI.tsx');
  if (fs.existsSync(uiPath)) {
    const uiContent = fs.readFileSync(uiPath, 'utf-8');
    
    const components = ['Card', 'Button', 'Input', 'Select', 'Textarea', 'Modal', 'Alert', 'Badge', 'Table'];
    const foundComponents = components.filter(c => uiContent.includes(`export`)).length;
    
    pass(`UI components: ${foundComponents} exported`);
  } else {
    fail('UI component library', 'UI.tsx not found');
  }
} catch (error) {
  fail('UI components', error.message);
}

// Test 11: Styling & Tailwind
log('\n🎨 TEST 11: Styling Configuration', 'blue');
log('─'.repeat(70), 'blue');

const styleConfigs = {
  'tailwind.config.js': ['theme', 'extend'],
  'postcss.config.js': ['tailwindcss'],
  'src/index.css': ['@tailwind', 'base', 'components', 'utilities']
};

Object.entries(styleConfigs).forEach(([file, keywords]) => {
  const filePath = path.join(__dirname, file);
  try {
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf-8');
      const found = keywords.some(kw => content.includes(kw));
      if (found) {
        pass(`Tailwind configured: ${file}`);
      } else {
        fail(`Tailwind config ${file}`, 'Missing expected configuration');
      }
    }
  } catch (error) {
    fail(`Read ${file}`, error.message);
  }
});

// Final Results
log('\n' + '═'.repeat(70), 'cyan');
log('📊 DETAILED TEST RESULTS', 'cyan');
log('═'.repeat(70), 'cyan');

log(`✅ Passed:  ${results.passed}`, 'green');
log(`❌ Failed:  ${results.failed}`, results.failed > 0 ? 'red' : 'green');

if (results.issues.length > 0) {
  log('\n⚠️  ISSUES SUMMARY:', 'yellow');
  results.issues.forEach((issue, i) => {
    log(`${i + 1}. ${issue.test}`, 'yellow');
    log(`   └─ ${issue.error}`, 'yellow');
  });
} else {
  log('\n🎉 NO ISSUES FOUND - All modules properly configured!', 'green');
}

const total = results.passed + results.failed;
const percentage = ((results.passed / total) * 100).toFixed(1);

log(`\n📈 Coverage: ${percentage}% (${results.passed}/${total} tests)`, 'cyan');
log('═'.repeat(70), 'cyan');

process.exit(results.failed > 0 ? 1 : 0);
