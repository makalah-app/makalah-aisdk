-- ============================================
-- P05: Simplified Persona Template Storage Schema
-- ============================================
-- Task: P05 - Update Database Schema for Simplified Persona Template Storage
-- Purpose: Streamlined persona template storage with dual chat mode support
-- Removes: Complex audit, usage tracking, performance metrics from Task 02
-- Focus: Core template functionality with efficient retrieval

-- Drop existing complex schema if exists
DROP TABLE IF EXISTS persona_usage_sessions CASCADE;
DROP TABLE IF EXISTS persona_template_audit CASCADE;
DROP TABLE IF EXISTS persona_templates CASCADE;

-- Drop existing complex enums
DROP TYPE IF EXISTS persona_mode CASCADE;
DROP TYPE IF EXISTS academic_level CASCADE;
DROP TYPE IF EXISTS citation_style CASCADE;

-- Keep only essential chat mode enum
DROP TYPE IF EXISTS chat_mode_type CASCADE;
CREATE TYPE chat_mode_type AS ENUM ('formal', 'casual');

-- ============================================
-- SIMPLIFIED PERSONA TEMPLATES TABLE
-- ============================================
CREATE TABLE persona_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Core identification
    name VARCHAR(255) NOT NULL,
    chat_mode chat_mode_type NOT NULL,
    
    -- Core content
    system_prompt TEXT NOT NULL,
    description TEXT,
    
    -- Simple status management
    is_active BOOLEAN DEFAULT true,
    is_default BOOLEAN DEFAULT false,
    
    -- Version control (simplified)
    version INTEGER DEFAULT 1,
    
    -- Minimal metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID DEFAULT NULL,
    
    -- Ensure only one default per chat mode
    CONSTRAINT unique_default_per_chat_mode 
        UNIQUE (chat_mode, is_default) 
        DEFERRABLE INITIALLY DEFERRED
);

-- ============================================
-- CHAT MODE ASSOCIATIONS TABLE
-- ============================================
CREATE TABLE chat_mode_associations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Association data
    session_id VARCHAR(255) NOT NULL,
    chat_mode chat_mode_type NOT NULL,
    persona_template_id UUID REFERENCES persona_templates(id) ON DELETE SET NULL,
    
    -- Context for academic phases (simplified)
    academic_phase INTEGER DEFAULT NULL,
    
    -- Session timing
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '24 hours'),
    
    -- Unique session constraint
    CONSTRAINT unique_session_chat_mode UNIQUE (session_id, chat_mode)
);

-- ============================================
-- ADMIN TEMPLATE MANAGEMENT SUPPORT TABLE
-- ============================================
CREATE TABLE template_admin_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Action tracking
    persona_template_id UUID REFERENCES persona_templates(id) ON DELETE CASCADE,
    action_type VARCHAR(50) NOT NULL, -- 'created', 'updated', 'activated', 'deactivated', 'deleted'
    
    -- Simple change tracking
    old_values JSONB DEFAULT NULL,
    new_values JSONB DEFAULT NULL,
    
    -- Admin context
    performed_by UUID DEFAULT NULL,
    performed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    notes TEXT DEFAULT NULL
);

-- ============================================
-- PERFORMANCE-OPTIMIZED INDEXES
-- ============================================

-- Primary lookup indexes (sub-100ms requirement)
CREATE INDEX idx_persona_templates_active_chat_mode 
    ON persona_templates(chat_mode, is_active) 
    WHERE is_active = true;

CREATE INDEX idx_persona_templates_default_lookup 
    ON persona_templates(chat_mode, is_default, is_active) 
    WHERE is_default = true AND is_active = true;

-- Chat mode association indexes
CREATE INDEX idx_chat_mode_session_lookup 
    ON chat_mode_associations(session_id, chat_mode, expires_at) 
    WHERE expires_at > NOW();

CREATE INDEX idx_chat_mode_persona_lookup 
    ON chat_mode_associations(persona_template_id, created_at DESC);

-- Admin management indexes
CREATE INDEX idx_admin_actions_template_time 
    ON template_admin_actions(persona_template_id, performed_at DESC);

CREATE INDEX idx_admin_actions_type_time 
    ON template_admin_actions(action_type, performed_at DESC);

-- Full-text search index for template discovery
CREATE INDEX idx_persona_templates_search 
    ON persona_templates 
    USING gin(to_tsvector('indonesian', name || ' ' || COALESCE(description, '')));

-- ============================================
-- RLS POLICIES (SIMPLIFIED SECURITY)
-- ============================================

-- Enable RLS on all tables
ALTER TABLE persona_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_mode_associations ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_admin_actions ENABLE ROW LEVEL SECURITY;

-- Public read access for active persona templates
CREATE POLICY "Public read active persona templates" ON persona_templates
    FOR SELECT
    USING (is_active = true);

-- Chat mode associations (session-based access)
CREATE POLICY "Session-based chat mode access" ON chat_mode_associations
    FOR ALL
    USING (expires_at > NOW());

-- Admin template actions (admin access only)
CREATE POLICY "Admin template management" ON template_admin_actions
    FOR ALL
    USING (true) -- Will be refined based on admin role implementation
    WITH CHECK (true);

-- Admin full access to persona templates
CREATE POLICY "Admin full persona template access" ON persona_templates
    FOR ALL
    USING (true) -- Will be refined based on admin role implementation
    WITH CHECK (true);

-- ============================================
-- SIMPLIFIED TRIGGERS
-- ============================================

-- Update timestamp trigger (reuse existing function)
CREATE TRIGGER update_persona_templates_updated_at 
    BEFORE UPDATE ON persona_templates 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Simple admin action logging trigger
CREATE OR REPLACE FUNCTION log_persona_template_admin_action()
RETURNS TRIGGER AS $$
BEGIN
    -- Only log for administrative changes (skip routine updates)
    IF TG_OP = 'INSERT' THEN
        INSERT INTO template_admin_actions (persona_template_id, action_type, new_values, performed_by)
        VALUES (NEW.id, 'created', to_jsonb(NEW), NEW.created_by);
    ELSIF TG_OP = 'UPDATE' THEN
        -- Only log if significant fields changed
        IF (OLD.is_active != NEW.is_active OR OLD.system_prompt != NEW.system_prompt OR OLD.name != NEW.name) THEN
            INSERT INTO template_admin_actions (persona_template_id, action_type, old_values, new_values, performed_by)
            VALUES (NEW.id, 'updated', 
                    jsonb_build_object('name', OLD.name, 'system_prompt', LEFT(OLD.system_prompt, 100), 'is_active', OLD.is_active),
                    jsonb_build_object('name', NEW.name, 'system_prompt', LEFT(NEW.system_prompt, 100), 'is_active', NEW.is_active),
                    NEW.created_by);
        END IF;
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO template_admin_actions (persona_template_id, action_type, old_values)
        VALUES (OLD.id, 'deleted', to_jsonb(OLD));
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ language 'plpgsql';

CREATE TRIGGER persona_template_admin_action_trigger
    AFTER INSERT OR UPDATE OR DELETE ON persona_templates
    FOR EACH ROW
    EXECUTE FUNCTION log_persona_template_admin_action();

-- Chat mode session cleanup trigger
CREATE OR REPLACE FUNCTION cleanup_expired_chat_sessions()
RETURNS TRIGGER AS $$
BEGIN
    -- Clean up expired sessions on insert
    DELETE FROM chat_mode_associations 
    WHERE expires_at < NOW();
    
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER cleanup_chat_sessions_trigger
    AFTER INSERT ON chat_mode_associations
    FOR EACH STATEMENT
    EXECUTE FUNCTION cleanup_expired_chat_sessions();

-- ============================================
-- OPTIMIZED UTILITY FUNCTIONS
-- ============================================

-- Fast persona retrieval by chat mode (sub-100ms target)
CREATE OR REPLACE FUNCTION get_persona_by_chat_mode(
    p_chat_mode chat_mode_type,
    p_session_id VARCHAR(255) DEFAULT NULL
)
RETURNS TABLE(
    id UUID,
    name VARCHAR(255),
    system_prompt TEXT,
    description TEXT,
    version INTEGER
) AS $$
BEGIN
    -- First try to get session-specific persona
    IF p_session_id IS NOT NULL THEN
        RETURN QUERY
        SELECT pt.id, pt.name, pt.system_prompt, pt.description, pt.version
        FROM persona_templates pt
        JOIN chat_mode_associations cma ON pt.id = cma.persona_template_id
        WHERE cma.session_id = p_session_id 
        AND cma.chat_mode = p_chat_mode
        AND cma.expires_at > NOW()
        AND pt.is_active = true
        LIMIT 1;
        
        IF FOUND THEN
            RETURN;
        END IF;
    END IF;
    
    -- Fallback to default persona for chat mode
    RETURN QUERY
    SELECT pt.id, pt.name, pt.system_prompt, pt.description, pt.version
    FROM persona_templates pt
    WHERE pt.chat_mode = p_chat_mode
    AND pt.is_active = true
    AND pt.is_default = true
    LIMIT 1;
    
    -- Ultimate fallback: any active persona for the chat mode
    IF NOT FOUND THEN
        RETURN QUERY
        SELECT pt.id, pt.name, pt.system_prompt, pt.description, pt.version
        FROM persona_templates pt
        WHERE pt.chat_mode = p_chat_mode
        AND pt.is_active = true
        ORDER BY pt.created_at DESC
        LIMIT 1;
    END IF;
END;
$$ language 'plpgsql';

-- Set chat mode association for session
CREATE OR REPLACE FUNCTION set_session_chat_mode(
    p_session_id VARCHAR(255),
    p_chat_mode chat_mode_type,
    p_persona_template_id UUID DEFAULT NULL,
    p_academic_phase INTEGER DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    association_id UUID;
BEGIN
    -- Insert or update session association
    INSERT INTO chat_mode_associations (
        session_id,
        chat_mode,
        persona_template_id,
        academic_phase
    ) VALUES (
        p_session_id,
        p_chat_mode,
        p_persona_template_id,
        p_academic_phase
    )
    ON CONFLICT (session_id, chat_mode)
    DO UPDATE SET
        persona_template_id = COALESCE(p_persona_template_id, chat_mode_associations.persona_template_id),
        academic_phase = COALESCE(p_academic_phase, chat_mode_associations.academic_phase),
        expires_at = NOW() + INTERVAL '24 hours'
    RETURNING id INTO association_id;
    
    RETURN association_id;
END;
$$ language 'plpgsql';

-- Admin template management function
CREATE OR REPLACE FUNCTION admin_manage_template(
    p_template_id UUID,
    p_action VARCHAR(50),
    p_admin_id UUID DEFAULT NULL,
    p_notes TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
    CASE p_action
        WHEN 'activate' THEN
            UPDATE persona_templates 
            SET is_active = true, created_by = p_admin_id
            WHERE id = p_template_id;
            
        WHEN 'deactivate' THEN
            UPDATE persona_templates 
            SET is_active = false, created_by = p_admin_id
            WHERE id = p_template_id;
            
        WHEN 'set_default' THEN
            -- First clear other defaults for the same chat mode
            UPDATE persona_templates 
            SET is_default = false
            WHERE chat_mode = (SELECT chat_mode FROM persona_templates WHERE id = p_template_id)
            AND is_default = true;
            
            -- Set new default
            UPDATE persona_templates 
            SET is_default = true, created_by = p_admin_id
            WHERE id = p_template_id;
            
        ELSE
            RETURN false;
    END CASE;
    
    -- Log admin action with notes
    INSERT INTO template_admin_actions (persona_template_id, action_type, performed_by, notes)
    VALUES (p_template_id, p_action, p_admin_id, p_notes);
    
    RETURN true;
END;
$$ language 'plpgsql';

-- ============================================
-- PERFORMANCE MONITORING FUNCTION
-- ============================================

-- Function to measure persona retrieval performance
CREATE OR REPLACE FUNCTION test_persona_retrieval_performance()
RETURNS TABLE(
    chat_mode chat_mode_type,
    avg_duration_ms NUMERIC,
    max_duration_ms NUMERIC,
    min_duration_ms NUMERIC,
    test_runs INTEGER
) AS $$
DECLARE
    start_time TIMESTAMP WITH TIME ZONE;
    end_time TIMESTAMP WITH TIME ZONE;
    duration_ms NUMERIC;
    test_session VARCHAR(255);
BEGIN
    test_session := 'perf_test_' || extract(epoch from NOW());
    
    -- Test formal mode performance
    FOR i IN 1..10 LOOP
        start_time := clock_timestamp();
        PERFORM * FROM get_persona_by_chat_mode('formal', test_session);
        end_time := clock_timestamp();
        duration_ms := extract(milliseconds from (end_time - start_time));
        
        INSERT INTO template_admin_actions (action_type, notes, performed_at)
        VALUES ('performance_test', 'formal_mode:' || duration_ms || 'ms', start_time);
    END LOOP;
    
    -- Test casual mode performance  
    FOR i IN 1..10 LOOP
        start_time := clock_timestamp();
        PERFORM * FROM get_persona_by_chat_mode('casual', test_session);
        end_time := clock_timestamp();
        duration_ms := extract(milliseconds from (end_time - start_time));
        
        INSERT INTO template_admin_actions (action_type, notes, performed_at)
        VALUES ('performance_test', 'casual_mode:' || duration_ms || 'ms', start_time);
    END LOOP;
    
    -- Return performance statistics
    RETURN QUERY
    SELECT 
        CASE WHEN notes LIKE 'formal_mode%' THEN 'formal'::chat_mode_type ELSE 'casual'::chat_mode_type END,
        AVG(CAST(substring(notes from '\d+\.?\d*') AS NUMERIC)),
        MAX(CAST(substring(notes from '\d+\.?\d*') AS NUMERIC)),
        MIN(CAST(substring(notes from '\d+\.?\d*') AS NUMERIC)),
        COUNT(*)::INTEGER
    FROM template_admin_actions 
    WHERE action_type = 'performance_test' 
    AND notes LIKE '%_mode:%ms'
    GROUP BY (notes LIKE 'formal_mode%');
    
    -- Cleanup test records
    DELETE FROM template_admin_actions WHERE action_type = 'performance_test';
END;
$$ language 'plpgsql';

-- ============================================
-- DOCUMENTATION COMMENTS
-- ============================================

COMMENT ON TABLE persona_templates IS 'Simplified persona template storage for dual chat mode support';
COMMENT ON COLUMN persona_templates.system_prompt IS 'Complete system prompt for AI behavior injection';
COMMENT ON COLUMN persona_templates.chat_mode IS 'Chat mode: formal (academic) or casual (Jakarta-style)';

COMMENT ON TABLE chat_mode_associations IS 'Session-based chat mode and persona associations with 24h expiry';
COMMENT ON COLUMN chat_mode_associations.academic_phase IS 'Current academic workflow phase (1-8) for formal mode';

COMMENT ON TABLE template_admin_actions IS 'Simplified admin action logging for template management';

COMMENT ON FUNCTION get_persona_by_chat_mode(chat_mode_type, VARCHAR) IS 'High-performance persona retrieval optimized for sub-100ms response';
COMMENT ON FUNCTION set_session_chat_mode(VARCHAR, chat_mode_type, UUID, INTEGER) IS 'Associates chat mode and persona with user session';
COMMENT ON FUNCTION admin_manage_template(UUID, VARCHAR, UUID, TEXT) IS 'Admin interface for template activation, deactivation, and default setting';
COMMENT ON FUNCTION test_persona_retrieval_performance() IS 'Performance monitoring function to ensure sub-100ms retrieval times';