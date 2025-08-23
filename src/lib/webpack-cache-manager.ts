/**
 * WEBPACK CACHE MANAGER
 * Comprehensive solution for PackFileCacheStrategy corruption prevention
 * AI SDK v5 compliant with Next.js 15.5.0 optimization
 */

import { promises as fs } from 'fs'
import * as path from 'path'
import { existsSync } from 'fs'

interface CacheHealthReport {
  totalCacheSize: number
  corruptedFiles: string[]
  healthyFiles: string[]
  recommendations: string[]
}

interface CacheCleanupResult {
  cleaned: boolean
  freedSpace: number
  errors: string[]
}

export class WebpackCacheManager {
  private cacheBasePath: string
  private maxCacheSize: number // MB
  private backupEnabled: boolean

  constructor(options: {
    cacheBasePath?: string
    maxCacheSize?: number
    backupEnabled?: boolean
  } = {}) {
    this.cacheBasePath = options.cacheBasePath || path.join(process.cwd(), '.next', 'cache')
    this.maxCacheSize = options.maxCacheSize || 500 // 500MB default
    this.backupEnabled = options.backupEnabled ?? true
  }

  /**
   * Comprehensive cache health check
   * Identifies corrupted pack files and provides recommendations
   */
  async performHealthCheck(): Promise<CacheHealthReport> {
    const report: CacheHealthReport = {
      totalCacheSize: 0,
      corruptedFiles: [],
      healthyFiles: [],
      recommendations: []
    }

    try {
      const webpackCachePath = path.join(this.cacheBasePath, 'webpack')
      
      if (!existsSync(webpackCachePath)) {
        report.recommendations.push('Webpack cache directory does not exist - this is normal for fresh projects')
        return report
      }

      // Check all webpack cache directories
      const cacheTypes = [
        'client-development',
        'client-production', 
        'server-development',
        'server-production',
        'edge-server-development',
        'edge-server-production'
      ]

      for (const cacheType of cacheTypes) {
        const cachePath = path.join(webpackCachePath, cacheType)
        
        if (existsSync(cachePath)) {
          await this.checkCacheDirectory(cachePath, report)
        }
      }

      // Generate recommendations
      if (report.corruptedFiles.length > 0) {
        report.recommendations.push(`Found ${report.corruptedFiles.length} corrupted cache files`)
        report.recommendations.push('Recommend full cache cleanup and rebuild')
      }

      if (report.totalCacheSize > this.maxCacheSize * 1024 * 1024) {
        report.recommendations.push(`Cache size (${Math.round(report.totalCacheSize / 1024 / 1024)}MB) exceeds recommended limit`)
        report.recommendations.push('Consider cache cleanup to improve performance')
      }

      return report

    } catch (error) {
      console.error('Cache health check failed:', error)
      report.recommendations.push(`Health check failed: ${error}`)
      return report
    }
  }

  private async checkCacheDirectory(cachePath: string, report: CacheHealthReport): Promise<void> {
    try {
      const files = await fs.readdir(cachePath)
      const packFiles = files.filter(f => f.endsWith('.pack.gz'))

      for (const packFile of packFiles) {
        const filePath = path.join(cachePath, packFile)
        const stats = await fs.stat(filePath)
        report.totalCacheSize += stats.size

        // Check file integrity
        const isHealthy = await this.validatePackFile(filePath)
        
        if (isHealthy) {
          report.healthyFiles.push(filePath)
        } else {
          report.corruptedFiles.push(filePath)
        }
      }
    } catch (error) {
      console.error(`Failed to check cache directory ${cachePath}:`, error)
    }
  }

  private async validatePackFile(filePath: string): Promise<boolean> {
    try {
      const stats = await fs.stat(filePath)
      
      // Check if file size is suspiciously small (likely corrupted)
      if (stats.size < 100) {
        return false
      }

      // Check if file can be read
      const buffer = await fs.readFile(filePath, { encoding: null })
      
      // Basic gzip header validation (magic bytes: 1f 8b)
      if (buffer.length >= 2 && buffer[0] === 0x1f && buffer[1] === 0x8b) {
        return true
      }

      return false
    } catch (error) {
      console.error(`Failed to validate pack file ${filePath}:`, error)
      return false
    }
  }

  /**
   * Comprehensive cache cleanup with backup
   * Removes corrupted files and manages cache size
   */
  async performCleanup(options: {
    removeCorrupted?: boolean
    sizeLimitCleanup?: boolean
    fullCleanup?: boolean
  } = {}): Promise<CacheCleanupResult> {
    const result: CacheCleanupResult = {
      cleaned: false,
      freedSpace: 0,
      errors: []
    }

    try {
      const healthReport = await this.performHealthCheck()

      // Backup before cleanup if enabled
      if (this.backupEnabled && (healthReport.corruptedFiles.length > 0 || options.fullCleanup)) {
        await this.createCacheBackup()
      }

      // Remove corrupted files
      if (options.removeCorrupted && healthReport.corruptedFiles.length > 0) {
        for (const corruptedFile of healthReport.corruptedFiles) {
          try {
            const stats = await fs.stat(corruptedFile)
            await fs.unlink(corruptedFile)
            result.freedSpace += stats.size
            result.cleaned = true
          } catch (error) {
            result.errors.push(`Failed to remove ${corruptedFile}: ${error}`)
          }
        }
      }

      // Full cleanup if requested
      if (options.fullCleanup) {
        const webpackCachePath = path.join(this.cacheBasePath, 'webpack')
        
        if (existsSync(webpackCachePath)) {
          const sizeBefore = await this.calculateDirectorySize(webpackCachePath)
          await fs.rm(webpackCachePath, { recursive: true, force: true })
          result.freedSpace += sizeBefore
          result.cleaned = true
        }
      }

      // Size-based cleanup
      if (options.sizeLimitCleanup && healthReport.totalCacheSize > this.maxCacheSize * 1024 * 1024) {
        await this.performSizeBasedCleanup()
        result.cleaned = true
      }

      return result

    } catch (error) {
      result.errors.push(`Cleanup failed: ${error}`)
      return result
    }
  }

  private async createCacheBackup(): Promise<void> {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      const backupPath = path.join(this.cacheBasePath, `backup-${timestamp}`)
      const webpackCachePath = path.join(this.cacheBasePath, 'webpack')
      
      if (existsSync(webpackCachePath)) {
        await fs.cp(webpackCachePath, path.join(backupPath, 'webpack'), { 
          recursive: true,
          force: true 
        })
        console.log(`Cache backup created at: ${backupPath}`)
      }
    } catch (error) {
      console.error('Failed to create cache backup:', error)
    }
  }

  private async calculateDirectorySize(dirPath: string): Promise<number> {
    let size = 0
    
    try {
      const files = await fs.readdir(dirPath, { withFileTypes: true })
      
      for (const file of files) {
        const filePath = path.join(dirPath, file.name)
        
        if (file.isDirectory()) {
          size += await this.calculateDirectorySize(filePath)
        } else {
          const stats = await fs.stat(filePath)
          size += stats.size
        }
      }
    } catch (error) {
      console.error(`Failed to calculate directory size for ${dirPath}:`, error)
    }
    
    return size
  }

  private async performSizeBasedCleanup(): Promise<void> {
    // Implementation for size-based cleanup
    // Remove oldest cache files when size exceeds limit
    try {
      const webpackCachePath = path.join(this.cacheBasePath, 'webpack')
      const cacheTypes = ['client-development', 'server-development']
      
      for (const cacheType of cacheTypes) {
        const cachePath = path.join(webpackCachePath, cacheType)
        
        if (existsSync(cachePath)) {
          const files = await fs.readdir(cachePath)
          const packFiles = files.filter(f => f.endsWith('.pack.gz'))
          
          // Sort by modification time and remove oldest
          const fileStats = await Promise.all(
            packFiles.map(async (file) => {
              const filePath = path.join(cachePath, file)
              const stats = await fs.stat(filePath)
              return { file, path: filePath, mtime: stats.mtime }
            })
          )
          
          fileStats.sort((a, b) => a.mtime.getTime() - b.mtime.getTime())
          
          // Remove oldest files until size is acceptable
          const filesToRemove = fileStats.slice(0, Math.floor(fileStats.length * 0.3))
          
          for (const fileInfo of filesToRemove) {
            await fs.unlink(fileInfo.path)
          }
        }
      }
    } catch (error) {
      console.error('Size-based cleanup failed:', error)
    }
  }

  /**
   * Monitor cache health during development
   */
  async startCacheMonitoring(intervalMs: number = 60000): Promise<void> {
    console.log('Starting webpack cache monitoring...')
    
    setInterval(async () => {
      const report = await this.performHealthCheck()
      
      if (report.corruptedFiles.length > 0) {
        console.warn(`⚠️  Detected ${report.corruptedFiles.length} corrupted webpack cache files`)
        console.warn('Consider running cache cleanup: npm run cache:clean')
      }
      
      if (report.totalCacheSize > this.maxCacheSize * 1024 * 1024) {
        console.warn(`⚠️  Webpack cache size (${Math.round(report.totalCacheSize / 1024 / 1024)}MB) exceeds recommended limit`)
      }
    }, intervalMs)
  }
}

// Export default instance for easy usage
export const webpackCacheManager = new WebpackCacheManager()