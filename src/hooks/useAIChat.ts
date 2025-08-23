import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'
import { useChatStore } from '@/store/chat'
import { useState, useEffect, useCallback } from 'react'
import type { MakalahUIMessage, StreamingPhase } from '@/types'

const generateId = () => `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

// 🚀 ENHANCED: Tool utilities untuk Indonesian feedback dan duration estimation
function getExpectedToolDuration(toolName: string): number {
  const durations: Record<string, number> = {
    'web_search': 2000,      // 2 seconds
    'artifact_store': 1500,  // 1.5 seconds
    'cite_manager': 1800,    // 1.8 seconds
    'file_handler': 2500,    // 2.5 seconds
  }
  return durations[toolName] || 2000
}

function getIndonesianToolName(toolName: string): string {
  const names: Record<string, string> = {
    'web_search': 'pencarian referensi akademik',
    'artifact_store': 'penyimpanan artefak',
    'cite_manager': 'pengelolaan sitasi',
    'file_handler': 'pemrosesan dokumen'
  }
  return names[toolName] || toolName
}

function getProgressiveToolMessage(toolName: string, progress: number): string {
  const progressPercent = Math.round(progress)
  
  switch (toolName) {
    case 'web_search':
      if (progress < 30) return `Mencari sumber akademik... ${progressPercent}%`
      if (progress < 70) return `Memverifikasi kredibilitas sumber... ${progressPercent}%`
      return `Menyelesaikan pencarian... ${progressPercent}%`
      
    case 'artifact_store':
      if (progress < 30) return `Menyiapkan dokumen... ${progressPercent}%`
      if (progress < 70) return `Menyimpan ke database... ${progressPercent}%`
      return `Finalisasi penyimpanan... ${progressPercent}%`
      
    case 'cite_manager':
      if (progress < 30) return `Memproses format sitasi... ${progressPercent}%`
      if (progress < 70) return `Memvalidasi referensi... ${progressPercent}%`
      return `Menyelesaikan manajemen sitasi... ${progressPercent}%`
      
    default:
      if (progress < 50) return `Memproses ${getIndonesianToolName(toolName)}... ${progressPercent}%`
      return `Menyelesaikan ${getIndonesianToolName(toolName)}... ${progressPercent}%`
  }
}

function getMostUsedTool(history: any[]): string {
  const toolCounts: Record<string, number> = {}
  
  history.forEach(entry => {
    toolCounts[entry.tool] = (toolCounts[entry.tool] || 0) + 1
  })
  
  const mostUsed = Object.entries(toolCounts)
    .sort(([,a], [,b]) => b - a)[0]
    
  return mostUsed ? getIndonesianToolName(mostUsed[0]) : 'Belum ada'
}

export function useAIChat(sessionId: string | null) {
  const { 
    sessions, 
    addMessage, 
    setLoadingState, 
    addArtifact,
    updateSession,
    streamingState,
    updateStreamingPhase,
    addToolExecution,
    completeToolExecution,
    startTextStreaming,
    appendStreamingText,
    completeTextStreaming,
    resetStreamingState,
    getIndonesianPhaseMessage,
    currentPersona,
    currentProject,
    updatePersonaUsage,
    // 🚀 CHAT MODE STATE - P01 PERSONA REVISION
    chatModeState,
    getChatModeForSession,
    // 🚀 P03: WORKFLOW ENGINE STATE
    workflowState,
    initializeWorkflow,
    startWorkflowPhase,
    completeWorkflowPhase,
    getCurrentWorkflowPhase,
    getNextRequiredTools,
    isWorkflowActive,
    shouldTriggerWorkflow
  } = useChatStore()
  
  const [input, setInput] = useState('')
  const [currentPhase, setCurrentPhase] = useState<StreamingPhase>('idle')
  const [progressData, setProgressData] = useState<{
    tool: string
    status: 'initializing' | 'start' | 'progress' | 'success' | 'error'
    message: string
    progress: number
    startTime?: number
    duration?: number
    elapsed?: number
    result?: any
    args?: any
    success?: boolean
  } | null>(null)
  const currentSession = sessionId ? sessions.find(s => s.id === sessionId) : null
  
  // 🚀 CHAT MODE CONTEXT - P01 PERSONA REVISION
  const sessionChatMode = sessionId ? getChatModeForSession(sessionId) : null
  const effectiveChatMode = sessionChatMode || chatModeState.currentMode
  
  // 🚀 P02: DYNAMIC SYSTEM PROMPT STATE
  const [systemPromptBehavior, setSystemPromptBehavior] = useState<{
    mode: 'formal' | 'casual' | null
    personaId: string | null
    lastUpdated: number
  }>({
    mode: effectiveChatMode,
    personaId: currentPersona?.id || null,
    lastUpdated: Date.now()
  })

  // 🚀 P02: DYNAMIC SYSTEM PROMPT UPDATE EFFECT
  useEffect(() => {
    const newMode = effectiveChatMode
    const newPersonaId = currentPersona?.id || null
    
    // Check if system prompt needs to be updated
    if (newMode !== systemPromptBehavior.mode || newPersonaId !== systemPromptBehavior.personaId) {
      setSystemPromptBehavior({
        mode: newMode,
        personaId: newPersonaId,
        lastUpdated: Date.now()
      })
      
      console.log(`[P02 SYSTEM PROMPT UPDATE] Mode: ${newMode}, Persona: ${newPersonaId}`)
    }
  }, [effectiveChatMode, currentPersona?.id, systemPromptBehavior.mode, systemPromptBehavior.personaId])

  const {
    messages,
    sendMessage,
    status,
    error,
    stop,
  } = useChat<MakalahUIMessage>({
    transport: new DefaultChatTransport({
      api: '/api/chat',
      // 🚀 P03: ENHANCED REQUEST TRANSFORMATION WITH WORKFLOW INTEGRATION
      body: () => ({
        // Include persona information in every request
        persona: currentPersona ? {
          persona_id: currentPersona.id,
          mode: currentPersona.mode,
          configuration: currentPersona.configuration
        } : null,
        
        // 🚀 P02: DYNAMIC CHAT MODE CONTEXT
        chat_mode: systemPromptBehavior.mode,
        
        // 🚀 P03: WORKFLOW STATE CONTEXT
        workflow_state: workflowState && workflowState.sessionId === sessionId ? workflowState : null,
        
        // Include session context for dynamic system prompt generation
        session_context: {
          academicLevel: currentProject?.academicLevel,
          discipline: currentProject?.discipline,
          citationStyle: currentProject?.citationStyle,
          academicPhase: currentProject?.currentPhase,
          chatMode: systemPromptBehavior.mode,
          sessionId: sessionId,
          isProject: currentSession?.isProject || false,
          // 🚀 P02: System prompt versioning for real-time updates
          systemPromptVersion: systemPromptBehavior.lastUpdated,
          // 🚀 P03: Workflow integration context
          workflowActive: workflowState?.isActive || false,
          currentWorkflowPhase: workflowState?.currentPhase || null,
          workflowType: workflowState?.type || null
        }
      })
    }),
    
    // 🚀 ENHANCED DATA HANDLING: Integrated with new streaming state management
    onData: (dataPart) => {
      console.log('[ENHANCED STREAMING] Received data part:', dataPart)
      
      // Handle transient progress status updates
      if (dataPart.type === 'data-progress-status') {
        const { phase, message, progress, timestamp } = dataPart.data
        
        setCurrentPhase(phase)
        updateStreamingPhase(phase, message || getIndonesianPhaseMessage(phase))
        
        console.log(`[PHASE TRANSITION] ${phase}: ${message}`)
      }
      
      // 🚀 ENHANCED: Tool feedback updates dengan comprehensive timeline tracking
      if (dataPart.type === 'data-tool-feedback') {
        const { tool, status: toolStatus, message, duration, args, result, progress } = dataPart.data
        
        console.log(`[ENHANCED TOOL FEEDBACK] ${tool} ${toolStatus}: ${message}${duration ? ` (${duration}ms)` : ''}${progress ? ` [${progress}%]` : ''}`)
        
        // Enhanced tool execution tracking dengan detailed progress
        if (toolStatus === 'start') {
          setCurrentPhase('tool-execution')
          updateStreamingPhase('tool-execution', getIndonesianPhaseMessage('tool-execution', tool))
          addToolExecution(tool, message)
          
          // Set progress data untuk UI feedback
          setProgressData({
            tool,
            status: toolStatus,
            message,
            progress: 0,
            startTime: Date.now()
          })
          
        } else if (toolStatus === 'progress') {
          // Update progress tracking untuk real-time feedback
          setProgressData(prev => prev ? ({
            ...prev,
            progress: progress || 50,
            message,
            elapsed: Date.now() - (prev.startTime || Date.now())
          }) : null)
          
        } else if (toolStatus === 'success' || toolStatus === 'error') {
          completeToolExecution(tool, toolStatus)
          
          // Final progress update
          setProgressData({
            tool,
            status: toolStatus,
            message,
            progress: 100,
            duration,
            result,
            success: toolStatus === 'success'
          })
          
          // Auto-clear progress after success
          if (toolStatus === 'success') {
            setTimeout(() => {
              setProgressData(null)
              if (currentPhase === 'tool-execution') {
                setCurrentPhase('processing')
                updateStreamingPhase('processing', 'Agent melanjutkan pemrosesan...')
              }
            }, 2000) // Show success for 2 seconds
          }
        }
      }
      
      // Handle text streaming metadata
      if (dataPart.type === 'data-text-streaming') {
        const { status: streamStatus, chunk, totalChars, duration, position } = dataPart.data
        
        if (streamStatus === 'start') {
          setCurrentPhase('text-streaming')
          updateStreamingPhase('text-streaming')
          
          // Generate message ID for streaming tracking
          const messageId = generateId()
          startTextStreaming(messageId, totalChars)
          
        } else if (streamStatus === 'chunk' && chunk) {
          // Append streaming text to buffer
          appendStreamingText(chunk)
          
        } else if (streamStatus === 'end') {
          setCurrentPhase('idle')
          updateStreamingPhase('idle')
          completeTextStreaming()
          console.log(`[TEXT STREAMING COMPLETE] ${totalChars} chars in ${duration}ms`)
        }
      }

      // 🚀 P03.2: WORKFLOW PROGRESS DATA HANDLING
      if (dataPart.type === 'data-workflow-progress') {
        const { currentPhase, totalPhases, phaseName, completion, nextPhaseAvailable } = dataPart.data
        
        console.log(`[P03 WORKFLOW PROGRESS] Phase ${currentPhase}/${totalPhases} - ${phaseName} (${completion}% complete)`)
        
        // Update UI with workflow progress
        updateStreamingPhase('processing', `Fase ${currentPhase}/8: ${phaseName} - ${completion}% complete`)
      }
      
      // Handle phase transition data
      if (dataPart.type === 'data-phase-transition') {
        const { eventType } = dataPart.data
        const duration = 'duration' in dataPart.data ? dataPart.data.duration : undefined
        console.log(`[PHASE TRANSITION] ${eventType}${duration ? ` completed in ${duration}ms` : ''}`)
      }
    },

    onFinish: ({ message }) => {
      if (sessionId) {
        // Store assistant message in Zustand
        const messageContent = message.parts
          .filter((part: any) => part.type === 'text')
          .map((part: any) => part.text)
          .join('')
          
        addMessage(sessionId, {
          role: 'assistant',
          content: messageContent,
          artifacts: [],
          parts: message.parts,
        })
        
        // 🚀 PERSONA USAGE TRACKING
        if (currentPersona) {
          const responseTime = Date.now() - (streamingState.phaseStartTime || Date.now())
          const qualityScore = messageContent.length > 100 ? 4.5 : 3.5 // Simple quality estimation
          updatePersonaUsage(currentPersona.id, responseTime, qualityScore)
          
          console.log(`[PERSONA TRACKING] ${currentPersona.name} used - Response: ${responseTime}ms, Quality: ${qualityScore}/5`)
        }
        
        // Update session metadata
        updateSession(sessionId, {
          metadata: {
            ...currentSession?.metadata,
            totalTokens: (currentSession?.metadata?.totalTokens || 0) + 1,
            lastPersonaUsed: currentPersona?.name,
            lastPersonaMode: currentPersona?.mode,
          }
        })
        
        // Reset to idle state with enhanced streaming
        setCurrentPhase('idle')
        updateStreamingPhase('idle')
        resetStreamingState()
      }
    },

    // 🚀 ENHANCED: Modern onToolCall dengan real-time feedback dan timeline integration
    onToolCall: ({ toolCall }: any) => {
      const toolName = toolCall.toolName
      const startTime = Date.now()
      
      console.log('[ENHANCED TOOL CALL]', {
        toolName,
        args: toolCall.args,
        timestamp: new Date().toISOString(),
        sessionId,
        expectedDuration: getExpectedToolDuration(toolName)
      })
      
      // Update UI state untuk tool execution
      setCurrentPhase('tool-execution')
      updateStreamingPhase('tool-execution', getIndonesianPhaseMessage('tool-execution', toolName))
      
      // Enhanced tool execution tracking
      addToolExecution(toolName, `Memulai ${getIndonesianToolName(toolName)}...`)
      
      // Set initial progress data
      setProgressData({
        tool: toolName,
        status: 'initializing',
        message: `Menyiapkan ${getIndonesianToolName(toolName)}...`,
        progress: 5,
        startTime,
        args: toolCall.args
      })
      
      // Start progress simulation untuk better UX (akan di-override oleh actual feedback)
      let progressInterval: NodeJS.Timeout | null = null
      let currentProgress = 5
      
      progressInterval = setInterval(() => {
        if (currentProgress < 90) {
          currentProgress += Math.random() * 15 // Random progress increase
          setProgressData(prev => prev && prev.tool === toolName ? ({
            ...prev,
            progress: Math.min(90, currentProgress),
            message: getProgressiveToolMessage(toolName, currentProgress),
            elapsed: Date.now() - startTime
          }) : prev)
        } else {
          if (progressInterval) clearInterval(progressInterval)
        }
      }, 500) // Update setiap 500ms
      
      // Store interval untuk cleanup
      if (sessionId) {
        // Store interval reference untuk cleanup nanti
        (window as any).__toolProgressIntervals = {
          ...(window as any).__toolProgressIntervals,
          [toolName]: progressInterval
        }
      }
    },

    onError: (error) => {
      console.error('[ENHANCED STREAMING ERROR]', {
        name: error.name,
        message: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      })
      
      setCurrentPhase('idle')
      updateStreamingPhase('idle')
      resetStreamingState()
    }
  })

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value)
  }, [])

  // Custom submit handler with P03 workflow integration
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!sessionId || !input.trim() || status !== 'ready') return

    const userQuery = input.trim()
    const isFirstMessage = currentSession?.messages.length === 0

    // 🚀 P03.1: MODE-AWARE WORKFLOW INITIATION LOGIC
    if (effectiveChatMode && !workflowState && isFirstMessage) {
      const triggerDetection = await import('@/lib/workflow-engine').then(module => 
        module.detectWorkflowTrigger(effectiveChatMode, userQuery, isFirstMessage)
      )
      
      if (triggerDetection.shouldTrigger) {
        console.log(`[P03 WORKFLOW TRIGGER] ${triggerDetection.reasoning}`)
        
        try {
          await initializeWorkflow(triggerDetection.workflowType, sessionId, effectiveChatMode)
          
          if (triggerDetection.workflowType === 'academic-8-phase') {
            await startWorkflowPhase(1) // Start Phase 1: Topic Definition
            
            // Show workflow initiation message
            updateStreamingPhase('processing', 'Memulai workflow akademik 8-fase...')
          }
        } catch (error) {
          console.error('[P03 WORKFLOW ERROR] Failed to initialize workflow:', error)
        }
      }
    }

    // Store user message in Zustand before sending
    addMessage(sessionId, {
      role: 'user',
      content: userQuery,
      parts: [{ type: 'text', text: userQuery }],
    })
    
    // Send to AI with workflow context
    sendMessage({ text: userQuery })
    setInput('')
  }, [
    sessionId, input, status, addMessage, sendMessage, effectiveChatMode, 
    workflowState, currentSession, initializeWorkflow, startWorkflowPhase, updateStreamingPhase
  ])

  // 🚀 NEW: Cleanup effect untuk tool execution intervals
  useEffect(() => {
    return () => {
      // Cleanup all active tool progress intervals
      const intervals = (window as any).__toolProgressIntervals
      if (intervals) {
        Object.values(intervals).forEach((interval: any) => {
          if (interval) clearInterval(interval)
        })
        ;(window as any).__toolProgressIntervals = {}
      }
    }
  }, [sessionId])

  // Sync loading state with status
  useEffect(() => {
    const isLoading = status === 'streaming'
    
    if (!isLoading) {
      setLoadingState({
        isLoading: false,
        type: 'thinking',
        message: ''
      })
    }
  }, [status, setLoadingState])

  const reload = () => {
    // Implement reload functionality if needed
    console.log('Reload requested')
  }

  return {
    messages: messages, // Use streaming messages from useChat, not store
    input,
    handleInputChange,
    handleSubmit,
    isLoading: status === 'streaming',
    error,
    reload,
    stop,
    currentSession,
    status,
    
    // 🚀 ENHANCED STREAMING DATA
    currentPhase,
    progressData,
    streamingPhase: currentPhase,
    streamingState, // Full streaming state from store
    isInPhase: (phase: StreamingPhase) => currentPhase === phase,
    
    // 🚀 CHAT MODE CONTEXT - P01 PERSONA REVISION
    sessionChatMode,
    effectiveChatMode,
    isModeSet: effectiveChatMode !== null,
    
    // 🚀 P02: DYNAMIC SYSTEM PROMPT BEHAVIOR
    systemPromptBehavior,
    isSystemPromptUpdated: systemPromptBehavior.lastUpdated > Date.now() - 5000, // Updated in last 5 seconds
    systemPromptMode: systemPromptBehavior.mode,
    systemPromptPersonaId: systemPromptBehavior.personaId,
    
    // 🚀 STREAMING CONTROL ACTIONS
    pauseStreaming: () => updateStreamingPhase('idle'),
    resumeStreaming: () => updateStreamingPhase(currentPhase),
    skipToEnd: () => {
      completeTextStreaming()
      updateStreamingPhase('idle')
    },
    
    // 🚀 ENHANCED STREAMING STATE UTILITIES
    getToolExecutionHistory: () => streamingState.toolExecutionHistory,
    getCurrentStreamingProgress: () => ({
      totalChars: streamingState.totalCharacters,
      streamedChars: streamingState.streamedCharacters,
      progress: streamingState.totalCharacters > 0 
        ? (streamingState.streamedCharacters / streamingState.totalCharacters) * 100 
        : 0
    }),
    
    // 🚀 NEW: Enhanced tool timeline utilities
    getActiveToolExecution: () => progressData,
    getToolExecutionTimeline: () => {
      const history = streamingState.toolExecutionHistory
      return history.map(entry => ({
        ...entry,
        indonesianName: getIndonesianToolName(entry.tool),
        durationDisplay: entry.duration ? `${Math.round(entry.duration)}ms` : 'Running...'
      }))
    },
    
    // Tool execution control utilities
    cancelToolExecution: (toolName: string) => {
      const intervals = (window as any).__toolProgressIntervals
      if (intervals && intervals[toolName]) {
        clearInterval(intervals[toolName])
        delete intervals[toolName]
      }
      
      setProgressData(prev => prev?.tool === toolName ? null : prev)
      console.log(`[TOOL CANCELLED] ${toolName} execution cancelled`)
    },
    
    // Performance monitoring utilities
    getToolPerformanceMetrics: () => ({
      averageToolDuration: Object.values(streamingState.toolExecutionHistory)
        .filter(entry => entry.duration)
        .reduce((sum, entry, _, arr) => sum + (entry.duration || 0) / arr.length, 0),
      toolSuccessRate: Object.values(streamingState.toolExecutionHistory)
        .filter(entry => entry.status === 'success').length / 
        Math.max(1, streamingState.toolExecutionHistory.length) * 100,
      mostUsedTool: getMostUsedTool(streamingState.toolExecutionHistory)
    }),

    // 🚀 P03: WORKFLOW ENGINE INTEGRATION
    workflowState,
    currentWorkflowPhase: getCurrentWorkflowPhase(),
    requiredTools: getNextRequiredTools(),
    isWorkflowActive: isWorkflowActive(),
    workflowCompletion: workflowState ? Math.round((workflowState.completedPhases.length / workflowState.maxPhases) * 100) : 0,
    
    // Workflow actions
    completeCurrentPhase: async (artifacts?: string[], quality?: number) => {
      if (workflowState) {
        await completeWorkflowPhase(workflowState.currentPhase, artifacts, quality)
      }
    },
  }
}