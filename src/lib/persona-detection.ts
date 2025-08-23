// ============================================
// MAKALAH AI: Persona Mode Detection Framework
// ============================================
// Task P04.1: Persona Mode Detection for Tool Responses
// Created: August 2025
// Features: Intelligent persona context analysis for tool orchestration

import type { PersonaTemplate, PersonaMode } from '@/types/persona'

// ============================================
// PERSONA MODE DETECTION TYPES
// ============================================

export interface PersonaModeContext {
  mode: 'formal' | 'casual'
  academicMode: PersonaMode | null
  confidence: number
  indicators: PersonaIndicator[]
  toolBehavior: ToolBehaviorProfile
}

export interface PersonaIndicator {
  type: 'language_style' | 'academic_mode' | 'chat_mode' | 'system_prompt' | 'tools_enabled'
  value: string
  weight: number
  confidence: number
}

export interface ToolBehaviorProfile {
  web_search: {
    searchStrategy: 'academic_focused' | 'casual_practical'
    sourceQuality: 'peer_reviewed_only' | 'general_credible'
    citationStyle: 'full_academic' | 'simplified'
    languageStyle: 'formal' | 'casual'
  }
  artifact_store: {
    artifactType: '8_phase_academic' | 'conversation_summary'
    qualityThreshold: 'publication_ready' | 'standard'
    metadataDepth: 'comprehensive' | 'basic'
    structureFormat: 'academic_structured' | 'casual_notes'
  }
  cite_manager: {
    citationDepth: 'full_bibliographic' | 'simplified_attribution'
    validationLevel: 'expert_verification' | 'basic_check'
    formatCompliance: 'strict_academic' | 'flexible'
    languageStyle: 'formal_academic' | 'casual_reference'
  }
}

// ============================================
// PERSONA DETECTION FRAMEWORK
// ============================================

export class PersonaDetectionFramework {
  private formalAcademicIndicators = [
    // Formal language patterns
    'bahasa Indonesia formal',
    'standar akademik',
    'metodologi penelitian',
    'evidence-based',
    'scholarly discourse',
    'academic integrity',
    'peer-reviewed',
    'publication standards',
    'rigorous',
    'comprehensive',
    'systematic approach',
    'theoretical framework',
    'empirical analysis'
  ]

  private casualConversationIndicators = [
    // Jakarta casual language patterns  
    'gue-lo',
    'bahasa santai',
    'ngobrol',
    'ala Jakarta',
    'feel free',
    'santai tapi',
    'enak dipahami',
    'bercanda dikit',
    'natural',
    'friendly',
    'relaxed',
    'conversational'
  ]

  private academicModeIndicators = {
    Research: [
      'literature review',
      'gap analysis',
      'research methodology',
      'data collection',
      'systematic review',
      'research questions',
      'hypothesis',
      'empirical study'
    ],
    Writing: [
      'academic writing',
      'argument development',
      'thesis statement',
      'paragraph structure',
      'draft writing',
      'scholarly voice',
      'academic tone',
      'writing style'
    ],
    Review: [
      'peer review',
      'quality assessment',
      'evaluation criteria',
      'critical analysis',
      'academic standards',
      'citation checking',
      'format compliance',
      'manuscript review'
    ]
  }

  // ============================================
  // CORE DETECTION METHODS
  // ============================================

  /**
   * Analyze system prompt and persona context to determine mode
   */
  detectPersonaMode(
    systemPrompt: string, 
    persona?: PersonaTemplate, 
    chatMode?: 'formal' | 'casual'
  ): PersonaModeContext {
    const indicators: PersonaIndicator[] = []
    
    // 1. Direct persona analysis (highest priority)
    if (persona) {
      indicators.push({
        type: 'system_prompt',
        value: `persona_mode:${persona.chat_mode_type}`,
        weight: 0.4,
        confidence: 0.95
      })

      indicators.push({
        type: 'academic_mode',
        value: `academic_mode:${persona.mode}`,
        weight: 0.3,
        confidence: 0.95
      })

      if (persona.configuration.tools_enabled) {
        indicators.push({
          type: 'tools_enabled',
          value: persona.configuration.tools_enabled.join(','),
          weight: 0.1,
          confidence: 0.8
        })
      }
    }

    // 2. Chat mode analysis (medium priority)
    if (chatMode) {
      indicators.push({
        type: 'chat_mode',
        value: `chat_mode:${chatMode}`,
        weight: 0.3,
        confidence: 0.9
      })
    }

    // 3. System prompt content analysis (lower priority but important for fallback)
    const promptAnalysis = this.analyzeSystemPromptContent(systemPrompt)
    indicators.push(...promptAnalysis)

    // 4. Calculate overall mode detection
    const detection = this.calculateModeFromIndicators(indicators)
    const toolBehavior = this.generateToolBehaviorProfile(detection.mode, detection.academicMode)

    return {
      mode: detection.mode,
      academicMode: detection.academicMode,
      confidence: detection.confidence,
      indicators,
      toolBehavior
    }
  }

  /**
   * Analyze system prompt text content for persona indicators
   */
  private analyzeSystemPromptContent(systemPrompt: string): PersonaIndicator[] {
    const indicators: PersonaIndicator[] = []
    const lowercasePrompt = systemPrompt.toLowerCase()

    // Check for formal academic indicators
    let formalScore = 0
    let formalMatches: string[] = []
    
    for (const indicator of this.formalAcademicIndicators) {
      if (lowercasePrompt.includes(indicator.toLowerCase())) {
        formalScore += 1
        formalMatches.push(indicator)
      }
    }

    if (formalScore > 0) {
      indicators.push({
        type: 'language_style',
        value: `formal_academic:${formalMatches.join(',')}`,
        weight: 0.2,
        confidence: Math.min(0.9, formalScore / this.formalAcademicIndicators.length * 2)
      })
    }

    // Check for casual conversation indicators
    let casualScore = 0
    let casualMatches: string[] = []
    
    for (const indicator of this.casualConversationIndicators) {
      if (lowercasePrompt.includes(indicator.toLowerCase())) {
        casualScore += 1
        casualMatches.push(indicator)
      }
    }

    if (casualScore > 0) {
      indicators.push({
        type: 'language_style',
        value: `casual_conversation:${casualMatches.join(',')}`,
        weight: 0.2,
        confidence: Math.min(0.9, casualScore / this.casualConversationIndicators.length * 2)
      })
    }

    // Check for specific academic modes
    for (const [mode, modeIndicators] of Object.entries(this.academicModeIndicators)) {
      let modeScore = 0
      let modeMatches: string[] = []

      for (const indicator of modeIndicators) {
        if (lowercasePrompt.includes(indicator.toLowerCase())) {
          modeScore += 1
          modeMatches.push(indicator)
        }
      }

      if (modeScore > 0) {
        indicators.push({
          type: 'academic_mode',
          value: `${mode.toLowerCase()}:${modeMatches.join(',')}`,
          weight: 0.15,
          confidence: Math.min(0.8, modeScore / modeIndicators.length * 2)
        })
      }
    }

    return indicators
  }

  /**
   * Calculate final mode detection from all indicators
   */
  private calculateModeFromIndicators(indicators: PersonaIndicator[]): {
    mode: 'formal' | 'casual'
    academicMode: PersonaMode | null
    confidence: number
  } {
    let formalScore = 0
    let casualScore = 0
    let academicModeScores: Record<string, number> = {}

    // Weighted scoring from indicators
    for (const indicator of indicators) {
      const score = indicator.weight * indicator.confidence

      // Mode detection
      if (indicator.type === 'chat_mode' || indicator.type === 'system_prompt') {
        if (indicator.value.includes('formal') || indicator.value.includes('academic')) {
          formalScore += score * 1.5 // Higher weight for direct indicators
        } else if (indicator.value.includes('casual')) {
          casualScore += score * 1.5
        }
      } else if (indicator.type === 'language_style') {
        if (indicator.value.includes('formal_academic')) {
          formalScore += score
        } else if (indicator.value.includes('casual_conversation')) {
          casualScore += score
        }
      }

      // Academic mode detection
      if (indicator.type === 'academic_mode') {
        const modeMatch = indicator.value.match(/^(research|writing|review):/i)
        if (modeMatch) {
          const mode = modeMatch[1].toLowerCase()
          const capitalizedMode = mode.charAt(0).toUpperCase() + mode.slice(1) as PersonaMode
          academicModeScores[capitalizedMode] = (academicModeScores[capitalizedMode] || 0) + score
        }
      }
    }

    // Determine final mode
    const totalScore = formalScore + casualScore
    const mode: 'formal' | 'casual' = formalScore >= casualScore ? 'formal' : 'casual'
    const confidence = totalScore > 0 ? Math.max(formalScore, casualScore) / totalScore : 0.5

    // Determine academic mode (if formal)
    let academicMode: PersonaMode | null = null
    if (mode === 'formal' && Object.keys(academicModeScores).length > 0) {
      const topMode = Object.entries(academicModeScores).reduce((a, b) => a[1] > b[1] ? a : b)
      academicMode = topMode[0] as PersonaMode
    }

    return {
      mode,
      academicMode,
      confidence: Math.min(0.95, Math.max(0.3, confidence))
    }
  }

  /**
   * Generate tool behavior profile based on detected mode
   */
  private generateToolBehaviorProfile(
    mode: 'formal' | 'casual', 
    academicMode: PersonaMode | null
  ): ToolBehaviorProfile {
    if (mode === 'formal') {
      return {
        web_search: {
          searchStrategy: 'academic_focused',
          sourceQuality: 'peer_reviewed_only',
          citationStyle: 'full_academic',
          languageStyle: 'formal'
        },
        artifact_store: {
          artifactType: '8_phase_academic',
          qualityThreshold: 'publication_ready',
          metadataDepth: 'comprehensive',
          structureFormat: 'academic_structured'
        },
        cite_manager: {
          citationDepth: 'full_bibliographic',
          validationLevel: 'expert_verification',
          formatCompliance: 'strict_academic',
          languageStyle: 'formal_academic'
        }
      }
    } else {
      return {
        web_search: {
          searchStrategy: 'casual_practical',
          sourceQuality: 'general_credible',
          citationStyle: 'simplified',
          languageStyle: 'casual'
        },
        artifact_store: {
          artifactType: 'conversation_summary',
          qualityThreshold: 'standard',
          metadataDepth: 'basic',
          structureFormat: 'casual_notes'
        },
        cite_manager: {
          citationDepth: 'simplified_attribution',
          validationLevel: 'basic_check',
          formatCompliance: 'flexible',
          languageStyle: 'casual_reference'
        }
      }
    }
  }

  // ============================================
  // UTILITY METHODS
  // ============================================

  /**
   * Quick persona mode check for tool routing
   */
  isAcademicMode(context: PersonaModeContext): boolean {
    return context.mode === 'formal' && context.confidence > 0.6
  }

  /**
   * Get academic mode with confidence threshold
   */
  getAcademicMode(context: PersonaModeContext, minConfidence = 0.6): PersonaMode | null {
    return context.confidence >= minConfidence ? context.academicMode : null
  }

  /**
   * Get language style for tool responses
   */
  getLanguageStyle(context: PersonaModeContext): 'formal' | 'casual' {
    return context.mode
  }

  /**
   * Get tool-specific behavior config
   */
  getToolBehavior<T extends keyof ToolBehaviorProfile>(
    context: PersonaModeContext, 
    tool: T
  ): ToolBehaviorProfile[T] {
    return context.toolBehavior[tool]
  }
}

// ============================================
// SINGLETON INSTANCE
// ============================================

export const personaDetector = new PersonaDetectionFramework()

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Extract persona context from AI SDK request parameters
 */
export function extractPersonaContext(
  systemPrompt: string,
  requestParams?: {
    persona?: PersonaTemplate
    chat_mode?: 'formal' | 'casual'
    session_context?: any
  }
): PersonaModeContext {
  return personaDetector.detectPersonaMode(
    systemPrompt,
    requestParams?.persona,
    requestParams?.chat_mode
  )
}

/**
 * Generate persona-aware tool configuration
 */
export function generatePersonaAwareToolConfig(context: PersonaModeContext) {
  return {
    search_strategy: context.toolBehavior.web_search.searchStrategy,
    citation_style: context.toolBehavior.cite_manager.languageStyle,
    artifact_format: context.toolBehavior.artifact_store.structureFormat,
    language_style: context.mode,
    academic_mode: context.academicMode,
    confidence: context.confidence
  }
}