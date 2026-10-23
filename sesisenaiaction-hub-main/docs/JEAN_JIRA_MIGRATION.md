# Entregas de Jean — inventário e condições de migração

Revisão: 23/10/2026. Responsável no Jira: Jean Carlos Franco Júnior.

## Situação confirmada no Jira

- KAN-26 e KAN-28: código de segurança já integrado no repositório anterior pelo PR #13. Permanecem em Segurança por falta de implantação/homologação da origem. Não reaplicar alterações no Supabase para concluir uma tarefa administrativa. O teste Neon é outro ambiente e não comprova a correção do ambiente original.
- KAN-51: depende de KAN-50, ainda em À Fazer, sem comentários de aprovação na consulta. Não cadastrar cursos/turmas reais ou assumir cardinalidades ainda não aprovadas.
- KAN-54: depende de KAN-50 a KAN-53. A matriz nova não está aprovada; não ampliar automaticamente privilégios existentes.
- KAN-57: depende de KAN-50 a KAN-54 e da recuperação da origem. Este PR entrega apenas preparação offline e testes; não conclui a transferência de dados.

## Inventário offline

Preparar um export JSON autorizado, fora do Git, com arrays `departments`, `profiles`, `action_plans` e `plan_assignments`. Os nomes e chaves refletem as migrações atuais: departamento por `name`, demais registros por `id`, atribuições por `plan_id`/`professor_id`. Incluir todos os campos, sem selecionar apenas os conhecidos. Outras tabelas, como anexos e histórico, podem ser incluídas como arrays adicionais. A origem deve ser uma captura consistente no mesmo instante; extrair tabelas em momentos distintos pode produzir órfãos artificiais.

Executar localmente:

```sh
node scripts/inventory-legacy.mjs /caminho/privado/export.json
node --test scripts/test-inventory-legacy.mjs
```

A ferramenta não faz conexões nem grava arquivos. Retorna contagens, nomes dos campos, problemas estruturais e SHA-256 do conteúdo JSON canônico. Valores, emails, títulos e caminhos de anexos não aparecem no relatório. O hash cobre campos desconhecidos e metadados adicionais; é estável para ordem das propriedades, mas a ordem dos arrays deve ser mantida na comparação. Não substitui checksum dos arquivos anexados, backup, assinatura ou verificação da completude da exportação.

Saída 0: pronta apenas para revisão do mapeamento. Saída 2: inconsistência ou nenhum plano disponível. Saída 1: entrada inválida/ilegível. Mesmo sem bloqueios, `productionMigrationApproved` é sempre falso. A ferramenta identifica planos sem contexto pedagógico sem modificá-los ou atribuir dados por inferência. O nome de cada campo pode conter informação sensível; revisar o relatório antes de compartilhá-lo. Não exportar senhas, tokens ou chaves de serviço.

## Sequência para concluir KAN-57

1. Registrar em KAN-50 as decisões aprovadas de unidade, curso, turma, responsabilidades e planos genéricos. Concluir o modelo de KAN-51 a KAN-54 antes de definir o destino.
2. Localizar a base correta/backup íntegro. Confirmar ambiente e totais com o responsável pela origem; zero tabelas ou um export vazio não comprova inexistência de dados históricos.
3. Inventariar a captura e relacionar tabelas de identidade, anexos e histórico, inclusive as não representadas nas migrações. Guardar o export e backup em local privado com retenção aprovada, nunca no repositório ou em logs de CI.
4. Aprovar um mapeamento explícito origem → destino por campo: IDs, autoria, responsáveis, datas de calendário, datas com fuso, estado, custo nulo versus zero, anexos e histórico. Contexto desconhecido fica legado/pendente; não atribuir Blumenau, avaliação, capacidade ou turma por padrão.
5. Preparar migração transacional e repetível em ambiente isolado com controle de versão. Reexecução deve preservar IDs e não duplicar participações. IDs de identidade diferentes exigem mapa auditável, sem substituir autoria silenciosamente.
6. Conferir contagens, referências, todos os campos e conteúdo dos anexos antes/depois, além das tentativas permitidas e negadas entre perfis, setores e URLs diretas. Testar restauração do backup em ambiente isolado. O inventário atual não executa essas etapas.
7. Planejar congelamento de escrita, captura final, banco → API → frontend e homologação. Registrar aceite antes de qualquer promoção. Este PR não autoriza publicação do fluxo novo nem substituição do banco.

## Recuperação

Até o corte aprovado, preservar a origem e o ambiente anterior. Em falha de validação, descartar a transação de migração no destino e manter o aplicativo anterior. Após o corte, bloquear novas escritas antes de decidir retorno; reconciliar primeiro as escritas posteriores para não perdê-las. Testar e registrar tempo de recuperação e integridade antes de liberar. Não apagar/recriar bancos ou usuários para contornar indisponibilidade.
