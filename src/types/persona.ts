// ============================================
// MAKALAH AI: Academic Persona System Types
// ============================================
// Task 02 Implementation: Database-Driven Academic Persona System
// Created: August 2025
// Features: TypeScript interfaces reflecting complete database schema

export type PersonaMode = 'Research' | 'Writing' | 'Review';
export type PersonaStatus = 'draft' | 'active' | 'archived' | 'deprecated';
export type AcademicLevel = 'undergraduate' | 'graduate' | 'postgraduate';
export type CitationStyle = 'APA' | 'MLA' | 'Chicago' | 'IEEE';
// 🚀 P02: Chat Mode Types for dual-mode persona system
export type ChatModeType = 'formal' | 'casual';
export type AuditEventType = 
  | 'persona_created' 
  | 'persona_updated' 
  | 'persona_deleted' 
  | 'persona_activated'
  | 'mode_switched' 
  | 'assignment_created' 
  | 'assignment_deleted'
  | 'system_prompt_executed' 
  | 'performance_tracked';

// ============================================
// 1. DISCIPLINE CATEGORIES
// ============================================
export interface DisciplineCategory {
  id: string;
  name: string;
  description: string | null;
  parent_discipline_id: string | null;
  code: string;
  is_active: boolean;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

// ============================================
// 2. PERSONA TEMPLATES (Core)
// ============================================
export interface PersonaTemplate {
  id: string;
  name: string;
  mode: PersonaMode;
  // 🚀 P02: Chat mode type for formal/casual behavior distinction
  chat_mode_type: ChatModeType;
  discipline_id: string | null;
  system_prompt: string;
  description: string | null;
  version: number;
  is_default: boolean;
  is_active: boolean;
  status: PersonaStatus;
  
  // Academic configuration
  academic_level: AcademicLevel;
  citation_style: CitationStyle;
  
  // Performance tracking
  usage_count: number;
  success_rate: number; // 0-100
  avg_response_time: number; // milliseconds
  
  // Metadata and configuration
  configuration: PersonaConfiguration;
  metadata: Record<string, any>;
  
  // Audit fields
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface PersonaConfiguration {
  // Research mode configuration
  search_depth?: 'basic' | 'comprehensive' | 'exhaustive';
  source_quality?: 'standard' | 'high' | 'peer_reviewed_only';
  methodology_focus?: boolean;
  
  // Writing mode configuration
  writing_style?: 'academic' | 'narrative' | 'analytical';
  structure_focus?: boolean;
  language_precision?: 'standard' | 'high' | 'domain_specific';
  
  // Review mode configuration
  review_depth?: 'basic' | 'comprehensive' | 'expert';
  quality_standards?: 'standard' | 'high' | 'publication_ready';
  citation_validation?: boolean;
  
  // 🚀 P02: Casual conversation mode configuration
  conversation_style?: 'casual' | 'friendly' | 'professional';
  language_style?: 'jakarta_gue_lo' | 'indonesian_informal' | 'mixed';
  formality_level?: 'low' | 'medium' | 'high';
  humor_enabled?: boolean;
  context_awareness?: 'indonesian_culture' | 'academic_culture' | 'global';
  
  // Common configuration
  temperature?: number; // AI model temperature override
  max_tokens?: number;  // Response length preference
  tools_enabled?: string[]; // Which tools this persona can use
  custom_instructions?: string; // Additional instructions
}

// ============================================
// 3. PERSONA VERSIONS
// ============================================
export interface PersonaVersion {
  id: string;
  persona_template_id: string;
  version_number: number;
  
  // Snapshot of persona data at this version
  name: string;
  mode: PersonaMode;
  system_prompt: string;
  description: string | null;
  configuration: PersonaConfiguration;
  
  // Version metadata
  changelog: string | null;
  performance_delta: Record<string, any>;
  is_rollback: boolean;
  rolled_back_from_version: number | null;
  
  // Audit information
  created_by: string | null;
  created_at: string;
}

// ============================================
// 4. PERSONA ASSIGNMENTS
// ============================================
export interface PersonaAssignment {
  id: string;
  persona_template_id: string;
  
  // Project/Session binding
  project_id: string | null;
  session_id: string | null;
  user_id: string | null;
  
  // Phase-specific assignment
  academic_phase: number | null; // 1-8 academic phases
  mode_override: PersonaMode | null;
  
  // Assignment metadata
  is_temporary: boolean;
  expires_at: string | null;
  auto_assigned: boolean;
  
  // Performance tracking
  switch_count: number;
  total_usage_time: number; // Total time in milliseconds
  last_used_at: string | null;
  
  // Audit fields
  assigned_at: string;
  assigned_by: string | null;
}

// ============================================
// 5. PERSONA AUDIT TRAIL
// ============================================
export interface PersonaAuditTrail {
  id: string;
  event_type: AuditEventType;
  
  // Context
  persona_template_id: string | null;
  session_id: string | null;
  user_id: string | null;
  
  // Event details
  old_values: Record<string, any>;
  new_values: Record<string, any>;
  context: Record<string, any>;
  
  // Performance data
  execution_time: number | null; // milliseconds
  response_quality_score: number | null; // 1-5
  
  // Technical details
  ip_address: string | null;
  user_agent: string | null;
  client_fingerprint: string | null;
  
  // Audit metadata
  created_at: string;
}

// ============================================
// FRONTEND INTERFACE TYPES
// ============================================

export interface PersonaSwitchState {
  currentPersona: PersonaTemplate | null;
  availablePersonas: PersonaTemplate[];
  isLoading: boolean;
  error: string | null;
}

export interface PersonaModeIndicator {
  mode: PersonaMode;
  persona: PersonaTemplate;
  isActive: boolean;
  switchCount: number;
  lastSwitched: string | null;
}

export interface PersonaPerformanceMetrics {
  usage_count: number;
  success_rate: number;
  avg_response_time: number;
  user_satisfaction: number;
  tool_effectiveness: Record<string, number>;
}

export interface PersonaRecommendation {
  persona: PersonaTemplate;
  confidence: number; // 0-1
  reason: string;
  phase_compatibility: number[]; // Array of phase numbers (1-8)
}

// ============================================
// API RESPONSE TYPES
// ============================================

export interface GetPersonasResponse {
  personas: PersonaTemplate[];
  total: number;
  page: number;
  has_more: boolean;
}

export interface CreatePersonaRequest {
  name: string;
  mode: PersonaMode;
  // 🚀 P02: Chat mode type for persona creation
  chat_mode_type: ChatModeType;
  system_prompt: string;
  description?: string;
  discipline_id?: string;
  academic_level?: AcademicLevel;
  citation_style?: CitationStyle;
  configuration?: Partial<PersonaConfiguration>;
}

export interface UpdatePersonaRequest extends Partial<CreatePersonaRequest> {
  id: string;
  changelog?: string;
}

export interface SwitchPersonaRequest {
  persona_id: string;
  session_id: string;
  mode_override?: PersonaMode;
  context?: Record<string, any>;
}

export interface PersonaUsageRequest {
  persona_id: string;
  session_id: string;
  execution_time?: number;
  quality_score?: number;
  context?: Record<string, any>;
}

// ============================================
// SYSTEM PROMPT INTEGRATION TYPES
// ============================================

export interface SystemPromptContext {
  mode: PersonaMode;
  discipline: string | null;
  academic_level: AcademicLevel;
  citation_style: CitationStyle;
  academic_phase: number | null;
  user_context?: Record<string, any>;
}

export interface EnhancedSystemPrompt {
  base_prompt: string;
  context_prompt: string;
  tool_instructions: string;
  mode_specific_instructions: string;
  final_prompt: string;
}

// ============================================
// ADMIN INTERFACE TYPES
// ============================================

export interface PersonaTemplateFormData {
  name: string;
  mode: PersonaMode;
  discipline_id: string;
  system_prompt: string;
  description: string;
  academic_level: AcademicLevel;
  citation_style: CitationStyle;
  configuration: PersonaConfiguration;
  is_default: boolean;
}

export interface PersonaTestResult {
  persona_id: string;
  test_query: string;
  response: string;
  response_time: number;
  quality_score: number;
  mode_adherence: boolean;
  style_compliance: boolean;
  tool_usage: string[];
}

export interface PersonaBulkOperation {
  operation: 'activate' | 'deactivate' | 'delete' | 'export';
  persona_ids: string[];
  options?: Record<string, any>;
}

// ============================================
// WORKFLOW INTEGRATION TYPES
// ============================================

export interface WorkflowPhasePersona {
  phase: number; // 1-8
  recommended_mode: PersonaMode;
  primary_persona: PersonaTemplate | null;
  alternative_personas: PersonaTemplate[];
  auto_switch_triggers: string[];
}

export interface WorkflowPersonaMapping {
  project_id: string;
  phase_mappings: WorkflowPhasePersona[];
  default_fallback: PersonaTemplate;
  user_overrides: Record<number, string>; // phase -> persona_id
}

// ============================================
// CONSTANTS
// ============================================

export const ACADEMIC_PHASES = {
  1: 'Definitive Topic/Scope',
  2: 'Research Notes',
  3: 'Literature Review',
  4: 'Outline',
  5: 'First Draft',
  6: 'Citations/References',
  7: 'Final Draft',
  8: 'Final Paper'
} as const;

export const MODE_DESCRIPTIONS = {
  Research: 'Fokus pada pencarian literatur, metodologi penelitian, dan analisis sumber akademik',
  Writing: 'Fokus pada penulisan, struktur akademik, dan pengembangan argumen',
  Review: 'Fokus pada evaluasi kualitas, konsistensi, dan standar akademik'
} as const;

export const DEFAULT_PERSONA_CONFIGURATION: PersonaConfiguration = {
  temperature: 0.1,
  max_tokens: 2000,
  tools_enabled: ['web_search', 'artifact_store', 'cite_manager'],
  search_depth: 'comprehensive',
  source_quality: 'high',
  writing_style: 'academic',
  structure_focus: true,
  language_precision: 'high',
  review_depth: 'comprehensive',
  quality_standards: 'high',
  citation_validation: true
};