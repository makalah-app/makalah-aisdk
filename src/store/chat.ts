import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { ChatStore, ChatSession, ChatMessage, Project, ArtifactAttachment, LoadingState, StreamingPhase, StreamingState, PersonaSwitchEvent, ChatMode, ChatModeState, ChatModeSelection, WorkflowState, WorkflowType, AcademicWorkflowConfig } from '@/types'
import type { PersonaTemplate, PersonaMode } from '@/types/persona'
import { personaService } from '@/lib/persona-service'
import WorkflowPersonaService from '@/lib/persona-workflow-service'
import { AVAILABLE_MODES } from '@/components/JenisChatSelector'
import { WorkflowEngine, ACADEMIC_WORKFLOW_CONFIG, detectWorkflowTrigger } from '@/lib/workflow-engine'

const generateId = () => `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

const generateTitle = (content: string): string => {
  const words = content.split(' ').slice(0, 6).join(' ')
  return words.length > 30 ? words.substring(0, 30) + '...' : words
}

export const useChatStore = create<ChatStore>()(
  persist(
    (set, get) => ({
      sessions: [],
      currentSessionId: null,
      projects: [],
      currentProject: null,
      artifacts: [],
      loadingState: {
        isLoading: false,
        type: 'thinking',
        message: ''
      },

      // 🚀 ENHANCED STREAMING STATE MANAGEMENT
      streamingState: {
        currentPhase: 'idle' as StreamingPhase,
        phaseStartTime: null as number | null,
        phaseDuration: 0,
        toolExecutionHistory: [] as Array<{
          tool: string;
          startTime: number;
          endTime?: number;
          duration?: number;
          status: 'running' | 'success' | 'error';
          message: string;
        }>,
        textStreamingBuffer: '',
        currentlyStreamingMessageId: null as string | null,
        streamingSpeed: 'normal' as 'fast' | 'normal' | 'slow',
        isPaused: false,
        totalCharacters: 0,
        streamedCharacters: 0
      },

      // 🚀 PERSONA SYSTEM STATE
      currentPersona: null as PersonaTemplate | null,
      availablePersonas: [] as PersonaTemplate[],
      personaSwitchHistory: [] as PersonaSwitchEvent[],
      isPersonaLoading: false,

      // 🚀 P02: ENHANCED CHAT MODE STATE WITH PERSONA INTEGRATION
      chatModeState: {
        currentMode: 'formal',
        lastUsedMode: null,
        modeHistory: [],
        modeSeparatedHistory: {
          formal: [],
          casual: []
        },
        // 🚀 P02: Persona behavior integration
        sessionPersonaMapping: {} as Record<string, string>, // sessionId -> personaId
        modeDefaultPersonas: {} as Record<'formal' | 'casual', string>, // mode -> default personaId
        isPersonaAutoSwitchEnabled: true,
        lastPersonaSwitchTime: null as number | null,
      } as ChatModeState,
      availableModes: AVAILABLE_MODES,

      // 🚀 P03: WORKFLOW ENGINE STATE
      workflowState: null as WorkflowState | null,
      academicWorkflowConfig: ACADEMIC_WORKFLOW_CONFIG,
      workflowHistory: [] as Array<{
        sessionId: string
        workflowType: WorkflowType
        startedAt: number
        completedAt?: number
        finalPhase: number
        success: boolean
      }>,

      addMessage: (sessionId, message) => {
        const id = generateId()
        const newMessage: ChatMessage = {
          ...message,
          id,
          createdAt: new Date(),
        }

        set((state) => ({
          sessions: state.sessions.map((session) =>
            session.id === sessionId
              ? {
                  ...session,
                  messages: [...session.messages, newMessage],
                  updatedAt: new Date(),
                  // Auto-generate title from first user message
                  title: session.messages.length === 0 && message.role === 'user' 
                    ? generateTitle(message.content)
                    : session.title
                }
              : session
          ),
        }))
      },

      createSession: (isProject = false, projectId, chatMode?: ChatMode) => {
        const id = generateId()
        const state = get()
        const currentMode = chatMode || state.chatModeState.currentMode || undefined
        
        const newSession: ChatSession = {
          id,
          title: 'Percakapan Baru',
          messages: [],
          createdAt: new Date(),
          updatedAt: new Date(),
          isProject,
          projectId,
          metadata: {
            chatMode: currentMode || undefined,
            totalTokens: 0,
          }
        }

        set((prevState) => ({
          sessions: [newSession, ...prevState.sessions],
          currentSessionId: id,
          // Update mode-separated history
          chatModeState: currentMode ? {
            ...prevState.chatModeState,
            modeSeparatedHistory: {
              ...prevState.chatModeState.modeSeparatedHistory,
              [currentMode]: [id, ...prevState.chatModeState.modeSeparatedHistory[currentMode]]
            }
          } : prevState.chatModeState
        }))

        // Add to mode history if mode is set
        if (currentMode) {
          get().addToModeHistory(currentMode, id)
        }

        return id
      },

      updateSession: (sessionId, updates) => {
        set((state) => ({
          sessions: state.sessions.map((session) =>
            session.id === sessionId
              ? { ...session, ...updates, updatedAt: new Date() }
              : session
          ),
        }))
      },

      deleteSession: (sessionId) => {
        set((state) => ({
          sessions: state.sessions.filter((session) => session.id !== sessionId),
          currentSessionId: state.currentSessionId === sessionId ? null : state.currentSessionId,
        }))
      },

      setCurrentSession: (sessionId) => {
        set({ currentSessionId: sessionId })
      },

      addArtifact: (artifactData) => {
        const id = generateId()
        const newArtifact: ArtifactAttachment = {
          ...artifactData,
          id,
          createdAt: new Date(),
          wordCount: artifactData.content.split(/\s+/).length,
        }

        set((state) => ({
          artifacts: [newArtifact, ...state.artifacts],
        }))
      },

      updateArtifact: (artifactId, updates) => {
        set((state) => ({
          artifacts: state.artifacts.map((artifact) =>
            artifact.id === artifactId ? { ...artifact, ...updates } : artifact
          ),
        }))
      },

      setLoadingState: (loadingState) => {
        set({ loadingState })
      },

      // 🚀 ENHANCED STREAMING STATE ACTIONS
      updateStreamingPhase: (phase, message = '') => {
        const now = Date.now()
        set((state) => {
          const previousPhase = state.streamingState.currentPhase
          const phaseDuration = state.streamingState.phaseStartTime 
            ? now - state.streamingState.phaseStartTime 
            : 0
            
          return {
            streamingState: {
              ...state.streamingState,
              currentPhase: phase,
              phaseStartTime: phase !== 'idle' ? now : null,
              phaseDuration: phase !== 'idle' ? 0 : phaseDuration
            },
            loadingState: {
              ...state.loadingState,
              isLoading: phase !== 'idle',
              phase: phase,
              message: message || get().getIndonesianPhaseMessage(phase),
              startTime: phase !== 'idle' ? now : undefined
            }
          }
        })
      },

      addToolExecution: (tool, message) => {
        const now = Date.now()
        set((state) => ({
          streamingState: {
            ...state.streamingState,
            toolExecutionHistory: [
              ...state.streamingState.toolExecutionHistory,
              {
                tool,
                startTime: now,
                status: 'running' as const,
                message
              }
            ]
          }
        }))
      },

      completeToolExecution: (tool, status = 'success') => {
        const now = Date.now()
        set((state) => ({
          streamingState: {
            ...state.streamingState,
            toolExecutionHistory: state.streamingState.toolExecutionHistory.map(execution => 
              execution.tool === tool && !execution.endTime
                ? {
                    ...execution,
                    endTime: now,
                    duration: now - execution.startTime,
                    status
                  }
                : execution
            )
          }
        }))
      },

      startTextStreaming: (messageId, totalChars = 0) => {
        set((state) => ({
          streamingState: {
            ...state.streamingState,
            currentlyStreamingMessageId: messageId,
            textStreamingBuffer: '',
            totalCharacters: totalChars,
            streamedCharacters: 0,
            isPaused: false
          }
        }))
      },

      appendStreamingText: (chunk) => {
        set((state) => ({
          streamingState: {
            ...state.streamingState,
            textStreamingBuffer: state.streamingState.textStreamingBuffer + chunk,
            streamedCharacters: state.streamingState.streamedCharacters + chunk.length
          }
        }))
      },

      pauseTextStreaming: () => {
        set((state) => ({
          streamingState: {
            ...state.streamingState,
            isPaused: true
          }
        }))
      },

      resumeTextStreaming: () => {
        set((state) => ({
          streamingState: {
            ...state.streamingState,
            isPaused: false
          }
        }))
      },

      completeTextStreaming: () => {
        set((state) => ({
          streamingState: {
            ...state.streamingState,
            currentlyStreamingMessageId: null,
            textStreamingBuffer: '',
            isPaused: false
          }
        }))
      },

      setStreamingSpeed: (speed) => {
        set((state) => ({
          streamingState: {
            ...state.streamingState,
            streamingSpeed: speed
          }
        }))
      },

      resetStreamingState: () => {
        set((state) => ({
          streamingState: {
            currentPhase: 'idle',
            phaseStartTime: null,
            phaseDuration: 0,
            toolExecutionHistory: [],
            textStreamingBuffer: '',
            currentlyStreamingMessageId: null,
            streamingSpeed: 'normal',
            isPaused: false,
            totalCharacters: 0,
            streamedCharacters: 0
          }
        }))
      },

      // 🇮🇩 INDONESIAN NATURAL LANGUAGE MESSAGE FACTORY
      getIndonesianPhaseMessage: (phase, toolName?) => {
        const variations = {
          thinking: [
            'Agent sedang berpikir...',
            'Agent memproses permintaan lo...',
            'Agent sedang menganalisis...',
            'Agent merencanakan respons...'
          ],
          browsing: [
            'Agent menjelajah internet...',
            'Agent mencari informasi terbaru...',
            'Agent sedang riset online...',
            'Agent mengakses sumber data...'
          ],
          'tool-execution': [
            toolName ? `Agent menggunakan ${toolName}...` : 'Agent menggunakan tool...',
            toolName ? `Agent menjalankan ${toolName}...` : 'Agent menjalankan tool...',
            'Agent memproses dengan tool khusus...',
            'Agent mengeksekusi fungsi...'
          ],
          'text-streaming': [
            'Agent menulis respons...',
            'Agent menyusun jawaban...',
            'Agent sedang mengetik...',
            'Agent merangkai kata-kata...'
          ],
          processing: [
            'Agent memproses data...',
            'Agent sedang komputasi...',
            'Agent mengolah informasi...',
            'Agent melakukan kalkulasi...'
          ],
          idle: [
            'Agent siap melayani...',
            'Agent menunggu instruksi...',
            'Agent standby...'
          ],
          reconnecting: [
            'Agent mencoba reconnect...',
            'Agent memulihkan koneksi...',
            'Agent menyambungkan kembali...'
          ],
          waiting: [
            'Agent menunggu...',
            'Agent standby sebentar...',
            'Agent menahan diri...'
          ]
        }
        
        const messages = variations[phase] || variations.thinking
        return messages[Math.floor(Math.random() * messages.length)]
      },

      // 🚀 PERSONA SYSTEM ACTIONS
      setCurrentPersona: (persona) => {
        set({ currentPersona: persona })
      },

      switchPersona: async (personaId, sessionId, reason = 'manual') => {
        const state = get()
        const targetPersona = state.availablePersonas.find(p => p.id === personaId)
        
        if (!targetPersona) {
          throw new Error(`Persona with id ${personaId} not found`)
        }

        const switchStartTime = Date.now()
        
        try {
          // Add switch event to history
          const switchEvent: Omit<PersonaSwitchEvent, 'id' | 'timestamp'> = {
            fromPersona: state.currentPersona,
            toPersona: targetPersona,
            sessionId,
            academicPhase: state.currentProject?.currentPhase || null,
            reason,
            switchTime: 0, // Will be updated after completion
            context: {
              previousMode: state.currentPersona?.mode,
              newMode: targetPersona.mode,
              switchStartTime
            }
          }

          // Update current persona immediately for UI responsiveness
          set({ currentPersona: targetPersona })
          
          // In real implementation, this would call API to update session assignment
          // For now, we simulate the API call
          await new Promise(resolve => setTimeout(resolve, 50)) // Sub-100ms target
          
          const switchTime = Date.now() - switchStartTime
          
          // Add completed switch event to history
          get().addPersonaSwitchEvent({
            ...switchEvent,
            switchTime
          })
          
          // Update persona usage statistics
          get().updatePersonaUsage(personaId, switchTime)
          
          console.log(`[PERSONA SWITCH] ${state.currentPersona?.name || 'None'} -> ${targetPersona.name} in ${switchTime}ms`)
          
        } catch (error) {
          // Rollback on error
          set({ currentPersona: state.currentPersona })
          throw error
        }
      },

      loadAvailablePersonas: async (mode, disciplineId) => {
        try {
          set({ isPersonaLoading: true })
          const response = await personaService.getPersonas(mode, disciplineId, true)
          
          set({ 
            availablePersonas: response.personas,
            isPersonaLoading: false
          })
          
        } catch (error) {
          set({ isPersonaLoading: false })
          console.error('Failed to load personas:', error)
          throw error
        }
      },

      setPersonaLoading: (loading) => {
        set({ isPersonaLoading: loading })
      },

      addPersonaSwitchEvent: (event) => {
        const id = generateId()
        const switchEvent: PersonaSwitchEvent = {
          ...event,
          id,
          timestamp: new Date().toISOString()
        }

        set((state) => ({
          personaSwitchHistory: [switchEvent, ...state.personaSwitchHistory.slice(0, 49)] // Keep last 50 events
        }))
      },

      getPersonaForPhase: (phase, mode) => {
        const state = get()
        let candidates = state.availablePersonas.filter(p => p.is_active)

        // Filter by mode if specified
        if (mode) {
          candidates = candidates.filter(p => p.mode === mode)
        } else {
          // Auto-determine mode based on phase
          let recommendedMode: PersonaMode
          if (phase <= 3) {
            recommendedMode = 'Research'
          } else if (phase <= 6) {
            recommendedMode = 'Writing'
          } else {
            recommendedMode = 'Review'
          }
          candidates = candidates.filter(p => p.mode === recommendedMode)
        }

        if (candidates.length === 0) return null

        // Return default persona for the mode, or best performing one
        return candidates.find(p => p.is_default) || 
               candidates.sort((a, b) => b.success_rate - a.success_rate)[0]
      },

      updatePersonaUsage: (personaId, executionTime, qualityScore) => {
        set((state) => ({
          availablePersonas: state.availablePersonas.map(persona => 
            persona.id === personaId
              ? {
                  ...persona,
                  usage_count: persona.usage_count + 1,
                  avg_response_time: executionTime 
                    ? Math.round((persona.avg_response_time * persona.usage_count + executionTime) / (persona.usage_count + 1))
                    : persona.avg_response_time
                }
              : persona
          )
        }))

        // Update current persona if it matches
        const state = get()
        if (state.currentPersona?.id === personaId) {
          const updatedPersona = state.availablePersonas.find(p => p.id === personaId)
          if (updatedPersona) {
            set({ currentPersona: updatedPersona })
          }
        }
      },

      createProject: async (projectData) => {
        const id = generateId()
        const newProject: Project = {
          ...projectData,
          id,
          createdAt: new Date(),
          updatedAt: new Date(),
          totalTokens: 0,
          conversations: [],
          artifacts: [],
          currentPhase: 1,
        }

        set((state) => ({
          projects: [newProject, ...state.projects],
          currentProject: newProject,
        }))

        // 🚀 AUTOMATIC PERSONA ASSIGNMENT FOR NEW PROJECT
        try {
          const defaultPersona = await WorkflowPersonaService.getDefaultPersonaForPhase(
            1, // Start with phase 1
            projectData.discipline,
            projectData.academicLevel
          )
          
          if (defaultPersona) {
            get().setCurrentPersona(defaultPersona)
            console.log(`[PROJECT CREATION] Auto-assigned persona: ${defaultPersona.name} for ${projectData.discipline}`)
          }
        } catch (error) {
          console.warn('[PROJECT CREATION] Failed to auto-assign persona:', error)
        }

        return id
      },

      updateProject: async (projectId, updates) => {
        const state = get()
        const oldProject = state.projects.find(p => p.id === projectId)
        const phaseChanged = updates.currentPhase && oldProject && updates.currentPhase !== oldProject.currentPhase

        set((state) => {
          const updatedProjects = state.projects.map((project) =>
            project.id === projectId
              ? { ...project, ...updates, updatedAt: new Date() }
              : project
          )
          
          return {
            projects: updatedProjects,
            currentProject: state.currentProject?.id === projectId 
              ? updatedProjects.find(p => p.id === projectId) || null
              : state.currentProject
          }
        })

        // 🚀 AUTOMATIC PERSONA SWITCHING ON PHASE CHANGE
        if (phaseChanged && updates.currentPhase) {
          try {
            const updatedProject = get().projects.find(p => p.id === projectId)
            if (!updatedProject) return

            const recommendation = await WorkflowPersonaService.getPersonaRecommendations(
              updates.currentPhase,
              updatedProject.discipline,
              {
                previousPersona: state.currentPersona,
                userQuery: 'phase transition',
                sessionHistory: []
              }
            )

            if (recommendation.primary && recommendation.primary.id !== state.currentPersona?.id) {
              // Auto-switch if confidence is high
              if (recommendation.confidence > 0.7) {
                get().setCurrentPersona(recommendation.primary)
                
                // Log the auto-switch event
                get().addPersonaSwitchEvent({
                  fromPersona: state.currentPersona,
                  toPersona: recommendation.primary,
                  sessionId: state.currentSessionId || 'project-phase-change',
                  academicPhase: updates.currentPhase,
                  reason: 'phase_transition',
                  switchTime: 50, // Estimated time for auto-switch
                  context: {
                    confidence: recommendation.confidence,
                    reasoning: recommendation.reasoning,
                    oldPhase: oldProject?.currentPhase,
                    newPhase: updates.currentPhase
                  }
                })

                console.log(`[PHASE TRANSITION] Auto-switched to ${recommendation.primary.name} for phase ${updates.currentPhase} (confidence: ${recommendation.confidence})`)
              } else {
                console.log(`[PHASE TRANSITION] Persona recommendation available but confidence too low (${recommendation.confidence})`)
              }
            }
          } catch (error) {
            console.warn('[PHASE TRANSITION] Failed to auto-switch persona:', error)
          }
        }
      },

      setCurrentProject: (project) => {
        set({ currentProject: project })
      },

      // 🚀 CHAT MODE MANAGEMENT ACTIONS - P01 PERSONA REVISION
      setCurrentChatMode: (mode) => {
        set((state) => ({
          chatModeState: {
            ...state.chatModeState,
            currentMode: mode,
            lastUsedMode: state.chatModeState.currentMode || state.chatModeState.lastUsedMode
          }
        }))
      },

      switchChatMode: (mode, sessionId) => {
        const state = get()
        
        // Update current mode
        get().setCurrentChatMode(mode)
        
        // Update session metadata
        get().updateSession(sessionId, {
          metadata: {
            ...state.sessions.find(s => s.id === sessionId)?.metadata,
            chatMode: mode
          }
        })
        
        // Add to mode history
        get().addToModeHistory(mode, sessionId)
        
        console.log(`[CHAT MODE SWITCH] Session ${sessionId} switched to ${mode} mode`)
      },

      getChatModeForSession: (sessionId) => {
        const state = get()
        const session = state.sessions.find(s => s.id === sessionId)
        return session?.metadata?.chatMode || null
      },

      getSessionsForMode: (mode) => {
        const state = get()
        return state.sessions.filter(session => 
          session.metadata?.chatMode === mode
        )
      },

      addToModeHistory: (mode, sessionId) => {
        set((state) => ({
          chatModeState: {
            ...state.chatModeState,
            modeHistory: [
              {
                mode,
                sessionId,
                timestamp: new Date().toISOString()
              },
              ...state.chatModeState.modeHistory.slice(0, 49) // Keep last 50 entries
            ]
          }
        }))
      },

      clearModeHistory: (mode) => {
        set((state) => ({
          chatModeState: {
            ...state.chatModeState,
            modeHistory: mode 
              ? state.chatModeState.modeHistory.filter(entry => entry.mode !== mode)
              : [],
            modeSeparatedHistory: mode
              ? {
                  ...state.chatModeState.modeSeparatedHistory,
                  [mode]: []
                }
              : {
                  formal: [],
                  casual: []
                }
          }
        }))
      },

      isModeAvailable: (mode) => {
        const state = get()
        return state.availableModes.some(availableMode => availableMode.mode === mode)
      },

      // 🚀 P02: PERSONA BEHAVIOR INTEGRATION ACTIONS
      setModeDefaultPersona: async (chatMode, personaId?) => {
        const state = get()
        
        // If no personaId provided, fetch default for the mode
        let targetPersonaId = personaId
        if (!targetPersonaId) {
          try {
            const defaultPersona = await personaService.getDefaultPersonaForChatMode(chatMode)
            targetPersonaId = defaultPersona?.id || null
          } catch (error) {
            console.warn(`[P02 PERSONA] Failed to fetch default persona for ${chatMode} mode:`, error)
            return
          }
        }

        if (targetPersonaId) {
          set((state) => ({
            chatModeState: {
              ...state.chatModeState,
              modeDefaultPersonas: {
                ...state.chatModeState.modeDefaultPersonas,
                [chatMode]: targetPersonaId
              }
            }
          }))
          
          console.log(`[P02 PERSONA] Set default persona for ${chatMode} mode: ${targetPersonaId}`)
        }
      },

      switchChatModeWithPersona: async (mode, sessionId, forcePersonaId?) => {
        const state = get()
        
        try {
          // 1. Switch chat mode first
          get().switchChatMode(mode, sessionId)
          
          // 2. Find appropriate persona for the mode
          let targetPersona: PersonaTemplate | null = null
          
          if (forcePersonaId) {
            // Use specific persona if provided
            targetPersona = await personaService.getPersonaById(forcePersonaId)
          } else {
            // Auto-select persona based on mode
            const cachedPersonaId = state.chatModeState.modeDefaultPersonas[mode]
            if (cachedPersonaId) {
              try {
                targetPersona = await personaService.getPersonaById(cachedPersonaId)
              } catch (error) {
                console.warn(`[P02 PERSONA] Cached persona ${cachedPersonaId} not found, searching for alternative`)
              }
            }
            
            // Fallback to mode-based search
            if (!targetPersona) {
              targetPersona = await personaService.getPersonaByChatMode(mode)
            }
          }
          
          // 3. Switch to persona if found
          if (targetPersona) {
            get().setCurrentPersona(targetPersona)
            
            // 4. Map session to persona
            set((state) => ({
              chatModeState: {
                ...state.chatModeState,
                sessionPersonaMapping: {
                  ...state.chatModeState.sessionPersonaMapping,
                  [sessionId]: targetPersona.id
                },
                lastPersonaSwitchTime: Date.now()
              }
            }))
            
            // 5. Log the persona switch event
            get().addPersonaSwitchEvent({
              fromPersona: state.currentPersona,
              toPersona: targetPersona,
              sessionId,
              reason: 'auto', // P02: Mark as auto since it's triggered by chat mode
              switchTime: Date.now() - (state.chatModeState.lastPersonaSwitchTime || Date.now()),
              context: {
                chatMode: mode,
                autoSelected: !forcePersonaId,
                personaMode: targetPersona.mode,
                trigger: 'chat_mode_switch'
              }
            })
            
            console.log(`[P02 PERSONA] Successfully switched to ${targetPersona.name} for ${mode} mode in session ${sessionId}`)
          } else {
            console.warn(`[P02 PERSONA] No persona found for ${mode} mode, using default system prompt`)
          }
          
        } catch (error) {
          console.error(`[P02 PERSONA] Failed to switch persona for ${mode} mode:`, error)
          // Fallback: just switch mode without persona
          get().switchChatMode(mode, sessionId)
        }
      },

      getPersonaForSession: (sessionId) => {
        const state = get()
        const personaId = state.chatModeState.sessionPersonaMapping[sessionId]
        return personaId ? state.availablePersonas.find(p => p.id === personaId) || null : null
      },

      updateSessionPersonaMapping: (sessionId, personaId) => {
        set((state) => ({
          chatModeState: {
            ...state.chatModeState,
            sessionPersonaMapping: {
              ...state.chatModeState.sessionPersonaMapping,
              [sessionId]: personaId
            }
          }
        }))
      },

      togglePersonaAutoSwitch: () => {
        set((state) => ({
          chatModeState: {
            ...state.chatModeState,
            isPersonaAutoSwitchEnabled: !state.chatModeState.isPersonaAutoSwitchEnabled
          }
        }))
      },

      // 🚀 P02: PERSONA BEHAVIOR STATE GETTERS
      getCurrentModePersona: () => {
        const state = get()
        if (!state.chatModeState.currentMode) return null
        
        const defaultPersonaId = state.chatModeState.modeDefaultPersonas[state.chatModeState.currentMode]
        return defaultPersonaId ? state.availablePersonas.find(p => p.id === defaultPersonaId) || null : null
      },

      isPersonaAutoSwitchEnabled: () => {
        const state = get()
        return state.chatModeState.isPersonaAutoSwitchEnabled
      },

      // 🚀 P03: WORKFLOW ENGINE ACTIONS
      initializeWorkflow: async (type, sessionId, chatMode) => {
        const state = get()
        
        let workflow: WorkflowState

        if (type === 'academic-8-phase') {
          workflow = WorkflowEngine.createAcademicWorkflow(sessionId, chatMode)
          console.log(`[P03 WORKFLOW] Initialized academic 8-phase workflow for session ${sessionId}`)
        } else {
          workflow = WorkflowEngine.createFreeConversationWorkflow(sessionId, chatMode)
          console.log(`[P03 WORKFLOW] Initialized free conversation workflow for session ${sessionId}`)
        }

        set({ workflowState: workflow })

        // Update session metadata
        get().updateSession(sessionId, {
          metadata: {
            ...state.sessions.find(s => s.id === sessionId)?.metadata,
            workflowType: type,
            workflowStarted: Date.now()
          }
        })

        // Add to workflow history
        set((state) => ({
          workflowHistory: [
            {
              sessionId,
              workflowType: type,
              startedAt: Date.now(),
              finalPhase: 1,
              success: false
            },
            ...state.workflowHistory
          ]
        }))
      },

      startWorkflowPhase: async (phase) => {
        const state = get()
        if (!state.workflowState) return

        const updatedPhaseProgress = {
          ...state.workflowState.phaseProgress,
          [phase]: {
            ...state.workflowState.phaseProgress[phase],
            started: true
          }
        }

        set({
          workflowState: {
            ...state.workflowState,
            currentPhase: phase,
            phaseProgress: updatedPhaseProgress
          }
        })

        console.log(`[P03 WORKFLOW] Started phase ${phase}: ${state.workflowState.phases.find(p => p.phase === phase)?.name}`)
      },

      completeWorkflowPhase: async (phase, artifacts = [], quality) => {
        const state = get()
        if (!state.workflowState) return

        const updatedPhaseProgress = {
          ...state.workflowState.phaseProgress,
          [phase]: {
            ...state.workflowState.phaseProgress[phase],
            completed: true,
            artifacts,
            quality,
            duration: Date.now() - (state.workflowState.startTime || Date.now())
          }
        }

        const completedPhases = [...state.workflowState.completedPhases, phase]
        const isWorkflowComplete = completedPhases.length >= state.workflowState.maxPhases

        set({
          workflowState: {
            ...state.workflowState,
            phaseProgress: updatedPhaseProgress,
            completedPhases,
            isActive: !isWorkflowComplete,
            currentPhase: isWorkflowComplete ? phase : phase + 1
          }
        })

        // Update workflow history if complete
        if (isWorkflowComplete) {
          set((state) => ({
            workflowHistory: state.workflowHistory.map(entry => 
              entry.sessionId === state.workflowState?.sessionId && !entry.completedAt
                ? { ...entry, completedAt: Date.now(), finalPhase: phase, success: true }
                : entry
            )
          }))
        }

        console.log(`[P03 WORKFLOW] Completed phase ${phase}. Workflow ${isWorkflowComplete ? 'finished' : 'continuing'}`)
      },

      updateWorkflowProgress: (phase, progress) => {
        const state = get()
        if (!state.workflowState) return

        const updatedPhaseProgress = {
          ...state.workflowState.phaseProgress,
          [phase]: {
            ...state.workflowState.phaseProgress[phase],
            ...progress
          }
        }

        set({
          workflowState: {
            ...state.workflowState,
            phaseProgress: updatedPhaseProgress
          }
        })
      },

      resetWorkflow: () => {
        const state = get()
        if (state.workflowState) {
          console.log(`[P03 WORKFLOW] Reset workflow for session ${state.workflowState.sessionId}`)
        }
        set({ workflowState: null })
      },

      getWorkflowForSession: (sessionId) => {
        const state = get()
        if (state.workflowState?.sessionId === sessionId) {
          return state.workflowState
        }
        return null
      },

      isWorkflowActive: () => {
        const state = get()
        return state.workflowState?.isActive || false
      },

      getCurrentWorkflowPhase: () => {
        const state = get()
        if (!state.workflowState) return null
        
        return state.workflowState.phases.find(p => p.phase === state.workflowState!.currentPhase) || null
      },

      getNextRequiredTools: () => {
        const state = get()
        if (!state.workflowState) return []
        
        return WorkflowEngine.getRequiredToolsForPhase(state.workflowState)
      },

      estimateRemainingPhases: () => {
        const state = get()
        if (!state.workflowState) return 0
        
        return state.workflowState.maxPhases - state.workflowState.completedPhases.length
      },

      shouldTriggerWorkflow: (chatMode, userQuery) => {
        return WorkflowEngine.shouldTriggerWorkflow(chatMode, userQuery)
      },
    }),
    {
      name: 'chat-storage',
      partialize: (state) => ({
        sessions: state.sessions,
        projects: state.projects,
        artifacts: state.artifacts,
        currentSessionId: state.currentSessionId,
        // Persist persona state
        currentPersona: state.currentPersona,
        personaSwitchHistory: state.personaSwitchHistory.slice(0, 10), // Keep last 10 switches
        // 🚀 PERSIST CHAT MODE STATE - P01 PERSONA REVISION
        chatModeState: {
          ...state.chatModeState,
          modeHistory: state.chatModeState.modeHistory.slice(0, 20) // Keep last 20 mode switches
        },
        // 🚀 P03: PERSIST WORKFLOW STATE
        workflowState: state.workflowState,
        workflowHistory: state.workflowHistory.slice(0, 50), // Keep last 50 workflow sessions
      }),
    }
  )
)