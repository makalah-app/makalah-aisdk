#!/usr/bin/env tsx
// ============================================
// MAKALAH AI: Persona Integration Test Script
// ============================================
// Task P07.5 Implementation: Entry point script for running comprehensive persona integration tests
// Created: August 2025
// Usage: npm run test:persona-integration or npx tsx scripts/run-persona-integration-tests.ts

import { runPersonaIntegrationTests } from '../src/lib/testing/persona-integration-runner'

// ============================================
// MAIN EXECUTION
// ============================================

async function main() {
  console.log('🚀 [PERSONA INTEGRATION TESTS] Starting comprehensive persona integration validation...')
  console.log('📝 [PERSONA INTEGRATION TESTS] This will validate P07.1-P07.4 integration compatibility\n')
  
  const startTime = Date.now()
  
  try {
    await runPersonaIntegrationTests()
    
    const duration = Date.now() - startTime
    console.log(`\n✅ [PERSONA INTEGRATION TESTS] Validation completed successfully in ${duration}ms`)
    process.exit(0)
    
  } catch (error) {
    const duration = Date.now() - startTime
    console.error(`\n❌ [PERSONA INTEGRATION TESTS] Validation failed after ${duration}ms:`)
    console.error(error)
    process.exit(1)
  }
}

// Handle process signals gracefully
process.on('SIGINT', () => {
  console.log('\n🛑 [PERSONA INTEGRATION TESTS] Test execution interrupted by user')
  process.exit(130)
})

process.on('SIGTERM', () => {
  console.log('\n🛑 [PERSONA INTEGRATION TESTS] Test execution terminated')
  process.exit(143)
})

// Run the tests
main().catch(error => {
  console.error('[PERSONA INTEGRATION TESTS] Unexpected error:', error)
  process.exit(1)
})