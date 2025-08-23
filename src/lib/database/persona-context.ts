// ============================================
// MAKALAH AI: Database Operations dengan Persona Context
// ============================================
// Task P07.2 Implementation: Database integration dengan persona awareness
// Created: August 2025
// Features: Context-aware database operations, performance optimization

import { createClient } from '@supabase/supabase-js'
import type { PersonaTemplate } from '@/types/persona'

// ============================================
// DATABASE CLIENT CONFIGURATION
// ============================================

let supabaseClient: ReturnType<typeof createClient> | null = null

function getSupabaseClient() {
  if (!supabaseClient) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase configuration missing')
    }
    
    supabaseClient = createClient(supabaseUrl, supabaseKey)
  }
  
  return supabaseClient
}

// ============================================
// PERSONA CONTEXT TYPES
// ============================================

export interface DatabasePersonaContext {
  chatMode: 'formal' | 'casual' | null
  personaId?: string | null
  personaTemplate?: PersonaTemplate | null
  sessionId?: string | null
  userId?: string | null
  workflowPhase?: number | null
  timestamp?: string
}

export interface EnhancedDatabaseOperation {
  operation: string
  table: string
  personaContext?: DatabasePersonaContext
  performance: {
    startTime: number
    endTime?: number
    duration?: number
    cacheHit?: boolean
  }
  metadata: Record<string, any>
}

// ============================================
// PERSONA-AWARE DATABASE OPERATIONS
// ============================================

export class PersonaAwareDatabaseManager {
  private static instance: PersonaAwareDatabaseManager
  private operationHistory: EnhancedDatabaseOperation[] = []
  private queryCache = new Map<string, { data: any; timestamp: number; ttl: number }>()
  private performanceMetrics = {
    totalOperations: 0,
    averageResponseTime: 0,
    cacheHitRate: 0,
    personaAwareOperations: 0
  }

  private constructor() {}

  static getInstance(): PersonaAwareDatabaseManager {
    if (!this.instance) {
      this.instance = new PersonaAwareDatabaseManager()
    }
    return this.instance
  }

  // ============================================
  // CHAT SESSIONS WITH PERSONA CONTEXT
  // ============================================

  /**
   * Create chat session dengan persona context
   */
  async createChatSession(
    title: string,
    personaContext: DatabasePersonaContext,
    options: {
      isProject?: boolean
      academicLevel?: string
      discipline?: string
      citationStyle?: string
    } = {}
  ) {
    const operation = this.startOperation('create', 'chat_sessions', personaContext)
    
    try {
      const supabase = getSupabaseClient()
      
      const sessionData = {
        title,
        is_project: options.isProject || false,
        academic_level: options.academicLevel,
        discipline: options.discipline,
        citation_style: options.citationStyle,
        // Persona context fields
        chat_mode: personaContext.chatMode,
        persona_id: personaContext.personaId,
        persona_name: personaContext.personaTemplate?.name,
        persona_mode: personaContext.personaTemplate?.mode,
        user_id: personaContext.userId,
        metadata: {
          personaContext: {
            chatMode: personaContext.chatMode,
            personaId: personaContext.personaId,
            workflowPhase: personaContext.workflowPhase,
            timestamp: personaContext.timestamp || new Date().toISOString()
          },
          creationContext: {
            userAgent: typeof window !== 'undefined' ? navigator.userAgent : 'server',
            timestamp: new Date().toISOString()
          }
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      const { data, error } = await supabase
        .from('chat_sessions')
        .insert([sessionData])
        .select()
        .single()

      if (error) throw error

      this.completeOperation(operation)
      console.log('[PERSONA DB] Chat session created:', {
        sessionId: data.id,
        chatMode: personaContext.chatMode,
        personaId: personaContext.personaId
      })

      return data
    } catch (error) {
      this.completeOperation(operation, error)
      throw error
    }
  }

  /**
   * Update session dengan persona context changes
   */
  async updateChatSession(
    sessionId: string,
    updates: Partial<{
      title: string
      metadata: Record<string, any>
    }>,
    personaContext: DatabasePersonaContext
  ) {
    const operation = this.startOperation('update', 'chat_sessions', personaContext)
    
    try {
      const supabase = getSupabaseClient()
      
      const updateData = {
        ...updates,
        // Update persona context if changed
        chat_mode: personaContext.chatMode,
        persona_id: personaContext.personaId,
        persona_name: personaContext.personaTemplate?.name,
        persona_mode: personaContext.personaTemplate?.mode,
        metadata: {
          ...updates.metadata,
          personaContext: {
            chatMode: personaContext.chatMode,
            personaId: personaContext.personaId,
            workflowPhase: personaContext.workflowPhase,
            lastUpdated: new Date().toISOString()
          }
        },
        updated_at: new Date().toISOString()
      }

      const { data, error } = await supabase
        .from('chat_sessions')
        .update(updateData)
        .eq('id', sessionId)
        .select()
        .single()

      if (error) throw error

      this.completeOperation(operation)
      console.log('[PERSONA DB] Session updated with persona context:', {
        sessionId,
        chatMode: personaContext.chatMode,
        personaId: personaContext.personaId
      })

      return data
    } catch (error) {
      this.completeOperation(operation, error)
      throw error
    }
  }

  /**
   * Get chat sessions dengan persona filtering
   */
  async getChatSessions(
    userId: string,
    filters: {
      chatMode?: 'formal' | 'casual'
      personaId?: string
      isProject?: boolean
      limit?: number
      offset?: number
    } = {}
  ) {
    const personaContext: DatabasePersonaContext = {
      chatMode: filters.chatMode || null,
      personaId: filters.personaId,
      userId
    }
    
    const operation = this.startOperation('select', 'chat_sessions', personaContext)
    
    // Check cache first
    const cacheKey = `sessions:${userId}:${JSON.stringify(filters)}`
    const cached = this.getFromCache(cacheKey)
    if (cached) {
      this.completeOperation(operation, null, true)
      return cached
    }
    
    try {
      const supabase = getSupabaseClient()
      let query = supabase
        .from('chat_sessions')
        .select('*')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false })
      
      // Apply persona filters
      if (filters.chatMode) {
        query = query.eq('chat_mode', filters.chatMode)
      }
      
      if (filters.personaId) {
        query = query.eq('persona_id', filters.personaId)
      }
      
      if (filters.isProject !== undefined) {
        query = query.eq('is_project', filters.isProject)
      }
      
      if (filters.limit) {
        query = query.limit(filters.limit)
      }
      
      if (filters.offset) {
        query = query.range(filters.offset, filters.offset + (filters.limit || 50) - 1)
      }

      const { data, error } = await query

      if (error) throw error

      // Cache hasil for 5 minutes
      this.setCache(cacheKey, data, 5 * 60 * 1000)
      this.completeOperation(operation)

      return data
    } catch (error) {
      this.completeOperation(operation, error)
      throw error
    }
  }

  // ============================================
  // MESSAGES WITH PERSONA CONTEXT
  // ============================================

  /**
   * Save message dengan persona context
   */
  async saveMessage(
    sessionId: string,
    message: {
      role: 'user' | 'assistant'
      content: string
      parts?: any[]
      artifacts?: string[]
    },
    personaContext: DatabasePersonaContext
  ) {
    const operation = this.startOperation('insert', 'messages', personaContext)
    
    try {
      const supabase = getSupabaseClient()
      
      const messageData = {
        session_id: sessionId,
        role: message.role,
        content: message.content,
        parts: message.parts || [],
        artifacts: message.artifacts || [],
        // Persona context
        persona_context: {
          chatMode: personaContext.chatMode,
          personaId: personaContext.personaId,
          personaName: personaContext.personaTemplate?.name,
          personaMode: personaContext.personaTemplate?.mode,
          workflowPhase: personaContext.workflowPhase,
          timestamp: personaContext.timestamp || new Date().toISOString()
        },
        metadata: {
          messageLength: message.content.length,
          hasArtifacts: (message.artifacts || []).length > 0,
          timestamp: new Date().toISOString()
        },
        created_at: new Date().toISOString()
      }

      const { data, error } = await supabase
        .from('messages')
        .insert([messageData])
        .select()
        .single()

      if (error) throw error

      this.completeOperation(operation)
      console.log('[PERSONA DB] Message saved:', {
        messageId: data.id,
        role: message.role,
        chatMode: personaContext.chatMode,
        personaId: personaContext.personaId
      })

      return data
    } catch (error) {
      this.completeOperation(operation, error)
      throw error
    }
  }

  /**
   * Get messages dengan persona context
   */
  async getMessages(
    sessionId: string,
    options: {
      limit?: number
      offset?: number
      includePersonaContext?: boolean
    } = {}
  ) {
    const operation = this.startOperation('select', 'messages')
    
    // Check cache
    const cacheKey = `messages:${sessionId}:${JSON.stringify(options)}`
    const cached = this.getFromCache(cacheKey)
    if (cached) {
      this.completeOperation(operation, null, true)
      return cached
    }
    
    try {
      const supabase = getSupabaseClient()
      let query = supabase
        .from('messages')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true })
      
      if (options.limit) {
        query = query.limit(options.limit)
      }
      
      if (options.offset) {
        query = query.range(options.offset, options.offset + (options.limit || 50) - 1)
      }

      const { data, error } = await query

      if (error) throw error

      // Process persona context jika diminta
      const processedData = options.includePersonaContext 
        ? data.map(msg => ({
            ...msg,
            personaContext: msg.persona_context || null
          }))
        : data

      // Cache for 2 minutes
      this.setCache(cacheKey, processedData, 2 * 60 * 1000)
      this.completeOperation(operation)

      return processedData
    } catch (error) {
      this.completeOperation(operation, error)
      throw error
    }
  }

  // ============================================
  // PERSONA TEMPLATES OPERATIONS
  // ============================================

  /**
   * Get persona templates dengan filtering
   */
  async getPersonaTemplates(
    filters: {
      mode?: 'Research' | 'Writing' | 'Review'
      chatModeType?: 'formal' | 'casual'
      disciplineId?: string
      activeOnly?: boolean
    } = {}
  ) {
    const operation = this.startOperation('select', 'persona_templates')
    
    const cacheKey = `personas:${JSON.stringify(filters)}`
    const cached = this.getFromCache(cacheKey)
    if (cached) {
      this.completeOperation(operation, null, true)
      return cached
    }
    
    try {
      const supabase = getSupabaseClient()
      let query = supabase
        .from('persona_templates')
        .select('*')
        .order('usage_count', { ascending: false })
      
      if (filters.mode) {
        query = query.eq('mode', filters.mode)
      }
      
      if (filters.chatModeType) {
        query = query.eq('chat_mode_type', filters.chatModeType)
      }
      
      if (filters.disciplineId) {
        query = query.eq('discipline_id', filters.disciplineId)
      }
      
      if (filters.activeOnly !== false) {
        query = query.eq('is_active', true)
      }

      const { data, error } = await query

      if (error) throw error

      // Cache for 10 minutes
      this.setCache(cacheKey, data, 10 * 60 * 1000)
      this.completeOperation(operation)

      return data
    } catch (error) {
      this.completeOperation(operation, error)
      throw error
    }
  }

  /**
   * Update persona usage statistics
   */
  async updatePersonaUsage(
    personaId: string,
    stats: {
      responseTime?: number
      qualityScore?: number
      success?: boolean
    }
  ) {
    const operation = this.startOperation('update', 'persona_templates')
    
    try {
      const supabase = getSupabaseClient()

      // Get current stats
      const { data: currentData, error: selectError } = await supabase
        .from('persona_templates')
        .select('usage_count, success_rate, avg_response_time')
        .eq('id', personaId)
        .single()

      if (selectError) throw selectError

      const currentUsage = currentData.usage_count || 0
      const currentSuccessRate = currentData.success_rate || 0
      const currentAvgResponseTime = currentData.avg_response_time || 0

      // Calculate new averages
      const newUsageCount = currentUsage + 1
      const newSuccessRate = stats.success !== undefined 
        ? ((currentSuccessRate * currentUsage) + (stats.success ? 1 : 0)) / newUsageCount
        : currentSuccessRate
      const newAvgResponseTime = stats.responseTime !== undefined
        ? ((currentAvgResponseTime * currentUsage) + stats.responseTime) / newUsageCount
        : currentAvgResponseTime

      const { data, error } = await supabase
        .from('persona_templates')
        .update({
          usage_count: newUsageCount,
          success_rate: newSuccessRate,
          avg_response_time: newAvgResponseTime,
          updated_at: new Date().toISOString()
        })
        .eq('id', personaId)
        .select()
        .single()

      if (error) throw error

      this.completeOperation(operation)
      console.log('[PERSONA DB] Usage updated:', {
        personaId,
        newUsageCount,
        newSuccessRate: Math.round(newSuccessRate * 100) / 100,
        newAvgResponseTime: Math.round(newAvgResponseTime)
      })

      return data
    } catch (error) {
      this.completeOperation(operation, error)
      throw error
    }
  }

  // ============================================
  // ANALYTICS AND REPORTING
  // ============================================

  /**
   * Get persona usage analytics
   */
  async getPersonaAnalytics(
    timeRange: 'day' | 'week' | 'month' = 'week',
    personaId?: string
  ) {
    const operation = this.startOperation('select', 'analytics')
    
    try {
      // This would typically query analytics tables
      // For now, return mock data structure
      const analytics = {
        timeRange,
        personaId,
        usage: {
          totalSessions: 0,
          totalMessages: 0,
          averageSessionLength: 0,
          mostUsedMode: null as 'formal' | 'casual' | null
        },
        performance: {
          averageResponseTime: 0,
          successRate: 0,
          errorRate: 0
        },
        personas: [] as Array<{
          personaId: string
          name: string
          usage: number
          performance: number
        }>
      }

      this.completeOperation(operation)
      return analytics
    } catch (error) {
      this.completeOperation(operation, error)
      throw error
    }
  }

  // ============================================
  // CACHE MANAGEMENT
  // ============================================

  private getFromCache(key: string) {
    const cached = this.queryCache.get(key)
    if (!cached) return null
    
    if (Date.now() > cached.timestamp + cached.ttl) {
      this.queryCache.delete(key)
      return null
    }
    
    return cached.data
  }

  private setCache(key: string, data: any, ttl: number) {
    this.queryCache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    })
  }

  private clearCache(pattern?: string) {
    if (pattern) {
      for (const [key] of this.queryCache.entries()) {
        if (key.includes(pattern)) {
          this.queryCache.delete(key)
        }
      }
    } else {
      this.queryCache.clear()
    }
  }

  // ============================================
  // OPERATION TRACKING
  // ============================================

  private startOperation(
    operation: string,
    table: string,
    personaContext?: DatabasePersonaContext
  ): EnhancedDatabaseOperation {
    const op: EnhancedDatabaseOperation = {
      operation,
      table,
      personaContext,
      performance: {
        startTime: Date.now()
      },
      metadata: {}
    }
    
    this.operationHistory.push(op)
    this.performanceMetrics.totalOperations++
    
    if (personaContext) {
      this.performanceMetrics.personaAwareOperations++
    }
    
    return op
  }

  private completeOperation(
    operation: EnhancedDatabaseOperation,
    error?: any,
    cacheHit = false
  ) {
    operation.performance.endTime = Date.now()
    operation.performance.duration = operation.performance.endTime - operation.performance.startTime
    operation.performance.cacheHit = cacheHit
    
    if (cacheHit) {
      const totalOps = this.performanceMetrics.totalOperations
      this.performanceMetrics.cacheHitRate = 
        ((this.performanceMetrics.cacheHitRate * (totalOps - 1)) + 1) / totalOps
    }
    
    // Update average response time
    const totalOps = this.performanceMetrics.totalOperations
    this.performanceMetrics.averageResponseTime = 
      ((this.performanceMetrics.averageResponseTime * (totalOps - 1)) + operation.performance.duration!) / totalOps
    
    if (error) {
      operation.metadata.error = error instanceof Error ? error.message : String(error)
    }
    
    // Keep only last 100 operations
    if (this.operationHistory.length > 100) {
      this.operationHistory = this.operationHistory.slice(-100)
    }
  }

  // ============================================
  // UTILITIES AND STATUS
  // ============================================

  getPerformanceMetrics() {
    return {
      ...this.performanceMetrics,
      cacheSize: this.queryCache.size,
      recentOperations: this.operationHistory.slice(-10)
    }
  }

  clearAllCaches() {
    this.clearCache()
    console.log('[PERSONA DB] All caches cleared')
  }

  getHealthStatus() {
    return {
      connected: true, // Simple check, could be enhanced
      cacheHealth: this.queryCache.size < 1000, // Prevent memory bloat
      performanceHealth: this.performanceMetrics.averageResponseTime < 1000, // Under 1 second
      operationHistory: this.operationHistory.length,
      timestamp: Date.now()
    }
  }
}

// ============================================
// SINGLETON EXPORT
// ============================================

export const personaAwareDB = PersonaAwareDatabaseManager.getInstance()

// Convenience functions
export async function createPersonaAwareSession(
  title: string,
  personaContext: DatabasePersonaContext,
  options?: {
    isProject?: boolean
    academicLevel?: string
    discipline?: string
    citationStyle?: string
  }
) {
  return personaAwareDB.createChatSession(title, personaContext, options)
}

export async function savePersonaAwareMessage(
  sessionId: string,
  message: {
    role: 'user' | 'assistant'
    content: string
    parts?: any[]
    artifacts?: string[]
  },
  personaContext: DatabasePersonaContext
) {
  return personaAwareDB.saveMessage(sessionId, message, personaContext)
}

export async function getPersonaAwareSessions(
  userId: string,
  filters?: {
    chatMode?: 'formal' | 'casual'
    personaId?: string
    isProject?: boolean
    limit?: number
    offset?: number
  }
) {
  return personaAwareDB.getChatSessions(userId, filters)
}