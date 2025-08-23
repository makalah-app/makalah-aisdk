// ============================================
// MAKALAH AI: Persona Workflow Integration Service
// ============================================
// Task 02 Implementation: Database-Driven Academic Persona System
// Created: August 2025
// Features: Default persona assignment and workflow integration

import type { 
  PersonaTemplate, 
  PersonaMode,
  WorkflowPhasePersona,
  WorkflowPersonaMapping
} from '@/types/persona'
import { personaService } from './persona-service'

// ============================================
// ACADEMIC PHASE PERSONA MAPPING
// ============================================

const DEFAULT_PHASE_PERSONA_MAPPING: Record<number, {
  primaryMode: PersonaMode
  secondaryModes: PersonaMode[]
  description: string
  autoSwitchTriggers: string[]
}> = {
  1: {
    primaryMode: 'Research',
    secondaryModes: ['Writing'],
    description: 'Topic definition requires research skills to identify viable, specific, and researchable topics',
    autoSwitchTriggers: [
      'user asks for topic suggestions',
      'user needs help narrowing down broad topics',
      'user requests literature search for topic validation'
    ]
  },
  2: {
    primaryMode: 'Research',
    secondaryModes: ['Writing'],
    description: 'Research notes collection phase - systematic information gathering and source evaluation',
    autoSwitchTriggers: [
      'user starts literature search',
      'user asks for source evaluation',
      'user needs help with research methodology'
    ]
  },
  3: {
    primaryMode: 'Research', 
    secondaryModes: ['Writing'],
    description: 'Literature review synthesis - critical analysis and gap identification',
    autoSwitchTriggers: [
      'user begins literature synthesis',
      'user asks for gap analysis',
      'user needs theoretical framework development'
    ]
  },
  4: {
    primaryMode: 'Writing',
    secondaryModes: ['Research'],
    description: 'Outline creation - structure development and argument organization',
    autoSwitchTriggers: [
      'user starts drafting outline',
      'user asks for structure suggestions', 
      'user needs help organizing arguments'
    ]
  },
  5: {
    primaryMode: 'Writing',
    secondaryModes: ['Research'],
    description: 'First draft writing - content development and idea articulation',
    autoSwitchTriggers: [
      'user begins writing draft',
      'user asks for writing assistance',
      'user needs help with paragraph development'
    ]
  },
  6: {
    primaryMode: 'Review',
    secondaryModes: ['Writing'],
    description: 'Citations and references - accuracy and formatting compliance',
    autoSwitchTriggers: [
      'user adds citations',
      'user asks for citation help',
      'user needs reference formatting'
    ]
  },
  7: {
    primaryMode: 'Review',
    secondaryModes: ['Writing'],
    description: 'Final draft review - quality improvement and refinement',
    autoSwitchTriggers: [
      'user submits draft for review',
      'user asks for improvement suggestions',
      'user needs structural feedback'
    ]
  },
  8: {
    primaryMode: 'Review',
    secondaryModes: ['Writing'],
    description: 'Final paper preparation - submission readiness and compliance check',
    autoSwitchTriggers: [
      'user prepares final submission',
      'user asks for final review',
      'user needs formatting compliance check'
    ]
  }
}

// ============================================
// DISCIPLINE-SPECIFIC PERSONA PREFERENCES
// ============================================

const DISCIPLINE_PERSONA_PREFERENCES: Record<string, {
  preferredModes: PersonaMode[]
  modeWeights: Record<PersonaMode, number>
  specializations: string[]
}> = {
  'STEM': {
    preferredModes: ['Research', 'Review', 'Writing'],
    modeWeights: { Research: 0.5, Review: 0.3, Writing: 0.2 },
    specializations: ['methodology emphasis', 'data analysis', 'empirical evidence']
  },
  'Humaniora': {
    preferredModes: ['Writing', 'Research', 'Review'], 
    modeWeights: { Writing: 0.5, Research: 0.3, Review: 0.2 },
    specializations: ['interpretive analysis', 'cultural context', 'qualitative methods']
  },
  'Ilmu Sosial': {
    preferredModes: ['Research', 'Writing', 'Review'],
    modeWeights: { Research: 0.4, Writing: 0.4, Review: 0.2 },
    specializations: ['mixed methods', 'social implications', 'policy analysis']
  },
  'Sains Murni': {
    preferredModes: ['Research', 'Review', 'Writing'],
    modeWeights: { Research: 0.6, Review: 0.3, Writing: 0.1 },
    specializations: ['experimental design', 'statistical analysis', 'hypothesis testing']
  },
  'Teknik': {
    preferredModes: ['Research', 'Writing', 'Review'],
    modeWeights: { Research: 0.4, Writing: 0.4, Review: 0.2 },
    specializations: ['technical specifications', 'problem solving', 'implementation']
  },
  'Kedokteran': {
    preferredModes: ['Research', 'Review', 'Writing'],
    modeWeights: { Research: 0.5, Review: 0.4, Writing: 0.1 },
    specializations: ['evidence-based medicine', 'clinical research', 'ethical considerations']
  },
  'Ekonomi & Bisnis': {
    preferredModes: ['Research', 'Writing', 'Review'],
    modeWeights: { Research: 0.3, Writing: 0.5, Review: 0.2 },
    specializations: ['market analysis', 'financial implications', 'business strategy']
  },
  'Pendidikan': {
    preferredModes: ['Writing', 'Research', 'Review'],
    modeWeights: { Writing: 0.4, Research: 0.4, Review: 0.2 },
    specializations: ['learning theory', 'pedagogical approaches', 'educational psychology']
  }
}

// ============================================
// WORKFLOW PERSONA SERVICE
// ============================================

export class WorkflowPersonaService {

  // ============================================
  // DEFAULT PERSONA ASSIGNMENT
  // ============================================

  static async getDefaultPersonaForPhase(
    academicPhase: number,
    discipline?: string,
    academicLevel?: string
  ): Promise<PersonaTemplate | null> {
    try {
      const phaseMapping = DEFAULT_PHASE_PERSONA_MAPPING[academicPhase]
      if (!phaseMapping) return null

      const targetMode = phaseMapping.primaryMode
      
      // Get available personas for the mode
      const response = await personaService.getPersonas(targetMode, undefined, true)
      let candidates = response.personas

      // Filter by discipline if specified
      if (discipline && candidates.length > 1) {
        const disciplinePersonas = candidates.filter(p => p.discipline_id === discipline)
        if (disciplinePersonas.length > 0) {
          candidates = disciplinePersonas
        }
      }

      // Filter by academic level if specified
      if (academicLevel && candidates.length > 1) {
        const levelPersonas = candidates.filter(p => p.academic_level === academicLevel)
        if (levelPersonas.length > 0) {
          candidates = levelPersonas
        }
      }

      if (candidates.length === 0) return null

      // Return default persona for mode, or best performing one
      return candidates.find(p => p.is_default) || 
             candidates.sort((a, b) => b.success_rate - a.success_rate)[0]

    } catch (error) {
      console.error('Failed to get default persona for phase:', error)
      return null
    }
  }

  // ============================================
  // WORKFLOW PERSONA MAPPING GENERATION
  // ============================================

  static async generateWorkflowMapping(
    projectId: string,
    discipline: string,
    academicLevel: string = 'graduate',
    userPreferences?: Record<number, string>
  ): Promise<WorkflowPersonaMapping> {
    const phaseMappings: WorkflowPhasePersona[] = []

    // Generate mappings for all 8 phases
    for (let phase = 1; phase <= 8; phase++) {
      const phaseConfig = DEFAULT_PHASE_PERSONA_MAPPING[phase]
      
      // Get primary persona
      const primaryPersona = await this.getDefaultPersonaForPhase(
        phase, 
        discipline, 
        academicLevel
      )

      // Get alternative personas for secondary modes
      const alternativePersonas: PersonaTemplate[] = []
      
      for (const secondaryMode of phaseConfig.secondaryModes) {
        const response = await personaService.getPersonas(secondaryMode, undefined, true)
        const modePersonas = response.personas.filter(p => 
          p.id !== primaryPersona?.id && 
          (!discipline || p.discipline_id === discipline)
        )
        alternativePersonas.push(...modePersonas.slice(0, 2)) // Top 2 alternatives
      }

      phaseMappings.push({
        phase,
        recommended_mode: phaseConfig.primaryMode,
        primary_persona: primaryPersona,
        alternative_personas: alternativePersonas,
        auto_switch_triggers: phaseConfig.autoSwitchTriggers
      })
    }

    // Get fallback persona (most versatile)
    const fallbackResponse = await personaService.getPersonas(undefined, undefined, true)
    const fallbackPersona = fallbackResponse.personas
      .sort((a, b) => b.usage_count - a.usage_count)[0] // Most used persona

    return {
      project_id: projectId,
      phase_mappings: phaseMappings,
      default_fallback: fallbackPersona,
      user_overrides: userPreferences || {}
    }
  }

  // ============================================
  // PERSONA RECOMMENDATION ENGINE
  // ============================================

  static async getPersonaRecommendations(
    currentPhase: number,
    discipline?: string,
    context?: {
      previousPersona?: PersonaTemplate
      userQuery?: string
      sessionHistory?: any[]
    }
  ): Promise<{
    primary: PersonaTemplate | null
    alternatives: PersonaTemplate[]
    confidence: number
    reasoning: string
  }> {
    try {
      const phaseConfig = DEFAULT_PHASE_PERSONA_MAPPING[currentPhase]
      if (!phaseConfig) {
        return {
          primary: null,
          alternatives: [],
          confidence: 0,
          reasoning: 'Invalid academic phase'
        }
      }

      let confidence = 0.8 // Base confidence

      // Get primary recommendation
      const primary = await this.getDefaultPersonaForPhase(
        currentPhase,
        discipline
      )

      // Get alternatives from secondary modes
      const alternatives: PersonaTemplate[] = []
      
      for (const mode of phaseConfig.secondaryModes) {
        const response = await personaService.getPersonas(mode, undefined, true)
        const modePersonas = response.personas
          .filter(p => p.id !== primary?.id)
          .slice(0, 2)
        alternatives.push(...modePersonas)
      }

      // Context-based confidence adjustment
      if (context?.userQuery) {
        const queryLower = context.userQuery.toLowerCase()
        
        // Boost confidence if query matches phase expectations
        if (phaseConfig.autoSwitchTriggers.some(trigger => 
          queryLower.includes(trigger.toLowerCase())
        )) {
          confidence += 0.1
        }

        // Analyze query intent for mode adjustment
        if (queryLower.includes('research') || queryLower.includes('find')) {
          if (phaseConfig.primaryMode !== 'Research') {
            confidence -= 0.2
          }
        }
        
        if (queryLower.includes('write') || queryLower.includes('draft')) {
          if (phaseConfig.primaryMode !== 'Writing') {
            confidence -= 0.2
          }
        }
        
        if (queryLower.includes('review') || queryLower.includes('check')) {
          if (phaseConfig.primaryMode !== 'Review') {
            confidence -= 0.2
          }
        }
      }

      // Previous persona continuity bonus
      if (context?.previousPersona && context.previousPersona.id === primary?.id) {
        confidence += 0.1
      }

      const reasoning = this.generateRecommendationReasoning(
        currentPhase,
        phaseConfig,
        discipline,
        confidence,
        context
      )

      return {
        primary,
        alternatives,
        confidence: Math.min(1.0, Math.max(0.1, confidence)),
        reasoning
      }

    } catch (error) {
      console.error('Failed to generate persona recommendations:', error)
      return {
        primary: null,
        alternatives: [],
        confidence: 0,
        reasoning: 'Error generating recommendations'
      }
    }
  }

  // ============================================
  // AUTO-SWITCH TRIGGER DETECTION
  // ============================================

  static shouldAutoSwitchPersona(
    userQuery: string,
    currentPhase: number,
    currentPersona: PersonaTemplate | null
  ): {
    shouldSwitch: boolean
    recommendedPersona: PersonaTemplate | null
    confidence: number
    reason: string
  } {
    const phaseConfig = DEFAULT_PHASE_PERSONA_MAPPING[currentPhase]
    if (!phaseConfig) {
      return {
        shouldSwitch: false,
        recommendedPersona: null,
        confidence: 0,
        reason: 'Invalid phase'
      }
    }

    const queryLower = userQuery.toLowerCase()
    let shouldSwitch = false
    let confidence = 0
    let reason = ''

    // Check for explicit mode switches in query
    const modeKeywords: Record<PersonaMode, string[]> = {
      'Research': ['search', 'find', 'research', 'literature', 'sources', 'methodology'],
      'Writing': ['write', 'draft', 'compose', 'structure', 'outline', 'paragraph'],
      'Review': ['review', 'check', 'evaluate', 'assess', 'validate', 'correct']
    }

    for (const [mode, keywords] of Object.entries(modeKeywords)) {
      const matchCount = keywords.filter(keyword => 
        queryLower.includes(keyword)
      ).length

      if (matchCount > 0 && (!currentPersona || currentPersona.mode !== mode)) {
        shouldSwitch = true
        confidence = Math.min(0.9, matchCount * 0.3)
        reason = `Query contains ${matchCount} ${mode.toLowerCase()} keywords`
        break
      }
    }

    // Check phase-specific triggers
    if (!shouldSwitch) {
      const matchingTriggers = phaseConfig.autoSwitchTriggers.filter(trigger =>
        queryLower.includes(trigger.toLowerCase())
      )

      if (matchingTriggers.length > 0 && 
          (!currentPersona || currentPersona.mode !== phaseConfig.primaryMode)) {
        shouldSwitch = true
        confidence = 0.7
        reason = `Query matches phase ${currentPhase} triggers: ${matchingTriggers[0]}`
      }
    }

    return {
      shouldSwitch,
      recommendedPersona: null, // Would be populated by actual recommendation logic
      confidence,
      reason
    }
  }

  // ============================================
  // INTEGRATION HOOKS FOR FUTURE TASKS
  // ============================================

  // Hook for Task 03: Workflow Engine Integration
  static getWorkflowEngineHooks() {
    return {
      onPhaseTransition: async (
        projectId: string,
        fromPhase: number,
        toPhase: number,
        context: any
      ) => {
        console.log(`[WORKFLOW HOOK] Phase transition ${fromPhase} -> ${toPhase} for project ${projectId}`)
        
        // Auto-recommend persona for new phase
        const recommendation = await this.getPersonaRecommendations(
          toPhase,
          context.discipline,
          { ...context, previousPersona: context.currentPersona }
        )

        return {
          recommendedPersona: recommendation.primary,
          confidence: recommendation.confidence,
          alternatives: recommendation.alternatives,
          reasoning: recommendation.reasoning
        }
      },

      onTaskCompletion: async (
        projectId: string,
        phase: number,
        taskType: string,
        result: any
      ) => {
        console.log(`[WORKFLOW HOOK] Task completion: ${taskType} in phase ${phase}`)
        
        // Log persona effectiveness for this task type
        return {
          personaEffectiveness: result.persona ? {
            personaId: result.persona.id,
            taskType,
            phase,
            completionTime: result.duration,
            qualityScore: result.qualityScore
          } : null
        }
      }
    }
  }

  // Hook for Task 20: Admin Interface Integration
  static getAdminIntegrationHooks() {
    return {
      getPersonaUsageAnalytics: async (timeRange: string = '30d') => {
        // This would be implemented when Task 20 is developed
        return {
          totalUsage: 0,
          phaseDistribution: {},
          modePreferences: {},
          effectivenessMetrics: {}
        }
      },

      getWorkflowOptimizationSuggestions: async (projectId: string) => {
        // This would provide admin insights for workflow optimization
        return {
          suggestions: [],
          performanceMetrics: {},
          personaRecommendations: {}
        }
      }
    }
  }

  // ============================================
  // UTILITY FUNCTIONS
  // ============================================

  private static generateRecommendationReasoning(
    phase: number,
    phaseConfig: any,
    discipline?: string,
    confidence: number,
    context?: any
  ): string {
    const reasons = [
      `Phase ${phase} (${phaseConfig.description}) typically requires ${phaseConfig.primaryMode.toLowerCase()} skills`
    ]

    if (discipline) {
      const disciplinePrefs = DISCIPLINE_PERSONA_PREFERENCES[discipline]
      if (disciplinePrefs) {
        reasons.push(`${discipline} discipline favors ${disciplinePrefs.preferredModes.join(', ').toLowerCase()} approaches`)
      }
    }

    if (context?.userQuery) {
      reasons.push('Query analysis supports this recommendation')
    }

    if (confidence > 0.8) {
      reasons.push('High confidence based on phase requirements and context')
    } else if (confidence < 0.6) {
      reasons.push('Lower confidence - consider manual selection if needed')
    }

    return reasons.join('. ')
  }

  // Get phase description for UI
  static getPhaseDescription(phase: number): string {
    const phaseConfig = DEFAULT_PHASE_PERSONA_MAPPING[phase]
    return phaseConfig?.description || `Academic phase ${phase}`
  }

  // Get recommended mode for phase
  static getRecommendedMode(phase: number): PersonaMode | null {
    const phaseConfig = DEFAULT_PHASE_PERSONA_MAPPING[phase]
    return phaseConfig?.primaryMode || null
  }
}

export default WorkflowPersonaService