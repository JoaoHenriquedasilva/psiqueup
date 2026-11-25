# Roadmap de Lançamento Oficial — PsiqueUp (Pós-MVP)

Este documento organiza as etapas necessárias para levar o **PsiqueUp** do estado atual de MVP para o **lançamento oficial em produção**, respeitando isolamento multi-tenant, segurança (OWASP), LGPD (Lei nº 13.709/2018) e deploy em Supabase + Cloud.

---

## Ordem de Execução das Branches

1. `feat/multi-tenant-clinics-cnpj` (**Começar por aqui** — a partir da `develop` atualizada)
2. `feat/patient-consent-and-cpf-links`
3. `feat/auth-recovery-lgpd-golive`

---

## Bloco L1 — Multi-Tenancy: Consultórios (CNPJ), Admin Onboarding & Psicólogo Autônomo

- **Branch:** `feat/multi-tenant-clinics-cnpj`
- **Objetivo:** Separar cada consultório (isolamento por `clinic_id`) do modo de atuação autônomo do psicólogo, impedindo acesso cruzado entre clínicas no painel administrativo.

### Backend
- [ ] **Migration `V4`:**
  - Criar tabela `clinics` (`id`, `name`, `cnpj` único validado com 14 dígitos, `owner_user_id`, `active`, `created_at`, `updated_at`).
  - Criar tabela `clinic_psychologists` (`id`, `clinic_id`, `psychologist_id`, `status`: `PENDING`, `APPROVED`, `REJECTED`, `created_at`, `updated_at`).
- [ ] **Cadastro público de Consultório + Admin:**
  - Endpoint dedicado para abertura de consultório criando a `Clinic` (validação oficial dos dígitos do CNPJ) e a conta `ADMIN` vinculada como proprietária.
- [ ] **Vínculo Psicólogo ↔ Consultório e Modo Autônomo:**
  - Psicólogo pode atuar como **autônomo** (sem vínculo a clínica) ou solicitar vínculo a um consultório informando o **CNPJ** (cria solicitação `PENDING`).
  - Admin do respectivo consultório aprova (`APPROVED`) ou recusa (`REJECTED`) a solicitação.
- [ ] **Isolamento de `AdminService` por `clinic_id`:**
  - Escopar `getDashboardMetrics`, `listPsychologists`, `updateUserStatus`, `listSessions` e `resolveDisputedSession` exclusivamente aos psicólogos/vínculos/sessões da clínica do Admin autenticado (bloqueando qualquer acesso a dados de outras clínicas ou psicólogos autônomos).
- [ ] **Triagem do Admin:**
  - Fluxo para o Admin da clínica indicar/solicitar o vínculo de um paciente a um psicólogo **aprovado da própria clínica**.

### Frontend
- [ ] **Cadastro de Consultório:** opção na tela de cadastro para abertura de consultório (Nome da Clínica + CNPJ + dados do Admin).
- [ ] **Painel do Psicólogo:** aba/seção para informar CNPJ e acompanhar status de vínculo com o consultório (ou atuar como autônomo).
- [ ] **Painel do Admin:** aba/seção para aprovar/recusar solicitações de psicólogos e realizar triagem de pacientes para os psicólogos aprovados do consultório.

---

## Bloco L2 — Consentimento Ativo (`PENDING`) & Vínculo Seguro via CPF (LGPD)

- **Branch:** `feat/patient-consent-and-cpf-links`
- **Objetivo:** Garantir consentimento explícito do paciente (LGPD Art. 7º e Art. 11) antes da ativação do vínculo e habilitar busca/solicitação por CPF com proteção contra enumeração.

### Backend
- [ ] **Migration `V5`:**
  - Adicionar `cpf_hash` (`VARCHAR(64)` com índice `UNIQUE`, gerado via **HMAC-SHA256 com *pepper* secreto** em variável de ambiente) e `cpf_masked` (ex.: `***.456.789-**`) no perfil do paciente.
  - Atualizar `LinkStatus` para incluir `PENDING` (e opcionalmente `REVOKED` para encerramento posterior sem confundir com rejeição).
- [ ] **Validação e Privacidade de CPF:**
  - Validador customizado `@CPF` (módulo 11, rejeitando sequências repetidas).
  - Garantir que CPF nunca apareça em query params/URLs, logs ou mensagens de erro.
- [ ] **Fluxo de Consentimento & Anti-Enumeração:**
  - `POST /api/links` (tanto pelo psicólogo autônomo quanto via triagem da clínica) cria o vínculo como `PENDING` usando CPF (ou dado secundário de confirmação), retornando **resposta neutra** que não revela se o CPF existe ou se está inativo.
  - Enquanto `PENDING`, ocultar nome completo e e-mail do paciente nas listagens do psicólogo/clínica (exibir apenas identificador mascarado e status).
  - Criar `PATCH /api/links/{id}/accept` para o paciente aceitar (`PENDING` → `ACTIVE`) mantendo `reject` (`PENDING`/`ACTIVE` → `REJECTED`).
  - `SessionService` permanece bloqueando agendamentos enquanto o vínculo não estiver `ACTIVE`.

### Frontend
- [ ] **Cadastro / Perfil do Paciente:** campo de CPF com máscara e validação de formato.
- [ ] **Solicitação de Vínculo / Triagem:** envio de solicitação por CPF com feedback neutro.
- [ ] **Painel do Paciente:** destaque para solicitações `PENDING` com botões explícitos de **Aceitar vínculo** e **Recusar**.

---

## Bloco L3 — Autenticação Avançada, Conformidade LGPD & Go-Live (Supabase/Cloud)

- **Branch:** `feat/auth-recovery-lgpd-golive`
- **Objetivo:** Fechar ciclo completo de conta, obrigações legais da LGPD e endurecimento de infraestrutura para produção.

### Backend & Segurança
- [ ] **Verificação de e-mail e recuperação de senha:** fluxo de confirmação de e-mail no cadastro e *Esqueci minha senha / Redefinir senha* com token temporário de uso único.
- [ ] **Rate Limiting:** proteção contra força bruta e varredura de CPF/e-mail em `/api/auth/**` e `POST /api/links`.
- [ ] **LGPD — Termos e Auditoria:**
  - Persistir aceite versionado de Termos de Uso e Política de Privacidade (`terms_version`, `privacy_version`, `accepted_at`, `ip_address`) no cadastro.
  - Criar tabela `audit_logs` registrando eventos críticos (solicitações por CPF, aceites/rejeições, aprovações de clínica, ativação/desativação de contas e resoluções de `DISPUTED`).
- [ ] **Configuração de Produção (`prod`):**
  - Desabilitar Swagger/OpenAPI (`springdoc.api-docs.enabled=false`, `springdoc.swagger-ui.enabled=false`) em produção.
  - Travar `CORS_ALLOWED_ORIGINS` exclusivamente para o domínio HTTPS oficial do frontend.
  - Configurar headers de segurança HTTP (HSTS, `X-Content-Type-Options`, `X-Frame-Options`, CSP).
  - Configurar `DB_URL` do **Supabase** com `?sslmode=require` (e `prepareThreshold=0` se utilizar Pooler em *Transaction Mode*) + backups automáticos.

### Frontend
- [ ] **Telas de Fluxo de Conta:** páginas de *Esqueci minha senha*, *Redefinir senha* e confirmação de e-mail.
- [ ] **Aceite LGPD no Cadastro:** checkbox obrigatório de Termos de Uso e Política de Privacidade + link público de Política de Privacidade e contato do Encarregado (DPO).

---

## Fase 2 — Pós-Lançamento Imediato (Evolução & Maturidade)

- [ ] **Cookies `HttpOnly` + Refresh Token:** migrar armazenamento de JWT do `localStorage` para cookies `HttpOnly; Secure; SameSite` com rotação e revogação no logout.
- [ ] **Autoatendimento LGPD (Art. 18):** painel para exportação de dados pessoais e solicitação automatizada de exclusão/anonimização de conta.
- [ ] **Verificação de Titularidade (CNPJ/CRP):** fluxo de validação documental para clínicas e profissionais.
- [ ] **MFA (Autenticação em Dois Fatores):** recomendada para contas `ADMIN` e `PSYCHOLOGIST`.
