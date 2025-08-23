/**
 * 🚀 P03: WORKFLOW ENGINE INTEGRATION
 * Academic 8-Phase Workflow Engine with AI SDK v5 stepCountIs(8) Pattern
 * 
 * Implements mode-aware workflow initiation and management for academic writing
 * with persona synchronization and tool orchestration integration.
 */

import type { 
  WorkflowType, 
  WorkflowState, 
  WorkflowPhase, 
  AcademicWorkflowConfig,
  ChatMode 
} from '@/types'

// 🎓 8-PHASE ACADEMIC WORKFLOW DEFINITION
export const ACADEMIC_8_PHASES: WorkflowPhase[] = [
  {
    phase: 1,
    name: 'Definitive Topic/Scope',
    description: 'Menentukan topik dan ruang lingkup penelitian yang jelas dengan tinjauan literatur awal',
    requiredTools: ['web_search'],
    expectedOutputs: ['topic_definition', 'scope_document', 'initial_references'],
    completionCriteria: [
      'Topik penelitian telah didefinisikan dengan jelas',
      'Ruang lingkup penelitian telah dibatasi',
      'Minimal 3-5 referensi awal telah ditemukan',
      'Problem statement telah dirumuskan'
    ]
  },
  {
    phase: 2,
    name: 'Research Notes',
    description: 'Pengumpulan dan pencatatan literatur serta sumber-sumber penelitian yang relevan',
    requiredTools: ['web_search', 'artifact_store'],
    expectedOutputs: ['research_notes', 'literature_database', 'source_annotations'],
    completionCriteria: [
      'Minimal 10-15 sumber literatur telah dikumpulkan',
      'Catatan penelitian tersusun sistematis',
      'Sumber-sumber telah dievaluasi kredibilitasnya',
      'Tema-tema utama literatur telah diidentifikasi'
    ]
  },
  {
    phase: 3,
    name: 'Literature Review',
    description: 'Analisis komprehensif literatur dengan sintesis dan evaluasi kritis',
    requiredTools: ['web_search', 'artifact_store', 'cite_manager'],
    expectedOutputs: ['literature_review', 'theoretical_framework', 'research_gaps'],
    completionCriteria: [
      'Tinjauan literatur komprehensif telah diselesaikan',
      'Kerangka teoretis telah dikembangkan',
      'Research gaps telah diidentifikasi',
      'Kontribusi potentiel penelitian telah dijelaskan'
    ]
  },
  {
    phase: 4,
    name: 'Outline',
    description: 'Penyusunan kerangka dan struktur makalah yang detail dan logis',
    requiredTools: ['artifact_store'],
    expectedOutputs: ['detailed_outline', 'chapter_structure', 'argument_flow'],
    completionCriteria: [
      'Outline detail dengan sub-bab telah dibuat',
      'Alur argumen logis telah dikembangkan',
      'Struktur makalah sesuai standar akademik',
      'Distribusi konten antar bab seimbang'
    ]
  },
  {
    phase: 5,
    name: 'First Draft',
    description: 'Penulisan draft awal berdasarkan outline dengan konten substantif',
    requiredTools: ['artifact_store', 'cite_manager'],
    expectedOutputs: ['first_draft', 'preliminary_citations', 'content_sections'],
    completionCriteria: [
      'Draft lengkap semua bagian utama telah ditulis',
      'Minimal 70% target kata tercapai',
      'Sitasi sementara telah diintegrasikan',
      'Kohesi antar paragraf telah diperhatikan'
    ]
  },
  {
    phase: 6,
    name: 'Citations/References',
    description: 'Manajemen sitasi lengkap dan penyusunan daftar referensi yang akurat',
    requiredTools: ['cite_manager', 'web_search'],
    expectedOutputs: ['complete_citations', 'reference_list', 'citation_validation'],
    completionCriteria: [
      'Semua sitasi mengikuti format standar yang konsisten',
      'Daftar referensi lengkap dan akurat',
      'In-text citations sesuai dengan reference list',
      'Validasi akurasi semua referensi telah dilakukan'
    ]
  },
  {
    phase: 7,
    name: 'Final Draft',
    description: 'Revisi menyeluruh dan penyempurnaan draft dengan fokus kualitas akademik',
    requiredTools: ['artifact_store', 'cite_manager'],
    expectedOutputs: ['refined_draft', 'improved_arguments', 'polished_writing'],
    completionCriteria: [
      'Revisi konten dan struktur telah dilakukan',
      'Kualitas penulisan akademik telah diperbaiki',
      'Konsistensi style dan format telah dijaga',
      'Argumen telah diperkuat dengan evidence'
    ]
  },
  {
    phase: 8,
    name: 'Final Paper',
    description: 'Finalisasi makalah dengan proofreading dan persiapan submission',
    requiredTools: ['artifact_store'],
    expectedOutputs: ['final_paper', 'submission_ready', 'quality_assurance'],
    completionCriteria: [
      'Makalah final siap untuk submission',
      'Proofreading menyeluruh telah dilakukan',
      'Format sesuai standar publikasi/institusi',
      'Quality assurance checklist telah dipenuhi'
    ]
  }
]

// 📚 ACADEMIC WORKFLOW CONFIGURATION
export const ACADEMIC_WORKFLOW_CONFIG: AcademicWorkflowConfig = {
  disciplines: {
    'computer-science': {
      phaseCustomizations: {
        1: {
          tools: ['web_search'],
          prompts: ['Focus on technical problem identification', 'Consider computational complexity'],
          expectedOutputs: ['technical_problem', 'complexity_analysis', 'algorithm_overview']
        },
        2: {
          tools: ['web_search', 'artifact_store'],
          prompts: ['Review recent CS literature', 'Focus on peer-reviewed sources'],
          expectedOutputs: ['technical_papers', 'algorithm_comparisons', 'implementation_studies']
        },
        3: {
          tools: ['web_search', 'artifact_store', 'cite_manager'],
          prompts: ['Synthesize technical approaches', 'Identify algorithmic gaps'],
          expectedOutputs: ['technical_synthesis', 'algorithm_taxonomy', 'performance_analysis']
        }
      }
    },
    'social-sciences': {
      phaseCustomizations: {
        1: {
          tools: ['web_search'],
          prompts: ['Focus on social phenomena', 'Consider methodological approaches'],
          expectedOutputs: ['social_problem', 'research_questions', 'theoretical_perspective']
        },
        2: {
          tools: ['web_search', 'artifact_store'],
          prompts: ['Review social science literature', 'Include qualitative studies'],
          expectedOutputs: ['empirical_studies', 'theoretical_frameworks', 'methodological_reviews']
        }
      }
    }
  },
  citationStyles: {
    'APA': {
      format: 'Author-Date',
      examples: ['Smith, J. (2023). Title of work. Publisher.']
    },
    'MLA': {
      format: 'Author-Page',
      examples: ['Smith, John. "Title of Article." Journal Name, vol. 1, 2023, pp. 1-10.']
    },
    'Chicago': {
      format: 'Notes-Bibliography',
      examples: ['John Smith, "Title of Article," Journal Name 1 (2023): 1-10.']
    },
    'IEEE': {
      format: 'Numbered',
      examples: ['[1] J. Smith, "Title of article," Journal Name, vol. 1, pp. 1-10, 2023.']
    }
  },
  academicLevels: {
    'undergraduate': {
      complexity: 'basic',
      wordCountTargets: {
        1: 300, 2: 500, 3: 800, 4: 400, 5: 2000, 6: 200, 7: 2200, 8: 2500
      },
      qualityCriteria: ['Clear writing', 'Proper citations', 'Logical structure']
    },
    'graduate': {
      complexity: 'intermediate',
      wordCountTargets: {
        1: 500, 2: 800, 3: 1200, 4: 600, 5: 3500, 6: 300, 7: 4000, 8: 4500
      },
      qualityCriteria: ['Critical analysis', 'Original insights', 'Methodological rigor']
    },
    'postgraduate': {
      complexity: 'advanced',
      wordCountTargets: {
        1: 800, 2: 1200, 3: 2000, 4: 800, 5: 6000, 6: 500, 7: 7000, 8: 8000
      },
      qualityCriteria: ['Novel contribution', 'Theoretical depth', 'Research excellence']
    }
  }
}

/**
 * 🚀 WORKFLOW ENGINE CLASS
 * Manages academic workflow state and progression
 */
export class WorkflowEngine {
  /**
   * Create initial workflow state for academic 8-phase workflow
   */
  static createAcademicWorkflow(sessionId: string, chatMode: ChatMode): WorkflowState {
    const now = Date.now()
    
    return {
      type: 'academic-8-phase',
      currentPhase: 1,
      maxPhases: 8,
      isActive: true,
      startTime: now,
      phases: ACADEMIC_8_PHASES,
      completedPhases: [],
      phaseProgress: ACADEMIC_8_PHASES.reduce((acc, phase) => {
        acc[phase.phase] = {
          started: false,
          completed: false,
          artifacts: [],
          duration: undefined,
          quality: undefined
        }
        return acc
      }, {} as WorkflowState['phaseProgress']),
      sessionId,
      chatMode
    }
  }

  /**
   * Create free conversation workflow (minimal workflow)
   */
  static createFreeConversationWorkflow(sessionId: string, chatMode: ChatMode): WorkflowState {
    return {
      type: 'free-conversation',
      currentPhase: 1,
      maxPhases: 1,
      isActive: false, // Free conversation doesn't enforce workflow
      startTime: Date.now(),
      phases: [{
        phase: 1,
        name: 'Free Conversation',
        description: 'Percakapan bebas tanpa batasan workflow',
        requiredTools: [],
        expectedOutputs: [],
        completionCriteria: []
      }],
      completedPhases: [],
      phaseProgress: {
        1: {
          started: true,
          completed: false,
          artifacts: []
        }
      },
      sessionId,
      chatMode
    }
  }

  /**
   * Determine if user query should trigger workflow initiation
   */
  static shouldTriggerWorkflow(chatMode: ChatMode, userQuery: string): boolean {
    if (chatMode === 'casual') {
      return false // Casual mode never triggers workflow
    }

    if (chatMode === 'formal') {
      // Keywords that suggest academic work
      const academicKeywords = [
        'makalah', 'skripsi', 'thesis', 'penelitian', 'research', 'paper',
        'artikel', 'jurnal', 'conference', 'publikasi', 'citation', 'referensi',
        'literature', 'review', 'analisis', 'methodology', 'teori', 'framework'
      ]

      const queryLower = userQuery.toLowerCase()
      return academicKeywords.some(keyword => queryLower.includes(keyword))
    }

    return false
  }

  /**
   * Get tools required for current workflow phase
   */
  static getRequiredToolsForPhase(workflow: WorkflowState): string[] {
    const currentPhaseData = workflow.phases.find(p => p.phase === workflow.currentPhase)
    return currentPhaseData?.requiredTools || []
  }

  /**
   * Get next workflow phase with tools
   */
  static getNextPhase(workflow: WorkflowState): WorkflowPhase | null {
    const nextPhase = workflow.currentPhase + 1
    if (nextPhase > workflow.maxPhases) {
      return null
    }
    return workflow.phases.find(p => p.phase === nextPhase) || null
  }

  /**
   * Check if workflow phase is complete
   */
  static isPhaseComplete(workflow: WorkflowState, phase: number): boolean {
    const progress = workflow.phaseProgress[phase]
    return progress?.completed || false
  }

  /**
   * Get completion percentage of current workflow
   */
  static getCompletionPercentage(workflow: WorkflowState): number {
    const completedCount = workflow.completedPhases.length
    return Math.round((completedCount / workflow.maxPhases) * 100)
  }

  /**
   * Get personalized phase description based on session context
   */
  static getPersonalizedPhaseDescription(
    phase: WorkflowPhase, 
    discipline?: string, 
    academicLevel?: string
  ): string {
    let description = phase.description

    // Add discipline-specific context
    if (discipline && ACADEMIC_WORKFLOW_CONFIG.disciplines[discipline]) {
      const customization = ACADEMIC_WORKFLOW_CONFIG.disciplines[discipline].phaseCustomizations[phase.phase]
      if (customization) {
        description += `\n\nFocus khusus untuk ${discipline}: ${customization.prompts.join(', ')}`
      }
    }

    // Add academic level context
    if (academicLevel && ACADEMIC_WORKFLOW_CONFIG.academicLevels[academicLevel]) {
      const levelConfig = ACADEMIC_WORKFLOW_CONFIG.academicLevels[academicLevel]
      const targetWords = levelConfig.wordCountTargets[phase.phase]
      if (targetWords) {
        description += `\n\nTarget kata (${academicLevel}): ~${targetWords} kata`
      }
    }

    return description
  }

  /**
   * Generate workflow-aware system prompt enhancement
   */
  static generateWorkflowPromptContext(workflow: WorkflowState): string {
    if (!workflow.isActive) {
      return ''
    }

    const currentPhaseData = workflow.phases.find(p => p.phase === workflow.currentPhase)
    if (!currentPhaseData) {
      return ''
    }

    const completionPercentage = this.getCompletionPercentage(workflow)
    const requiredTools = this.getRequiredToolsForPhase(workflow)

    return `
KONTEKS WORKFLOW AKADEMIK:
- Fase saat ini: ${workflow.currentPhase}/8 - ${currentPhaseData.name}
- Progress keseluruhan: ${completionPercentage}%
- Deskripsi fase: ${currentPhaseData.description}
- Tools yang diperlukan: ${requiredTools.join(', ')}
- Kriteria penyelesaian: ${currentPhaseData.completionCriteria.join('; ')}
- Output yang diharapkan: ${currentPhaseData.expectedOutputs.join(', ')}

INSTRUKSI WORKFLOW:
- Fokus pada penyelesaian fase ${workflow.currentPhase} sesuai kriteria yang ditetapkan
- Gunakan tools yang diperlukan untuk mencapai output yang diharapkan
- Berikan guidance jelas untuk transisi ke fase berikutnya
- Pastikan kualitas akademik sesuai standar institusi
`
  }
}

/**
 * 🚀 P03.1: MODE-AWARE WORKFLOW DETECTION
 * Detects if user's request should trigger academic workflow based on chat mode
 */
export function detectWorkflowTrigger(chatMode: ChatMode, userQuery: string, isFirstMessage: boolean): {
  shouldTrigger: boolean
  workflowType: WorkflowType
  confidence: number
  reasoning: string
} {
  // Casual mode never triggers workflow
  if (chatMode === 'casual') {
    return {
      shouldTrigger: false,
      workflowType: 'free-conversation',
      confidence: 1.0,
      reasoning: 'Casual mode selected - free conversation without workflow constraints'
    }
  }

  // Formal mode analysis
  if (chatMode === 'formal') {
    const queryLower = userQuery.toLowerCase()
    
    // Strong academic indicators
    const strongAcademicKeywords = [
      'makalah', 'skripsi', 'thesis', 'dissertation', 'penelitian', 'research paper',
      'artikel jurnal', 'conference paper', 'publikasi ilmiah'
    ]
    
    const mediumAcademicKeywords = [
      'literature review', 'tinjauan pustaka', 'referensi', 'sitasi', 'citation',
      'metodologi', 'methodology', 'analisis', 'framework teoritis', 'kerangka teori'
    ]
    
    const weakAcademicKeywords = [
      'paper', 'artikel', 'tugas', 'assignment', 'report', 'laporan'
    ]

    let confidence = 0.0
    let reasoning = 'Formal mode detected. '

    // Check strong indicators
    const hasStrongKeywords = strongAcademicKeywords.some(keyword => queryLower.includes(keyword))
    if (hasStrongKeywords) {
      confidence += 0.8
      reasoning += 'Strong academic keywords detected. '
    }

    // Check medium indicators
    const hasMediumKeywords = mediumAcademicKeywords.some(keyword => queryLower.includes(keyword))
    if (hasMediumKeywords) {
      confidence += 0.5
      reasoning += 'Medium academic keywords detected. '
    }

    // Check weak indicators
    const hasWeakKeywords = weakAcademicKeywords.some(keyword => queryLower.includes(keyword))
    if (hasWeakKeywords) {
      confidence += 0.3
      reasoning += 'Weak academic keywords detected. '
    }

    // First message in formal mode should have higher threshold
    const threshold = isFirstMessage ? 0.6 : 0.4

    if (confidence >= threshold) {
      return {
        shouldTrigger: true,
        workflowType: 'academic-8-phase',
        confidence: Math.min(1.0, confidence),
        reasoning: reasoning + `Confidence ${Math.round(confidence * 100)}% exceeds threshold.`
      }
    } else {
      return {
        shouldTrigger: false,
        workflowType: 'free-conversation',
        confidence,
        reasoning: reasoning + `Confidence ${Math.round(confidence * 100)}% below threshold.`
      }
    }
  }

  // Default fallback
  return {
    shouldTrigger: false,
    workflowType: 'free-conversation',
    confidence: 0.0,
    reasoning: 'No clear workflow trigger detected'
  }
}