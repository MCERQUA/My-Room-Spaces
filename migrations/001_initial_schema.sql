-- Migration: 001_initial_schema.sql
-- Description: Initial database schema for 3D World persistence system

BEGIN;

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. SPACES TABLE - Virtual World Instances
CREATE TABLE spaces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    owner_id UUID,
    settings JSONB DEFAULT '{}',
    is_public BOOLEAN DEFAULT true,
    max_users INTEGER DEFAULT 100,
    visitor_count INTEGER DEFAULT 0,
    total_runtime_seconds INTEGER DEFAULT 0,
    last_active_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_spaces_name ON spaces(name);
CREATE INDEX idx_spaces_public ON spaces(is_public);

-- 2. USERS TABLE - User Accounts & Profiles
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) UNIQUE,
    display_name VARCHAR(100),
    email VARCHAR(255) UNIQUE,
    avatar_url TEXT,
    custom_avatar_model_id UUID,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_seen_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    total_time_seconds INTEGER DEFAULT 0,
    preferences JSONB DEFAULT '{}',
    stats JSONB DEFAULT '{
        "objects_created": 0,
        "messages_sent": 0,
        "screens_shared": 0,
        "models_uploaded": 0
    }',
    auth_provider VARCHAR(50), -- 'local', 'google', 'github'
    auth_id VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    is_admin BOOLEAN DEFAULT false
);

CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_last_seen ON users(last_seen_at);

-- Add foreign key constraint after users table exists
ALTER TABLE spaces ADD CONSTRAINT fk_spaces_owner 
    FOREIGN KEY (owner_id) REFERENCES users(id);

-- 3. SESSIONS TABLE - Active User Sessions
CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    space_id UUID REFERENCES spaces(id) ON DELETE CASCADE,
    socket_id VARCHAR(255) UNIQUE NOT NULL,
    ip_address INET,
    user_agent TEXT,
    connected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    disconnected_at TIMESTAMP,
    duration_seconds INTEGER,
    position JSONB, -- {x, y, z}
    rotation JSONB, -- {x, y, z}
    is_active BOOLEAN DEFAULT true
);

CREATE INDEX idx_sessions_user ON sessions(user_id);
CREATE INDEX idx_sessions_space ON sessions(space_id);
CREATE INDEX idx_sessions_active ON sessions(is_active);

-- 4. UPLOADED_MODELS TABLE - GLB/GLTF Model Registry
CREATE TABLE uploaded_models (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    model_id VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    original_filename VARCHAR(255),
    
    -- Storage
    r2_key VARCHAR(500) NOT NULL,
    public_url TEXT NOT NULL,
    mobile_url TEXT,
    thumbnail_url TEXT,
    
    -- Metadata
    file_size_bytes BIGINT,
    format VARCHAR(10), -- 'glb', 'gltf'
    mime_type VARCHAR(100),
    
    -- Validation & Processing
    validation_status VARCHAR(50) DEFAULT 'pending',
    validation_details JSONB,
    processing_status VARCHAR(50) DEFAULT 'pending',
    processed_at TIMESTAMP,
    
    -- Model Info
    model_metadata JSONB DEFAULT '{}',
    bounding_box JSONB,
    
    -- Ownership & Permissions
    uploaded_by UUID REFERENCES users(id),
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    space_id UUID REFERENCES spaces(id),
    is_public BOOLEAN DEFAULT false,
    tags TEXT[],
    
    -- Usage Stats
    usage_count INTEGER DEFAULT 0,
    last_used_at TIMESTAMP,
    total_bandwidth_bytes BIGINT DEFAULT 0
);

CREATE INDEX idx_models_uploaded_by ON uploaded_models(uploaded_by);
CREATE INDEX idx_models_space ON uploaded_models(space_id);
CREATE INDEX idx_models_public ON uploaded_models(is_public);
CREATE INDEX idx_models_tags ON uploaded_models USING GIN(tags);

-- Update users table foreign key for custom avatar
ALTER TABLE users ADD CONSTRAINT fk_users_avatar_model 
    FOREIGN KEY (custom_avatar_model_id) REFERENCES uploaded_models(id);

-- 5. WORLD_OBJECTS TABLE - 3D Objects in Scene
CREATE TABLE world_objects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    object_id VARCHAR(255) UNIQUE NOT NULL,
    space_id UUID REFERENCES spaces(id) ON DELETE CASCADE,
    name VARCHAR(255),
    type VARCHAR(50), -- 'model', 'primitive', 'light', 'camera'
    position JSONB NOT NULL, -- {x, y, z}
    rotation JSONB NOT NULL, -- {x, y, z}
    scale JSONB NOT NULL, -- {x, y, z}
    
    -- Model reference
    model_id UUID REFERENCES uploaded_models(id),
    model_url TEXT,
    
    -- Metadata
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_by UUID REFERENCES users(id),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Properties
    properties JSONB DEFAULT '{}',
    physics JSONB DEFAULT '{"static": true}',
    visibility BOOLEAN DEFAULT true,
    locked BOOLEAN DEFAULT false,
    
    -- Interaction tracking
    interaction_count INTEGER DEFAULT 0,
    last_interacted_at TIMESTAMP
);

CREATE INDEX idx_objects_space ON world_objects(space_id);
CREATE INDEX idx_objects_model ON world_objects(model_id);
CREATE INDEX idx_objects_created_by ON world_objects(created_by);
CREATE INDEX idx_objects_visibility ON world_objects(visibility);

-- 6. CHAT_MESSAGES TABLE - Persistent Chat History
CREATE TABLE chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    space_id UUID REFERENCES spaces(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    username VARCHAR(100),
    message TEXT NOT NULL,
    message_type VARCHAR(20) DEFAULT 'text',
    
    -- Attachments
    attachment_url TEXT,
    attachment_type VARCHAR(50),
    attachment_size_bytes INTEGER,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    edited_at TIMESTAMP,
    deleted_at TIMESTAMP,
    
    -- Moderation
    is_flagged BOOLEAN DEFAULT false,
    flagged_reason TEXT,
    moderated_by UUID REFERENCES users(id)
);

CREATE INDEX idx_chat_space ON chat_messages(space_id);
CREATE INDEX idx_chat_user ON chat_messages(user_id);
CREATE INDEX idx_chat_created ON chat_messages(created_at DESC);
CREATE INDEX idx_chat_not_deleted ON chat_messages(deleted_at) WHERE deleted_at IS NULL;

-- 7. SCREEN_SHARES TABLE - Screen Sharing Sessions
CREATE TABLE screen_shares (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    space_id UUID REFERENCES spaces(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMP,
    duration_seconds INTEGER,
    share_type VARCHAR(50), -- 'screen', 'window', 'tab', 'video_file'
    
    -- For video files
    video_url TEXT,
    video_filename VARCHAR(255),
    
    -- Stats
    viewer_count INTEGER DEFAULT 0,
    peak_viewers INTEGER DEFAULT 0,
    total_view_seconds INTEGER DEFAULT 0
);

CREATE INDEX idx_shares_space ON screen_shares(space_id);
CREATE INDEX idx_shares_user ON screen_shares(user_id);
CREATE INDEX idx_shares_active ON screen_shares(ended_at) WHERE ended_at IS NULL;

-- 8. VISITOR_TRACKING TABLE - Anonymous Visitor Analytics
CREATE TABLE visitor_tracking (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    visitor_id VARCHAR(255) NOT NULL,
    space_id UUID REFERENCES spaces(id) ON DELETE CASCADE,
    ip_address INET,
    country_code VARCHAR(2),
    city VARCHAR(100),
    user_agent TEXT,
    device_type VARCHAR(20),
    browser VARCHAR(50),
    os VARCHAR(50),
    
    -- Session info
    first_visit_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_visit_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    visit_count INTEGER DEFAULT 1,
    total_duration_seconds INTEGER DEFAULT 0,
    
    -- Behavior
    objects_interacted INTEGER DEFAULT 0,
    messages_sent INTEGER DEFAULT 0,
    models_uploaded INTEGER DEFAULT 0,
    
    -- Conversion
    registered_user_id UUID REFERENCES users(id),
    converted_at TIMESTAMP
);

CREATE INDEX idx_visitors_space ON visitor_tracking(space_id);
CREATE INDEX idx_visitors_visitor ON visitor_tracking(visitor_id);
CREATE INDEX idx_visitors_converted ON visitor_tracking(registered_user_id) 
    WHERE registered_user_id IS NOT NULL;

-- 9. EVENTS TABLE - Event Logging & Analytics
CREATE TABLE events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type VARCHAR(100) NOT NULL,
    space_id UUID REFERENCES spaces(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    session_id UUID REFERENCES sessions(id) ON DELETE SET NULL,
    
    -- Event data
    payload JSONB DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    
    -- Timing
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Performance
    duration_ms INTEGER,
    error_message TEXT
);

CREATE INDEX idx_events_type ON events(event_type);
CREATE INDEX idx_events_space ON events(space_id);
CREATE INDEX idx_events_user ON events(user_id);
CREATE INDEX idx_events_created ON events(created_at DESC);

-- 10. MEDIA_ASSETS TABLE - Screenshots, Avatars, Attachments
CREATE TABLE media_assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    asset_type VARCHAR(50) NOT NULL,
    
    -- Storage
    r2_key VARCHAR(500) NOT NULL,
    public_url TEXT NOT NULL,
    cdn_url TEXT,
    
    -- Metadata
    filename VARCHAR(255),
    mime_type VARCHAR(100),
    size_bytes BIGINT,
    width INTEGER,
    height INTEGER,
    duration_seconds NUMERIC,
    
    -- Relations
    uploaded_by UUID REFERENCES users(id),
    space_id UUID REFERENCES spaces(id),
    object_id UUID REFERENCES world_objects(id),
    message_id UUID REFERENCES chat_messages(id),
    
    -- Processing
    processing_status VARCHAR(50) DEFAULT 'complete',
    thumbnails JSONB,
    metadata JSONB DEFAULT '{}',
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP,
    deleted_at TIMESTAMP
);

CREATE INDEX idx_media_type ON media_assets(asset_type);
CREATE INDEX idx_media_user ON media_assets(uploaded_by);
CREATE INDEX idx_media_space ON media_assets(space_id);
CREATE INDEX idx_media_expires ON media_assets(expires_at) WHERE expires_at IS NOT NULL;

-- Create update timestamp trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add update triggers to tables with updated_at
CREATE TRIGGER update_spaces_updated_at BEFORE UPDATE ON spaces 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_world_objects_updated_at BEFORE UPDATE ON world_objects 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default data
INSERT INTO users (username, email, display_name, is_admin) 
VALUES ('system', 'system@3dworld.local', 'System', true);

INSERT INTO spaces (name, is_public, max_users) 
VALUES ('main', true, 100);

COMMIT;