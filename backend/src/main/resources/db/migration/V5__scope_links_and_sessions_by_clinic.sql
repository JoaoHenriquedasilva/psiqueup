ALTER TABLE patient_psychologist_links
    ADD COLUMN clinic_id BIGINT NULL REFERENCES clinics(id);

CREATE INDEX idx_patient_psychologist_links_clinic_id
    ON patient_psychologist_links (clinic_id);

ALTER TABLE sessions
    ADD COLUMN clinic_id BIGINT NULL REFERENCES clinics(id);

CREATE INDEX idx_sessions_clinic_id
    ON sessions (clinic_id);
