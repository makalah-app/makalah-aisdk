// ============================================
// MAKALAH AI: Template Quality Metrics
// ============================================
// Task P06.3: Advanced quality assessment and scoring algorithms
// Created: August 2025
// Purpose: Comprehensive template quality analysis and improvement recommendations

import type { 
  SimplifiedPersonaTemplate,
  ChatModeType 
} from '@/types/persona-simplified'

// ============================================
// QUALITY ASSESSMENT INTERFACES
// ============================================

export interface QualityAssessment {
  overall_score: number // 0-100
  category_scores: {
    clarity: number // How clear and understandable the prompt is
    specificity: number // How specific vs generic the prompt is
    mode_alignment: number // How well it matches the intended chat mode
    completeness: number // How complete the template information is
    safety: number // How safe from prompt injection and inappropriate content
    academic_relevance: number // How relevant to academic context
  }
  detailed_feedback: QualityFeedback[]
  improvement_priority: 'low' | 'medium' | 'high' | 'critical'
  estimated_effectiveness: number // Predicted user satisfaction score
}

export interface QualityFeedback {
  category: keyof QualityAssessment['category_scores']
  type: 'error' | 'warning' | 'suggestion' | 'tip'
  severity: 'low' | 'medium' | 'high' | 'critical'
  message: string
  suggestion?: string
  auto_fixable: boolean
}

export interface TemplateAnalytics {
  performance_metrics: {
    usage_frequency: number
    user_satisfaction: number
    completion_rate: number
    error_rate: number
    average_response_time: number
  }
  linguistic_analysis: {
    readability_score: number
    complexity_level: 'simple' | 'moderate' | 'complex'
    tone_consistency: number
    vocabulary_richness: number
  }
  comparative_analysis: {
    rank_in_category: number
    total_in_category: number
    percentile: number
    similar_templates: string[]
  }
}

// ============================================
// ADVANCED QUALITY ANALYZER
// ============================================

export class AdvancedQualityAnalyzer {
  /**
   * Perform comprehensive quality assessment
   */
  static async assessQuality(template: SimplifiedPersonaTemplate): Promise<QualityAssessment> {
    const categoryScores = {
      clarity: await this.assessClarity(template.system_prompt),
      specificity: await this.assessSpecificity(template.system_prompt),
      mode_alignment: await this.assessModeAlignment(template),
      completeness: await this.assessCompleteness(template),
      safety: await this.assessSafety(template.system_prompt),
      academic_relevance: await this.assessAcademicRelevance(template.system_prompt)
    }

    const overallScore = this.calculateOverallScore(categoryScores)
    const feedback = await this.generateDetailedFeedback(template, categoryScores)
    const improvementPriority = this.determinePriority(overallScore, feedback)
    const estimatedEffectiveness = this.estimateEffectiveness(categoryScores)

    return {
      overall_score: overallScore,
      category_scores: categoryScores,
      detailed_feedback: feedback,
      improvement_priority: improvementPriority,
      estimated_effectiveness: estimatedEffectiveness
    }
  }

  /**
   * Assess clarity of system prompt
   */
  private static async assessClarity(systemPrompt: string): Promise<number> {
    let score = 100

    // Check for ambiguous phrases
    const ambiguousPatterns = [
      /help with anything/gi,
      /whatever you need/gi,
      /any questions/gi,
      /general purpose/gi,
      /all topics/gi
    ]

    for (const pattern of ambiguousPatterns) {
      if (pattern.test(systemPrompt)) {
        score -= 20
      }
    }

    // Check for clear role definition
    const roleIndicators = [
      /you are/gi,
      /your role/gi,
      /you will/gi,
      /you should/gi,
      /your task/gi
    ]

    const hasRoleDefinition = roleIndicators.some(pattern => pattern.test(systemPrompt))
    if (!hasRoleDefinition) {
      score -= 15
    }

    // Check for clear instructions
    const instructionWords = ['will', 'should', 'must', 'always', 'never', 'when', 'if']
    const instructionCount = instructionWords.filter(word => 
      systemPrompt.toLowerCase().includes(word)
    ).length

    if (instructionCount < 3) {
      score -= 10
    }

    // Check sentence structure complexity
    const sentences = systemPrompt.split(/[.!?]+/).filter(s => s.trim())
    const avgWordsPerSentence = systemPrompt.split(/\s+/).length / sentences.length

    if (avgWordsPerSentence > 25) {
      score -= 15 // Too complex
    } else if (avgWordsPerSentence < 8) {
      score -= 10 // Too simple
    }

    return Math.max(0, Math.min(100, score))
  }

  /**
   * Assess specificity vs generality
   */
  private static async assessSpecificity(systemPrompt: string): Promise<number> {
    let score = 50 // Start from middle

    // Domain-specific terms (academic context)
    const academicTerms = [
      'research', 'methodology', 'analysis', 'literature', 'citation',
      'hypothesis', 'evidence', 'peer review', 'academic', 'scholarly',
      'thesis', 'dissertation', 'journal', 'publication', 'study'
    ]

    const foundAcademicTerms = academicTerms.filter(term => 
      systemPrompt.toLowerCase().includes(term)
    )

    score += Math.min(30, foundAcademicTerms.length * 5)

    // Technical specificity
    const technicalTerms = [
      'algorithm', 'framework', 'model', 'theory', 'principle',
      'concept', 'approach', 'technique', 'method', 'process'
    ]

    const foundTechnicalTerms = technicalTerms.filter(term =>
      systemPrompt.toLowerCase().includes(term)
    )

    score += Math.min(20, foundTechnicalTerms.length * 3)

    // Check for generic language
    const genericPhrases = [
      'help you', 'assist you', 'answer questions', 'provide information',
      'general assistance', 'anything you need'
    ]

    const foundGenericPhrases = genericPhrases.filter(phrase =>
      systemPrompt.toLowerCase().includes(phrase)
    )

    score -= foundGenericPhrases.length * 10

    return Math.max(0, Math.min(100, score))
  }

  /**
   * Assess alignment with chat mode
   */
  private static async assessModeAlignment(template: SimplifiedPersonaTemplate): Promise<number> {
    const { system_prompt, chat_mode } = template
    let score = 100

    if (chat_mode === 'formal') {
      // Check for formal language indicators
      const formalIndicators = [
        'Anda', 'Saudara', 'akademik', 'formal', 'standar',
        'metodologi', 'analisis', 'penelitian', 'ilmiah'
      ]

      const foundFormal = formalIndicators.filter(indicator =>
        system_prompt.includes(indicator)
      )

      if (foundFormal.length < 2) {
        score -= 30
      }

      // Check for casual language (negative for formal mode)
      const casualIndicators = ['gue', 'lo', 'elu', 'gw', 'lu', 'dong', 'sih', 'nih']
      const foundCasual = casualIndicators.filter(indicator =>
        system_prompt.toLowerCase().includes(indicator)
      )

      score -= foundCasual.length * 20

    } else if (chat_mode === 'casual') {
      // Check for casual language indicators
      const casualIndicators = [
        'gue', 'lo', 'elu', 'gw', 'lu', 'dong', 'sih', 'nih',
        'santai', 'friendly', 'temen', 'buddy', 'asik'
      ]

      const foundCasual = casualIndicators.filter(indicator =>
        system_prompt.toLowerCase().includes(indicator)
      )

      if (foundCasual.length < 3) {
        score -= 25
      }

      // Check for overly formal language (negative for casual mode)
      const formalIndicators = ['Anda', 'Saudara', 'dengan hormat', 'terima kasih']
      const foundFormal = formalIndicators.filter(indicator =>
        system_prompt.includes(indicator)
      )

      score -= foundFormal.length * 15
    }

    return Math.max(0, Math.min(100, score))
  }

  /**
   * Assess completeness of template
   */
  private static async assessCompleteness(template: SimplifiedPersonaTemplate): Promise<number> {
    let score = 0

    // Required fields
    if (template.name?.trim()) score += 20
    if (template.system_prompt?.trim()) score += 40
    if (template.chat_mode) score += 20

    // Optional but valuable fields
    if (template.description?.trim()) score += 15

    // System prompt completeness
    if (template.system_prompt) {
      const promptLength = template.system_prompt.length
      if (promptLength >= 200) score += 5
      if (promptLength >= 500) score += 5
    }

    // Name descriptiveness
    if (template.name && template.name.split(' ').length >= 3) {
      score += 5
    }

    return Math.min(100, score)
  }

  /**
   * Assess safety from prompt injection and inappropriate content
   */
  private static async assessSafety(systemPrompt: string): Promise<number> {
    let score = 100

    // Prompt injection patterns
    const injectionPatterns = [
      /ignore\s+previous\s+instructions/gi,
      /system\s*:\s*you\s+are\s+now/gi,
      /\[system\]/gi,
      /override\s+your\s+guidelines/gi,
      /forget\s+everything\s+above/gi,
      /<\|im_start\|>/gi,
      /<\|im_end\|>/gi,
      /jailbreak/gi,
      /roleplay\s+as/gi
    ]

    for (const pattern of injectionPatterns) {
      if (pattern.test(systemPrompt)) {
        score -= 40 // Major penalty for injection attempts
      }
    }

    // Inappropriate content patterns
    const inappropriatePatterns = [
      /\b(hate|violence|harm|illegal|drugs|weapons|adult|nsfw)\b/gi
    ]

    for (const pattern of inappropriatePatterns) {
      if (pattern.test(systemPrompt)) {
        score -= 25
      }
    }

    // Personal information patterns
    const personalInfoPatterns = [
      /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/, // Credit card
      /\b\d{3}-\d{2}-\d{4}\b/, // SSN
      /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g // Email
    ]

    for (const pattern of personalInfoPatterns) {
      if (pattern.test(systemPrompt)) {
        score -= 15
      }
    }

    return Math.max(0, score)
  }

  /**
   * Assess academic relevance
   */
  private static async assessAcademicRelevance(systemPrompt: string): Promise<number> {
    let score = 0

    // Academic keywords
    const academicKeywords = [
      'academic', 'research', 'study', 'analysis', 'methodology',
      'literature', 'citation', 'reference', 'peer review', 'evidence',
      'hypothesis', 'theory', 'framework', 'scholarly', 'publication',
      'journal', 'thesis', 'dissertation', 'akademik', 'penelitian',
      'analisis', 'metodologi', 'literatur', 'sitasi', 'referensi'
    ]

    const foundKeywords = academicKeywords.filter(keyword =>
      systemPrompt.toLowerCase().includes(keyword)
    )

    score += Math.min(40, foundKeywords.length * 4)

    // Academic processes
    const academicProcesses = [
      'literature review', 'data collection', 'data analysis',
      'hypothesis testing', 'peer review', 'citation management',
      'bibliography', 'abstract writing', 'methodology design'
    ]

    const foundProcesses = academicProcesses.filter(process =>
      systemPrompt.toLowerCase().includes(process)
    )

    score += Math.min(30, foundProcesses.length * 10)

    // Academic standards
    const standardsKeywords = [
      'APA', 'MLA', 'Chicago', 'IEEE', 'Harvard', 'plagiarism',
      'originality', 'integrity', 'ethics', 'rigor'
    ]

    const foundStandards = standardsKeywords.filter(standard =>
      systemPrompt.toLowerCase().includes(standard.toLowerCase())
    )

    score += Math.min(30, foundStandards.length * 6)

    return Math.min(100, score)
  }

  /**
   * Calculate overall score from category scores
   */
  private static calculateOverallScore(categoryScores: QualityAssessment['category_scores']): number {
    const weights = {
      clarity: 0.25,
      specificity: 0.20,
      mode_alignment: 0.20,
      completeness: 0.15,
      safety: 0.10,
      academic_relevance: 0.10
    }

    let weightedSum = 0
    let totalWeight = 0

    for (const [category, score] of Object.entries(categoryScores)) {
      const weight = weights[category as keyof typeof weights]
      weightedSum += score * weight
      totalWeight += weight
    }

    return Math.round(weightedSum / totalWeight)
  }

  /**
   * Generate detailed feedback
   */
  private static async generateDetailedFeedback(
    template: SimplifiedPersonaTemplate,
    scores: QualityAssessment['category_scores']
  ): Promise<QualityFeedback[]> {
    const feedback: QualityFeedback[] = []

    // Clarity feedback
    if (scores.clarity < 70) {
      feedback.push({
        category: 'clarity',
        type: scores.clarity < 40 ? 'error' : 'warning',
        severity: scores.clarity < 40 ? 'critical' : 'medium',
        message: 'System prompt lacks clarity and specific instructions',
        suggestion: 'Use more specific language and clear role definitions',
        auto_fixable: false
      })
    }

    // Mode alignment feedback
    if (scores.mode_alignment < 60) {
      feedback.push({
        category: 'mode_alignment',
        type: 'warning',
        severity: 'high',
        message: `Template language doesn't align well with ${template.chat_mode} mode`,
        suggestion: template.chat_mode === 'formal' 
          ? 'Use more formal Indonesian language and academic terminology'
          : 'Use more casual Jakarta language (gue-lo style)',
        auto_fixable: false
      })
    }

    // Safety feedback
    if (scores.safety < 90) {
      feedback.push({
        category: 'safety',
        type: 'error',
        severity: 'critical',
        message: 'Potential security or safety issues detected',
        suggestion: 'Remove any prompt injection patterns or inappropriate content',
        auto_fixable: true
      })
    }

    // Academic relevance feedback
    if (scores.academic_relevance < 50) {
      feedback.push({
        category: 'academic_relevance',
        type: 'suggestion',
        severity: 'medium',
        message: 'Template could be more academically focused',
        suggestion: 'Add more academic context and terminology',
        auto_fixable: false
      })
    }

    return feedback
  }

  /**
   * Determine improvement priority
   */
  private static determinePriority(
    overallScore: number, 
    feedback: QualityFeedback[]
  ): 'low' | 'medium' | 'high' | 'critical' {
    const criticalIssues = feedback.filter(f => f.severity === 'critical')
    const highIssues = feedback.filter(f => f.severity === 'high')

    if (criticalIssues.length > 0 || overallScore < 40) {
      return 'critical'
    } else if (highIssues.length > 0 || overallScore < 60) {
      return 'high'
    } else if (overallScore < 80) {
      return 'medium'
    } else {
      return 'low'
    }
  }

  /**
   * Estimate effectiveness based on quality scores
   */
  private static estimateEffectiveness(scores: QualityAssessment['category_scores']): number {
    // Weight different factors for effectiveness prediction
    const effectivenessWeights = {
      clarity: 0.30, // Most important for user experience
      mode_alignment: 0.25, // Important for meeting user expectations
      academic_relevance: 0.20, // Important for Makalah AI context
      specificity: 0.15, // Important for useful responses
      completeness: 0.10, // Less critical for effectiveness
      safety: 0.00 // Safety is binary - either safe or not
    }

    let weightedSum = 0
    for (const [category, score] of Object.entries(scores)) {
      const weight = effectivenessWeights[category as keyof typeof effectivenessWeights]
      weightedSum += score * weight
    }

    // Apply safety penalty
    if (scores.safety < 90) {
      weightedSum *= 0.5 // Major penalty for safety issues
    }

    return Math.round(weightedSum)
  }

  /**
   * Generate improvement recommendations
   */
  static generateImprovementPlan(assessment: QualityAssessment): {
    quick_wins: string[]
    major_improvements: string[]
    long_term_goals: string[]
    estimated_effort: 'low' | 'medium' | 'high'
  } {
    const quickWins: string[] = []
    const majorImprovements: string[] = []
    const longTermGoals: string[] = []

    // Analyze feedback for categorization
    const autoFixable = assessment.detailed_feedback.filter(f => f.auto_fixable)
    const criticalIssues = assessment.detailed_feedback.filter(f => f.severity === 'critical')
    const mediumIssues = assessment.detailed_feedback.filter(f => f.severity === 'medium')

    // Quick wins (auto-fixable and low effort)
    quickWins.push(...autoFixable.map(f => f.suggestion || f.message))

    if (assessment.category_scores.completeness < 80) {
      quickWins.push('Add a descriptive template description')
    }

    // Major improvements (critical and high impact)
    majorImprovements.push(...criticalIssues.map(f => f.suggestion || f.message))

    if (assessment.category_scores.mode_alignment < 60) {
      majorImprovements.push('Rewrite system prompt to better match intended chat mode')
    }

    if (assessment.category_scores.clarity < 60) {
      majorImprovements.push('Restructure system prompt for better clarity and specificity')
    }

    // Long-term goals (strategic improvements)
    if (assessment.category_scores.academic_relevance < 70) {
      longTermGoals.push('Enhance academic context and terminology')
    }

    if (assessment.estimated_effectiveness < 75) {
      longTermGoals.push('Conduct user testing and iterative improvements')
    }

    const estimatedEffort = this.estimateImprovementEffort(assessment)

    return {
      quick_wins: quickWins,
      major_improvements: majorImprovements,
      long_term_goals: longTermGoals,
      estimated_effort: estimatedEffort
    }
  }

  /**
   * Estimate effort required for improvements
   */
  private static estimateImprovementEffort(assessment: QualityAssessment): 'low' | 'medium' | 'high' {
    const criticalCount = assessment.detailed_feedback.filter(f => f.severity === 'critical').length
    const highCount = assessment.detailed_feedback.filter(f => f.severity === 'high').length
    
    if (criticalCount > 2 || assessment.overall_score < 40) {
      return 'high'
    } else if (criticalCount > 0 || highCount > 2 || assessment.overall_score < 70) {
      return 'medium'
    } else {
      return 'low'
    }
  }
}