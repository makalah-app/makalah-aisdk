// ============================================
// MAKALAH AI: Approval Workflow Middleware
// ============================================
// Task P07.4 Implementation: Workflow middleware untuk persona-aware approval integration
// Created: August 2025
// Features: Middleware integration, Next.js compatibility, AI SDK workflow support

import { NextRequest, NextResponse } from 'next/server'
import type { PersonaTemplate } from '@/types/persona'
import { 
  personaApprovalGates, 
  type PersonaApprovalContext, 
  type ApprovalGateResult 
} from '@/lib/approval/persona-gates'
import { createApprovalContext } from '@/middleware/approval-gates'
import { logPersonaEvent } from '@/lib/audit/persona-logging'

// ============================================
// WORKFLOW MIDDLEWARE TYPES
// ============================================

export interface ApprovalWorkflowContext {
  request: NextRequest
  sessionId: string
  userId?: string | null
  chatMode: 'formal' | 'casual' | null
  personaTemplate?: PersonaTemplate | null
  messageContent: string
  toolCalls?: Array<{ toolName: string; args: Record<string, any> }>
  workflowState?: {
    type: string
    currentPhase: number
    isActive: boolean
    artifacts?: string[]
  }
  metadata?: Record<string, any>
}

export interface WorkflowApprovalResult {
  approved: boolean
  approvalId?: string
  reason: string
  response?: NextResponse
  continueProcessing: boolean
  waitForApproval: boolean
  estimatedWaitTime?: number
}

// ============================================
// APPROVAL WORKFLOW MIDDLEWARE
// ============================================

export class ApprovalWorkflowMiddleware {
  private static instance: ApprovalWorkflowMiddleware
  private enabledRoutes: Set<string> = new Set([
    '/api/chat',
    '/api/workflow',
    '/api/tools',
    '/api/personas'
  ])
  private bypassRoutes: Set<string> = new Set([
    '/api/approval',
    '/api/status',
    '/api/health'
  ])

  private constructor() {}

  static getInstance(): ApprovalWorkflowMiddleware {
    if (!this.instance) {
      this.instance = new ApprovalWorkflowMiddleware()
    }
    return this.instance
  }

  // ============================================
  // MIDDLEWARE EXECUTION
  // ============================================

  async processRequest(context: ApprovalWorkflowContext): Promise<WorkflowApprovalResult> {
    const { request, sessionId, chatMode, personaTemplate, messageContent } = context

    console.log('[APPROVAL WORKFLOW] Processing request:', {
      url: request.url,
      method: request.method,
      sessionId,
      chatMode,
      personaId: personaTemplate?.id,
      messageLength: messageContent.length
    })

    // Check if route requires approval processing
    const pathname = new URL(request.url).pathname
    if (this.bypassRoutes.has(pathname)) {
      return {
        approved: true,
        reason: 'Route bypassed approval workflow',
        continueProcessing: true,
        waitForApproval: false
      }
    }

    if (!this.enabledRoutes.has(pathname) && !this.isEnabledPattern(pathname)) {
      return {
        approved: true,
        reason: 'Route not subject to approval workflow',
        continueProcessing: true,
        waitForApproval: false
      }
    }

    // Create enhanced approval context
    const approvalContext = this.createPersonaApprovalContext(context)
    
    // Evaluate approval requirements
    const approvalResult = await personaApprovalGates.evaluatePersonaApproval(approvalContext)

    console.log('[APPROVAL WORKFLOW] Approval result:', {
      approved: approvalResult.approved,
      approvalId: approvalResult.approvalId,
      reason: approvalResult.reason,
      triggeredRules: approvalResult.triggeredRules,
      waitTime: approvalResult.estimatedWaitTime
    })

    if (approvalResult.approved) {
      return {
        approved: true,
        reason: approvalResult.reason,
        continueProcessing: true,
        waitForApproval: false
      }
    }

    // Create approval pending response
    const pendingResponse = this.createApprovalPendingResponse(approvalResult, context)

    return {
      approved: false,
      approvalId: approvalResult.approvalId,
      reason: approvalResult.reason,
      response: pendingResponse,
      continueProcessing: false,
      waitForApproval: true,
      estimatedWaitTime: approvalResult.estimatedWaitTime
    }
  }

  // ============================================
  // CONTEXT TRANSFORMATION
  // ============================================

  private createPersonaApprovalContext(context: ApprovalWorkflowContext): PersonaApprovalContext {
    return {
      sessionId: context.sessionId,
      userId: context.userId,
      chatMode: context.chatMode,
      personaTemplate: context.personaTemplate,
      messageContent: context.messageContent,
      toolCalls: context.toolCalls || [],
      workflowPhase: context.workflowState?.currentPhase || null,
      isFirstMessage: false, // TODO: Determine from context
      
      // Enhanced context
      workflowState: context.workflowState,
      aiProviderContext: {
        primaryProvider: 'openrouter',
        fallbackProvider: 'openai',
        modelConfiguration: this.getModelConfiguration(context)
      },
      conversationContext: this.getConversationContext(context),
    }
  }

  private getModelConfiguration(context: ApprovalWorkflowContext): Record<string, any> {
    // Extract model config from persona template
    if (context.personaTemplate?.configuration) {
      return {
        temperature: context.personaTemplate.configuration.temperature || 0.1,
        maxTokens: context.personaTemplate.configuration.max_tokens || 2000,
        toolsEnabled: context.personaTemplate.configuration.tools_enabled || []
      }
    }

    // Default configuration based on chat mode
    return {
      temperature: context.chatMode === 'casual' ? 0.3 : 0.1,
      maxTokens: 2000,
      toolsEnabled: ['web_search', 'artifact_store', 'cite_manager']
    }
  }

  private getConversationContext(context: ApprovalWorkflowContext): PersonaApprovalContext['conversationContext'] {
    // In real implementation, extract from session data
    return {
      messageCount: 1, // TODO: Get from session
      tokensUsed: 0,   // TODO: Calculate
      averageResponseTime: 2000,  // TODO: Calculate
      lastToolUsed: context.toolCalls?.[context.toolCalls.length - 1]?.toolName
    }
  }

  // ============================================
  // RESPONSE GENERATION
  // ============================================

  private createApprovalPendingResponse(
    result: ApprovalGateResult, 
    context: ApprovalWorkflowContext
  ): NextResponse {
    const responseData = {
      success: false,
      status: 'approval_pending',
      message: this.getApprovalPendingMessage(context.chatMode, result),
      data: {
        approvalId: result.approvalId,
        reason: result.reason,
        estimatedWaitTime: result.estimatedWaitTime,
        triggeredRules: result.triggeredRules,
        requiredApprovers: result.requiredApprovers,
        bypassOptions: result.bypassOptions,
        sessionId: context.sessionId,
        personaInfo: context.personaTemplate ? {
          id: context.personaTemplate.id,
          name: context.personaTemplate.name,
          mode: context.personaTemplate.mode
        } : null
      },
      actions: this.getAvailableActions(result, context),
      ui: {
        showWaitingIndicator: true,
        allowCancel: true,
        showProgressBar: result.estimatedWaitTime > 30000, // Show for >30s wait
        notificationSettings: {
          showDesktopNotification: true,
          playSound: result.estimatedWaitTime > 60000, // Sound for >1min wait
          priority: this.getNotificationPriority(result)
        }
      }
    }

    const headers = {
      'Content-Type': 'application/json',
      'X-Approval-Required': 'true',
      'X-Approval-ID': result.approvalId || 'unknown',
      'X-Estimated-Wait': result.estimatedWaitTime?.toString() || '300000',
      'Cache-Control': 'no-cache, no-store, must-revalidate'
    }

    // Different status codes based on context
    let statusCode = 202 // Accepted but pending approval
    
    if (result.triggeredRules.includes('Critical content risk detected')) {
      statusCode = 403 // Forbidden pending security review
    }

    return NextResponse.json(responseData, { 
      status: statusCode, 
      headers 
    })
  }

  private getApprovalPendingMessage(
    chatMode: 'formal' | 'casual' | null, 
    result: ApprovalGateResult
  ): string {
    const baseMessages = {
      formal: "Permintaan Anda memerlukan persetujuan sebelum diproses. Mohon menunggu konfirmasi dari supervisor.",
      casual: "Permintaan lo butuh approval dulu nih. Tunggu sebentar ya, lagi diproses sama yang berwenang."
    }

    const baseMessage = chatMode && baseMessages[chatMode] 
      ? baseMessages[chatMode]
      : baseMessages.formal

    // Add context-specific information
    const additionalInfo = []
    
    if (result.estimatedWaitTime && result.estimatedWaitTime > 60000) {
      const minutes = Math.ceil(result.estimatedWaitTime / 60000)
      additionalInfo.push(
        chatMode === 'casual' 
          ? `Estimasi waktu tunggu: ${minutes} menit.`
          : `Estimated waiting time: ${minutes} minutes.`
      )
    }

    if (result.bypassOptions?.supervisorBypass) {
      additionalInfo.push(
        chatMode === 'casual'
          ? "Alternatif: bisa minta bypass sama supervisor kalo urgent."
          : "Alternative: supervisor bypass available for urgent requests."
      )
    }

    return [baseMessage, ...additionalInfo].join(' ')
  }

  private getAvailableActions(
    result: ApprovalGateResult,
    context: ApprovalWorkflowContext
  ): Array<{
    id: string
    label: string
    type: string
    enabled: boolean
    description?: string
  }> {
    const actions = [
      {
        id: 'cancel_request',
        label: context.chatMode === 'casual' ? 'Batalin Aja' : 'Cancel Request',
        type: 'cancel',
        enabled: true,
        description: 'Cancel the current request and return to normal chat'
      },
      {
        id: 'check_status',
        label: context.chatMode === 'casual' ? 'Cek Status' : 'Check Status',
        type: 'status',
        enabled: true,
        description: 'Check the current approval status'
      }
    ]

    // Add bypass options if available
    if (result.bypassOptions?.supervisorBypass) {
      actions.push({
        id: 'request_supervisor_bypass',
        label: context.chatMode === 'casual' ? 'Minta Bypass Supervisor' : 'Request Supervisor Bypass',
        type: 'bypass',
        enabled: true,
        description: 'Request immediate supervisor review for bypass'
      })
    }

    if (result.bypassOptions?.emergencyBypass) {
      actions.push({
        id: 'emergency_bypass',
        label: context.chatMode === 'casual' ? 'Emergency Bypass' : 'Emergency Bypass',
        type: 'emergency',
        enabled: true,
        description: 'Use emergency bypass (requires justification)'
      })
    }

    return actions
  }

  private getNotificationPriority(result: ApprovalGateResult): 'low' | 'normal' | 'high' | 'urgent' {
    if (result.triggeredRules.some(rule => rule.includes('critical') || rule.includes('security'))) {
      return 'urgent'
    }
    
    if (result.estimatedWaitTime && result.estimatedWaitTime > 15 * 60 * 1000) { // >15 minutes
      return 'high'
    }
    
    if (result.triggeredRules.length > 2) {
      return 'high'
    }
    
    return 'normal'
  }

  // ============================================
  // ROUTE PATTERN MATCHING
  // ============================================

  private isEnabledPattern(pathname: string): boolean {
    const patterns = [
      /^\/api\/chat/,
      /^\/api\/workflow/,
      /^\/api\/tools/,
      /^\/api\/personas/,
      /^\/api\/admin/
    ]
    
    return patterns.some(pattern => pattern.test(pathname))
  }

  // ============================================
  // CONFIGURATION MANAGEMENT
  // ============================================

  addEnabledRoute(route: string) {
    this.enabledRoutes.add(route)
    console.log('[APPROVAL WORKFLOW] Route added to approval workflow:', route)
  }

  removeEnabledRoute(route: string) {
    this.enabledRoutes.delete(route)
    console.log('[APPROVAL WORKFLOW] Route removed from approval workflow:', route)
  }

  addBypassRoute(route: string) {
    this.bypassRoutes.add(route)
    console.log('[APPROVAL WORKFLOW] Route added to bypass list:', route)
  }

  getConfiguration() {
    return {
      enabledRoutes: Array.from(this.enabledRoutes),
      bypassRoutes: Array.from(this.bypassRoutes),
      totalProcessedRequests: 0, // TODO: Add counter
      averageProcessingTime: 0   // TODO: Add tracking
    }
  }
}

// ============================================
// MIDDLEWARE INTEGRATION HELPERS
// ============================================

/**
 * Next.js middleware integration helper
 */
export async function withApprovalWorkflow(
  request: NextRequest,
  context: ApprovalWorkflowContext,
  handler: () => Promise<NextResponse>
): Promise<NextResponse> {
  const middleware = ApprovalWorkflowMiddleware.getInstance()
  
  try {
    const result = await middleware.processRequest(context)
    
    if (result.continueProcessing) {
      // Log successful approval
      logPersonaEvent(
        'approval_granted', 
        `Request automatically approved: ${result.reason}`,
        {
          sessionId: context.sessionId,
          chatMode: context.chatMode,
          personaId: context.personaTemplate?.id,
          timestamp: new Date().toISOString()
        },
        {
          route: new URL(request.url).pathname,
          automatic: true
        }
      )
      
      return await handler()
    }
    
    if (result.response) {
      // Log approval requirement
      logPersonaEvent(
        'approval_requested',
        `Request requires approval: ${result.reason}`,
        {
          sessionId: context.sessionId,
          chatMode: context.chatMode,
          personaId: context.personaTemplate?.id,
          timestamp: new Date().toISOString()
        },
        {
          approvalId: result.approvalId,
          route: new URL(request.url).pathname,
          estimatedWaitTime: result.estimatedWaitTime
        }
      )
      
      return result.response
    }
    
    // Fallback - should not reach here
    return new NextResponse(
      JSON.stringify({ error: 'Approval workflow error' }), 
      { status: 500 }
    )
    
  } catch (error) {
    console.error('[APPROVAL WORKFLOW] Middleware error:', error)
    
    // Log error
    logPersonaEvent(
      'error_occurred',
      `Approval workflow error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      {
        sessionId: context.sessionId,
        chatMode: context.chatMode,
        timestamp: new Date().toISOString()
      },
      {
        error: error instanceof Error ? error.message : 'Unknown error',
        route: new URL(request.url).pathname
      },
      'error'
    )
    
    // Fail open - allow request to proceed
    return await handler()
  }
}

/**
 * Create approval context from request
 */
export function createApprovalWorkflowContext(
  request: NextRequest,
  sessionId: string,
  messageContent: string,
  options: {
    userId?: string | null
    chatMode?: 'formal' | 'casual' | null
    personaTemplate?: PersonaTemplate | null
    toolCalls?: Array<{ toolName: string; args: Record<string, any> }>
    workflowState?: {
      type: string
      currentPhase: number
      isActive: boolean
      artifacts?: string[]
    }
    metadata?: Record<string, any>
  } = {}
): ApprovalWorkflowContext {
  return {
    request,
    sessionId,
    userId: options.userId,
    chatMode: options.chatMode,
    personaTemplate: options.personaTemplate,
    messageContent,
    toolCalls: options.toolCalls,
    workflowState: options.workflowState,
    metadata: options.metadata
  }
}

// ============================================
// SINGLETON EXPORT
// ============================================

export const approvalWorkflowMiddleware = ApprovalWorkflowMiddleware.getInstance()

// Convenience functions
export function addApprovalRoute(route: string) {
  approvalWorkflowMiddleware.addEnabledRoute(route)
}

export function addBypassRoute(route: string) {
  approvalWorkflowMiddleware.addBypassRoute(route)
}

export function getApprovalWorkflowConfig() {
  return approvalWorkflowMiddleware.getConfiguration()
}