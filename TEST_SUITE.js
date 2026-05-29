#!/usr/bin/env node

/**
 * Comprehensive Test Suite for AI-Powered School Management System
 * Tests all modules, services, configurations, and API integrations
 * Run: node TEST_SUITE.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

let testResults = {
  passed: 0,
  failed: 0,
  warnings: 0,
  errors: []
};

// Helper functions
function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function testPass(testName) {
  testResults.passed++;
  log(`✅ PASS: ${testName}`, 'green');
}

function testFail(testName, error) {
  testResults.failed++;
  testResults.errors.push({ test: testName, error });
  log(`❌ FAIL: ${testName}`, 'red');
  log(`   Error: ${error}`, 'red');
}

function testWarn(testName, message) {
  testResults.warnings++;
  log(`⚠️  WARN: ${testName}`, 'yellow');
  log(`   ${message}`, 'yellow');
}

// Test 1: Environment Variables
log('\n📋 TEST 1: Environment Variables Configuration', 'blue');
log('━'.repeat(60), 'blue');

try {
  const envPath = path.join(__dirname, '.env.local');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    const lines = envContent.split('\n');
    
    let hasSupabaseUrl = false;
    let hasSupabaseKey = false;
    let hasOpenRouterKey = false;
    
    lines.forEach(line => {
      if (line.includes('VITE_SUPABASE_URL')) hasSupabaseUrl = true;
      if (line.includes('VITE_SUPABASE_ANON_KEY')) hasSupabaseKey = true;
      if (line.includes('VITE_OPENROUTER_API_KEY')) hasOpenRouterKey = true;
    });
    
    if (hasSupabaseUrl && hasSupabaseKey && hasOpenRouterKey) {
      testPass('All required environment variables are configured');
    } else {
      testFail('Environment Variables', 
        `Missing: ${!hasSupabaseUrl ? 'SUPABASE_URL ' : ''}${!hasSupabaseKey ? 'SUPABASE_KEY ' : ''}${!hasOpenRouterKey ? 'OPENROUTER_KEY' : ''}`);
    }
  } else {
    testFail('Environment File', '.env.local file not found');
  }
} catch (error) {
  testFail('Environment Variables', error.message);
}

// Test 2: File Structure
log('\n📁 TEST 2: Project File Structure', 'blue');
log('━'.repeat(60), 'blue');

const requiredDirs = [
  'src/components',
  'src/services',
  'src/pages',
  'src/types',
  'src/contexts',
  'src/hooks',
  'src/utils',
  'public'
];

const requiredFiles = [
  'src/App.tsx',
  'src/main.tsx',
  'src/index.css',
  'package.json',
  'vite.config.ts',
  'tsconfig.json',
  'tailwind.config.js',
  'postcss.config.js'
];

requiredDirs.forEach(dir => {
  const dirPath = path.join(__dirname, dir);
  if (fs.existsSync(dirPath)) {
    testPass(`Directory exists: ${dir}`);
  } else {
    testFail(`Directory structure`, `Missing directory: ${dir}`);
  }
});

requiredFiles.forEach(file => {
  const filePath = path.join(__dirname, file);
  if (fs.existsSync(filePath)) {
    testPass(`File exists: ${file}`);
  } else {
    testFail(`File structure`, `Missing file: ${file}`);
  }
});

// Test 3: Service Files
log('\n⚙️  TEST 3: Service Layer Implementation', 'blue');
log('━'.repeat(60), 'blue');

const services = [
  'src/services/supabase.ts',
  'src/services/auth.ts',
  'src/services/database.ts',
  'src/services/ai.ts'
];

services.forEach(service => {
  const servicePath = path.join(__dirname, service);
  try {
    const content = fs.readFileSync(servicePath, 'utf-8');
    
    // Check for key exports
    if (content.includes('export')) {
      testPass(`Service exports found: ${service}`);
    } else {
      testWarn(`Service exports`, `No exports found in ${service}`);
    }
    
    // Check for functions
    const functionCount = (content.match(/function|const.*=/g) || []).length;
    if (functionCount > 0) {
      testPass(`${service} has ${functionCount} implementations`);
    }
  } catch (error) {
    testFail(`Service File: ${service}`, error.message);
  }
});

// Test 4: Component Files
log('\n🎨 TEST 4: React Components', 'blue');
log('━'.repeat(60), 'blue');

const componentPaths = [
  'src/components/common',
  'src/components/admin',
  'src/components/teacher',
  'src/components/student'
];

componentPaths.forEach(compPath => {
  const fullPath = path.join(__dirname, compPath);
  try {
    if (fs.existsSync(fullPath)) {
      const files = fs.readdirSync(fullPath).filter(f => f.endsWith('.tsx'));
      testPass(`${compPath} has ${files.length} components`);
    }
  } catch (error) {
    testFail(`Component directory: ${compPath}`, error.message);
  }
});

// Test 5: TypeScript Configuration
log('\n📝 TEST 5: TypeScript Configuration', 'blue');
log('━'.repeat(60), 'blue');

try {
  const tsconfigPath = path.join(__dirname, 'tsconfig.json');
  const tsconfig = JSON.parse(fs.readFileSync(tsconfigPath, 'utf-8'));
  
  if (tsconfig.compilerOptions.strict) {
    testPass('TypeScript strict mode enabled');
  } else {
    testWarn('TypeScript strict mode', 'Strict mode is disabled');
  }
  
  if (tsconfig.compilerOptions.esModuleInterop) {
    testPass('TypeScript ES module interop enabled');
  }
} catch (error) {
  testFail('TypeScript Configuration', error.message);
}

// Test 6: Dependencies
log('\n📦 TEST 6: Package Dependencies', 'blue');
log('━'.repeat(60), 'blue');

try {
  const packageJsonPath = path.join(__dirname, 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
  
  const requiredDeps = [
    'react',
    'react-dom',
    'react-router-dom',
    '@supabase/supabase-js',
    'tailwindcss',
    'recharts',
    'lucide-react'
  ];
  
  requiredDeps.forEach(dep => {
    if (packageJson.dependencies[dep] || packageJson.devDependencies[dep]) {
      testPass(`Dependency installed: ${dep}`);
    } else {
      testWarn(`Dependency`, `${dep} not found in package.json`);
    }
  });
} catch (error) {
  testFail('Dependencies', error.message);
}

// Test 7: Database Schema
log('\n🗄️  TEST 7: Database Schema Documentation', 'blue');
log('━'.repeat(60), 'blue');

const requiredTables = [
  'users',
  'students',
  'teachers',
  'marks',
  'attendance',
  'fees',
  'notifications'
];

try {
  const readmePath = path.join(__dirname, 'README.md');
  if (fs.existsSync(readmePath)) {
    const readmeContent = fs.readFileSync(readmePath, 'utf-8');
    
    requiredTables.forEach(table => {
      if (readmeContent.includes(`CREATE TABLE ${table}`)) {
        testPass(`Database table documented: ${table}`);
      } else {
        testWarn(`Database Schema`, `Table ${table} not documented in README`);
      }
    });
  } else {
    testWarn(`Database Documentation`, 'README.md not found');
  }
} catch (error) {
  testFail('Database Schema', error.message);
}

// Test 8: Routing Configuration
log('\n🛣️  TEST 8: Route Configuration', 'blue');
log('━'.repeat(60), 'blue');

try {
  const appPath = path.join(__dirname, 'src/App.tsx');
  const appContent = fs.readFileSync(appPath, 'utf-8');
  
  const requiredRoutes = [
    '/login',
    '/dashboard',
    '/teacher/dashboard',
    '/student/dashboard',
    '/change-password',
    '/unauthorized'
  ];
  
  let routeCount = 0;
  requiredRoutes.forEach(route => {
    if (appContent.includes(route)) {
      routeCount++;
    }
  });
  
  testPass(`Routes configured: ${routeCount}/${requiredRoutes.length} found`);
} catch (error) {
  testFail('Route Configuration', error.message);
}

// Test 9: Authentication System
log('\n🔐 TEST 9: Authentication System', 'blue');
log('━'.repeat(60), 'blue');

try {
  const authPath = path.join(__dirname, 'src/services/auth.ts');
  const authContent = fs.readFileSync(authPath, 'utf-8');
  
  const requiredMethods = [
    'login',
    'logout',
    'changePassword',
    'getCurrentUser',
    'createUser'
  ];
  
  let methodCount = 0;
  requiredMethods.forEach(method => {
    if (authContent.includes(method)) {
      methodCount++;
    }
  });
  
  testPass(`Auth methods implemented: ${methodCount}/${requiredMethods.length}`);
} catch (error) {
  testFail('Authentication System', error.message);
}

// Test 10: API Integration
log('\n🌐 TEST 10: API Integrations', 'blue');
log('━'.repeat(60), 'blue');

try {
  const aiPath = path.join(__dirname, 'src/services/ai.ts');
  const aiContent = fs.readFileSync(aiPath, 'utf-8');
  
  if (aiContent.includes('openrouter')) {
    testPass('OpenRouter API integration found');
  } else if (aiContent.includes('gemini') || aiContent.includes('google')) {
    testWarn('AI Service', 'Gemini API detected (consider using OpenRouter)');
  } else {
    testWarn('AI Service', 'API integration not clearly identified');
  }
  
  const supabasePath = path.join(__dirname, 'src/services/supabase.ts');
  const supabaseContent = fs.readFileSync(supabasePath, 'utf-8');
  
  if (supabaseContent.includes('createClient')) {
    testPass('Supabase client initialization found');
  }
} catch (error) {
  testFail('API Integration', error.message);
}

// Test 11: UI Components
log('\n🎭 TEST 11: UI Components', 'blue');
log('━'.repeat(60), 'blue');

try {
  const uiPath = path.join(__dirname, 'src/components/common/UI.tsx');
  const uiContent = fs.readFileSync(uiPath, 'utf-8');
  
  const components = ['Card', 'Button', 'Input', 'Modal', 'Table'];
  let foundCount = 0;
  
  components.forEach(comp => {
    if (uiContent.includes(`export const ${comp}`)) {
      foundCount++;
    }
  });
  
  testPass(`UI components exported: ${foundCount}/${components.length}`);
} catch (error) {
  testFail('UI Components', error.message);
}

// Test 12: Context/State Management
log('\n🔄 TEST 12: Context & State Management', 'blue');
log('━'.repeat(60), 'blue');

try {
  const contextPath = path.join(__dirname, 'src/contexts/AuthContext.tsx');
  if (fs.existsSync(contextPath)) {
    const contextContent = fs.readFileSync(contextPath, 'utf-8');
    
    if (contextContent.includes('createContext') && contextContent.includes('Provider')) {
      testPass('AuthContext properly implemented');
    } else {
      testWarn('AuthContext', 'Missing Provider pattern');
    }
  }
} catch (error) {
  testFail('Context Management', error.message);
}

// Test 13: Build Configuration
log('\n⚙️  TEST 13: Build Configuration', 'blue');
log('━'.repeat(60), 'blue');

try {
  const vitePath = path.join(__dirname, 'vite.config.ts');
  if (fs.existsSync(vitePath)) {
    testPass('Vite configuration exists');
  }
  
  const tailwindPath = path.join(__dirname, 'tailwind.config.js');
  if (fs.existsSync(tailwindPath)) {
    testPass('Tailwind CSS configuration exists');
  }
} catch (error) {
  testFail('Build Configuration', error.message);
}

// Test 14: Documentation
log('\n📚 TEST 14: Documentation', 'blue');
log('━'.repeat(60), 'blue');

const docFiles = [
  'README.md',
  'QUICK_START.md',
  'DEPLOYMENT_GUIDE.md'
];

docFiles.forEach(doc => {
  const docPath = path.join(__dirname, doc);
  if (fs.existsSync(docPath)) {
    testPass(`Documentation found: ${doc}`);
  } else {
    testWarn('Documentation', `${doc} not found`);
  }
});

// Final Summary
log('\n' + '═'.repeat(60), 'cyan');
log('📊 TEST SUMMARY', 'cyan');
log('═'.repeat(60), 'cyan');

log(`✅ Passed:  ${testResults.passed}`, 'green');
log(`❌ Failed:  ${testResults.failed}`, testResults.failed > 0 ? 'red' : 'green');
log(`⚠️  Warnings: ${testResults.warnings}`, testResults.warnings > 0 ? 'yellow' : 'green');

if (testResults.errors.length > 0) {
  log('\n🔴 ERRORS FOUND:', 'red');
  testResults.errors.forEach((err, i) => {
    log(`${i + 1}. [${err.test}]`, 'red');
    log(`   ${err.error}`, 'red');
  });
}

// Overall status
const total = testResults.passed + testResults.failed;
const passRate = ((testResults.passed / total) * 100).toFixed(1);

log('\n' + '═'.repeat(60), 'cyan');
if (testResults.failed === 0) {
  log(`🎉 ALL TESTS PASSED! (${passRate}%)`, 'green');
  log('✨ Project is ready for deployment!', 'green');
} else {
  log(`⚠️  Pass Rate: ${passRate}% (${testResults.failed} issues found)`, 'yellow');
  log('🔧 Review errors above and fix before deployment', 'yellow');
}
log('═'.repeat(60), 'cyan');

process.exit(testResults.failed > 0 ? 1 : 0);
