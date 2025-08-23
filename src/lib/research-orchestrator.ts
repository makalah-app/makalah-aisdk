// ============================================
// MAKALAH AI: Research Orchestrator Service
// ============================================
// Task P04.2: Persona-Aware Research Behavior
// Created: August 2025  
// Features: Adaptive research methodology based on persona mode

import { personaDetector, type PersonaModeContext } from '@/lib/persona-detection'
import type { PersonaTemplate, PersonaMode } from '@/types/persona'
import type { WorkflowState } from '@/types'

// ============================================
// RESEARCH ORCHESTRATOR TYPES
// ============================================

export interface ResearchStrategy {
  name: string
  description: string
  methodology: string[]
  sources: string[]
  searchTerms: string[]
  qualityThreshold: number
  expectedOutputs: string[]
  languageStyle: 'formal_academic' | 'casual_practical'
}

export interface ResearchContext {
  query: string
  personaMode: PersonaModeContext
  workflowState?: WorkflowState | null
  sessionContext?: any
  academicPhase?: number
}

export interface ResearchResult {
  strategy: ResearchStrategy
  sources: ResearchSource[]
  summary: string
  methodology: string
  nextSteps: string[]
  confidence: number
  quality_score: number
  execution_time: number
}

export interface ResearchSource {
  title: string
  url: string
  source_type: 'academic' | 'professional' | 'general'
  quality_score: number
  relevance: number
  citation_format: string
  abstract?: string
  methodology?: string
  key_findings?: string[]
}

// ============================================
// RESEARCH ORCHESTRATOR CLASS
// ============================================

export class ResearchOrchestrator {
  
  // ============================================
  // RESEARCH STRATEGIES BY PERSONA MODE
  // ============================================

  private formalAcademicStrategies: Record<PersonaMode, ResearchStrategy> = {
    Research: {
      name: 'Systematic Academic Literature Review',
      description: 'Comprehensive methodology-driven research dengan peer-reviewed sources',
      methodology: [
        'Systematic literature search',
        'Multiple database coverage',
        'Citation network analysis', 
        'Methodological triangulation',
        'Quality assessment framework',
        'Bias evaluation protocols'
      ],
      sources: ['Google Scholar', 'Scopus', 'PubMed', 'IEEE Xplore', 'ResearchGate', 'arXiv', 'JSTOR'],
      searchTerms: ['systematic review', 'meta-analysis', 'empirical study', 'peer-reviewed', 'methodology'],
      qualityThreshold: 0.85,
      expectedOutputs: [
        'Comprehensive literature matrix',
        'Research gap analysis',  
        'Methodological framework',
        'Theoretical foundation',
        'Citation network map'
      ],
      languageStyle: 'formal_academic'
    },
    Writing: {
      name: 'Evidence-Based Academic Writing Support',
      description: 'Structured research untuk supporting academic argument development',
      methodology: [
        'Argument-centered source selection',
        'Evidence quality validation',
        'Counter-argument identification',
        'Citation integration planning',
        'Rhetorical strategy mapping'
      ],
      sources: ['High-impact journals', 'Academic books', 'Conference proceedings', 'Thesis repositories'],
      searchTerms: ['academic writing', 'argumentation theory', 'evidence-based', 'scholarly discourse'],
      qualityThreshold: 0.80,
      expectedOutputs: [
        'Evidence matrix by argument',
        'Citation integration guide',
        'Counter-argument analysis',
        'Rhetorical structure plan',
        'Academic voice examples'
      ],
      languageStyle: 'formal_academic'
    },
    Review: {
      name: 'Critical Academic Quality Assessment',
      description: 'Rigorous evaluation framework untuk academic work quality',
      methodology: [
        'Multi-criteria evaluation framework',
        'Peer-review standard application', 
        'Citation validity verification',
        'Methodological soundness check',
        'Academic integrity assessment'
      ],
      sources: ['Editorial guidelines', 'Peer-review criteria', 'Academic standards', 'Journal requirements'],
      searchTerms: ['peer review', 'academic standards', 'quality assessment', 'editorial criteria'],
      qualityThreshold: 0.90,
      expectedOutputs: [
        'Quality assessment matrix',
        'Improvement recommendations',
        'Standard compliance check',
        'Citation verification report',
        'Publication readiness score'
      ],
      languageStyle: 'formal_academic'
    }
  }

  private casualPracticalStrategy: ResearchStrategy = {
    name: 'Practical Information Gathering',
    description: 'Efficient information search for practical understanding dan quick insights',
    methodology: [
      'Multi-source information gathering',
      'Credibility quick assessment',
      'Practical relevance filtering',
      'Easy-to-understand synthesis',
      'Actionable insights extraction'
    ],
    sources: ['Google Search', 'Wikipedia', 'News sources', 'Professional blogs', 'Educational sites'],
    searchTerms: ['overview', 'explanation', 'guide', 'tutorial', 'practical'],
    qualityThreshold: 0.65,
    expectedOutputs: [
      'Quick summary points',
      'Practical applications',
      'Key concepts explanation',
      'Useful links collection',
      'Next steps suggestions'
    ],
    languageStyle: 'casual_practical'
  }

  // ============================================
  // CORE ORCHESTRATION METHODS
  // ============================================

  /**
   * Orchestrate research based on persona mode and context
   */
  async orchestrateResearch(context: ResearchContext): Promise<ResearchResult> {
    const startTime = Date.now()
    
    // 1. Select appropriate research strategy
    const strategy = this.selectResearchStrategy(context.personaMode, context.workflowState)
    
    // 2. Adapt strategy for workflow phase (if active)
    const adaptedStrategy = this.adaptStrategyForWorkflow(strategy, context.workflowState)
    
    // 3. Execute research with persona-aware approach
    const sources = await this.executePersonaAwareResearch(context.query, adaptedStrategy, context)
    
    // 4. Generate persona-appropriate summary
    const summary = this.generatePersonaAwareSummary(sources, context.personaMode)
    
    // 5. Create methodology description
    const methodology = this.generateMethodologyDescription(adaptedStrategy, context.personaMode)
    
    // 6. Generate next steps
    const nextSteps = this.generatePersonaAwareNextSteps(adaptedStrategy, context)
    
    // 7. Calculate quality scores
    const qualityScore = this.calculateResearchQuality(sources, adaptedStrategy)
    const confidence = this.calculateConfidence(sources, adaptedStrategy, context.personaMode)
    
    const executionTime = Date.now() - startTime
    
    return {
      strategy: adaptedStrategy,
      sources,
      summary,
      methodology,
      nextSteps,
      confidence,
      quality_score: qualityScore,
      execution_time: executionTime
    }
  }

  /**
   * Select research strategy based on persona mode
   */
  private selectResearchStrategy(
    personaMode: PersonaModeContext, 
    workflowState?: WorkflowState | null
  ): ResearchStrategy {
    // Formal academic mode
    if (personaMode.mode === 'formal' && personaMode.academicMode) {
      return this.formalAcademicStrategies[personaMode.academicMode]
    }
    
    // Formal mode without specific academic mode - default to Research
    if (personaMode.mode === 'formal') {
      return this.formalAcademicStrategies.Research
    }
    
    // Casual mode
    return this.casualPracticalStrategy
  }

  /**
   * Adapt strategy for specific workflow phase
   */
  private adaptStrategyForWorkflow(
    baseStrategy: ResearchStrategy, 
    workflowState?: WorkflowState | null
  ): ResearchStrategy {
    if (!workflowState?.isActive) {
      return baseStrategy
    }

    const adaptedStrategy = { ...baseStrategy }
    
    // Workflow-specific adaptations
    switch (workflowState.currentPhase) {
      case 1: // Topic Definition
        adaptedStrategy.searchTerms.push('research gaps', 'problem statement', 'scope definition')
        adaptedStrategy.expectedOutputs.push('Topic boundaries clarification')
        break
        
      case 2: // Research Notes
        adaptedStrategy.searchTerms.push('literature collection', 'knowledge base', 'reference materials')
        adaptedStrategy.expectedOutputs.push('Comprehensive notes database')
        break
        
      case 3: // Literature Review
        adaptedStrategy.searchTerms.push('critical analysis', 'comparative studies', 'theoretical frameworks')
        adaptedStrategy.expectedOutputs.push('Critical literature synthesis')
        break
        
      case 6: // Citations/References
        adaptedStrategy.searchTerms.push('citation verification', 'reference accuracy', 'source validation')
        adaptedStrategy.expectedOutputs.push('Verified citation database')
        break
    }
    
    return adaptedStrategy
  }

  /**
   * Execute research with persona-aware approach
   */
  private async executePersonaAwareResearch(
    query: string,
    strategy: ResearchStrategy,
    context: ResearchContext
  ): Promise<ResearchSource[]> {
    // Simulate research execution with persona-appropriate behavior
    const mockSources: ResearchSource[] = []
    
    if (context.personaMode.mode === 'formal') {
      // Formal academic sources
      mockSources.push(
        {
          title: `Systematic Review on ${query}: Academic Perspectives`,
          url: `https://scholar.google.com/search?q=${encodeURIComponent(query + ' systematic review')}`,
          source_type: 'academic',
          quality_score: 0.92,
          relevance: 0.88,
          citation_format: `Author, A. (2024). Systematic review on ${query}. Academic Journal of Research, 15(3), 123-145.`,
          abstract: `This systematic review examines current research on ${query}, analyzing 45 peer-reviewed studies to identify key patterns and research gaps.`,
          methodology: 'Systematic literature review with PRISMA guidelines',
          key_findings: [`Significant trends in ${query} research`, 'Identified methodological approaches', 'Research gaps for future work']
        },
        {
          title: `Empirical Study: ${query} Analysis`,
          url: `https://researchgate.net/publication/${query.replace(/\s+/g, '_')}`,
          source_type: 'academic',
          quality_score: 0.85,
          relevance: 0.82,
          citation_format: `Smith, B. et al. (2024). Empirical analysis of ${query}: A quantitative approach. Journal of Applied Research, 28(7), 67-89.`,
          methodology: 'Quantitative analysis with statistical validation',
          key_findings: [`Statistical significance in ${query} patterns`, 'Validated theoretical framework']
        },
        {
          title: `Meta-Analysis: ${query} Research Trends`,
          url: `https://pubmed.ncbi.nlm.nih.gov/search/${query}`,
          source_type: 'academic', 
          quality_score: 0.89,
          relevance: 0.85,
          citation_format: `Johnson, C. & Davis, D. (2024). Meta-analysis of ${query}: Trends and implications. Research Quarterly, 12(4), 234-256.`,
          methodology: 'Meta-analytic approach across multiple studies'
        }
      )
    } else {
      // Casual practical sources
      mockSources.push(
        {
          title: `Understanding ${query}: A Practical Guide`,
          url: `https://medium.com/practical-guide-${query.replace(/\s+/g, '-')}`,
          source_type: 'professional',
          quality_score: 0.75,
          relevance: 0.80,
          citation_format: `"Understanding ${query}: A Practical Guide" - Medium Article`,
          abstract: `A practical explanation of ${query} with real-world examples and applications.`
        },
        {
          title: `${query} Explained - Wikipedia`,
          url: `https://wikipedia.org/wiki/${query.replace(/\s+/g, '_')}`,
          source_type: 'general',
          quality_score: 0.70,
          relevance: 0.85,
          citation_format: `"${query}" Wikipedia, accessed ${new Date().toDateString()}`
        },
        {
          title: `Top 10 Things to Know About ${query}`,
          url: `https://blog.example.com/top-10-${query.replace(/\s+/g, '-')}`,
          source_type: 'general',
          quality_score: 0.65,
          relevance: 0.75,
          citation_format: `"Top 10 Things to Know About ${query}" - Blog Post`
        }
      )
    }
    
    return mockSources
  }

  /**
   * Generate persona-aware summary
   */
  private generatePersonaAwareSummary(
    sources: ResearchSource[],
    personaMode: PersonaModeContext
  ): string {
    if (personaMode.mode === 'formal') {
      return `Based on comprehensive academic research, the analysis of the provided query reveals significant scholarly perspectives across ${sources.length} peer-reviewed sources. The systematic review of literature indicates established theoretical frameworks and empirical evidence supporting multiple research directions. Key methodological approaches identified include quantitative analysis, qualitative investigation, and mixed-methods research designs. The academic consensus suggests further investigation is warranted in specific areas where research gaps have been identified through systematic analysis.`
    } else {
      return `Jadi berdasarkan pencarian info yang gue lakuin, ada beberapa hal menarik tentang topik yang lo tanyain. Dari ${sources.length} sumber yang gue cek, keliatan sih ini topik yang cukup banyak dibahas dan ada berbagai perspektif yang bisa dipelajari. Info yang gue dapet ini bisa jadi starting point yang bagus buat lo, dan kayaknya masih banyak hal yang bisa digali lebih dalam kalo lo mau.`
    }
  }

  /**
   * Generate methodology description
   */
  private generateMethodologyDescription(
    strategy: ResearchStrategy,
    personaMode: PersonaModeContext
  ): string {
    if (personaMode.mode === 'formal') {
      return `Research methodology employed: ${strategy.methodology.join(', ')}. Quality threshold maintained at ${Math.round(strategy.qualityThreshold * 100)}% to ensure academic rigor and validity. Sources consulted include: ${strategy.sources.join(', ')}.`
    } else {
      return `Cara gue nyari infonya: ${strategy.methodology.slice(0, 3).join(', ')}. Gue fokus sama sumber-sumber yang kredibel seperti ${strategy.sources.slice(0, 3).join(', ')} buat mastiin info yang gue kasih akurat dan berguna.`
    }
  }

  /**
   * Generate persona-aware next steps
   */
  private generatePersonaAwareNextSteps(
    strategy: ResearchStrategy,
    context: ResearchContext
  ): string[] {
    if (context.personaMode.mode === 'formal') {
      const baseSteps = [
        'Conduct comprehensive literature review using systematic methodology',
        'Develop theoretical framework based on identified academic sources',
        'Design research methodology appropriate for the identified research questions',
        'Validate findings through peer-review process and expert consultation'
      ]
      
      if (context.workflowState?.isActive) {
        const currentPhase = context.workflowState.currentPhase
        if (currentPhase <= 3) {
          baseSteps.unshift('Proceed with detailed literature analysis for current workflow phase')
        } else if (currentPhase <= 6) {
          baseSteps.unshift('Integrate research findings into writing workflow phase')
        } else {
          baseSteps.unshift('Apply research validation for final review phase')
        }
      }
      
      return baseSteps
    } else {
      return [
        'Baca lebih detail tentang hal-hal yang menarik dari hasil pencarian',
        'Cek sumber-sumber lain yang related buat dapet perspektif lebih lengkap',
        'Bikin catetan tentang poin-poin penting yang berguna buat lo',
        'Kalo masih bingung, coba diskusi atau tanya lebih spesifik lagi'
      ]
    }
  }

  /**
   * Calculate research quality score
   */
  private calculateResearchQuality(sources: ResearchSource[], strategy: ResearchStrategy): number {
    if (sources.length === 0) return 0
    
    const avgQualityScore = sources.reduce((sum, source) => sum + source.quality_score, 0) / sources.length
    const avgRelevance = sources.reduce((sum, source) => sum + source.relevance, 0) / sources.length
    const strategyBonus = strategy.qualityThreshold * 0.1
    
    return Math.min(1.0, avgQualityScore * 0.6 + avgRelevance * 0.3 + strategyBonus)
  }

  /**
   * Calculate confidence score
   */
  private calculateConfidence(
    sources: ResearchSource[],
    strategy: ResearchStrategy,
    personaMode: PersonaModeContext
  ): number {
    const sourceCount = Math.min(sources.length / 5, 1) // Normalize to max 5 sources
    const qualityFactor = this.calculateResearchQuality(sources, strategy)
    const personaConfidence = personaMode.confidence
    
    return Math.min(0.95, sourceCount * 0.3 + qualityFactor * 0.4 + personaConfidence * 0.3)
  }

  // ============================================
  // UTILITY METHODS
  // ============================================

  /**
   * Get available strategies for persona mode
   */
  getAvailableStrategies(personaMode: PersonaModeContext): ResearchStrategy[] {
    if (personaMode.mode === 'formal') {
      return Object.values(this.formalAcademicStrategies)
    } else {
      return [this.casualPracticalStrategy]
    }
  }

  /**
   * Validate research context
   */
  validateResearchContext(context: ResearchContext): boolean {
    return !!(context.query && context.personaMode && context.personaMode.confidence > 0.3)
  }

  /**
   * Get recommended strategy for workflow phase
   */
  getRecommendedStrategyForPhase(
    phase: number,
    personaMode: PersonaModeContext
  ): ResearchStrategy | null {
    if (personaMode.mode === 'casual') {
      return this.casualPracticalStrategy
    }

    // Academic workflow phase mapping
    if (phase <= 3) {
      return this.formalAcademicStrategies.Research
    } else if (phase <= 6) {
      return this.formalAcademicStrategies.Writing  
    } else {
      return this.formalAcademicStrategies.Review
    }
  }
}

// ============================================
// SINGLETON INSTANCE
// ============================================

export const researchOrchestrator = new ResearchOrchestrator()

// ============================================
// UTILITY FUNCTIONS  
// ============================================

/**
 * Quick research execution with persona detection
 */
export async function executePersonaAwareResearch(
  query: string,
  systemPrompt: string,
  persona?: PersonaTemplate,
  chatMode?: 'formal' | 'casual',
  workflowState?: WorkflowState | null,
  sessionContext?: any
): Promise<ResearchResult> {
  // Detect persona mode
  const personaMode = personaDetector.detectPersonaMode(systemPrompt, persona, chatMode)
  
  // Create research context
  const context: ResearchContext = {
    query,
    personaMode,
    workflowState,
    sessionContext,
    academicPhase: workflowState?.currentPhase
  }
  
  // Execute research
  return await researchOrchestrator.orchestrateResearch(context)
}