'use client'

import { useAIChat } from '@/hooks/useAIChat'
import { useChatStore } from '@/store/chat'
import { useSidebarStore } from '@/store/sidebar'
import { ChatMessage } from './ChatMessage'
import { ChatInput } from './ChatInput'
import { LoadingIndicator } from './LoadingIndicator'
import { ChatModeIndicator, useChatModeStyles } from './ChatModeIndicator'
// 🚀 P07.3: PERSONA CONTEXT INTEGRATION
import { usePersonaContext, usePersonaIndicator } from '@/hooks/usePersonaContext'
import { PersonaErrorBoundary, PersonaAwareComponent } from '@/lib/ui/persona-adapters'
import { useEffect, useRef } from 'react'
import { type UIMessage } from '@ai-sdk/react'

// Helper function to extract content from UIMessage
function getMessageContent(message: UIMessage): string {
  if (!message.parts || message.parts.length === 0) {
    return ''
  }
  
  return message.parts
    .map(part => {
      if (part.type === 'text' && 'text' in part) {
        return part.text
      }
      return ''
    })
    .join('')
}

// Helper function to extract tool invocations
function getToolInvocations(message: UIMessage): any[] {
  if (!message.parts) return []
  
  return message.parts
    .filter(part => part.type === 'tool-call' || part.type === 'tool-result')
    .map(part => ({
      toolName: 'toolName' in part ? part.toolName : 'unknown',
      toolCallId: 'toolCallId' in part ? part.toolCallId : `call-${Date.now()}`,
      state: part.type === 'tool-call' ? 'call' : 'result',
      args: 'args' in part ? part.args : undefined,
      result: 'result' in part ? part.result : undefined,
    }))
}

// 🚀 P07.3: ENHANCED CHATAREA WITH PERSONA CONTEXT INTEGRATION
export function ChatArea() {
  const { currentSessionId } = useChatStore()
  const { isCollapsed } = useSidebarStore()
  const messagesEndRef = useRef<HTMLDivElement>(null)
  
  // 🚀 P07.3: PERSONA CONTEXT INTEGRATION
  const personaIndicator = usePersonaIndicator(currentSessionId)
  const { context: personaContext } = usePersonaContext(currentSessionId)
  
  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    isLoading,
    error,
    currentSession,
    streamingState,
    currentPhase,
    // 🚀 CHAT MODE CONTEXT - P01 PERSONA REVISION
    sessionChatMode,
    effectiveChatMode,
    isModeSet,
  } = useAIChat(currentSessionId)
  
  // 🚀 MODE-SPECIFIC STYLING
  const modeStyles = useChatModeStyles(effectiveChatMode)

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Get sidebar width for responsive layout
  const sidebarWidth = isCollapsed ? 'ml-12' : 'ml-80'

  // Show welcome message only when no session is active
  if (!currentSessionId) {
    return (
      <div className="flex flex-col h-full w-full max-w-4xl mx-auto px-6">
        <div className="flex items-center justify-center flex-1">
          <div className="text-center max-w-md mx-auto">
            <div className="mb-6">
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" className="mx-auto text-slate-600">
                <path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <h1 className="text-2xl font-bold mb-4">
              Selamat Datang di Makalah AI
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mb-6">
              Asisten AI untuk penulisan akademik dengan kemampuan streaming real-time. 
              Pilih percakapan dari sidebar atau buat chat baru untuk memulai.
            </p>
            <div className="text-sm text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-4 shadow-sm">
              <div className="font-medium mb-2">Fitur Utama:</div>
              <ul className="text-left space-y-1">
                <li>• Streaming AI responses dengan OpenRouter & OpenAI</li>
                <li>• Manajemen proyek akademik 8-fase</li>
                <li>• Sistem artefak dan sitasi otomatis</li>
                <li>• Riwayat percakapan dengan pencarian</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <PersonaErrorBoundary sessionId={currentSessionId}>
      <div 
        data-testid="chat-area" 
        className="flex flex-col h-full w-full max-w-4xl mx-auto px-6 relative"
        style={modeStyles}
      >

      {/* Messages Area - Full Height Container with Conditional Padding */}
      <div className="flex-1 overflow-hidden">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full min-h-0">
            <div className="text-center">
              <div className="mb-4">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" className="mx-auto text-slate-600">
                  <path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <h3 className="text-lg font-medium mb-2">
                Mulai percakapan baru
              </h3>
            </div>
            
            
            {/* Chat Input Positioned in Center */}
            <div className="w-full max-w-2xl">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm">
                <div className="p-3">
                  <ChatInput
                    input={input}
                    handleInputChange={handleInputChange}
                    handleSubmit={handleSubmit}
                    isLoading={isLoading}
                    disabled={!currentSessionId}
                  />
                </div>
              </div>
            </div>
            
            {/* Mode Toggle - Replaced with Interactive ChatModeIndicator */}
            <div className="w-full max-w-2xl mt-6">
              <div className="flex items-center justify-center gap-3 mb-4">
                <span className="text-sm text-slate-600 dark:text-slate-400">Mode Percakapan:</span>
                
                <ChatModeIndicator
                  mode={effectiveChatMode}
                  interactive={true}
                  size="md"
                  showLabel={true}
                  onClick={() => {
                    const { setCurrentChatMode } = useChatStore.getState()
                    const newMode = effectiveChatMode === 'formal' ? 'casual' : 'formal'
                    setCurrentChatMode(newMode)
                    
                    // Update session metadata if we have a current session
                    if (currentSessionId) {
                      const { updateSession } = useChatStore.getState()
                      const currentMetadata = useChatStore.getState().sessions
                        .find(s => s.id === currentSessionId)?.metadata || {}
                      updateSession(currentSessionId, {
                        metadata: {
                          ...currentMetadata,
                          chatMode: newMode
                        }
                      })
                    }
                  }}
                  className="transition-all duration-200"
                />
                
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  (klik untuk toggle)
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="h-full overflow-y-auto scroll-smooth py-4">
            <div className="space-y-4 pb-4">
              {messages.map((message, index) => {
                const isLastMessage = index === messages.length - 1
                const isAssistantMessage = message.role === 'assistant'
                const isCurrentlyStreaming = isLoading && isLastMessage && isAssistantMessage && currentPhase === 'text-streaming'
                
                return (
                  <ChatMessage
                    key={message.id || index}
                    message={{
                      id: message.id || `msg-${index}`,
                      role: message.role as 'user' | 'assistant' | 'system' | 'tool',
                      content: getMessageContent(message),
                      createdAt: new Date(),
                      parts: message.parts || [],
                      toolInvocations: getToolInvocations(message),
                    }}
                    isLast={isLastMessage}
                    isStreaming={isCurrentlyStreaming}
                  />
                )
              })}
              <div ref={messagesEndRef} />
            </div>
          </div>
        )}
      </div>

      {/* Chat Input Area - Only show at bottom when there are messages */}
      {messages.length > 0 && (
        <div className="flex-shrink-0 py-4 border-t border-slate-200 dark:border-slate-700">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm">
            <div className="p-3">
              <ChatInput
                input={input}
                handleInputChange={handleInputChange}
                handleSubmit={handleSubmit}
                isLoading={isLoading}
                disabled={!currentSessionId}
              />
            </div>
            
            {/* Mode Indicator - Interactive Mode Switcher */}
            <div className="px-3 pb-2 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500 dark:text-slate-400">Mode:</span>
                <div className="flex items-center gap-2">
                  <ChatModeIndicator
                    mode={effectiveChatMode}
                    interactive={true}
                    size="sm"
                    showLabel={true}
                    onClick={() => {
                      const { setCurrentChatMode } = useChatStore.getState()
                      const newMode = effectiveChatMode === 'formal' ? 'casual' : 'formal'
                      setCurrentChatMode(newMode)
                      
                      // Update session metadata if we have a current session
                      if (currentSessionId) {
                        const { updateSession } = useChatStore.getState()
                        const currentMetadata = useChatStore.getState().sessions
                          .find(s => s.id === currentSessionId)?.metadata || {}
                        updateSession(currentSessionId, {
                          metadata: {
                            ...currentMetadata,
                            chatMode: newMode
                          }
                        })
                      }
                    }}
                    className="transition-all duration-200"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
    </PersonaErrorBoundary>
  )
}