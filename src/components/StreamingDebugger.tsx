'use client'

import { useState, useEffect } from 'react'
import { useChatStore } from '@/store/chat'

interface StreamEvent {
  timestamp: string
  type: string
  data?: any
  duration?: number
}

export function StreamingDebugger() {
  const [isVisible, setIsVisible] = useState(false)
  const [events, setEvents] = useState<StreamEvent[]>([])
  const [isRecording, setIsRecording] = useState(true)
  const { loadingState } = useChatStore()

  // Listen to streaming events (would be connected to actual AI SDK events)
  useEffect(() => {
    if (!isRecording) return

    // Simulate streaming events for demonstration
    const handleStreamEvent = (event: StreamEvent) => {
      setEvents(prev => [event, ...prev.slice(0, 49)]) // Keep last 50 events
    }

    // Example event simulation
    if (loadingState.isLoading) {
      const event: StreamEvent = {
        timestamp: new Date().toISOString(),
        type: loadingState.type === 'searching' ? 'tool-execution' : 'text-generation',
        data: {
          message: loadingState.message,
          toolName: loadingState.type === 'searching' ? 'web_search' : null
        }
      }
      handleStreamEvent(event)
    }

    return () => {
      // Cleanup if needed
    }
  }, [loadingState, isRecording])

  const clearEvents = () => {
    setEvents([])
  }

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'text-start': return '📝'
      case 'text-delta': return '✍️'
      case 'text-end': return '✅'
      case 'tool-execution': return '🔧'
      case 'tool-input-start': return '⚙️'
      case 'tool-output-available': return '📤'
      case 'error': return '❌'
      case 'finish': return '🏁'
      default: return '📡'
    }
  }

  const getEventColor = (type: string) => {
    switch (type) {
      case 'text-start':
      case 'text-delta':
      case 'text-end':
        return 'text-blue-600 dark:text-blue-400'
      case 'tool-execution':
      case 'tool-input-start':
      case 'tool-output-available':
        return 'text-green-600 dark:text-green-400'
      case 'error':
        return 'text-red-600 dark:text-red-400'
      case 'finish':
        return 'text-purple-600 dark:text-purple-400'
      default:
        return 'text-gray-600 dark:text-gray-400'
    }
  }

  if (!isVisible) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <button
          onClick={() => setIsVisible(true)}
          className="bg-primary text-primary-foreground p-2 rounded-full shadow-lg hover:bg-primary/90 transition-colors"
          title="Buka Streaming Debugger"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M7 8h10M7 12h4M7 16h1M17 16h1M17 12h1"/>
          </svg>
        </button>
      </div>
    )
  }

  return (
    <div className="fixed bottom-4 right-4 w-96 bg-card border border-border rounded-lg shadow-xl z-50 max-h-96">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="text-lg">📡</div>
          <div>
            <h3 className="font-medium text-sm">Streaming Debugger</h3>
            <p className="text-xs text-muted-foreground">
              SSE Event Monitor • {events.length} events
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsRecording(!isRecording)}
            className={`p-1 rounded text-xs transition-colors ${
              isRecording 
                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                : 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
            }`}
            title={isRecording ? 'Stop Recording' : 'Start Recording'}
          >
            {isRecording ? '⏸️' : '▶️'}
          </button>
          
          <button
            onClick={clearEvents}
            className="p-1 rounded text-xs bg-secondary hover:bg-secondary/80 transition-colors"
            title="Clear Events"
          >
            🗑️
          </button>
          
          <button
            onClick={() => setIsVisible(false)}
            className="p-1 rounded text-xs hover:bg-secondary transition-colors"
            title="Close"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Current Status */}
      {loadingState.isLoading && (
        <div className="p-3 bg-primary/5 border-b border-border">
          <div className="flex items-center gap-2 text-sm">
            <div className="animate-pulse">
              {loadingState.type === 'searching' ? '🌐' : '🤔'}
            </div>
            <div className="font-medium text-primary">
              {loadingState.message || `Agent ${loadingState.type}`}
            </div>
          </div>
        </div>
      )}

      {/* Events List */}
      <div className="flex-1 overflow-y-auto max-h-64">
        {events.length === 0 ? (
          <div className="p-4 text-center text-muted-foreground">
            <div className="text-2xl mb-2">📡</div>
            <p className="text-sm">Tidak ada streaming events</p>
            <p className="text-xs mt-1">
              Events akan muncul saat AI streaming aktif
            </p>
          </div>
        ) : (
          <div className="space-y-1 p-2">
            {events.map((event, index) => (
              <div
                key={index}
                className="flex items-start gap-2 p-2 rounded-md hover:bg-secondary/50 text-xs"
              >
                <div className="text-base">
                  {getEventIcon(event.type)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`font-medium ${getEventColor(event.type)}`}>
                      {event.type}
                    </span>
                    <span className="text-muted-foreground">
                      {new Date(event.timestamp).toLocaleTimeString('id-ID')}
                    </span>
                  </div>
                  
                  {event.data && (
                    <div className="text-muted-foreground text-xs">
                      <pre className="whitespace-pre-wrap font-mono text-xs">
                        {JSON.stringify(event.data, null, 2).slice(0, 200)}
                        {JSON.stringify(event.data).length > 200 && '...'}
                      </pre>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-2 border-t border-border text-xs text-muted-foreground text-center">
        AI SDK v5 Streaming • Real-time SSE Monitor
      </div>
    </div>
  )
}