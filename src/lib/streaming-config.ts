/**
 * Enhanced Streaming Configuration for Makalah AI
 * Provides configurable timing controls and phase management for progressive disclosure
 */

export interface StreamingConfig {
  // Character-by-character streaming configuration
  characterRevealDelay: number; // ms between each character
  wordRevealDelay: number; // ms between each word
  enableCharacterStreaming: boolean;
  
  // Phase transition timing
  thinkingPhaseMinDuration: number; // minimum time for thinking phase
  browsingPhaseMinDuration: number; // minimum time for browsing phase
  toolExecutionFeedbackDelay: number; // delay before showing tool feedback
  
  // Progress update intervals
  progressUpdateInterval: number; // ms between progress updates
  statusMessageDuration: number; // how long to show status messages
  
  // Performance optimization settings
  bufferSize: number; // streaming buffer size in bytes
  maxConcurrentStreams: number; // maximum concurrent streaming connections
  adaptiveBuffering: boolean; // enable network-adaptive buffering
  compressionEnabled: boolean; // enable stream compression
  
  // Connection resilience
  maxRetries: number; // maximum retry attempts
  retryDelay: number; // delay between retry attempts
  connectionTimeout: number; // connection timeout in ms
  keepAliveInterval: number; // keep-alive ping interval
  
  // Animation and UX
  enableSmoothTransitions: boolean;
  enableProgressAnimations: boolean;
  respectReducedMotion: boolean;
  
  // Indonesian language messages
  messages: {
    thinking: string[];
    browsing: string[];
    toolExecution: Record<string, string>;
    processing: string[];
    textStreaming: string[];
    progress: Record<string, string[]>; // Tool-specific progress messages
  };
}

export const DEFAULT_STREAMING_CONFIG: StreamingConfig = {
  // Character streaming (untuk word-by-word effect)
  characterRevealDelay: 25, // 25ms = ~40 chars/second (natural reading speed)
  wordRevealDelay: 100, // 100ms between words
  enableCharacterStreaming: true,
  
  // Phase timing controls
  thinkingPhaseMinDuration: 800, // min 800ms thinking
  browsingPhaseMinDuration: 1200, // min 1.2s browsing 
  toolExecutionFeedbackDelay: 300, // 300ms delay before tool feedback
  
  // Progress updates
  progressUpdateInterval: 100, // OPTIMIZED: 100ms progress updates (was 200ms)
  statusMessageDuration: 2000, // 2s status message duration
  
  // Performance optimization settings
  bufferSize: 4096, // 4KB streaming buffer
  maxConcurrentStreams: 3, // Maximum concurrent streaming connections
  adaptiveBuffering: true, // Enable network-adaptive buffering
  compressionEnabled: true, // Enable stream compression
  
  // Connection resilience
  maxRetries: 3, // Maximum retry attempts
  retryDelay: 1000, // 1s delay between retries
  connectionTimeout: 30000, // 30s connection timeout
  keepAliveInterval: 15000, // 15s keep-alive ping
  
  // Animation controls
  enableSmoothTransitions: true,
  enableProgressAnimations: true,
  respectReducedMotion: true,
  
  // Indonesian language status messages
  messages: {
    thinking: [
      'Agent sedang berpikir...',
      'Agent menganalisis pertanyaan...',
      'Agent memproses informasi...',
      'Agent menyusun respons...'
    ],
    browsing: [
      'Agent menjelajah internet...',
      'Agent mencari sumber akademik...',
      'Agent mengumpulkan informasi...',
      'Agent memverifikasi data...'
    ],
    toolExecution: {
      web_search: 'Agent mencari referensi akademik',
      artifact_store: 'Agent menyimpan artefak',
      cite_manager: 'Agent memproses sitasi',
      default: 'Agent menggunakan tool'
    },
    processing: [
      'Agent memproses data...',
      'Agent menganalisis hasil...',
      'Agent menyusun informasi...',
      'Agent menyelesaikan tugas...'
    ],
    textStreaming: [
      'Agent menulis respons...',
      'Agent menyusun jawaban...',
      'Agent berbagi hasil...'
    ],
    progress: {
      web_search: [
        'Mengumpulkan sumber akademik...',
        'Memverifikasi kredibilitas sumber...',
        'Menyelesaikan pencarian referensi...'
      ],
      artifact_store: [
        'Menyiapkan dokumen untuk penyimpanan...',
        'Mengupload artefak ke sistem...',
        'Menyelesaikan proses penyimpanan...'
      ],
      cite_manager: [
        'Memproses format sitasi...',
        'Memvalidasi referensi akademik...',
        'Menyelesaikan manajemen sitasi...'
      ]
    }
  }
};

/**
 * Get random message from array for variety
 */
export function getRandomMessage(messages: string[]): string {
  return messages[Math.floor(Math.random() * messages.length)];
}

/**
 * Get tool-specific message with fallback
 */
export function getToolMessage(toolName: string, config: StreamingConfig = DEFAULT_STREAMING_CONFIG): string {
  return config.messages.toolExecution[toolName] || config.messages.toolExecution.default;
}

/**
 * Create timing delays with respect to user preferences
 */
export function createTimingController(config: StreamingConfig = DEFAULT_STREAMING_CONFIG) {
  const shouldReduceMotion = config.respectReducedMotion && 
    (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    
  return {
    characterDelay: shouldReduceMotion ? 0 : config.characterRevealDelay,
    wordDelay: shouldReduceMotion ? 0 : config.wordRevealDelay,
    thinkingMinDuration: shouldReduceMotion ? 200 : config.thinkingPhaseMinDuration,
    browsingMinDuration: shouldReduceMotion ? 200 : config.browsingPhaseMinDuration,
    toolFeedbackDelay: shouldReduceMotion ? 0 : config.toolExecutionFeedbackDelay,
    progressInterval: config.progressUpdateInterval,
    statusDuration: config.statusMessageDuration,
    enableAnimations: config.enableProgressAnimations && !shouldReduceMotion,
    enableTransitions: config.enableSmoothTransitions && !shouldReduceMotion,
  };
}

/**
 * Phase duration calculator with minimum timing enforcement
 */
export function calculatePhaseDuration(
  phase: 'thinking' | 'browsing' | 'tool-execution' | 'processing',
  actualDuration: number,
  config: StreamingConfig = DEFAULT_STREAMING_CONFIG
): number {
  const timing = createTimingController(config);
  
  switch (phase) {
    case 'thinking':
      return Math.max(actualDuration, timing.thinkingMinDuration);
    case 'browsing':
      return Math.max(actualDuration, timing.browsingMinDuration);
    case 'tool-execution':
      return actualDuration + timing.toolFeedbackDelay;
    case 'processing':
      return actualDuration;
    default:
      return actualDuration;
  }
}

/**
 * Progressive text streamer dengan character-by-character control
 */
export function createProgressiveTextStreamer(
  text: string, 
  config: StreamingConfig = DEFAULT_STREAMING_CONFIG
) {
  const timing = createTimingController(config);
  const words = text.split(' ');
  let currentPosition = 0;
  
  return {
    async *streamByCharacter() {
      for (let i = 0; i < text.length; i++) {
        yield {
          chunk: text.charAt(i),
          position: i,
          isComplete: i === text.length - 1
        };
        
        if (timing.characterDelay > 0) {
          await new Promise(resolve => setTimeout(resolve, timing.characterDelay));
        }
      }
    },
    
    async *streamByWord() {
      let accumulatedText = '';
      
      for (let i = 0; i < words.length; i++) {
        const word = words[i];
        accumulatedText += (i > 0 ? ' ' : '') + word;
        
        yield {
          chunk: word,
          position: accumulatedText.length,
          accumulatedText,
          isComplete: i === words.length - 1
        };
        
        if (timing.wordDelay > 0 && i < words.length - 1) {
          await new Promise(resolve => setTimeout(resolve, timing.wordDelay));
        }
      }
    },
    
    getEstimatedDuration(): number {
      if (!config.enableCharacterStreaming) return 0;
      
      return timing.characterDelay > 0 
        ? text.length * timing.characterDelay
        : words.length * timing.wordDelay;
    }
  };
}

/**
 * Enhanced tool progress message generator dengan Indonesian localization
 */
export function getProgressiveToolMessage(
  toolName: string, 
  progress: number, 
  config: StreamingConfig = DEFAULT_STREAMING_CONFIG
): string {
  const progressMessages = config.messages.progress[toolName] || [
    'Agent memulai pemrosesan...',
    'Agent sedang bekerja...',
    'Agent hampir selesai...'
  ];
  
  const messageIndex = Math.min(
    progressMessages.length - 1,
    Math.floor((progress / 100) * progressMessages.length)
  );
  
  const baseMessage = progressMessages[messageIndex];
  const progressPercentage = Math.round(progress);
  
  return `${baseMessage} (${progressPercentage}%)`;
}

/**
 * Adaptive streaming performance optimizer
 */
export function optimizeStreamingPerformance(config: StreamingConfig = DEFAULT_STREAMING_CONFIG) {
  // Detect if user prefers reduced motion
  const prefersReducedMotion = typeof window !== 'undefined' && 
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    
  // Detect connection quality (simplified version)
  const connectionQuality = typeof navigator !== 'undefined' && 
    (navigator as any).connection?.effectiveType || '4g';
    
  let optimizedConfig = { ...config };
  
  // Optimize based on connection quality
  switch (connectionQuality) {
    case 'slow-2g':
    case '2g':
      optimizedConfig = {
        ...optimizedConfig,
        progressUpdateInterval: 500, // Slower updates untuk slow connections
        bufferSize: 1024, // Smaller buffer
        characterRevealDelay: 50, // Slower character reveal
        maxRetries: 5 // More retries for unstable connections
      };
      break;
      
    case '3g':
      optimizedConfig = {
        ...optimizedConfig,
        progressUpdateInterval: 200,
        bufferSize: 2048,
        characterRevealDelay: 35,
        maxRetries: 3
      };
      break;
      
    case '4g':
    case '5g':
    default:
      optimizedConfig = {
        ...optimizedConfig,
        progressUpdateInterval: 50, // Fast updates untuk high-speed connections
        bufferSize: 8192, // Larger buffer
        characterRevealDelay: 15, // Faster character reveal
        maxRetries: 2 // Fewer retries needed
      };
      break;
  }
  
  // Apply reduced motion preferences
  if (prefersReducedMotion || !config.respectReducedMotion) {
    optimizedConfig = {
      ...optimizedConfig,
      characterRevealDelay: 0,
      wordRevealDelay: 0,
      enableProgressAnimations: false,
      enableSmoothTransitions: false
    };
  }
  
  return optimizedConfig;
}

/**
 * Connection resilience manager dengan automatic retry logic
 */
export function createConnectionResilienceManager(config: StreamingConfig = DEFAULT_STREAMING_CONFIG) {
  let retryCount = 0;
  let connectionState: 'connected' | 'connecting' | 'disconnected' | 'error' = 'disconnected';
  
  return {
    async attemptConnection(connectionFn: () => Promise<any>): Promise<any> {
      connectionState = 'connecting';
      
      for (let attempt = 0; attempt < config.maxRetries; attempt++) {
        try {
          const result = await connectionFn();
          connectionState = 'connected';
          retryCount = 0;
          return result;
        } catch (error) {
          retryCount++;
          connectionState = 'error';
          
          if (attempt < config.maxRetries - 1) {
            await new Promise(resolve => setTimeout(resolve, config.retryDelay * Math.pow(2, attempt)));
          }
        }
      }
      
      connectionState = 'disconnected';
      throw new Error(`Connection failed after ${config.maxRetries} attempts`);
    },
    
    getConnectionState: () => connectionState,
    getRetryCount: () => retryCount,
    
    isHealthy: () => connectionState === 'connected' && retryCount < 3
  };
}