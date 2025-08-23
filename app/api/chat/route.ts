import { 
  streamText, 
  tool, 
  convertToModelMessages, 
  createUIMessageStream,
  createUIMessageStreamResponse,
  type UIMessage,
  stepCountIs
} from 'ai'
import { z } from 'zod'
// 🚀 P07.1: PERSONA-AWARE PROVIDER INTEGRATION
import { providerRegistry, trackUsage } from '@/lib/providers'
import { getPersonaAwareModel } from '@/lib/providers/persona-aware-provider'
import { 
  approvalGateEngine, 
  createApprovalContext,
  type ApprovalContext 
} from '@/middleware/approval-gates'
import { validateRequest, sanitizeInput, securityHeaders, extractMessageText } from '@/lib/validation'
import { getClientIdentifier, getClientFingerprint, burstProtection, createRateLimitResponse } from '@/lib/rate-limiting'
import { getSystemPromptForAPI } from '@/lib/persona-prompt-service'
import { personaService } from '@/lib/persona-service'
import { createPersonaAwareTools, createPersonaAwareToolMiddleware } from '@/lib/persona-aware-tools'
import { personaDetector } from '@/lib/persona-detection'
import { 
  DEFAULT_STREAMING_CONFIG, 
  getRandomMessage, 
  getToolMessage, 
  createTimingController,
  calculatePhaseDuration,
  getProgressiveToolMessage,
  optimizeStreamingPerformance,
  createConnectionResilienceManager
} from '@/lib/streaming-config'
import { performanceMonitor, getProgressMessage } from '@/lib/streaming-performance'
import { WorkflowEngine } from '@/lib/workflow-engine'
import type { MakalahUIMessage, StreamingPhase, WorkflowState } from '@/types'

// Hardcoded system prompt for academic writing assistance testing
const SYSTEM_PROMPT = `Kamu adalah asisten akademik AI yang membantu menulis makalah dan penelitian berkualitas tinggi. 

PERAN KAMU:
- Membantu penulisan akademik dengan standar institusi
- Memberikan panduan riset dan struktur makalah yang solid
- Menyediakan referensi dan sitasi yang akurat
- Mendukung proses menulis 8-fase akademik

GAYA KOMUNIKASI:
- Gunakan bahasa Indonesia mix formal dan informal untuk UI
- Adaptasi dengan gaya komunikasi User, jika user menggunakan gaya informal maka ikuti, jika formal juga ikuti
- Berikan respons yang mendalam dan terstruktur
- Fokus pada kualitas akademik dan integritas intelektual
- Selalu berikan contoh praktis dan actionable insights

KEMAMPUAN TOOLS:
- web_search: Pencarian internet untuk sumber akademik
- artifact_store: Menyimpan draft dan dokumen fase
- cite_manager: Manajemen referensi dan sitasi

Bantu user dengan pertanyaan atau permintaan penulisan akademik mereka.`

// 🚀 ENHANCED TOOL EXECUTION MIDDLEWARE
const createToolExecutionMiddleware = (toolName: string) => ({
  onStart: (args: any) => {
    console.log(`[TOOL START] ${toolName} starting with args:`, args)
    performanceMonitor.startPhaseTimer(toolName)
    return {
      toolName,
      status: 'start',
      message: getIndonesianToolMessage(toolName, 'start'),
      args,
      timestamp: Date.now()
    }
  },
  
  onProgress: (progress: number) => ({
    toolName,
    status: 'progress',
    message: getIndonesianToolMessage(toolName, 'progress', progress),
    progress,
    timestamp: Date.now()
  }),
  
  onComplete: (result: any, duration: number) => {
    performanceMonitor.trackToolExecution(toolName, duration)
    console.log(`[TOOL COMPLETE] ${toolName} finished in ${duration}ms`)
    return {
      toolName,
      status: 'success',
      message: getIndonesianToolMessage(toolName, 'success', undefined, duration),
      result,
      duration,
      timestamp: Date.now()
    }
  },
  
  onError: (error: Error) => ({
    toolName,
    status: 'error',
    message: getIndonesianToolMessage(toolName, 'error'),
    error: error.message,
    timestamp: Date.now()
  })
})

// Indonesian tool feedback messages
function getIndonesianToolMessage(tool: string, status: 'start' | 'progress' | 'success' | 'error', progress?: number, duration?: number): string {
  const progressText = progress ? ` (${Math.round(progress)}%)` : ''
  const durationText = duration ? ` dalam ${Math.round(duration)}ms` : ''
  
  switch (tool) {
    case 'web_search':
      switch (status) {
        case 'start': return 'Agent mulai mencari referensi akademik di internet...'
        case 'progress': return `Agent sedang mengumpulkan sumber akademik${progressText}...`
        case 'success': return `Agent berhasil menemukan referensi akademik${durationText}`
        case 'error': return 'Terjadi kesalahan saat mencari referensi akademik'
      }
      break
      
    case 'artifact_store':
      switch (status) {
        case 'start': return 'Agent mulai menyimpan artefak ke database...'
        case 'progress': return `Agent sedang menyimpan dokumen${progressText}...`
        case 'success': return `Agent berhasil menyimpan artefak${durationText}`
        case 'error': return 'Terjadi kesalahan saat menyimpan artefak'
      }
      break
      
    case 'cite_manager':
      switch (status) {
        case 'start': return 'Agent mulai mengelola sitasi dan referensi...'
        case 'progress': return `Agent sedang memproses sitasi${progressText}...`
        case 'success': return `Agent berhasil mengelola sitasi${durationText}`
        case 'error': return 'Terjadi kesalahan saat mengelola sitasi'
      }
      break
      
    default:
      switch (status) {
        case 'start': return `Agent mulai menjalankan ${tool}...`
        case 'progress': return `Agent sedang memproses${progressText}...`
        case 'success': return `Agent berhasil menyelesaikan tugas${durationText}`
        case 'error': return `Terjadi kesalahan saat menjalankan ${tool}`
      }
  }
}

// ============================================
// LEGACY TOOLS (P03) - REPLACED BY PERSONA-AWARE TOOLS (P04)
// ============================================
// These functions are maintained for fallback compatibility
// New implementations in: /src/lib/persona-aware-tools.ts

// 🚀 P03.3: WORKFLOW-AWARE TOOL DEFINITIONS (LEGACY)
const createWorkflowAwareWebSearchTool = (workflowState?: WorkflowState | null, persona?: any) => tool({
  description: `Search the internet for academic sources and research information${workflowState?.isActive ? ` (optimized for Phase ${workflowState.currentPhase}/8)` : ''}`,
  inputSchema: z.object({
    query: z.string().describe('Search query for academic sources'),
    limit: z.number().max(8).default(5).describe('Number of results to return (max 8)'),
  }),
  execute: async ({ query, limit }) => {
    const middleware = createToolExecutionMiddleware('web_search')
    const startTime = Date.now()
    
    try {
      // Start tool execution dengan middleware feedback
      const startEvent = middleware.onStart({ query, limit })
      console.log('[WEB SEARCH START]', startEvent)
      
      // Phase 1: Search setup (30% progress)
      await new Promise(resolve => setTimeout(resolve, 600))
      const progress30 = middleware.onProgress(30)
      console.log('[WEB SEARCH PROGRESS]', progress30)
      
      // Phase 2: Source gathering (70% progress)  
      await new Promise(resolve => setTimeout(resolve, 800))
      const progress70 = middleware.onProgress(70)
      console.log('[WEB SEARCH PROGRESS]', progress70)
      
      // Phase 3: Verification (90% progress)
      await new Promise(resolve => setTimeout(resolve, 600))
      const progress90 = middleware.onProgress(90)
      console.log('[WEB SEARCH PROGRESS]', progress90)
      
      const duration = Date.now() - startTime

      // 🚀 P03.3: WORKFLOW-AWARE SEARCH RESULT ADAPTATION
      let searchStrategy = 'academic_focused'
      let sourcesChecked = ['Google Scholar', 'ResearchGate', 'IEEE Xplore', 'PubMed', 'arXiv']
      let personalizedGuidance = ''

      if (workflowState?.isActive) {
        const currentPhase = workflowState.phases.find(p => p.phase === workflowState.currentPhase)
        
        switch (workflowState.currentPhase) {
          case 1: // Topic Definition
            searchStrategy = 'topic_exploration'
            sourcesChecked = ['Google Scholar', 'Sinta Kemdikbud', 'Garuda Kembdikbud', 'ResearchGate', 'Semantic Scholar', 'JSTOR']
            personalizedGuidance = 'Fokus pada definisi topik dan identifikasi research gaps'
            break
          case 2: // Research Notes
            searchStrategy = 'comprehensive_literature'
            sourcesChecked = ['Google Scholar', 'Sinta Kemdikbud', 'Garuda Kembdikbud', 'ResearchGate', 'IEEE Xplore', 'PubMed', 'arXiv', 'Scopus']
            personalizedGuidance = 'Kumpulkan beragam perspektif dan metodologi penelitian'
            break
          case 3: // Literature Review
            searchStrategy = 'critical_analysis'
            sourcesChecked = ['High-impact Journals', 'Recent Publications', 'Systematic Reviews']
            personalizedGuidance = 'Cari meta-analysis dan systematic review untuk sintesis kritis'
            break
          case 6: // Citations/References
            searchStrategy = 'citation_verification'
            sourcesChecked = ['CrossRef', 'DOI', 'Publisher Sites', 'Original Sources']
            personalizedGuidance = 'Verifikasi akurasi dan kelengkapan referensi'
            break
        }
      }

      // Generate phase-appropriate search results
      const results = {
        results: [
          {
            title: `${workflowState?.isActive ? `Phase ${workflowState.currentPhase} Research` : 'Academic Research'} on: ${query}`,
            url: `https://scholar.google.com/search?q=${encodeURIComponent(query)}`,
            snippet: `Research findings related to ${query} from academic sources.${personalizedGuidance ? ` ${personalizedGuidance}.` : ''}`,
            source: 'Google Scholar',
            relevance: 95,
            workflowRelevance: workflowState?.isActive ? `Highly relevant for Phase ${workflowState.currentPhase}` : undefined
          },
          {
            title: `${workflowState?.isActive ? 'Literature Database' : 'ResearchGate'}: ${query}`,
            url: `https://researchgate.net/search?q=${encodeURIComponent(query)}`,
            snippet: `Academic publications and research papers about ${query}.`,
            source: 'ResearchGate',
            relevance: 88,
            workflowRelevance: workflowState?.isActive ? `Supports ${workflowState.phases.find(p => p.phase === workflowState.currentPhase)?.name}` : undefined
          },
          {
            title: `Technical Papers: ${query}`,
            url: `https://ieeexplore.ieee.org/search/searchresult.jsp?queryText=${encodeURIComponent(query)}`,
            snippet: `Technical papers and conferences about ${query}.`,
            source: 'IEEE Xplore',
            relevance: 82
          }
        ],
        searchQuery: query,
        totalResults: limit,
        searchDuration: duration,
        averageRelevance: 88.3,
        searchStrategy,
        sourcesChecked,
        // 🚀 P03.3: WORKFLOW INTEGRATION CONTEXT
        workflowContext: workflowState?.isActive ? {
          currentPhase: workflowState.currentPhase,
          phaseName: workflowState.phases.find(p => p.phase === workflowState.currentPhase)?.name,
          phaseGuidance: personalizedGuidance,
          expectedOutputs: workflowState.phases.find(p => p.phase === workflowState.currentPhase)?.expectedOutputs
        } : null,
        personaContext: persona ? {
          name: persona.name,
          mode: persona.mode,
          searchOptimization: `Optimized for ${persona.mode} persona behavior`
        } : null
      }
      
      // Complete tool execution dengan middleware feedback
      const completeEvent = middleware.onComplete(results, duration)
      console.log('[WEB SEARCH COMPLETE]', completeEvent)
      
      return results
      
    } catch (error) {
      const errorEvent = middleware.onError(error as Error)
      console.error('[WEB SEARCH ERROR]', errorEvent)
      throw error
    }
  },
})

const createWorkflowAwareArtifactStoreTool = (workflowState?: WorkflowState | null, persona?: any) => tool({
  description: `Store academic artifacts like drafts, outlines, and research notes${workflowState?.isActive ? ` (Phase ${workflowState.currentPhase}/8 optimization)` : ''}`,
  inputSchema: z.object({
    title: z.string().describe('Title of the artifact'),
    content: z.string().describe('Content of the artifact'),
    type: z.enum(['markdown', 'text', 'code']).describe('Type of artifact'),
    phase: z.number().min(1).max(8).default(workflowState?.currentPhase || 1).describe('Academic phase (1-8)'),
    metadata: z.object({
      discipline: z.string().nullable(),
      academicLevel: z.enum(['undergraduate', 'graduate', 'postgraduate']).nullable(),
      citationStyle: z.enum(['APA', 'MLA', 'Chicago', 'IEEE']).nullable(),
    }).nullable(),
  }),
  execute: async ({ title, content, type, phase, metadata }) => {
    const middleware = createToolExecutionMiddleware('artifact_store')
    const startTime = Date.now()
    const contentSize = content.length
    
    try {
      // Start tool execution dengan middleware feedback
      const startEvent = middleware.onStart({ title, type, phase, contentSize })
      console.log('[ARTIFACT STORE START]', startEvent)
      
      // Phase 1: Document preparation (25% progress)
      await new Promise(resolve => setTimeout(resolve, 300))
      const progress25 = middleware.onProgress(25)
      console.log('[ARTIFACT STORE PROGRESS]', progress25)
      
      // Phase 2: Size-based upload simulation (75% progress)
      const uploadTime = Math.min(1000, Math.max(200, contentSize / 10))
      await new Promise(resolve => setTimeout(resolve, uploadTime))
      const progress75 = middleware.onProgress(75)
      console.log('[ARTIFACT STORE PROGRESS]', progress75)
      
      // Phase 3: Finalization (95% progress)
      await new Promise(resolve => setTimeout(resolve, 200))
      const progress95 = middleware.onProgress(95)
      console.log('[ARTIFACT STORE PROGRESS]', progress95)
      
      const duration = Date.now() - startTime
      const wordCount = content.split(/\s+/).length
      const artifactId = `artifact_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      
      // Update performance metrics dengan file size
      performanceMonitor.updateMemoryUsage(contentSize)
      
      // 🚀 P03.3: WORKFLOW-AWARE ARTIFACT CONTEXT ENHANCEMENT
      let workflowValidation = null
      let phaseAlignment = 'independent'
      
      if (workflowState?.isActive) {
        const currentPhaseData = workflowState.phases.find(p => p.phase === workflowState.currentPhase)
        const isPhaseAligned = phase === workflowState.currentPhase
        
        phaseAlignment = isPhaseAligned ? 'aligned' : 'cross-phase'
        workflowValidation = {
          alignedWithCurrentPhase: isPhaseAligned,
          currentWorkflowPhase: workflowState.currentPhase,
          expectedOutputs: currentPhaseData?.expectedOutputs || [],
          completionCriteria: currentPhaseData?.completionCriteria || [],
          phaseRecommendation: isPhaseAligned 
            ? `Perfect! This artifact supports Phase ${workflowState.currentPhase} objectives`
            : `Consider aligning with current Phase ${workflowState.currentPhase} for better workflow integration`
        }
      }

      const result = {
        artifactId,
        title,
        type,
        phase,
        wordCount,
        contentSize,
        uploadDuration: duration,
        createdAt: new Date().toISOString(),
        metadata,
        success: true,
        compressionRatio: contentSize > 1000 ? (contentSize * 0.7) / contentSize : 1,
        storageLocation: `academic-artifacts/${phase}/${artifactId}`,
        backupCreated: true,
        indexingStatus: 'completed',
        // 🚀 P03.3: WORKFLOW INTEGRATION
        workflowContext: workflowValidation,
        phaseAlignment,
        personaContext: persona ? {
          optimizedFor: persona.mode,
          personaName: persona.name,
          qualityThreshold: persona.mode === 'Research' ? 'high' : persona.mode === 'Writing' ? 'medium' : 'standard'
        } : null
      }
      
      // Complete tool execution dengan middleware feedback
      const completeEvent = middleware.onComplete(result, duration)
      console.log('[ARTIFACT STORE COMPLETE]', completeEvent)
      
      return result
      
    } catch (error) {
      const errorEvent = middleware.onError(error as Error)
      console.error('[ARTIFACT STORE ERROR]', errorEvent)
      throw error
    }
  },
})

const createWorkflowAwareCiteManagerTool = (workflowState?: WorkflowState | null, persona?: any, sessionContext?: any) => tool({
  description: `Manage academic citations and references${workflowState?.isActive ? ` (Phase ${workflowState.currentPhase}/8 standards)` : ''}`,
  inputSchema: z.object({
    action: z.enum(['add', 'format', 'validate']).describe('Citation management action'),
    citation: z.string().describe('Citation to process'),
    style: z.enum(['APA', 'MLA', 'Chicago', 'IEEE']).default(sessionContext?.citationStyle || 'APA'),
  }),
  execute: async ({ action, citation, style }) => {
    const middleware = createToolExecutionMiddleware('cite_manager')
    const startTime = Date.now()
    
    try {
      // Start tool execution dengan middleware feedback
      const startEvent = middleware.onStart({ action, citation, style })
      console.log('[CITE MANAGER START]', startEvent)
      
      // Phase 1: Citation parsing (33% progress)
      await new Promise(resolve => setTimeout(resolve, 500))
      const progress33 = middleware.onProgress(33)
      console.log('[CITE MANAGER PROGRESS]', progress33)
      
      // Phase 2: Format processing (66% progress)
      await new Promise(resolve => setTimeout(resolve, 600))
      const progress66 = middleware.onProgress(66)
      console.log('[CITE MANAGER PROGRESS]', progress66)
      
      // Phase 3: Validation (90% progress)
      await new Promise(resolve => setTimeout(resolve, 400))
      const progress90 = middleware.onProgress(90)
      console.log('[CITE MANAGER PROGRESS]', progress90)
      
      const duration = Date.now() - startTime
      const citationCount = citation.split(',').length
      
      // Enhanced citation processing dengan detailed analysis
      const analysisResults = {
        hasAuthor: citation.toLowerCase().includes('author') || /\w+,\s*\w+/.test(citation),
        hasYear: /\d{4}/.test(citation),
        hasTitle: citation.includes('"') || citation.includes("'"),
        hasJournal: citation.toLowerCase().includes('journal') || citation.toLowerCase().includes('proceedings'),
        hasDOI: citation.toLowerCase().includes('doi') || citation.includes('10.'),
        hasURL: citation.includes('http') || citation.includes('www.')
      }
      
      const completeness = Object.values(analysisResults).filter(Boolean).length / Object.keys(analysisResults).length * 100
      
      // 🚀 P03.3: WORKFLOW-AWARE CITATION SUGGESTIONS
      let workflowSpecificSuggestions: string[] = []
      let citationPriority = 'standard'

      if (workflowState?.isActive) {
        switch (workflowState.currentPhase) {
          case 2: // Research Notes
            workflowSpecificSuggestions = [
              'Fokus pada kualitas sumber untuk building knowledge base',
              'Pastikan sumber terbaru (5 tahun terakhir) untuk research notes',
              'Catat metodologi penelitian untuk referensi nanti'
            ]
            citationPriority = 'collection'
            break
          case 3: // Literature Review
            workflowSpecificSuggestions = [
              'Prioritas citation dari high-impact journals',
              'Verifikasi systematic review dan meta-analysis',
              'Pastikan representasi berbagai perspektif teoritis'
            ]
            citationPriority = 'critical_analysis'
            break
          case 6: // Citations/References
            workflowSpecificSuggestions = [
              'Verification wajib untuk semua referensi',
              'Cross-check dengan original source',
              'Pastikan konsistensi format across all citations'
            ]
            citationPriority = 'verification'
            break
        }
      }

      const suggestions = [
        !analysisResults.hasAuthor && 'Tambahkan nama penulis untuk kelengkapan sitasi',
        !analysisResults.hasYear && 'Sertakan tahun publikasi',
        !analysisResults.hasDOI && `Pertimbangkan menambahkan DOI untuk ${style} style`,
        completeness < 70 && 'Sitasi memerlukan informasi lebih lengkap',
        `Verifikasi format sesuai standar ${style}`,
        ...workflowSpecificSuggestions
      ].filter(Boolean)
      
      const result = {
        action,
        originalCitation: citation,
        formattedCitation: `[${style} Format] ${citation}`,
        style,
        isValid: completeness > 50,
        citationCount,
        processingDuration: duration,
        suggestions: suggestions.slice(0, 5), // Top 5 suggestions (increased for workflow)
        validationScore: Math.round(completeness),
        confidence: completeness > 80 ? 'high' : completeness > 60 ? 'medium' : 'low',
        analysis: analysisResults,
        completenessPercentage: Math.round(completeness),
        recommendedImprovements: suggestions.length,
        // 🚀 P03.3: WORKFLOW INTEGRATION CONTEXT
        workflowContext: workflowState?.isActive ? {
          currentPhase: workflowState.currentPhase,
          phaseName: workflowState.phases.find(p => p.phase === workflowState.currentPhase)?.name,
          citationPriority,
          phaseSpecificGuidance: workflowSpecificSuggestions,
          qualityThreshold: workflowState.currentPhase === 6 ? 'verification_required' : 'standard_quality'
        } : null,
        personaContext: persona ? {
          mode: persona.mode,
          qualityExpectation: persona.mode === 'Research' ? 'comprehensive' : persona.mode === 'Review' ? 'critical' : 'standard',
          citationStyle: persona.configuration?.citationStyle || style
        } : null,
        academicLevel: sessionContext?.academicLevel,
        disciplineContext: sessionContext?.discipline
      }
      
      // Complete tool execution dengan middleware feedback
      const completeEvent = middleware.onComplete(result, duration)
      console.log('[CITE MANAGER COMPLETE]', completeEvent)
      
      return result
      
    } catch (error) {
      const errorEvent = middleware.onError(error as Error)
      console.error('[CITE MANAGER ERROR]', errorEvent)
      throw error
    }
  },
})

// 🚀 P03.2: ENHANCED SYSTEM PROMPT WITH WORKFLOW INTEGRATION
async function getChatModeSystemPrompt(
  chatMode: 'formal' | 'casual' | null, 
  sessionContext?: any,
  workflowState?: WorkflowState | null
): Promise<string> {
  if (!chatMode) {
    return SYSTEM_PROMPT // fallback to default
  }

  // 🚀 P03.2: Generate workflow-aware prompt context
  let workflowContext = ''
  if (workflowState?.isActive) {
    workflowContext = WorkflowEngine.generateWorkflowPromptContext(workflowState)
  }

  if (chatMode === 'formal') {
    // 🎓 FORMAL ACADEMIC MODE - Enhanced with Workflow Integration
    return `Anda adalah asisten akademik AI yang menggunakan bahasa Indonesia formal untuk membantu penulisan makalah dan penelitian berkualitas tinggi.

PERAN ANDA - MODE AKADEMIK FORMAL:
- Spesialis dalam penulisan akademik dengan standar institusi tinggi
- Mendukung workflow 8-fase untuk pembuatan makalah, thesis, dan penelitian
- Memberikan panduan riset komprehensif dan struktur makalah yang solid
- Menyediakan referensi dan sitasi yang akurat dengan standar akademik
- Fokus pada integritas intelektual dan kualitas akademik tertinggi

GAYA KOMUNIKASI FORMAL:
- Gunakan bahasa Indonesia formal dan akademik yang tepat
- Berikan respons yang mendalam, terstruktur, dan analitis
- Fokus pada metodologi, validitas, dan reliabilitas
- Selalu berikan rujukan teoritis dan evidence-based insights
- Maintain objective tone dengan scholarly discourse

${workflowContext || `WORKFLOW AKADEMIK:
${sessionContext?.academicPhase ? `- Saat ini di Fase ${sessionContext.academicPhase}/8 dari workflow akademik` : '- Mendukung seluruh proses workflow akademik 8-fase'}
${sessionContext?.discipline ? `- Disiplin ilmu: ${sessionContext.discipline}` : '- Adaptif terhadap berbagai disiplin ilmu'}
${sessionContext?.academicLevel ? `- Level akademik: ${sessionContext.academicLevel}` : '- Menyesuaikan dengan level akademik user'}
${sessionContext?.citationStyle ? `- Standar sitasi: ${sessionContext.citationStyle}` : '- Mendukung berbagai standar sitasi (APA, MLA, Chicago, IEEE)'}`}

KEMAMPUAN TOOLS AKADEMIK:
- web_search: Pencarian literatur akademik dan sumber credible
- artifact_store: Menyimpan draft, outline, dan dokumen fase akademik
- cite_manager: Manajemen referensi profesional dan sitasi akurat

PRIORITAS RESPONSE:
- Evidence-based reasoning dan critical thinking
- Comprehensive literature consideration
- Methodological rigor dan academic integrity
- Structured argumentation dan logical flow
- Professional academic presentation

${workflowState?.isActive ? `

🚀 MODE WORKFLOW AKTIF: 
Anda sedang membantu user menyelesaikan workflow akademik terstruktur. Pastikan setiap respons berkontribusi pada pencapaian tujuan fase saat ini dan memberikan guidance yang jelas untuk transisi ke fase berikutnya.` : ''}

Bantu user dengan pertanyaan atau permintaan penulisan akademik mereka menggunakan standar akademik formal yang tinggi.`
  }

  if (chatMode === 'casual') {
    // 💬 CASUAL CONVERSATION MODE - Gue-Lo Jakarta Style
    return `Lo lagi ngobrol sama AI yang bisa bantuin lo dengan berbagai hal. Gue akan pake bahasa santai ala Jakarta biar lebih enak ngobrolnya!

SIAPA GUE:
- AI assistant yang bisa bantuin lo diskusi berbagai topik
- Gue bakal pake bahasa gue-lo yang natural dan santai
- Meski santai, gue tetep helpful dan informatif
- Bisa ngobrol bebas tanpa harus formal-formal banget

GAYA NGOBROL GUE:
- Pake bahasa Jakarta yang natural (gue-lo, nih, sih, dong, etc.)
- Santai tapi tetep sopan dan respectful
- Kasih info yang bermanfaat dengan cara yang enak dipahami
- Bisa bercanda dikit tapi tetep on point
- Adaptif sama mood dan style ngobrol lo

BISA BANTUIN APA AJA:
- Diskusi topik umum atau brainstorming ide
- Kasih saran atau pendapat tentang sesuatu
- Jelasin konsep atau info yang lo butuhin
- Bantuin problem solving dengan pendekatan yang santai
- Ngobrol bebas tentang hal-hal yang lo penasaran

TOOLS YANG BISA GUE PAKE:
- web_search: Nyari info terbaru di internet kalo lo butuh
- artifact_store: Simpen catatan atau dokumen penting
- cite_manager: Bantuin urusan referensi kalo diperluin

YANG PERLU LO TAU:
- Gue tetep AI, jadi ada batasan kemampuan gue
- Kalo lo butuh bantuan akademik formal, mending switch ke mode formal
- Gue bakal ngasih respon yang helpful tapi tetep santai
- Feel free aja ngobrol tentang apa yang lo mau!

Jadi, ada yang mau lo obrolin atau butuh bantuan apa nih?`
  }

  // Fallback
  return SYSTEM_PROMPT
}

// 🛡️ SECURITY: CORS Configuration dengan OWASP compliance
const ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:3001', 
  'https://makalah-ai.vercel.app',
  'https://*.vercel.app', // Allow all Vercel preview deployments
  'https://makalah.app',
]

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
  'Access-Control-Max-Age': '86400', // 24 hours preflight cache
  'Access-Control-Allow-Credentials': 'true',
}

function validateOrigin(origin: string | null): string {
  if (!origin) return 'null'
  
  // Check exact matches
  if (ALLOWED_ORIGINS.includes(origin)) return origin
  
  // Check wildcard patterns for Vercel deployments
  if (origin.match(/https:\/\/.*\.vercel\.app$/)) return origin
  
  // Default to first allowed origin for development
  if (process.env.NODE_ENV === 'development') {
    return ALLOWED_ORIGINS[0]
  }
  
  return 'null'
}

// Handle CORS preflight requests
export async function OPTIONS(req: Request) {
  const origin = req.headers.get('origin')
  const validOrigin = validateOrigin(origin)
  
  return new Response(null, {
    status: 200,
    headers: {
      ...CORS_HEADERS,
      'Access-Control-Allow-Origin': validOrigin,
    },
  })
}

export async function POST(req: Request) {
  try {
    // 🛡️ SECURITY: CORS validation
    const origin = req.headers.get('origin')
    const validOrigin = validateOrigin(origin)
    
    if (validOrigin === 'null' && process.env.NODE_ENV === 'production') {
      console.warn(`[CORS] Blocked request from invalid origin: ${origin}`)
      return new Response(
        JSON.stringify({ error: 'CORS: Origin not allowed' }), 
        { 
          status: 403,
          headers: { 
            'Content-Type': 'application/json',
            ...securityHeaders,
          }
        }
      )
    }

    // 🛡️ SECURITY: Enhanced rate limiting dengan client fingerprinting
    const clientId = getClientIdentifier(req)
    const clientInfo = getClientFingerprint(req)
    const rateLimitCheck = burstProtection.check(clientId, clientInfo)
    
    if (!rateLimitCheck.allowed) {
      console.warn(`[RATE LIMIT] Blocked request from ${clientId}: ${rateLimitCheck.reason}${rateLimitCheck.isBanned ? ' (BANNED)' : ''}`)
      const response = createRateLimitResponse(rateLimitCheck)
      
      // Add CORS headers to rate limit response
      const rateLimitHeaders = new Headers(response.headers)
      rateLimitHeaders.set('Access-Control-Allow-Origin', validOrigin)
      Object.entries(CORS_HEADERS).forEach(([key, value]) => {
        if (key !== 'Access-Control-Allow-Origin') {
          rateLimitHeaders.set(key, value)
        }
      })
      
      return new Response(response.body, {
        status: response.status,
        headers: rateLimitHeaders,
      })
    }
    
    // 🛡️ SECURITY: Input validation dan sanitization
    const body = await req.json()
    console.log('[CHAT API] Raw request body received:', {
      hasMessages: !!body.messages,
      messageCount: body.messages?.length || 0,
      firstMessage: body.messages?.[0] || null
    })
    
    const validatedRequest = validateRequest(body)
    
    // Transform dan sanitize messages for AI SDK compatibility
    const sanitizedMessages = validatedRequest.messages.map(msg => {
      // Generate ID jika tidak ada
      const messageId = msg.id || `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      
      // Extract dan sanitize text content
      let textContent = ''
      
      if (msg.parts && msg.parts.length > 0) {
        // Handle AI SDK v5 format (dengan parts array)
        textContent = msg.parts
          .filter(part => part.type === 'text' && part.text)
          .map(part => sanitizeInput(part.text!))
          .join(' ')
      } else if (msg.content) {
        // Handle legacy format (dengan content string)
        textContent = sanitizeInput(msg.content)
      }
      
      // Create AI SDK compatible UIMessage format
      return {
        id: messageId,
        role: msg.role,
        content: textContent, // AI SDK expects content for convertToModelMessages
        parts: [{ type: 'text' as const, text: textContent }],
      } as UIMessage
    })
    
    console.log(`[CHAT API] Processing request from ${clientId} with ${sanitizedMessages.length} messages`)
    
  try {
    // 🚀 ENHANCED: Initialize performance monitoring dan adaptive optimization
    performanceMonitor.reset()
    performanceMonitor.recordConnectionEvent('connect')
    
    // 🚀 P07.1: PERSONA-AWARE MODEL SELECTION WITH APPROVAL GATES
    // Extract context for persona-aware provider selection
    const requestPersona = (body as any).persona
    const sessionContext = (body as any).session_context
    const chatMode = (body as any).chat_mode
    const workflowState = (body as any).workflow_state
    
    // Create persona context for provider selection
    const personaTemplate = requestPersona?.persona_id 
      ? await personaService.getPersonaById(requestPersona.persona_id).catch(() => null)
      : null
    
    const personaProviderContext = {
      chatMode: chatMode,
      personaTemplate: personaTemplate,
      sessionId: sessionContext?.sessionId || null
    }
    
    // 🚀 P07.1: APPROVAL GATE EVALUATION
    const messageText = extractMessageText(body.messages)
    const approvalContext = createApprovalContext(
      sessionContext?.sessionId || 'unknown',
      messageText,
      {
        userId: null, // TODO: Add user ID from auth
        chatMode: chatMode,
        personaTemplate: personaTemplate,
        workflowPhase: sessionContext?.currentWorkflowPhase || null,
        isFirstMessage: body.messages?.length <= 1
      }
    )
    
    // Evaluate approval requirements
    const approvalResult = await approvalGateEngine.evaluateApproval(approvalContext)
    
    if (approvalResult.needsApproval) {
      console.log('[P07.1 APPROVAL GATE] Request requires approval:', approvalResult.approvalId)
      return new Response(
        JSON.stringify({
          error: 'Approval required',
          approvalRequired: true,
          approvalId: approvalResult.approvalId,
          triggeredRules: approvalResult.triggeredRules.map(r => ({
            name: r.name,
            description: r.description
          })),
          message: 'This request requires approval before proceeding. Please wait for approval or contact an administrator.'
        }),
        {
          status: 202,
          headers: { 
            'Content-Type': 'application/json',
            ...securityHeaders
          }
        }
      )
    }
    
    if (approvalResult.action === 'reject') {
      console.log('[P07.1 APPROVAL GATE] Request rejected by rules')
      return new Response(
        JSON.stringify({
          error: 'Request rejected by approval gate',
          triggeredRules: approvalResult.triggeredRules.map(r => ({
            name: r.name,
            description: r.description
          }))
        }),
        { 
          status: 403,
          headers: { 
            'Content-Type': 'application/json',
            ...securityHeaders
          }
        }
      )
    }
    
    // Get persona-aware model with enhanced provider selection
    const model = await providerRegistry.getAvailableModel(personaProviderContext)
    
    console.log('[P07.1 PERSONA PROVIDER] Model selected:', {
      chatMode: chatMode,
      personaId: personaTemplate?.id,
      sessionId: sessionContext?.sessionId,
      approvalStatus: approvalResult.action
    })
    
    // 🚀 ADAPTIVE: Optimize streaming configuration based on network conditions
    const networkCondition = performanceMonitor.detectNetworkCondition()
    const optimizedConfig = optimizeStreamingPerformance(DEFAULT_STREAMING_CONFIG)
    const timing = createTimingController(optimizedConfig)
    const connectionManager = createConnectionResilienceManager(optimizedConfig)
    
    // Check if using mock model (temporary check for mock functionality)
    if (model && typeof model === 'object' && 'stream' in model && typeof (model as any).stream === 'function') {
      // Handle mock provider - return simple JSON response for testing
      console.log('[MOCK PROVIDER] Using mock JSON response for testing')
      
      return new Response(JSON.stringify({
        content: 'Halo! Saya adalah asisten akademik AI. Chat functionality berhasil ditest! Streaming UI berfungsi dengan baik. Mock provider working successfully.',
        role: 'assistant',
        id: `mock-${Date.now()}`
      }), {
        headers: {
          'Content-Type': 'application/json',
          ...securityHeaders,
          ...CORS_HEADERS,
          'Access-Control-Allow-Origin': validOrigin,
        },
      })
    }

    // 🚀 ENHANCED STREAMING: Create UIMessageStream with advanced performance optimization
    const stream = createUIMessageStream<MakalahUIMessage>({
      execute: async ({ writer }) => {
        const startTime = Date.now()
        let currentPhase: StreamingPhase = 'thinking'
        
        // 🚀 PERFORMANCE: Start comprehensive monitoring
        performanceMonitor.startPhaseTimer('thinking')
        
        // Phase 1: THINKING START - Send optimized initial thinking status
        writer.write({
          type: 'data-progress-status',
          data: {
            phase: 'thinking',
            message: getRandomMessage(optimizedConfig.messages.thinking),
            networkCondition: networkCondition.type,
            timestamp: Date.now()
          },
          transient: true, // Transient - won't persist in message history
        })

        // Start thinking phase with adaptive minimum duration
        const thinkingStart = Date.now()
        
        try {
          // 🚀 P02: DYNAMIC SYSTEM PROMPT INJECTION WITH CHAT MODE SUPPORT
          let systemPrompt = SYSTEM_PROMPT // fallback
          let persona = null
          
          // Extract persona, chat mode, and workflow information from request
          const requestPersona = (validatedRequest as any).persona
          const sessionContext = (validatedRequest as any).session_context
          const chatMode = (validatedRequest as any).chat_mode
          const workflowState = (validatedRequest as any).workflow_state as WorkflowState | null
          
          console.log(`[P04 PERSONA-AWARE INTEGRATION] Chat mode: ${chatMode}, Persona ID: ${requestPersona?.persona_id}, Workflow: ${workflowState?.isActive ? `Phase ${workflowState.currentPhase}/8` : 'Inactive'}`)
          
          // 🚀 P02: Persona-as-System-Prompt Behavior
          if (requestPersona?.persona_id) {
            try {
              persona = await personaService.getPersonaById(requestPersona.persona_id)
              systemPrompt = getSystemPromptForAPI(persona, sessionContext)
              
              console.log(`[P02 PERSONA INTEGRATION] Using persona: ${persona.name} (${persona.mode})`)
            } catch (error) {
              console.warn('[P02 PERSONA INTEGRATION] Failed to load persona, using mode-based default:', error)
              // Fallback to chat mode based system prompt with workflow
              systemPrompt = await getChatModeSystemPrompt(chatMode, sessionContext, workflowState)
            }
          } else if (chatMode) {
            // 🚀 P03: Chat Mode + Workflow Based System Prompt Selection
            systemPrompt = await getChatModeSystemPrompt(chatMode, sessionContext, workflowState)
            console.log(`[P03 CHAT MODE + WORKFLOW] Using ${chatMode} mode system prompt${workflowState?.isActive ? ` with active workflow` : ''}`)
          }

          // 🚀 P04: PERSONA MODE DETECTION FOR INTELLIGENT TOOL BEHAVIOR
          const personaContext = personaDetector.detectPersonaMode(systemPrompt, persona || undefined, chatMode)
          console.log(`[P04 PERSONA DETECTION] Mode: ${personaContext.mode}, Academic: ${personaContext.academicMode}, Confidence: ${Math.round(personaContext.confidence * 100)}%`)

          // Configure streamText with enhanced callbacks, persona-aware prompt, and P04 persona-aware tool integration
          // 🚀 P04: CREATE PERSONA-AWARE TOOLS WITH INTELLIGENT BEHAVIOR ADAPTATION
          const personaAwareTools = createPersonaAwareTools(
            systemPrompt, 
            workflowState, 
            persona || undefined, 
            chatMode, 
            sessionContext
          )

          const streamTextConfig: any = {
            model,
            system: systemPrompt,
            messages: convertToModelMessages(sanitizedMessages),
            tools: personaAwareTools,
            temperature: persona?.configuration?.temperature || 0.1,
          }

          // 🚀 P03.2: AI SDK v5 stepCountIs(8) PATTERN FOR ACADEMIC WORKFLOWS
          if (workflowState?.isActive && workflowState.type === 'academic-8-phase') {
            streamTextConfig.stopWhen = stepCountIs(8)
            console.log(`[P03 WORKFLOW] Applied stepCountIs(8) for active academic workflow`)
          }

          const result = streamText({
            ...streamTextConfig,
            
            // 🚀 ENHANCED: Optimized character-by-character streaming dengan performance tracking dan adaptive sizing
            onChunk: ({ chunk }) => {
              if (chunk.type === 'text-delta' && chunk.text) {
                // Measure chunk latency untuk performance optimization
                const chunkLatency = performanceMonitor.measureLatency()
                
                // Adaptive chunk processing based on network conditions
                const optimalChunkSize = performanceMonitor.getOptimalChunkSize()
                const shouldBatch = chunk.text.length > optimalChunkSize
                
                // Simplified chunk processing untuk AI SDK v5 compatibility
                writer.write({
                  type: 'data-text-streaming',
                  data: {
                    status: 'chunk' as const,
                    chunk: chunk.text,
                    chunkSize: chunk.text.length,
                    latency: chunkLatency,
                    networkCondition: networkCondition.type,
                    timestamp: Date.now()
                  },
                  transient: true,
                })
              }
            },

            // 🚀 ENHANCED: Simplified tool monitoring untuk AI SDK v5 compatibility

            onFinish: async ({ text, usage }) => {
              // 🚀 ENHANCED: Final phase dengan comprehensive performance reporting
              const totalDuration = Date.now() - startTime
              const finalMetrics = performanceMonitor.getMetrics()
              
              // Track usage for academic project monitoring
              if (usage) {
                trackUsage(usage, 'primary')
              }

              // 🚀 P03.2: WORKFLOW PROGRESSION TRACKING
              if (workflowState?.isActive) {
                console.log(`[P03 WORKFLOW COMPLETION] Workflow phase ${workflowState.currentPhase} interaction completed`)
                
                // Send workflow progress data to client
                writer.write({
                  type: 'data-workflow-progress',
                  data: {
                    currentPhase: workflowState.currentPhase,
                    totalPhases: workflowState.maxPhases,
                    phaseName: workflowState.phases.find(p => p.phase === workflowState.currentPhase)?.name || 'Unknown',
                    completion: Math.round((workflowState.completedPhases.length / workflowState.maxPhases) * 100),
                    nextPhaseAvailable: workflowState.currentPhase < workflowState.maxPhases,
                    timestamp: Date.now()
                  },
                  transient: true,
                })
              }
              
              // Calculate throughput dan performance stats
              const totalChars = text?.length || 0
              const throughput = totalChars / (totalDuration / 1000) // chars per second
              const averageLatency = finalMetrics.latency
              
              writer.write({
                type: 'data-text-streaming',
                data: {
                  status: 'end',
                  totalChars,
                  duration: totalDuration,
                  throughput: Math.round(throughput),
                  averageLatency: Math.round(averageLatency),
                  networkCondition: networkCondition.type,
                  performanceScore: throughput > 50 ? 'excellent' : throughput > 25 ? 'good' : 'needs-optimization',
                  timestamp: Date.now()
                },
              })

              // Send completion event dengan performance summary
              const performanceRecommendations = performanceMonitor.getOptimizationRecommendations()
              
              writer.write({
                type: 'data-progress-status',
                data: {
                  phase: 'idle',
                  message: 'Respons selesai',
                  performanceSummary: {
                    totalDuration,
                    throughput: Math.round(throughput),
                    toolsUsed: Object.keys(finalMetrics.toolExecutionTime).length,
                    networkQuality: networkCondition.type,
                    recommendations: performanceRecommendations.slice(0, 2) // Top 2 recommendations
                  },
                  timestamp: Date.now()
                },
                transient: true,
              })
              
              // Record successful completion
              performanceMonitor.recordConnectionEvent('disconnect')
            }
          })

          // Merge the streamText result into our enhanced stream
          writer.merge(result.toUIMessageStream())

        } catch (error) {
          console.error('[ENHANCED STREAMING ERROR]', error)
          
          // Advanced error categorization
          const errorType = error instanceof Error ? error.name : 'UnknownError'
          const isNetworkError = error instanceof Error && (error.message.includes('network') || error.message.includes('timeout'))
          const isRateLimitError = error instanceof Error && error.message.includes('rate limit')
          
          let errorMessage = 'Terjadi kesalahan dalam streaming'
          let recoveryAction: StreamingPhase = 'idle'
          
          if (isNetworkError) {
            errorMessage = 'Koneksi terputus, mencoba reconnect...'
            recoveryAction = 'reconnecting'
            performanceMonitor.recordConnectionEvent('retry')
          } else if (isRateLimitError) {
            errorMessage = 'Rate limit tercapai, menunggu sebelum melanjutkan...'
            recoveryAction = 'waiting'
          }
          
          writer.write({
            type: 'data-progress-status',
            data: {
              phase: recoveryAction,
              message: errorMessage,
              errorType,
              recoveryStrategy: isNetworkError ? 'auto-retry' : 'fallback',
              timestamp: Date.now()
            },
            transient: true,
          })
          
          // Enhanced error reporting untuk debugging - removed untuk compatibility
          
          throw error // Re-throw for fallback handling
        }
      },
    })

    // 🚀 ENHANCED: Production-optimized streaming response dengan compression
    const streamResponse = createUIMessageStreamResponse({ 
      stream,
      headers: {
        ...securityHeaders,
        ...CORS_HEADERS,
        'Access-Control-Allow-Origin': validOrigin,
        
        // Streaming optimization headers
        'X-Buffer-Size': performanceMonitor.getOptimalBufferSize().toString(),
        'X-Chunk-Size': performanceMonitor.getOptimalChunkSize().toString(),
        'X-Network-Condition': networkCondition.type,
        'X-Streaming-Mode': 'enhanced',
        
        // Performance monitoring headers
        'X-Performance-Score': networkCondition.bandwidth > 1000 ? 'high' : 'standard',
        'X-Connection-Resilience': 'enabled',
        'X-Adaptive-Sizing': 'active',
        
        // Caching and compression guidance
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'X-Accel-Buffering': 'no', // Disable nginx buffering untuk real-time streaming
      },
    })
    
    // Log successful streaming initiation
    console.log(`[STREAMING SUCCESS] Enhanced streaming initiated untuk client ${clientId}`, {
      networkCondition: networkCondition.type,
      bufferSize: performanceMonitor.getOptimalBufferSize(),
      chunkSize: performanceMonitor.getOptimalChunkSize(),
      totalMessages: sanitizedMessages.length
    })
    
    return streamResponse
    
  } catch (error) {
    console.error('[CHAT API ERROR]', error)
    
    // Mark primary provider as failed and try fallback
    providerRegistry.markPrimaryFailed()
    
    try {
      const fallbackModel = providerRegistry.getFallbackModel()
      
      // 🚀 ENHANCED FALLBACK STREAMING: Use same progressive disclosure for fallback
      const fallbackStream = createUIMessageStream<MakalahUIMessage>({
        execute: async ({ writer }) => {
          const startTime = Date.now()
          
          // Notify user about fallback
          writer.write({
            type: 'data-progress-status',
            data: {
              phase: 'processing',
              message: 'Beralih ke provider backup...',
              timestamp: Date.now()
            },
            transient: true,
          })
          
          // 🚀 P04: Use persona-aware tools for fallback as well
          const fallbackPersonaTools = createPersonaAwareTools(
            SYSTEM_PROMPT, 
            null, // No workflow state for fallback
            undefined, // No persona for fallback
            'formal' // Default to formal mode for fallback
          )

          const fallbackResult = streamText({
            model: fallbackModel,
            system: SYSTEM_PROMPT,
            messages: convertToModelMessages(sanitizedMessages),
            tools: fallbackPersonaTools,
            temperature: 0.1,
            onStepFinish: async ({ usage }) => {
              if (usage) {
                trackUsage(usage, 'fallback')
              }
            },
            onFinish: async ({ response }) => {
              writer.write({
                type: 'data-progress-status',
                data: {
                  phase: 'idle',
                  message: 'Respons backup selesai',
                  timestamp: Date.now()
                },
                transient: true,
              })
            }
          })
          
          writer.merge(fallbackResult.toUIMessageStream())
        },
      })

      // 🚀 ENHANCED: Fallback streaming dengan optimized headers
      const fallbackResponse = createUIMessageStreamResponse({ 
        stream: fallbackStream,
        headers: {
          ...securityHeaders,
          ...CORS_HEADERS,
          'Access-Control-Allow-Origin': validOrigin,
          
          // Fallback-specific headers
          'X-Streaming-Mode': 'fallback',
          'X-Provider-Status': 'backup-active',
          'X-Fallback-Reason': 'primary-provider-failed',
          
          // Performance headers untuk fallback
          'X-Buffer-Size': '2048', // Reduced buffer untuk fallback
          'X-Chunk-Size': '128',   // Smaller chunks untuk stability
          'X-Network-Condition': performanceMonitor.detectNetworkCondition().type,
        },
      })
      
      console.log(`[FALLBACK STREAMING] Fallback streaming activated untuk client ${clientId}`)
      
      return fallbackResponse
      
    } catch (fallbackError) {
      console.error('[FALLBACK ERROR]', fallbackError)
      
      return new Response(
        JSON.stringify({ 
          error: 'Both primary and fallback providers failed. Please check your API keys and try again.',
          details: {
            primaryError: error instanceof Error ? error.message : 'Unknown error',
            fallbackError: fallbackError instanceof Error ? fallbackError.message : 'Unknown error'
          }
        }), 
        { 
          status: 500,
          headers: { 
            'Content-Type': 'application/json',
            ...securityHeaders,
            ...CORS_HEADERS,
            'Access-Control-Allow-Origin': validOrigin,
          }
        }
      )
    }
    }
  } catch (validationError) {
    // 🛡️ SECURITY: Handle validation errors separately
    console.warn('[VALIDATION ERROR]', validationError)
    
    // Get origin for CORS even in validation errors
    const origin = req.headers.get('origin')
    const validOrigin = validateOrigin(origin)
    
    return new Response(
      JSON.stringify({ 
        error: 'Invalid request',
        message: validationError instanceof Error ? validationError.message : 'Request validation failed'
      }), 
      { 
        status: 400,
        headers: { 
          'Content-Type': 'application/json',
          ...securityHeaders,
          ...CORS_HEADERS,
          'Access-Control-Allow-Origin': validOrigin,
        }
      }
    )
  }
}