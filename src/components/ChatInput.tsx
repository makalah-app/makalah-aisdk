'use client'

import { useState, useRef, useEffect } from 'react'
import { useChatStore } from '@/store/chat'

interface ChatInputProps {
  input: string
  handleInputChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void
  handleSubmit: (e: React.FormEvent) => void
  isLoading: boolean
  disabled?: boolean
}

export function ChatInput({
  input,
  handleInputChange,
  handleSubmit,
  isLoading,
  disabled = false
}: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const { currentSessionId, sessions } = useChatStore()
  
  const currentSession = currentSessionId ? sessions.find(s => s.id === currentSessionId) : null
  const hasMessages = (currentSession?.messages?.length || 0) > 0

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = 'auto'
      const newHeight = Math.min(textarea.scrollHeight, 120) // Max 5 lines
      textarea.style.height = `${newHeight}px`
    }
  }, [input])

  // Focus on textarea when session changes
  useEffect(() => {
    if (currentSessionId && !isLoading) {
      textareaRef.current?.focus()
    }
  }, [currentSessionId, isLoading])

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading || disabled) return
    handleSubmit(e)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      onSubmit(e as any)
    }
  }

  return (
    <form onSubmit={onSubmit} className="relative">
      {/* Input Field - AI SDK Cookbook Style */}
      <div className="relative">
        <textarea
          data-testid="chat-input"
          ref={textareaRef}
          value={input}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder={
            disabled 
              ? "Pilih percakapan untuk mulai mengetik..." 
              : isLoading
              ? "AI sedang berpikir..."
              : "Ketik pesan Anda di sini..."
          }
          disabled={disabled || isLoading}
          className="w-full p-3 pr-12 bg-transparent border-none outline-none resize-none min-h-[52px] max-h-[120px] placeholder:text-muted-foreground text-sm"
          rows={1}
        />
        
        {/* Submit Button */}
        <div className="absolute right-2 bottom-2">
          <button
            data-testid="send-button"
            type="submit"
            disabled={!input.trim() || isLoading || disabled}
            className="p-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="Kirim pesan (Enter)"
          >
            {isLoading ? (
              <div className="loading-dots">
                <span></span>
                <span></span>
                <span></span>
              </div>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/>
              </svg>
            )}
          </button>
        </div>
      </div>
      
      {/* Input Hints */}
      <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground px-1">
        <div className="flex items-center gap-4">
          <span>Enter untuk kirim</span>
          <span>Shift+Enter untuk baris baru</span>
        </div>
        
        {currentSession && (
          <div className="flex items-center gap-2">
            {currentSession.isProject && (
              <span className="bg-primary/10 text-primary px-2 py-0.5 rounded text-xs">
                Proyek
              </span>
            )}
            <span>{currentSession.messages.length} pesan</span>
          </div>
        )}
      </div>
    </form>
  )
}