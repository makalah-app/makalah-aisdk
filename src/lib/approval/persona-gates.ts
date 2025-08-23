// ============================================
// MAKALAH AI: Persona-Aware Approval Gates Implementation
// ============================================
// Task P07.4 Implementation: Human-in-the-Loop approval workflows with persona context
// Created: August 2025
// Features: Advanced approval workflows, persona-aware validation, AI SDK integration

import type { PersonaTemplate } from '@/types/persona'
import { approvalGateEngine, type ApprovalContext, type ApprovalRule } from '@/middleware/approval-gates'
import { logPersonaEvent } from '@/lib/audit/persona-logging'

// ============================================
// ENHANCED APPROVAL GATE TYPES
// ============================================

export interface PersonaApprovalContext extends ApprovalContext {
  workflowState?: {
    type: string
    currentPhase: number
    isActive: boolean
    artifacts?: string[]
  }
  aiProviderContext?: {
    primaryProvider: string
    fallbackProvider: string
    modelConfiguration: Record<string, any>
  }
  conversationContext?: {
    messageCount: number
    tokensUsed: number
    averageResponseTime: number
    lastToolUsed?: string
  }
  riskAssessment?: {
    contentRiskLevel: 'low' | 'medium' | 'high' | 'critical'
    academicIntegrityRisk: number // 0-1 scale
    privacyRisk: number // 0-1 scale
    operationalRisk: number // 0-1 scale
  }
}

export interface ApprovalGateResult {
  approved: boolean
  approvalId?: string
  reason: string
  triggeredRules: string[]
  requiredApprovers: string[]
  estimatedWaitTime: number // milliseconds
  bypassOptions?: {
    supervisorBypass: boolean
    emergencyBypass: boolean
    temporaryBypass: boolean
  }
}

export interface ApprovalNotification {
  id: string
  type: 'approval_request' | 'approval_granted' | 'approval_denied' | 'approval_expired'
  title: string
  message: string
  context: PersonaApprovalContext
  priority: 'low' | 'normal' | 'high' | 'urgent'
  approvers: string[]
  createdAt: string
  expiresAt: string
  actions: Array<{
    id: string
    label: string
    action: 'approve' | 'deny' | 'escalate' | 'defer'
    requiresReason?: boolean
  }>
}

// ============================================
// PERSONA-AWARE APPROVAL RULES ENGINE
// ============================================

export class PersonaApprovalGatesManager {
  private static instance: PersonaApprovalGatesManager
  private notifications: ApprovalNotification[] = []
  private approvalHistory: Map<string, any> = new Map()
  private activeRules: Map<string, ApprovalRule> = new Map()

  private constructor() {
    this.initializePersonaAwareRules()
  }

  static getInstance(): PersonaApprovalGatesManager {
    if (!this.instance) {
      this.instance = new PersonaApprovalGatesManager()
    }
    return this.instance
  }

  // ============================================
  // PERSONA-AWARE APPROVAL EVALUATION
  // ============================================

  async evaluatePersonaApproval(context: PersonaApprovalContext): Promise<ApprovalGateResult> {
    console.log('[PERSONA APPROVAL] Evaluating approval request:', {
      sessionId: context.sessionId,
      chatMode: context.chatMode,
      personaId: context.personaTemplate?.id,
      messageLength: context.messageContent.length,
      toolCalls: context.toolCalls?.length || 0
    })

    // Enhanced risk assessment
    const riskAssessment = this.assessRisks(context)
    const enhancedContext: PersonaApprovalContext = {
      ...context,
      riskAssessment
    }

    // Use the approval gate engine with enhanced context
    const engineResult = await approvalGateEngine.evaluateApproval(enhancedContext)

    // Convert to persona-aware result
    const result: ApprovalGateResult = {
      approved: !engineResult.needsApproval && engineResult.action === 'proceed',
      approvalId: engineResult.approvalId,
      reason: this.generateApprovalReason(engineResult, enhancedContext),
      triggeredRules: engineResult.triggeredRules.map(r => r.name),
      requiredApprovers: this.getRequiredApprovers(engineResult.triggeredRules, enhancedContext),
      estimatedWaitTime: this.estimateWaitTime(engineResult.triggeredRules, enhancedContext),
      bypassOptions: this.getBypassOptions(enhancedContext)
    }

    // Create notification if approval needed
    if (!result.approved && result.approvalId) {
      await this.createApprovalNotification(result.approvalId, enhancedContext, result)
    }

    // Log approval evaluation
    logPersonaEvent(
      engineResult.needsApproval ? 'approval_requested' : 'approval_granted',
      `Approval ${result.approved ? 'automatically granted' : 'required'}: ${result.reason}`,
      {
        sessionId: context.sessionId,
        chatMode: context.chatMode,
        personaId: context.personaTemplate?.id,
        personaName: context.personaTemplate?.name,
        timestamp: new Date().toISOString()
      },
      {
        approvalId: result.approvalId,
        triggeredRules: result.triggeredRules,
        riskAssessment: riskAssessment,
        estimatedWaitTime: result.estimatedWaitTime
      }
    )

    return result
  }

  // ============================================
  // RISK ASSESSMENT ENGINE
  // ============================================

  private assessRisks(context: PersonaApprovalContext): PersonaApprovalContext['riskAssessment'] {
    let contentRiskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low'
    let academicIntegrityRisk = 0
    let privacyRisk = 0 
    let operationalRisk = 0

    // Content risk assessment
    const sensitiveKeywords = [
      'password', 'secret', 'confidential', 'private', 'personal', 
      'api key', 'token', 'credential', 'login'
    ]
    
    const highRiskKeywords = [
      'cheat', 'plagiarism', 'copy', 'bypass', 'hack', 'illegal'
    ]

    const messageText = context.messageContent.toLowerCase()
    
    // Check for sensitive content
    const hasSensitiveContent = sensitiveKeywords.some(keyword => 
      messageText.includes(keyword)
    )
    
    const hasHighRiskContent = highRiskKeywords.some(keyword => 
      messageText.includes(keyword)
    )

    if (hasHighRiskContent) {
      contentRiskLevel = 'critical'
      academicIntegrityRisk = 0.8
    } else if (hasSensitiveContent) {
      contentRiskLevel = 'high'
      privacyRisk = 0.6
    } else if (context.messageContent.length > 5000) {
      contentRiskLevel = 'medium'
      operationalRisk = 0.3
    }

    // Tool-based risk assessment
    if (context.toolCalls?.length) {
      const riskToolUsage = context.toolCalls.some(tool => 
        ['file_handler', 'system_command', 'external_api'].includes(tool.toolName)
      )
      
      if (riskToolUsage) {
        operationalRisk = Math.max(operationalRisk, 0.5)
        contentRiskLevel = contentRiskLevel === 'low' ? 'medium' : contentRiskLevel
      }
    }

    // Persona-specific risk adjustments
    if (context.chatMode === 'casual') {
      // Casual mode has relaxed academic integrity requirements
      academicIntegrityRisk *= 0.5
    } else if (context.chatMode === 'formal') {
      // Formal mode requires higher scrutiny for academic work
      if (context.workflowState?.isActive) {
        academicIntegrityRisk = Math.max(academicIntegrityRisk, 0.3)
      }
    }

    return {
      contentRiskLevel,
      academicIntegrityRisk,
      privacyRisk,
      operationalRisk
    }
  }

  // ============================================
  // APPROVAL WORKFLOW MANAGEMENT
  // ============================================

  private generateApprovalReason(engineResult: any, context: PersonaApprovalContext): string {
    if (engineResult.action === 'proceed') {
      return `Request approved automatically - low risk profile for ${context.chatMode} mode`
    }

    if (engineResult.action === 'reject') {
      return `Request rejected due to policy violations: ${engineResult.triggeredRules.map((r: any) => r.name).join(', ')}`
    }

    // Generate context-aware reason
    const reasons: string[] = []
    
    if (context.riskAssessment?.contentRiskLevel === 'critical') {
      reasons.push('Critical content risk detected')
    }
    
    if (context.riskAssessment?.academicIntegrityRisk && context.riskAssessment.academicIntegrityRisk > 0.5) {
      reasons.push('Academic integrity concerns')
    }
    
    if (context.toolCalls?.some(t => t.toolName === 'web_search') && context.chatMode === 'formal') {
      reasons.push('External research requires verification in formal academic mode')
    }
    
    if (context.workflowState?.isActive && context.workflowState.currentPhase >= 6) {
      reasons.push('Final workflow phases require additional oversight')
    }

    return reasons.length > 0 
      ? `Approval required: ${reasons.join(', ')}`
      : `Manual review required for ${context.chatMode} mode request`
  }

  private getRequiredApprovers(rules: any[], context: PersonaApprovalContext): string[] {
    const approvers = new Set<string>()
    
    // Risk-based approver assignment
    if (context.riskAssessment?.contentRiskLevel === 'critical') {
      approvers.add('security_officer')
      approvers.add('system_administrator')
    }
    
    if (context.riskAssessment?.academicIntegrityRisk && context.riskAssessment.academicIntegrityRisk > 0.5) {
      approvers.add('academic_supervisor')
    }
    
    if (context.chatMode === 'formal' && context.workflowState?.isActive) {
      approvers.add('academic_advisor')
    }
    
    // Default approver if none specified
    if (approvers.size === 0) {
      approvers.add('system_moderator')
    }

    return Array.from(approvers)
  }

  private estimateWaitTime(rules: any[], context: PersonaApprovalContext): number {
    let baseTime = 5 * 60 * 1000 // 5 minutes base

    // Adjust based on risk level
    switch (context.riskAssessment?.contentRiskLevel) {
      case 'critical':
        baseTime *= 4 // 20 minutes
        break
      case 'high':
        baseTime *= 2 // 10 minutes
        break
      case 'medium':
        baseTime *= 1.5 // 7.5 minutes
        break
      default:
        // Keep base time
    }

    // Adjust based on persona mode
    if (context.chatMode === 'formal') {
      baseTime *= 1.3 // Academic workflows need more time
    }

    // Adjust based on number of required approvers
    const approverCount = this.getRequiredApprovers(rules, context).length
    baseTime *= approverCount

    return Math.min(baseTime, 60 * 60 * 1000) // Maximum 1 hour
  }

  private getBypassOptions(context: PersonaApprovalContext): ApprovalGateResult['bypassOptions'] {
    return {
      supervisorBypass: context.chatMode === 'formal', // Allow supervisor bypass for academic work
      emergencyBypass: context.riskAssessment?.operationalRisk && context.riskAssessment.operationalRisk < 0.3,
      temporaryBypass: context.chatMode === 'casual' // Casual mode can have temporary bypasses
    }
  }

  // ============================================
  // APPROVAL NOTIFICATIONS
  // ============================================

  private async createApprovalNotification(
    approvalId: string,
    context: PersonaApprovalContext,
    result: ApprovalGateResult
  ) {
    const priority = this.getNotificationPriority(context)
    const expiresAt = new Date(Date.now() + result.estimatedWaitTime).toISOString()

    const notification: ApprovalNotification = {
      id: `notification_${approvalId}`,
      type: 'approval_request',
      title: this.generateNotificationTitle(context),
      message: this.generateNotificationMessage(context, result),
      context,
      priority,
      approvers: result.requiredApprovers,
      createdAt: new Date().toISOString(),
      expiresAt,
      actions: this.generateNotificationActions(context, result)
    }

    this.notifications.push(notification)

    // In production, this would send to actual notification system
    console.log('[PERSONA APPROVAL] Notification created:', {
      id: notification.id,
      title: notification.title,
      priority: notification.priority,
      approvers: notification.approvers,
      expiresAt: notification.expiresAt
    })

    return notification
  }

  private getNotificationPriority(context: PersonaApprovalContext): ApprovalNotification['priority'] {
    switch (context.riskAssessment?.contentRiskLevel) {
      case 'critical':
        return 'urgent'
      case 'high':
        return 'high'
      case 'medium':
        return 'normal'
      default:
        return 'low'
    }
  }

  private generateNotificationTitle(context: PersonaApprovalContext): string {
    const modeLabel = context.chatMode === 'formal' ? 'Academic' : 'Casual'
    const personaName = context.personaTemplate?.name || 'Unknown Persona'
    
    return `${modeLabel} Mode Approval Required - ${personaName}`
  }

  private generateNotificationMessage(context: PersonaApprovalContext, result: ApprovalGateResult): string {
    const parts = [
      `A ${context.chatMode} mode request requires approval.`,
      `Persona: ${context.personaTemplate?.name || 'Unknown'}`,
      `Risk Level: ${context.riskAssessment?.contentRiskLevel || 'Unknown'}`,
      `Session: ${context.sessionId}`,
    ]

    if (result.triggeredRules.length > 0) {
      parts.push(`Triggered Rules: ${result.triggeredRules.join(', ')}`)
    }

    if (context.toolCalls?.length) {
      parts.push(`Tools Requested: ${context.toolCalls.map(t => t.toolName).join(', ')}`)
    }

    return parts.join('\n')
  }

  private generateNotificationActions(
    context: PersonaApprovalContext, 
    result: ApprovalGateResult
  ): ApprovalNotification['actions'] {
    const actions: ApprovalNotification['actions'] = [
      {
        id: 'approve',
        label: 'Approve Request',
        action: 'approve',
        requiresReason: false
      },
      {
        id: 'deny',
        label: 'Deny Request',
        action: 'deny', 
        requiresReason: true
      }
    ]

    // Add context-specific actions
    if (result.bypassOptions?.supervisorBypass) {
      actions.push({
        id: 'escalate',
        label: 'Escalate to Supervisor',
        action: 'escalate',
        requiresReason: false
      })
    }

    if (context.riskAssessment?.contentRiskLevel !== 'critical') {
      actions.push({
        id: 'defer',
        label: 'Request More Information',
        action: 'defer',
        requiresReason: true
      })
    }

    return actions
  }

  // ============================================
  // APPROVAL PROCESSING
  // ============================================

  async processApprovalDecision(
    approvalId: string,
    decision: 'approve' | 'deny' | 'escalate' | 'defer',
    approverId: string,
    reason?: string
  ): Promise<{ success: boolean; message: string }> {
    const notification = this.notifications.find(n => n.id.includes(approvalId))
    
    if (!notification) {
      return {
        success: false,
        message: 'Approval notification not found'
      }
    }

    // Process through engine
    const engineResult = await approvalGateEngine.processApproval(
      approvalId,
      decision === 'approve' ? 'approve' : 'reject',
      approverId,
      reason
    )

    if (!engineResult.success) {
      return engineResult
    }

    // Update notification
    notification.type = decision === 'approve' ? 'approval_granted' : 'approval_denied'

    // Log decision
    logPersonaEvent(
      decision === 'approve' ? 'approval_granted' : 'approval_denied',
      `Approval ${decision} by ${approverId}: ${reason || 'No reason provided'}`,
      {
        sessionId: notification.context.sessionId,
        chatMode: notification.context.chatMode,
        personaId: notification.context.personaTemplate?.id,
        timestamp: new Date().toISOString()
      },
      {
        approvalId,
        approverId,
        decision,
        reason,
        notificationId: notification.id
      }
    )

    console.log('[PERSONA APPROVAL] Decision processed:', {
      approvalId,
      decision,
      approverId,
      success: true
    })

    return {
      success: true,
      message: `Approval ${decision} successfully processed`
    }
  }

  // ============================================
  // PERSONA-SPECIFIC APPROVAL RULES
  // ============================================

  private initializePersonaAwareRules() {
    // Enhanced rules already defined in middleware/approval-gates.ts
    // This method can add additional persona-specific rules
    
    const personaSpecificRules: ApprovalRule[] = [
      {
        id: 'persona-mode-switch',
        name: 'Persona Mode Switch Approval',
        description: 'Require approval when switching between formal and casual modes mid-session',
        condition: (ctx: ApprovalContext) => {
          // This would check if there's a mode switch in the current message
          return ctx.messageContent.toLowerCase().includes('switch mode') ||
                 ctx.messageContent.toLowerCase().includes('change persona')
        },
        action: 'require_approval',
        personaModes: ['all'],
        priority: 75
      },
      
      {
        id: 'workflow-bypass-attempt',
        name: 'Workflow Bypass Prevention',
        description: 'Prevent attempts to bypass workflow phases in formal academic mode',
        condition: (ctx: ApprovalContext) => {
          return ctx.chatMode === 'formal' &&
                 ctx.workflowPhase !== null &&
                 (ctx.messageContent.toLowerCase().includes('bypass') ||
                  ctx.messageContent.toLowerCase().includes('skip to final') ||
                  ctx.messageContent.toLowerCase().includes('finish quickly'))
        },
        action: 'require_approval',
        personaModes: ['formal'],
        priority: 85
      }
    ]

    // Add rules to engine
    personaSpecificRules.forEach(rule => {
      this.activeRules.set(rule.id, rule)
      approvalGateEngine.addRule(rule)
    })

    console.log('[PERSONA APPROVAL] Initialized persona-specific rules:', personaSpecificRules.length)
  }

  // ============================================
  // PUBLIC API METHODS
  // ============================================

  getActiveNotifications(approverId?: string): ApprovalNotification[] {
    let notifications = this.notifications.filter(n => 
      n.type === 'approval_request' && 
      new Date(n.expiresAt) > new Date()
    )

    if (approverId) {
      notifications = notifications.filter(n => n.approvers.includes(approverId))
    }

    return notifications.sort((a, b) => {
      const priorityOrder = { urgent: 4, high: 3, normal: 2, low: 1 }
      return priorityOrder[b.priority] - priorityOrder[a.priority]
    })
  }

  getApprovalHistory(sessionId?: string, limit = 50): any[] {
    const history = Array.from(this.approvalHistory.values())
    
    let filtered = history
    if (sessionId) {
      filtered = history.filter((entry: any) => entry.sessionId === sessionId)
    }
    
    return filtered
      .sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit)
  }

  getApprovalStats(): {
    totalRequests: number
    approved: number
    denied: number
    pending: number
    averageWaitTime: number
    riskDistribution: Record<string, number>
  } {
    const all = this.notifications
    const approved = all.filter(n => n.type === 'approval_granted').length
    const denied = all.filter(n => n.type === 'approval_denied').length
    const pending = all.filter(n => n.type === 'approval_request').length
    
    // Calculate risk distribution
    const riskDistribution: Record<string, number> = { low: 0, medium: 0, high: 0, critical: 0 }
    all.forEach(n => {
      const risk = n.context.riskAssessment?.contentRiskLevel || 'low'
      riskDistribution[risk]++
    })

    return {
      totalRequests: all.length,
      approved,
      denied,
      pending,
      averageWaitTime: 8 * 60 * 1000, // Mock average wait time
      riskDistribution
    }
  }
}

// ============================================
// SINGLETON EXPORT AND CONVENIENCE FUNCTIONS
// ============================================

export const personaApprovalGates = PersonaApprovalGatesManager.getInstance()

export async function requestPersonaApproval(
  context: PersonaApprovalContext
): Promise<ApprovalGateResult> {
  return personaApprovalGates.evaluatePersonaApproval(context)
}

export async function processPersonaApproval(
  approvalId: string,
  decision: 'approve' | 'deny' | 'escalate' | 'defer',
  approverId: string,
  reason?: string
) {
  return personaApprovalGates.processApprovalDecision(approvalId, decision, approverId, reason)
}

export function getPersonaApprovalNotifications(approverId?: string) {
  return personaApprovalGates.getActiveNotifications(approverId)
}

export function getPersonaApprovalStats() {
  return personaApprovalGates.getApprovalStats()
}