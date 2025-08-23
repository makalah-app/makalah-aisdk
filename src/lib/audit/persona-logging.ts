// ============================================
// MAKALAH AI: Persona-Aware Audit Logging
// ============================================
// Task P07.2 Implementation: Audit logging dengan persona context untuk compliance
// Created: August 2025
// Features: Comprehensive logging, persona context tracking, compliance reporting

import type { PersonaTemplate } from '@/types/persona'

// ============================================
// AUDIT EVENT TYPES
// ============================================

export type AuditEventType = 
  | 'session_created' 
  | 'session_updated'
  | 'session_ended'
  | 'persona_selected'
  | 'persona_switched'
  | 'chat_mode_changed'
  | 'workflow_started'
  | 'workflow_phase_completed'
  | 'tool_executed'
  | 'approval_requested'
  | 'approval_granted'
  | 'approval_denied'
  | 'preferences_updated'
  | 'error_occurred'
  | 'security_event'
  | 'performance_issue'

export type AuditSeverity = 'info' | 'warn' | 'error' | 'critical'

export interface PersonaAuditContext {
  sessionId?: string
  userId?: string | null
  chatMode?: 'formal' | 'casual' | null
  personaId?: string | null
  personaName?: string | null
  personaMode?: 'Research' | 'Writing' | 'Review' | null
  workflowPhase?: number | null
  workflowType?: string | null
  ipAddress?: string
  userAgent?: string
  timestamp: string
}

export interface AuditEvent {
  id: string
  eventType: AuditEventType
  severity: AuditSeverity
  message: string
  personaContext: PersonaAuditContext
  eventData: Record<string, any>
  metadata: {
    source: string
    version: string
    environment: string
    correlationId?: string
  }
  timestamp: string
  expiresAt?: string // For data retention
}

export interface AuditQuery {
  eventType?: AuditEventType[]
  severity?: AuditSeverity[]
  sessionId?: string
  userId?: string
  personaId?: string
  chatMode?: 'formal' | 'casual'
  startDate?: string
  endDate?: string
  limit?: number
  offset?: number
}

// ============================================
// PERSONA AUDIT LOGGER
// ============================================

export class PersonaAuditLogger {
  private static instance: PersonaAuditLogger
  private auditLogs: AuditEvent[] = []
  private maxLogSize = 10000 // Maximum logs in memory
  private retentionDays = 90 // Default retention period
  private enabledEventTypes = new Set<AuditEventType>([
    'session_created',
    'session_updated', 
    'persona_selected',
    'persona_switched',
    'chat_mode_changed',
    'workflow_started',
    'tool_executed',
    'approval_requested',
    'approval_granted',
    'approval_denied',
    'preferences_updated',
    'error_occurred',
    'security_event'
  ])

  private constructor() {
    this.setupCleanupInterval()
  }

  static getInstance(): PersonaAuditLogger {
    if (!this.instance) {
      this.instance = new PersonaAuditLogger()
    }
    return this.instance
  }

  // ============================================
  // LOGGING METHODS
  // ============================================

  /**
   * Log persona-related audit event
   */
  logEvent(
    eventType: AuditEventType,
    message: string,
    personaContext: Partial<PersonaAuditContext>,
    eventData: Record<string, any> = {},
    severity: AuditSeverity = 'info',
    options: {
      correlationId?: string
      retentionDays?: number
      source?: string
    } = {}
  ): string {
    // Check if event type is enabled
    if (!this.enabledEventTypes.has(eventType)) {
      return ''
    }

    const eventId = this.generateEventId()
    const now = new Date()
    const expiresAt = new Date(now.getTime() + (options.retentionDays || this.retentionDays) * 24 * 60 * 60 * 1000)

    const auditEvent: AuditEvent = {
      id: eventId,
      eventType,
      severity,
      message,
      personaContext: {
        ...personaContext,
        timestamp: personaContext.timestamp || now.toISOString()
      },
      eventData: this.sanitizeEventData(eventData),
      metadata: {
        source: options.source || 'makalah-ai',
        version: '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        correlationId: options.correlationId
      },
      timestamp: now.toISOString(),
      expiresAt: expiresAt.toISOString()
    }

    // Add to memory storage
    this.auditLogs.push(auditEvent)
    
    // Maintain size limit
    if (this.auditLogs.length > this.maxLogSize) {
      this.auditLogs = this.auditLogs.slice(-this.maxLogSize)
    }

    // Console log for development
    if (process.env.NODE_ENV === 'development') {
      console.log(`[PERSONA AUDIT] ${severity.toUpperCase()} - ${eventType}:`, {
        message,
        sessionId: personaContext.sessionId,
        chatMode: personaContext.chatMode,
        personaId: personaContext.personaId,
        eventId
      })
    }

    // In production, this would send to external logging service
    if (severity === 'critical' || severity === 'error') {
      this.handleCriticalEvent(auditEvent)
    }

    return eventId
  }

  // ============================================
  // CONVENIENCE LOGGING METHODS
  // ============================================

  /**
   * Log session-related events
   */
  logSessionEvent(
    eventType: 'session_created' | 'session_updated' | 'session_ended',
    sessionId: string,
    personaContext: Partial<PersonaAuditContext>,
    eventData: Record<string, any> = {}
  ) {
    return this.logEvent(
      eventType,
      `Session ${eventType.replace('session_', '')}: ${sessionId}`,
      { ...personaContext, sessionId },
      eventData,
      'info'
    )
  }

  /**
   * Log persona selection/switching
   */
  logPersonaEvent(
    eventType: 'persona_selected' | 'persona_switched',
    personaId: string,
    personaName: string,
    personaContext: Partial<PersonaAuditContext>,
    additionalData: Record<string, any> = {}
  ) {
    return this.logEvent(
      eventType,
      `Persona ${eventType === 'persona_selected' ? 'selected' : 'switched to'}: ${personaName} (${personaId})`,
      { ...personaContext, personaId, personaName },
      additionalData,
      'info'
    )
  }

  /**
   * Log chat mode changes
   */
  logChatModeChange(
    fromMode: 'formal' | 'casual' | null,
    toMode: 'formal' | 'casual',
    personaContext: Partial<PersonaAuditContext>
  ) {
    return this.logEvent(
      'chat_mode_changed',
      `Chat mode changed from ${fromMode || 'none'} to ${toMode}`,
      { ...personaContext, chatMode: toMode },
      { previousMode: fromMode, newMode: toMode },
      'info'
    )
  }

  /**
   * Log workflow events
   */
  logWorkflowEvent(
    eventType: 'workflow_started' | 'workflow_phase_completed',
    workflowType: string,
    phase: number,
    personaContext: Partial<PersonaAuditContext>,
    eventData: Record<string, any> = {}
  ) {
    const message = eventType === 'workflow_started' 
      ? `Workflow started: ${workflowType}`
      : `Workflow phase ${phase} completed: ${workflowType}`

    return this.logEvent(
      eventType,
      message,
      { ...personaContext, workflowPhase: phase, workflowType },
      { workflowType, phase, ...eventData },
      'info'
    )
  }

  /**
   * Log tool execution
   */
  logToolExecution(
    toolName: string,
    success: boolean,
    duration: number,
    personaContext: Partial<PersonaAuditContext>,
    toolArgs: Record<string, any> = {}
  ) {
    return this.logEvent(
      'tool_executed',
      `Tool ${toolName} ${success ? 'executed successfully' : 'failed'} (${duration}ms)`,
      personaContext,
      { 
        toolName, 
        success, 
        duration,
        args: this.sanitizeEventData(toolArgs)
      },
      success ? 'info' : 'warn'
    )
  }

  /**
   * Log approval events
   */
  logApprovalEvent(
    eventType: 'approval_requested' | 'approval_granted' | 'approval_denied',
    approvalId: string,
    reason: string,
    personaContext: Partial<PersonaAuditContext>,
    eventData: Record<string, any> = {}
  ) {
    const severity: AuditSeverity = eventType === 'approval_denied' ? 'warn' : 'info'
    
    return this.logEvent(
      eventType,
      `Approval ${eventType.replace('approval_', '')}: ${approvalId} - ${reason}`,
      personaContext,
      { approvalId, reason, ...eventData },
      severity
    )
  }

  /**
   * Log errors and security events
   */
  logError(
    error: Error | string,
    personaContext: Partial<PersonaAuditContext>,
    eventData: Record<string, any> = {},
    severity: AuditSeverity = 'error'
  ) {
    const errorMessage = error instanceof Error ? error.message : error
    const errorStack = error instanceof Error ? error.stack : undefined

    return this.logEvent(
      'error_occurred',
      `Error: ${errorMessage}`,
      personaContext,
      { 
        errorMessage,
        errorStack,
        ...eventData
      },
      severity
    )
  }

  logSecurityEvent(
    securityType: string,
    description: string,
    personaContext: Partial<PersonaAuditContext>,
    eventData: Record<string, any> = {}
  ) {
    return this.logEvent(
      'security_event',
      `Security: ${securityType} - ${description}`,
      personaContext,
      { securityType, description, ...eventData },
      'warn'
    )
  }

  // ============================================
  // QUERY AND RETRIEVAL
  // ============================================

  /**
   * Query audit logs
   */
  queryLogs(query: AuditQuery): {
    events: AuditEvent[]
    totalCount: number
    hasMore: boolean
  } {
    let filteredLogs = [...this.auditLogs]

    // Apply filters
    if (query.eventType?.length) {
      filteredLogs = filteredLogs.filter(log => query.eventType!.includes(log.eventType))
    }

    if (query.severity?.length) {
      filteredLogs = filteredLogs.filter(log => query.severity!.includes(log.severity))
    }

    if (query.sessionId) {
      filteredLogs = filteredLogs.filter(log => log.personaContext.sessionId === query.sessionId)
    }

    if (query.userId) {
      filteredLogs = filteredLogs.filter(log => log.personaContext.userId === query.userId)
    }

    if (query.personaId) {
      filteredLogs = filteredLogs.filter(log => log.personaContext.personaId === query.personaId)
    }

    if (query.chatMode) {
      filteredLogs = filteredLogs.filter(log => log.personaContext.chatMode === query.chatMode)
    }

    if (query.startDate) {
      filteredLogs = filteredLogs.filter(log => log.timestamp >= query.startDate!)
    }

    if (query.endDate) {
      filteredLogs = filteredLogs.filter(log => log.timestamp <= query.endDate!)
    }

    // Sort by timestamp (newest first)
    filteredLogs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

    // Apply pagination
    const offset = query.offset || 0
    const limit = query.limit || 50
    const paginatedLogs = filteredLogs.slice(offset, offset + limit)

    return {
      events: paginatedLogs,
      totalCount: filteredLogs.length,
      hasMore: offset + paginatedLogs.length < filteredLogs.length
    }
  }

  /**
   * Get logs for specific session
   */
  getSessionLogs(sessionId: string, limit = 100): AuditEvent[] {
    return this.queryLogs({ sessionId, limit }).events
  }

  /**
   * Get logs for specific user
   */
  getUserLogs(userId: string, limit = 100): AuditEvent[] {
    return this.queryLogs({ userId, limit }).events
  }

  /**
   * Get logs for specific persona
   */
  getPersonaLogs(personaId: string, limit = 100): AuditEvent[] {
    return this.queryLogs({ personaId, limit }).events
  }

  // ============================================
  // ANALYTICS AND REPORTING
  // ============================================

  /**
   * Generate audit summary report
   */
  generateSummaryReport(timeRange: 'hour' | 'day' | 'week' | 'month' = 'day'): {
    summary: {
      totalEvents: number
      eventsByType: Record<AuditEventType, number>
      eventsBySeverity: Record<AuditSeverity, number>
      uniqueSessions: number
      uniqueUsers: number
      uniquePersonas: number
    }
    trends: {
      formalChatModeUsage: number
      casualChatModeUsage: number
      mostUsedPersonas: Array<{ personaId: string; usage: number }>
      errorRate: number
      approvalRate: number
    }
    timeRange: string
    generatedAt: string
  } {
    // Calculate time range
    const now = new Date()
    const timeRangeMs = {
      hour: 60 * 60 * 1000,
      day: 24 * 60 * 60 * 1000,
      week: 7 * 24 * 60 * 60 * 1000,
      month: 30 * 24 * 60 * 60 * 1000
    }
    
    const startTime = new Date(now.getTime() - timeRangeMs[timeRange])
    const recentLogs = this.auditLogs.filter(log => 
      new Date(log.timestamp) >= startTime
    )

    // Calculate summary statistics
    const eventsByType: Record<string, number> = {}
    const eventsBySeverity: Record<string, number> = {}
    const uniqueSessions = new Set<string>()
    const uniqueUsers = new Set<string>()
    const uniquePersonas = new Set<string>()
    const personaUsage: Record<string, number> = {}
    
    let formalUsage = 0
    let casualUsage = 0
    let errorCount = 0
    let approvalCount = 0
    let approvalGrantedCount = 0

    recentLogs.forEach(log => {
      // Count by type and severity
      eventsByType[log.eventType] = (eventsByType[log.eventType] || 0) + 1
      eventsBySeverity[log.severity] = (eventsBySeverity[log.severity] || 0) + 1

      // Track unique entities
      if (log.personaContext.sessionId) uniqueSessions.add(log.personaContext.sessionId)
      if (log.personaContext.userId) uniqueUsers.add(log.personaContext.userId)
      if (log.personaContext.personaId) {
        uniquePersonas.add(log.personaContext.personaId)
        personaUsage[log.personaContext.personaId] = (personaUsage[log.personaContext.personaId] || 0) + 1
      }

      // Track chat mode usage
      if (log.personaContext.chatMode === 'formal') formalUsage++
      if (log.personaContext.chatMode === 'casual') casualUsage++

      // Track errors and approvals
      if (log.eventType === 'error_occurred') errorCount++
      if (log.eventType.startsWith('approval_')) {
        approvalCount++
        if (log.eventType === 'approval_granted') approvalGrantedCount++
      }
    })

    const mostUsedPersonas = Object.entries(personaUsage)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([personaId, usage]) => ({ personaId, usage }))

    return {
      summary: {
        totalEvents: recentLogs.length,
        eventsByType: eventsByType as Record<AuditEventType, number>,
        eventsBySeverity: eventsBySeverity as Record<AuditSeverity, number>,
        uniqueSessions: uniqueSessions.size,
        uniqueUsers: uniqueUsers.size,
        uniquePersonas: uniquePersonas.size
      },
      trends: {
        formalChatModeUsage: formalUsage,
        casualChatModeUsage: casualUsage,
        mostUsedPersonas,
        errorRate: recentLogs.length > 0 ? (errorCount / recentLogs.length) * 100 : 0,
        approvalRate: approvalCount > 0 ? (approvalGrantedCount / approvalCount) * 100 : 0
      },
      timeRange,
      generatedAt: now.toISOString()
    }
  }

  // ============================================
  // CONFIGURATION AND MANAGEMENT
  // ============================================

  /**
   * Configure enabled event types
   */
  setEnabledEventTypes(eventTypes: AuditEventType[]) {
    this.enabledEventTypes = new Set(eventTypes)
    console.log('[PERSONA AUDIT] Event types updated:', eventTypes.length)
  }

  /**
   * Set retention period
   */
  setRetentionDays(days: number) {
    this.retentionDays = days
    console.log('[PERSONA AUDIT] Retention period set to:', days, 'days')
  }

  /**
   * Get configuration
   */
  getConfiguration() {
    return {
      enabledEventTypes: Array.from(this.enabledEventTypes),
      retentionDays: this.retentionDays,
      maxLogSize: this.maxLogSize,
      currentLogCount: this.auditLogs.length
    }
  }

  // ============================================
  // PRIVATE METHODS
  // ============================================

  private generateEventId(): string {
    return `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private sanitizeEventData(data: Record<string, any>): Record<string, any> {
    const sanitized = { ...data }
    
    // Remove sensitive data
    const sensitiveKeys = ['password', 'token', 'apiKey', 'secret', 'credential']
    sensitiveKeys.forEach(key => {
      if (key in sanitized) {
        sanitized[key] = '[REDACTED]'
      }
    })

    return sanitized
  }

  private handleCriticalEvent(event: AuditEvent) {
    // In production, this would:
    // 1. Send alerts to administrators
    // 2. Log to external security system
    // 3. Trigger incident response if needed
    
    console.error('[PERSONA AUDIT] CRITICAL EVENT:', {
      eventId: event.id,
      eventType: event.eventType,
      message: event.message,
      timestamp: event.timestamp
    })
  }

  private setupCleanupInterval() {
    // Clean up expired logs every hour
    setInterval(() => {
      this.cleanupExpiredLogs()
    }, 60 * 60 * 1000)
  }

  private cleanupExpiredLogs() {
    const now = new Date()
    const initialCount = this.auditLogs.length
    
    this.auditLogs = this.auditLogs.filter(log => 
      !log.expiresAt || new Date(log.expiresAt) > now
    )

    const cleanedCount = initialCount - this.auditLogs.length
    if (cleanedCount > 0) {
      console.log('[PERSONA AUDIT] Cleaned up expired logs:', cleanedCount)
    }
  }
}

// ============================================
// SINGLETON EXPORT AND CONVENIENCE FUNCTIONS
// ============================================

export const personaAuditLogger = PersonaAuditLogger.getInstance()

// Convenience logging functions
export function logPersonaEvent(
  eventType: AuditEventType,
  message: string,
  personaContext: Partial<PersonaAuditContext>,
  eventData?: Record<string, any>,
  severity?: AuditSeverity
) {
  return personaAuditLogger.logEvent(eventType, message, personaContext, eventData, severity)
}

export function logSessionActivity(
  eventType: 'session_created' | 'session_updated' | 'session_ended',
  sessionId: string,
  personaContext: Partial<PersonaAuditContext>,
  eventData?: Record<string, any>
) {
  return personaAuditLogger.logSessionEvent(eventType, sessionId, personaContext, eventData)
}

export function logPersonaSelection(
  personaId: string,
  personaName: string,
  personaContext: Partial<PersonaAuditContext>,
  previousPersonaId?: string
) {
  const eventType = previousPersonaId ? 'persona_switched' : 'persona_selected'
  const additionalData = previousPersonaId ? { previousPersonaId } : {}
  
  return personaAuditLogger.logPersonaEvent(
    eventType,
    personaId,
    personaName,
    personaContext,
    additionalData
  )
}

export function logToolUsage(
  toolName: string,
  success: boolean,
  duration: number,
  personaContext: Partial<PersonaAuditContext>,
  toolArgs?: Record<string, any>
) {
  return personaAuditLogger.logToolExecution(
    toolName,
    success,
    duration,
    personaContext,
    toolArgs
  )
}

export function logPersonaError(
  error: Error | string,
  personaContext: Partial<PersonaAuditContext>,
  eventData?: Record<string, any>,
  severity: AuditSeverity = 'error'
) {
  return personaAuditLogger.logError(error, personaContext, eventData, severity)
}