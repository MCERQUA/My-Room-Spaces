-- Migration: 003_analytics_views.sql
-- Description: Create materialized views and analytics functions

BEGIN;

-- Materialized view for space statistics
CREATE MATERIALIZED VIEW space_statistics AS
SELECT 
    s.id as space_id,
    s.name,
    s.created_at,
    COUNT(DISTINCT ses.user_id) as total_unique_users,
    COUNT(DISTINCT CASE WHEN ses.is_active THEN ses.user_id END) as active_users,
    COUNT(DISTINCT o.id) as total_objects,
    COUNT(DISTINCT m.id) as total_models,
    COUNT(DISTINCT msg.id) as total_messages,
    COUNT(DISTINCT ss.id) as total_screen_shares,
    MAX(ses.connected_at) as last_activity,
    COALESCE(SUM(ses.duration_seconds), 0) as total_session_time,
    AVG(ses.duration_seconds) as avg_session_duration
FROM spaces s
LEFT JOIN sessions ses ON s.id = ses.space_id
LEFT JOIN world_objects o ON s.id = o.space_id
LEFT JOIN uploaded_models m ON s.id = m.space_id
LEFT JOIN chat_messages msg ON s.id = msg.space_id
LEFT JOIN screen_shares ss ON s.id = ss.space_id
GROUP BY s.id, s.name, s.created_at;

CREATE UNIQUE INDEX idx_space_stats_id ON space_statistics(space_id);
CREATE INDEX idx_space_stats_name ON space_statistics(name);

-- Materialized view for user statistics
CREATE MATERIALIZED VIEW user_statistics AS
SELECT 
    u.id as user_id,
    u.username,
    u.created_at,
    u.last_seen_at,
    COUNT(DISTINCT o.id) as objects_created,
    COUNT(DISTINCT m.id) as models_uploaded,
    COUNT(DISTINCT msg.id) as messages_sent,
    COUNT(DISTINCT ss.id) as screens_shared,
    COUNT(DISTINCT ses.id) as total_sessions,
    COALESCE(SUM(ses.duration_seconds), 0) as total_time_online,
    COUNT(DISTINCT ses.space_id) as spaces_visited
FROM users u
LEFT JOIN world_objects o ON u.id = o.created_by
LEFT JOIN uploaded_models m ON u.id = m.uploaded_by
LEFT JOIN chat_messages msg ON u.id = msg.user_id
LEFT JOIN screen_shares ss ON u.id = ss.user_id
LEFT JOIN sessions ses ON u.id = ses.user_id
GROUP BY u.id, u.username, u.created_at, u.last_seen_at;

CREATE UNIQUE INDEX idx_user_stats_id ON user_statistics(user_id);
CREATE INDEX idx_user_stats_username ON user_statistics(username);

-- Materialized view for popular models
CREATE MATERIALIZED VIEW popular_models AS
SELECT 
    m.id,
    m.model_id,
    m.name,
    m.public_url,
    m.thumbnail_url,
    m.uploaded_by,
    u.username as uploader_name,
    m.uploaded_at,
    m.usage_count,
    m.file_size_bytes,
    COUNT(DISTINCT o.id) as instances_count,
    COUNT(DISTINCT o.space_id) as spaces_using
FROM uploaded_models m
LEFT JOIN users u ON m.uploaded_by = u.id
LEFT JOIN world_objects o ON m.id = o.model_id
WHERE m.is_public = true
GROUP BY m.id, m.model_id, m.name, m.public_url, m.thumbnail_url, 
         m.uploaded_by, u.username, m.uploaded_at, m.usage_count, m.file_size_bytes
ORDER BY m.usage_count DESC, instances_count DESC;

CREATE INDEX idx_popular_models_usage ON popular_models(usage_count DESC);
CREATE INDEX idx_popular_models_instances ON popular_models(instances_count DESC);

-- Function to refresh all materialized views
CREATE OR REPLACE FUNCTION refresh_all_materialized_views()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY space_statistics;
    REFRESH MATERIALIZED VIEW CONCURRENTLY user_statistics;
    REFRESH MATERIALIZED VIEW CONCURRENTLY popular_models;
END;
$$ LANGUAGE plpgsql;

-- Function to get space activity over time
CREATE OR REPLACE FUNCTION get_space_activity(
    p_space_id UUID,
    p_interval INTERVAL DEFAULT '1 day'
)
RETURNS TABLE (
    time_bucket TIMESTAMP,
    active_users BIGINT,
    messages_sent BIGINT,
    objects_created BIGINT,
    screen_shares BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        date_trunc('hour', series.time_bucket) as time_bucket,
        COUNT(DISTINCT s.user_id) as active_users,
        COUNT(DISTINCT m.id) as messages_sent,
        COUNT(DISTINCT o.id) as objects_created,
        COUNT(DISTINCT ss.id) as screen_shares
    FROM generate_series(
        CURRENT_TIMESTAMP - p_interval,
        CURRENT_TIMESTAMP,
        '1 hour'::interval
    ) series(time_bucket)
    LEFT JOIN sessions s ON s.space_id = p_space_id 
        AND s.connected_at <= series.time_bucket 
        AND (s.disconnected_at IS NULL OR s.disconnected_at >= series.time_bucket)
    LEFT JOIN chat_messages m ON m.space_id = p_space_id 
        AND m.created_at >= series.time_bucket 
        AND m.created_at < series.time_bucket + '1 hour'::interval
    LEFT JOIN world_objects o ON o.space_id = p_space_id 
        AND o.created_at >= series.time_bucket 
        AND o.created_at < series.time_bucket + '1 hour'::interval
    LEFT JOIN screen_shares ss ON ss.space_id = p_space_id 
        AND ss.started_at >= series.time_bucket 
        AND ss.started_at < series.time_bucket + '1 hour'::interval
    GROUP BY series.time_bucket
    ORDER BY series.time_bucket;
END;
$$ LANGUAGE plpgsql;

-- Function to get user activity summary
CREATE OR REPLACE FUNCTION get_user_activity_summary(p_user_id UUID)
RETURNS TABLE (
    metric_name TEXT,
    metric_value BIGINT,
    last_occurrence TIMESTAMP
) AS $$
BEGIN
    RETURN QUERY
    SELECT 'Objects Created'::TEXT, COUNT(*)::BIGINT, MAX(created_at)
    FROM world_objects WHERE created_by = p_user_id
    UNION ALL
    SELECT 'Models Uploaded'::TEXT, COUNT(*)::BIGINT, MAX(uploaded_at)
    FROM uploaded_models WHERE uploaded_by = p_user_id
    UNION ALL
    SELECT 'Messages Sent'::TEXT, COUNT(*)::BIGINT, MAX(created_at)
    FROM chat_messages WHERE user_id = p_user_id
    UNION ALL
    SELECT 'Screen Shares'::TEXT, COUNT(*)::BIGINT, MAX(started_at)
    FROM screen_shares WHERE user_id = p_user_id
    UNION ALL
    SELECT 'Sessions'::TEXT, COUNT(*)::BIGINT, MAX(connected_at)
    FROM sessions WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql;

COMMIT;