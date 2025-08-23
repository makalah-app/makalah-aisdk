/**
 * Advanced Streaming Performance Monitoring for Makalah AI
 * Provides real-time performance metrics, connection resilience, and optimization
 */

export interface StreamingMetrics {
  // Performance metrics
  latency: number // Average response latency in ms
  throughput: number // Characters per second
  errorRate: number // Error percentage (0-100)
  connectionStability: number // Connection uptime percentage
  
  // Timing metrics
  phaseTransitionTime: number // Average phase transition time
  toolExecutionTime: Record<string, number> // Tool-specific execution times
  networkLatency: number // Network round-trip time
  
  // Resource usage
  memoryUsage: number // Memory usage in MB
  bufferUtilization: number // Buffer usage percentage
  concurrentConnections: number // Active stream connections
}

export interface NetworkCondition {
  type: 'fast' | 'good' | 'slow' | 'offline'
  bandwidth: number // Estimated bandwidth in kbps
  rtt: number // Round-trip time in ms
  packetLoss: number // Packet loss percentage
}

export class StreamingPerformanceMonitor {
  private metrics: StreamingMetrics
  private startTime: number
  private phaseTimings: Map<string, number> = new Map()
  private networkCondition: NetworkCondition
  private bufferSizes: number[] = []
  
  constructor() {
    this.metrics = {
      latency: 0,
      throughput: 0,
      errorRate: 0,
      connectionStability: 100,
      phaseTransitionTime: 0,
      toolExecutionTime: {},
      networkLatency: 0,
      memoryUsage: 0,
      bufferUtilization: 0,
      concurrentConnections: 0
    }
    
    this.networkCondition = {
      type: 'good',
      bandwidth: 1000,
      rtt: 50,
      packetLoss: 0
    }
    
    this.startTime = Date.now()
  }

  // Real-time performance tracking
  startPhaseTimer(phase: string): void {
    this.phaseTimings.set(phase, Date.now())
  }

  endPhaseTimer(phase: string): number {
    const startTime = this.phaseTimings.get(phase)
    if (!startTime) return 0
    
    const duration = Date.now() - startTime
    this.phaseTimings.delete(phase)
    
    // Update average phase transition time
    this.metrics.phaseTransitionTime = (this.metrics.phaseTransitionTime + duration) / 2
    
    return duration
  }

  // Tool execution performance tracking
  trackToolExecution(toolName: string, duration: number): void {
    this.metrics.toolExecutionTime[toolName] = duration
  }

  // Network condition assessment
  detectNetworkCondition(): NetworkCondition {
    const start = Date.now()
    
    // Simulate network ping (in real implementation, use fetch with timeout)
    setTimeout(() => {
      const rtt = Date.now() - start
      
      if (rtt < 50) {
        this.networkCondition = { type: 'fast', bandwidth: 5000, rtt, packetLoss: 0 }
      } else if (rtt < 150) {
        this.networkCondition = { type: 'good', bandwidth: 1000, rtt, packetLoss: 0.1 }
      } else if (rtt < 500) {
        this.networkCondition = { type: 'slow', bandwidth: 200, rtt, packetLoss: 1.0 }
      } else {
        this.networkCondition = { type: 'offline', bandwidth: 0, rtt: 0, packetLoss: 100 }
      }
    }, 10)
    
    return this.networkCondition
  }

  // Buffer optimization based on network conditions
  getOptimalBufferSize(): number {
    switch (this.networkCondition.type) {
      case 'fast':
        return 8192 // Large buffer untuk high-speed connections
      case 'good':
        return 4096 // Standard buffer
      case 'slow':
        return 1024 // Small buffer untuk slow connections
      default:
        return 512 // Minimal buffer
    }
  }

  // Adaptive chunk sizing untuk mobile optimization
  getOptimalChunkSize(): number {
    const baseSize = 256
    const networkMultiplier = this.networkCondition.bandwidth / 1000
    const stabilityMultiplier = this.metrics.connectionStability / 100
    
    return Math.max(64, Math.min(2048, baseSize * networkMultiplier * stabilityMultiplier))
  }

  // Progress calculation untuk tool execution
  calculateToolProgress(toolName: string, elapsed: number): number {
    const expectedDuration = this.metrics.toolExecutionTime[toolName] || 2000
    return Math.min(95, (elapsed / expectedDuration) * 100) // Cap at 95% until completion
  }

  // Latency optimization
  measureLatency(): number {
    const now = Date.now()
    const latency = now - this.startTime
    
    // Update running average
    this.metrics.latency = (this.metrics.latency + latency) / 2
    this.startTime = now
    
    return this.metrics.latency
  }

  // Memory usage tracking
  updateMemoryUsage(bufferSize: number): void {
    this.bufferSizes.push(bufferSize)
    
    // Keep only last 10 buffer sizes for averaging
    if (this.bufferSizes.length > 10) {
      this.bufferSizes.shift()
    }
    
    this.metrics.memoryUsage = this.bufferSizes.reduce((sum, size) => sum + size, 0) / 1024 / 1024 // MB
    this.metrics.bufferUtilization = Math.min(100, (this.metrics.memoryUsage / 10) * 100) // Assume 10MB max
  }

  // Connection resilience tracking
  recordConnectionEvent(event: 'connect' | 'disconnect' | 'error' | 'retry'): void {
    const now = Date.now()
    
    switch (event) {
      case 'connect':
        this.metrics.concurrentConnections++
        break
      case 'disconnect':
        this.metrics.concurrentConnections--
        break
      case 'error':
        this.metrics.errorRate = Math.min(100, this.metrics.errorRate + 1)
        break
      case 'retry':
        // Retry doesn't affect connection count but indicates instability
        this.metrics.connectionStability = Math.max(0, this.metrics.connectionStability - 5)
        break
    }
    
    // Gradually improve stability over time if no errors
    if (event === 'connect') {
      this.metrics.connectionStability = Math.min(100, this.metrics.connectionStability + 1)
    }
  }

  // Get current metrics for monitoring
  getMetrics(): StreamingMetrics & { networkCondition: NetworkCondition } {
    return {
      ...this.metrics,
      networkCondition: this.networkCondition
    }
  }

  // Performance-based recommendations
  getOptimizationRecommendations(): string[] {
    const recommendations: string[] = []
    
    if (this.metrics.latency > 200) {
      recommendations.push('Kurangi ukuran buffer untuk mengurangi latency')
    }
    
    if (this.metrics.errorRate > 5) {
      recommendations.push('Aktifkan retry mechanism untuk koneksi yang tidak stabil')
    }
    
    if (this.networkCondition.type === 'slow') {
      recommendations.push('Mode hemat data aktif untuk koneksi lambat')
    }
    
    if (this.metrics.memoryUsage > 5) {
      recommendations.push('Optimalkan penggunaan memori dengan buffer cleanup')
    }
    
    return recommendations
  }

  // Reset metrics untuk new session
  reset(): void {
    this.metrics = {
      latency: 0,
      throughput: 0,
      errorRate: 0,
      connectionStability: 100,
      phaseTransitionTime: 0,
      toolExecutionTime: {},
      networkLatency: 0,
      memoryUsage: 0,
      bufferUtilization: 0,
      concurrentConnections: 0
    }
    
    this.phaseTimings.clear()
    this.bufferSizes = []
    this.startTime = Date.now()
  }
}

// Global performance monitor instance
export const performanceMonitor = new StreamingPerformanceMonitor()

// Utility functions untuk Indonesian progress messages
export function getProgressMessage(tool: string, progress: number): string {
  const progressText = `${Math.round(progress)}%`
  
  switch (tool) {
    case 'web_search':
      if (progress < 30) return `Agent mencari referensi akademik... ${progressText}`
      if (progress < 70) return `Agent memverifikasi sumber... ${progressText}`
      return `Agent menyelesaikan pencarian... ${progressText}`
      
    case 'artifact_store':
      if (progress < 30) return `Agent menyiapkan artefak... ${progressText}`
      if (progress < 70) return `Agent menyimpan dokumen... ${progressText}`
      return `Agent menyelesaikan penyimpanan... ${progressText}`
      
    case 'cite_manager':
      if (progress < 30) return `Agent memproses sitasi... ${progressText}`
      if (progress < 70) return `Agent memvalidasi referensi... ${progressText}`
      return `Agent menyelesaikan manajemen sitasi... ${progressText}`
      
    default:
      if (progress < 30) return `Agent memulai pemrosesan... ${progressText}`
      if (progress < 70) return `Agent sedang bekerja... ${progressText}`
      return `Agent hampir selesai... ${progressText}`
  }
}

// Network-adaptive streaming configuration
export function getAdaptiveStreamingConfig(networkCondition: NetworkCondition) {
  const baseConfig = {
    bufferSize: 4096,
    chunkSize: 256,
    updateInterval: 100,
    maxRetries: 3,
    retryDelay: 1000
  }
  
  switch (networkCondition.type) {
    case 'fast':
      return {
        ...baseConfig,
        bufferSize: 8192,
        chunkSize: 512,
        updateInterval: 50,
        maxRetries: 1,
        retryDelay: 500
      }
      
    case 'good':
      return baseConfig
      
    case 'slow':
      return {
        ...baseConfig,
        bufferSize: 1024,
        chunkSize: 128,
        updateInterval: 200,
        maxRetries: 5,
        retryDelay: 2000
      }
      
    default:
      return {
        ...baseConfig,
        bufferSize: 512,
        chunkSize: 64,
        updateInterval: 500,
        maxRetries: 10,
        retryDelay: 5000
      }
  }
}