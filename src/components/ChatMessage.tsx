'use client'

import { ChatMessage as ChatMessageType } from '@/types'
import { ArtifactAttachment } from './ArtifactAttachment'
import { StreamingTextRenderer } from './StreamingTextRenderer'
import { MemoizedMarkdown } from './MemoizedMarkdown'
import { useChatStore } from '@/store/chat'
import { formatDistanceToNow } from 'date-fns'
import { id } from 'date-fns/locale'
import { useEffect, useState, useRef } from 'react'

interface ChatMessageProps {
  message: ChatMessageType
  isLast: boolean
  isStreaming?: boolean
}

export function ChatMessage({ message, isLast, isStreaming = false }: ChatMessageProps) {
  const { streamingState } = useChatStore()
  const [isVisible, setIsVisible] = useState(false)
  const [hasAppeared, setHasAppeared] = useState(false)
  const messageRef = useRef<HTMLDivElement>(null)
  const isUser = message.role === 'user'
  const isAssistant = message.role === 'assistant'
  
  // 🚀 SMOOTH MESSAGE APPEARANCE ANIMATION
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !hasAppeared) {
            setIsVisible(true)
            setHasAppeared(true)
            // Cleanup observer after first appearance
            observer.disconnect()
          }
        })
      },
      { threshold: 0.1, rootMargin: '20px' }
    )
    
    if (messageRef.current) {
      observer.observe(messageRef.current)
    }
    
    return () => observer.disconnect()
  }, [hasAppeared])
  
  // 🚀 DETERMINE IF THIS MESSAGE IS CURRENTLY STREAMING
  const isCurrentlyStreaming = isStreaming && 
    isAssistant && 
    isLast && 
    streamingState.currentlyStreamingMessageId === message.id
  
  return (
    <div 
      ref={messageRef}
      data-testid={`chat-message-${message.role}`}
      data-message-id={message.id}
      className={`smooth-transition ${
        isVisible ? 'message-appear' : 'opacity-0 translate-y-4'
      } ${isUser ? 'ml-8' : 'mr-8'}`}
    >
      <div className="flex gap-3">
        {/* Enhanced Avatar with Smooth Transitions */}
        <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center smooth-transition hover-lift state-indicator ${
          isUser 
            ? 'bg-primary text-primary-foreground' 
            : 'bg-secondary text-secondary-foreground'
        }`}>
          {isUser ? '👤' : '🤖'}
        </div>

        {/* Message Content */}
        <div className="flex-1 space-y-2">
          {/* Enhanced Message Header with Smooth Transitions */}
          <div className="flex items-center gap-2 text-sm">
            <span className="font-medium smooth-transition">
              {isUser ? 'Anda' : 'AI Assistant'}
            </span>
            {message.createdAt && (
              <span className="text-muted-foreground text-xs smooth-transition opacity-70 hover:opacity-100">
                {formatDistanceToNow(message.createdAt, { 
                  addSuffix: true, 
                  locale: id 
                })}
              </span>
            )}
          </div>

          {/* Message Text - Enhanced with Streaming Support */}
          <div className={`prose prose-sm max-w-none ${
            isUser 
              ? 'prose-blue' 
              : 'prose-slate dark:prose-invert'
          }`}>
            {isCurrentlyStreaming ? (
              // 🚀 STREAMING TEXT RENDERER for real-time streaming
              <StreamingTextRenderer
                messageId={message.id}
                finalText={message.parts ? 
                  message.parts
                    .filter(part => part.type === 'text')
                    .map(part => part.text)
                    .join('') :
                  message.content
                }
                isStreaming={true}
                enableMarkdown={true}
                className="streaming-text"
                onStreamingComplete={() => {
                  console.log(`[STREAMING COMPLETE] Message ${message.id}`)
                }}
              />
            ) : (
              // 🚀 STATIC MARKDOWN DISPLAY for completed messages with memoization
              <div 
                data-testid="message-complete" 
                className="text-reveal smooth-transition"
              >
                {message.parts ? (
                  message.parts.map((part, index) => {
                    if (part.type === 'text') {
                      return (
                        <MemoizedMarkdown
                          key={`${message.id}-part-${index}`}
                          id={`${message.id}-part-${index}`}
                          content={part.text || ''}
                        />
                      )
                    }
                    // Handle other part types (tool-call, tool-result, etc.)
                    return null
                  })
                ) : (
                  // Fallback to content for backward compatibility with markdown parsing
                  <MemoizedMarkdown
                    id={message.id}
                    content={message.content || ''}
                  />
                )}
              </div>
            )}
          </div>

          {/* Tool Invocations (for debugging/transparency) */}
          {message.toolInvocations && message.toolInvocations.length > 0 && (
            <div data-testid="tool-execution" className="space-y-2">
              {message.toolInvocations.map((invocation, index) => (
                <div 
                  key={index} 
                  data-testid="tool-message"
                  className="bg-secondary/50 rounded-lg p-3 text-sm smooth-transition hover-lift border border-border/20"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div className="font-medium text-primary smooth-transition">
                      🔧 {invocation.toolName}
                    </div>
                    <div className={`text-xs px-2 py-0.5 rounded-full state-indicator smooth-transition ${
                      invocation.state === 'result' ? 'bg-green-100 text-green-800' :
                      invocation.state === 'call' ? 'bg-blue-100 text-blue-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {invocation.state}
                    </div>
                  </div>
                  
                  {invocation.args && (
                    <div className="text-muted-foreground text-xs mb-2">
                      <strong>Input:</strong> {JSON.stringify(invocation.args, null, 2).slice(0, 200)}
                      {JSON.stringify(invocation.args).length > 200 && '...'}
                    </div>
                  )}
                  
                  {invocation.result && (
                    <div className="text-muted-foreground text-xs">
                      <strong>Output:</strong> {JSON.stringify(invocation.result, null, 2).slice(0, 200)}
                      {JSON.stringify(invocation.result).length > 200 && '...'}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Artifacts */}
          {message.artifacts && message.artifacts.length > 0 && (
            <div className="space-y-2">
              <div className="text-sm font-medium text-muted-foreground">
                Artefak Tersimpan:
              </div>
              <div className="space-y-2">
                {message.artifacts.map((artifact, index) => (
                  <div 
                    key={artifact.id} 
                    className="smooth-transition" 
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <ArtifactAttachment artifact={artifact} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}