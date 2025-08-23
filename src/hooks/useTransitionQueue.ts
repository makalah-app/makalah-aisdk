'use client'

import { useRef, useCallback, useEffect } from 'react'
import type { StreamingPhase } from '@/types'

interface TransitionQueueItem {
  phase: StreamingPhase
  message?: string
  timestamp: number
  minDuration?: number
  priority?: 'low' | 'normal' | 'high'
}

interface UseTransitionQueueOptions {
  minTransitionDuration?: number
  maxQueueSize?: number
  debounceMs?: number
}

export function useTransitionQueue(options: UseTransitionQueueOptions = {}) {
  const {
    minTransitionDuration = 300,
    maxQueueSize = 5,
    debounceMs = 50
  } = options

  const queueRef = useRef<TransitionQueueItem[]>([])
  const currentTransitionRef = useRef<TransitionQueueItem | null>(null)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const processingRef = useRef(false)

  // 🚀 PERFORMANCE OPTIMIZED QUEUE PROCESSING
  const processQueue = useCallback(() => {
    if (processingRef.current || queueRef.current.length === 0) {
      return
    }

    processingRef.current = true
    const now = Date.now()
    
    // Get highest priority item or first item
    const nextItemIndex = queueRef.current.findIndex((item, index) => {
      if (item.priority === 'high') return true
      if (item.priority === 'normal' && index === 0) return true
      if (item.priority === 'low' && index === 0 && queueRef.current.length === 1) return true
      return false
    }) || 0

    const nextItem = queueRef.current[nextItemIndex]
    if (!nextItem) {
      processingRef.current = false
      return
    }

    // Check minimum duration for current transition
    if (currentTransitionRef.current) {
      const elapsed = now - currentTransitionRef.current.timestamp
      const minDuration = currentTransitionRef.current.minDuration || minTransitionDuration
      
      if (elapsed < minDuration) {
        // Wait for minimum duration
        timeoutRef.current = setTimeout(() => {
          processQueue()
        }, minDuration - elapsed)
        processingRef.current = false
        return
      }
    }

    // Remove item from queue
    queueRef.current.splice(nextItemIndex, 1)
    currentTransitionRef.current = nextItem
    
    // Process the transition
    return nextItem
  }, [minTransitionDuration])

  // 🚀 DEBOUNCED QUEUE ADDITION
  const addToQueue = useCallback((
    phase: StreamingPhase,
    message?: string,
    options?: {
      minDuration?: number
      priority?: 'low' | 'normal' | 'high'
      replace?: boolean
    }
  ) => {
    const item: TransitionQueueItem = {
      phase,
      message,
      timestamp: Date.now(),
      minDuration: options?.minDuration,
      priority: options?.priority || 'normal'
    }

    // Replace mode: clear queue and set immediately
    if (options?.replace) {
      queueRef.current = [item]
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
      currentTransitionRef.current = item
      return item
    }

    // Prevent duplicate consecutive phases
    const lastItem = queueRef.current[queueRef.current.length - 1]
    if (lastItem?.phase === phase) {
      // Update message if different
      if (message && lastItem.message !== message) {
        lastItem.message = message
        lastItem.timestamp = Date.now()
      }
      return lastItem
    }

    // Prevent queue overflow
    if (queueRef.current.length >= maxQueueSize) {
      // Remove oldest low-priority item
      const lowPriorityIndex = queueRef.current.findIndex(item => item.priority === 'low')
      if (lowPriorityIndex !== -1) {
        queueRef.current.splice(lowPriorityIndex, 1)
      } else {
        queueRef.current.shift() // Remove oldest item
      }
    }

    queueRef.current.push(item)
    return item
  }, [maxQueueSize])

  // 🚀 SMOOTH TRANSITION EXECUTOR
  const executeTransition = useCallback((callback: (item: TransitionQueueItem) => void) => {
    const item = processQueue()
    if (item) {
      // Use RAF for smooth transitions
      requestAnimationFrame(() => {
        callback(item)
        processingRef.current = false
        
        // Continue processing queue after debounce
        if (queueRef.current.length > 0) {
          timeoutRef.current = setTimeout(processQueue, debounceMs)
        }
      })
    } else {
      processingRef.current = false
    }
  }, [processQueue, debounceMs])

  // 🚀 QUEUE STATE GETTERS
  const getQueueStatus = useCallback(() => ({
    queueLength: queueRef.current.length,
    currentTransition: currentTransitionRef.current,
    isProcessing: processingRef.current,
    hasHighPriority: queueRef.current.some(item => item.priority === 'high')
  }), [])

  // 🚀 QUEUE MANAGEMENT
  const clearQueue = useCallback(() => {
    queueRef.current = []
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
    processingRef.current = false
  }, [])

  const pauseQueue = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
    processingRef.current = true
  }, [])

  const resumeQueue = useCallback(() => {
    processingRef.current = false
    if (queueRef.current.length > 0) {
      timeoutRef.current = setTimeout(processQueue, debounceMs)
    }
  }, [processQueue, debounceMs])

  // 🚀 CLEANUP
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  return {
    addToQueue,
    executeTransition,
    getQueueStatus,
    clearQueue,
    pauseQueue,
    resumeQueue
  }
}

// 🚀 TRANSITION TIMING UTILITIES
export const TransitionTiming = {
  FAST: 150,
  NORMAL: 300,
  SLOW: 500,
  SMOOTH: 200
} as const

// 🚀 PRIORITY LEVELS
export const TransitionPriority = {
  LOW: 'low' as const,
  NORMAL: 'normal' as const,
  HIGH: 'high' as const
} as const