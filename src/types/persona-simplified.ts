// ============================================
// MAKALAH AI: Simplified Persona System Types
// ============================================
// Task P05: Simplified Database Schema for Persona Template Storage
// Created: August 2025
// Purpose: Streamlined types for simplified persona architecture

// ============================================
// CORE SIMPLIFIED TYPES
// ============================================

export type ChatModeType = 'formal' | 'casual';

export interface SimplifiedPersonaTemplate {
  id: string;
  name: string;
  chat_mode: ChatModeType;
  system_prompt: string;
  description: string | null;
  is_active: boolean;
  is_default: boolean;
  version: number;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface ChatModeAssociation {
  id: string;
  session_id: string;
  chat_mode: ChatModeType;
  persona_template_id: string | null;
  academic_phase: number | null;
  created_at: string;
  expires_at: string;
}

export interface AdminTemplateAction {
  id: string;
  persona_template_id: string | null;
  action_type: AdminActionType;
  old_values: Record<string, any> | null;
  new_values: Record<string, any> | null;
  performed_by: string | null;
  performed_at: string;
  notes: string | null;
}

export type AdminActionType = 
  | 'created' 
  | 'updated' 
  | 'activated' 
  | 'deactivated' 
  | 'deleted'
  | 'set_default'
  | 'performance_test';

// ============================================
// PERFORMANCE MONITORING TYPES
// ============================================

export interface PersonaPerformanceResult {
  chat_mode: ChatModeType;
  avg_duration_ms: number;
  max_duration_ms: number;
  min_duration_ms: number;
  test_runs: number;
}

export interface DatabasePerformanceMetrics {
  active_templates: number;
  active_associations: number;
  avg_retrieval_time: number;
  cache_hit_rate: number;
  last_updated: string;
}

export interface PerformanceAlert {
  type: 'slow_query' | 'high_usage' | 'cache_miss' | 'error_rate';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  metrics: Record<string, number>;
  timestamp: string;
}

// ============================================
// API REQUEST/RESPONSE TYPES
// ============================================

export interface GetPersonaByModeRequest {
  chat_mode: ChatModeType;
  session_id?: string;
}

export interface GetPersonaByModeResponse {
  persona: SimplifiedPersonaTemplate | null;
  retrieved_in_ms: number;
  cache_hit: boolean;
}

export interface SetSessionChatModeRequest {
  session_id: string;
  chat_mode: ChatModeType;
  persona_template_id?: string;
  academic_phase?: number;
}

export interface SetSessionChatModeResponse {
  association_id: string;
  expires_at: string;
  success: boolean;
}

export interface SearchPersonasRequest {
  search_term: string;
  chat_mode?: ChatModeType;
  active_only?: boolean;
  limit?: number;
}

export interface SearchPersonasResponse {
  personas: SimplifiedPersonaTemplate[];
  total_found: number;
  search_time_ms: number;
}

// ============================================
// ADMIN INTERFACE TYPES
// ============================================

export interface CreatePersonaTemplateRequest {
  name: string;
  chat_mode: ChatModeType;
  system_prompt: string;
  description?: string;
  is_default?: boolean;
  admin_id?: string;
}

export interface UpdatePersonaTemplateRequest {
  template_id: string;
  updates: {
    name?: string;
    system_prompt?: string;
    description?: string;
    is_active?: boolean;
  };
  admin_id?: string;
}

export interface AdminManageTemplateRequest {
  template_id: string;
  action: 'activate' | 'deactivate' | 'set_default';
  admin_id?: string;
  notes?: string;
}

export interface AdminActionHistoryRequest {
  template_id?: string;
  limit?: number;
  action_type?: AdminActionType;
  date_from?: string;
  date_to?: string;
}

export interface AdminActionHistoryResponse {
  actions: AdminTemplateAction[];
  total_count: number;
  page_info: {
    has_more: boolean;
    next_cursor?: string;
  };
}

// ============================================
// FRONTEND STATE TYPES
// ============================================

export interface PersonaState {
  currentPersona: SimplifiedPersonaTemplate | null;
  chatMode: ChatModeType;
  sessionId: string | null;
  isLoading: boolean;
  error: string | null;
  performanceMetrics: DatabasePerformanceMetrics | null;
}

export interface PersonaSwitchState {
  availablePersonas: SimplifiedPersonaTemplate[];
  isLoading: boolean;
  error: string | null;
  lastSwitchTime: string | null;
}

export interface AdminPersonaState {
  templates: SimplifiedPersonaTemplate[];
  selectedTemplate: SimplifiedPersonaTemplate | null;
  actionHistory: AdminTemplateAction[];
  isLoading: boolean;
  error: string | null;
  performanceAlerts: PerformanceAlert[];
}

// ============================================
// UI COMPONENT PROPS TYPES
// ============================================

export interface PersonaTemplateCardProps {
  persona: SimplifiedPersonaTemplate;
  onEdit?: (persona: SimplifiedPersonaTemplate) => void;
  onActivate?: (persona: SimplifiedPersonaTemplate) => void;
  onDeactivate?: (persona: SimplifiedPersonaTemplate) => void;
  onSetDefault?: (persona: SimplifiedPersonaTemplate) => void;
  onDelete?: (persona: SimplifiedPersonaTemplate) => void;
  showAdminActions?: boolean;
}

export interface ChatModeToggleProps {
  currentMode: ChatModeType;
  onModeChange: (mode: ChatModeType) => void;
  disabled?: boolean;
  showPerformanceIndicator?: boolean;
}

export interface PersonaPerformanceIndicatorProps {
  metrics: PersonaPerformanceResult;
  threshold: number; // milliseconds for performance warning
  showDetails?: boolean;
}

export interface AdminActionLogProps {
  actions: AdminTemplateAction[];
  showTemplateNames?: boolean;
  maxItems?: number;
  onViewDetails?: (action: AdminTemplateAction) => void;
}

// ============================================
// VALIDATION TYPES
// ============================================

export interface PersonaTemplateValidation {
  name: {
    isValid: boolean;
    error?: string;
  };
  system_prompt: {
    isValid: boolean;
    error?: string;
    wordCount: number;
    estimatedTokens: number;
  };
  chat_mode: {
    isValid: boolean;
    error?: string;
  };
  overall: {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  };
}

export interface SessionValidation {
  session_id: {
    isValid: boolean;
    error?: string;
  };
  expiry: {
    isValid: boolean;
    expires_at: string;
    remaining_hours: number;
  };
  persona_association: {
    hasAssociation: boolean;
    template_id?: string;
    template_name?: string;
  };
}

// ============================================
// CONFIGURATION TYPES
// ============================================

export interface PersonaDatabaseConfig {
  connectionPool: {
    min: number;
    max: number;
    acquireTimeoutMillis: number;
    idleTimeoutMillis: number;
  };
  performance: {
    retrievalTimeoutMs: number;
    cacheExpiryMinutes: number;
    slowQueryThresholdMs: number;
  };
  cleanup: {
    expiredAssociationsIntervalHours: number;
    auditLogRetentionDays: number;
    performanceTestRetentionHours: number;
  };
}

export interface PersonaUIConfig {
  chatModeSwitch: {
    animationDurationMs: number;
    showPerformanceMetrics: boolean;
    confirmModeSwitch: boolean;
  };
  adminInterface: {
    itemsPerPage: number;
    autoRefreshIntervalSeconds: number;
    showAdvancedOptions: boolean;
  };
  notifications: {
    showPerformanceWarnings: boolean;
    showSuccessMessages: boolean;
    autoHideDelayMs: number;
  };
}

// ============================================
// ERROR TYPES
// ============================================

export interface PersonaError {
  code: string;
  message: string;
  details?: Record<string, any>;
  timestamp: string;
  recoverable: boolean;
}

export type PersonaErrorCode = 
  | 'PERSONA_NOT_FOUND'
  | 'TEMPLATE_INVALID'
  | 'SESSION_EXPIRED'
  | 'DATABASE_ERROR'
  | 'PERMISSION_DENIED'
  | 'PERFORMANCE_THRESHOLD_EXCEEDED'
  | 'VALIDATION_ERROR'
  | 'NETWORK_ERROR'
  | 'UNKNOWN_ERROR';

// ============================================
// CONSTANTS
// ============================================

export const CHAT_MODE_LABELS = {
  formal: 'Mode Akademik Formal',
  casual: 'Mode Obrolan Santai'
} as const;

export const CHAT_MODE_DESCRIPTIONS = {
  formal: 'Menggunakan bahasa Indonesia formal dengan fokus pada standar akademik tinggi',
  casual: 'Menggunakan bahasa Jakarta "gue-lo" yang santai dan friendly'
} as const;

export const ADMIN_ACTION_LABELS = {
  created: 'Template Dibuat',
  updated: 'Template Diperbarui',
  activated: 'Template Diaktifkan',
  deactivated: 'Template Dinonaktifkan',
  deleted: 'Template Dihapus',
  set_default: 'Set sebagai Default',
  performance_test: 'Test Performa'
} as const;

export const PERFORMANCE_THRESHOLDS = {
  RETRIEVAL_TIME_MS: 100,
  CACHE_HIT_RATE: 90,
  ERROR_RATE: 5,
  CONCURRENT_USERS: 100
} as const;

export const DEFAULT_DATABASE_CONFIG: PersonaDatabaseConfig = {
  connectionPool: {
    min: 2,
    max: 10,
    acquireTimeoutMillis: 30000,
    idleTimeoutMillis: 300000
  },
  performance: {
    retrievalTimeoutMs: 5000,
    cacheExpiryMinutes: 30,
    slowQueryThresholdMs: 100
  },
  cleanup: {
    expiredAssociationsIntervalHours: 6,
    auditLogRetentionDays: 30,
    performanceTestRetentionHours: 1
  }
};

export const DEFAULT_UI_CONFIG: PersonaUIConfig = {
  chatModeSwitch: {
    animationDurationMs: 200,
    showPerformanceMetrics: true,
    confirmModeSwitch: false
  },
  adminInterface: {
    itemsPerPage: 10,
    autoRefreshIntervalSeconds: 30,
    showAdvancedOptions: false
  },
  notifications: {
    showPerformanceWarnings: true,
    showSuccessMessages: true,
    autoHideDelayMs: 5000
  }
};

// ============================================
// UTILITY TYPES
// ============================================

export type PersonaTemplateWithMetrics = SimplifiedPersonaTemplate & {
  performance_metrics?: PersonaPerformanceResult;
  usage_stats?: {
    total_sessions: number;
    active_sessions: number;
    last_used: string | null;
  };
};

export type ChatModeAssociationWithTemplate = ChatModeAssociation & {
  persona_template?: SimplifiedPersonaTemplate;
};

export type AdminTemplateActionWithTemplate = AdminTemplateAction & {
  persona_template_name?: string;
  performed_by_name?: string;
};