# Avaliações e navegação: preparação de KAN-52 e KAN-55

Data: 23/10/2026. Responsável pelas tarefas: Vitor Hugo Schmitt.

## Situação e limite desta entrega

O Jira atribui KAN-52 e KAN-55 a Vitor. KAN-50 e KAN-51 continuam À Fazer e
o solicitante confirmou que as regras ainda não foram validadas com Lígia.
Este documento é uma proposta técnica para discussão, não uma especificação
aprovada. Nenhuma tabela, unidade, avaliação ou permissão nova é criada aqui.

O aplicativo que receberá a evolução é `sesisenaiaction-hub-main`, usando
React e Supabase. A API Java de `demo` não é consumida por esse frontend.
Não usar `profiles.department` como substituto de unidade regional.

## Contratos propostos para KAN-52

| Conceito | Proposta | Decisão ainda necessária |
| --- | --- | --- |
| Tipo de avaliação | Catálogo com identificador estável, nome e estado ativo/inativo, mantido pela gestão | Campos obrigatórios, unicidade e quem pode editar |
| Edição de avaliação | Referência ao tipo, nome/período concreto e estado ativo/inativo | Como representar período, escopo regional e duplicatas |
| Planos relacionados | Uma edição pode reunir vários planos e seus diferentes responsáveis | Se um plano pode pertencer a mais de uma edição e como tratar planos genéricos |
| Diagnósticos relacionados | Navegação para os registros de KAN-53, sem duplicar diagnóstico no 5W2H | Cardinalidades e campos definidos com Bruno |
| Histórico | Identificadores e vínculos preservados; propor desativação para cadastros já utilizados | Política aprovada de exclusão, desativação e alterações históricas |

Não cadastrar tipos fixos no código, não criar um executor único na edição,
não desenvolver aplicação de provas e não implementar correção automática.
Não converter 70%/80% em regras gerais: dependem da validação de KAN-50.

## Sequência de integração

1. **Vinicius / KAN-50:** obter a planilha anonimizada e registrar os campos,
   perfis, escopos e regras aprovados, além das pendências.
2. **Jean / KAN-51:** publicar o contrato de unidades, cursos, turmas e vínculos
   dos supervisores, com identificadores e regras de histórico.
3. **Vitor / KAN-52:** fechar o modelo tipo/edição e a cardinalidade com planos;
   implementar migrações aditivas, cadastro pela gestão e telas relacionadas.
4. **Bruno / KAN-53:** integrar os diagnósticos ao contrato aprovado de avaliações.
5. **Jean / KAN-54:** aplicar a matriz de acesso aprovada no banco e nas funções.
6. **Vitor / KAN-55:** integrar filtros regionais/pedagógicos e a navegação
   avaliação → diagnóstico/plano → avaliação, conservando o contexto.

As dependências acima estão registradas nas descrições do Jira, não como links
formais de bloqueio. Não considerar uma dependência entregue somente por seu título.

## Parte independente de KAN-55 implementada agora

Os filtros existentes de busca, departamento, situação e prioridade passam a ser
representados na URL (`q`, `department`, `status`, `priority`). A lista, detalhes,
edição e criação conservam esses filtros. Recarregar ou abrir um link direto
reconstitui a consulta; voltar, cancelar e concluir a gravação mantêm o contexto.

Os destinos são rotas internas construídas pelo aplicativo. Parâmetros como
`returnTo` ou `redirect` não definem destinos. Valores desconhecidos de situação
e prioridade são ignorados. Filtros apenas refinam os dados já autorizados pelo
Supabase: não concedem acesso e não substituem RLS.

A lista lê todas as páginas autorizadas da Data API para não omitir planos após
o limite de 1.000 registros por resposta. Uma falha mostra erro e oferece nova
tentativa preservando os filtros, em vez de simular uma lista vazia.

Não são exibidos controles de unidade, supervisor, curso, turma, avaliação ou
capacidade sem os respectivos contratos e dados. Esta entrega não conclui KAN-55.
Emissão/exportação de relatórios continua no escopo separado de KAN-24.

## Critérios de aceite para a próxima etapa

| Caso a verificar | Dependência |
| --- | --- |
| Gestão cadastra um tipo e duas edições sem alterar código | KAN-50, KAN-52, KAN-54 |
| Edição reúne planos com executores diferentes | Cardinalidade aprovada em KAN-50/KAN-52 |
| Diagnósticos levam aos planos da edição correta | KAN-52, KAN-53 |
| Supervisor não consulta outra unidade/turma por URL nem pela API | KAN-51, KAN-54 |
| Desativar catálogo não rompe consultas históricas | Política validada em KAN-50 |
| Combinar e limpar filtros pedagógicos mantém o escopo autorizado | KAN-51 a KAN-55 |
| Navegação de ida e volta conserva os filtros em desktop e celular | KAN-55 |

## Fontes de planejamento

- [KAN-52 — avaliações](https://plan-action-sesi26.atlassian.net/browse/KAN-52)
- [KAN-55 — navegação](https://plan-action-sesi26.atlassian.net/browse/KAN-55)
- [KAN-50 — validação](https://plan-action-sesi26.atlassian.net/browse/KAN-50)
- [KAN-51 — estrutura regional](https://plan-action-sesi26.atlassian.net/browse/KAN-51)
- [KAN-53 — diagnósticos](https://plan-action-sesi26.atlassian.net/browse/KAN-53)
- [KAN-54 — permissões](https://plan-action-sesi26.atlassian.net/browse/KAN-54)

Os tickets resumem uma reunião e ainda contêm texto histórico de atribuição
indefinida. O campo atual de responsável é usado para identificar as tarefas;
as propostas da reunião não são tratadas como decisões aprovadas.
