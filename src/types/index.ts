import type { UIMessage } from '@ai-sdk/react'
import type { PersonaTemplate, PersonaMode } from './persona'

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system' | 'tool'
  content: string
  createdAt?: Date
  parts?: Array<{ type: string; text?: string; [key: string]: any }>
  artifacts?: ArtifactAttachment[]
  toolInvocations?: ToolInvocation[]
}

export interface ArtifactAttachment {
  id: string
  title: string
  content: string
  type: 'markdown' | 'text' | 'code'
  phase: number // 1-8 for academic phases
  createdAt: Date
  wordCount?: number
  metadata?: {
    discipline?: string
    academicLevel?: 'undergraduate' | 'graduate' | 'postgraduate'
    citationStyle?: 'APA' | 'MLA' | 'Chicago' | 'IEEE'
  }
}

export interface ToolInvocation {
  toolName: string
  toolCallId: string
  state: 'partial-call' | 'call' | 'result'
  args?: any
  result?: any
}

export interface ChatSession {
  id: string
  title: string
  messages: ChatMessage[]
  createdAt: Date
  updatedAt: Date
  isProject: boolean
  projectId?: string
  metadata?: {
    phase?: number
    totalTokens?: number
    discipline?: string
    // 🚀 CHAT MODE METADATA - P01 PERSONA REVISION
    chatMode?: ChatMode
    lastPersonaUsed?: string
    lastPersonaMode?: PersonaMode
  }
}

export interface Project {
  id: string
  title: string
  description?: string
  discipline: string
  academicLevel: 'undergraduate' | 'graduate' | 'postgraduate'
  citationStyle: 'APA' | 'MLA' | 'Chicago' | 'IEEE'
  currentPhase: number
  conversations: string[] // conversation IDs
  artifacts: ArtifactAttachment[]
  createdAt: Date
  updatedAt: Date
  totalTokens: number
}

export interface LoadingState {
  isLoading: boolean
  type: 'thinking' | 'searching' | 'processing'
  message: string
  phase?: StreamingPhase
  progress?: number
  startTime?: number
}

// Enhanced Streaming Event Taxonomy for Progressive Disclosure
export type StreamingPhase = 
  | 'idle'
  | 'thinking' 
  | 'browsing'
  | 'tool-execution'
  | 'text-streaming'
  | 'processing'
  | 'reconnecting'
  | 'waiting'

// Phase Transition Events dengan enhanced performance metrics
export type PhaseTransitionEvent =
  | { type: 'thinking-start'; data: { message: string; timestamp: number } }
  | { type: 'thinking-end'; data: { duration: number; actualDuration?: number; timestamp: number } }
  | { type: 'browsing-start'; data: { source: string; message: string; timestamp: number } }
  | { type: 'browsing-end'; data: { resultCount: number; duration: number; timestamp: number } }
  | { type: 'tool-execution-start'; data: { tool: string; args: any; message: string; expectedDuration?: number; timestamp: number } }
  | { type: 'tool-execution-end'; data: { tool: string; duration: number; success: boolean; performanceScore?: string; timestamp: number } }

// Text Streaming Events for Progressive Disclosure  
export type TextStreamingEvent =
  | { type: 'text-streaming-start'; data: { totalEstimatedChars?: number; timestamp: number } }
  | { type: 'text-chunk'; data: { chunk: string; position: number; timestamp: number } }
  | { type: 'text-streaming-end'; data: { totalChars: number; duration: number; timestamp: number } }

// Progress and Status Events (Transient)
export type ProgressEvent = 
  | { type: 'progress-update'; data: { phase: StreamingPhase; progress: number; message: string }; transient: true }
  | { type: 'status-update'; data: { status: string; details?: string; phase: StreamingPhase }; transient: true }

// Combined Enhanced Stream Event Type
export type EnhancedStreamEvent = 
  | PhaseTransitionEvent 
  | TextStreamingEvent
  | ProgressEvent
  | { type: 'error'; data: { error: string; phase: StreamingPhase; timestamp: number } }
  | { type: 'complete'; data: { totalDuration: number; timestamp: number } }

// Legacy StreamEvent for backward compatibility  
export interface StreamEvent {
  type: 'start' | 'text-start' | 'text-delta' | 'text-end' | 'tool-input-start' | 
        'tool-input-delta' | 'tool-input-available' | 'tool-output-available' |
        'start-step' | 'finish-step' | 'artifact' | 'approval_request' | 'error' | 'finish'
  data?: any
}

// Custom UIMessage type with enhanced streaming data parts
export type MakalahUIMessage = UIMessage<
  never, // metadata type
  {
    // Phase tracking data
    'phase-transition': PhaseTransitionEvent['data'] & { eventType: PhaseTransitionEvent['type'] };
    
    // Progress updates dengan enhanced network dan performance info (transient)
    'progress-status': {
      phase: StreamingPhase;
      message: string;
      progress?: number;
      networkCondition?: 'fast' | 'good' | 'slow' | 'offline';
      estimatedDuration?: number;
      tool?: string;
      errorType?: string;
      recoveryStrategy?: 'auto-retry' | 'fallback';
      performanceSummary?: {
        totalDuration: number;
        throughput: number;
        toolsUsed: number;
        networkQuality: string;
        recommendations: string[];
      };
      timestamp: number;
    };
    
    // Tool execution feedback dengan enhanced performance metrics
    'tool-feedback': {
      tool: string;
      status: 'start' | 'progress' | 'success' | 'error';
      message: string;
      args?: any;
      result?: any;
      duration?: number;
      averageDuration?: number;
      performanceScore?: 'excellent' | 'good' | 'needs-optimization';
      expectedDuration?: number;
      progress?: number; // 0-100 percentage
      timestamp: number;
    };
    
    // Text streaming metadata dengan enhanced performance tracking
    'text-streaming': {
      status: 'start' | 'chunk' | 'end';
      chunk?: string;
      position?: number;
      totalChars?: number;
      duration?: number;
      chunkSize?: number;
      latency?: number;
      throughput?: number;
      averageLatency?: number;
      networkCondition?: 'fast' | 'good' | 'slow' | 'offline';
      performanceScore?: 'excellent' | 'good' | 'needs-optimization';
      // Enhanced batch processing fields
      batchIndex?: number;
      totalBatches?: number;
      isOptimized?: boolean;
      timestamp: number;
    };
    
    // Enhanced error reporting dengan detailed debugging info
    'error-details': {
      error: string;
      stack?: string;
      networkCondition: 'fast' | 'good' | 'slow' | 'offline';
      performanceMetrics: any;
      timestamp: number;
    };

    // 🚀 P03.2: WORKFLOW PROGRESS TRACKING
    'workflow-progress': {
      currentPhase: number;
      totalPhases: number;
      phaseName: string;
      completion: number;
      nextPhaseAvailable: boolean;
      phaseDescription?: string;
      requiredTools?: string[];
      expectedOutputs?: string[];
      completionCriteria?: string[];
      timestamp: number;
    };
  }
>

export interface ThemeStore {
  theme: 'light' | 'dark'
  setTheme: (theme: 'light' | 'dark') => void
  toggleTheme: () => void
}

// 🚀 CHAT MODE ARCHITECTURE - P01 PERSONA REVISION
export type ChatMode = 'formal' | 'casual'

export interface ChatModeSelection {
  mode: ChatMode
  displayName: string
  description: string
  icon: string
  language: 'formal' | 'jakarta-gue-lo'
  workflow: 'academic-8-phase' | 'free-conversation'
}

// 🚀 P03: WORKFLOW ENGINE INTEGRATION
export type WorkflowType = 'academic-8-phase' | 'free-conversation'

export interface WorkflowPhase {
  phase: number // 1-8 for academic workflow
  name: string
  description: string
  requiredTools: string[]
  expectedOutputs: string[]
  completionCriteria: string[]
}

export interface WorkflowState {
  type: WorkflowType
  currentPhase: number
  maxPhases: number
  isActive: boolean
  startTime: number | null
  phases: WorkflowPhase[]
  completedPhases: number[]
  phaseProgress: Record<number, {
    started: boolean
    completed: boolean
    artifacts: string[]
    duration?: number
    quality?: number
  }>
  sessionId: string | null
  chatMode: ChatMode | null
}

export interface AcademicWorkflowConfig {
  disciplines: Record<string, {
    phaseCustomizations: Record<number, {
      tools: string[]
      prompts: string[]
      expectedOutputs: string[]
    }>
  }>
  citationStyles: Record<string, {
    format: string
    examples: string[]
  }>
  academicLevels: Record<string, {
    complexity: 'basic' | 'intermediate' | 'advanced'
    wordCountTargets: Record<number, number>
    qualityCriteria: string[]
  }>
}

export interface ChatModeState {
  currentMode: ChatMode | null
  lastUsedMode: ChatMode | null
  modeHistory: Array<{
    mode: ChatMode
    timestamp: string
    sessionId: string
  }>
  modeSeparatedHistory: {
    formal: string[] // session IDs
    casual: string[] // session IDs
  }
  // 🚀 P02: Persona behavior integration
  sessionPersonaMapping: Record<string, string> // sessionId -> personaId
  modeDefaultPersonas: Record<ChatMode, string> // mode -> default personaId
  isPersonaAutoSwitchEnabled: boolean
  lastPersonaSwitchTime: number | null
}

export interface SidebarStore {
  isCollapsed: boolean
  activeTab: 'history' | 'artifacts' | 'projects'
  selectedProject: string | null
  setCollapsed: (collapsed: boolean) => void
  setActiveTab: (tab: 'history' | 'artifacts' | 'projects') => void
  setSelectedProject: (projectId: string | null) => void
}

// 🚀 ENHANCED STREAMING STATE INTERFACE
export interface StreamingState {
  currentPhase: StreamingPhase
  phaseStartTime: number | null
  phaseDuration: number
  toolExecutionHistory: Array<{
    tool: string
    startTime: number
    endTime?: number
    duration?: number
    status: 'running' | 'success' | 'error'
    message: string
  }>
  textStreamingBuffer: string
  currentlyStreamingMessageId: string | null
  streamingSpeed: 'fast' | 'normal' | 'slow'
  isPaused: boolean
  totalCharacters: number
  streamedCharacters: number
}

// 🚀 PERSONA SWITCH EVENT TRACKING
export interface PersonaSwitchEvent {
  id: string
  fromPersona: PersonaTemplate | null
  toPersona: PersonaTemplate
  sessionId: string
  academicPhase: number | null
  reason: 'manual' | 'auto' | 'phase_transition'
  switchTime: number // milliseconds to complete switch
  timestamp: string
  context?: Record<string, any>
}

export interface ChatStore {
  sessions: ChatSession[]
  currentSessionId: string | null
  projects: Project[]
  currentProject: Project | null
  artifacts: ArtifactAttachment[]
  loadingState: LoadingState
  streamingState: StreamingState
  // 🚀 PERSONA SYSTEM STATE
  currentPersona: PersonaTemplate | null
  availablePersonas: PersonaTemplate[]
  personaSwitchHistory: PersonaSwitchEvent[]
  isPersonaLoading: boolean
  // 🚀 CHAT MODE STATE - P01 PERSONA REVISION
  chatModeState: ChatModeState
  availableModes: ChatModeSelection[]
  // 🚀 P03: WORKFLOW ENGINE STATE
  workflowState: WorkflowState | null
  academicWorkflowConfig: AcademicWorkflowConfig
  workflowHistory: Array<{
    sessionId: string
    workflowType: WorkflowType
    startedAt: number
    completedAt?: number
    finalPhase: number
    success: boolean
  }>
  addMessage: (sessionId: string, message: Omit<ChatMessage, 'id' | 'createdAt'>) => void
  createSession: (isProject: boolean, projectId?: string, chatMode?: ChatMode) => string
  updateSession: (sessionId: string, updates: Partial<ChatSession>) => void
  deleteSession: (sessionId: string) => void
  setCurrentSession: (sessionId: string | null) => void
  addArtifact: (artifact: Omit<ArtifactAttachment, 'id' | 'createdAt'>) => void
  updateArtifact: (artifactId: string, updates: Partial<ArtifactAttachment>) => void
  setLoadingState: (state: LoadingState) => void
  // 🚀 ENHANCED STREAMING ACTIONS
  updateStreamingPhase: (phase: StreamingPhase, message?: string) => void
  addToolExecution: (tool: string, message: string, metadata?: any) => void
  completeToolExecution: (tool: string, status?: 'success' | 'error', metadata?: any) => void
  startTextStreaming: (messageId: string, totalChars?: number) => void
  appendStreamingText: (chunk: string) => void
  pauseTextStreaming: () => void
  resumeTextStreaming: () => void
  completeTextStreaming: () => void
  setStreamingSpeed: (speed: 'fast' | 'normal' | 'slow') => void
  resetStreamingState: () => void
  getIndonesianPhaseMessage: (phase: StreamingPhase, toolName?: string) => string
  createProject: (project: Omit<Project, 'id' | 'createdAt' | 'updatedAt' | 'totalTokens' | 'conversations' | 'artifacts'>) => string
  updateProject: (projectId: string, updates: Partial<Project>) => void
  setCurrentProject: (project: Project | null) => void
  // 🚀 PERSONA SYSTEM ACTIONS
  setCurrentPersona: (persona: PersonaTemplate | null) => void
  switchPersona: (personaId: string, sessionId: string, reason?: 'manual' | 'auto' | 'phase_transition') => Promise<void>
  loadAvailablePersonas: (mode?: PersonaMode, disciplineId?: string) => Promise<void>
  setPersonaLoading: (loading: boolean) => void
  addPersonaSwitchEvent: (event: Omit<PersonaSwitchEvent, 'id' | 'timestamp'>) => void
  getPersonaForPhase: (phase: number, mode?: PersonaMode) => PersonaTemplate | null
  updatePersonaUsage: (personaId: string, executionTime?: number, qualityScore?: number) => void
  // 🚀 CHAT MODE MANAGEMENT ACTIONS - P01 PERSONA REVISION
  setCurrentChatMode: (mode: ChatMode | null) => void
  switchChatMode: (mode: ChatMode, sessionId: string) => void
  getChatModeForSession: (sessionId: string) => ChatMode | null
  getSessionsForMode: (mode: ChatMode) => ChatSession[]
  addToModeHistory: (mode: ChatMode, sessionId: string) => void
  clearModeHistory: (mode?: ChatMode) => void
  isModeAvailable: (mode: ChatMode) => boolean
  // 🚀 P02: PERSONA BEHAVIOR INTEGRATION ACTIONS
  setModeDefaultPersona: (chatMode: ChatMode, personaId?: string) => Promise<void>
  switchChatModeWithPersona: (mode: ChatMode, sessionId: string, forcePersonaId?: string) => Promise<void>
  getPersonaForSession: (sessionId: string) => PersonaTemplate | null
  updateSessionPersonaMapping: (sessionId: string, personaId: string) => void
  togglePersonaAutoSwitch: () => void
  getCurrentModePersona: () => PersonaTemplate | null
  isPersonaAutoSwitchEnabled: () => boolean
  // 🚀 P03: WORKFLOW ENGINE ACTIONS
  initializeWorkflow: (type: WorkflowType, sessionId: string, chatMode: ChatMode) => Promise<void>
  startWorkflowPhase: (phase: number) => Promise<void>
  completeWorkflowPhase: (phase: number, artifacts?: string[], quality?: number) => Promise<void>
  updateWorkflowProgress: (phase: number, progress: Partial<WorkflowState['phaseProgress'][number]>) => void
  resetWorkflow: () => void
  getWorkflowForSession: (sessionId: string) => WorkflowState | null
  isWorkflowActive: () => boolean
  getCurrentWorkflowPhase: () => WorkflowPhase | null
  getNextRequiredTools: () => string[]
  estimateRemainingPhases: () => number
  shouldTriggerWorkflow: (chatMode: ChatMode, userQuery: string) => boolean
}