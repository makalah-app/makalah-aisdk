// ============================================
// MAKALAH AI: Simplified Persona Database Service
// ============================================
// Task P05: Database Schema Simplification for Persona Template Storage
// Created: August 2025
// Purpose: Streamlined database operations for persona templates with dual chat mode support

import type { 
  SimplifiedPersonaTemplate, 
  ChatModeAssociation,
  ChatModeType,
  AdminTemplateAction
} from '@/types/persona'

// ============================================
// SIMPLIFIED PERSONA TEMPLATE INTERFACE
// ============================================
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
  action_type: string;
  old_values: Record<string, any> | null;
  new_values: Record<string, any> | null;
  performed_by: string | null;
  performed_at: string;
  notes: string | null;
}

export type ChatModeType = 'formal' | 'casual';

// ============================================
// PERFORMANCE TESTING RESULT INTERFACE
// ============================================
export interface PersonaPerformanceResult {
  chat_mode: ChatModeType;
  avg_duration_ms: number;
  max_duration_ms: number;
  min_duration_ms: number;
  test_runs: number;
}

// ============================================
// SIMPLIFIED PERSONA DATABASE SERVICE
// ============================================
export class PersonaDatabaseService {
  private supabaseClient: any; // Will be injected with Supabase MCP client

  constructor(supabaseClient?: any) {
    this.supabaseClient = supabaseClient;
  }

  // ============================================
  // CORE PERSONA TEMPLATE OPERATIONS
  // ============================================

  /**
   * Fast persona retrieval by chat mode (sub-100ms target)
   * Uses optimized database function for performance
   */
  async getPersonaByChatMode(
    chatMode: ChatModeType,
    sessionId?: string
  ): Promise<SimplifiedPersonaTemplate | null> {
    try {
      // Use the optimized database function
      const query = `
        SELECT * FROM get_persona_by_chat_mode($1, $2)
      `;
      
      const result = await this.executeQuery(query, [chatMode, sessionId]);
      
      if (result && result.length > 0) {
        return {
          id: result[0].id,
          name: result[0].name,
          chat_mode: chatMode,
          system_prompt: result[0].system_prompt,
          description: result[0].description,
          is_active: true,
          is_default: false,
          version: result[0].version,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          created_by: null
        };
      }

      return null;
    } catch (error) {
      console.error('Error fetching persona by chat mode:', error);
      throw error;
    }
  }

  /**
   * Get all active personas for a specific chat mode
   */
  async getPersonasByMode(chatMode: ChatModeType): Promise<SimplifiedPersonaTemplate[]> {
    try {
      const query = `
        SELECT id, name, chat_mode, system_prompt, description, 
               is_active, is_default, version, created_at, updated_at, created_by
        FROM persona_templates 
        WHERE chat_mode = $1 AND is_active = true
        ORDER BY is_default DESC, name ASC
      `;
      
      const results = await this.executeQuery(query, [chatMode]);
      return results.map(this.mapRowToPersonaTemplate);
    } catch (error) {
      console.error('Error fetching personas by mode:', error);
      throw error;
    }
  }

  /**
   * Get persona template by ID
   */
  async getPersonaById(personaId: string): Promise<SimplifiedPersonaTemplate | null> {
    try {
      const query = `
        SELECT id, name, chat_mode, system_prompt, description, 
               is_active, is_default, version, created_at, updated_at, created_by
        FROM persona_templates 
        WHERE id = $1
      `;
      
      const results = await this.executeQuery(query, [personaId]);
      
      if (results && results.length > 0) {
        return this.mapRowToPersonaTemplate(results[0]);
      }

      return null;
    } catch (error) {
      console.error('Error fetching persona by ID:', error);
      throw error;
    }
  }

  /**
   * Search personas by name or description (full-text search)
   */
  async searchPersonas(
    searchTerm: string, 
    chatMode?: ChatModeType, 
    activeOnly: boolean = true
  ): Promise<SimplifiedPersonaTemplate[]> {
    try {
      let query = `
        SELECT id, name, chat_mode, system_prompt, description, 
               is_active, is_default, version, created_at, updated_at, created_by
        FROM persona_templates 
        WHERE to_tsvector('indonesian', name || ' ' || COALESCE(description, '')) 
              @@ plainto_tsquery('indonesian', $1)
      `;
      
      const params: any[] = [searchTerm];
      let paramIndex = 2;

      if (chatMode) {
        query += ` AND chat_mode = $${paramIndex}`;
        params.push(chatMode);
        paramIndex++;
      }

      if (activeOnly) {
        query += ` AND is_active = true`;
      }

      query += ` ORDER BY ts_rank(to_tsvector('indonesian', name || ' ' || COALESCE(description, '')), 
                                    plainto_tsquery('indonesian', $1)) DESC`;
      
      const results = await this.executeQuery(query, params);
      return results.map(this.mapRowToPersonaTemplate);
    } catch (error) {
      console.error('Error searching personas:', error);
      throw error;
    }
  }

  // ============================================
  // CHAT MODE ASSOCIATION OPERATIONS
  // ============================================

  /**
   * Set chat mode association for user session
   */
  async setSessionChatMode(
    sessionId: string,
    chatMode: ChatModeType,
    personaTemplateId?: string,
    academicPhase?: number
  ): Promise<string> {
    try {
      const query = `
        SELECT set_session_chat_mode($1, $2, $3, $4) as association_id
      `;
      
      const result = await this.executeQuery(query, [
        sessionId, 
        chatMode, 
        personaTemplateId, 
        academicPhase
      ]);
      
      return result[0]?.association_id || '';
    } catch (error) {
      console.error('Error setting session chat mode:', error);
      throw error;
    }
  }

  /**
   * Get session chat mode association
   */
  async getSessionChatMode(sessionId: string, chatMode: ChatModeType): Promise<ChatModeAssociation | null> {
    try {
      const query = `
        SELECT id, session_id, chat_mode, persona_template_id, academic_phase,
               created_at, expires_at
        FROM chat_mode_associations 
        WHERE session_id = $1 AND chat_mode = $2 AND expires_at > NOW()
      `;
      
      const results = await this.executeQuery(query, [sessionId, chatMode]);
      
      if (results && results.length > 0) {
        return this.mapRowToChatModeAssociation(results[0]);
      }

      return null;
    } catch (error) {
      console.error('Error getting session chat mode:', error);
      throw error;
    }
  }

  /**
   * Clean up expired chat mode associations
   */
  async cleanupExpiredAssociations(): Promise<number> {
    try {
      const query = `
        DELETE FROM chat_mode_associations 
        WHERE expires_at < NOW()
      `;
      
      const result = await this.executeQuery(query, []);
      return result.affectedRows || 0;
    } catch (error) {
      console.error('Error cleaning up expired associations:', error);
      throw error;
    }
  }

  // ============================================
  // ADMIN TEMPLATE MANAGEMENT OPERATIONS
  // ============================================

  /**
   * Admin action: Create new persona template
   */
  async adminCreateTemplate(
    name: string,
    chatMode: ChatModeType,
    systemPrompt: string,
    description: string | null = null,
    adminId: string | null = null
  ): Promise<string> {
    try {
      const query = `
        INSERT INTO persona_templates (name, chat_mode, system_prompt, description, created_by)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id
      `;
      
      const result = await this.executeQuery(query, [
        name, chatMode, systemPrompt, description, adminId
      ]);
      
      return result[0]?.id || '';
    } catch (error) {
      console.error('Error creating persona template:', error);
      throw error;
    }
  }

  /**
   * Admin action: Update persona template
   */
  async adminUpdateTemplate(
    templateId: string,
    updates: Partial<{
      name: string;
      system_prompt: string;
      description: string;
      is_active: boolean;
    }>,
    adminId: string | null = null
  ): Promise<boolean> {
    try {
      const updateFields = [];
      const params = [];
      let paramIndex = 1;

      for (const [key, value] of Object.entries(updates)) {
        updateFields.push(`${key} = $${paramIndex}`);
        params.push(value);
        paramIndex++;
      }

      if (updateFields.length === 0) {
        return false;
      }

      updateFields.push(`created_by = $${paramIndex}`); // Used for tracking admin who made change
      params.push(adminId);
      paramIndex++;

      updateFields.push(`updated_at = NOW()`);

      params.push(templateId); // for WHERE clause

      const query = `
        UPDATE persona_templates 
        SET ${updateFields.join(', ')}
        WHERE id = $${paramIndex}
      `;
      
      const result = await this.executeQuery(query, params);
      return result.affectedRows > 0;
    } catch (error) {
      console.error('Error updating persona template:', error);
      throw error;
    }
  }

  /**
   * Admin action: Manage template (activate, deactivate, set_default)
   */
  async adminManageTemplate(
    templateId: string,
    action: 'activate' | 'deactivate' | 'set_default',
    adminId: string | null = null,
    notes: string | null = null
  ): Promise<boolean> {
    try {
      const query = `
        SELECT admin_manage_template($1, $2, $3, $4) as success
      `;
      
      const result = await this.executeQuery(query, [
        templateId, action, adminId, notes
      ]);
      
      return result[0]?.success || false;
    } catch (error) {
      console.error('Error managing persona template:', error);
      throw error;
    }
  }

  /**
   * Get admin action history for template
   */
  async getAdminActionHistory(templateId?: string, limit: number = 50): Promise<AdminTemplateAction[]> {
    try {
      let query = `
        SELECT id, persona_template_id, action_type, old_values, new_values,
               performed_by, performed_at, notes
        FROM template_admin_actions
      `;
      
      const params: any[] = [];
      
      if (templateId) {
        query += ` WHERE persona_template_id = $1`;
        params.push(templateId);
        query += ` ORDER BY performed_at DESC LIMIT $2`;
        params.push(limit);
      } else {
        query += ` ORDER BY performed_at DESC LIMIT $1`;
        params.push(limit);
      }
      
      const results = await this.executeQuery(query, params);
      return results.map(this.mapRowToAdminAction);
    } catch (error) {
      console.error('Error fetching admin action history:', error);
      throw error;
    }
  }

  // ============================================
  // PERFORMANCE MONITORING
  // ============================================

  /**
   * Test persona retrieval performance (sub-100ms target)
   */
  async testRetrievalPerformance(): Promise<PersonaPerformanceResult[]> {
    try {
      const query = `
        SELECT * FROM test_persona_retrieval_performance()
      `;
      
      const results = await this.executeQuery(query, []);
      return results.map((row: any) => ({
        chat_mode: row.chat_mode,
        avg_duration_ms: Number(row.avg_duration_ms),
        max_duration_ms: Number(row.max_duration_ms),
        min_duration_ms: Number(row.min_duration_ms),
        test_runs: row.test_runs
      }));
    } catch (error) {
      console.error('Error testing retrieval performance:', error);
      throw error;
    }
  }

  /**
   * Get database performance metrics
   */
  async getPerformanceMetrics(): Promise<{
    active_templates: number;
    active_associations: number;
    avg_retrieval_time: number;
    cache_hit_rate: number;
  }> {
    try {
      const queries = [
        'SELECT COUNT(*) as count FROM persona_templates WHERE is_active = true',
        'SELECT COUNT(*) as count FROM chat_mode_associations WHERE expires_at > NOW()',
        `SELECT AVG(CAST(substring(notes from '\\d+\\.?\\d*') AS NUMERIC)) as avg_time 
         FROM template_admin_actions 
         WHERE action_type = 'performance_test' 
         AND notes LIKE '%ms'
         AND performed_at > NOW() - INTERVAL '1 hour'`
      ];

      const results = await Promise.all(queries.map(query => this.executeQuery(query, [])));
      
      return {
        active_templates: results[0][0]?.count || 0,
        active_associations: results[1][0]?.count || 0,
        avg_retrieval_time: results[2][0]?.avg_time || 0,
        cache_hit_rate: 95.0 // Simulated cache hit rate
      };
    } catch (error) {
      console.error('Error getting performance metrics:', error);
      throw error;
    }
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  private async executeQuery(query: string, params: any[]): Promise<any[]> {
    if (this.supabaseClient) {
      // Use actual Supabase MCP client
      const result = await this.supabaseClient.execute_sql({ query });
      return result.data || [];
    } else {
      // Mock implementation for development
      console.log('Mock SQL Query:', query, 'Params:', params);
      return [];
    }
  }

  private mapRowToPersonaTemplate(row: any): SimplifiedPersonaTemplate {
    return {
      id: row.id,
      name: row.name,
      chat_mode: row.chat_mode,
      system_prompt: row.system_prompt,
      description: row.description,
      is_active: row.is_active,
      is_default: row.is_default,
      version: row.version,
      created_at: row.created_at,
      updated_at: row.updated_at,
      created_by: row.created_by
    };
  }

  private mapRowToChatModeAssociation(row: any): ChatModeAssociation {
    return {
      id: row.id,
      session_id: row.session_id,
      chat_mode: row.chat_mode,
      persona_template_id: row.persona_template_id,
      academic_phase: row.academic_phase,
      created_at: row.created_at,
      expires_at: row.expires_at
    };
  }

  private mapRowToAdminAction(row: any): AdminTemplateAction {
    return {
      id: row.id,
      persona_template_id: row.persona_template_id,
      action_type: row.action_type,
      old_values: row.old_values,
      new_values: row.new_values,
      performed_by: row.performed_by,
      performed_at: row.performed_at,
      notes: row.notes
    };
  }
}

// ============================================
// SINGLETON INSTANCE
// ============================================
export const personaDatabaseService = new PersonaDatabaseService();

// ============================================
// MOCK DATA FOR DEVELOPMENT TESTING
// ============================================
export const MOCK_SIMPLIFIED_PERSONAS: SimplifiedPersonaTemplate[] = [
  {
    id: 'formal-academic-default',
    name: 'Academic Research Assistant',
    chat_mode: 'formal',
    system_prompt: `Kamu adalah asisten penelitian akademik yang ahli dalam metodologi penelitian, analisis literatur, dan penulisan ilmiah. Kamu membantu dalam semua tahap penelitian akademik dari definisi topik hingga penyelesaian makalah.

KARAKTERISTIK:
- Menggunakan bahasa Indonesia formal dan akademis
- Memberikan referensi dan sitasi yang akurat
- Mengikuti standar akademik internasional
- Objektif dan analitis dalam pendekatan
- Mendorong pemikiran kritis dan metodologi yang ketat

KEMAMPUAN KHUSUS:
- Literature review dan analisis sumber
- Metodologi penelitian kuantitatif dan kualitatif
- Struktur penulisan akademik (IMRAD format)
- Manajemen sitasi (APA, MLA, IEEE, Chicago)
- Evaluasi validitas dan reliabilitas penelitian

Selalu prioritaskan kualitas akademik, originalitas, dan integritas penelitian.`,
    description: 'Default academic research assistant untuk semua fase penelitian akademik',
    is_active: true,
    is_default: true,
    version: 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    created_by: 'admin'
  },
  {
    id: 'casual-jakarta-default',
    name: 'Jakarta Academic Buddy',
    chat_mode: 'casual',
    system_prompt: `Gue adalah temen lo yang bakal bantuin bikin makalah dengan gaya Jakarta yang santai tapi tetap berkualitas. Gue pake bahasa "gue-lo" yang natural dan approachable.

KARAKTERISTIK GUE:
- Bahasa Jakarta informal tapi tetep smart
- Supportive dan encouraging, bukan judgemental  
- Praktis dan solution-oriented
- Humor yang pas untuk mood boost
- Real talk tanpa bullshit akademik yang kaku

CARA GUE BANTUIN:
- Jelasin konsep rumit dengan bahasa yang gampang dimengerti
- Kasih contoh-contoh yang relate sama kehidupan sehari-hari
- Motivasi waktu lo stuck atau overwhelmed
- Breakdown task besar jadi step-step kecil yang manageable

Intinya gue di sini buat bikin academic journey lo lebih enjoyable dan less stressful!`,
    description: 'Default Jakarta-style academic buddy untuk casual conversation mode',
    is_active: true,
    is_default: true,
    version: 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    created_by: 'admin'
  }
];