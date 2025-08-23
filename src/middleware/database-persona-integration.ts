// ============================================
// MAKALAH AI: Database Persona Integration Middleware
// ============================================
// Task P07.2 Implementation: Seamless database integration dengan persona context
// Created: August 2025
// Features: Auto persona context injection, session management, performance optimization

import { NextRequest, NextResponse } from 'next/server'
import { personaAwareDB, type DatabasePersonaContext } from '@/lib/database/persona-context'
import { personaService } from '@/lib/persona-service'

// ============================================
// MIDDLEWARE TYPES
// ============================================

export interface DatabaseMiddlewareContext {
  personaContext?: DatabasePersonaContext
  sessionId?: string
  userId?: string
  operation?: 'read' | 'write' | 'update' | 'delete'
  performance?: {
    startTime: number
    endTime?: number
    cacheUsed?: boolean
  }
}

export interface DatabaseMiddlewareConfig {
  enableCaching?: boolean
  enablePersonaTracking?: boolean
  enablePerformanceLogging?: boolean
  maxCacheSize?: number
  cacheTTL?: number
}

// ============================================
// DATABASE PERSONA MIDDLEWARE CLASS
// ============================================

export class DatabasePersonaMiddleware {
  private static instance: DatabasePersonaMiddleware
  private config: DatabaseMiddlewareConfig
  private requestCache = new Map<string, { data: any; timestamp: number; ttl: number }>()
  private performanceMetrics = {
    totalRequests: 0,
    averageResponseTime: 0,
    cacheHitRate: 0,
    personaAwareRequests: 0
  }

  private constructor(config: DatabaseMiddlewareConfig = {}) {
    this.config = {
      enableCaching: true,
      enablePersonaTracking: true,
      enablePerformanceLogging: true,
      maxCacheSize: 1000,
      cacheTTL: 5 * 60 * 1000, // 5 minutes default
      ...config
    }
  }

  static getInstance(config?: DatabaseMiddlewareConfig): DatabasePersonaMiddleware {
    if (!this.instance) {
      this.instance = new DatabasePersonaMiddleware(config)
    }
    return this.instance
  }

  // ============================================
  // PERSONA CONTEXT EXTRACTION
  // ============================================

  /**
   * Extract persona context from request
   */
  extractPersonaContext(req: NextRequest): Promise<DatabasePersonaContext | null> {
    return new Promise(async (resolve) => {
      try {
        // Try to get persona context from various sources
        const searchParams = req.nextUrl.searchParams
        const sessionId = searchParams.get('sessionId') || req.headers.get('x-session-id')
        const personaId = searchParams.get('personaId') || req.headers.get('x-persona-id')
        const chatMode = searchParams.get('chatMode') as 'formal' | 'casual' | null || 
                        req.headers.get('x-chat-mode') as 'formal' | 'casual' | null
        const userId = req.headers.get('x-user-id')

        // Get persona template if personaId is provided
        let personaTemplate = null
        if (personaId) {
          try {
            personaTemplate = await personaService.getPersonaById(personaId)
          } catch (error) {
            console.warn('[DB MIDDLEWARE] Failed to load persona template:', personaId, error)
          }
        }

        const personaContext: DatabasePersonaContext = {
          chatMode,
          personaId,
          personaTemplate,
          sessionId,
          userId,
          timestamp: new Date().toISOString()
        }

        if (this.config.enablePersonaTracking) {
          this.performanceMetrics.personaAwareRequests++
          console.log('[P07.2 DB MIDDLEWARE] Persona context extracted:', {
            sessionId,
            personaId,
            chatMode,
            userId: userId ? `${userId.slice(0, 8)}...` : 'anonymous'
          })
        }

        resolve(personaContext)
      } catch (error) {
        console.error('[P07.2 DB MIDDLEWARE] Failed to extract persona context:', error)
        resolve(null)
      }
    })
  }

  // ============================================
  // DATABASE OPERATION MIDDLEWARE
  // ============================================

  /**
   * Wrap database operations dengan persona context dan performance tracking
   */
  async wrapDatabaseOperation<T>(
    operation: () => Promise<T>,
    context: DatabaseMiddlewareContext
  ): Promise<T> {
    const startTime = Date.now()
    context.performance = { startTime }

    try {
      // Check cache first if enabled
      if (this.config.enableCaching && context.operation === 'read') {
        const cacheKey = this.generateCacheKey(context)
        const cached = this.getFromCache(cacheKey)
        
        if (cached) {
          context.performance.cacheUsed = true
          this.updatePerformanceMetrics(startTime, true)
          
          if (this.config.enablePerformanceLogging) {
            console.log('[P07.2 DB CACHE HIT]', {
              operation: context.operation,
              sessionId: context.sessionId,
              cacheKey: cacheKey.slice(0, 50) + '...',
              duration: Date.now() - startTime
            })
          }
          
          return cached
        }
      }

      // Execute the actual database operation
      const result = await operation()

      // Cache the result if it's a read operation
      if (this.config.enableCaching && context.operation === 'read' && result) {
        const cacheKey = this.generateCacheKey(context)
        this.setCache(cacheKey, result, this.config.cacheTTL!)
      }

      // Update performance metrics
      this.updatePerformanceMetrics(startTime, false)

      if (this.config.enablePerformanceLogging) {
        console.log('[P07.2 DB OPERATION SUCCESS]', {
          operation: context.operation,
          sessionId: context.sessionId,
          personaId: context.personaContext?.personaId,
          duration: Date.now() - startTime,
          cached: false
        })
      }

      return result

    } catch (error) {
      this.updatePerformanceMetrics(startTime, false, true)
      
      console.error('[P07.2 DB OPERATION ERROR]', {
        operation: context.operation,
        sessionId: context.sessionId,
        personaId: context.personaContext?.personaId,
        error: error instanceof Error ? error.message : 'Unknown error',
        duration: Date.now() - startTime
      })
      
      throw error
    }
  }

  // ============================================
  // NEXT.JS MIDDLEWARE INTEGRATION
  // ============================================

  /**
   * Next.js middleware handler untuk automatic persona context injection
   */
  async handleRequest(
    req: NextRequest,
    next: () => Promise<NextResponse>
  ): Promise<NextResponse> {
    const startTime = Date.now()

    try {
      // Extract persona context dari request
      const personaContext = await this.extractPersonaContext(req)

      // Add persona context ke request headers untuk downstream usage
      if (personaContext) {
        const requestHeaders = new Headers(req.headers)
        requestHeaders.set('x-persona-context', JSON.stringify(personaContext))
        
        // Create new request dengan enhanced headers
        const enhancedReq = new NextRequest(req.url, {
          method: req.method,
          headers: requestHeaders,
          body: req.body
        })

        // Log middleware processing
        if (this.config.enablePerformanceLogging) {
          console.log('[P07.2 MIDDLEWARE] Request enhanced with persona context:', {
            path: req.nextUrl.pathname,
            sessionId: personaContext.sessionId,
            personaId: personaContext.personaId,
            chatMode: personaContext.chatMode
          })
        }
      }

      // Continue ke next handler
      const response = await next()

      // Add performance headers ke response
      const duration = Date.now() - startTime
      response.headers.set('X-DB-Middleware-Duration', duration.toString())
      response.headers.set('X-Persona-Context-Available', personaContext ? 'true' : 'false')

      if (this.config.enablePerformanceLogging) {
        console.log('[P07.2 MIDDLEWARE] Request completed:', {
          path: req.nextUrl.pathname,
          duration,
          hasPersonaContext: !!personaContext
        })
      }

      return response

    } catch (error) {
      console.error('[P07.2 MIDDLEWARE ERROR]', {
        path: req.nextUrl.pathname,
        error: error instanceof Error ? error.message : 'Unknown error',
        duration: Date.now() - startTime
      })

      // Return error response dengan proper headers
      return new NextResponse(
        JSON.stringify({ error: 'Database middleware error' }),
        {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            'X-DB-Middleware-Error': 'true',
            'X-DB-Middleware-Duration': (Date.now() - startTime).toString()
          }
        }
      )
    }
  }

  // ============================================
  // CACHE MANAGEMENT
  // ============================================

  private generateCacheKey(context: DatabaseMiddlewareContext): string {
    return `db:${context.operation}:${context.sessionId}:${context.personaContext?.personaId || 'anonymous'}:${JSON.stringify(context.personaContext)}`
  }

  private getFromCache(key: string) {
    const cached = this.requestCache.get(key)
    if (!cached) return null

    if (Date.now() > cached.timestamp + cached.ttl) {
      this.requestCache.delete(key)
      return null
    }

    return cached.data
  }

  private setCache(key: string, data: any, ttl: number) {
    // Prevent cache from growing too large
    if (this.requestCache.size >= this.config.maxCacheSize!) {
      // Remove oldest entries
      const entries = Array.from(this.requestCache.entries())
      entries.sort(([,a], [,b]) => a.timestamp - b.timestamp)
      
      // Remove oldest 10% of entries
      const toRemove = Math.floor(entries.length * 0.1)
      for (let i = 0; i < toRemove; i++) {
        this.requestCache.delete(entries[i][0])
      }
    }

    this.requestCache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    })
  }

  private clearCache(pattern?: string) {
    if (pattern) {
      for (const [key] of this.requestCache.entries()) {
        if (key.includes(pattern)) {
          this.requestCache.delete(key)
        }
      }
    } else {
      this.requestCache.clear()
    }
  }

  // ============================================
  // PERFORMANCE TRACKING
  // ============================================

  private updatePerformanceMetrics(startTime: number, cacheHit: boolean, error = false) {
    const duration = Date.now() - startTime
    this.performanceMetrics.totalRequests++

    if (cacheHit) {
      const totalRequests = this.performanceMetrics.totalRequests
      this.performanceMetrics.cacheHitRate = 
        ((this.performanceMetrics.cacheHitRate * (totalRequests - 1)) + 1) / totalRequests
    }

    if (!error) {
      const totalRequests = this.performanceMetrics.totalRequests
      this.performanceMetrics.averageResponseTime = 
        ((this.performanceMetrics.averageResponseTime * (totalRequests - 1)) + duration) / totalRequests
    }
  }

  // ============================================
  // PUBLIC UTILITIES
  // ============================================

  /**
   * Get current performance metrics
   */
  getPerformanceMetrics() {
    return {
      ...this.performanceMetrics,
      cacheSize: this.requestCache.size,
      cacheHitPercentage: Math.round(this.performanceMetrics.cacheHitRate * 100),
      averageResponseTimeMs: Math.round(this.performanceMetrics.averageResponseTime)
    }
  }

  /**
   * Clear all caches
   */
  clearAllCaches() {
    this.clearCache()
    console.log('[P07.2 DB MIDDLEWARE] All caches cleared')
  }

  /**
   * Update middleware configuration
   */
  updateConfig(newConfig: Partial<DatabaseMiddlewareConfig>) {
    this.config = { ...this.config, ...newConfig }
    console.log('[P07.2 DB MIDDLEWARE] Configuration updated:', this.config)
  }

  /**
   * Get middleware health status
   */
  getHealthStatus() {
    return {
      status: 'healthy',
      config: this.config,
      performance: this.getPerformanceMetrics(),
      cacheHealth: this.requestCache.size < this.config.maxCacheSize!,
      timestamp: Date.now()
    }
  }
}

// ============================================
// CONVENIENCE EXPORTS
// ============================================

// Singleton instance
export const databasePersonaMiddleware = DatabasePersonaMiddleware.getInstance({
  enableCaching: true,
  enablePersonaTracking: true,
  enablePerformanceLogging: process.env.NODE_ENV === 'development',
  maxCacheSize: 1000,
  cacheTTL: 5 * 60 * 1000 // 5 minutes
})

// Helper functions untuk direct usage
export async function withPersonaContext<T>(
  operation: () => Promise<T>,
  context: DatabaseMiddlewareContext
): Promise<T> {
  return databasePersonaMiddleware.wrapDatabaseOperation(operation, context)
}

export async function extractPersonaFromRequest(req: NextRequest): Promise<DatabasePersonaContext | null> {
  return databasePersonaMiddleware.extractPersonaContext(req)
}

// Higher-order function untuk wrapping database operations
export function withPersonaAwareDB<T extends any[], R>(
  dbOperation: (...args: T) => Promise<R>
) {
  return async (...args: T): Promise<R> => {
    // Extract context from arguments jika ada
    const context: DatabaseMiddlewareContext = {
      operation: 'read', // Default, could be inferred from operation name
      performance: { startTime: Date.now() }
    }

    return withPersonaContext(() => dbOperation(...args), context)
  }
}

// Middleware factory untuk Next.js
export function createDatabasePersonaMiddleware(config?: DatabaseMiddlewareConfig) {
  const middleware = DatabasePersonaMiddleware.getInstance(config)
  
  return async (req: NextRequest, next: () => Promise<NextResponse>) => {
    return middleware.handleRequest(req, next)
  }
}