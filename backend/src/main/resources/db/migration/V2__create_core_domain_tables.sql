-- 1. Catálogo educativo de abordagens terapêuticas
CREATE TABLE therapeutic_approaches (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    patient_friendly_description TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Seed inicial de abordagens para o MVP
INSERT INTO therapeutic_approaches (name, patient_friendly_description) VALUES
    ('Terapia Cognitivo-Comportamental (TCC)', 'Focada no presente, ajuda a identificar e transformar padrões de pensamento e comportamento que causam sofrimento, utilizando estratégias práticas no dia a dia.'),
    ('Psicanálise', 'Busca compreender questões profundas e inconscientes, explorando experiências passadas, sonhos e relações para dar novo significado aos conflitos atuais.'),
    ('Abordagem Centrada na Pessoa (Humanista)', 'Oferece um espaço acolhedor e livre de julgamentos, confiando no potencial de crescimento e autonomia do próprio paciente para encontrar suas respostas.'),
    ('Gestalt-terapia', 'Concentra-se no "aqui e agora", incentivando a consciência sobre emoções, sensações corporais e a forma como você se relaciona com o ambiente.');

-- 2. Perfil complementar do Psicólogo
CREATE TABLE psychologist_profiles (
    user_id BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    crp VARCHAR(20) NOT NULL UNIQUE,
    approach_id BIGINT NOT NULL REFERENCES therapeutic_approaches(id),
    bio VARCHAR(500),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 3. Perfil complementar do Paciente
CREATE TABLE patient_profiles (
    user_id BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 4. Vínculo Psicólogo <-> Paciente (com trava de rejeição pelo paciente)
CREATE TABLE patient_psychologist_links (
    id BIGSERIAL PRIMARY KEY,
    psychologist_id BIGINT NOT NULL REFERENCES psychologist_profiles(user_id),
    patient_id BIGINT NOT NULL REFERENCES patient_profiles(user_id),
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    rejection_reason VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_psychologist_patient UNIQUE (psychologist_id, patient_id)
);

-- 5. Agenda administrativa de sessões (sem dados clínicos sensíveis)
CREATE TABLE sessions (
    id BIGSERIAL PRIMARY KEY,
    psychologist_id BIGINT NOT NULL REFERENCES psychologist_profiles(user_id),
    patient_id BIGINT NOT NULL REFERENCES patient_profiles(user_id),
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'SCHEDULED',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_session_times CHECK (end_time > start_time)
);

CREATE INDEX idx_links_patient ON patient_psychologist_links(patient_id);
CREATE INDEX idx_sessions_psychologist_time ON sessions(psychologist_id, start_time);
CREATE INDEX idx_sessions_patient_time ON sessions(patient_id, start_time);