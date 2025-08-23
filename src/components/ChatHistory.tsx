'use client'

import { useChatStore } from '@/store/chat'
import { formatDistanceToNow } from 'date-fns'
import { id } from 'date-fns/locale'
import { useState, useEffect } from 'react'
import { generateText } from 'ai'
import { providerRegistry } from '@/lib/providers'
import { ChatModeIndicator } from './ChatModeIndicator'

export function ChatHistory() {
  const { 
    sessions, 
    currentSessionId, 
    setCurrentSession, 
    deleteSession,
    currentProject,
    updateSession
  } = useChatStore()
  
  const [generatingTitleFor, setGeneratingTitleFor] = useState<string | null>(null)

  // Generate natural titles for sessions without custom titles
  const generateNaturalTitle = async (sessionId: string) => {
    const session = sessions.find(s => s.id === sessionId)
    if (!session || session.messages.length === 0 || generatingTitleFor === sessionId) return
    
    // Skip if already has a custom title (not default)
    if (session.title !== `Chat ${session.id.slice(0, 8)}`) return
    
    setGeneratingTitleFor(sessionId)
    
    try {
      const firstMessages = session.messages.slice(0, 3)
      const conversationContext = firstMessages
        .map(m => `${m.role}: ${m.content.substring(0, 200)}`)
        .join('\n')
      
      const model = await providerRegistry.getAvailableModel()
      
      const result = await generateText({
        model,
        prompt: `Buatlah judul singkat dan deskriptif untuk percakapan berikut dalam bahasa Indonesia. 
        Judul maksimal 50 karakter, fokus pada topik utama yang dibahas.
        
        Percakapan:
        ${conversationContext}
        
        Judul percakapan:`,
        temperature: 0.3,
      })
      
      const naturalTitle = result.text.trim().replace(/^["']|["']$/g, '') // Remove quotes
      
      if (naturalTitle && naturalTitle.length > 0) {
        updateSession(sessionId, { title: naturalTitle })
      }
    } catch (error) {
      console.error('Failed to generate natural title:', error)
    } finally {
      setGeneratingTitleFor(null)
    }
  }

  // Auto-generate titles for sessions with enough messages
  useEffect(() => {
    const sessionsNeedingTitles = sessions.filter(session => 
      session.messages.length >= 2 && 
      session.title === `Chat ${session.id.slice(0, 8)}` &&
      generatingTitleFor !== session.id
    )
    
    // Generate titles with delay to avoid overwhelming the API
    sessionsNeedingTitles.forEach((session, index) => {
      setTimeout(() => {
        generateNaturalTitle(session.id)
      }, index * 2000) // 2 second delay between generations
    })
  }, [sessions.length])

  // Filter sessions based on current project context
  const filteredSessions = sessions.filter(session => {
    if (currentProject) {
      return session.isProject && session.projectId === currentProject.id
    }
    return !session.isProject
  })

  const handleSessionClick = (sessionId: string) => {
    setCurrentSession(sessionId)
  }

  const handleDeleteSession = (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (confirm('Yakin ingin menghapus percakapan ini?')) {
      deleteSession(sessionId)
    }
  }

  if (filteredSessions.length === 0) {
    return (
      <div className="p-4 text-center text-slate-500 dark:text-slate-400">
        <div className="mb-2 text-2xl">💬</div>
        <p className="text-sm">
          {currentProject 
            ? 'Belum ada percakapan dalam proyek ini'
            : 'Belum ada riwayat percakapan'
          }
        </p>
        <p className="text-xs mt-1">
          Mulai chat baru untuk memulai percakapan
        </p>
      </div>
    )
  }

  return (
    <div className="p-3">
      <div className="space-y-1">
        {filteredSessions.map((session) => (
          <div
            key={session.id}
            onClick={() => handleSessionClick(session.id)}
            className={`group p-3 rounded-lg cursor-pointer transition-colors ${
              currentSessionId === session.id
                ? 'bg-primary/10 border border-primary/20'
                : 'hover:bg-secondary/70 border border-transparent'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-sm truncate mb-1 flex items-center gap-2">
                  {session.title}
                  {generatingTitleFor === session.id && (
                    <div className="animate-spin w-3 h-3 border border-primary border-t-transparent rounded-full"></div>
                  )}
                  {session.metadata?.chatMode && (
                    <ChatModeIndicator 
                      mode={session.metadata.chatMode}
                      size="sm"
                      showLabel={false}
                    />
                  )}
                </h4>
                
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                  <span>
                    {formatDistanceToNow(session.updatedAt, { 
                      addSuffix: true, 
                      locale: id 
                    })}
                  </span>
                  
                  {session.isProject && (
                    <span className="px-1.5 py-0.5 bg-primary/20 text-primary rounded text-xs">
                      Proyek
                    </span>
                  )}
                </div>
                
                <div className="text-xs text-muted-foreground">
                  {session.messages.length} pesan
                  {session.metadata?.totalTokens && (
                    <span> • {session.metadata.totalTokens} token</span>
                  )}
                </div>

                {/* Last message preview */}
                {session.messages.length > 0 && (
                  <div className="text-xs text-muted-foreground mt-2 line-clamp-2">
                    {session.messages[session.messages.length - 1].content.substring(0, 80)}
                    {session.messages[session.messages.length - 1].content.length > 80 && '...'}
                  </div>
                )}
              </div>

              <div className="flex items-start gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-2">
                <button
                  onClick={(e) => handleDeleteSession(session.id, e)}
                  className="p-1 rounded hover:bg-destructive hover:text-destructive-foreground transition-colors"
                  title="Hapus percakapan"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c0-1 1-2 2-2v2"/>
                  </svg>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}