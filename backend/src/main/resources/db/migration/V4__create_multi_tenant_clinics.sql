-- Multi-tenancy: Consultórios (CNPJ) e Vínculo Psicólogo <-> Consultório

CREATE TABLE clinics (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    cnpj VARCHAR(14) NOT NULL UNIQUE,
    owner_user_id BIGINT NOT NULL UNIQUE REFERENCES users(id),
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE clinic_psychologists (
    id BIGSERIAL PRIMARY KEY,
    clinic_id BIGINT NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
    psychologist_id BIGINT NOT NULL REFERENCES psychologist_profiles(user_id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_clinic_psychologist UNIQUE (clinic_id, psychologist_id)
);

CREATE INDEX idx_clinic_psychologists_clinic_status ON clinic_psychologists(clinic_id, status);
CREATE INDEX idx_clinic_psychologists_psychologist ON clinic_psychologists(psychologist_id);
