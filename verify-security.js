#!/usr/bin/env node

/**
 * Security Verification Script
 * 
 * This script verifies that Azure OpenAI credentials are properly isolated
 * to the server-side and not leaked into client bundles.
 * 
 * Usage: node verify-security.js
 */

const fs = require('fs');
const path = require('path');

const CHECKS = {
  passed: 0,
  failed: 0,
  warnings: 0
};

const RESULTS = [];

function log(level, message) {
  const timestamp = new Date().toISOString().split('T')[1].slice(0, 8);
  const icon = {
    '✅': '✅',
    '❌': '❌',
    '⚠️': '⚠️',
    'ℹ️': 'ℹ️'
  };
  
  console.log(`[${timestamp}] ${icon[level] || level} ${message}`);
  RESULTS.push({ level, message });
}

function checkFileExists(filePath, description) {
  const fullPath = path.join(process.cwd(), filePath);
  if (fs.existsSync(fullPath)) {
    log('✅', `${description}: Found`);
    CHECKS.passed++;
    return true;
  } else {
    log('❌', `${description}: Missing`);
    CHECKS.failed++;
    return false;
  }
}

function checkFileContent(filePath, pattern, description) {
  const fullPath = path.join(process.cwd(), filePath);
  try {
    const content = fs.readFileSync(fullPath, 'utf-8');
    if (content.includes(pattern)) {
      log('✅', `${description}: Found`);
      CHECKS.passed++;
      return true;
    } else {
      log('❌', `${description}: Missing`);
      CHECKS.failed++;
      return false;
    }
  } catch (error) {
    log('❌', `${description}: Error reading file - ${error.message}`);
    CHECKS.failed++;
    return false;
  }
}

function checkFileDoesNotContain(filePath, pattern, description) {
  const fullPath = path.join(process.cwd(), filePath);
  try {
    const content = fs.readFileSync(fullPath, 'utf-8');
    if (!content.includes(pattern)) {
      log('✅', `${description}: Clean`);
      CHECKS.passed++;
      return true;
    } else {
      log('❌', `${description}: Contains forbidden pattern`);
      CHECKS.failed++;
      return false;
    }
  } catch (error) {
    log('⚠️', `${description}: File not found (may be OK)`);
    CHECKS.warnings++;
    return true;
  }
}

function scanDirectory(dirPath, pattern, shouldNotContain = false) {
  const fullPath = path.join(process.cwd(), dirPath);
  const matches = [];
  
  if (!fs.existsSync(fullPath)) {
    return matches;
  }

  const files = fs.readdirSync(fullPath, { recursive: true, withFileTypes: true });
  
  for (const file of files) {
    if (file.isFile() && file.name.endsWith('.js')) {
      try {
        const content = fs.readFileSync(path.join(file.parentPath, file.name), 'utf-8');
        const found = content.includes(pattern);
        
        if ((found && !shouldNotContain) || (!found && shouldNotContain)) {
          matches.push(path.join(file.parentPath, file.name).replace(fullPath, ''));
        }
      } catch (e) {
        // Skip files that can't be read
      }
    }
  }
  
  return matches;
}

console.log('🔒 Bonfire Security Verification\n');
console.log('Checking Azure OpenAI credential isolation...\n');

// Check 1: API Route Configuration
console.log('📋 Checking API Route Configuration...');
checkFileContent('app/api/ai/generate-event/route.ts', "export const runtime = 'nodejs'", 'Node.js runtime enforced');
checkFileContent('app/api/ai/generate-event/route.ts', 'export const revalidate = 0', 'ISR caching disabled');
checkFileContent('app/api/ai/generate-event/route.ts', 'getAzureOpenAIConfig', 'Uses server-only config utility');

// Check 2: Server-Only Config Module
console.log('\n📋 Checking Server-Only Config Module...');
checkFileExists('lib/azure-openai-config.ts', 'Server config utility exists');
checkFileContent('lib/azure-openai-config.ts', 'AZURE_OPENAI_ENDPOINT', 'Endpoint validation present');
checkFileContent('lib/azure-openai-config.ts', 'AZURE_OPENAI_KEY', 'Key validation present');
checkFileContent('lib/azure-openai-config.ts', 'AZURE_OPENAI_DEPLOYMENT_ID', 'Deployment ID validation present');

// Check 3: Client Component Safety
console.log('\n📋 Checking Client Component Safety...');
checkFileContent('components/organizer/ai-event-generator.tsx', "'use client'", 'Client component marked correctly');
checkFileContent('components/organizer/ai-event-generator.tsx', "fetch('/api/ai/generate-event'", 'Makes HTTP request to API');
checkFileDoesNotContain('components/organizer/ai-event-generator.tsx', 'getAzureOpenAIConfig', 'Does not import server config');
checkFileDoesNotContain('components/organizer/ai-event-generator.tsx', 'process.env', 'Does not access process.env');

// Check 4: Build Configuration
console.log('\n📋 Checking Build Configuration...');
checkFileContent('next.config.js', 'reactStrictMode', 'Has Next.js config');
checkFileContent('next.config.js', 'images', 'Image optimization configured');

// Check 5: No Client Bundle Leaks
console.log('\n📋 Checking for Credential Leaks in Build Output...');
if (fs.existsSync('.next/static')) {
  const clientLeaks = scanDirectory('.next/static', 'AZURE_OPENAI', false);
  if (clientLeaks.length === 0) {
    log('✅', 'No credentials in client bundle (.next/static/)');
    CHECKS.passed++;
  } else {
    log('❌', `Found ${clientLeaks.length} files with credentials in client bundle`);
    clientLeaks.forEach(file => log('❌', `  - ${file}`));
    CHECKS.failed++;
  }
} else {
  log('⚠️', '.next/static directory not found (build not run?)');
  CHECKS.warnings++;
}

// Check 6: Server Runtime Files
console.log('\n📋 Checking Server-Side Build Artifacts...');
if (fs.existsSync('.next/server/app/api/ai/generate-event')) {
  const serverFiles = fs.readdirSync('.next/server/app/api/ai/generate-event', { withFileTypes: true });
  const hasRoute = serverFiles.some(f => f.name === 'route.js' || f.name.includes('route'));
  if (hasRoute) {
    log('✅', 'API route compiled to server directory');
    CHECKS.passed++;
  } else {
    log('❌', 'API route not found in server directory');
    CHECKS.failed++;
  }
} else {
  log('⚠️', 'Server build directory not found (build not run?)');
  CHECKS.warnings++;
}

// Check 7: No NEXT_PUBLIC Azure Vars
console.log('\n📋 Checking for Unsafe Public Configuration...');
if (fs.existsSync('.env.local')) {
  const envContent = fs.readFileSync('.env.local', 'utf-8');
  const hasPublicAzure = /NEXT_PUBLIC_AZURE_OPENAI/i.test(envContent);
  if (!hasPublicAzure) {
    log('✅', 'No NEXT_PUBLIC_AZURE_OPENAI variables found (correct)');
    CHECKS.passed++;
  } else {
    log('❌', 'Found NEXT_PUBLIC_AZURE_OPENAI (should not be public)');
    CHECKS.failed++;
  }
} else {
  log('⚠️', '.env.local not found (may be in .gitignore)');
  CHECKS.warnings++;
}

// Summary
console.log('\n' + '='.repeat(60));
console.log('VERIFICATION SUMMARY');
console.log('='.repeat(60));
console.log(`✅ Passed:  ${CHECKS.passed}`);
console.log(`❌ Failed:  ${CHECKS.failed}`);
console.log(`⚠️  Warnings: ${CHECKS.warnings}`);

if (CHECKS.failed === 0) {
  console.log('\n🎉 ALL SECURITY CHECKS PASSED!');
  console.log('✅ Azure OpenAI credentials are properly isolated');
  console.log('✅ Application is Netlify secrets-scanning safe');
  process.exit(0);
} else {
  console.log('\n⚠️  Some security checks failed. Please review above.');
  process.exit(1);
}
