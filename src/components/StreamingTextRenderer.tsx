'use client'

import { useEffect, useState, useRef, useMemo, useCallback } from 'react'
import { useChatStore } from '@/store/chat'
import { StreamingMemoizedMarkdown } from './MemoizedMarkdown'

interface StreamingTextRendererProps {
  messageId: string
  finalText: string
  isStreaming: boolean
  onStreamingComplete?: () => void
  enableMarkdown?: boolean
  className?: string
}

export function StreamingTextRenderer({
  messageId,
  finalText,
  isStreaming,
  onStreamingComplete,
  enableMarkdown = false,
  className = ''
}: StreamingTextRendererProps) {
  const { 
    streamingState, 
    setStreamingSpeed, 
    pauseTextStreaming, 
    resumeTextStreaming,
    completeTextStreaming 
  } = useChatStore()
  
  const [displayedText, setDisplayedText] = useState('')
  const [currentCharIndex, setCurrentCharIndex] = useState(0)
  const [showCursor, setShowCursor] = useState(true)
  const [isRevealing, setIsRevealing] = useState(false)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const requestRef = useRef<number | null>(null)
  const rafRef = useRef<number | null>(null)
  const performanceRef = useRef({ lastFrame: 0, frameCount: 0 })
  
  // 🚀 STREAMING SPEED CONFIGURATION
  const streamingDelayMs = useMemo(() => {
    switch (streamingState.streamingSpeed) {
      case 'fast': return 10
      case 'slow': return 80
      case 'normal':
      default: return 30
    }
  }, [streamingState.streamingSpeed])

  // 🚀 WORD BOUNDARY DETECTION FOR NATURAL BREAKS
  const isWordBoundary = (text: string, index: number): boolean => {
    if (index >= text.length) return true
    const char = text[index]
    const prevChar = index > 0 ? text[index - 1] : ''
    
    // Natural pause points
    return (
      char === ' ' ||
      char === '\n' ||
      char === '.' ||
      char === ',' ||
      char === '!' ||
      char === '?' ||
      char === ':' ||
      char === ';' ||
      (prevChar === ' ' && /[A-Z]/.test(char)) // Start of new sentence
    )
  }

  // 🚀 PERFORMANCE-OPTIMIZED STREAMING WITH RAF
  const streamNextChunk = useCallback(() => {
    if (!isStreaming || streamingState.isPaused) return
    
    const now = performance.now()
    const deltaTime = now - performanceRef.current.lastFrame
    
    // Target 60fps with adaptive timing
    if (deltaTime >= 16.67) { // ~60fps
      setCurrentCharIndex(prevIndex => {
        if (prevIndex >= finalText.length) {
          setDisplayedText(finalText)
          setIsRevealing(false)
          completeTextStreaming()
          onStreamingComplete?.()
          return prevIndex
        }
        
        const nextIndex = Math.min(prevIndex + 1, finalText.length)
        const newDisplayedText = finalText.slice(0, nextIndex)
        setDisplayedText(newDisplayedText)
        
        performanceRef.current.lastFrame = now
        performanceRef.current.frameCount++
        
        return nextIndex
      })
    }
    
    // Continue streaming with RAF for smooth 60fps
    if (currentCharIndex < finalText.length) {
      const delay = isWordBoundary(finalText, currentCharIndex + 1) 
        ? streamingDelayMs * 1.5 
        : streamingDelayMs
      
      intervalRef.current = setTimeout(() => {
        rafRef.current = requestAnimationFrame(streamNextChunk)
      }, delay)
    }
  }, [
    isStreaming,
    finalText,
    currentCharIndex,
    streamingDelayMs,
    streamingState.isPaused,
    completeTextStreaming,
    onStreamingComplete
  ])

  // 🚀 ENHANCED STREAMING CONTROLLER
  useEffect(() => {
    if (!isStreaming || streamingState.isPaused || currentCharIndex >= finalText.length) {
      if (intervalRef.current) {
        clearTimeout(intervalRef.current)
        intervalRef.current = null
      }
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
      
      // Complete streaming when done
      if (currentCharIndex >= finalText.length && isStreaming) {
        setDisplayedText(finalText)
        setIsRevealing(false)
        completeTextStreaming()
        onStreamingComplete?.()
      }
      return
    }

    setIsRevealing(true)
    performanceRef.current.lastFrame = performance.now()
    
    // Start RAF-based streaming
    rafRef.current = requestAnimationFrame(streamNextChunk)

    return () => {
      if (intervalRef.current) {
        clearTimeout(intervalRef.current)
        intervalRef.current = null
      }
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
    }
  }, [
    isStreaming, 
    finalText, 
    currentCharIndex, 
    streamingDelayMs, 
    streamingState.isPaused,
    streamNextChunk
  ])

  // 🚀 SMOOTH CURSOR ANIMATION WITH GPU ACCELERATION
  useEffect(() => {
    if (isStreaming) {
      setShowCursor(true)
      const cursorInterval = setInterval(() => {
        setShowCursor(prev => !prev)
      }, 600) // Slightly slower for more natural feel
      
      return () => clearInterval(cursorInterval)
    } else {
      setShowCursor(false)
    }
  }, [isStreaming])

  // 🚀 ENHANCED CLEANUP WITH PERFORMANCE MONITORING
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearTimeout(intervalRef.current)
      }
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current)
      }
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current)
      }
      
      // Performance logging for development
      if (process.env.NODE_ENV === 'development' && performanceRef.current.frameCount > 0) {
        const avgFps = performanceRef.current.frameCount / ((performance.now() - performanceRef.current.lastFrame) / 1000)
        console.log(`StreamingTextRenderer Performance: ${avgFps.toFixed(1)} fps average`)
      }
    }
  }, [])

  // 🚀 SMOOTH SKIP TO END WITH TRANSITION
  const handleSkipToEnd = useCallback(() => {
    // Clear all ongoing animations
    if (intervalRef.current) {
      clearTimeout(intervalRef.current)
      intervalRef.current = null
    }
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
    
    setIsRevealing(false)
    setDisplayedText(finalText)
    setCurrentCharIndex(finalText.length)
    completeTextStreaming()
    onStreamingComplete?.()
  }, [finalText, completeTextStreaming, onStreamingComplete])

  // 🚀 SMOOTH SPEED CONTROL WITH TRANSITION FEEDBACK
  const handleSpeedChange = useCallback((speed: 'fast' | 'normal' | 'slow') => {
    setStreamingSpeed(speed)
    // Visual feedback for speed change
    const element = document.querySelector('.streaming-controls')
    if (element) {
      element.classList.add('speed-change-feedback')
      setTimeout(() => {
        element.classList.remove('speed-change-feedback')
      }, 300)
    }
  }, [setStreamingSpeed])

  // 🚀 SMOOTH PAUSE/RESUME WITH VISUAL FEEDBACK
  const handleTogglePause = useCallback(() => {
    if (streamingState.isPaused) {
      resumeTextStreaming()
    } else {
      pauseTextStreaming()
    }
  }, [streamingState.isPaused, resumeTextStreaming, pauseTextStreaming])

  // 🚀 RENDER MARKDOWN OR PLAIN TEXT with proper parsing
  const renderText = () => {
    if (enableMarkdown) {
      // Use proper markdown parsing with memoization for performance
      return (
        <div className={`${className}`}>
          <StreamingMemoizedMarkdown
            content={displayedText}
            id={`${messageId}-streaming`}
            isStreaming={isStreaming}
          />
        </div>
      )
    }
    
    return (
      <div data-testid="streaming-text" className={`whitespace-pre-wrap break-words text-reveal smooth-transition ${className}`}>
        {displayedText}
      </div>
    )
  }

  return (
    <div data-testid="streaming-text-container" className="relative">
      {/* 🚀 ENHANCED STREAMING CONTROLS WITH SMOOTH TRANSITIONS */}
      {isStreaming && (
        <div className="streaming-controls absolute top-0 right-0 flex items-center gap-1 text-xs opacity-70 hover:opacity-100 smooth-transition hover-lift backdrop-smooth">
          {/* Enhanced Speed Controls with Visual Feedback */}
          <div className="flex items-center gap-1 bg-background/90 backdrop-blur-md rounded-md px-2 py-1 border border-border/20 shadow-sm hover-lift">
            <button
              data-testid="speed-slow"
              onClick={() => handleSpeedChange('slow')}
              className={`px-2 py-1 rounded-md text-xs smooth-transition state-indicator hover-lift ${
                streamingState.streamingSpeed === 'slow' 
                  ? 'bg-primary text-primary-foreground shadow-sm' 
                  : 'hover:bg-muted/80'
              }`}
              title="Lambat"
            >
              🐌
            </button>
            <button
              data-testid="speed-normal"
              onClick={() => handleSpeedChange('normal')}
              className={`px-2 py-1 rounded-md text-xs smooth-transition state-indicator hover-lift ${
                streamingState.streamingSpeed === 'normal' 
                  ? 'bg-primary text-primary-foreground shadow-sm' 
                  : 'hover:bg-muted/80'
              }`}
              title="Normal"
            >
              ⏩
            </button>
            <button
              data-testid="speed-fast"
              onClick={() => handleSpeedChange('fast')}
              className={`px-2 py-1 rounded-md text-xs smooth-transition state-indicator hover-lift ${
                streamingState.streamingSpeed === 'fast' 
                  ? 'bg-primary text-primary-foreground shadow-sm' 
                  : 'hover:bg-muted/80'
              }`}
              title="Cepat"
            >
              ⚡
            </button>
          </div>
          
          {/* Enhanced Pause/Resume with Smooth Feedback */}
          <button
            data-testid={streamingState.isPaused ? "resume-streaming" : "pause-streaming"}
            onClick={handleTogglePause}
            className={`px-2 py-1 bg-background/90 backdrop-blur-md rounded-md hover:bg-muted/80 text-xs smooth-transition hover-lift border border-border/20 shadow-sm state-indicator ${
              streamingState.isPaused ? 'bg-yellow-500/20 border-yellow-500/30' : ''
            }`}
            title={streamingState.isPaused ? "Lanjutkan" : "Jeda"}
          >
            {streamingState.isPaused ? '▶️' : '⏸️'}
          </button>
          
          {/* Enhanced Skip to End */}
          <button
            data-testid="skip-streaming"
            onClick={handleSkipToEnd}
            className="px-2 py-1 bg-background/90 backdrop-blur-md rounded-md hover:bg-muted/80 text-xs smooth-transition hover-lift border border-border/20 shadow-sm"
            title="Langsung selesai"
          >
            ⏭️
          </button>
        </div>
      )}

      {/* 🚀 TEXT CONTENT WITH CURSOR */}
      <div className="relative">
        {renderText()}
        
        {/* Enhanced Smooth Typing Cursor */}
        {isStreaming && (
          <span 
            className={`inline-block w-0.5 h-4 bg-primary ml-0.5 cursor-smooth will-change-opacity ${
              showCursor ? 'opacity-100' : 'opacity-0'
            } ${isRevealing ? 'animate-pulse' : ''}`}
          />
        )}
      </div>

      {/* 🚀 STREAMING PROGRESS INDICATOR */}
      {isStreaming && (
        <div className="mt-1 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden shadow-inner">
              <div 
                className="h-full bg-gradient-to-r from-primary to-primary/80 progress-smooth rounded-full relative"
                style={{ 
                  width: `${finalText.length > 0 
                    ? (currentCharIndex / finalText.length) * 100 
                    : 0}%` 
                }}
              >
                {/* Progress glow effect */}
                <div className="absolute top-0 right-0 w-1 h-full bg-primary/50 rounded-full animate-pulse" />
              </div>
            </div>
            <span className="text-xs">
              {currentCharIndex}/{finalText.length}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

// 🚀 COMPACT VERSION FOR INLINE USE
export function CompactStreamingTextRenderer({
  text,
  isStreaming,
  className = ''
}: {
  text: string
  isStreaming: boolean
  className?: string
}) {
  const [displayedText, setDisplayedText] = useState('')
  const [charIndex, setCharIndex] = useState(0)
  
  useEffect(() => {
    if (!isStreaming) {
      setDisplayedText(text)
      return
    }
    
    if (charIndex < text.length) {
      const timeout = setTimeout(() => {
        setDisplayedText(prev => prev + text[charIndex])
        setCharIndex(prev => prev + 1)
      }, 20)
      
      return () => clearTimeout(timeout)
    }
  }, [text, isStreaming, charIndex])
  
  return (
    <span className={`smooth-transition ${className} ${isStreaming ? 'text-reveal' : ''}`}>
      {displayedText}
      {isStreaming && charIndex < text.length && (
        <span className="cursor-smooth opacity-80">|</span>
      )}
    </span>
  )
}