/**
 * WEBPACK CACHE CORRUPTION TESTING SUITE
 * Comprehensive testing for PackFileCacheStrategy corruption scenarios
 * AI SDK v5 compliance verification for webpack cache management
 */

import { test, expect } from '@playwright/test'
import { spawn, ChildProcess } from 'child_process'
import fs from 'fs/promises'
import path from 'path'
import { existsSync } from 'fs'
import { webpackCacheManager } from '../lib/webpack-cache-manager'
import { webpackErrorRecovery } from '../lib/webpack-error-recovery'

const PROJECT_ROOT = path.join(__dirname, '..', '..')
const CACHE_PATH = path.join(PROJECT_ROOT, '.next', 'cache', 'webpack')

test.describe('Webpack Cache Corruption Tests', () => {
  let devProcess: ChildProcess | null = null

  test.beforeEach(async () => {
    // Ensure clean state before each test
    if (existsSync(CACHE_PATH)) {
      await fs.rm(CACHE_PATH, { recursive: true, force: true })
    }
  })

  test.afterEach(async () => {
    // Clean up dev process
    if (devProcess) {
      devProcess.kill('SIGTERM')
      devProcess = null
    }
  })

  test('should detect healthy webpack cache', async () => {
    // Start dev server to generate cache
    devProcess = spawn('npm', ['run', 'dev'], {
      cwd: PROJECT_ROOT,
      stdio: 'pipe'
    })

    // Wait for cache to be generated
    await new Promise((resolve) => setTimeout(resolve, 10000))

    // Perform health check
    const healthReport = await webpackCacheManager.performHealthCheck()

    expect(healthReport.totalCacheSize).toBeGreaterThan(0)
    expect(healthReport.corruptedFiles.length).toBe(0)
    expect(healthReport.healthyFiles.length).toBeGreaterThan(0)
    expect(healthReport.recommendations).not.toContain('Found corrupted cache files')
  })

  test('should detect corrupted pack files', async () => {
    // Start dev server to generate cache
    devProcess = spawn('npm', ['run', 'dev'], {
      cwd: PROJECT_ROOT,
      stdio: 'pipe'
    })

    // Wait for cache to be generated
    await new Promise((resolve) => setTimeout(resolve, 10000))

    // Corrupt a pack file by truncating it
    const clientDevPath = path.join(CACHE_PATH, 'client-development')
    if (existsSync(clientDevPath)) {
      const files = await fs.readdir(clientDevPath)
      const packFiles = files.filter(f => f.endsWith('.pack.gz'))
      
      if (packFiles.length > 0) {
        const targetFile = path.join(clientDevPath, packFiles[0])
        
        // Truncate the file to simulate corruption
        await fs.writeFile(targetFile, Buffer.alloc(10))

        // Perform health check
        const healthReport = await webpackCacheManager.performHealthCheck()

        expect(healthReport.corruptedFiles.length).toBeGreaterThan(0)
        expect(healthReport.corruptedFiles).toContain(targetFile)
        expect(healthReport.recommendations).toContain('Found 1 corrupted cache files')
      }
    }
  })

  test('should clean up corrupted cache files', async () => {
    // Generate cache first
    devProcess = spawn('npm', ['run', 'dev'], {
      cwd: PROJECT_ROOT,
      stdio: 'pipe'
    })

    await new Promise((resolve) => setTimeout(resolve, 10000))

    // Corrupt multiple pack files
    const clientDevPath = path.join(CACHE_PATH, 'client-development')
    if (existsSync(clientDevPath)) {
      const files = await fs.readdir(clientDevPath)
      const packFiles = files.filter(f => f.endsWith('.pack.gz')).slice(0, 2)
      
      for (const packFile of packFiles) {
        const targetFile = path.join(clientDevPath, packFile)
        await fs.writeFile(targetFile, Buffer.alloc(10))
      }

      // Perform cleanup
      const cleanupResult = await webpackCacheManager.performCleanup({
        removeCorrupted: true
      })

      expect(cleanupResult.cleaned).toBe(true)
      expect(cleanupResult.freedSpace).toBeGreaterThan(0)
      expect(cleanupResult.errors.length).toBe(0)

      // Verify corrupted files are removed
      const healthReportAfter = await webpackCacheManager.performHealthCheck()
      expect(healthReportAfter.corruptedFiles.length).toBe(0)
    }
  })

  test('should perform full cache reset', async () => {
    // Generate cache first
    devProcess = spawn('npm', ['run', 'dev'], {
      cwd: PROJECT_ROOT,
      stdio: 'pipe'
    })

    await new Promise((resolve) => setTimeout(resolve, 10000))

    // Verify cache exists
    expect(existsSync(CACHE_PATH)).toBe(true)

    // Perform full reset
    const cleanupResult = await webpackCacheManager.performCleanup({
      fullCleanup: true
    })

    expect(cleanupResult.cleaned).toBe(true)
    expect(cleanupResult.freedSpace).toBeGreaterThan(0)

    // Verify cache directory is removed
    expect(existsSync(CACHE_PATH)).toBe(false)
  })

  test('should handle cache size limits', async () => {
    // Create cache manager with small size limit
    const testCacheManager = new (webpackCacheManager.constructor as any)({
      maxCacheSize: 1 // 1MB limit
    })

    // Generate cache
    devProcess = spawn('npm', ['run', 'dev'], {
      cwd: PROJECT_ROOT,
      stdio: 'pipe'
    })

    await new Promise((resolve) => setTimeout(resolve, 15000))

    // Check if size limit triggers recommendations
    const healthReport = await testCacheManager.performHealthCheck()

    if (healthReport.totalCacheSize > 1024 * 1024) {
      expect(healthReport.recommendations).toContain(
        expect.stringMatching(/Cache size.*exceeds recommended limit/)
      )
    }
  })

  test('should detect PackFileCacheStrategy error pattern', async () => {
    const errorMessage = '<w> [webpack.cache.PackFileCacheStrategy] Restoring failed for ResolverCachePlugin|normal|default|alias=[...core-js/modules|request=|../internals/get-built-in from pack: Error: unexpected end of file'

    const pattern = webpackErrorRecovery.analyzeError(errorMessage)

    expect(pattern).not.toBeNull()
    expect(pattern?.strategy).toBe('cache-cleanup')
    expect(pattern?.description).toContain('PackFileCacheStrategy corruption')
  })

  test('should detect ResolverCachePlugin error pattern', async () => {
    const errorMessage = 'Error: ResolverCachePlugin restoration failed from pack: Error reading cache file'

    const pattern = webpackErrorRecovery.analyzeError(errorMessage)

    expect(pattern).not.toBeNull()
    expect(pattern?.strategy).toBe('cache-cleanup')
    expect(pattern?.description).toContain('ResolverCachePlugin error')
  })

  test('should perform automatic recovery for cache corruption', async () => {
    // Generate and corrupt cache
    devProcess = spawn('npm', ['run', 'dev'], {
      cwd: PROJECT_ROOT,
      stdio: 'pipe'
    })

    await new Promise((resolve) => setTimeout(resolve, 10000))

    // Corrupt a pack file
    const clientDevPath = path.join(CACHE_PATH, 'client-development')
    if (existsSync(clientDevPath)) {
      const files = await fs.readdir(clientDevPath)
      const packFiles = files.filter(f => f.endsWith('.pack.gz'))
      
      if (packFiles.length > 0) {
        const targetFile = path.join(clientDevPath, packFiles[0])
        await fs.writeFile(targetFile, Buffer.alloc(10))
      }
    }

    // Simulate PackFileCacheStrategy error
    const errorMessage = '<w> [webpack.cache.PackFileCacheStrategy] Restoring failed for ResolverCachePlugin|normal|default|alias=[...core-js/modules|request=|../internals/get-built-in from pack: Error: unexpected end of file'

    // Perform recovery
    const recoveryResult = await webpackErrorRecovery.performRecovery(errorMessage)

    expect(recoveryResult.success).toBe(true)
    expect(recoveryResult.strategy).toBe('cache-cleanup')
    expect(recoveryResult.details).toContain('Cleaned corrupted cache files')

    // Verify corruption is fixed
    const healthReportAfter = await webpackCacheManager.performHealthCheck()
    expect(healthReportAfter.corruptedFiles.length).toBe(0)
  })

  test('should handle max retry attempts', async () => {
    // Reset retry count first
    webpackErrorRecovery.resetRetryCount()

    const errorMessage = 'Unknown webpack error that cannot be recovered'

    // Attempt recovery multiple times
    let lastResult
    for (let i = 0; i < 5; i++) {
      lastResult = await webpackErrorRecovery.performRecovery(errorMessage)
    }

    expect(lastResult?.success).toBe(false)
    expect(lastResult?.strategy).toBe('max-retries-exceeded')
    expect(webpackErrorRecovery.getRetryCount()).toBeGreaterThan(3)
  })

  test('should create backup before cleanup', async () => {
    // Generate cache first
    devProcess = spawn('npm', ['run', 'dev'], {
      cwd: PROJECT_ROOT,
      stdio: 'pipe'
    })

    await new Promise((resolve) => setTimeout(resolve, 10000))

    // Enable backup and perform cleanup
    const testCacheManager = new (webpackCacheManager.constructor as any)({
      backupEnabled: true
    })

    await testCacheManager.performCleanup({ fullCleanup: true })

    // Check if backup was created
    const cacheBasePath = path.join(PROJECT_ROOT, '.next', 'cache')
    if (existsSync(cacheBasePath)) {
      const items = await fs.readdir(cacheBasePath)
      const backupDirs = items.filter(item => item.startsWith('backup-'))
      
      // Should have at least one backup
      expect(backupDirs.length).toBeGreaterThan(0)
    }
  })

  test('should integrate with AI SDK build patterns', async () => {
    // Test that our webpack optimization doesn't break AI SDK
    const buildProcess = spawn('npm', ['run', 'build'], {
      cwd: PROJECT_ROOT,
      stdio: 'pipe'
    })

    let buildOutput = ''
    let buildError = ''

    buildProcess.stdout?.on('data', (data) => {
      buildOutput += data.toString()
    })

    buildProcess.stderr?.on('data', (data) => {
      buildError += data.toString()
    })

    const buildResult = await new Promise<number>((resolve) => {
      buildProcess.on('close', resolve)
    })

    // Build should succeed
    expect(buildResult).toBe(0)
    
    // Should contain AI SDK related chunks
    expect(buildOutput).toContain('ai-sdk')
    
    // Should not contain PackFileCacheStrategy errors
    expect(buildError).not.toContain('PackFileCacheStrategy')
    expect(buildError).not.toContain('unexpected end of file')
    
    // Verify cache health after build
    const healthReport = await webpackCacheManager.performHealthCheck()
    expect(healthReport.corruptedFiles.length).toBe(0)
  })

  test('should validate Next.js webpack configuration', async () => {
    // Start dev server and check webpack config application
    devProcess = spawn('npm', ['run', 'dev'], {
      cwd: PROJECT_ROOT,
      stdio: 'pipe',
      env: { ...process.env, NODE_ENV: 'development' }
    })

    let devOutput = ''
    devProcess.stderr?.on('data', (data) => {
      devOutput += data.toString()
    })

    await new Promise((resolve) => setTimeout(resolve, 15000))

    // Check that our webpack optimizations are applied
    const webpackCacheDir = path.join(PROJECT_ROOT, '.next', 'cache', 'webpack')
    expect(existsSync(webpackCacheDir)).toBe(true)

    // Verify cache structure matches our configuration
    const cacheTypes = [
      'client-development',
      'server-development'
    ]

    for (const cacheType of cacheTypes) {
      const cachePath = path.join(webpackCacheDir, cacheType)
      if (existsSync(cachePath)) {
        const files = await fs.readdir(cachePath)
        const packFiles = files.filter(f => f.endsWith('.pack.gz'))
        
        // Should have pack files in expected format
        expect(packFiles.length).toBeGreaterThan(0)
        
        // Files should be properly compressed
        for (const packFile of packFiles) {
          const filePath = path.join(cachePath, packFile)
          const stats = await fs.stat(filePath)
          expect(stats.size).toBeGreaterThan(0)
        }
      }
    }

    // Should not have PackFileCacheStrategy errors in dev output
    expect(devOutput).not.toContain('PackFileCacheStrategy')
    expect(devOutput).not.toContain('unexpected end of file')
  })
})