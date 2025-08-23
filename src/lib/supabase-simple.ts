// Simplified Supabase Client untuk Core Functionality
// Focused on essential operations without complex schemas

import { createClient } from '@supabase/supabase-js'

// Simple database interface untuk core functionality
export interface SimpleDatabase {
  public: {
    Tables: {
      [key: string]: {
        Row: Record<string, any>
        Insert: Record<string, any>
        Update: Record<string, any>
      }
    }
  }
}

// Supabase client configuration
export class SimpleSupabaseClient {
  private client: any
  private isInitialized = false

  constructor() {
    this.initializeClient()
  }

  private initializeClient() {
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

      if (!supabaseUrl || !supabaseAnonKey) {
        console.warn('[SUPABASE] Environment variables not found, using mock client')
        this.client = this.createMockClient()
        return
      }

      this.client = createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          persistSession: false, // We handle JWT separately
          autoRefreshToken: false,
        },
        db: {
          schema: 'public',
        },
      })

      this.isInitialized = true
      console.log('[SUPABASE] Client initialized successfully')
    } catch (error) {
      console.error('[SUPABASE] Initialization failed:', error)
      this.client = this.createMockClient()
    }
  }

  private createMockClient() {
    return {
      from: () => ({
        select: () => Promise.resolve({ data: [], error: null }),
        insert: () => Promise.resolve({ data: null, error: null }),
        update: () => Promise.resolve({ data: null, error: null }),
        delete: () => Promise.resolve({ error: null }),
        eq: function() { return this },
        single: function() { return this },
      }),
      auth: {
        signInWithPassword: () => Promise.resolve({ 
          data: { user: null, session: null }, 
          error: { message: 'Mock client - no real auth' } 
        }),
        signOut: () => Promise.resolve({ error: null }),
        getUser: () => Promise.resolve({ data: { user: null }, error: null }),
      },
    }
  }

  getClient() {
    return this.client
  }

  isReady() {
    return this.isInitialized
  }

  // Simple CRUD operations
  async query(table: string, options: any = {}) {
    try {
      const { select, where, limit } = options
      let query = this.client.from(table)

      if (select) {
        query = query.select(select)
      } else {
        query = query.select('*')
      }

      if (where) {
        Object.entries(where).forEach(([key, value]) => {
          query = query.eq(key, value)
        })
      }

      if (limit) {
        query = query.limit(limit)
      }

      const { data, error } = await query

      if (error) {
        console.error(`[SUPABASE] Query error for table ${table}:`, error)
        return { data: null, error }
      }

      return { data, error: null }
    } catch (error) {
      console.error(`[SUPABASE] Query exception for table ${table}:`, error)
      return { data: null, error }
    }
  }

  async insert(table: string, data: Record<string, any>) {
    try {
      const { data: result, error } = await this.client
        .from(table)
        .insert(data)
        .select()
        .single()

      if (error) {
        console.error(`[SUPABASE] Insert error for table ${table}:`, error)
        return { data: null, error }
      }

      return { data: result, error: null }
    } catch (error) {
      console.error(`[SUPABASE] Insert exception for table ${table}:`, error)
      return { data: null, error }
    }
  }

  async update(table: string, id: string, updates: Record<string, any>) {
    try {
      const { data, error } = await this.client
        .from(table)
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) {
        console.error(`[SUPABASE] Update error for table ${table}:`, error)
        return { data: null, error }
      }

      return { data, error: null }
    } catch (error) {
      console.error(`[SUPABASE] Update exception for table ${table}:`, error)
      return { data: null, error }
    }
  }

  async delete(table: string, id: string) {
    try {
      const { error } = await this.client
        .from(table)
        .delete()
        .eq('id', id)

      if (error) {
        console.error(`[SUPABASE] Delete error for table ${table}:`, error)
        return { error }
      }

      return { error: null }
    } catch (error) {
      console.error(`[SUPABASE] Delete exception for table ${table}:`, error)
      return { error }
    }
  }

  // Health check
  async healthCheck() {
    try {
      if (!this.isInitialized) {
        return { healthy: false, message: 'Client not initialized' }
      }

      // Simple health check query
      const { data, error } = await this.client
        .from('users')
        .select('count')
        .limit(1)

      return {
        healthy: !error,
        message: error ? error.message : 'Database connection healthy',
        data: error ? null : data,
      }
    } catch (error) {
      return {
        healthy: false,
        message: error instanceof Error ? error.message : 'Unknown error',
        data: null,
      }
    }
  }
}

// Export singleton instance
export const simpleSupabase = new SimpleSupabaseClient()

// Export client untuk direct access if needed
export const getSupabaseClient = () => simpleSupabase.getClient()

// Helper functions untuk common operations
export const supabaseHelpers = {
  // User operations
  async getUser(id: string) {
    return simpleSupabase.query('users', { 
      where: { id },
      select: 'id, email, role, is_active, created_at'
    })
  },

  async getUserByEmail(email: string) {
    return simpleSupabase.query('users', {
      where: { email },
      select: 'id, email, role, is_active'
    })
  },

  // Project operations (if needed)
  async getUserProjects(userId: string) {
    return simpleSupabase.query('academic_projects', {
      where: { user_id: userId },
      select: 'id, title, current_phase, created_at, updated_at'
    })
  },

  // Health check
  async checkConnection() {
    return simpleSupabase.healthCheck()
  },
}