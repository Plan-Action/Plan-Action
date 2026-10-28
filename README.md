# Plan-Action

Sistema educacional de gestão de planos de ação, desenvolvido como projeto acadêmico por quatro alunos do SESI SENAI Blumenau. Organiza a criação e o acompanhamento de ações pelo método 5W2H, com departamentos, participantes, prazos e controle de acesso.

**Acessar a aplicação:** [Plan-Action — ambiente de homologação](https://plan-action-sesi-senai.vercel.app/).

## Funcionalidades implementadas

- Criação, edição e consulta de planos de ação no formato 5W2H.
- Visão geral com indicadores, prazos e filtros de consulta.
- Gestão de usuários pela administração e isolamento de acesso por departamento.
- Cadastros de unidades, cursos, turmas e supervisores, preservando vínculos históricos.
- Interface responsiva, com identidade azul e branca, temas claro/escuro e recursos de acessibilidade.

Avaliações, diagnósticos e análise de eficácia são evoluções acompanhadas no Jira. Não considerar funcionalidades planejadas como entregues nem o ambiente de homologação como aceite de produção.

## Organização dos repositórios

| Componente | Local |
| --- | --- |
| Aplicação React/TypeScript | [sesisenaiaction-hub-main](sesisenaiaction-hub-main/) |
| Apresentação institucional estática | [Plan-Action/plan-action-showcase](https://github.com/Plan-Action/plan-action-showcase) |
| Protótipo Java/Spring | [demo](demo/) |
| Documentação e requisitos | [docs](docs/) |

A apresentação institucional tem ciclo de desenvolvimento próprio. Não é a aplicação de gestão e não depende do banco da aplicação. O diretório `experiments/vercel-neon` registra o teste inicial de conectividade; não é a tela atual do sistema.

## Tecnologias atuais da aplicação

React, TypeScript, Vite, Tailwind CSS e componentes shadcn/ui/Radix. Hospedagem na Vercel; autenticação e dados no Neon, com autorização no PostgreSQL. Os arquivos Supabase permanecem como referência histórica e de migração; não comprovam que a instalação antiga está acessível ou que seus dados foram transferidos.

## Executar localmente

Requer Node.js 22 ou superior e npm. Use apenas as URLs públicas do ambiente de desenvolvimento autorizado; não copie chaves administrativas ou senhas para o frontend.

```sh
git clone https://github.com/Plan-Action/Plan-Action.git
cd Plan-Action/sesisenaiaction-hub-main
npm ci
npm run dev
```

Para configurar outro ambiente, defina `VITE_NEON_AUTH_URL` e `VITE_NEON_DATA_API_URL` em `.env.local`. Essas URLs são públicas; `DATABASE_URL`, senhas e chaves de serviço não podem usar o prefixo `VITE_`. Confira a origem permitida no provedor de autenticação antes de testar o login local.

```sh
npm run build
npx tsc --noEmit -p tsconfig.app.json
npm run test:security
npm run test:navigation
```

Os workflows em `.github/workflows` executam as verificações de integração. Novas alterações seguem por branch e pull request; fazer merge somente após as verificações e requisitos de revisão aplicáveis.

## Documentação

- [Cadastros regionais — KAN-51](sesisenaiaction-hub-main/docs/KAN-51_REGIONAL.md)
- [Estado da integração Neon](sesisenaiaction-hub-main/NEON_INTEGRATION_STATUS.md)
- [Inventário e condições para migração histórica](sesisenaiaction-hub-main/docs/JEAN_JIRA_MIGRATION.md)
- [Validação contínua do fluxo pedagógico](docs/requirements/KAN-50-validacao-avaliacoes.md)
- [Política de segurança](SECURITY.md)
- [Quadro de tarefas no Jira](https://plan-action-sesi26.atlassian.net/jira/software/projects/KAN/boards/1)

Alguns documentos registram decisões e limitações de etapas anteriores. Datas e evidências de homologação devem ser conferidas antes de aplicar procedimentos de implantação.

## Equipe

- [Bruno Loesch da Cunha](https://github.com/L03sch)
- [Jean Carlos Franco Júnior](https://github.com/FR4NC0-11)
- [Vitor Hugo Schmitt](https://github.com/Vhs0808)
- [Vinicius Sartor](https://github.com/ViniS4rtor)

Orientação: [Márcio](https://github.com/marcioscbnu) e [Arquelau Pasta](https://br.linkedin.com/in/arquelau-pasta).

## Licença e contato

Consulte a [PolyForm Noncommercial 1.0.0](LICENSE.md), preservada do repositório original. Para problemas técnicos, use as [Issues do projeto](https://github.com/Plan-Action/Plan-Action/issues). Não publique senhas, tokens ou dados pessoais em tickets.
