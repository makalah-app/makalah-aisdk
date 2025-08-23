// ============================================
// MAKALAH AI: Template Validation Engine
// ============================================
// Task P06.3: Comprehensive template validation and quality assessment
// Created: August 2025
// Purpose: Ensure high-quality persona templates with error detection

import { z } from 'zod'
import type { 
  ChatModeType, 
  SimplifiedPersonaTemplate,
  CreatePersonaTemplateRequest,
  PersonaTemplateValidation 
} from '@/types/persona-simplified'

// ============================================
// VALIDATION SCHEMAS
// ============================================

export const TemplateNameSchema = z.string()
  .min(3, 'Template name must be at least 3 characters')
  .max(100, 'Template name cannot exceed 100 characters')
  .regex(/^[a-zA-Z0-9\s\-_()]+$/, 'Template name can only contain letters, numbers, spaces, and basic symbols')

export const SystemPromptSchema = z.string()
  .min(50, 'System prompt must be at least 50 characters')
  .max(4000, 'System prompt cannot exceed 4000 characters')
  .refine((prompt) => prompt.trim().length >= 50, 'System prompt cannot be just whitespace')

export const DescriptionSchema = z.string()
  .max(500, 'Description cannot exceed 500 characters')
  .optional()

export const ChatModeSchema = z.enum(['formal', 'casual'], {
  errorMap: () => ({ message: 'Chat mode must be either "formal" or "casual"' })
})

export const CreateTemplateSchema = z.object({
  name: TemplateNameSchema,
  chat_mode: ChatModeSchema,
  system_prompt: SystemPromptSchema,
  description: DescriptionSchema,
  is_default: z.boolean().optional(),
  admin_id: z.string().optional()
})

export const UpdateTemplateSchema = z.object({
  template_id: z.string().uuid('Invalid template ID format'),
  updates: z.object({
    name: TemplateNameSchema.optional(),
    system_prompt: SystemPromptSchema.optional(),
    description: DescriptionSchema,
    is_active: z.boolean().optional()
  }),
  admin_id: z.string().optional()
})

// ============================================
// VALIDATION RULES CONFIGURATION
// ============================================

interface ValidationRule {
  id: string
  name: string
  category: 'critical' | 'warning' | 'suggestion'
  check: (template: Partial<SimplifiedPersonaTemplate>) => { valid: boolean; message?: string }
}

const VALIDATION_RULES: ValidationRule[] = [
  // Critical Rules
  {
    id: 'name_required',
    name: 'Name Required',
    category: 'critical',
    check: (template) => ({
      valid: Boolean(template.name?.trim()),
      message: 'Template name is required'
    })
  },
  {
    id: 'system_prompt_required',
    name: 'System Prompt Required',
    category: 'critical',
    check: (template) => ({
      valid: Boolean(template.system_prompt?.trim()),
      message: 'System prompt is required'
    })
  },
  {
    id: 'chat_mode_required',
    name: 'Chat Mode Required',
    category: 'critical',
    check: (template) => ({
      valid: Boolean(template.chat_mode),
      message: 'Chat mode must be specified'
    })
  },
  {
    id: 'system_prompt_length',
    name: 'System Prompt Length',
    category: 'critical',
    check: (template) => {
      const length = template.system_prompt?.length || 0
      return {
        valid: length >= 50 && length <= 4000,
        message: length < 50 
          ? 'System prompt must be at least 50 characters'
          : 'System prompt cannot exceed 4000 characters'
      }
    }
  },

  // Warning Rules
  {
    id: 'formal_mode_language',
    name: 'Formal Mode Language Check',
    category: 'warning',
    check: (template) => {
      if (template.chat_mode !== 'formal' || !template.system_prompt) return { valid: true }
      
      const informalPatterns = /\b(gue|lo|elu|gw|lu|sih|dong|nih|deh|kok|banget)\b/gi
      const hasInformalWords = informalPatterns.test(template.system_prompt)
      
      return {
        valid: !hasInformalWords,
        message: 'Formal mode template contains informal Jakarta language'
      }
    }
  },
  {
    id: 'casual_mode_language',
    name: 'Casual Mode Language Check',
    category: 'warning',
    check: (template) => {
      if (template.chat_mode !== 'casual' || !template.system_prompt) return { valid: true }
      
      const formalPatterns = /\b(Anda|Saudara|dengan hormat|terima kasih|selamat pagi)\b/gi
      const hasFormalWords = formalPatterns.test(template.system_prompt)
      
      return {
        valid: !hasFormalWords,
        message: 'Casual mode template contains overly formal language'
      }
    }
  },
  {
    id: 'prompt_specificity',
    name: 'Prompt Specificity',
    category: 'warning',
    check: (template) => {
      if (!template.system_prompt) return { valid: true }
      
      const vaguePhrases = [
        'help with anything',
        'general assistant',
        'any questions',
        'whatever you need'
      ]
      
      const isVague = vaguePhrases.some(phrase => 
        template.system_prompt!.toLowerCase().includes(phrase)
      )
      
      return {
        valid: !isVague,
        message: 'System prompt appears too generic. Consider making it more specific.'
      }
    }
  },

  // Suggestion Rules
  {
    id: 'description_present',
    name: 'Description Present',
    category: 'suggestion',
    check: (template) => ({
      valid: Boolean(template.description?.trim()),
      message: 'Consider adding a description to help users understand the template purpose'
    })
  },
  {
    id: 'academic_context',
    name: 'Academic Context',
    category: 'suggestion',
    check: (template) => {
      if (!template.system_prompt) return { valid: true }
      
      const academicKeywords = [
        'research', 'academic', 'scholarship', 'analysis', 'methodology',
        'literature', 'citation', 'peer review', 'evidence', 'hypothesis'
      ]
      
      const hasAcademicContext = academicKeywords.some(keyword =>
        template.system_prompt!.toLowerCase().includes(keyword)
      )
      
      return {
        valid: hasAcademicContext,
        message: 'Consider adding more academic context to align with Makalah AI purpose'
      }
    }
  }
]

// ============================================
// MAIN VALIDATION ENGINE
// ============================================

export class TemplateValidationEngine {
  /**
   * Validate template creation request
   */
  static validateCreateRequest(request: CreatePersonaTemplateRequest): PersonaTemplateValidation {
    const nameValidation = this.validateField('name', request.name)
    const systemPromptValidation = this.validateSystemPrompt(request.system_prompt)
    const chatModeValidation = this.validateField('chat_mode', request.chat_mode)

    // Run all validation rules
    const ruleResults = VALIDATION_RULES.map(rule => ({
      rule,
      result: rule.check(request)
    }))

    const criticalErrors = ruleResults
      .filter(({ rule, result }) => rule.category === 'critical' && !result.valid)
      .map(({ result }) => result.message!)

    const warnings = ruleResults
      .filter(({ rule, result }) => rule.category === 'warning' && !result.valid)
      .map(({ result }) => result.message!)

    const suggestions = ruleResults
      .filter(({ rule, result }) => rule.category === 'suggestion' && !result.valid)
      .map(({ result }) => result.message!)

    return {
      name: nameValidation,
      system_prompt: systemPromptValidation,
      chat_mode: chatModeValidation,
      overall: {
        isValid: criticalErrors.length === 0,
        errors: criticalErrors,
        warnings: warnings.concat(suggestions)
      }
    }
  }

  /**
   * Validate individual field
   */
  private static validateField(field: string, value: any): { isValid: boolean; error?: string } {
    try {
      switch (field) {
        case 'name':
          TemplateNameSchema.parse(value)
          return { isValid: true }
        
        case 'chat_mode':
          ChatModeSchema.parse(value)
          return { isValid: true }
        
        default:
          return { isValid: true }
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        return {
          isValid: false,
          error: error.errors[0]?.message || `Invalid ${field}`
        }
      }
      return { isValid: false, error: `Validation error for ${field}` }
    }
  }

  /**
   * Validate system prompt with detailed analysis
   */
  private static validateSystemPrompt(prompt: string): {
    isValid: boolean
    error?: string
    wordCount: number
    estimatedTokens: number
  } {
    try {
      SystemPromptSchema.parse(prompt)
      
      const wordCount = prompt.trim().split(/\s+/).length
      const estimatedTokens = Math.ceil(wordCount * 1.3) // Rough estimation
      
      return {
        isValid: true,
        wordCount,
        estimatedTokens
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        return {
          isValid: false,
          error: error.errors[0]?.message || 'Invalid system prompt',
          wordCount: prompt.trim().split(/\s+/).length,
          estimatedTokens: 0
        }
      }
      return {
        isValid: false,
        error: 'System prompt validation failed',
        wordCount: 0,
        estimatedTokens: 0
      }
    }
  }

  /**
   * Validate template against mode-specific requirements
   */
  static validateModeCompliance(template: Partial<SimplifiedPersonaTemplate>): {
    isCompliant: boolean
    issues: string[]
    suggestions: string[]
  } {
    const issues: string[] = []
    const suggestions: string[] = []

    if (!template.chat_mode || !template.system_prompt) {
      return { isCompliant: false, issues: ['Missing required fields'], suggestions: [] }
    }

    if (template.chat_mode === 'formal') {
      // Check for academic formality
      const formalIndicators = [
        'Anda', 'akademik', 'penelitian', 'analisis', 'metodologi'
      ]
      
      const hasFormalIndicators = formalIndicators.some(indicator =>
        template.system_prompt!.includes(indicator)
      )
      
      if (!hasFormalIndicators) {
        issues.push('Formal mode should use formal Indonesian language')
      }

      // Check for casual language
      const casualPatterns = /\b(gue|lo|elu|gw|lu)\b/gi
      if (casualPatterns.test(template.system_prompt)) {
        issues.push('Formal mode contains casual Jakarta language')
      }

      // Suggestions for formal mode
      if (!template.system_prompt.includes('standar akademik')) {
        suggestions.push('Consider mentioning academic standards')
      }
    }

    if (template.chat_mode === 'casual') {
      // Check for Jakarta casual language
      const casualIndicators = [
        'gue', 'lo', 'nih', 'dong', 'sih', 'banget'
      ]
      
      const hasCasualIndicators = casualIndicators.some(indicator =>
        template.system_prompt!.toLowerCase().includes(indicator)
      )
      
      if (!hasCasualIndicators) {
        suggestions.push('Consider using more Jakarta casual language (gue-lo style)')
      }

      // Check for overly formal language
      if (template.system_prompt.includes('Anda') || 
          template.system_prompt.includes('Saudara')) {
        issues.push('Casual mode should avoid overly formal pronouns')
      }

      // Suggestions for casual mode
      if (!template.system_prompt.includes('santai') && 
          !template.system_prompt.includes('friendly')) {
        suggestions.push('Consider emphasizing friendly, relaxed tone')
      }
    }

    return {
      isCompliant: issues.length === 0,
      issues,
      suggestions
    }
  }

  /**
   * Check for potential security issues in system prompt
   */
  static validateSecurity(systemPrompt: string): {
    isSafe: boolean
    risks: string[]
    blocked: boolean
  } {
    const risks: string[] = []
    let blocked = false

    // Check for prompt injection attempts
    const injectionPatterns = [
      /ignore\s+previous\s+instructions/gi,
      /system\s*:\s*you\s+are\s+now/gi,
      /\[system\]/gi,
      /override\s+your\s+guidelines/gi,
      /forget\s+everything\s+above/gi,
      /<\|im_start\|>/gi,
      /<\|im_end\|>/gi
    ]

    for (const pattern of injectionPatterns) {
      if (pattern.test(systemPrompt)) {
        risks.push('Potential prompt injection detected')
        blocked = true
        break
      }
    }

    // Check for inappropriate content
    const inappropriatePatterns = [
      /\b(hate|violence|harm|illegal|drugs|weapons)\b/gi
    ]

    for (const pattern of inappropriatePatterns) {
      if (pattern.test(systemPrompt)) {
        risks.push('Potentially inappropriate content detected')
      }
    }

    // Check for personal information patterns
    const personalInfoPatterns = [
      /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/, // Credit card pattern
      /\b\d{3}-\d{2}-\d{4}\b/, // SSN pattern
      /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g // Email pattern
    ]

    for (const pattern of personalInfoPatterns) {
      if (pattern.test(systemPrompt)) {
        risks.push('Potential personal information detected')
      }
    }

    return {
      isSafe: risks.length === 0,
      risks,
      blocked
    }
  }

  /**
   * Quality score calculation (0-100)
   */
  static calculateQualityScore(template: Partial<SimplifiedPersonaTemplate>): {
    score: number
    breakdown: Record<string, number>
    feedback: string[]
  } {
    const breakdown: Record<string, number> = {}
    const feedback: string[] = []
    let totalScore = 0

    // Name quality (0-15 points)
    if (template.name) {
      const nameScore = Math.min(15, template.name.trim().length * 0.3)
      breakdown.name = nameScore
      totalScore += nameScore
      
      if (nameScore < 10) {
        feedback.push('Consider a more descriptive template name')
      }
    }

    // System prompt quality (0-50 points)
    if (template.system_prompt) {
      const promptLength = template.system_prompt.length
      const lengthScore = Math.min(25, (promptLength / 200) * 25)
      const specificityScore = this.calculateSpecificityScore(template.system_prompt)
      const promptScore = lengthScore + specificityScore
      
      breakdown.system_prompt = promptScore
      totalScore += promptScore
      
      if (promptScore < 35) {
        feedback.push('System prompt could be more detailed and specific')
      }
    }

    // Mode compliance (0-20 points)
    const modeCompliance = this.validateModeCompliance(template)
    const complianceScore = modeCompliance.isCompliant ? 20 : Math.max(0, 20 - modeCompliance.issues.length * 5)
    breakdown.mode_compliance = complianceScore
    totalScore += complianceScore

    // Description quality (0-10 points)
    if (template.description) {
      const descScore = Math.min(10, template.description.trim().length * 0.1)
      breakdown.description = descScore
      totalScore += descScore
    } else {
      feedback.push('Adding a description would improve template clarity')
    }

    // Security (0-5 points)
    if (template.system_prompt) {
      const security = this.validateSecurity(template.system_prompt)
      const securityScore = security.isSafe ? 5 : 0
      breakdown.security = securityScore
      totalScore += securityScore
      
      if (!security.isSafe) {
        feedback.push('Template has potential security concerns')
      }
    }

    return {
      score: Math.min(100, Math.round(totalScore)),
      breakdown,
      feedback
    }
  }

  /**
   * Calculate specificity score for system prompt
   */
  private static calculateSpecificityScore(systemPrompt: string): number {
    const specificityIndicators = [
      'academic', 'research', 'methodology', 'analysis',
      'citation', 'literature', 'evidence', 'hypothesis',
      'formal', 'casual', 'Jakarta', 'Indonesian'
    ]

    const matches = specificityIndicators.filter(indicator =>
      systemPrompt.toLowerCase().includes(indicator)
    )

    return Math.min(25, matches.length * 3)
  }
}

// ============================================
// QUALITY METRICS CALCULATOR
// ============================================

export class QualityMetrics {
  /**
   * Calculate comprehensive quality metrics for a template
   */
  static analyzeTemplate(template: SimplifiedPersonaTemplate): {
    qualityScore: number
    readabilityScore: number
    completenessScore: number
    modeAlignmentScore: number
    recommendedImprovements: string[]
  } {
    const qualityAssessment = TemplateValidationEngine.calculateQualityScore(template)
    const readability = this.calculateReadabilityScore(template.system_prompt)
    const completeness = this.calculateCompletenessScore(template)
    const modeAlignment = this.calculateModeAlignmentScore(template)

    const recommendations = [
      ...qualityAssessment.feedback,
      ...this.generateImprovementSuggestions(template)
    ]

    return {
      qualityScore: qualityAssessment.score,
      readabilityScore: readability,
      completenessScore: completeness,
      modeAlignmentScore: modeAlignment,
      recommendedImprovements: recommendations
    }
  }

  /**
   * Calculate readability score (Flesch Reading Ease adapted for Indonesian)
   */
  private static calculateReadabilityScore(systemPrompt: string): number {
    const sentences = systemPrompt.split(/[.!?]+/).filter(s => s.trim().length > 0)
    const words = systemPrompt.trim().split(/\s+/)
    const syllables = this.estimateIndonesianSyllables(systemPrompt)

    if (sentences.length === 0 || words.length === 0) return 0

    const avgWordsPerSentence = words.length / sentences.length
    const avgSyllablesPerWord = syllables / words.length

    // Adapted Flesch formula for Indonesian
    const score = 206.835 - (1.015 * avgWordsPerSentence) - (84.6 * avgSyllablesPerWord)
    
    return Math.max(0, Math.min(100, Math.round(score)))
  }

  /**
   * Estimate syllables in Indonesian text
   */
  private static estimateIndonesianSyllables(text: string): number {
    const vowelPattern = /[aiueoAIUEO]/g
    const matches = text.match(vowelPattern)
    return matches ? matches.length : 0
  }

  /**
   * Calculate completeness score
   */
  private static calculateCompletenessScore(template: SimplifiedPersonaTemplate): number {
    let score = 0

    // Required fields
    if (template.name?.trim()) score += 25
    if (template.system_prompt?.trim()) score += 50
    if (template.chat_mode) score += 15

    // Optional but recommended fields
    if (template.description?.trim()) score += 10

    return score
  }

  /**
   * Calculate mode alignment score
   */
  private static calculateModeAlignmentScore(template: SimplifiedPersonaTemplate): number {
    const modeCompliance = TemplateValidationEngine.validateModeCompliance(template)
    
    if (modeCompliance.isCompliant) {
      return 100 - (modeCompliance.suggestions.length * 5)
    } else {
      return Math.max(0, 70 - (modeCompliance.issues.length * 15))
    }
  }

  /**
   * Generate improvement suggestions
   */
  private static generateImprovementSuggestions(template: SimplifiedPersonaTemplate): string[] {
    const suggestions: string[] = []

    const qualityScore = TemplateValidationEngine.calculateQualityScore(template).score
    
    if (qualityScore < 60) {
      suggestions.push('Overall template quality needs improvement')
    }

    const readabilityScore = this.calculateReadabilityScore(template.system_prompt)
    if (readabilityScore < 50) {
      suggestions.push('Consider simplifying language for better readability')
    } else if (readabilityScore > 90) {
      suggestions.push('Consider adding more detailed instructions')
    }

    return suggestions
  }
}