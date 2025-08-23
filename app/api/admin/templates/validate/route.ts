// ============================================
// MAKALAH AI: Template Validation API
// ============================================
// Task P06.3: Template validation and quality assessment endpoint
// Created: August 2025
// Purpose: Comprehensive template validation and quality analysis

import { NextRequest, NextResponse } from 'next/server'
import { withAdminAPI, AdminRouteConfig } from '@/middleware/admin-auth'
import { TemplateValidationEngine } from '@/lib/template-validation'
import { AdvancedQualityAnalyzer } from '@/lib/quality-metrics'
import type { JWTPayload } from '@/lib/jwt-security'
import type { 
  CreatePersonaTemplateRequest,
  SimplifiedPersonaTemplate 
} from '@/types/persona-simplified'

// ============================================
// VALIDATION REQUEST/RESPONSE INTERFACES
// ============================================

interface ValidateTemplateRequest {
  action: 'validate_create' | 'validate_update' | 'quality_assessment'
  template_data: CreatePersonaTemplateRequest | Partial<SimplifiedPersonaTemplate>
  options?: {
    include_quality_analysis: boolean
    include_improvement_plan: boolean
    strict_validation: boolean
  }
}

interface ValidationResponse {
  validation_result: {
    is_valid: boolean
    validation_score: number // 0-100
    errors: Array<{
      field: string
      message: string
      severity: 'critical' | 'high' | 'medium' | 'low'
    }>
    warnings: Array<{
      field: string
      message: string
      suggestion: string
    }>
  }
  quality_analysis?: {
    overall_score: number
    category_scores: Record<string, number>
    detailed_feedback: Array<{
      category: string
      type: string
      severity: string
      message: string
      suggestion?: string
    }>
    improvement_priority: string
    estimated_effectiveness: number
  }
  improvement_plan?: {
    quick_wins: string[]
    major_improvements: string[]
    long_term_goals: string[]
    estimated_effort: string
  }
  performance_metrics: {
    validation_time_ms: number
    analysis_time_ms: number
  }
}

// ============================================
// TEMPLATE VALIDATION ENDPOINT
// ============================================

async function handleValidateTemplate(
  request: NextRequest,
  user: JWTPayload
): Promise<NextResponse> {
  const startTime = Date.now()
  let analysisStartTime = 0

  try {
    const body = await request.json() as ValidateTemplateRequest

    // Validate request structure
    if (!body.action || !body.template_data) {
      return NextResponse.json({
        error: 'Missing required fields: action and template_data',
        code: 'VALIDATION_REQUEST_ERROR'
      }, { status: 400 })
    }

    const {
      action,
      template_data,
      options = {
        include_quality_analysis: true,
        include_improvement_plan: false,
        strict_validation: false
      }
    } = body

    let validationResult: any = null
    let qualityAnalysis: any = null
    let improvementPlan: any = null

    // Perform validation based on action type
    switch (action) {
      case 'validate_create':
        validationResult = await validateCreateTemplate(
          template_data as CreatePersonaTemplateRequest,
          options.strict_validation
        )
        break

      case 'validate_update':
        validationResult = await validateUpdateTemplate(
          template_data as Partial<SimplifiedPersonaTemplate>,
          options.strict_validation
        )
        break

      case 'quality_assessment':
        validationResult = await validateBasicStructure(template_data)
        break

      default:
        return NextResponse.json({
          error: `Unknown validation action: ${action}`,
          code: 'INVALID_ACTION'
        }, { status: 400 })
    }

    // Perform quality analysis if requested and validation passed basic checks
    if (options.include_quality_analysis && validationResult.is_valid) {
      analysisStartTime = Date.now()
      
      try {
        // Create a minimal template structure for analysis
        const templateForAnalysis: SimplifiedPersonaTemplate = {
          id: 'temp-id',
          name: (template_data as any).name || 'Unnamed Template',
          chat_mode: (template_data as any).chat_mode || 'formal',
          system_prompt: (template_data as any).system_prompt || '',
          description: (template_data as any).description || null,
          is_active: true,
          is_default: false,
          version: 1,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          created_by: user.userId
        }

        qualityAnalysis = await AdvancedQualityAnalyzer.assessQuality(templateForAnalysis)

        // Generate improvement plan if requested
        if (options.include_improvement_plan) {
          improvementPlan = AdvancedQualityAnalyzer.generateImprovementPlan(qualityAnalysis)
        }

      } catch (error) {
        console.error('[VALIDATION] Quality analysis failed:', error)
        qualityAnalysis = {
          overall_score: 0,
          error: 'Quality analysis failed',
          message: 'Unable to perform quality analysis due to internal error'
        }
      }
    }

    const validationEndTime = Date.now()
    const analysisEndTime = analysisStartTime > 0 ? Date.now() : validationEndTime

    const response: ValidationResponse = {
      validation_result: validationResult,
      ...(qualityAnalysis && { quality_analysis: qualityAnalysis }),
      ...(improvementPlan && { improvement_plan: improvementPlan }),
      performance_metrics: {
        validation_time_ms: analysisStartTime > 0 ? analysisStartTime - startTime : validationEndTime - startTime,
        analysis_time_ms: analysisStartTime > 0 ? analysisEndTime - analysisStartTime : 0
      }
    }

    // Log validation activity for audit
    console.log('[TEMPLATE VALIDATION]', {
      action,
      user: user.email,
      validation_score: validationResult.validation_score,
      quality_score: qualityAnalysis?.overall_score,
      performance: response.performance_metrics
    })

    return NextResponse.json(response)

  } catch (error) {
    console.error('[TEMPLATE VALIDATION] Error:', error)
    
    return NextResponse.json({
      error: 'Template validation failed',
      code: 'VALIDATION_INTERNAL_ERROR',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// ============================================
// VALIDATION HELPERS
// ============================================

async function validateCreateTemplate(
  templateData: CreatePersonaTemplateRequest,
  strictMode: boolean = false
): Promise<any> {
  // Use the main validation engine
  const validation = TemplateValidationEngine.validateCreateRequest(templateData)
  
  const errors = []
  const warnings = []

  // Map validation results to API format
  if (!validation.name.isValid) {
    errors.push({
      field: 'name',
      message: validation.name.error || 'Invalid template name',
      severity: 'critical' as const
    })
  }

  if (!validation.system_prompt.isValid) {
    errors.push({
      field: 'system_prompt',
      message: validation.system_prompt.error || 'Invalid system prompt',
      severity: 'critical' as const
    })
  }

  if (!validation.chat_mode.isValid) {
    errors.push({
      field: 'chat_mode',
      message: validation.chat_mode.error || 'Invalid chat mode',
      severity: 'critical' as const
    })
  }

  // Add warnings from overall validation
  validation.overall.warnings.forEach(warning => {
    warnings.push({
      field: 'general',
      message: warning,
      suggestion: 'Review and improve the highlighted area'
    })
  })

  // Strict mode additional checks
  if (strictMode) {
    // Check for minimum description in strict mode
    if (!templateData.description?.trim()) {
      warnings.push({
        field: 'description',
        message: 'Description is recommended for better template documentation',
        suggestion: 'Add a clear description explaining the template purpose'
      })
    }

    // Check for adequate system prompt length in strict mode
    if (templateData.system_prompt && templateData.system_prompt.length < 150) {
      warnings.push({
        field: 'system_prompt',
        message: 'System prompt might be too brief for optimal performance',
        suggestion: 'Consider adding more detailed instructions and context'
      })
    }
  }

  // Calculate validation score
  const maxScore = 100
  const errorPenalty = errors.length * 25
  const warningPenalty = warnings.length * 5
  const validationScore = Math.max(0, maxScore - errorPenalty - warningPenalty)

  return {
    is_valid: errors.length === 0,
    validation_score: validationScore,
    errors,
    warnings
  }
}

async function validateUpdateTemplate(
  templateData: Partial<SimplifiedPersonaTemplate>,
  strictMode: boolean = false
): Promise<any> {
  const errors = []
  const warnings = []

  // Validate individual fields if they exist
  if (templateData.name !== undefined) {
    try {
      TemplateValidationEngine['validateField']('name', templateData.name)
    } catch {
      errors.push({
        field: 'name',
        message: 'Invalid template name format',
        severity: 'critical' as const
      })
    }
  }

  if (templateData.system_prompt !== undefined) {
    const promptValidation = TemplateValidationEngine['validateSystemPrompt'](templateData.system_prompt)
    if (!promptValidation.isValid) {
      errors.push({
        field: 'system_prompt',
        message: promptValidation.error || 'Invalid system prompt',
        severity: 'critical' as const
      })
    }
  }

  // Calculate validation score
  const maxScore = 100
  const errorPenalty = errors.length * 25
  const warningPenalty = warnings.length * 5
  const validationScore = Math.max(0, maxScore - errorPenalty - warningPenalty)

  return {
    is_valid: errors.length === 0,
    validation_score: validationScore,
    errors,
    warnings
  }
}

async function validateBasicStructure(templateData: any): Promise<any> {
  const errors = []
  const warnings = []

  // Basic structure validation
  if (!templateData.name && !templateData.system_prompt) {
    errors.push({
      field: 'structure',
      message: 'Either name or system_prompt must be provided for validation',
      severity: 'critical' as const
    })
  }

  return {
    is_valid: errors.length === 0,
    validation_score: errors.length === 0 ? 100 : 0,
    errors,
    warnings
  }
}

// Export protected endpoint
export const POST = withAdminAPI(handleValidateTemplate, {
  requirePermission: 'canCreateTemplate', // Need create permission to validate templates
  enableAuditLog: true,
  enableRateLimit: true
})