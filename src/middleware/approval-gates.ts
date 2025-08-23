// ============================================
// MAKALAH AI: Human-in-the-Loop Approval Gates Middleware
// ============================================
// Task P07.1 Implementation: Approval Gate Integration dengan Persona Context
// Created: August 2025
// Features: Persona-aware approval workflows, validation rules, bypass logic

import type { NextRequest, NextResponse } from 'next/server'
import type { PersonaTemplate } from '@/types/persona'

// ============================================
// APPROVAL GATE TYPES
// ============================================

export interface ApprovalContext {
  sessionId: string
  userId?: string | null
  chatMode: 'formal' | 'casual' | null
  personaTemplate?: PersonaTemplate | null
  messageContent: string
  toolCalls?: Array<{
    toolName: string
    args: Record<string, any>
  }>
  workflowPhase?: number | null
  isFirstMessage?: boolean
}

export interface ApprovalRule {
  id: string
  name: string
  description: string
  condition: (context: ApprovalContext) => boolean
  action: 'require_approval' | 'auto_approve' | 'reject'
  personaModes: Array<'formal' | 'casual' | 'all'>
  priority: number // Higher = more priority
}

export interface ApprovalRequest {
  id: string
  context: ApprovalContext
  triggeredRules: ApprovalRule[]
  status: 'pending' | 'approved' | 'rejected' | 'expired'
  createdAt: Date
  expiresAt: Date
  approvedBy?: string
  rejectionReason?: string
}

// ============================================
// BUILT-IN APPROVAL RULES
// ============================================

/**
 * Default approval rules dengan persona awareness
 * Academic mode (formal) memiliki rules yang lebih ketat
 * Casual mode lebih permissive
 */
export const DEFAULT_APPROVAL_RULES: ApprovalRule[] = [
  // FORMAL ACADEMIC MODE RULES - More restrictive
  {
    id: 'formal-external-research',
    name: 'External Research Approval',
    description: 'Require approval for web searches in formal academic mode to ensure source quality',
    condition: (ctx) => {
      return ctx.chatMode === 'formal' && 
             ctx.toolCalls?.some(t => t.toolName === 'web_search') === true
    },
    action: 'require_approval',
    personaModes: ['formal'],
    priority: 100
  },
  
  {
    id: 'formal-citation-modification',
    name: 'Citation Modification Approval',
    description: 'Require approval when modifying citations in formal academic writing',
    condition: (ctx) => {
      return ctx.chatMode === 'formal' && 
             ctx.toolCalls?.some(t => t.toolName === 'cite_manager') === true &&
             ctx.workflowPhase !== null && ctx.workflowPhase >= 6 // Citations/References phase
    },
    action: 'require_approval',
    personaModes: ['formal'],
    priority: 90
  },

  {
    id: 'formal-workflow-phase-skip',
    name: 'Workflow Phase Skip Prevention',
    description: 'Prevent skipping critical workflow phases in academic writing',
    condition: (ctx) => {
      return ctx.chatMode === 'formal' &&
             ctx.workflowPhase !== null &&
             ctx.messageContent.toLowerCase().includes('skip') &&
             (ctx.messageContent.toLowerCase().includes('phase') || 
              ctx.messageContent.toLowerCase().includes('step'))
    },
    action: 'require_approval',
    personaModes: ['formal'],
    priority: 95
  },

  // CASUAL MODE RULES - More permissive
  {
    id: 'casual-sensitive-content',
    name: 'Sensitive Content Check',
    description: 'Basic content filtering for casual conversations',
    condition: (ctx) => {
      const sensitiveKeywords = ['private', 'confidential', 'password', 'secret']
      return ctx.chatMode === 'casual' &&
             sensitiveKeywords.some(keyword => 
               ctx.messageContent.toLowerCase().includes(keyword)
             )
    },
    action: 'require_approval',
    personaModes: ['casual'],
    priority: 50
  },

  // UNIVERSAL RULES - Apply to both modes
  {
    id: 'universal-file-operations',
    name: 'File Operations Approval',
    description: 'Require approval for file system operations regardless of mode',
    condition: (ctx) => {
      return ctx.toolCalls?.some(t => 
        ['file_handler', 'document_processor'].includes(t.toolName)
      ) === true
    },
    action: 'require_approval',
    personaModes: ['all'],
    priority: 80
  },

  {
    id: 'universal-large-content',
    name: 'Large Content Generation',
    description: 'Require approval for very long content generation',
    condition: (ctx) => {
      return ctx.messageContent.length > 5000 || // Large input
             ctx.messageContent.toLowerCase().includes('write') &&
             (ctx.messageContent.toLowerCase().includes('page') ||
              ctx.messageContent.toLowerCase().includes('chapter') ||
              ctx.messageContent.toLowerCase().includes('document'))
    },
    action: 'require_approval',
    personaModes: ['all'],
    priority: 60
  }
]

// ============================================
// APPROVAL GATE ENGINE
// ============================================

export class ApprovalGateEngine {
  private static instance: ApprovalGateEngine
  private rules: ApprovalRule[] = [...DEFAULT_APPROVAL_RULES]
  private pendingApprovals = new Map<string, ApprovalRequest>()
  private approvalHistory: ApprovalRequest[] = []

  private constructor() {}

  static getInstance(): ApprovalGateEngine {
    if (!this.instance) {
      this.instance = new ApprovalGateEngine()
    }
    return this.instance
  }

  /**
   * Evaluate context against approval rules
   */
  async evaluateApproval(context: ApprovalContext): Promise<{
    needsApproval: boolean
    action: 'proceed' | 'require_approval' | 'reject'
    triggeredRules: ApprovalRule[]
    approvalId?: string
  }> {
    // Get applicable rules untuk persona mode
    const applicableRules = this.getApplicableRules(context.chatMode)
    
    // Find triggered rules
    const triggeredRules = applicableRules
      .filter(rule => rule.condition(context))
      .sort((a, b) => b.priority - a.priority) // Sort by priority (higher first)

    console.log('[APPROVAL GATE] Evaluating context:', {
      chatMode: context.chatMode,
      personaId: context.personaTemplate?.id,
      sessionId: context.sessionId,
      applicableRulesCount: applicableRules.length,
      triggeredRulesCount: triggeredRules.length,
      triggeredRuleIds: triggeredRules.map(r => r.id)
    })

    // If no rules triggered, proceed
    if (triggeredRules.length === 0) {
      return {
        needsApproval: false,
        action: 'proceed',
        triggeredRules: []
      }
    }

    // Check highest priority rule action
    const highestPriorityRule = triggeredRules[0]
    
    if (highestPriorityRule.action === 'reject') {
      console.log('[APPROVAL GATE] Request rejected by rule:', highestPriorityRule.id)
      return {
        needsApproval: false,
        action: 'reject',
        triggeredRules
      }
    }

    if (highestPriorityRule.action === 'auto_approve') {
      console.log('[APPROVAL GATE] Request auto-approved by rule:', highestPriorityRule.id)
      return {
        needsApproval: false,
        action: 'proceed',
        triggeredRules
      }
    }

    // Create approval request
    const approvalId = this.generateApprovalId()
    const approvalRequest: ApprovalRequest = {
      id: approvalId,
      context,
      triggeredRules,
      status: 'pending',
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 30 * 60 * 1000) // 30 minutes expiry
    }

    this.pendingApprovals.set(approvalId, approvalRequest)

    console.log('[APPROVAL GATE] Approval required:', {
      approvalId,
      triggeredRules: triggeredRules.map(r => r.name),
      expiresAt: approvalRequest.expiresAt
    })

    return {
      needsApproval: true,
      action: 'require_approval',
      triggeredRules,
      approvalId
    }
  }

  /**
   * Get rules applicable to persona mode
   */
  private getApplicableRules(chatMode: 'formal' | 'casual' | null): ApprovalRule[] {
    return this.rules.filter(rule => {
      if (rule.personaModes.includes('all')) return true
      if (!chatMode) return rule.personaModes.includes('formal') // Default to formal
      return rule.personaModes.includes(chatMode)
    })
  }

  /**
   * Process approval decision
   */
  async processApproval(
    approvalId: string, 
    decision: 'approve' | 'reject',
    userId?: string,
    reason?: string
  ): Promise<{
    success: boolean
    message: string
    approvalRequest?: ApprovalRequest
  }> {
    const request = this.pendingApprovals.get(approvalId)
    
    if (!request) {
      return {
        success: false,
        message: 'Approval request not found or already processed'
      }
    }

    // Check if expired
    if (new Date() > request.expiresAt) {
      request.status = 'expired'
      this.pendingApprovals.delete(approvalId)
      this.approvalHistory.push(request)
      
      return {
        success: false,
        message: 'Approval request has expired',
        approvalRequest: request
      }
    }

    // Process decision
    request.status = decision === 'approve' ? 'approved' : 'rejected'
    request.approvedBy = userId || 'system'
    if (reason) request.rejectionReason = reason

    // Move from pending to history
    this.pendingApprovals.delete(approvalId)
    this.approvalHistory.push(request)

    console.log('[APPROVAL GATE] Decision processed:', {
      approvalId,
      decision,
      userId,
      reason,
      chatMode: request.context.chatMode
    })

    return {
      success: true,
      message: `Request ${decision === 'approve' ? 'approved' : 'rejected'} successfully`,
      approvalRequest: request
    }
  }

  /**
   * Get pending approvals untuk user/session
   */
  getPendingApprovals(filters?: {
    sessionId?: string
    userId?: string
    chatMode?: 'formal' | 'casual'
  }): ApprovalRequest[] {
    let requests = Array.from(this.pendingApprovals.values())
    
    if (filters?.sessionId) {
      requests = requests.filter(r => r.context.sessionId === filters.sessionId)
    }
    
    if (filters?.userId) {
      requests = requests.filter(r => r.context.userId === filters.userId)
    }
    
    if (filters?.chatMode) {
      requests = requests.filter(r => r.context.chatMode === filters.chatMode)
    }

    return requests.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
  }

  /**
   * Get approval history
   */
  getApprovalHistory(limit = 50): ApprovalRequest[] {
    return this.approvalHistory
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit)
  }

  /**
   * Add custom rule
   */
  addRule(rule: ApprovalRule) {
    // Check for duplicate IDs
    if (this.rules.some(r => r.id === rule.id)) {
      throw new Error(`Rule with ID '${rule.id}' already exists`)
    }
    
    this.rules.push(rule)
    console.log('[APPROVAL GATE] Custom rule added:', rule.id)
  }

  /**
   * Remove rule
   */
  removeRule(ruleId: string) {
    const index = this.rules.findIndex(r => r.id === ruleId)
    if (index !== -1) {
      this.rules.splice(index, 1)
      console.log('[APPROVAL GATE] Rule removed:', ruleId)
    }
  }

  /**
   * Generate unique approval ID
   */
  private generateApprovalId(): string {
    return `approval_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Cleanup expired approvals
   */
  cleanupExpiredApprovals() {
    const now = new Date()
    const expired = Array.from(this.pendingApprovals.entries())
      .filter(([, request]) => now > request.expiresAt)
    
    expired.forEach(([id, request]) => {
      request.status = 'expired'
      this.pendingApprovals.delete(id)
      this.approvalHistory.push(request)
    })

    if (expired.length > 0) {
      console.log('[APPROVAL GATE] Cleaned up expired approvals:', expired.length)
    }
  }

  /**
   * Get engine status
   */
  getStatus() {
    return {
      totalRules: this.rules.length,
      pendingApprovals: this.pendingApprovals.size,
      historyCount: this.approvalHistory.length,
      rulesByMode: {
        formal: this.rules.filter(r => r.personaModes.includes('formal') || r.personaModes.includes('all')).length,
        casual: this.rules.filter(r => r.personaModes.includes('casual') || r.personaModes.includes('all')).length,
        universal: this.rules.filter(r => r.personaModes.includes('all')).length
      }
    }
  }
}

// ============================================
// MIDDLEWARE FUNCTIONS
// ============================================

// Singleton instance
export const approvalGateEngine = ApprovalGateEngine.getInstance()

// Setup cleanup interval
if (typeof window === 'undefined') { // Server-side only
  setInterval(() => {
    approvalGateEngine.cleanupExpiredApprovals()
  }, 5 * 60 * 1000) // Every 5 minutes
}

/**
 * Next.js middleware function untuk approval gate integration
 */
export async function approvalGateMiddleware(
  request: NextRequest,
  context: ApprovalContext
): Promise<{
  proceed: boolean
  response?: NextResponse
  approvalId?: string
}> {
  try {
    const evaluation = await approvalGateEngine.evaluateApproval(context)
    
    if (evaluation.action === 'reject') {
      const response = new NextResponse(
        JSON.stringify({
          error: 'Request rejected by approval gate',
          triggeredRules: evaluation.triggeredRules.map(r => ({
            name: r.name,
            description: r.description
          }))
        }),
        { 
          status: 403,
          headers: { 'Content-Type': 'application/json' }
        }
      )
      
      return { proceed: false, response }
    }
    
    if (evaluation.action === 'require_approval') {
      const response = new NextResponse(
        JSON.stringify({
          error: 'Approval required',
          approvalRequired: true,
          approvalId: evaluation.approvalId,
          triggeredRules: evaluation.triggeredRules.map(r => ({
            name: r.name,
            description: r.description
          })),
          message: 'This request requires approval before proceeding. Please wait for approval or contact an administrator.'
        }),
        {
          status: 202, // Accepted but waiting for approval
          headers: { 'Content-Type': 'application/json' }
        }
      )
      
      return { 
        proceed: false, 
        response,
        approvalId: evaluation.approvalId
      }
    }
    
    // Proceed normally
    return { proceed: true }
    
  } catch (error) {
    console.error('[APPROVAL GATE MIDDLEWARE] Error:', error)
    
    // On error, allow request to proceed (fail-open for availability)
    return { proceed: true }
  }
}

/**
 * Helper untuk create approval context dari request
 */
export function createApprovalContext(
  sessionId: string,
  messageContent: string,
  options: {
    userId?: string | null
    chatMode?: 'formal' | 'casual' | null
    personaTemplate?: PersonaTemplate | null
    toolCalls?: Array<{ toolName: string; args: Record<string, any> }>
    workflowPhase?: number | null
    isFirstMessage?: boolean
  }
): ApprovalContext {
  return {
    sessionId,
    messageContent,
    userId: options.userId,
    chatMode: options.chatMode,
    personaTemplate: options.personaTemplate,
    toolCalls: options.toolCalls || [],
    workflowPhase: options.workflowPhase,
    isFirstMessage: options.isFirstMessage || false
  }
}