# KAN-51 — cadastros regionais

Responsável: Jean Carlos Franco Júnior. Escopo: unidades, cursos, ofertas por unidade, turmas e vínculos dos supervisores. KAN-50 é validação contínua conforme autorização de Jean em 28/10/2026; não bloqueia esta entrega. Não representa aceite de regras ainda não definidas.

## Uso

Administradores acessam **Estrutura regional** no menu superior ou `/regional`. Podem cadastrar/renomear unidades e cursos, oferecer o mesmo curso em unidades diferentes, cadastrar turmas por oferta/departamento e vincular mais de um coordenador do departamento à turma. Não cria contas: a gestão de acessos continua restrita ao Admin principal no fluxo existente.

Só foram pré-cadastradas Blumenau, Indaial, Pomerode e Timbó. Cursos, turmas e pessoas ficam para preenchimento pela gestão. Para substituir um supervisor, desativar o vínculo antigo e criar/reativar o novo; o registro e nome histórico do supervisor anterior permanecem. Não há exclusão física na interface ou permissão de DELETE nas tabelas novas.

No PA, unidade/curso/turma são uma classificação opcional por turma. O departamento permanece separado. O filtro da lista combina essa classificação com os filtros existentes e oferece planos gerais/legados sem turma. O filtro é carregado na URL durante navegação, edição e retorno. Não implementa avaliações, diagnósticos ou o escopo completo de KAN-55 de outro integrante.

## Permissões e integridade

- Escritas nos cadastros somente por RPC, para Admin autenticado com senha pessoal concluída. Coordenador/professor não gerenciam catálogo, nem com chamada direta.
- Consulta regional limitada aos departamentos já autorizados; admins continuam globais e sem departamento. Não concede acesso adicional a planos por atribuir um supervisor.
- Supervisor deve ser coordenador ativo do departamento da turma. Reativação confere o vínculo persistido, ignorando IDs substitutos enviados pelo cliente.
- Unidades/cursos/ofertas/turmas inativos não podem ser usados para novos vínculos de planos. Vínculos antigos podem ser consultados e mantidos na edição do PA.
- Salvar PA, participantes e turma é transacional. Turma incompatível reverte toda a gravação.
- IDs e relações de ofertas/turmas não são trocados por edição. Renomear não recria registros. Planos existentes não recebem unidade/turma automaticamente.

## Banco e publicação

`neon/005_regional_catalog.sql` foi aplicada transacionalmente SOMENTE em `jolly-term-63095863` / `br-spring-cloud-b7sa5137` / `plan_action_test`, após testes locais. Não reaplicar: a migração é versionada e exige estado anterior sem essas tabelas. Confirmar projeto/branch antes de usar em outro ambiente; não é SQL para Supabase.

Conferência hospedada após aplicação: quatro unidades, zero cursos/turmas fabricados, um plano preservado sem turma; RLS habilitada em todas as tabelas regionais; anonymous sem EXECUTE na escrita e authenticated sem INSERT direto. Banco/contas Supabase não foram alterados. Em caso de retorno do frontend, manter o esquema aditivo e a função compatível; não apagar o catálogo ou vínculos para fazer rollback.

## Validação

- TypeScript, build e ESLint dos módulos novos passaram.
- 12 testes PostgreSQL isolados: quatro unidades, anonimato, administração, duplicações, cardinalidades, departamentos, gravação atômica, desativação, reativação e legado.
- 8 testes de filtros/navegação, incluindo turma e planos sem classificação.
- 7 testes de cabeçalhos e artefatos de segurança.
- 2 cenários reais de navegador com fixtures, desktop/celular, temas claro/escuro, navegação dos planos e cadastro/edição/desativação de curso. Fixtures não substituem login autenticado no provedor hospedado.

## Limites das demais tarefas de Jean

KAN-54: as permissões de catálogo estão protegidas, mas não concluem a separação entre diagnóstico, execução e acompanhamento; essa parte depende dos modelos de avaliações/diagnósticos, de Vitor/Bruno. Não altera os privilégios atuais dos usuários.

KAN-57: o campo class_id é opcional e preserva planos legados; inventário já disponível. Isso não equivale à migração histórica completa, que precisa de origem íntegra e mapeamento. Nenhuma avaliação/capacidade/unidade foi inventada para registros antigos.
