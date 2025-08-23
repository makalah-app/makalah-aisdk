/**
 * WEBPACK ERROR RECOVERY SYSTEM
 * Automatic recovery from PackFileCacheStrategy corruption
 * AI SDK v5 compliant error handling and retry mechanisms
 */

import { webpackCacheManager } from './webpack-cache-manager'
import { spawn } from 'child_process'
import * as path from 'path'

interface RecoveryResult {
  success: boolean
  strategy: string
  details: string
  retryCount: number
}

interface ErrorPattern {
  pattern: RegExp
  strategy: 'cache-cleanup' | 'full-reset' | 'dependency-reinstall' | 'restart-process'
  description: string
}

export class WebpackErrorRecovery {
  private maxRetries: number = 3
  private retryCount: number = 0
  private recoveryInProgress: boolean = false

  // Known error patterns and their recovery strategies
  private errorPatterns: ErrorPattern[] = [
    {
      pattern: /webpack\.cache\.PackFileCacheStrategy.*unexpected end of file/i,
      strategy: 'cache-cleanup',
      description: 'PackFileCacheStrategy corruption - corrupt cache files'
    },
    {
      pattern: /ResolverCachePlugin.*from pack.*Error/i,
      strategy: 'cache-cleanup', 
      description: 'ResolverCachePlugin error - resolver cache corruption'
    },
    {
      pattern: /ENOENT.*\.next.*cache/i,
      strategy: 'cache-cleanup',
      description: 'Missing cache files - cache directory corruption'
    },
    {
      pattern: /Module build failed.*Cannot resolve/i,
      strategy: 'dependency-reinstall',
      description: 'Module resolution failure - dependency issues'
    },
    {
      pattern: /webpack.*compilation.*failed/i,
      strategy: 'full-reset',
      description: 'Webpack compilation failure - full reset required'
    }
  ]

  /**
   * Analyze error and determine recovery strategy
   */
  analyzeError(errorMessage: string): ErrorPattern | null {
    for (const pattern of this.errorPatterns) {
      if (pattern.pattern.test(errorMessage)) {
        return pattern
      }
    }
    return null
  }

  /**
   * Perform automatic error recovery
   */
  async performRecovery(errorMessage: string): Promise<RecoveryResult> {
    if (this.recoveryInProgress) {
      return {
        success: false,
        strategy: 'none',
        details: 'Recovery already in progress',
        retryCount: this.retryCount
      }
    }

    this.recoveryInProgress = true
    this.retryCount++

    try {
      console.log(`🔧 Starting webpack error recovery (attempt ${this.retryCount}/${this.maxRetries})`)
      console.log(`🔍 Error: ${errorMessage.substring(0, 200)}...`)

      if (this.retryCount > this.maxRetries) {
        return {
          success: false,
          strategy: 'max-retries-exceeded',
          details: `Exceeded maximum retry attempts (${this.maxRetries})`,
          retryCount: this.retryCount
        }
      }

      const errorPattern = this.analyzeError(errorMessage)
      
      if (!errorPattern) {
        return {
          success: false,
          strategy: 'unknown-error',
          details: 'Error pattern not recognized',
          retryCount: this.retryCount
        }
      }

      console.log(`📋 Recovery strategy: ${errorPattern.strategy} (${errorPattern.description})`)

      // Execute recovery strategy
      const result = await this.executeRecoveryStrategy(errorPattern.strategy)
      
      if (result.success) {
        this.retryCount = 0 // Reset retry count on success
        console.log(`✅ Recovery successful using strategy: ${errorPattern.strategy}`)
      } else {
        console.log(`❌ Recovery failed with strategy: ${errorPattern.strategy}`)
      }

      return result

    } catch (error) {
      console.error('Recovery process failed:', error)
      return {
        success: false,
        strategy: 'recovery-error',
        details: `Recovery process error: ${error}`,
        retryCount: this.retryCount
      }
    } finally {
      this.recoveryInProgress = false
    }
  }

  /**
   * Execute specific recovery strategy
   */
  private async executeRecoveryStrategy(strategy: string): Promise<RecoveryResult> {
    switch (strategy) {
      case 'cache-cleanup':
        return await this.performCacheCleanup()
      
      case 'full-reset':
        return await this.performFullReset()
      
      case 'dependency-reinstall':
        return await this.performDependencyReinstall()
      
      case 'restart-process':
        return await this.performProcessRestart()
      
      default:
        return {
          success: false,
          strategy: strategy,
          details: 'Unknown recovery strategy',
          retryCount: this.retryCount
        }
    }
  }

  /**
   * Clean up corrupted cache files
   */
  private async performCacheCleanup(): Promise<RecoveryResult> {
    try {
      console.log('🧹 Performing cache cleanup...')
      
      // First check cache health
      const healthReport = await webpackCacheManager.performHealthCheck()
      console.log(`Found ${healthReport.corruptedFiles.length} corrupted files`)
      
      // Perform cleanup
      const cleanupResult = await webpackCacheManager.performCleanup({
        removeCorrupted: true,
        sizeLimitCleanup: true
      })

      if (cleanupResult.cleaned) {
        const freedSpaceMB = Math.round(cleanupResult.freedSpace / 1024 / 1024)
        return {
          success: true,
          strategy: 'cache-cleanup',
          details: `Cleaned corrupted cache files, freed ${freedSpaceMB}MB`,
          retryCount: this.retryCount
        }
      } else {
        return {
          success: false,
          strategy: 'cache-cleanup',
          details: 'No cleanup performed - no corrupted files found',
          retryCount: this.retryCount
        }
      }

    } catch (error) {
      return {
        success: false,
        strategy: 'cache-cleanup',
        details: `Cache cleanup failed: ${error}`,
        retryCount: this.retryCount
      }
    }
  }

  /**
   * Perform full webpack cache reset
   */
  private async performFullReset(): Promise<RecoveryResult> {
    try {
      console.log('🔄 Performing full webpack cache reset...')
      
      const cleanupResult = await webpackCacheManager.performCleanup({
        fullCleanup: true
      })

      if (cleanupResult.cleaned) {
        const freedSpaceMB = Math.round(cleanupResult.freedSpace / 1024 / 1024)
        return {
          success: true,
          strategy: 'full-reset',
          details: `Full cache reset completed, freed ${freedSpaceMB}MB`,
          retryCount: this.retryCount
        }
      } else {
        return {
          success: false,
          strategy: 'full-reset',
          details: 'Full reset failed - no cache directory found',
          retryCount: this.retryCount
        }
      }

    } catch (error) {
      return {
        success: false,
        strategy: 'full-reset',
        details: `Full reset failed: ${error}`,
        retryCount: this.retryCount
      }
    }
  }

  /**
   * Reinstall dependencies to fix module resolution
   */
  private async performDependencyReinstall(): Promise<RecoveryResult> {
    return new Promise((resolve) => {
      console.log('📦 Reinstalling dependencies...')
      
      const npmProcess = spawn('npm', ['install'], {
        cwd: process.cwd(),
        stdio: 'pipe'
      })

      let output = ''
      let errorOutput = ''

      npmProcess.stdout.on('data', (data) => {
        output += data.toString()
      })

      npmProcess.stderr.on('data', (data) => {
        errorOutput += data.toString()
      })

      npmProcess.on('close', (code) => {
        if (code === 0) {
          resolve({
            success: true,
            strategy: 'dependency-reinstall',
            details: 'Dependencies reinstalled successfully',
            retryCount: this.retryCount
          })
        } else {
          resolve({
            success: false,
            strategy: 'dependency-reinstall',
            details: `Dependency reinstall failed with code ${code}: ${errorOutput}`,
            retryCount: this.retryCount
          })
        }
      })

      npmProcess.on('error', (error) => {
        resolve({
          success: false,
          strategy: 'dependency-reinstall',
          details: `Dependency reinstall error: ${error}`,
          retryCount: this.retryCount
        })
      })
    })
  }

  /**
   * Restart the development process
   */
  private async performProcessRestart(): Promise<RecoveryResult> {
    console.log('🔄 Process restart recommended - manual intervention required')
    
    return {
      success: false,
      strategy: 'restart-process',
      details: 'Process restart requires manual intervention',
      retryCount: this.retryCount
    }
  }

  /**
   * Monitor development server for webpack errors
   */
  startErrorMonitoring(onError?: (error: string, recovery: RecoveryResult) => void): void {
    console.log('🔍 Starting webpack error monitoring...')

    // Monitor process stderr for webpack errors
    process.stderr.on('data', async (data: Buffer) => {
      const errorMessage = data.toString()
      
      // Check if this is a webpack cache error
      const pattern = this.analyzeError(errorMessage)
      
      if (pattern) {
        console.log(`🚨 Detected webpack error: ${pattern.description}`)
        
        // Perform automatic recovery
        const recovery = await this.performRecovery(errorMessage)
        
        if (onError) {
          onError(errorMessage, recovery)
        }
        
        if (recovery.success) {
          console.log('✅ Automatic recovery successful - continuing...')
        } else {
          console.log('❌ Automatic recovery failed - manual intervention may be required')
          console.log('💡 Try running: npm run cache:reset')
        }
      }
    })

    // Monitor for uncaught exceptions
    process.on('uncaughtException', async (error) => {
      if (error.message.includes('webpack') || error.message.includes('cache')) {
        console.log('🚨 Uncaught webpack-related exception detected')
        await this.performRecovery(error.message)
      }
    })
  }

  /**
   * Reset retry counter
   */
  resetRetryCount(): void {
    this.retryCount = 0
  }

  /**
   * Get current retry count
   */
  getRetryCount(): number {
    return this.retryCount
  }
}

// Export default instance for easy usage
export const webpackErrorRecovery = new WebpackErrorRecovery()