ALTER TABLE users
    ADD COLUMN email_verified BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN terms_version VARCHAR(30),
    ADD COLUMN privacy_version VARCHAR(30),
    ADD COLUMN terms_accepted_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN terms_accepted_ip VARCHAR(64);

UPDATE users SET email_verified = TRUE;

CREATE TABLE auth_action_tokens (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(64) NOT NULL UNIQUE,
    token_type VARCHAR(30) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    used_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_auth_action_tokens_user_type
    ON auth_action_tokens (user_id, token_type);

CREATE INDEX idx_auth_action_tokens_expires_at
    ON auth_action_tokens (expires_at);

CREATE TABLE audit_logs (
    id BIGSERIAL PRIMARY KEY,
    actor_user_id BIGINT,
    actor_email VARCHAR(150),
    action VARCHAR(60) NOT NULL,
    target_type VARCHAR(60),
    target_id VARCHAR(64),
    clinic_id BIGINT,
    ip_address VARCHAR(64),
    details VARCHAR(500),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_logs_clinic_created
    ON audit_logs (clinic_id, created_at DESC);

CREATE INDEX idx_audit_logs_action
    ON audit_logs (action);
