'use client'

import { useChatStore } from '@/store/chat'
import { useEffect, useState, useRef } from 'react'
import { useTransitionQueue, TransitionPriority } from '@/hooks/useTransitionQueue'
import type { StreamingPhase } from '@/types'

export function LoadingIndicator() {
  const { loadingState, streamingState } = useChatStore()
  const [animationKey, setAnimationKey] = useState(0)
  const [phaseDuration, setPhaseDuration] = useState(0)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [displayPhase, setDisplayPhase] = useState<StreamingPhase | null>(null)
  const phaseChangeTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  
  // 🚀 TRANSITION QUEUE FOR SMOOTH STATE CHANGES
  const transitionQueue = useTransitionQueue({
    minTransitionDuration: 400, // Minimum time each phase displays
    maxQueueSize: 8,
    debounceMs: 100
  })

  // 🚀 SMOOTH PHASE TRANSITIONS WITH QUEUE MANAGEMENT
  useEffect(() => {
    if (loadingState.phase && loadingState.phase !== displayPhase) {
      // Add to transition queue with appropriate priority
      const priority = loadingState.phase === 'idle' ? TransitionPriority.HIGH :
                      loadingState.phase === 'text-streaming' ? TransitionPriority.NORMAL :
                      TransitionPriority.NORMAL
      
      transitionQueue.addToQueue(
        loadingState.phase, 
        loadingState.message,
        { 
          priority,
          minDuration: loadingState.phase === 'thinking' ? 800 : 400
        }
      )
      
      // Execute smooth transition
      transitionQueue.executeTransition((item) => {
        setIsTransitioning(true)
        
        // Clear any existing timeout
        if (phaseChangeTimeoutRef.current) {
          clearTimeout(phaseChangeTimeoutRef.current)
        }
        
        // Smooth fade-out current phase
        phaseChangeTimeoutRef.current = setTimeout(() => {
          setDisplayPhase(item.phase)
          setAnimationKey(prev => prev + 1)
          setPhaseDuration(0)
          
          // Fade-in new phase
          setTimeout(() => {
            setIsTransitioning(false)
          }, 150)
        }, 100)
      })
    }
  }, [loadingState.phase, loadingState.message, displayPhase, transitionQueue])

  // Update duration periodically
  useEffect(() => {
    if (loadingState.isLoading && loadingState.startTime) {
      const interval = setInterval(() => {
        setPhaseDuration(Date.now() - loadingState.startTime!)
      }, 100)
      
      return () => clearInterval(interval)
    }
  }, [loadingState.isLoading, loadingState.startTime])

  if (!loadingState.isLoading) return null

  const getPhaseIcon = (phase?: StreamingPhase) => {
    switch (phase || loadingState.type) {
      case 'thinking':
        return '🤔'
      case 'browsing':
        return '🌐'
      case 'tool-execution':
        return '🔧'
      case 'text-streaming':
        return '✍️'
      case 'processing':
        return '⚙️'
      case 'searching':
        return '🔍'
      default:
        return '🤖'
    }
  }

  const getPhaseColor = (phase?: StreamingPhase) => {
    switch (phase || loadingState.type) {
      case 'thinking':
        return 'text-blue-500'
      case 'browsing':
        return 'text-green-500'
      case 'tool-execution':
        return 'text-purple-500'
      case 'text-streaming':
        return 'text-orange-500'
      case 'processing':
        return 'text-indigo-500'
      case 'searching':
        return 'text-emerald-500'
      default:
        return 'text-primary'
    }
  }

  const getLoadingMessage = () => {
    if (loadingState.message) {
      return loadingState.message
    }
    
    switch (loadingState.phase || loadingState.type) {
      case 'thinking':
        return 'Agent sedang berpikir...'
      case 'browsing':
        return 'Agent menjelajah internet...'
      case 'tool-execution':
        return 'Agent menggunakan tool...'
      case 'text-streaming':
        return 'Agent menulis respons...'
      case 'processing':
        return 'Agent memproses data...'
      case 'searching':
        return 'Agent mencari informasi...'
      default:
        return 'Agent bekerja...'
    }
  }

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${Math.floor(ms)}ms`
    return `${(ms / 1000).toFixed(1)}s`
  }

  return (
    <div 
      data-testid="status-indicator" 
      data-phase={displayPhase || streamingState.currentPhase}
      className={`flex flex-col gap-2 text-sm smooth-transition ${
      isTransitioning ? 'phase-exit' : 'phase-enter'
    }`}>
      {/* 🚀 PRIMARY PHASE INDICATOR WITH SMOOTH TRANSITIONS */}
      <div 
        data-testid={`phase-${displayPhase || streamingState.currentPhase || 'unknown'}`}
        className="flex items-center gap-3"
      >
        {/* Enhanced Animated Phase Icon */}
        <div className={`text-lg state-indicator ${
          getPhaseColor(displayPhase || streamingState.currentPhase)
        } transition-all duration-300`}>
          <span 
            key={`${animationKey}-${displayPhase}`} 
            className={`inline-block ${
              isTransitioning ? 'opacity-50 scale-95' : 'opacity-100 scale-100'
            } smooth-transition-fast`}
            style={{
              animation: isTransitioning ? 'none' : 'bounce 1s infinite'
            }}
          >
            {getPhaseIcon(displayPhase || streamingState.currentPhase)}
          </span>
        </div>
        
        {/* Enhanced Phase Message with Smooth Transitions */}
        <div className="flex flex-col gap-1 flex-1">
          <span className={`font-medium text-foreground smooth-transition ${
            isTransitioning ? 'opacity-70' : 'opacity-100'
          }`}>
            {getLoadingMessage()}
          </span>
          
          {/* Duration and Progress */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>{formatDuration(phaseDuration)}</span>
            
            {/* Text Streaming Progress */}
            {streamingState.currentPhase === 'text-streaming' && streamingState.totalCharacters > 0 && (
              <>
                <span>•</span>
                <div className="flex items-center gap-1">
                  <div className="w-16 h-1 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary progress-smooth rounded-full"
                      style={{ 
                        width: `${Math.min(100, Math.max(0, 
                          (streamingState.streamedCharacters / streamingState.totalCharacters) * 100
                        ))}%` 
                      }}
                    />
                  </div>
                  <span className="text-xs">
                    {streamingState.streamedCharacters}/{streamingState.totalCharacters}
                  </span>
                </div>
              </>
            )}
            
            {/* General Progress Indicator */}
            {loadingState.progress !== undefined && streamingState.currentPhase !== 'text-streaming' && (
              <>
                <span>•</span>
                <div className="flex items-center gap-1">
                  <div className="w-12 h-1 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary progress-smooth rounded-full"
                      style={{ width: `${Math.min(100, Math.max(0, loadingState.progress))}%` }}
                    />
                  </div>
                  <span className="text-xs">{Math.round(loadingState.progress || 0)}%</span>
                </div>
              </>
            )}
          </div>
        </div>
        
        {/* Enhanced Loading Animation with GPU Acceleration */}
        <div className={`loading-dots-enhanced state-indicator ${
          isTransitioning ? 'opacity-50' : 'opacity-100'
        }`}>
          <span className="bg-current"></span>
          <span className="bg-current"></span>
          <span className="bg-current"></span>
        </div>
      </div>

      {/* 🚀 TOOL EXECUTION HISTORY (when tools are running) */}
      {streamingState.toolExecutionHistory.length > 0 && (
        <div className="pl-8 space-y-1">
          {streamingState.toolExecutionHistory.slice(-3).map((execution, index) => (
            <div 
              key={`${execution.tool}-${execution.startTime}`}
              className="flex items-center gap-2 text-xs text-muted-foreground smooth-transition"
            >
              <div className={`w-2 h-2 rounded-full state-indicator ${
                execution.status === 'running' ? 'bg-yellow-500 animate-pulse' :
                execution.status === 'success' ? 'bg-green-500' : 'bg-red-500'
              }`} />
              <span className="font-mono text-xs">{execution.tool}</span>
              <span className="text-muted-foreground">
                {execution.message}
              </span>
              {execution.duration && (
                <span className="text-muted-foreground ml-auto">
                  {formatDuration(execution.duration)}
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* 🚀 STREAMING SPEED INDICATOR (during text streaming) */}
      {streamingState.currentPhase === 'text-streaming' && (
        <div className="pl-8 flex items-center gap-2 text-xs text-muted-foreground">
          <span>Kecepatan:</span>
          <div className="flex items-center gap-1">
            {streamingState.streamingSpeed === 'slow' && '🐌 Lambat'}
            {streamingState.streamingSpeed === 'normal' && '⏩ Normal'}
            {streamingState.streamingSpeed === 'fast' && '⚡ Cepat'}
          </div>
          {streamingState.isPaused && (
            <span className="text-yellow-600 dark:text-yellow-400">⏸️ Dijeda</span>
          )}
        </div>
      )}
    </div>
  )
}

// Alternative compact loading indicator for inline use
export function CompactLoadingIndicator({ type }: { type?: 'thinking' | 'searching' | 'processing' }) {
  const getIcon = () => {
    switch (type) {
      case 'searching':
        return '🌐'
      case 'processing':
        return '⚙️'
      case 'thinking':
      default:
        return '🤔'
    }
  }

  return (
    <div className="inline-flex items-center gap-1 text-xs text-muted-foreground smooth-transition">
      <span className="smooth-transition-fast">{getIcon()}</span>
      <div className="loading-dots-enhanced text-xs">
        <span></span>
        <span></span>
        <span></span>
      </div>
    </div>
  )
}