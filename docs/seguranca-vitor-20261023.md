# Revalidação de segurança das tarefas de Vitor

Data: 23/10/2026. Repositório: `Plan-Action/Plan-Action`.
Base analisada: `ba748a2`, mais a entrega de navegação na branch `codex/plan-action`.

## Resultado observado

`npm ci --ignore-scripts --no-audit --no-fund` instalou o lockfile versionado.
A auditoria atual `npm audit --json --package-lock-only` não retorna avisos
para os componentes abaixo. Todas as cópias no lockfile foram conferidas:

| Jira | Componente | Versões encontradas |
| --- | --- | --- |
| KAN-30 | ajv | 6.15.0 |
| KAN-37 | js-yaml | 4.3.2 |
| KAN-41 | picomatch | 2.3.2 e 4.0.7 |
| KAN-49 | yaml | 2.9.1 |
| KAN-31, já concluída | brace-expansion | 1.1.21, 2.1.7 e 5.0.12 |

As correções já estavam presentes na main. Não foi necessária nova atualização
dessas versões. `npm run audit:dependencies` mantém a verificação contínua dos
componentes corrigidos, incluindo todas as cópias reportadas pelo npm audit.
O script preserva o nome histórico `audit-jean-dependencies.mjs` por compatibilidade.

## Risco ainda aberto: KAN-32

A auditoria retorna **6 entradas altas**, todas na cadeia de `braces` 3.0.3:
`braces`, `chokidar`, `fast-glob`, `lovable-tagger`, `micromatch` e `tailwindcss`.
Isso representa propagação de dependências, não seis falhas independentes.

O [aviso oficial GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm),
consultado nesta data, continua sem versão corrigida. O npm sugere mudanças que
incluem Tailwind 4, com quebra de versão principal; isso não comprova que uma
atualização isolada remova todos os caminhos ou preserve o layout.

KAN-32 permanece aberta. A próxima decisão é validar uma migração completa que
remova todos os caminhos vulneráveis, ou adotar uma correção upstream quando
disponível. Não foi usado `npm audit fix --force`, não foi suprimido o alerta e
nenhum arquivo de `node_modules` foi alterado manualmente.

As ferramentas afetadas executam durante desenvolvimento/build. A análise do
código não identificou padrões recebidos de usuários do site encaminhados a
elas. Isso não é uma prova de ausência de exploração. Manter os builds isolados,
sem segredos de produção, revisar configurações de glob e publicar apenas `dist`.

## Validação reproduzível

Na pasta `sesisenaiaction-hub-main`:

```powershell
npm ci --ignore-scripts --no-audit --no-fund
npm run build
npx tsc --noEmit -p tsconfig.app.json
npm run test:security
node --test scripts/test-user-management.mjs
npm run test:navigation
npm run audit:dependencies
npm audit --json --package-lock-only
```

O último comando retorna código de erro enquanto os alertas de KAN-32 existirem;
o sucesso do verificador de componentes corrigidos não significa audit sem falhas.

Os testes de RLS usam PostgreSQL isolado via PGlite 0.3.14, informado por
`PGLITE_MODULE`, conforme o workflow versionado. Não acessam nem alteram o banco
de produção. A validação de navegador usa respostas simuladas de Auth/Data API;
não comprova a disponibilidade do Supabase publicado nem o envio de emails reais.

Não foram executadas cargas de negação de serviço.

## Evidências desta entrega

- Build de produção e verificação TypeScript aprovados.
- 7 testes de hospedagem/segurança, 70 de funções de usuários e 100 de RLS aprovados.
- 6 testes de filtros/URLs e 2 cenários de navegador (1440px e 390px) aprovados.
- 30 testes das regras de integração do Dependabot aprovados.
- Fluxo de navegador cobre edição/gravação, cancelamento, retorno, histórico,
  recarga, limpeza, estado vazio, erro/nova tentativa e consulta com 1.001 registros.
- Layout inspecionado em desktop/celular, claro/escuro; testes usam dados fictícios.

O build mantém um aviso sobre tamanho de bundle acima de 500 kB, já existente
antes desta entrega. Ele não é tratado como vulnerabilidade ou falha dos testes.
