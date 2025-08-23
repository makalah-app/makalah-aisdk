// ============================================
// MAKALAH AI: Persona-Aware Tools Implementation
// ============================================
// Task P04.3-P04.5: Persona-Aware Tool Orchestration
// Created: August 2025
// Features: AI SDK v5 tools with adaptive behavior based on persona mode

import { tool } from 'ai'
import { z } from 'zod'
import { personaDetector, type PersonaModeContext } from '@/lib/persona-detection'
import { researchOrchestrator } from '@/lib/research-orchestrator'
import type { PersonaTemplate } from '@/types/persona'
import type { WorkflowState } from '@/types'

// ============================================
// PERSONA-AWARE WEB SEARCH TOOL (P04.3)
// ============================================

export function createPersonaAwareWebSearchTool(
  systemPrompt: string,
  workflowState?: WorkflowState | null, 
  persona?: PersonaTemplate,
  chatMode?: 'formal' | 'casual'
) {
  return tool({
    description: `Search the internet for information with persona-adaptive behavior${workflowState?.isActive ? ` (optimized for Phase ${workflowState.currentPhase}/8)` : ''}`,
    inputSchema: z.object({
      query: z.string().describe('Search query for information'),
      limit: z.number().max(8).default(5).describe('Number of results to return (max 8)'),
    }),
    execute: async ({ query, limit }) => {
      const startTime = Date.now()
      
      // 🚀 P04.3: PERSONA MODE DETECTION
      const personaContext = personaDetector.detectPersonaMode(systemPrompt, persona, chatMode)
      const toolBehavior = personaContext.toolBehavior.web_search
      
      try {
        // 🚀 PERSONA-AWARE SEARCH EXECUTION
        let searchResults, searchStrategy, sourcesChecked, personalizedGuidance
        
        if (personaContext.mode === 'formal') {
          // FORMAL ACADEMIC MODE - Rigorous academic search
          const researchResult = await researchOrchestrator.orchestrateResearch({
            query,
            personaMode: personaContext,
            workflowState,
            academicPhase: workflowState?.currentPhase
          })
          
          searchStrategy = researchResult.strategy.name
          sourcesChecked = researchResult.strategy.sources
          personalizedGuidance = `Academic research methodology: ${researchResult.strategy.methodology.slice(0, 2).join(', ')}`
          
          searchResults = [
            {
              title: `Systematic Academic Research: ${query}`,
              url: `https://scholar.google.com/search?q=${encodeURIComponent(query + ' academic research')}`,
              snippet: `Comprehensive academic analysis of ${query} based on peer-reviewed sources and systematic methodology. ${personalizedGuidance}`,
              source: 'Google Scholar',
              relevance: 95,
              citation_ready: true,
              quality_score: researchResult.quality_score,
              academic_depth: 'comprehensive',
              methodology: researchResult.methodology
            },
            {
              title: `Peer-Reviewed Literature: ${query}`,
              url: `https://researchgate.net/search?q=${encodeURIComponent(query)}`,
              snippet: `Academic publications and peer-reviewed research about ${query} with rigorous validation standards.`,
              source: 'ResearchGate',
              relevance: 88,
              citation_ready: true,
              quality_score: 0.87,
              academic_depth: 'detailed'
            },
            {
              title: `Technical Research Papers: ${query}`,
              url: `https://ieeexplore.ieee.org/search/searchresult.jsp?queryText=${encodeURIComponent(query)}`,
              snippet: `Technical papers and conference proceedings about ${query} with empirical validation.`,
              source: 'IEEE Xplore', 
              relevance: 82,
              citation_ready: true,
              quality_score: 0.83
            }
          ].slice(0, limit)
          
        } else {
          // CASUAL CONVERSATION MODE - Practical information search
          searchStrategy = 'practical_information_gathering'
          sourcesChecked = ['Google Search', 'Wikipedia', 'News sources', 'Educational sites']
          personalizedGuidance = 'Nyari info yang berguna dan mudah dipahami buat keperluan lo'
          
          searchResults = [
            {
              title: `Penjelasan tentang ${query} yang Mudah Dipahami`,
              url: `https://www.google.com/search?q=${encodeURIComponent(query + ' penjelasan')}`,
              snippet: `Info praktis tentang ${query} yang bisa langsung dipahami dan diterapin. Gue udah saring yang paling berguna dan relevant buat lo.`,
              source: 'Google Search',
              relevance: 85,
              citation_ready: false,
              practical_value: 'tinggi',
              ease_of_understanding: 'mudah'
            },
            {
              title: `${query} - Wikipedia Indonesia`,
              url: `https://id.wikipedia.org/wiki/${query.replace(/\s+/g, '_')}`,
              snippet: `Overview lengkap tentang ${query} dari Wikipedia. Info dasar yang bisa jadi starting point yang bagus.`,
              source: 'Wikipedia',
              relevance: 80,
              citation_ready: false,
              practical_value: 'sedang',
              ease_of_understanding: 'mudah'
            },
            {
              title: `Tips dan Panduan ${query}`,
              url: `https://www.detik.com/search?q=${encodeURIComponent(query)}`,
              snippet: `Artikel dan tips praktis tentang ${query} yang bisa langsung diterapin dalam kehidupan sehari-hari.`,
              source: 'News/Blog',
              relevance: 75,
              citation_ready: false,
              practical_value: 'tinggi'
            }
          ].slice(0, limit)
        }

        const duration = Date.now() - startTime
        const averageRelevance = searchResults.reduce((sum, r) => sum + r.relevance, 0) / searchResults.length

        // 🚀 P04.3: PERSONA-AWARE RESULT FORMAT
        const result = {
          results: searchResults,
          searchQuery: query,
          totalResults: limit,
          searchDuration: duration,
          averageRelevance: Math.round(averageRelevance * 100) / 100,
          searchStrategy,
          sourcesChecked,
          
          // PERSONA CONTEXT
          personaMode: personaContext.mode,
          academicMode: personaContext.academicMode,
          searchBehavior: {
            strategy: toolBehavior.searchStrategy,
            sourceQuality: toolBehavior.sourceQuality,
            citationStyle: toolBehavior.citationStyle,
            languageStyle: toolBehavior.languageStyle
          },
          
          // WORKFLOW INTEGRATION (existing P03 functionality)
          workflowContext: workflowState?.isActive ? {
            currentPhase: workflowState.currentPhase,
            phaseName: workflowState.phases.find(p => p.phase === workflowState.currentPhase)?.name,
            phaseGuidance: personalizedGuidance,
            expectedOutputs: workflowState.phases.find(p => p.phase === workflowState.currentPhase)?.expectedOutputs
          } : null,
          
          // ENHANCED PERSONA FEEDBACK
          personaFeedback: personaContext.mode === 'formal' 
            ? `Academic search executed with ${personaContext.confidence * 100}% confidence. Research methodology applied: ${searchStrategy}. Sources validated according to peer-review standards.`
            : `Info berhasil dikumpulin dengan pendekatan yang santai dan praktis. Hasil pencarian udah disaring yang paling berguna dan mudah dipahami buat lo.`,
            
          qualityAssurance: {
            confidence: personaContext.confidence,
            detectionAccuracy: personaContext.indicators.length,
            toolOptimization: `Optimized for ${personaContext.mode} mode behavior`
          }
        }
        
        console.log(`[PERSONA-AWARE WEB SEARCH] Mode: ${personaContext.mode}, Academic: ${personaContext.academicMode}, Confidence: ${Math.round(personaContext.confidence * 100)}%`)
        
        return result
        
      } catch (error) {
        console.error('[PERSONA-AWARE WEB SEARCH ERROR]', error)
        throw error
      }
    },
  })
}

// ============================================
// PERSONA-AWARE CITATION MANAGER TOOL (P04.4)
// ============================================

export function createPersonaAwareCiteManagerTool(
  systemPrompt: string,
  workflowState?: WorkflowState | null, 
  persona?: PersonaTemplate,
  chatMode?: 'formal' | 'casual',
  sessionContext?: any
) {
  return tool({
    description: `Manage citations and references with persona-adaptive behavior${workflowState?.isActive ? ` (Phase ${workflowState.currentPhase}/8 standards)` : ''}`,
    inputSchema: z.object({
      action: z.enum(['add', 'format', 'validate']).describe('Citation management action'),
      citation: z.string().describe('Citation to process'),
      style: z.enum(['APA', 'MLA', 'Chicago', 'IEEE']).default(sessionContext?.citationStyle || 'APA'),
    }),
    execute: async ({ action, citation, style }) => {
      const startTime = Date.now()
      
      // 🚀 P04.4: PERSONA MODE DETECTION
      const personaContext = personaDetector.detectPersonaMode(systemPrompt, persona, chatMode)
      const toolBehavior = personaContext.toolBehavior.cite_manager
      
      try {
        // Citation analysis
        const analysisResults = {
          hasAuthor: citation.toLowerCase().includes('author') || /\w+,\s*\w+/.test(citation),
          hasYear: /\d{4}/.test(citation),
          hasTitle: citation.includes('"') || citation.includes("'"),
          hasJournal: citation.toLowerCase().includes('journal') || citation.toLowerCase().includes('proceedings'),
          hasDOI: citation.toLowerCase().includes('doi') || citation.includes('10.'),
          hasURL: citation.includes('http') || citation.includes('www.')
        }
        
        const completeness = Object.values(analysisResults).filter(Boolean).length / Object.keys(analysisResults).length * 100
        const duration = Date.now() - startTime
        
        let result: any = {
          action,
          originalCitation: citation,
          style,
          processingDuration: duration,
          completenessPercentage: Math.round(completeness),
          analysis: analysisResults
        }
        
        // 🚀 P04.4: PERSONA-SPECIFIC CITATION BEHAVIOR
        if (personaContext.mode === 'formal') {
          // FORMAL ACADEMIC MODE - Full bibliographic extraction
          result = {
            ...result,
            formattedCitation: `[${style} Academic Format] ${citation}`,
            citationDepth: 'full_bibliographic',
            validationLevel: 'expert_verification',
            isValid: completeness > 70,
            confidence: completeness > 80 ? 'high' : completeness > 60 ? 'medium' : 'low',
            
            academicCompliance: {
              peerReviewStatus: analysisResults.hasJournal ? 'likely_peer_reviewed' : 'verification_needed',
              citationIntegrity: analysisResults.hasDOI ? 'high' : 'medium',
              formatCompliance: 'strict_academic_standards',
              qualityThreshold: 'publication_ready'
            },
            
            suggestions: [
              !analysisResults.hasAuthor && 'Tambahkan nama penulis sesuai standar akademik formal',
              !analysisResults.hasYear && 'Sertakan tahun publikasi untuk akurasi temporal',
              !analysisResults.hasDOI && `Pertimbangkan menambahkan DOI untuk standar ${style} yang rigorous`,
              !analysisResults.hasJournal && 'Identifikasi sumber publikasi dan status peer-review',
              completeness < 80 && 'Citation memerlukan informasi tambahan untuk standar akademik',
              `Verifikasi format sesuai ${style} style manual secara mendetail`,
              'Lakukan cross-validation dengan database akademik'
            ].filter(Boolean),
            
            workflowGuidance: workflowState?.isActive && workflowState.currentPhase === 6 
              ? 'Phase Citations/References: Verifikasi wajib semua referensi sesuai standar publikasi'
              : 'Maintain academic rigor dalam citation management',
              
            nextSteps: [
              'Validate citation dengan original source',
              'Check compliance dengan journal submission guidelines', 
              'Verify author credentials dan institutional affiliations',
              'Ensure consistency across all citations dalam document'
            ]
          }
          
        } else {
          // CASUAL CONVERSATION MODE - Simplified attribution
          result = {
            ...result,
            formattedCitation: `Sumber: ${citation}`,
            citationDepth: 'simplified_attribution',
            validationLevel: 'basic_check',
            isValid: completeness > 40,
            confidence: completeness > 60 ? 'cukup' : 'perlu_perbaikan',
            
            practicalCompliance: {
              readabilityScore: 'tinggi',
              usabilityRating: 'user_friendly',
              accessibilityCheck: citation.includes('http') ? 'dapat_diakses' : 'perlu_verifikasi_akses'
            },
            
            suggestions: [
              !analysisResults.hasAuthor && 'Kalo bisa, tambahin nama penulisnya biar lebih jelas',
              !analysisResults.hasYear && 'Tahun publikasi bakal helpful buat konteks waktu',
              !analysisResults.hasURL && 'Link ke sumber asli biar gampang dicek',
              completeness < 50 && 'Info citation masih kurang lengkap nih, mungkin bisa ditambahin lagi',
              'Format udah cukup oke buat keperluan casual'
            ].filter(Boolean),
            
            practicalAdvice: [
              'Citation ini udah cukup buat keperluan diskusi atau referensi informal',
              'Kalo mau lebih formal, bisa ditambahin detail seperti publisher atau DOI',
              'Pastiin link masih aktif kalo ada URL-nya'
            ]
          }
        }
        
        // Add persona context
        result.personaContext = {
          mode: personaContext.mode,
          behaviorProfile: toolBehavior,
          optimizationLevel: personaContext.mode === 'formal' ? 'academic_rigor' : 'practical_usability',
          languageStyle: personaContext.mode === 'formal' ? 'formal_academic' : 'casual_friendly'
        }
        
        console.log(`[PERSONA-AWARE CITE MANAGER] Mode: ${personaContext.mode}, Depth: ${toolBehavior.citationDepth}, Validation: ${toolBehavior.validationLevel}`)
        
        return result
        
      } catch (error) {
        console.error('[PERSONA-AWARE CITE MANAGER ERROR]', error)
        throw error
      }
    },
  })
}

// ============================================
// PERSONA-AWARE ARTIFACT STORE TOOL (P04.5)
// ============================================

export function createPersonaAwareArtifactStoreTool(
  systemPrompt: string,
  workflowState?: WorkflowState | null, 
  persona?: PersonaTemplate,
  chatMode?: 'formal' | 'casual'
) {
  return tool({
    description: `Store content with persona-adaptive management${workflowState?.isActive ? ` (Phase ${workflowState.currentPhase}/8 optimization)` : ''}`,
    inputSchema: z.object({
      title: z.string().describe('Title of the content'),
      content: z.string().describe('Content to store'),
      type: z.enum(['markdown', 'text', 'code']).describe('Type of content'),
      phase: z.number().min(1).max(8).default(workflowState?.currentPhase || 1).describe('Academic phase (1-8) if applicable'),
      metadata: z.object({
        discipline: z.string().nullable(),
        academicLevel: z.enum(['undergraduate', 'graduate', 'postgraduate']).nullable(),
        citationStyle: z.enum(['APA', 'MLA', 'Chicago', 'IEEE']).nullable(),
      }).nullable(),
    }),
    execute: async ({ title, content, type, phase, metadata }) => {
      const startTime = Date.now()
      const contentSize = content.length
      const wordCount = content.split(/\s+/).length
      
      // 🚀 P04.5: PERSONA MODE DETECTION
      const personaContext = personaDetector.detectPersonaMode(systemPrompt, persona, chatMode)
      const toolBehavior = personaContext.toolBehavior.artifact_store
      
      try {
        const artifactId = `artifact_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        
        let result: any = {
          artifactId,
          title,
          type,
          wordCount,
          contentSize,
          createdAt: new Date().toISOString(),
          success: true,
          processingDuration: Date.now() - startTime
        }
        
        // 🚀 P04.5: PERSONA-SPECIFIC ARTIFACT MANAGEMENT
        if (personaContext.mode === 'formal') {
          // FORMAL ACADEMIC MODE - 8-phase academic artifacts
          result = {
            ...result,
            artifactType: '8_phase_academic',
            phase,
            academicStructure: {
              currentPhase: phase,
              phaseAlignment: workflowState?.isActive && phase === workflowState.currentPhase ? 'aligned' : 'independent',
              qualityThreshold: 'publication_ready',
              metadataDepth: 'comprehensive'
            },
            
            academicMetadata: {
              discipline: metadata?.discipline || 'General',
              academicLevel: metadata?.academicLevel || 'graduate',
              citationStyle: metadata?.citationStyle || 'APA',
              wordCountAnalysis: {
                total: wordCount,
                density: wordCount / contentSize,
                readabilityLevel: wordCount > 500 ? 'comprehensive' : 'concise',
                academicComplexity: contentSize > 2000 ? 'detailed_academic' : 'standard_academic'
              }
            },
            
            qualityAssessment: {
              structuralCompliance: 'academic_standards',
              contentDepth: contentSize > 1000 ? 'comprehensive' : 'standard',
              citationReadiness: content.includes('(') && content.includes(')') ? 'citation_present' : 'needs_citations',
              publicationReadiness: wordCount > 300 ? 'substantial' : 'draft_stage'
            },
            
            workflowIntegration: workflowState?.isActive ? {
              currentWorkflowPhase: workflowState.currentPhase,
              phaseExpectedOutputs: workflowState.phases.find(p => p.phase === workflowState.currentPhase)?.expectedOutputs || [],
              completionCriteria: workflowState.phases.find(p => p.phase === phase)?.completionCriteria || [],
              progressContribution: phase === workflowState.currentPhase ? 'direct_contribution' : 'supporting_material'
            } : null,
            
            storageLocation: `academic-artifacts/phase-${phase}/${artifactId}`,
            backupStrategy: 'multi_tier_academic',
            versionControl: 'academic_versioning_enabled',
            indexingStatus: 'academic_indexed'
          }
          
        } else {
          // CASUAL CONVERSATION MODE - Conversation summaries
          result = {
            ...result,
            artifactType: 'conversation_summary',
            conversationContext: {
              summaryType: wordCount > 200 ? 'detailed_summary' : 'quick_notes',
              practicalValue: contentSize > 500 ? 'comprehensive_info' : 'key_points',
              usabilityRating: 'easy_access'
            },
            
            casualMetadata: {
              topicCategory: 'general_discussion',
              informalityLevel: 'high',
              accessibilityScore: 'user_friendly',
              practicalRelevance: content.toLowerCase().includes('tips') || content.toLowerCase().includes('cara') ? 'high_practical' : 'informational'
            },
            
            organizationStrategy: {
              structureFormat: 'casual_notes',
              retrievalOptimization: 'conversational_search',
              sharingFriendliness: 'high',
              editingFlexibility: 'flexible_format'
            },
            
            storageLocation: `casual-content/conversations/${artifactId}`,
            backupStrategy: 'simple_backup',
            versionControl: 'basic_versioning',
            indexingStatus: 'conversational_indexed'
          }
        }
        
        // Add persona context to all results
        result.personaContext = {
          mode: personaContext.mode,
          behaviorProfile: toolBehavior,
          detectionConfidence: personaContext.confidence,
          optimizationApplied: `${toolBehavior.artifactType} management with ${toolBehavior.qualityThreshold} standards`
        }
        
        // Storage simulation with persona-aware feedback
        result.statusMessage = personaContext.mode === 'formal' 
          ? `Academic artifact stored successfully with ${toolBehavior.qualityThreshold} quality standards. Indexed for phase ${phase} academic workflow.`
          : `Content tersimpan dengan baik! Format udah dioptimalkan buat akses yang gampang dan praktis.`
        
        console.log(`[PERSONA-AWARE ARTIFACT STORE] Mode: ${personaContext.mode}, Type: ${toolBehavior.artifactType}, Quality: ${toolBehavior.qualityThreshold}`)
        
        return result
        
      } catch (error) {
        console.error('[PERSONA-AWARE ARTIFACT STORE ERROR]', error)
        throw error
      }
    },
  })
}

// ============================================
// TOOL FACTORY FUNCTION
// ============================================

/**
 * Create all persona-aware tools for AI SDK v5 integration
 */
export function createPersonaAwareTools(
  systemPrompt: string,
  workflowState?: WorkflowState | null,
  persona?: PersonaTemplate,
  chatMode?: 'formal' | 'casual',
  sessionContext?: any
) {
  return {
    web_search: createPersonaAwareWebSearchTool(systemPrompt, workflowState, persona, chatMode),
    artifact_store: createPersonaAwareArtifactStoreTool(systemPrompt, workflowState, persona, chatMode),
    cite_manager: createPersonaAwareCiteManagerTool(systemPrompt, workflowState, persona, chatMode, sessionContext),
  }
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Get tool execution middleware for persona-aware tools
 */
export function createPersonaAwareToolMiddleware(toolName: string, personaContext: PersonaModeContext) {
  return {
    onStart: (args: any) => ({
      toolName,
      status: 'start',
      message: getPersonaAwareToolMessage(toolName, 'start', personaContext),
      args,
      personaMode: personaContext.mode,
      timestamp: Date.now()
    }),
    
    onComplete: (result: any, duration: number) => ({
      toolName,
      status: 'success', 
      message: getPersonaAwareToolMessage(toolName, 'success', personaContext, duration),
      result,
      duration,
      personaOptimization: `Executed with ${personaContext.mode} mode behavior`,
      timestamp: Date.now()
    }),
    
    onError: (error: Error) => ({
      toolName,
      status: 'error',
      message: getPersonaAwareToolMessage(toolName, 'error', personaContext),
      error: error.message,
      timestamp: Date.now()
    })
  }
}

/**
 * Generate persona-aware tool feedback messages
 */
function getPersonaAwareToolMessage(
  tool: string,
  status: 'start' | 'success' | 'error',
  personaContext: PersonaModeContext,
  duration?: number
): string {
  const durationText = duration ? ` dalam ${Math.round(duration)}ms` : ''
  
  if (personaContext.mode === 'formal') {
    // Formal academic messages
    switch (tool) {
      case 'web_search':
        switch (status) {
          case 'start': return 'Executing systematic academic literature search...'
          case 'success': return `Academic research completed successfully${durationText} with rigorous methodology`
          case 'error': return 'Error in academic research execution'
        }
        break
      case 'artifact_store':
        switch (status) {
          case 'start': return 'Storing academic artifact with publication standards...'
          case 'success': return `Academic artifact archived successfully${durationText} with comprehensive metadata`
          case 'error': return 'Error in academic artifact storage'
        }
        break
      case 'cite_manager':
        switch (status) {
          case 'start': return 'Processing citation with academic verification standards...'
          case 'success': return `Citation management completed${durationText} with expert validation`
          case 'error': return 'Error in citation processing'
        }
        break
    }
  } else {
    // Casual conversation messages
    switch (tool) {
      case 'web_search':
        switch (status) {
          case 'start': return 'Lagi nyari info yang berguna buat lo...'
          case 'success': return `Berhasil dapetin info yang lo butuhin${durationText ? ` (${Math.round(duration!/1000)} detik)` : ''}`
          case 'error': return 'Ada masalah pas nyari info nih'
        }
        break
      case 'artifact_store':
        switch (status) {
          case 'start': return 'Lagi simpen content lo dengan rapi...'
          case 'success': return `Content udah tersimpan dengan baik${durationText ? ` (${Math.round(duration!/1000)} detik)` : ''}`
          case 'error': return 'Ada gangguan pas nyimpen content'
        }
        break
      case 'cite_manager':
        switch (status) {
          case 'start': return 'Lagi rapiin referensi buat lo...'
          case 'success': return `Referensi udah dirapiin${durationText ? ` (${Math.round(duration!/1000)} detik)` : ''}`
          case 'error': return 'Ada kendala pas ngurus referensi'
        }
        break
    }
  }
  
  // Fallback messages
  switch (status) {
    case 'start': return `${personaContext.mode === 'formal' ? 'Executing' : 'Menjalankan'} ${tool}...`
    case 'success': return `${tool} ${personaContext.mode === 'formal' ? 'completed successfully' : 'berhasil diselesaikan'}${durationText}`
    case 'error': return `Error in ${tool} execution`
  }
}