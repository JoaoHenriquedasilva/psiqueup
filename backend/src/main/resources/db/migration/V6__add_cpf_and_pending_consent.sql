ALTER TABLE patient_profiles
    ADD COLUMN cpf_hash VARCHAR(64) UNIQUE,
    ADD COLUMN cpf_masked VARCHAR(20);
