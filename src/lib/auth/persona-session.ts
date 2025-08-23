// ============================================
// MAKALAH AI: Persona-Aware Session Management
// ============================================
// Task P07.2 Implementation: Session management dengan persona mode persistence
// Created: August 2025
// Features: Persona preferences storage, session persistence, auth integration

import type { PersonaTemplate } from '@/types/persona'

// ============================================
// PERSONA SESSION TYPES
// ============================================

export interface PersonaSessionData {
  userId: string | null
  sessionId: string
  chatMode: 'formal' | 'casual' | null
  preferredPersonaId: string | null
  personaPreferences: {
    defaultMode?: 'formal' | 'casual'
    preferredPersonas?: Record<string, string> // mode -> personaId mapping
    workflowPreferences?: {
      enableWorkflow?: boolean
      skipPhases?: number[]
      preferredCitationStyle?: string
    }
    uiPreferences?: {
      showPersonaIndicator?: boolean
      enableModeSwitch?: boolean
      preferredLanguage?: 'formal' | 'jakarta-gue-lo'
    }
  }
  sessionMetadata: {
    createdAt: string
    lastActive: string
    activeProject?: string | null
    currentWorkflowPhase?: number | null
    totalMessages?: number
    totalTokens?: number
  }
  expiresAt: string
}

export interface PersonaUserPreferences {
  userId: string
  defaultChatMode: 'formal' | 'casual'
  preferredPersonas: Record<string, string> // mode -> personaId
  workflowSettings: {
    enableAutoWorkflow: boolean
    preferredCitationStyle: 'APA' | 'MLA' | 'Chicago'
    autoSaveEnabled: boolean
    skipIntroPhases: boolean
  }
  uiSettings: {
    showPersonaModeIndicator: boolean
    enableQuickModeSwitch: boolean
    preferredTheme: 'light' | 'dark' | 'system'
    compactMode: boolean
  }
  analyticsPreferences: {
    trackUsage: boolean
    shareAnonymousData: boolean
    enablePersonalization: boolean
  }
  createdAt: string
  updatedAt: string
}

// ============================================
// PERSONA SESSION MANAGER
// ============================================

export class PersonaSessionManager {
  private static instance: PersonaSessionManager
  private sessions = new Map<string, PersonaSessionData>()
  private userPreferences = new Map<string, PersonaUserPreferences>()
  private sessionCleanupInterval: NodeJS.Timeout | null = null

  private constructor() {
    // Initialize cleanup interval
    this.setupCleanupInterval()
    
    // Load persisted data from localStorage (client-side only)
    if (typeof window !== 'undefined') {
      this.loadFromStorage()
    }
  }

  static getInstance(): PersonaSessionManager {
    if (!this.instance) {
      this.instance = new PersonaSessionManager()
    }
    return this.instance
  }

  // ============================================
  // SESSION MANAGEMENT
  // ============================================

  /**
   * Create or update session dengan persona context
   */
  createSession(
    sessionId: string,
    options: {
      userId?: string | null
      chatMode?: 'formal' | 'casual' | null
      preferredPersonaId?: string | null
      isProject?: boolean
      ttlMinutes?: number
    } = {}
  ): PersonaSessionData {
    const now = new Date()
    const expiresAt = new Date(now.getTime() + (options.ttlMinutes || 1440) * 60 * 1000) // Default 24 hours

    // Get user preferences if available
    const userPrefs = options.userId ? this.getUserPreferences(options.userId) : null
    
    const sessionData: PersonaSessionData = {
      userId: options.userId || null,
      sessionId,
      chatMode: options.chatMode || userPrefs?.defaultChatMode || null,
      preferredPersonaId: options.preferredPersonaId || null,
      personaPreferences: {
        defaultMode: userPrefs?.defaultChatMode || 'formal',
        preferredPersonas: userPrefs?.preferredPersonas || {},
        workflowPreferences: {
          enableWorkflow: userPrefs?.workflowSettings.enableAutoWorkflow !== false,
          preferredCitationStyle: userPrefs?.workflowSettings.preferredCitationStyle || 'APA'
        },
        uiPreferences: {
          showPersonaIndicator: userPrefs?.uiSettings.showPersonaModeIndicator !== false,
          enableModeSwitch: userPrefs?.uiSettings.enableQuickModeSwitch !== false,
          preferredLanguage: options.chatMode === 'casual' ? 'jakarta-gue-lo' : 'formal'
        }
      },
      sessionMetadata: {
        createdAt: now.toISOString(),
        lastActive: now.toISOString(),
        activeProject: options.isProject ? sessionId : null,
        totalMessages: 0,
        totalTokens: 0
      },
      expiresAt: expiresAt.toISOString()
    }

    this.sessions.set(sessionId, sessionData)
    this.persistToStorage()

    console.log('[PERSONA SESSION] Session created:', {
      sessionId,
      chatMode: sessionData.chatMode,
      userId: sessionData.userId,
      expiresAt: sessionData.expiresAt
    })

    return sessionData
  }

  /**
   * Get session by ID
   */
  getSession(sessionId: string): PersonaSessionData | null {
    const session = this.sessions.get(sessionId)
    
    if (!session) return null
    
    // Check expiration
    if (new Date() > new Date(session.expiresAt)) {
      this.sessions.delete(sessionId)
      this.persistToStorage()
      console.log('[PERSONA SESSION] Session expired and removed:', sessionId)
      return null
    }
    
    return session
  }

  /**
   * Update session with new persona context
   */
  updateSession(
    sessionId: string,
    updates: Partial<{
      chatMode: 'formal' | 'casual' | null
      preferredPersonaId: string | null
      currentWorkflowPhase: number | null
      totalMessages: number
      totalTokens: number
    }>
  ): PersonaSessionData | null {
    const session = this.getSession(sessionId)
    if (!session) return null

    // Update session data
    Object.assign(session, {
      chatMode: updates.chatMode ?? session.chatMode,
      preferredPersonaId: updates.preferredPersonaId ?? session.preferredPersonaId,
      sessionMetadata: {
        ...session.sessionMetadata,
        lastActive: new Date().toISOString(),
        currentWorkflowPhase: updates.currentWorkflowPhase ?? session.sessionMetadata.currentWorkflowPhase,
        totalMessages: updates.totalMessages ?? session.sessionMetadata.totalMessages,
        totalTokens: updates.totalTokens ?? session.sessionMetadata.totalTokens
      }
    })

    this.sessions.set(sessionId, session)
    this.persistToStorage()

    console.log('[PERSONA SESSION] Session updated:', {
      sessionId,
      updates,
      lastActive: session.sessionMetadata.lastActive
    })

    return session
  }

  /**
   * Delete session
   */
  deleteSession(sessionId: string): boolean {
    const deleted = this.sessions.delete(sessionId)
    if (deleted) {
      this.persistToStorage()
      console.log('[PERSONA SESSION] Session deleted:', sessionId)
    }
    return deleted
  }

  /**
   * Get all sessions for user
   */
  getUserSessions(userId: string): PersonaSessionData[] {
    const userSessions = Array.from(this.sessions.values())
      .filter(session => session.userId === userId)
      .filter(session => new Date() <= new Date(session.expiresAt)) // Filter out expired
      .sort((a, b) => new Date(b.sessionMetadata.lastActive).getTime() - new Date(a.sessionMetadata.lastActive).getTime())

    return userSessions
  }

  // ============================================
  // USER PREFERENCES MANAGEMENT
  // ============================================

  /**
   * Get user preferences
   */
  getUserPreferences(userId: string): PersonaUserPreferences | null {
    return this.userPreferences.get(userId) || null
  }

  /**
   * Create or update user preferences
   */
  setUserPreferences(
    userId: string,
    preferences: Partial<Omit<PersonaUserPreferences, 'userId' | 'createdAt' | 'updatedAt'>>
  ): PersonaUserPreferences {
    const existing = this.userPreferences.get(userId)
    const now = new Date().toISOString()

    const userPrefs: PersonaUserPreferences = {
      userId,
      defaultChatMode: preferences.defaultChatMode || existing?.defaultChatMode || 'formal',
      preferredPersonas: preferences.preferredPersonas || existing?.preferredPersonas || {},
      workflowSettings: {
        enableAutoWorkflow: preferences.workflowSettings?.enableAutoWorkflow ?? existing?.workflowSettings.enableAutoWorkflow ?? true,
        preferredCitationStyle: preferences.workflowSettings?.preferredCitationStyle || existing?.workflowSettings.preferredCitationStyle || 'APA',
        autoSaveEnabled: preferences.workflowSettings?.autoSaveEnabled ?? existing?.workflowSettings.autoSaveEnabled ?? true,
        skipIntroPhases: preferences.workflowSettings?.skipIntroPhases ?? existing?.workflowSettings.skipIntroPhases ?? false
      },
      uiSettings: {
        showPersonaModeIndicator: preferences.uiSettings?.showPersonaModeIndicator ?? existing?.uiSettings.showPersonaModeIndicator ?? true,
        enableQuickModeSwitch: preferences.uiSettings?.enableQuickModeSwitch ?? existing?.uiSettings.enableQuickModeSwitch ?? true,
        preferredTheme: preferences.uiSettings?.preferredTheme || existing?.uiSettings.preferredTheme || 'system',
        compactMode: preferences.uiSettings?.compactMode ?? existing?.uiSettings.compactMode ?? false
      },
      analyticsPreferences: {
        trackUsage: preferences.analyticsPreferences?.trackUsage ?? existing?.analyticsPreferences.trackUsage ?? true,
        shareAnonymousData: preferences.analyticsPreferences?.shareAnonymousData ?? existing?.analyticsPreferences.shareAnonymousData ?? true,
        enablePersonalization: preferences.analyticsPreferences?.enablePersonalization ?? existing?.analyticsPreferences.enablePersonalization ?? true
      },
      createdAt: existing?.createdAt || now,
      updatedAt: now
    }

    this.userPreferences.set(userId, userPrefs)
    this.persistToStorage()

    console.log('[PERSONA SESSION] User preferences updated:', {
      userId,
      defaultChatMode: userPrefs.defaultChatMode,
      preferredPersonas: Object.keys(userPrefs.preferredPersonas).length
    })

    return userPrefs
  }

  /**
   * Update preferred persona for mode
   */
  setPreferredPersona(
    userId: string,
    mode: 'formal' | 'casual' | 'Research' | 'Writing' | 'Review',
    personaId: string
  ) {
    const prefs = this.getUserPreferences(userId) || this.setUserPreferences(userId, {})
    
    prefs.preferredPersonas[mode] = personaId
    prefs.updatedAt = new Date().toISOString()
    
    this.userPreferences.set(userId, prefs)
    this.persistToStorage()

    console.log('[PERSONA SESSION] Preferred persona set:', {
      userId,
      mode,
      personaId
    })
  }

  /**
   * Get preferred persona for user and mode
   */
  getPreferredPersona(userId: string, mode: 'formal' | 'casual' | 'Research' | 'Writing' | 'Review'): string | null {
    const prefs = this.getUserPreferences(userId)
    return prefs?.preferredPersonas[mode] || null
  }

  // ============================================
  // SESSION ACTIVITY TRACKING
  // ============================================

  /**
   * Record session activity
   */
  recordActivity(
    sessionId: string,
    activity: {
      messageCount?: number
      tokenUsage?: number
      toolsUsed?: string[]
      workflowProgress?: number
      personaSwitch?: { from: string | null; to: string }
    }
  ) {
    const session = this.getSession(sessionId)
    if (!session) return

    // Update activity metrics
    if (activity.messageCount) {
      session.sessionMetadata.totalMessages = (session.sessionMetadata.totalMessages || 0) + activity.messageCount
    }
    
    if (activity.tokenUsage) {
      session.sessionMetadata.totalTokens = (session.sessionMetadata.totalTokens || 0) + activity.tokenUsage
    }
    
    if (activity.workflowProgress) {
      session.sessionMetadata.currentWorkflowPhase = activity.workflowProgress
    }

    session.sessionMetadata.lastActive = new Date().toISOString()
    
    this.sessions.set(sessionId, session)
    this.persistToStorage()

    console.log('[PERSONA SESSION] Activity recorded:', {
      sessionId,
      activity: {
        messages: session.sessionMetadata.totalMessages,
        tokens: session.sessionMetadata.totalTokens,
        lastActive: session.sessionMetadata.lastActive
      }
    })
  }

  // ============================================
  // STORAGE AND PERSISTENCE
  // ============================================

  private loadFromStorage() {
    try {
      const sessionsData = localStorage.getItem('persona-sessions')
      const preferencesData = localStorage.getItem('persona-preferences')
      
      if (sessionsData) {
        const sessions = JSON.parse(sessionsData)
        this.sessions = new Map(Object.entries(sessions))
        
        // Clean expired sessions
        this.cleanupExpiredSessions()
      }
      
      if (preferencesData) {
        const preferences = JSON.parse(preferencesData)
        this.userPreferences = new Map(Object.entries(preferences))
      }
      
      console.log('[PERSONA SESSION] Loaded from storage:', {
        sessions: this.sessions.size,
        preferences: this.userPreferences.size
      })
    } catch (error) {
      console.error('[PERSONA SESSION] Failed to load from storage:', error)
    }
  }

  private persistToStorage() {
    if (typeof window === 'undefined') return
    
    try {
      const sessionsObj = Object.fromEntries(this.sessions.entries())
      const preferencesObj = Object.fromEntries(this.userPreferences.entries())
      
      localStorage.setItem('persona-sessions', JSON.stringify(sessionsObj))
      localStorage.setItem('persona-preferences', JSON.stringify(preferencesObj))
    } catch (error) {
      console.error('[PERSONA SESSION] Failed to persist to storage:', error)
    }
  }

  // ============================================
  // CLEANUP AND MAINTENANCE
  // ============================================

  private setupCleanupInterval() {
    // Clean up expired sessions every 5 minutes
    this.sessionCleanupInterval = setInterval(() => {
      this.cleanupExpiredSessions()
    }, 5 * 60 * 1000)
  }

  private cleanupExpiredSessions() {
    const now = new Date()
    let cleanedCount = 0
    
    for (const [sessionId, session] of this.sessions.entries()) {
      if (now > new Date(session.expiresAt)) {
        this.sessions.delete(sessionId)
        cleanedCount++
      }
    }
    
    if (cleanedCount > 0) {
      this.persistToStorage()
      console.log('[PERSONA SESSION] Cleaned expired sessions:', cleanedCount)
    }
  }

  // ============================================
  // ANALYTICS AND MONITORING
  // ============================================

  getSessionStats() {
    const now = new Date()
    const activeSessions = Array.from(this.sessions.values())
      .filter(session => now <= new Date(session.expiresAt))
    
    const stats = {
      totalSessions: this.sessions.size,
      activeSessions: activeSessions.length,
      formalSessions: activeSessions.filter(s => s.chatMode === 'formal').length,
      casualSessions: activeSessions.filter(s => s.chatMode === 'casual').length,
      projectSessions: activeSessions.filter(s => s.sessionMetadata.activeProject).length,
      averageSessionAge: 0,
      totalUsers: this.userPreferences.size
    }

    if (activeSessions.length > 0) {
      const totalAge = activeSessions.reduce((sum, session) => {
        return sum + (now.getTime() - new Date(session.sessionMetadata.createdAt).getTime())
      }, 0)
      stats.averageSessionAge = Math.round(totalAge / activeSessions.length / (1000 * 60)) // minutes
    }

    return stats
  }

  getUserStats(userId: string) {
    const userSessions = this.getUserSessions(userId)
    const userPrefs = this.getUserPreferences(userId)
    
    if (!userPrefs) return null
    
    return {
      totalSessions: userSessions.length,
      preferredMode: userPrefs.defaultChatMode,
      preferredPersonas: Object.keys(userPrefs.preferredPersonas).length,
      totalMessages: userSessions.reduce((sum, s) => sum + (s.sessionMetadata.totalMessages || 0), 0),
      totalTokens: userSessions.reduce((sum, s) => sum + (s.sessionMetadata.totalTokens || 0), 0),
      lastActive: userSessions[0]?.sessionMetadata.lastActive || userPrefs.updatedAt
    }
  }

  // Cleanup on instance destruction
  destroy() {
    if (this.sessionCleanupInterval) {
      clearInterval(this.sessionCleanupInterval)
    }
  }
}

// ============================================
// SINGLETON EXPORT
// ============================================

export const personaSessionManager = PersonaSessionManager.getInstance()

// Convenience functions
export function createPersonaSession(
  sessionId: string,
  options?: {
    userId?: string | null
    chatMode?: 'formal' | 'casual' | null
    preferredPersonaId?: string | null
    isProject?: boolean
    ttlMinutes?: number
  }
) {
  return personaSessionManager.createSession(sessionId, options)
}

export function getPersonaSession(sessionId: string) {
  return personaSessionManager.getSession(sessionId)
}

export function updatePersonaSession(
  sessionId: string,
  updates: Partial<{
    chatMode: 'formal' | 'casual' | null
    preferredPersonaId: string | null
    currentWorkflowPhase: number | null
    totalMessages: number
    totalTokens: number
  }>
) {
  return personaSessionManager.updateSession(sessionId, updates)
}

export function setUserPersonaPreferences(
  userId: string,
  preferences: Partial<Omit<PersonaUserPreferences, 'userId' | 'createdAt' | 'updatedAt'>>
) {
  return personaSessionManager.setUserPreferences(userId, preferences)
}

export function getUserPersonaPreferences(userId: string) {
  return personaSessionManager.getUserPreferences(userId)
}