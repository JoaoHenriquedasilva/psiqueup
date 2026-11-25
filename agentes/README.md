# Especificações de Agentes — PsiqueUp

Esta pasta reúne as especificações dos **agentes especializados** do projeto PsiqueUp. Cada arquivo `.md` define o papel, as competências técnicas, as diretrizes do projeto, os limites de atuação e o formato de entrega de um agente.

## Agentes Disponíveis

### Time de Construção
1. **[Designer (UX/UI)](./designer-ux-ui.md)** — Especialista em experiência do usuário, arquitetura de informação, layout, teoria das cores e acessibilidade.
2. **[Desenvolvedor Frontend](./frontend-developer.md)** — Especialista em React, TypeScript, Tailwind CSS v4 e implementação fiel de interfaces com base em UX e design tokens.
3. **[Desenvolvedor Backend](./backend-developer.md)** — Especialista em Java 21, Spring Boot, PostgreSQL, Flyway, Docker, segurança e regras de negócio.

### Banca de Avaliação & Release
4. **[Usuário Explorador (QA)](./usuario-explorador.md)** — Simula 3 instâncias reais (**Administrador**, **Psicólogo** e **Paciente**) testando fluxos, casos de borda e uso indevido.
5. **[Dev Sênior (Revisor)](./dev-senior-reviewer.md)** — Avalia padrões de projeto, corretude, código duplicado, arquitetura e qualidade de testes.
6. **[Especialista em Segurança & LGPD (Hacker)](./seguranca-lgpd-hacker.md)** — Audita vulnerabilidades, controle de acesso, multi-tenancy, riscos de invasão e conformidade com a LGPD.
7. **[Juiz de Release](./juiz-release.md)** — Consolida os 3 pareceres da banca e decide se o código está pronto para **commit e push para o GitHub** ou se exige melhorias.

## Fluxo de Trabalho Recomendado

### Regra de Ouro para Mudanças de Interface / Design
1. **Primeiro: Designer (`designer-ux-ui.md`)**
   - Toda nova tela, alteração de layout, fluxo de usuário ou ajuste visual passa primeiro pelo agente Designer.
   - O Designer tem autonomia para propor e decidir mudanças de layout, hierarquia visual, espaçamentos e uso de cores, produzindo uma **especificação clara de design**.
2. **Depois: Frontend (`frontend-developer.md`)**
   - O Frontend recebe a especificação aprovada do Designer e a implementa no código (`frontend/src/`), garantindo fidelidade visual, suporte a Light/Dark Mode, responsividade e integração com a API.

### Mudanças de API, Banco e Regras de Negócio
- **Backend (`backend-developer.md`)** define contratos REST, migrations Flyway, validações, segurança e testes automatizados, alinhando os DTOs com o Frontend.

## Como Usar e Evoluir
- Você pode editar qualquer `.md` desta pasta livremente para ajustar regras, adicionar convenções ou incluir novos comandos/ferramentas.
- Ao iniciar uma tarefa, basta referenciar o arquivo correspondente (ex.: `@agentes/designer-ux-ui.md`, `@agentes/frontend-developer.md` ou `@agentes/backend-developer.md`).
