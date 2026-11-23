-- Normaliza e-mails existentes para minúsculas sem espaços nas bordas
UPDATE users
SET email = LOWER(TRIM(email))
WHERE email <> LOWER(TRIM(email));

-- Garante unicidade case-insensitive de e-mail no PostgreSQL (Docker local e Supabase)
CREATE UNIQUE INDEX IF NOT EXISTS uk_users_email_lower ON users (LOWER(email));
