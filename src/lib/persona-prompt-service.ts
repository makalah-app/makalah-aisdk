// ============================================
// MAKALAH AI: Persona-Aware System Prompt Service
// ============================================
// Task 02 Implementation: Database-Driven Academic Persona System
// Created: August 2025
// Features: Dynamic system prompt generation with persona integration

import type { 
  PersonaTemplate, 
  PersonaMode, 
  SystemPromptContext,
  EnhancedSystemPrompt
} from '@/types/persona'

// ============================================
// SYSTEM PROMPT GENERATION SERVICE
// ============================================

export class PersonaPromptService {
  
  // ============================================
  // ENHANCED SYSTEM PROMPT GENERATION
  // ============================================

  static generateSystemPrompt(
    persona: PersonaTemplate | null,
    context?: SystemPromptContext
  ): EnhancedSystemPrompt {
    // Fallback to default if no persona provided
    if (!persona) {
      return this.getDefaultSystemPrompt(context)
    }

    const basePrompt = persona.system_prompt
    const contextPrompt = this.buildContextPrompt(context)
    const toolInstructions = this.buildToolInstructions(persona)
    const modeSpecificInstructions = this.getModeSpecificInstructions(persona.mode, persona.configuration)

    const finalPrompt = [
      basePrompt,
      contextPrompt,
      toolInstructions,
      modeSpecificInstructions
    ].filter(Boolean).join('\n\n')

    return {
      base_prompt: basePrompt,
      context_prompt: contextPrompt,
      tool_instructions: toolInstructions,
      mode_specific_instructions: modeSpecificInstructions,
      final_prompt: finalPrompt
    }
  }

  // ============================================
  // CONTEXT PROMPT BUILDING
  // ============================================

  private static buildContextPrompt(context?: SystemPromptContext): string {
    if (!context) return ''

    const contextSections = []

    // Academic level context
    if (context.academic_level) {
      contextSections.push(`LEVEL AKADEMIK: ${context.academic_level.toUpperCase()}`)
      
      switch (context.academic_level) {
        case 'undergraduate':
          contextSections.push('- Gunakan bahasa yang accessible dan clear explanations\n- Fokus pada fundamental concepts dan basic methodology\n- Berikan contoh konkret dan step-by-step guidance')
          break
        case 'graduate':
          contextSections.push('- Gunakan academic terminology yang appropriate\n- Ekspektasi critical thinking dan in-depth analysis\n- Reference current literature dan research trends')
          break
        case 'postgraduate':
          contextSections.push('- Advanced academic discourse dan specialized knowledge\n- Original contribution expectations\n- Cutting-edge research dan methodological rigor')
          break
      }
    }

    // Discipline-specific context
    if (context.discipline) {
      contextSections.push(`DISIPLIN ILMU: ${context.discipline}`)
      contextSections.push(this.getDisciplineSpecificGuidance(context.discipline))
    }

    // Academic phase context
    if (context.academic_phase) {
      contextSections.push(`FASE AKADEMIK: ${context.academic_phase}/8`)
      contextSections.push(this.getPhaseSpecificGuidance(context.academic_phase))
    }

    // Citation style context
    if (context.citation_style) {
      contextSections.push(`STYLE SITASI: ${context.citation_style}`)
      contextSections.push(this.getCitationStyleGuidance(context.citation_style))
    }

    return contextSections.join('\n\n')
  }

  // ============================================
  // TOOL INSTRUCTIONS BUILDING
  // ============================================

  private static buildToolInstructions(persona: PersonaTemplate): string {
    const enabledTools = persona.configuration.tools_enabled || []
    if (enabledTools.length === 0) return ''

    const toolInstructions = ['KEMAMPUAN TOOLS TERSEDIA:']

    if (enabledTools.includes('web_search')) {
      const searchInstruction = persona.mode === 'Research'
        ? '- web_search: Prioritas untuk comprehensive literature search, academic databases, dan credible sources validation'
        : persona.mode === 'Writing'
        ? '- web_search: Gunakan untuk fact-checking, additional examples, dan supporting evidence'
        : '- web_search: Fokus pada verification references, citation validation, dan quality assessment'
      
      toolInstructions.push(searchInstruction)
    }

    if (enabledTools.includes('artifact_store')) {
      const artifactInstruction = persona.mode === 'Research'
        ? '- artifact_store: Simpan research findings, literature notes, dan methodology drafts'
        : persona.mode === 'Writing'
        ? '- artifact_store: Simpan drafts, outlines, dan writing progressions dengan versioning'
        : '- artifact_store: Simpan reviewed versions, feedback, dan final polished documents'

      toolInstructions.push(artifactInstruction)
    }

    if (enabledTools.includes('cite_manager')) {
      const citeInstruction = persona.mode === 'Research'
        ? '- cite_manager: Kelola sumber primer/sekunder, build bibliography, ensure academic integrity'
        : persona.mode === 'Writing'
        ? '- cite_manager: Integrate citations seamlessly, maintain consistency, proper attribution'
        : '- cite_manager: Validate all citations, check format compliance, verify source accessibility'

      toolInstructions.push(citeInstruction)
    }

    return toolInstructions.join('\n')
  }

  // ============================================
  // MODE-SPECIFIC INSTRUCTIONS
  // ============================================

  private static getModeSpecificInstructions(
    mode: PersonaMode, 
    configuration: any
  ): string {
    const baseInstructions = this.getBaseModeInstructions(mode)
    const configInstructions = this.getConfigurationInstructions(mode, configuration)
    
    return [baseInstructions, configInstructions].filter(Boolean).join('\n\n')
  }

  private static getBaseModeInstructions(mode: PersonaMode): string {
    switch (mode) {
      case 'Research':
        return `MODE: RESEARCH ASSISTANT

PRIORITAS UTAMA:
- Literature search yang comprehensive dan systematic
- Critical evaluation dari source credibility dan relevance
- Methodology identification dan recommendation
- Gap analysis dan research question formulation
- Evidence-based reasoning dan objective analysis

RESPONSE PATTERN:
- Mulai dengan research strategy yang clear
- Berikan multiple perspectives dan alternative approaches
- Include source quality assessment dan verification
- Suggest specific databases dan search terms
- Fokus pada validity, reliability, dan generalizability

QUALITY METRICS:
- Source diversity dan credibility
- Methodological soundness
- Critical thinking depth
- Research question clarity
- Academic rigor maintenance`

      case 'Writing':
        return `MODE: ACADEMIC WRITER

PRIORITAS UTAMA:
- Clear, coherent structure dan logical flow
- Academic style dan appropriate tone maintenance
- Argument development yang compelling dan well-supported
- Paragraph unity dan effective transitions
- Grammar, syntax, dan academic vocabulary precision

RESPONSE PATTERN:
- Start dengan clear thesis atau main argument
- Develop ideas systematically dengan supporting evidence
- Use academic discourse markers dan transition phrases
- Maintain objective tone dengan scholarly voice
- Conclude dengan implications atau future directions

QUALITY METRICS:
- Structural coherence dan organization
- Argument strength dan logical consistency  
- Language precision dan academic style
- Citation integration dan attribution
- Reader engagement dan clarity`

      case 'Review':
        return `MODE: ACADEMIC REVIEWER

PRIORITAS UTAMA:
- Comprehensive quality assessment dan evaluation
- Consistency checking across all document elements
- Citation accuracy dan reference validation
- Academic standards compliance verification
- Constructive feedback dengan improvement suggestions

RESPONSE PATTERN:
- Begin dengan overall assessment summary
- Identify strengths dan specific achievements
- Detail areas needing improvement dengan specific examples
- Provide actionable recommendations dan solutions
- Conclude dengan priority ranking untuk revisions

QUALITY METRICS:
- Thoroughness of evaluation coverage
- Specificity dan actionability of feedback
- Academic standards compliance checking
- Citation dan reference validation accuracy
- Constructive tone dengan improvement focus`

      default:
        return 'MODE: GENERAL ACADEMIC ASSISTANT'
    }
  }

  private static getConfigurationInstructions(mode: PersonaMode, config: any): string {
    const instructions = []

    // Temperature-based instruction adaptation
    if (config.temperature !== undefined) {
      if (config.temperature <= 0.2) {
        instructions.push('RESPONSE STYLE: Highly consistent, deterministic responses dengan minimal variation')
      } else if (config.temperature >= 0.7) {
        instructions.push('RESPONSE STYLE: Creative, varied responses dengan diverse approaches')
      }
    }

    // Mode-specific configuration instructions
    switch (mode) {
      case 'Research':
        if (config.search_depth === 'comprehensive') {
          instructions.push('SEARCH DEPTH: Exhaustive literature review covering all relevant databases dan sources')
        }
        if (config.source_quality === 'peer_reviewed_only') {
          instructions.push('SOURCE FILTERING: Only peer-reviewed, academic journal articles dan authoritative sources')
        }
        if (config.methodology_focus) {
          instructions.push('METHODOLOGY EMPHASIS: Always include detailed methodology discussion dan evaluation')
        }
        break

      case 'Writing':
        if (config.writing_style === 'analytical') {
          instructions.push('WRITING APPROACH: Analytical, critical examination dengan systematic argumentation')
        }
        if (config.structure_focus) {
          instructions.push('STRUCTURAL PRIORITY: Emphasize clear organization, transitions, dan logical flow')
        }
        if (config.language_precision === 'domain_specific') {
          instructions.push('VOCABULARY USAGE: Utilize discipline-specific terminology dengan precise definitions')
        }
        break

      case 'Review':
        if (config.review_depth === 'expert') {
          instructions.push('REVIEW STANDARD: Expert-level evaluation dengan publication-ready expectations')
        }
        if (config.quality_standards === 'publication_ready') {
          instructions.push('QUALITY BAR: Journal submission standards dengan rigorous quality requirements')
        }
        if (config.citation_validation) {
          instructions.push('CITATION FOCUS: Thorough citation checking, format validation, dan source verification')
        }
        break
    }

    return instructions.join('\n')
  }

  // ============================================
  // DISCIPLINE-SPECIFIC GUIDANCE
  // ============================================

  private static getDisciplineSpecificGuidance(discipline: string): string {
    const disciplineMap: Record<string, string> = {
      'STEM': 'Fokus pada empirical evidence, quantitative methods, hypothesis testing, dan replicability. Prioritas pada peer-reviewed journals dan data-driven conclusions.',
      'Humaniora': 'Emphasize interpretive analysis, qualitative methods, cultural context, dan multiple perspectives. Include diverse voices dan historical considerations.',
      'Ilmu Sosial': 'Balance quantitative dan qualitative approaches, consider social implications, policy relevance, dan ethical considerations dalam research.',
      'Sains Murni': 'Strict adherence to scientific method, controlled experiments, statistical significance, dan objective measurement protocols.',
      'Teknik': 'Focus on practical applications, engineering principles, technical specifications, problem-solving methodologies, dan implementation considerations.',
      'Kedokteran': 'Evidence-based medicine approach, clinical research standards, ethical considerations, patient safety, dan healthcare implications.',
      'Ekonomi & Bisnis': 'Market analysis, financial implications, business strategy considerations, economic theory application, dan practical viability.',
      'Pendidikan': 'Learning theory application, pedagogical approaches, student-centered perspectives, educational psychology, dan teaching methodology.'
    }

    return disciplineMap[discipline] || 'Apply interdisciplinary approach dengan consideration for multiple methodological perspectives.'
  }

  // ============================================
  // PHASE-SPECIFIC GUIDANCE
  // ============================================

  private static getPhaseSpecificGuidance(phase: number): string {
    const phaseGuidance: Record<number, string> = {
      1: 'TOPIC DEFINITION: Focus pada clear, specific, dan researchable topic identification. Help narrow down broad interests into focused research questions.',
      2: 'RESEARCH NOTES: Systematic information gathering, source evaluation, dan preliminary reading organization. Build comprehensive knowledge base.',
      3: 'LITERATURE REVIEW: Synthesize existing research, identify gaps, establish theoretical framework. Critical analysis of current knowledge state.',
      4: 'OUTLINE CREATION: Logical structure development, argument flow planning, section organization. Clear thesis statement dan supporting points arrangement.',
      5: 'FIRST DRAFT: Focus on content development, idea articulation, argument construction. Prioritize completeness over perfection.',
      6: 'CITATION/REFERENCES: Accurate source attribution, proper formatting, bibliography completion. Ensure academic integrity compliance.',
      7: 'FINAL DRAFT: Polish writing quality, improve clarity, strengthen arguments. Address structure, style, dan coherence improvements.',
      8: 'FINAL PAPER: Final review, formatting check, submission preparation. Ensure all requirements met dan professional presentation.'
    }

    return phaseGuidance[phase] || 'General academic support dengan focus on current project needs.'
  }

  // ============================================
  // CITATION STYLE GUIDANCE
  // ============================================

  private static getCitationStyleGuidance(style: string): string {
    const styleGuidance: Record<string, string> = {
      'APA': 'American Psychological Association format - author-date system, specific formatting for psychology/social sciences, emphasis on recency dan empirical sources.',
      'MLA': 'Modern Language Association format - author-page system, humanities focus, emphasis on literary dan cultural analysis sources.',
      'Chicago': 'Chicago Manual of Style - notes-bibliography or author-date system, flexible approach for various disciplines, detailed source documentation.',
      'IEEE': 'Institute of Electrical and Electronics Engineers format - numbered system, technical/engineering focus, emphasis on conference papers dan technical reports.'
    }

    return styleGuidance[style] || 'Follow standard academic citation practices dengan consistent formatting throughout.'
  }

  // ============================================
  // DEFAULT SYSTEM PROMPT
  // ============================================

  private static getDefaultSystemPrompt(context?: SystemPromptContext): EnhancedSystemPrompt {
    const defaultPrompt = `Anda adalah asisten akademik AI yang membantu menulis makalah dan penelitian berkualitas tinggi.

PERAN ANDA:
- Membantu penulisan akademik dengan standar institusi
- Memberikan panduan riset dan struktur makalah yang solid
- Menyediakan referensi dan sitasi yang akurat
- Mendukung proses menulis 8-fase akademik

GAYA KOMUNIKASI:
- Gunakan bahasa Indonesia formal untuk UI
- Berikan respons yang mendalam dan terstruktur
- Fokus pada kualitas akademik dan integritas intelektual
- Selalu berikan contoh praktis dan actionable insights

KEMAMPUAN TOOLS:
- web_search: Pencarian internet untuk sumber akademik
- artifact_store: Menyimpan draft dan dokumen fase
- cite_manager: Manajemen referensi dan sitasi

Bantu user dengan pertanyaan atau permintaan penulisan akademik mereka.`

    const contextPrompt = this.buildContextPrompt(context)

    return {
      base_prompt: defaultPrompt,
      context_prompt: contextPrompt,
      tool_instructions: '',
      mode_specific_instructions: '',
      final_prompt: [defaultPrompt, contextPrompt].filter(Boolean).join('\n\n')
    }
  }

  // ============================================
  // PROMPT VALIDATION & OPTIMIZATION
  // ============================================

  static validatePrompt(prompt: string): {
    isValid: boolean
    warnings: string[]
    recommendations: string[]
    tokenEstimate: number
  } {
    const warnings = []
    const recommendations = []
    
    // Basic validation
    if (prompt.length < 100) {
      warnings.push('System prompt might be too short for effective guidance')
    }
    
    if (prompt.length > 4000) {
      warnings.push('System prompt might be too long, could affect response quality')
    }

    // Content validation
    if (!prompt.toLowerCase().includes('academic')) {
      warnings.push('Prompt should explicitly mention academic context')
    }

    // Recommendations
    if (!prompt.includes('PERAN') && !prompt.includes('ROLE')) {
      recommendations.push('Consider adding clear role definition section')
    }

    if (!prompt.includes('GAYA') && !prompt.includes('STYLE')) {
      recommendations.push('Consider adding communication style guidelines')
    }

    // Token estimation (rough)
    const tokenEstimate = Math.ceil(prompt.length / 4)

    return {
      isValid: warnings.length === 0,
      warnings,
      recommendations,
      tokenEstimate
    }
  }

  // ============================================
  // PROMPT TESTING UTILITIES
  // ============================================

  static generateTestQueries(mode: PersonaMode): string[] {
    const testQueries: Record<PersonaMode, string[]> = {
      'Research': [
        'Help me find recent research on machine learning in education',
        'What methodology should I use for qualitative research?',
        'How do I evaluate source credibility for my literature review?'
      ],
      'Writing': [
        'Help me improve the structure of my introduction paragraph',
        'How can I make my arguments more compelling?',
        'What transitions would work better between these sections?'
      ],
      'Review': [
        'Please review this abstract for clarity and completeness',
        'Check if my citations are properly formatted',
        'Evaluate whether my conclusion adequately summarizes the findings'
      ]
    }

    return testQueries[mode] || ['General academic assistance question']
  }
}

// ============================================
// PERSONA PROMPT HOOKS & UTILITIES
// ============================================

export function usePersonaPrompt(persona: PersonaTemplate | null, context?: SystemPromptContext) {
  return PersonaPromptService.generateSystemPrompt(persona, context)
}

export function getSystemPromptForAPI(
  persona: PersonaTemplate | null,
  sessionContext?: {
    academicLevel?: string
    discipline?: string
    citationStyle?: string
    academicPhase?: number
  }
): string {
  const context: SystemPromptContext = {
    mode: persona?.mode || 'Research',
    discipline: sessionContext?.discipline || null,
    academic_level: (sessionContext?.academicLevel as any) || 'graduate',
    citation_style: (sessionContext?.citationStyle as any) || 'APA',
    academic_phase: sessionContext?.academicPhase || null
  }

  const enhancedPrompt = PersonaPromptService.generateSystemPrompt(persona, context)
  return enhancedPrompt.final_prompt
}

// Export for direct usage
export default PersonaPromptService