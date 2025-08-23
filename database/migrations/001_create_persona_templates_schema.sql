-- ============================================
-- P02: Persona Template Storage Schema
-- ============================================
-- Task: P02 - Implement System Prompt Persona Behavior
-- Purpose: Database-driven persona template storage with RLS policies

-- Create enum for chat mode types
CREATE TYPE chat_mode_type AS ENUM ('formal', 'casual');

-- Create enum for persona modes  
CREATE TYPE persona_mode AS ENUM ('Research', 'Writing', 'Review');

-- Create enum for academic levels
CREATE TYPE academic_level AS ENUM ('undergraduate', 'graduate', 'postgraduate');

-- Create enum for citation styles
CREATE TYPE citation_style AS ENUM ('APA', 'MLA', 'Chicago', 'IEEE');

-- ============================================
-- PERSONA TEMPLATES TABLE
-- ============================================
CREATE TABLE persona_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    mode persona_mode NOT NULL,
    chat_mode_type chat_mode_type NOT NULL,
    system_prompt TEXT NOT NULL,
    description TEXT,
    
    -- Configuration JSON for persona behavior
    configuration JSONB DEFAULT '{}'::jsonb,
    
    -- Metadata and versioning
    version INTEGER DEFAULT 1,
    is_active BOOLEAN DEFAULT true,
    is_default BOOLEAN DEFAULT false,
    
    -- Performance tracking
    usage_count INTEGER DEFAULT 0,
    success_rate DECIMAL(3,2) DEFAULT 0.00,
    avg_response_time INTEGER DEFAULT 0, -- in milliseconds
    
    -- Audit trail
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    
    -- Constraints
    CONSTRAINT unique_default_per_mode_type UNIQUE (mode, chat_mode_type, is_default) DEFERRABLE INITIALLY DEFERRED
);

-- ============================================
-- PERSONA TEMPLATE AUDIT LOG
-- ============================================
CREATE TABLE persona_template_audit (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    persona_template_id UUID NOT NULL REFERENCES persona_templates(id) ON DELETE CASCADE,
    action VARCHAR(20) NOT NULL, -- 'created', 'updated', 'deleted', 'activated', 'deactivated'
    changes JSONB,
    performed_by UUID,
    performed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- PERSONA USAGE TRACKING
-- ============================================
CREATE TABLE persona_usage_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    persona_template_id UUID NOT NULL REFERENCES persona_templates(id) ON DELETE CASCADE,
    session_id VARCHAR(255),
    chat_mode chat_mode_type NOT NULL,
    
    -- Performance metrics
    response_time INTEGER, -- milliseconds
    quality_score DECIMAL(3,2), -- 1.00 to 5.00
    user_satisfaction INTEGER, -- 1-5 rating
    
    -- Session context
    academic_phase INTEGER,
    discipline VARCHAR(255),
    academic_level academic_level,
    citation_style citation_style,
    
    -- Timing
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ended_at TIMESTAMP WITH TIME ZONE,
    duration INTEGER -- calculated in seconds
);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

-- Primary lookup indexes
CREATE INDEX idx_persona_templates_active ON persona_templates(is_active) WHERE is_active = true;
CREATE INDEX idx_persona_templates_mode_chat_type ON persona_templates(mode, chat_mode_type, is_active);
CREATE INDEX idx_persona_templates_default ON persona_templates(is_default, mode, chat_mode_type) WHERE is_default = true;

-- Performance tracking indexes
CREATE INDEX idx_persona_templates_usage ON persona_templates(usage_count DESC, success_rate DESC);
CREATE INDEX idx_persona_templates_performance ON persona_templates(avg_response_time ASC, success_rate DESC);

-- Audit and tracking indexes
CREATE INDEX idx_persona_audit_template_id ON persona_template_audit(persona_template_id, performed_at DESC);
CREATE INDEX idx_persona_usage_template_id ON persona_usage_sessions(persona_template_id, started_at DESC);
CREATE INDEX idx_persona_usage_session ON persona_usage_sessions(session_id, started_at DESC);

-- Search and filtering indexes
CREATE INDEX idx_persona_templates_name_search ON persona_templates USING gin(to_tsvector('indonesian', name || ' ' || description));

-- ============================================
-- RLS POLICIES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE persona_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE persona_template_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE persona_usage_sessions ENABLE ROW LEVEL SECURITY;

-- Policy for reading persona templates (public access for active templates)
CREATE POLICY "Public read access for active persona templates" ON persona_templates
    FOR SELECT
    USING (is_active = true);

-- Policy for reading usage sessions (restrict to own sessions)
CREATE POLICY "Users can read their own usage sessions" ON persona_usage_sessions
    FOR SELECT
    USING (true); -- We'll refine this based on auth setup

-- Policy for inserting usage sessions
CREATE POLICY "Users can insert usage sessions" ON persona_usage_sessions
    FOR INSERT
    WITH CHECK (true); -- We'll refine this based on auth setup

-- Admin policies (will be refined based on auth implementation)
CREATE POLICY "Admins full access to persona templates" ON persona_templates
    FOR ALL
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Admins full access to audit log" ON persona_template_audit
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- ============================================
-- TRIGGERS FOR AUTOMATION
-- ============================================

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_persona_templates_updated_at 
    BEFORE UPDATE ON persona_templates 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Audit log trigger
CREATE OR REPLACE FUNCTION persona_template_audit_trigger()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO persona_template_audit (persona_template_id, action, changes, performed_by)
        VALUES (NEW.id, 'created', to_jsonb(NEW), NEW.created_by);
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO persona_template_audit (persona_template_id, action, changes, performed_by)
        VALUES (NEW.id, 'updated', 
                jsonb_build_object(
                    'old', to_jsonb(OLD),
                    'new', to_jsonb(NEW)
                ), 
                NEW.updated_by);
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO persona_template_audit (persona_template_id, action, changes, performed_by)
        VALUES (OLD.id, 'deleted', to_jsonb(OLD), OLD.updated_by);
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ language 'plpgsql';

CREATE TRIGGER persona_template_audit_trigger
    AFTER INSERT OR UPDATE OR DELETE ON persona_templates
    FOR EACH ROW
    EXECUTE FUNCTION persona_template_audit_trigger();

-- Usage tracking calculation trigger
CREATE OR REPLACE FUNCTION calculate_persona_usage_stats()
RETURNS TRIGGER AS $$
BEGIN
    -- Update persona template usage statistics
    UPDATE persona_templates 
    SET 
        usage_count = (
            SELECT COUNT(*) 
            FROM persona_usage_sessions 
            WHERE persona_template_id = NEW.persona_template_id
        ),
        avg_response_time = (
            SELECT AVG(response_time)::INTEGER 
            FROM persona_usage_sessions 
            WHERE persona_template_id = NEW.persona_template_id 
            AND response_time IS NOT NULL
        ),
        success_rate = (
            SELECT AVG(CASE WHEN quality_score >= 3.0 THEN 1.0 ELSE 0.0 END)
            FROM persona_usage_sessions 
            WHERE persona_template_id = NEW.persona_template_id 
            AND quality_score IS NOT NULL
        )
    WHERE id = NEW.persona_template_id;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER calculate_persona_usage_stats_trigger
    AFTER INSERT OR UPDATE ON persona_usage_sessions
    FOR EACH ROW
    EXECUTE FUNCTION calculate_persona_usage_stats();

-- ============================================
-- UTILITY FUNCTIONS
-- ============================================

-- Function to get active persona by mode and chat type
CREATE OR REPLACE FUNCTION get_active_persona_by_mode(
    p_mode persona_mode,
    p_chat_mode_type chat_mode_type,
    prefer_default boolean DEFAULT true
)
RETURNS persona_templates AS $$
DECLARE
    result persona_templates;
BEGIN
    -- Try to get default persona first if preferred
    IF prefer_default THEN
        SELECT * INTO result
        FROM persona_templates
        WHERE mode = p_mode 
        AND chat_mode_type = p_chat_mode_type
        AND is_active = true
        AND is_default = true
        LIMIT 1;
        
        IF FOUND THEN
            RETURN result;
        END IF;
    END IF;
    
    -- Fallback to best performing active persona
    SELECT * INTO result
    FROM persona_templates
    WHERE mode = p_mode 
    AND chat_mode_type = p_chat_mode_type
    AND is_active = true
    ORDER BY success_rate DESC, usage_count DESC
    LIMIT 1;
    
    RETURN result;
END;
$$ language 'plpgsql';

-- Function to track persona usage
CREATE OR REPLACE FUNCTION track_persona_usage(
    p_persona_template_id UUID,
    p_session_id VARCHAR(255),
    p_chat_mode chat_mode_type,
    p_response_time INTEGER DEFAULT NULL,
    p_quality_score DECIMAL(3,2) DEFAULT NULL,
    p_academic_phase INTEGER DEFAULT NULL,
    p_discipline VARCHAR(255) DEFAULT NULL,
    p_academic_level academic_level DEFAULT NULL,
    p_citation_style citation_style DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    usage_id UUID;
BEGIN
    INSERT INTO persona_usage_sessions (
        persona_template_id,
        session_id,
        chat_mode,
        response_time,
        quality_score,
        academic_phase,
        discipline,
        academic_level,
        citation_style
    ) VALUES (
        p_persona_template_id,
        p_session_id,
        p_chat_mode,
        p_response_time,
        p_quality_score,
        p_academic_phase,
        p_discipline,
        p_academic_level,
        p_citation_style
    ) RETURNING id INTO usage_id;
    
    RETURN usage_id;
END;
$$ language 'plpgsql';

-- ============================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================

COMMENT ON TABLE persona_templates IS 'Storage for AI persona templates with system prompts and configurations';
COMMENT ON COLUMN persona_templates.system_prompt IS 'The complete system prompt text for AI behavior';
COMMENT ON COLUMN persona_templates.configuration IS 'JSON configuration for persona behavior (temperature, tools_enabled, etc.)';
COMMENT ON COLUMN persona_templates.success_rate IS 'Calculated success rate based on user feedback and quality scores';

COMMENT ON TABLE persona_template_audit IS 'Audit trail for all changes to persona templates';
COMMENT ON TABLE persona_usage_sessions IS 'Tracking table for persona usage analytics and performance metrics';

COMMENT ON FUNCTION get_active_persona_by_mode(persona_mode, chat_mode_type, boolean) IS 'Retrieves active persona template by mode and chat type, preferring default if available';
COMMENT ON FUNCTION track_persona_usage(UUID, VARCHAR, chat_mode_type, INTEGER, DECIMAL, INTEGER, VARCHAR, academic_level, citation_style) IS 'Records persona usage session for analytics and performance tracking';