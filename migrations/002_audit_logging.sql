-- Migration: 002_audit_logging.sql
-- Description: Add audit logging for critical tables

BEGIN;

-- Create audit log table
CREATE TABLE audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_name VARCHAR(50) NOT NULL,
    operation VARCHAR(10) NOT NULL,
    user_id UUID,
    old_data JSONB,
    new_data JSONB,
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ip_address INET,
    session_id UUID REFERENCES sessions(id)
);

CREATE INDEX idx_audit_table ON audit_log(table_name);
CREATE INDEX idx_audit_operation ON audit_log(operation);
CREATE INDEX idx_audit_user ON audit_log(user_id);
CREATE INDEX idx_audit_changed ON audit_log(changed_at DESC);

-- Trigger function for audit logging
CREATE OR REPLACE FUNCTION audit_trigger()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        INSERT INTO audit_log (table_name, operation, user_id, old_data, new_data)
        VALUES (
            TG_TABLE_NAME,
            TG_OP,
            current_setting('app.current_user_id', true)::UUID,
            row_to_json(OLD),
            NULL
        );
        RETURN OLD;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO audit_log (table_name, operation, user_id, old_data, new_data)
        VALUES (
            TG_TABLE_NAME,
            TG_OP,
            current_setting('app.current_user_id', true)::UUID,
            row_to_json(OLD),
            row_to_json(NEW)
        );
        RETURN NEW;
    ELSIF TG_OP = 'INSERT' THEN
        INSERT INTO audit_log (table_name, operation, user_id, old_data, new_data)
        VALUES (
            TG_TABLE_NAME,
            TG_OP,
            current_setting('app.current_user_id', true)::UUID,
            NULL,
            row_to_json(NEW)
        );
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Add audit triggers to critical tables
CREATE TRIGGER audit_world_objects
    AFTER INSERT OR UPDATE OR DELETE ON world_objects
    FOR EACH ROW EXECUTE FUNCTION audit_trigger();

CREATE TRIGGER audit_uploaded_models
    AFTER INSERT OR UPDATE OR DELETE ON uploaded_models
    FOR EACH ROW EXECUTE FUNCTION audit_trigger();

CREATE TRIGGER audit_users
    AFTER INSERT OR UPDATE OR DELETE ON users
    FOR EACH ROW EXECUTE FUNCTION audit_trigger();

CREATE TRIGGER audit_spaces
    AFTER INSERT OR UPDATE OR DELETE ON spaces
    FOR EACH ROW EXECUTE FUNCTION audit_trigger();

CREATE TRIGGER audit_chat_messages
    AFTER INSERT OR UPDATE OR DELETE ON chat_messages
    FOR EACH ROW EXECUTE FUNCTION audit_trigger();

COMMIT;