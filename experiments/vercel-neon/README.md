# Plan-Action: teste isolado Vercel + Neon

Este experimento verifica a conexão servidor → Neon. Não é a migração completa do Plan-Action. Não importa o cliente Supabase, não acessa usuários reais e não altera a aplicação existente.

## Recursos

- Branch Git: `codex/jean-vercel-neon-test`, baseada em `ba748a2` da main.
- Projeto Vercel solicitado: `plan-action`, escopo `jean-82db`.
- Projeto Neon exclusivo: `plan-action-migration-test` (`jolly-term-63095863`).
- Branch Neon de teste: `dev-vercel-connectivity` (`br-spring-cloud-b7sa5137`).
- Branch de referência vazia: `baseline-empty`.
- Banco: `plan_action_test`. Tabela única: `migration_probe`.

## Publicação

Usar esta pasta como raiz da publicação. O pacote tem dependências e build próprios. Não executar o build do aplicativo atual para este teste.

1. Autenticar com `npx vercel login` e conferir o proprietário e projeto existentes.
2. Vincular explicitamente esta pasta a `plan-action` no escopo `jean-82db`.
3. Configurar `DATABASE_URL`, `PROBE_TOKEN` (mínimo 32 caracteres aleatórios) e `MIGRATION_TEST_ENABLED=true` somente para a branch de preview de teste.
4. Publicar apenas Preview, sem `--prod`, sem promover e sem alterar domínios ou configuração do ambiente de produção.
5. Acessar a prévia e verificar a conexão. A chave é fornecida manualmente e não é armazenada no navegador. Nunca colocar o segredo em URL ou no frontend.

As credenciais locais estão em `.env.local`, ignorado pelo Git. Não copiar o `.env` do sistema existente. O endpoint aceita somente GET autenticado e retorna um resultado mínimo, sem credenciais ou erros internos. A leitura usa consulta parametrizada e restringe o banco de destino e o registro fictício. As proteções da Vercel existentes devem ser preservadas.

## Verificação realizada

- `npm test`: credenciais inválidas bloqueadas antes de acessar o banco.
- `npm run build`: página independente gerada com o logo existente do projeto.
- `npm run test:connection`: leitura real do registro fictício bem-sucedida em 22/10/2026.

## Prévia validada em 22/10/2026

URL: https://plan-action-59xam5bjw-jean-82db.vercel.app

Deployment: `dpl_6jfxqjNfv9NoM1ELsZqzf3CthRkP`, estado READY, ambiente Preview e proteção de autenticação da Vercel ativa.

Verificação remota concluída: GET sem chave retornou 401; GET autenticado retornou 200 com `syntheticRecordVerified=true`. Os testes usaram o cliente autenticado da Vercel para atravessar a proteção de deployment, sem desativá-la.

O repositório conectado à Vercel é https://github.com/Plan-Action/Plan-Action e recebeu apenas a branch experimental. A main continuou em `ba748a24768f6f7b69ddb1c22a55af909e017ca0` durante a preparação.

Esta publicação usa `node build-vercel.mjs` e Build Output API (`--prebuilt`), preservando a raiz configurada do projeto Vercel (`sesisenaiaction-hub-main`). Nenhum ajuste global de build ou domínio foi necessário. O build empacota apenas a página e a função de teste.

As três variáveis foram criadas como Secrets no Preview exclusivo de `codex/jean-vercel-neon-test`. Publicações manuais prebuilt não herdaram essas variáveis de branch neste teste. A prévia validada recebeu os mesmos valores por `.vercel/preview-config.json`, arquivo privado ignorado pelo Git, através de `--local-config`. Nunca versionar esse arquivo nem promover a publicação a produção.

Para repetir: revisar o projeto vinculado, executar `npm ci`, `npm test`, `node build-vercel.mjs` e publicar exclusivamente Preview com a configuração privada. Confirmar novamente 401/200. Não executar `--prod`.

Após publicar, verificar GET sem chave = 401 e GET com chave = 200 com `syntheticRecordVerified=true`. Não considerar o teste local como prova de implantação na Vercel.

## Próximas etapas para uma migração completa

Adaptar autenticação, sessões, convites, permissões por perfil/departamento/unidade, APIs, dados e funções. Definir estratégia de migração de contas e de arquivos. Homologar antes de qualquer mudança na main ou no Supabase. O experimento não altera o site atual.
