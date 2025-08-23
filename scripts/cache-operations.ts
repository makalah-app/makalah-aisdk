#!/usr/bin/env ts-node

/**
 * WEBPACK CACHE OPERATIONS SCRIPT
 * Command-line interface for webpack cache management
 * AI SDK v5 compliant cache operations
 */

import { webpackCacheManager } from '../src/lib/webpack-cache-manager'
import { webpackErrorRecovery } from '../src/lib/webpack-error-recovery'

interface OperationOptions {
  operation: 'health' | 'clean' | 'reset' | 'monitor' | 'test-recovery'
  verbose?: boolean
}

async function executeOperation(options: OperationOptions): Promise<void> {
  console.log(`🔧 Webpack Cache Manager - ${options.operation.toUpperCase()} Operation`)
  console.log(`📅 ${new Date().toISOString()}`)
  console.log('─'.repeat(60))

  try {
    switch (options.operation) {
      case 'health':
        await performHealthCheck(options.verbose)
        break
        
      case 'clean':
        await performCleanup(options.verbose)
        break
        
      case 'reset':
        await performReset(options.verbose)
        break
        
      case 'monitor':
        await startMonitoring()
        break
        
      case 'test-recovery':
        await testRecovery()
        break
        
      default:
        console.error(`❌ Unknown operation: ${options.operation}`)
        process.exit(1)
    }
    
    console.log('─'.repeat(60))
    console.log('✅ Operation completed successfully')
    
  } catch (error) {
    console.error('❌ Operation failed:', error)
    process.exit(1)
  }
}

async function performHealthCheck(verbose?: boolean): Promise<void> {
  console.log('🔍 Performing webpack cache health check...')
  
  const report = await webpackCacheManager.performHealthCheck()
  
  console.log('')
  console.log('📊 HEALTH REPORT:')
  console.log(`   Total cache size: ${Math.round(report.totalCacheSize / 1024 / 1024)} MB`)
  console.log(`   Healthy files: ${report.healthyFiles.length}`)
  console.log(`   Corrupted files: ${report.corruptedFiles.length}`)
  console.log('')
  
  if (report.corruptedFiles.length > 0) {
    console.log('⚠️  CORRUPTED FILES:')
    report.corruptedFiles.forEach(file => {
      console.log(`   - ${file}`)
    })
    console.log('')
  }
  
  if (report.recommendations.length > 0) {
    console.log('💡 RECOMMENDATIONS:')
    report.recommendations.forEach(rec => {
      console.log(`   • ${rec}`)
    })
    console.log('')
  }
  
  if (verbose && report.healthyFiles.length > 0) {
    console.log('✅ HEALTHY FILES:')
    report.healthyFiles.forEach(file => {
      console.log(`   - ${file}`)
    })
    console.log('')
  }
  
  // Output JSON for programmatic usage
  if (process.env.JSON_OUTPUT) {
    console.log(JSON.stringify(report, null, 2))
  }
}

async function performCleanup(verbose?: boolean): Promise<void> {
  console.log('🧹 Performing webpack cache cleanup...')
  
  const result = await webpackCacheManager.performCleanup({
    removeCorrupted: true,
    sizeLimitCleanup: true
  })
  
  console.log('')
  console.log('📊 CLEANUP RESULT:')
  console.log(`   Cleanup performed: ${result.cleaned ? 'YES' : 'NO'}`)
  console.log(`   Space freed: ${Math.round(result.freedSpace / 1024 / 1024)} MB`)
  
  if (result.errors.length > 0) {
    console.log(`   Errors: ${result.errors.length}`)
    console.log('')
    console.log('❌ ERRORS:')
    result.errors.forEach(error => {
      console.log(`   - ${error}`)
    })
  }
  console.log('')
}

async function performReset(verbose?: boolean): Promise<void> {
  console.log('🔄 Performing full webpack cache reset...')
  console.log('⚠️  This will remove ALL webpack cache files!')
  
  const result = await webpackCacheManager.performCleanup({
    fullCleanup: true
  })
  
  console.log('')
  console.log('📊 RESET RESULT:')
  console.log(`   Reset performed: ${result.cleaned ? 'YES' : 'NO'}`)
  console.log(`   Space freed: ${Math.round(result.freedSpace / 1024 / 1024)} MB`)
  
  if (result.errors.length > 0) {
    console.log(`   Errors: ${result.errors.length}`)
    console.log('')
    console.log('❌ ERRORS:')
    result.errors.forEach(error => {
      console.log(`   - ${error}`)
    })
  }
  console.log('')
  console.log('💡 Cache will be rebuilt on next build/dev command')
}

async function startMonitoring(): Promise<void> {
  console.log('👁️  Starting webpack cache monitoring...')
  console.log('   Press Ctrl+C to stop monitoring')
  console.log('')
  
  await webpackCacheManager.startCacheMonitoring(30000) // Check every 30 seconds
  
  // Keep process alive
  process.on('SIGINT', () => {
    console.log('\n🛑 Monitoring stopped')
    process.exit(0)
  })
}

async function testRecovery(): Promise<void> {
  console.log('🧪 Testing webpack error recovery system...')
  
  const testErrors = [
    '<w> [webpack.cache.PackFileCacheStrategy] Restoring failed for ResolverCachePlugin|normal|default|alias=[...core-js/modules|request=|../internals/get-built-in from pack: Error: unexpected end of file',
    'ResolverCachePlugin restoration failed from pack: Error reading cache file',
    'webpack compilation failed with module resolution error'
  ]
  
  console.log('')
  for (let i = 0; i < testErrors.length; i++) {
    const error = testErrors[i]
    console.log(`📋 Test ${i + 1}: ${error.substring(0, 60)}...`)
    
    const pattern = webpackErrorRecovery.analyzeError(error)
    if (pattern) {
      console.log(`   ✅ Pattern detected: ${pattern.strategy} (${pattern.description})`)
    } else {
      console.log(`   ❌ No pattern detected`)
    }
    
    console.log('')
  }
  
  // Reset retry count for clean test
  webpackErrorRecovery.resetRetryCount()
  console.log('🔄 Recovery system ready for operation')
}

// Parse command line arguments
const args = process.argv.slice(2)
const operation = args[0] as OperationOptions['operation']
const verbose = args.includes('--verbose') || args.includes('-v')

if (!operation) {
  console.log('Usage: ts-node scripts/cache-operations.ts <operation> [--verbose]')
  console.log('')
  console.log('Operations:')
  console.log('  health        - Check webpack cache health')
  console.log('  clean         - Clean corrupted cache files')
  console.log('  reset         - Full cache reset')
  console.log('  monitor       - Start cache monitoring')
  console.log('  test-recovery - Test error recovery patterns')
  console.log('')
  console.log('Options:')
  console.log('  --verbose, -v - Verbose output')
  process.exit(1)
}

// Execute the requested operation
executeOperation({ operation, verbose })