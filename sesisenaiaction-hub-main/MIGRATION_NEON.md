# Plan-Action: migração experimental para Vercel + Neon

## Estado em 22/10/2026

Aplicação completa publicada como Preview em https://plan-action-sesi-senai.vercel.app/auth, mantendo layout, logos e telas existentes. O ambiente usa Neon Auth (Managed Better Auth) e Neon Data API, com autorização por RLS no PostgreSQL. O cliente PostgREST é apenas uma biblioteca HTTP compatível; não há chamadas ao serviço Supabase no bundle publicado.

Branch: `codex/jean-vercel-neon-test`, repositório conectado: `Plan-Action/Plan-Action`. Sem merge na main. A aplicação antiga e o banco Supabase não foram alterados.

Projeto Neon `jolly-term-63095863`, branch `br-spring-cloud-b7sa5137`, banco `plan_action_test`. Projeto Vercel `prj_qWVauUFsWLbNtGuYcpFX8NpIN7YZ`, escopo `jean-82db`. A proteção de autenticação de Preview da Vercel continua ativa.

## Dados e contas

O projeto Supabase configurado (`inlbptawboswnwdqlnlm`) respondeu sem tabelas públicas nas duas consultas realizadas. Portanto NÃO houve cópia ou validação de dados históricos. Este ambiente tem somente o Admin recém-criado e registros fictícios identificados como teste. Antes de uma transferência definitiva, localizar a base correta ou obter um backup e reconciliar IDs, quantidades, relações e permissões. Não apagar nem desativar o Supabase.

Admin: `administrador.plan@gmail.com`. Senha experimental aleatória em `.admin-credentials.local`, arquivo local ignorado pelo Git. O primeiro acesso exige a troca por uma senha pessoal. A senha do ambiente antigo não foi modificada. Não publicar esse arquivo ou copiá-lo para o frontend.

As contas antigas não estão migradas. Não prometer manutenção das senhas ou sessões do Supabase. A migração de identidade requer estratégia de ativação/recuperação de acesso antes do corte definitivo.

## Permissões

- Apenas perfis previamente cadastrados pela administração entram na aplicação. Uma conta criada diretamente no provedor de identidade não recebe acesso aos dados.
- Admin principal único, protegido contra alteração/exclusão do perfil e contra exclusão, bloqueio, troca de email ou rebaixamento no Neon Auth.
- Apenas o Admin principal cadastra usuários e define departamentos. Novos administradores têm visão global e não recebem departamento.
- Administradores comuns removem acessos de professores/coordenadores; o principal também pode remover administradores comuns. O principal e o próprio acesso são protegidos.
- Remoção revoga o acesso da aplicação, preservando identidade, planos e histórico. Não é exclusão física da conta. A interface informa remoção de acesso.
- Coordenadores gerenciam planos do próprio departamento. Professores consultam somente planos atribuídos dentro do próprio departamento.
- Plano e participantes são gravados atomicamente. Participantes de outro departamento são recusados e a transação inteira é revertida.
- O estado de cadastro, ativação e senha inicial é conferido no banco a cada consulta. Perfil, função e departamento não vêm de metadados editáveis do usuário.
- A senha inicial permanece bloqueada até o provedor registrar uma senha diferente e emitir um JWT posterior à troca. O hash de comparação fica apenas no esquema privado.

## Estrutura e execução

As migrações `neon/001_application.sql`, `002_save_plan.sql` e `003_identity_and_admin_guard.sql` destinam-se exclusivamente a uma branch Neon nova com Auth e Data API provisionados. Aplicar em ordem. Elas já foram aplicadas no ambiente experimental; não executar novamente sem controle de versão/estado. A proteção de identidade usa funções privadas para não conceder acesso ao esquema de autenticação às consultas da aplicação.

`VITE_NEON_AUTH_URL` e `VITE_NEON_DATA_API_URL` em `.env` são URLs públicas. Não colocar `DATABASE_URL`, chaves administrativas ou senhas em variáveis `VITE_*`.

`npm run build` gera o frontend e `.vercel/output` para publicação `--prebuilt --environment preview`. Não usa o build de headers dependente do Supabase. CSP permite somente os endpoints Neon necessários. `.vercel/` e `*.local` são ignorados.

## Verificação

- TypeScript: `npx tsc --noEmit -p tsconfig.app.json` passou.
- Build completo: `npm run build` passou.
- Login real do Admin e emissão/verificação de JWT passaram.
- Quinze testes reais de fluxo/permissão passaram; resumo em `neon/verification-results.json`.
- A rota `/auth` publicada serve a SPA completa. O bundle contém os endpoints Neon e não contém o endpoint Supabase antigo.
- SDK/cliente novo passou na checagem ESLint específica.

Os testes reais criam registros fictícios e usam arquivos locais de credenciais. `scripts/test-neon-permissions.mjs` requer a sessão Admin de homologação e não deve ser executado em produção. Depois de exigir a troca da senha do Admin, renovar suas credenciais locais para novas homologações.

## Limites antes de produção

- Dados históricos ainda não foram migrados pela ausência de tabelas na origem acessível.
- O envio de email de convite do aplicativo continua não implementado. O cadastro funciona com senha inicial e troca obrigatória.
- O provedor Managed permite cadastro de identidade, mas contas sem perfil administrativo não acessam a aplicação. Restringir cadastro no provedor, se suportado, é uma defesa adicional a homologar.
- A política de composição de senha da interface foi preservada; a equivalência da política de senha aplicada diretamente pelo provedor ainda precisa de validação antes de produção.
- A auditoria do conjunto de dependências identificou avisos altos na cadeia Tailwind 3/chokidar/micromatch/braces, cuja correção sugerida exige atualização maior do Tailwind. Não foi realizada alteração visual maior durante esta migração. Isso é uma pendência de qualidade para a promoção a produção.
- A navegação visual e o comportamento de cookies em cada navegador precisam de homologação humana. Não foi realizada inspeção visual automatizada nesta sessão.
- Não promover a publicação experimental a produção sem concluir a migração dos dados, a recuperação de acesso e a homologação dos quatro perfis.
