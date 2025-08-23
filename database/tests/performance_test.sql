-- ============================================
-- P05: Performance Testing for Simplified Persona Schema
-- ============================================
-- Task: P05 - Database Performance Validation for Sub-100ms Retrieval
-- Purpose: Comprehensive performance testing suite for persona template retrieval

-- ============================================
-- SETUP TEST DATA
-- ============================================

-- Insert test persona templates for both chat modes
INSERT INTO persona_templates (name, chat_mode, system_prompt, description, is_active, is_default) VALUES
('Test Academic Formal', 'formal', 'Test system prompt for formal academic mode with comprehensive instructions for academic research and writing.', 'Test formal persona', true, true),
('Test Academic Specialist', 'formal', 'Specialized test system prompt for advanced academic research with detailed methodology guidelines.', 'Test formal specialist', true, false),
('Test Jakarta Casual', 'casual', 'Gue adalah test persona buat mode casual yang pake bahasa Jakarta santai tapi tetap helpful.', 'Test casual persona', true, true),
('Test Creative Buddy', 'casual', 'Gue adalah creative partner lo yang suka brainstorming dan explore ide-ide keren buat academic projects.', 'Test creative casual', true, false);

-- Insert test chat mode associations
INSERT INTO chat_mode_associations (session_id, chat_mode, persona_template_id, academic_phase) 
SELECT 
  'test_session_' || i,
  CASE WHEN i % 2 = 0 THEN 'formal' ELSE 'casual' END,
  (SELECT id FROM persona_templates WHERE is_default = true AND chat_mode = CASE WHEN i % 2 = 0 THEN 'formal' ELSE 'casual' END LIMIT 1),
  (i % 8) + 1
FROM generate_series(1, 100) i;

-- ============================================
-- PERFORMANCE TEST 1: Basic Retrieval Speed
-- ============================================

-- Test persona retrieval by chat mode (target: <100ms)
DO $$
DECLARE
    start_time timestamp;
    end_time timestamp;
    duration_ms numeric;
    test_persona record;
    total_tests integer := 50;
    passed_tests integer := 0;
    failed_tests integer := 0;
BEGIN
    RAISE NOTICE 'Starting Basic Retrieval Speed Test (%s iterations)', total_tests;
    
    FOR i IN 1..total_tests LOOP
        start_time := clock_timestamp();
        
        SELECT * INTO test_persona 
        FROM get_persona_by_chat_mode(
            CASE WHEN i % 2 = 0 THEN 'formal' ELSE 'casual' END::chat_mode_type,
            'test_session_' || i
        );
        
        end_time := clock_timestamp();
        duration_ms := extract(milliseconds from (end_time - start_time));
        
        IF duration_ms <= 100 THEN
            passed_tests := passed_tests + 1;
        ELSE
            failed_tests := failed_tests + 1;
            RAISE NOTICE 'SLOW QUERY: Test % took %ms (>100ms threshold)', i, duration_ms;
        END IF;
        
        -- Log individual test result
        INSERT INTO template_admin_actions (action_type, notes)
        VALUES ('performance_test', 'basic_retrieval:' || duration_ms || 'ms');
    END LOOP;
    
    RAISE NOTICE 'Basic Retrieval Test Results: %/% passed (<100ms)', passed_tests, total_tests;
    RAISE NOTICE 'Performance: %% success rate', (passed_tests::numeric / total_tests::numeric * 100);
END $$;

-- ============================================
-- PERFORMANCE TEST 2: Concurrent Load Test
-- ============================================

-- Simulate concurrent persona retrievals
DO $$
DECLARE
    start_time timestamp;
    end_time timestamp;
    duration_ms numeric;
    concurrent_requests integer := 20;
BEGIN
    RAISE NOTICE 'Starting Concurrent Load Test (%s concurrent requests)', concurrent_requests;
    
    start_time := clock_timestamp();
    
    -- Simulate concurrent requests using parallel queries
    PERFORM (
        SELECT * FROM get_persona_by_chat_mode('formal', 'concurrent_test_' || i)
        FROM generate_series(1, concurrent_requests) i
    );
    
    end_time := clock_timestamp();
    duration_ms := extract(milliseconds from (end_time - start_time));
    
    RAISE NOTICE 'Concurrent Load Test: % concurrent requests completed in %ms', concurrent_requests, duration_ms;
    RAISE NOTICE 'Average per request: %ms', (duration_ms / concurrent_requests);
    
    INSERT INTO template_admin_actions (action_type, notes)
    VALUES ('performance_test', 'concurrent_load:' || concurrent_requests || '_requests_' || duration_ms || 'ms');
END $$;

-- ============================================
-- PERFORMANCE TEST 3: Index Effectiveness
-- ============================================

-- Test index usage for different query patterns
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT) 
SELECT * FROM persona_templates 
WHERE chat_mode = 'formal' AND is_active = true;

EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT * FROM persona_templates 
WHERE chat_mode = 'formal' AND is_default = true AND is_active = true;

EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT cma.*, pt.name, pt.system_prompt
FROM chat_mode_associations cma
JOIN persona_templates pt ON cma.persona_template_id = pt.id
WHERE cma.session_id = 'test_session_1' AND cma.expires_at > NOW();

-- ============================================
-- PERFORMANCE TEST 4: Full-Text Search Speed
-- ============================================

DO $$
DECLARE
    start_time timestamp;
    end_time timestamp;
    duration_ms numeric;
    search_terms text[] := ARRAY['academic', 'research', 'Jakarta', 'casual', 'formal'];
    search_term text;
    result_count integer;
BEGIN
    RAISE NOTICE 'Starting Full-Text Search Speed Test';
    
    FOREACH search_term IN ARRAY search_terms LOOP
        start_time := clock_timestamp();
        
        SELECT COUNT(*) INTO result_count
        FROM persona_templates 
        WHERE to_tsvector('indonesian', name || ' ' || COALESCE(description, '')) 
              @@ plainto_tsquery('indonesian', search_term);
        
        end_time := clock_timestamp();
        duration_ms := extract(milliseconds from (end_time - start_time));
        
        RAISE NOTICE 'Search for "%": % results in %ms', search_term, result_count, duration_ms;
        
        INSERT INTO template_admin_actions (action_type, notes)
        VALUES ('performance_test', 'search_' || search_term || ':' || duration_ms || 'ms');
    END LOOP;
END $$;

-- ============================================
-- PERFORMANCE TEST 5: Session Management Speed
-- ============================================

DO $$
DECLARE
    start_time timestamp;
    end_time timestamp;
    duration_ms numeric;
    session_count integer := 100;
    association_id uuid;
BEGIN
    RAISE NOTICE 'Starting Session Management Speed Test (%s sessions)', session_count;
    
    -- Test session creation speed
    start_time := clock_timestamp();
    
    FOR i IN 1..session_count LOOP
        SELECT set_session_chat_mode(
            'speed_test_session_' || i,
            CASE WHEN i % 2 = 0 THEN 'formal' ELSE 'casual' END::chat_mode_type,
            NULL,
            (i % 8) + 1
        ) INTO association_id;
    END LOOP;
    
    end_time := clock_timestamp();
    duration_ms := extract(milliseconds from (end_time - start_time));
    
    RAISE NOTICE 'Session Creation: % sessions in %ms (avg: %ms per session)', 
                 session_count, duration_ms, (duration_ms / session_count);
    
    -- Test session retrieval speed
    start_time := clock_timestamp();
    
    FOR i IN 1..session_count LOOP
        PERFORM * FROM chat_mode_associations 
        WHERE session_id = 'speed_test_session_' || i;
    END LOOP;
    
    end_time := clock_timestamp();
    duration_ms := extract(milliseconds from (end_time - start_time));
    
    RAISE NOTICE 'Session Retrieval: % sessions in %ms (avg: %ms per session)', 
                 session_count, duration_ms, (duration_ms / session_count);
    
    INSERT INTO template_admin_actions (action_type, notes)
    VALUES ('performance_test', 'session_mgmt:' || session_count || '_sessions_' || duration_ms || 'ms');
END $$;

-- ============================================
-- PERFORMANCE TEST 6: Database Function Speed
-- ============================================

-- Test all utility functions for performance
SELECT 'Testing get_persona_by_chat_mode function' as test_name;
SELECT * FROM test_persona_retrieval_performance();

-- Test admin management function speed
DO $$
DECLARE
    start_time timestamp;
    end_time timestamp;
    duration_ms numeric;
    test_template_id uuid;
    success boolean;
BEGIN
    -- Get a test template ID
    SELECT id INTO test_template_id 
    FROM persona_templates 
    WHERE name = 'Test Academic Formal' 
    LIMIT 1;
    
    -- Test activate/deactivate speed
    start_time := clock_timestamp();
    
    SELECT admin_manage_template(test_template_id, 'deactivate', NULL, 'Speed test') INTO success;
    SELECT admin_manage_template(test_template_id, 'activate', NULL, 'Speed test') INTO success;
    
    end_time := clock_timestamp();
    duration_ms := extract(milliseconds from (end_time - start_time));
    
    RAISE NOTICE 'Admin Management Function: Activate/Deactivate in %ms', duration_ms;
    
    INSERT INTO template_admin_actions (action_type, notes)
    VALUES ('performance_test', 'admin_mgmt_functions:' || duration_ms || 'ms');
END $$;

-- ============================================
-- PERFORMANCE SUMMARY REPORT
-- ============================================

-- Generate performance summary from test results
SELECT 
    'PERFORMANCE SUMMARY REPORT' as report_section,
    NOW() as generated_at;

-- Basic performance statistics
SELECT 
    'Basic Retrieval Performance' as test_category,
    COUNT(*) as total_tests,
    AVG(CAST(substring(notes from '\d+\.?\d*') AS NUMERIC)) as avg_duration_ms,
    MIN(CAST(substring(notes from '\d+\.?\d*') AS NUMERIC)) as min_duration_ms,
    MAX(CAST(substring(notes from '\d+\.?\d*') AS NUMERIC)) as max_duration_ms,
    PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY CAST(substring(notes from '\d+\.?\d*') AS NUMERIC)) as p95_duration_ms,
    SUM(CASE WHEN CAST(substring(notes from '\d+\.?\d*') AS NUMERIC) <= 100 THEN 1 ELSE 0 END) as under_100ms_count,
    ROUND(
        SUM(CASE WHEN CAST(substring(notes from '\d+\.?\d*') AS NUMERIC) <= 100 THEN 1 ELSE 0 END)::numeric / 
        COUNT(*)::numeric * 100, 2
    ) as success_rate_percent
FROM template_admin_actions 
WHERE action_type = 'performance_test' 
AND notes LIKE 'basic_retrieval:%ms'
AND performed_at > NOW() - INTERVAL '1 hour';

-- Performance by test type
SELECT 
    CASE 
        WHEN notes LIKE 'basic_retrieval:%' THEN 'Basic Retrieval'
        WHEN notes LIKE 'concurrent_load:%' THEN 'Concurrent Load'
        WHEN notes LIKE 'search_%:%' THEN 'Full-Text Search'
        WHEN notes LIKE 'session_mgmt:%' THEN 'Session Management'
        WHEN notes LIKE 'admin_mgmt_functions:%' THEN 'Admin Functions'
        ELSE 'Other'
    END as test_type,
    COUNT(*) as test_count,
    AVG(CAST(substring(notes from '\d+\.?\d*') AS NUMERIC)) as avg_duration_ms,
    MAX(CAST(substring(notes from '\d+\.?\d*') AS NUMERIC)) as max_duration_ms
FROM template_admin_actions 
WHERE action_type = 'performance_test' 
AND performed_at > NOW() - INTERVAL '1 hour'
AND notes ~ '\d+\.?\d*ms'
GROUP BY test_type
ORDER BY avg_duration_ms;

-- Performance alerts (queries over threshold)
SELECT 
    'PERFORMANCE ALERTS' as alert_section,
    notes,
    CAST(substring(notes from '\d+\.?\d*') AS NUMERIC) as duration_ms,
    performed_at
FROM template_admin_actions 
WHERE action_type = 'performance_test' 
AND CAST(substring(notes from '\d+\.?\d*') AS NUMERIC) > 100
AND performed_at > NOW() - INTERVAL '1 hour'
ORDER BY duration_ms DESC;

-- Database statistics
SELECT 
    'DATABASE STATISTICS' as stats_section,
    (SELECT COUNT(*) FROM persona_templates WHERE is_active = true) as active_templates,
    (SELECT COUNT(*) FROM chat_mode_associations WHERE expires_at > NOW()) as active_associations,
    (SELECT COUNT(*) FROM template_admin_actions WHERE performed_at > NOW() - INTERVAL '1 hour') as recent_actions;

-- ============================================
-- CLEANUP TEST DATA
-- ============================================

-- Clean up test performance records
DELETE FROM template_admin_actions WHERE action_type = 'performance_test';

-- Clean up test chat mode associations
DELETE FROM chat_mode_associations WHERE session_id LIKE 'test_session_%' OR session_id LIKE 'speed_test_session_%' OR session_id LIKE 'concurrent_test_%';

-- Keep test persona templates for future testing
-- DELETE FROM persona_templates WHERE name LIKE 'Test %';

SELECT 'Performance testing completed. Test data cleaned up.' as completion_status;