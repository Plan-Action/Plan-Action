# Integração Neon — candidato em revisão

Base integrada: main 9d1547a, incluindo navegação de Vitor, inventário e documento de validação KAN-50. A validação de negócio continua necessária; documento preparado não é aceite de Lígia.

## Corrigido nesta branch

- Preserva filtros e navegação existentes ao incorporar o cliente Neon.
- Sanitiza respostas de falha de Auth/Data API antes de chegar aos toasts, sem imprimir mensagens internas.
- Valida senha antes das chamadas do cliente. Isso é defesa de interface, NÃO imposição da política no servidor Managed.
- Distingue custo vazio/null de zero no formulário/detalhe e tipos. Migração 004 preparada; aplicar no banco experimental antes de publicar este frontend. Não reinterpreta zeros históricos. Migração ainda NÃO aplicada.
- Teste autenticado do cliente usa `.test-client-credentials.local` com email/password/mustChangePassword de uma conta exclusiva de teste; não depende mais da senha temporária do principal. Arquivo ignorado pelo Git. Não criar nem trocar a senha do Admin para rodá-lo.
- Quatro testes isolados de limites de erro/validação de senha, incluídos no CI.

## Evidências locais

Build e TypeScript passaram. Dezessete testes passaram (quatro novos, seis de navegação e sete de inventário). Auditoria atual do lockfile retornou zero vulnerabilidades; há avisos de dependências peer/descontinuadas e de tamanho do bundle. Testes autenticados anteriores não foram reexecutados neste candidato; teste isolado não equivale a homologação real.

## Bloqueios de liberação

- Configuração consultada do Managed Auth não expõe política equivalente à regra atual de composição; confirmar suporte/aplicação no servidor antes de cortar autenticação. Não tratar checagem client-side como resolução de KAN-26.
- Origem histórica ainda não inventariada/migrada. Identidades/senhas antigas não foram transferidas. Não remover Supabase nem recriar usuários históricos por inferência.
- Aplicar/homologar migração 004 em ambiente isolado, testar custos null/zero e matriz de permissões real com contas exclusivas.
- Convites por email, SMTP de produção, recuperação de acesso e signup sem perfil precisam de definição/homologação.
- Ambiente e origens de Production ainda não preparados; somente a origem do Preview está autorizada no Auth.
- Não foi feita promoção ou alteração de banco remoto. PR deve permanecer draft enquanto essas condições não estiverem satisfeitas.

As alterações do Supabase permanecem somente como histórico de código no repositório; esta integração usa Neon. A publicação automática da main continuaria usando o estado anterior até um merge explicitamente aprovado após homologação.
