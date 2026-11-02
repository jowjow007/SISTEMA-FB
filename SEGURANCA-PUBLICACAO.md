# Publicação acompanhada da revisão de segurança (branch `seguranca/revisao-asvs`)

Plano final para publicar as correções de 01/11/2026 preservando as funções existentes. Esta é a **única** sequência válida (etapas P1–P5 antes do dia, E1–E12 no dia, V1–V12 de verificação). **Nada aqui foi executado em produção.**

A ordem leva em conta as regras **realmente publicadas hoje** (copiadas do console em 01/11/2026). Nelas, cada pessoa pode gravar quase qualquer campo do próprio cadastro: `acesso`, `patrimonioVerTudo`, `remuneracao`. Por isso:
- a migração de acesso só roda **depois** das regras novas;
- as regras novas exigem **aprovação e ao menos uma aba**, ou ser admin.

> **Regra de ouro da recuperação: nunca republique as regras antigas, o Worker antigo nem o HTML antigo com dados de clientes.** Toda falha se corrige para frente, na regra ou no arquivo específico (seção 4).

## 1. Pré-requisitos (antes do dia)

| # | O quê | Situação |
|---|---|---|
| **P1** ✅ (02/11/2026: cópia concluída e verificada; **restauração não testada**) | **Cópia dos dados em produção.** Firestore: Console › Firestore › aba "Importar/exportar" (ou `gcloud firestore export gs://<bucket-de-backup>/2026-11-portal`). Storage, anexos do Chat: `gsutil -m cp -r gs://sistema-fb-4cce5.firebasestorage.app/chat <pasta local>`. Confira se a exportação terminou e quantos arquivos foram copiados. | **Depende de você.** Exige o console ou o gcloud com a sua conta. |
| **P2** ✅ conferida em 02/11/2026, sem alterações; R0 concluído; Cloudflare e GitHub pendentes (seção 14) | **Acesso de recuperação** (ver seção 11, B3: permissões **efetivas**; abrir telas não comprova). Com a conta dona do projeto, confira, sem alterar nada: (a) Console › Firestore › Dados, abra `users/{sua UID}`: você consegue **ver e editar** campos; (b) Console › Authentication: sua conta e a do robô aparecem (anote as duas UIDs); (c) Console › Configurações do projeto › Usuários e permissões: seu papel é **Proprietário**; (d) Console › Firestore e Storage › Regras: o botão "Publicar" está habilitado. | **Depende de você.** Daqui não consigo verificar a sua conta. |
| **P3** | **Cópia local recuperável** em `C:\Users\jowjo\Backups\portal-fb-seguranca-2026-11-01`: os dados privados que ficaram fora do git, as regras publicadas hoje, o repositório completo (bundle de todas as branches e do histórico), as configurações, o Worker que se presume publicado, a tarefa do DJEN e o seu trabalho não commitado. Tem manifesto SHA-256. | **Feita e testada** em 01/11/2026: o clone do bundle restaurou a `main` e esta branch idênticas, o manifesto conferiu, e `privado/` está idêntica ao original. |
| **P4** | **Testes** (`tests/LEIA-ME.md`): regras, funções, Storage, Worker, funcional, migração dos anexos e DJEN, com 0 reprovados. | Feitos em 01/11/2026 (totais no fim). Repetir no dia, se houver qualquer mudança. |
| **P5** | **DJEN desativado.** A tarefa `PortalFB_AtualizarPublicacoesDJEN` está **Desativada** e só volta em E12. | Conferido. |

## 2. O que fica fora do ar e por quanto tempo

| Função | Para em | Volta em | Por quê |
|---|---|---|---|
| Envio de anexos no Chat | E1 | E6 | O site novo grava em `chat/{conversa}/{uid}/`, e o Storage atual só aceita `chat/{uid}/`. |
| Assistente IA | E1 | E7 | O Worker atual recusa o token; o novo exige a migração. |
| Abas de clientes em Números e Condomínios | E1 | E8 | Os dados saíram do HTML e só entram no Firestore com as regras novas. |
| Todo o portal para quem não é admin | E4 | E5 | Ninguém tem `acesso = "ativo"` até a migração. |
| Demais funções (tarefas, documentos, petições, gestão, conferência, agenda, condomínios, holerites...) | — | — | Não param: verificadas em 101 cenários e na abertura de 27 páginas. |

**Janela recomendada:** E1 a E8 numa só sessão, fora do expediente. Estimativa: 40 a 60 minutos, mais as verificações.

## 3. Sequência do dia, com critérios de interrupção

Passe à etapa seguinte só com a verificação ✓. Em "**Parar se**", interrompa, **não avance** e use a recuperação indicada.

| Etapa | Ação | Verificação (✓ para seguir) | Parar se | Recuperar (sem voltar ao vulnerável) |
|---|---|---|---|---|
| **E1** | Merge de `seguranca/revisao-asvs` na `main` e push. | Settings › Pages: deploy concluído. | O deploy falha. | Corrigir com um novo commit. Nunca reverter o commit que tirou os dados. |
| **E2** | **Versão nova chegou ao navegador.** <br>a) Aba anônima: Números e Condomínios sem nomes de clientes ou síndicos; `/tools/condominios/pdfs/relatorio-duo-2026-08.pdf` responde 404. <br>b) **No navegador de uso diário** (com o service worker antigo instalado): Ctrl+F5 no portal; no topo deve aparecer **v177**; se aparecer "Atualizar agora", clique. <br>c) F12 › Aplicação › Service workers: `sw.js` ativo; em "Armazenamento em cache" deve existir só `portal-fb-cache-v4` (o v3, que guardava cópias antigas, é apagado). <br>d) Na aba Rede, ao recarregar, `index.html` vem do servidor (200), não "(ServiceWorker)" sem rede. <br>e) Ctrl+U na ferramenta Condomínios: o código **não** tem `sindico:`. | a–e conferem. O GitHub Pages pode levar até ~10 min para entregar a versão nova. | Depois de 10 min ainda aparece v176 ou dado antigo. | Ctrl+F5; fechar todas as abas do portal; F12 › Aplicação › "Limpar dados do site" naquele navegador. Se persistir em todos os navegadores, parar e me chamar. |
| **E3** | Console: `users/{sua UID}.acesso = "ativo"`; **E3b:** `robos/{UID do robô do escritório}` com `descricao` (a UID da conta `robo.astrea@…`, anotada no registro local; ver seção 13). | Os dois documentos existem. | Você não consegue editar pelo console (P2 falhou). | Não seguir para E4 sem acesso de recuperação. |
| **E4** | Publicar `firestore.rules`. | Você recarrega (Ctrl+F5) e entra. | Você não entra. | Console: confira `acesso`, `role` e a UID do seu cadastro. **Não** republique as regras antigas. |
| **E5** | Página `tools/admin-seguranca`: passo 1 (acesso: desmarque os **⚠ conferir**), passo 2 (patrimônio: marque **só** os admins e as pessoas que você autorizar; ninguém vem marcado). Baixe o CSV. | Um colaborador entra e abre a Agenda. | Alguém da equipe continua sem acesso **e** "Aprovar acesso" não resolve. | Reabra a página; ela grava só o que mudou. Pessoa sem aba: Usuários › Editar abas. |
| **E6** | Publicar `storage.rules` (antes, confira que só existe `chat/`) e **aceitar a permissão "cross-service"** que o console pedir. | Enviar um PDF numa conversa de teste funciona; um anexo antigo continua abrindo. | O envio falha com "unauthorized". | Conceda a permissão cross-service (Storage › Regras). Não volte às regras antigas do Storage. |
| **E7** | **Worker do Assistente pelo painel da Cloudflare** (não há `wrangler.toml` no repositório): Workers & Pages › `portal-fb-gemini` › Edit code › colar `tools/assistente-ia/worker.js` › Deploy; depois, em **Deployments**, conferir que a versão nova está em "Active deployment" (100%). Não precisa de variável nova (as Secrets e o `USAGE_KV` atuais continuam). | V6 (Assistente) ✓. | Assistente com 401/403 para toda a equipe. | Conferir E5. Se persistir, desativar a rota do Worker. **Não** voltar o Worker antigo (era proxy aberto). |
| **E8** | Página admin, passo 4: `privado/numeros-stats.json`, `privado/condominios.json` e os 6 PDF/PNG. | Abas de clientes voltam; um PDF baixa. | O envio dá erro. | Enviar de novo (substitui). |
| **E9** | Conferir remuneração, custos, data de entrada e tipo de colaborador de cada pessoa (Gestão), porque hoje a própria pessoa podia alterá-los. | Valores conferem. | Algum valor foi alterado indevidamente. | Corrigir pelo admin e registrar como incidente. |
| **E10** | **Migração dos anexos antigos do Chat** (seção 6): primeiro a **simulação**, e **só com a sua autorização** a execução. **Não revogar links nesta publicação.** | V10 ✓. | Erros na simulação ou a execução com erro em algum anexo. | `--desfazer <registro.csv>` volta os links. Nada é apagado. |
| **E11** | Verificações V1–V12 (seção 5). | Todas ✓, ou falha registrada. | Uma função essencial falha (V1–V5). | Seção 4. A manutenção **não** está concluída. |
| **E12** | **DJEN**: só depois de V12 (rodada `-SemPublicar` conferida), reativar a tarefa apontando para um clone só da `main`. | Primeiro commit automático só com totais. | O commit contém nomes ou números de processo. | Desativar de novo; o script já recusa esses casos (testado). |

## 4. Recuperação por sintoma (nunca voltar ao vulnerável)

| Sintoma | O que fazer |
|---|---|
| Você (admin) perdeu acesso | Console › Firestore › `users/{sua UID}`: `acesso = "ativo"`, `role = "admin"`. |
| Colaborador sem acesso | Usuários › **Aprovar acesso**; sem abas, **Editar abas**. |
| Uma tela dá "permissão negada" para quem tem direito | Anote a tela e o perfil. Ajuste **só** a regra daquela coleção, acrescente o caso em `tests/firestore-rules/funcoes.test.js`, rode os testes e republique. Enquanto isso, a função fica parada; ela **não** volta abrindo a regra para "qualquer logado". |
| Robô do Astrea com 403 | Conferir `robos/{UID}` (a UID aparece no log do robô). |
| Assistente com 401/403 para todos | Conferir se a migração (E5) rodou. Se precisar, desativar a rota; não voltar o Worker antigo. |
| Chat: envio de anexo falha | Conferir a permissão cross-service do Storage (E6). |
| Erro de página no site | Novo commit corrigindo. Não reverter o commit que tirou os dados (isso os publicaria de novo). |
| Precisa consultar o estado anterior | Cópia local P3 (bundle e regras de hoje), **só para consulta**. |

## 5. Verificações em produção (V1–V12), com operações controladas

Use **dados fictícios** e uma conversa ou documento de teste com o nome "TESTE – apagar". Itens marcados com **🔒 autorização** envolvem envio ou gravação em serviço externo: **peço a sua autorização específica antes de cada um**, no dia.

| # | Função | Operação controlada | Esperado |
|---|---|---|---|
| V1 | Login e acesso | Você, um membro e um síndico (cliente) entram; uma conta pendente não entra. | Conforme o perfil. |
| V2 | Agenda Astrea e Números | Membro abre a Agenda e a aba Clientes. | Dados aparecem. |
| V3 | Tarefas | Membro cria, edita, conclui e apaga uma tarefa "TESTE"; um gestor envia uma tarefa "TESTE" e a devolve. | Tudo funciona; o histórico da tarefa aparece. |
| V4 | Holerites | Quem lança envia um holerite fictício (PDF em branco) para um colaborador de teste, que o vê e baixa; você o apaga. | Funciona. |
| V5 | Gestão | Pagamentos: marcar e desmarcar um pagamento de teste. Patrimônio: quem não está autorizado vê só os próprios itens. Senhas: quem tem permissão vê a lista. | Funciona. |
| V6 | **Assistente IA** 🔒 autorização (envia uma pergunta fictícia ao Gemini) | Uma pergunta "Teste: responda OK" como membro, e uma tentativa sem login. | Responde ao membro e recusa sem login. |
| V7 | **Google Docs** (Petições e Documentos) 🔒 autorização (cria um arquivo no seu Drive) | Gerar uma petição "TESTE – apagar". | Abre no Docs e aparece no histórico. Depois apagar os dois. |
| V8 | **Gmail** (somente leitura, **nenhum envio**) | Entrar na aba Gmail e listar a caixa de entrada. | Igual a hoje. Não enviar nem responder nada. |
| V9 | **Robô do Astrea** 🔒 autorização (o robô entra no Astrea com a conta do escritório; exige o watcher religado, seção 13) | "Executar robô agora". | O log mostra a UID e a gravação, sem 403. |
| V10 | **Anexos antigos do Chat**: fica **só em simulação** até você revisar o registro gerado e autorizar a execução 🔒 (grava no Storage e no Firestore de produção) | (a) Simulação: `python scripts/seguranca/migrar-anexos-chat.py --producao` (só lê); (b) com autorização: `--executar`; (c) um participante que **não** é o autor abre um anexo antigo. | Simulação sem erros; anexos abrem para os participantes; nada apagado. |
| V11 | **Robôs do Google** (conferência de e-mails e sincronização das senhas) | Passivo: no dia seguinte, conferir a "última atualização" na Conferência e a data em Gestão › Senhas. | Datas atualizadas. |
| V12 | **DJEN** 🔒 autorização (consulta a API pública do CNJ) | Num clone só da `main`: `powershell -File tools\numeros-escritorio\atualizar_publicacoes.ps1 -SemPublicar` e depois `git show --stat HEAD`. | Commit só com a página de Números e sem nomes nem processos. Só então reativar (E12). |

**A manutenção só está concluída quando:** V1–V5 estiverem ✓ (funções essenciais), V6–V12 estiverem ✓ **ou** registrados como pendência com responsável e data, e o registro abaixo estiver preenchido.

### Registro da publicação (preencher no dia)

| Etapa ou verificação | Horário | Resultado | Observação ou pendência | Responsável |
|---|---|---|---|---|
| E1 … E12 / V1 … V12 | | | | |

## 6. Anexos antigos do Chat: migração antes de qualquer revogação

- **Situação hoje:** os anexos antigos (`chat/{uid}/arquivo`) abrem pelo link com token gravado na mensagem.
- **Risco registrado (01/11/2026):** os links antigos podem ter sido **compartilhados ou vazados** (encaminhados por e-mail ou WhatsApp, salvos por ex-colaboradores). Eles **continuam funcionando até a revogação**, independentemente das regras novas.
- **Risco temporário, enquanto os tokens não forem revogados:** quem tiver um link, mesmo ex-colaborador ou alguém que o recebeu encaminhado fora do portal, continua baixando o arquivo. Os links são longos e aleatórios, ou seja, não dá para adivinhá-los; o risco é de um link já conhecido.
- **Migração (E10):** `scripts/seguranca/migrar-anexos-chat.py` copia cada anexo antigo para a pasta de **cada** conversa em que ele foi enviado, inclusive os encaminhados, e atualiza a mensagem para o link novo. Ela guarda a origem e não apaga nem revoga nada. Por padrão só simula, e tem a opção "desfazer". **Testada no emulador: 19 de 19.**
- **Revogação (fora desta publicação):** só depois de V10 ✓. Com os anexos migrados, revogar o token antigo não tira o acesso dos participantes, porque eles usam o link novo e as regras os liberam na pasta da conversa.
- **Antes de revogar tudo:** confirme com um arquivo de teste. O emulador não invalida links ao trocar o token, então só o serviço real confirma.

## 7. Onde ainda há dados reais (01/11/2026)

**Publicar esta branch tira os dados só da `main` e do site.** Eles **continuam**:
- nas **outras branches remotas**;
- no **histórico do repositório**, inclusive na própria `main`, desde 15/08/2026;
- em cópias, forks e caches feitos antes.

Quem conhece o endereço do GitHub ainda consegue abrir as versões antigas.

| Onde | O que tem (só tipo e quantidade) | Depois de publicar esta branch |
|---|---|---|
| Site e `main` atuais: painel de Números | 36 nomes de clientes, 26 números de processo | **Sai** do site e da versão atual da `main`. **Continua** no histórico. |
| Site e `main` atuais: Condomínios | 8 nomes de síndicos, 5 observações internas, CNPJ, endereço, nomes de condomínios | Idem. |
| Site e `main` atuais: `tools/condominios/pdfs/` | 6 relatórios (PDF/PNG) | Idem. |
| Branch `redesign-elegante-2026` | As 3 categorias acima (14 commits próprios) | **Continua**. Não é afetada pela publicação. |
| Branch `test/tema-claro` | As 3 categorias acima (6 commits próprios) | **Continua**. |
| Branch `test/organograma-real` | As 3 categorias acima (aponta para uma `main` antiga) | **Continua**. |
| README e rotina de Condomínios | Nome de cliente como exemplo | Sai da versão atual (corrigido na branch); continua no histórico. |
| Formulário de Petições | Número de processo como exemplo | Idem. |
| `tools/condominios/fluxos/fluxo-por-responsaveis.jpg` | Nomes e funções de 3 colaboradoras | **Continua** (decisão sua). |
| 10 arquivos publicados | E-mails de trabalho | Continua. |
| README e script do DJEN | O seu e-mail pessoal | Continua. |
| Página Sistemas | 13 e-mails de cartórios em provedores comuns; 4 contatos sem nome | Continua (os 4 precisam ser conferidos). |
| PDFs de POP | Podem conter nomes de colaboradores (o POP 010 não tem) | Precisam ser conferidos. |

Tornar o repositório privado não protege o site. No plano Free, isso também tira o portal do ar.

## 8. Operação separada (não faz parte desta publicação): branches e histórico

Fica preparada para depois, **com decisão sua**:
1. Apagar as branches remotas que não forem mais usadas. Antes, aplicar a remoção dos dados em `redesign-elegante-2026`, se ela ainda for útil.
2. Reescrever o histórico com `git filter-repo`. O backup já existe em P3.
3. Pedir ao suporte do GitHub a remoção do cache.
4. Reclonar em todos os PCs, inclusive o do robô.

Os comandos:

```bash
git clone --mirror https://github.com/jowjow007/SISTEMA-FB.git limpeza.git && cd limpeza.git
git filter-repo --invert-paths --path tools/condominios/pdfs/
git filter-repo --replace-text ../substituicoes.txt   # const STATS = {...} e CONDOMINIOS → vazio, em todas as versões
git log --all -S topClientesDemais --oneline           # esperado: nada
git push --force --mirror                              # DESTRUTIVO — só com autorização
```

## 9. Patrimônio e administradores

- **Patrimônio completo:** só os admins e as pessoas que você marcar em E5. Ninguém vem marcado. Quem tem a permissão de Gestão "cadastrar patrimônio" também vê tudo; a página mostra quem tem essa permissão, para você revisar.
- **Administrador sem abas:** as regras dispensam o admin da exigência de abas.
  - Novo admin: "Novo usuário" com papel Administrador; ele já nasce aprovado.
  - Pessoa que já existe: em Usuários › Dados, troque o Papel para Administrador e depois clique em "Aprovar acesso".
  - O seu próprio cadastro: pelo console.

## 10. Totais dos testes (01/11/2026, emuladores e dados fictícios)

| Suíte | Regras novas | Regras de produção (controle) |
|---|---|---|
| Regras do Firestore | 221 de 221 | 152 de 221 |
| Funções (leitura, criação, edição e exclusão) | 101 de 101 | 93 de 101 |
| Regras do Storage | 34 de 34 | 20 de 34 |
| Worker do Assistente | 20 de 20 | 2 de 20 |
| Funcional com login | 75 de 75 (duas vezes) | Chat de antes da correção: 71 de 75 |
| Abertura das 27 páginas × 3 perfis | 0 erros só nas regras novas | — |
| Migração dos anexos do Chat | 19 de 19 | — |
| DJEN (script real, cópia descartável) | 14 de 14 | — |

## 11. P1 (cópia de produção) e P2 (acesso de recuperação): uma etapa de cada vez

Nesta fase **não se publica, não se restaura e não se revoga nada**. Você executa cada etapa no Cloud Shell, que já usa o seu login, e me manda só **números e estados**. Nunca mande tokens, chaves nem senhas. O script de conferência `scripts/seguranca/backup_conferencia.py` é **somente leitura**, não imprime tokens e foi testado no emulador (5 de 5). Os subcomandos `permissoes`, `bucket` e `exportacao` dependem de serviços reais do Google e só serão vistos funcionando na primeira execução.

Para levar o script ao Cloud Shell: menu ⋮ › **Fazer upload** › escolha o arquivo `scripts/seguranca/backup_conferencia.py` deste repositório.

### Situação de cada item (preencher)

| Item | Situação | Evidência |
|---|---|---|
| Projeto, localização do banco e volume conferidos (B1) | ✅ 02/11/2026 | `sistema-fb-4cce5`; Firestore `southamerica-east1`; ~2.536 documentos (contagem aproximada); Storage `sistema-fb-4cce5.firebasestorage.app` em `US-EAST1`, 59 arquivos (todos em `chat/`), 22.703.824 bytes |
| Custo estimado com volume e região reais (B2) | ✅ 02/11/2026 | < US$ 0,01 uma vez + ~US$ 0,001/mês (estimativa por faixas de preço públicas; valor real no Faturamento) |
| Permissões efetivas conferidas (B3) | ✅ 02/11/2026, com ressalva | `roles/owner`; permissões do projeto ✓. No bucket original, `objects.get` aparece negado no IAM (papéis legados), mas a leitura real funcionou pela ACL dos objetos. Permissões do bucket original **não alteradas**. |
| Bucket de backup criado, **privado e restrito** (B4) | ✅ criado em 02/11/2026 | `gs://sistema-fb-4cce5-backup`: `SOUTHAMERICA-EAST1`, `STANDARD`, `publicAccessPrevention=enforced`, `uniformBucketLevelAccess=True`; nenhum `allUsers`/`allAuthenticatedUsers` na política consultada. Na consulta de papéis atribuídos **diretamente** no projeto, ninguém tem `roles/viewer`. **Não foi** uma auditoria completa: acessos herdados (organização, pasta, grupos) e outros papéis com leitura de Storage não foram revisados. |
| Exportação do Firestore **concluída e verificada** (B5) | ✅ **cópia concluída e verificada** em 02/11/2026 | `SUCCESSFUL`, done=True, sem erro; 2.544 documentos; 26 arquivos, 19.324.792 bytes; `overall_export_metadata` presente; destino `gs://sistema-fb-4cce5-backup/firestore-2026-11-02-01`. ID da operação: `projects/sistema-fb-4cce5/databases/(default)/operations/ASBhNDI0NzY1MmVmNGQtZGViYS04YTU0LTY4YTYtZTA3NTZkZWIkGnNlbmlsZXBpcAkKMxI`. A diferença de 8 documentos para os ~2.536 de B1 é **compatível** com uma contagem aproximada (coleções da raiz + subcoleções conhecidas) e com alterações entre as consultas, mas **a causa exata não foi comprovada**. |
| Cópia dos anexos **concluída e verificada** (B6) | ✅ **cópia concluída e verificada** em 02/11/2026 | `gs://sistema-fb-4cce5-backup/storage-2026-11-02-01/`: 59 de 59; nenhum arquivo faltando ou a mais; nenhuma diferença de tamanho, MD5, CRC32C, tipo, token (por hash) ou chaves de metadados |
| **Restauração efetivamente testada** em ambiente separado (B7) | ☐ **Não feita.** Só pode ser declarada depois de executada num projeto separado. | |

### B1. Projeto, localização do banco e volume (só leitura)

```
gcloud config set project sistema-fb-4cce5
gcloud projects describe sistema-fb-4cce5 --format="value(projectId,projectNumber,name)"
gcloud firestore databases list --format="table(name,locationId,type)"
gcloud storage buckets list --format="table(name,location,locationType,storageClass)"
python3 backup_conferencia.py volume <BUCKET_DO_STORAGE>
```

O que me mandar:
- a localização do banco (`locationId`);
- o nome e a localização do bucket do Storage;
- o total de documentos e o total de arquivos e bytes que o script mostrar.

O `volume` conta documentos por agregação: cerca de 1 leitura por 1.000 documentos contados, ou seja, custo desprezível.

### B2. Custo com o volume e a região reais

Calculado depois de B1, com os preços da região na página de preços do Google Cloud. Os itens são:
- **Exportação:** 1 leitura por documento exportado.
- **Guarda:** tamanho da exportação + tamanho dos anexos, por GB por mês, na classe Standard da região.
- **Cópia dos anexos para o bucket de backup:** 1 operação classe A por arquivo. Na mesma localização, não há cobrança de transferência; numa localização diferente, há cobrança por GB.
- **Download opcional para o PC:** tráfego de saída para a internet, por GB.

### B3. Permissões efetivas (sem restaurar nada)

```
python3 backup_conferencia.py permissoes <BUCKET_DO_STORAGE> <BUCKET_BACKUP>
```

Ele usa o teste de permissões do Google (`testIamPermissions`), que **só pergunta**, sem executar. É preciso ✓ em:
- exportar e importar o Firestore;
- ler e gravar os objetos dos dois buckets;
- publicar regras.

Abrir o Cloud Shell **não** comprova nada disso.

### B4. Bucket de backup privado e restrito

Crie o bucket pelo console, com:
- a **mesma localização do banco** (B1);
- classe Standard;
- **"Impedir o acesso público"** marcado;
- controle de acesso **uniforme**.

Depois rode:

```
python3 backup_conferencia.py bucket <BUCKET_BACKUP>
```

O esperado:
- ✓ prevenção de acesso público `enforced`;
- ✓ acesso uniforme;
- ✓ nenhum `allUsers` ou `allAuthenticatedUsers`.

Revise a lista de quem tem acesso. A linha `projectViewer` dá leitura a quem tem papel Leitor no projeto.

### B5. Exportação do Firestore: registrar o identificador e conferir aquela operação

```
gcloud firestore export gs://<BUCKET_BACKUP>/firestore-AAAA-MM-DD --async --format="value(name)"
```

Anote o **nome da operação** que aparecer; ele é o identificador. Quando terminar, rode:

```
python3 backup_conferencia.py exportacao <NOME_DA_OPERACAO>
```

O esperado:
- `done: True` e estado `SUCCESSFUL`, sem erro;
- documentos concluídos igual ao estimado;
- destino correto e `overall_export_metadata` ✓.

A exportação **não é um retrato instantâneo**: o que for gravado durante ela pode ou não entrar. Faça fora do expediente.

### B6. Cópia dos anexos: caminhos, quantidade, tamanho, checksums e metadados

```
gcloud storage cp -r "gs://<BUCKET_DO_STORAGE>/*" gs://<BUCKET_BACKUP>/storage-AAAA-MM-DD/
python3 backup_conferencia.py anexos <BUCKET_DO_STORAGE> gs://<BUCKET_BACKUP>/storage-AAAA-MM-DD
```

O script compara arquivo a arquivo:
- caminho;
- tamanho;
- CRC32C e MD5;
- tipo de conteúdo;
- chaves de metadados;
- o **token**, comparado por hash, sem imprimir o valor.

O esperado é 0 em todas as diferenças. Diferenças possíveis e o significado de cada uma:
- **"A mais na cópia"** só aparece se a pasta de destino já tinha algo: use uma pasta nova.
- **"Faltando"** indica um arquivo enviado ao Chat durante a cópia: repita só esses arquivos.
- **MD5 ausente** acontece em objetos compostos. Nesse caso vale o CRC32C.
- **Leitura negada em algum arquivo:** o bucket original usa ACL por objeto, com papéis legados (`legacyBucketOwner`). Em B3, o `testIamPermissions` acusou `storage.objects.get` negado no IAM do bucket, mas a leitura real funcionou, porque a ACL de cada objeto libera os donos do projeto. Um objeto com ACL diferente pode falhar na cópia. Por isso, confira o **código de saída e os erros do `gcloud storage cp`** e a contagem completa (59 de 59). **Não altere** as permissões do bucket original.
- **ACL dos objetos não é copiada:** o bucket de backup tem acesso uniforme, então as ACLs por objeto não vão para a cópia, e isso é esperado. Os links do Firebase dependem do token, que fica nos metadados e é conferido por hash.
- **Token ou metadados diferentes** indicam que a cópia não preservou os metadados. Não siga sem entender o motivo, porque os links não abririam numa restauração.

### B7. Restauração testada (opcional; só declarar se executada)

Para declarar "restauração testada" é preciso fazê-la em um **projeto separado**, por exemplo `sistema-fb-restauro-teste`, nunca no de produção:
1. Importar a exportação nesse projeto.
2. Conferir as contagens por coleção.
3. Copiar alguns anexos de volta para o bucket desse projeto.
4. Abrir um link pelo token copiado.

Até isso ser feito, a situação é: **"cópia concluída e verificada; restauração não testada"**.

### P2. Acesso de recuperação (só olhar, sem alterar)

1. **Authentication › Users:** anote a UID da sua conta e a UID da conta do robô. É o e-mail do `credenciais.env` do PC do escritório; não abra a senha.
2. **Firestore › Dados › `users/{sua UID}`:** `role = "admin"`. Não salve nada.
3. **B3 (permissões efetivas)** é a comprovação de que você consegue restaurar e publicar regras. Abrir telas não comprova.

## 12. Procedimentos de recuperação (com base nas permissões verificadas em B3)

**P2 conferida em 02/11/2026, sem alterações.** As UIDs ficam no registro local (`Backups\...\REGISTRO-PUBLICACAO.md`), fora do repositório público.
- O seu cadastro é `role = "admin"`, ainda sem o campo `acesso`.
- A conta do robô **configurada neste PC** tem o último login em **23/10/2026**: a identidade foi conferida, mas **o funcionamento diário não**.
- A coleção `robos` ainda não existe.

Regra comum a todos os procedimentos: **corrigir para frente**. Nunca republique as regras antigas, o Worker antigo nem o HTML com dados. O console do Firestore **não passa pelas regras**, então você consegue corrigir dados mesmo com as regras novas publicadas.

| # | Situação | Procedimento | Permissão (B3) | Tempo |
|---|---|---|---|---|
| R1 | Você não entra depois de E4 | Console › Firestore › Dados › `users/{sua UID}`: confira `role = "admin"` e **adicione** o campo `acesso` (texto) = `ativo`. Recarregue o portal com Ctrl+F5. | `datastore.entities.update` ✓ | 1–2 min |
| R2 | Robô com 403 depois de E4 | Console › Firestore: coleção `robos`, documento com ID = **UID da conta que o robô realmente usa** (ver R0) e campo `descricao`. Rode "Executar robô agora". | `datastore.entities.update` ✓ | 2 min |
| R3 | Colaborador legítimo sem acesso | Portal › Usuários › **Aprovar acesso** e, se faltar, **Editar abas**. Pelo console: `acesso = "ativo"` e uma aba em `tabs`. | admin do portal / `datastore.entities.update` ✓ | 1 min |
| R4 | Uma função legítima parou ("permissão negada") | Anotar a tela e o perfil. Corrigir **só** a regra daquela coleção no repositório, acrescentar o caso em `tests/firestore-rules/funcoes.test.js`, rodar os testes e publicar a regra corrigida. Enquanto isso, a função fica parada; ela não volta abrindo a regra para "qualquer logado". | `firebaserules.rulesets.create` e `releases.update` ✓ | 15–40 min |
| R5 | Chat: envio de anexo falha depois de E6 | Console › Storage › Regras: conceder a permissão "cross-service" (o console mostra o aviso). Conferir que o envio é numa conversa da qual a pessoa participa. | regras ✓ | 2 min |
| R6 | Assistente: 401/403 para toda a equipe | Conferir E5 (acesso e abas). Se precisar, desativar a rota do Worker no painel da Cloudflare. **Não** voltar o Worker antigo. | ⚠️ conta da Cloudflare **não verificada** em B3 | 5 min |
| R7 | Erro de página no site | Novo commit corrigindo e push na `main`. **Nunca** reverter o commit que tirou os dados. | ⚠️ push no GitHub **não verificado** em B3 | 5–15 min |
| R8 | Documento apagado ou corrompido | Recuperar **pontualmente**: importar a exportação num **projeto separado** e copiar só o necessário pelo console. Importar sobre produção só em desastre, porque grava por cima e desfaz o que mudou depois. | `datastore.databases.import` ✓ (**não testado**: B7) | 30–60 min |
| R9 | Anexo do Chat perdido | `gcloud storage cp gs://sistema-fb-4cce5-backup/storage-2026-11-02-01/chat/... gs://sistema-fb-4cce5.firebasestorage.app/chat/...`. Os metadados com o token vêm junto. | `storage.objects.create` no bucket original ✓; leitura do backup ✓ | 5 min |
| R10 | Migração dos anexos com problema (quando autorizada) | `migrar-anexos-chat.py --producao --desfazer <registro.csv>` volta os links antigos nas mensagens. Nada foi apagado. | `datastore.entities.update` ✓ | 5 min |

Antes do horário, falta conferir o acesso de recuperação **fora do Google**:
- **Cloudflare:** entrar no painel e ver o Worker `portal-fb-gemini` (para R6).
- **GitHub:** a sua conta consegue fazer push na `main` (para R7).

### R0. Investigar o último login antigo do robô (sem alterar produção)

Objetivo: descobrir **qual conta o robô do escritório usa** e **se ele roda todo dia**, antes de criar `robos/{uid}` em E3. Tudo abaixo é leitura.

1. **No PC do escritório** (`C:\Users\FB\portal-fb`), no PowerShell, mostrar **só o e-mail**, sem a senha:
   `Select-String -Path C:\Users\FB\portal-fb\scripts\astrea-importer\credenciais.env -Pattern '^FIREBASE_ROBO_EMAIL='`
   Se o e-mail for **diferente** de `robo@fonsecaebraga.com.br`, a UID certa para `robos` é a **dessa** conta (procure em Authentication).
2. **Agendamento no PC do escritório:**
   `Get-ScheduledTask | Where-Object { $_.TaskName -match 'astrea|robo|agenda' } | Get-ScheduledTaskInfo | Format-List TaskName,LastRunTime,LastTaskResult,NextRunTime`
   - `LastTaskResult = 0` com data recente: o agendamento roda.
   - Data antiga ou outro código: parou.
3. **Log do robô no PC do escritório:** veja as últimas linhas do log em `scripts\astrea-importer` (nome do arquivo conforme o `LEIA-ME.md` de lá). Procure "ERRO Firebase auth" ou "Robô autenticado". Se houver um `.log`, rode:
   `Get-ChildItem C:\Users\FB\portal-fb\scripts\astrea-importer\*.log | Sort-Object LastWriteTime | Select-Object -Last 1 | Get-Content -Tail 30`
4. **Versão do código no PC do escritório:**
   `git -C C:\Users\FB\portal-fb log -1 --format="%h %ad %s" --date=iso`
   Ele deveria acompanhar a `main` pelo `git pull` automático.
5. **Última gravação da Agenda no Firestore**, pelo Cloud Shell. Só lê e imprime **apenas datas e quantidades**:
   ```
   curl -s -X POST -H "Authorization: Bearer $(gcloud auth print-access-token)" -H "Content-Type: application/json" "https://firestore.googleapis.com/v1/projects/sistema-fb-4cce5/databases/(default)/documents:runQuery" -d '{"structuredQuery":{"from":[{"collectionId":"astreaDiario"}],"orderBy":[{"field":{"fieldPath":"data"},"direction":"DESCENDING"}],"limit":3,"select":{"fields":[{"fieldPath":"data"},{"fieldPath":"total"},{"fieldPath":"atualizadoEm"}]}}}' | python3 -c "import sys,json;[print(d['document']['name'].split('/')[-1], {k:list(v.values())[0] for k,v in d['document'].get('fields',{}).items()}) for d in json.load(sys.stdin) if 'document' in d]"
   ```
   Se houver gravações **depois de 23/10**, o robô roda e entra com **outra conta** (volte ao passo 1). Se a última gravação for de 23/10, o robô parou.
6. **(Opcional) Outras contas candidatas:** Console › Authentication › Users, ordenado por "Último login". Uma conta com login diário perto das 7h é a candidata.

**Resultado esperado de R0:** a UID da conta que o robô realmente usa, anotada no registro local, e a confirmação de que ele roda, ou a causa de ter parado. **Sem isso, não faça E3b (`robos/{uid}`).** Se o robô estiver parado, a publicação não piora nada para ele, mas a Agenda já está desatualizada e isso entra como pendência.

## 13. Robô do Astrea: identidade confirmada e diagnóstico supervisionado (R0)

**Resultado de R0 (02/11/2026, sem alterações):**
- O robô do PC do escritório usa **outra conta** (`robo.astrea@…`), diferente da configurada neste PC. A UID dela está no registro local, e é **essa** que entra em `robos/` na E3b. A conta deste PC não é a do robô em uso.
- **Identidade confirmada**: último login em 02/11/2026. **Sucesso da importação não confirmado.**
- `AstreaImportDiario`: última execução em 01/11, **resultado 1**.
  - A tarefa chama o `python.exe` com `>> log-diario.txt 2>&1` como argumentos. Sem um shell, esse redirecionamento não acontece, e por isso não há log.
  - Não está comprovado que essa seja a causa da falha.
- `AstreaWatcher`: última execução em 27/10, resultado 267014 (0x41306, tarefa encerrada).

**Correção da captura de log (preparada nesta branch; não publicada):** o `importar.py` passa a gravar o próprio log em `scripts\astrea-importer\logs\importar-AAAA-MM-DD.txt`, com o erro completo (traceback), e avisa dos argumentos de redirecionamento ignorados.
- Funciona **com a tarefa do jeito que está**: a configuração da tarefa não muda.
- Só chega ao PC do escritório pelo `git pull` automático, **depois** do merge na `main`.
- Teste local: 25 de 25, `tests/djen/testar-diagnostico-astrea.py` (robô falso, Firestore falso em 127.0.0.1, repositório git temporário com alteração local).

### Execução supervisionada (antes da publicação, com o arquivo copiado à mão)

O arquivo é `scripts/seguranca/diagnostico_astrea.py`. Copie **só ele** para `C:\Users\FB\diagnostico-astrea\`, **fora** do repositório, substituindo a versão anterior. Rode no PowerShell do PC do escritório, com o **mesmo python.exe da tarefa**, fora das 7h e longe da meia-noite (a data "de hoje" é a do PC no início da execução).

Em todas as fases, o diagnóstico:
- **não faz `git pull`**: desliga a atualização automática antes de carregar o robô e não roda o bloco principal dele;
- **confere no fim que o repositório do robô ficou igual**: o mesmo commit e os mesmos arquivos alterados localmente, listados só pelo nome. Se algo mudar, termina com código 3;
- **não cria `__pycache__`** na pasta do robô (a primeira versão, usada na Fase A, pode ter criado; veja abaixo);
- **trava a rede do robô** (`requests`): bloqueia e registra qualquer chamada fora do permitido na fase;
- não altera a tarefa e não imprime senhas, e-mails completos, UID completa nem registros da agenda (só contagens).

| Fase | Comando | Astrea | Firebase | No PC |
|---|---|---|---|---|
| **A** ✓ **aprovada em 02/11/2026** | `python diagnostico_astrea.py` | Login e exportação da agenda (só leitura). | **Nada.** | Planilha mantida em `Downloads\astrea-import`. |
| **B1** (só leitura) | `python diagnostico_astrea.py --leitura` | O mesmo da Fase A. | **Login** com `robo.astrea@…` (atualiza o "último login"). **Lê só** `astreaDiario` e `astreaDelta`: se existem `astreaDiario/{hoje}`, `astreaDelta/{hoje}` e `astreaDiario/{ontem}` (total e data de atualização), e quais são os 5 dias mais recentes de `astreaDiario`. Calcula o delta que seria gravado (só totais). **Não grava nada.** | Planilha não arquivada. |
| **B2** (`--completo`): **dispensada em 02/11/2026** | `python diagnostico_astrea.py --completo` | O mesmo da Fase A. | Tudo da B1, depois **salva uma cópia local** dos dois documentos de hoje (se existirem) e então **grava**. A trava só permite gravar `astreaDiario/{hoje}` e `astreaDelta/{hoje}`; qualquer outra gravação é bloqueada. No fim, relê e confere o total gravado contra a planilha. | Arquiva a planilha em `historico\`, como no uso normal. Cópias `copia-anterior-*.json` na pasta do diagnóstico, **com dados de clientes**: apagar depois de conferir. |

**Fase A (02/11/2026): aprovada**, com código 0.
- Commit do robô `4d115d5`, com 2 arquivos alterados localmente (preservados).
- Login e exportação no Astrea funcionaram. A espera pelo arquivo foi de 09:29:50 a 09:35:40.
- `Agenda.xlsx` de 1.250.162 bytes: 1.676 registros e 15 colunas.
- O Firebase não foi chamado e a planilha não foi arquivada.
- **A causa do resultado 1 na tarefa agendada continua não comprovada.** A Fase A só mostra que, rodando à mão, a parte do Astrea funciona.

**O que a Fase B2 substitui:**
- **`astreaDiario/{hoje}`** é substituído **por inteiro**: o robô usa PATCH sem máscara de campos. Ficam só os campos `atualizadoEm`, `data`, `registros` (a agenda inteira), `colunas` e `total`. A Agenda e os Números do portal passam a mostrar essa agenda para toda a equipe, que é o mesmo efeito da tarefa das 7h.
- **`astreaDelta/{hoje}`** é substituído por inteiro **só se existir `astreaDiario/{ontem}`**. Os campos são `data`, `atualizadoEm`, `totalHoje`, `totalOntem` e os novos e concluídos (totais e por responsável). Sem o dia anterior, o robô pula o delta. Um erro no delta só gera um aviso no log, e a conferência da B2 registra se o documento existe.
- **Nenhum outro documento** é gravado: os dias anteriores não são alterados e nada é apagado.

**Regras em vigor:** a B2 roda com as regras **atuais** de produção, em que qualquer conta logada grava `astreaDiario` e `astreaDelta`. Ela valida o login do robô, a gravação e a conferência, **não** as regras novas. Com as regras novas, a gravação exige `robos/{uid}` (E3b). Por isso a V9 continua necessária depois da publicação.

**Antes da publicação, conferir os 2 arquivos alterados no PC:** a B1 lista os nomes. Se algum deles também mudar na `main` com a publicação (por exemplo, o `importar.py`), o `git pull --ff-only` automático vai **recusar** a atualização (nada se perde, mas o robô segue no código antigo, sem o log próprio). Nesse caso, combinar antes como preservar a alteração local. Um `?? scripts/astrea-importer/__pycache__/` que apareça na lista foi criado pela primeira versão do diagnóstico: não atrapalha o `git pull` e pode ser apagado.

**Fase B1 (02/11/2026): aprovada**, com código 0.
- Login confirmado (a UID começa com `EyREco`). Nenhuma gravação; o repositório ficou inalterado.
- O `importar.py` está igual ao do commit `4d115d5`. Os itens locais não versionados são `__pycache__/`, `credenciais.env` e `log-watcher.txt`; preservar todos, e **as credenciais nunca vão para o Git**.
- `astreaDiario/2026-11-02` tem 1.676 registros, com `atualizadoEm=2026-11-02T10:02:54Z` (07:02:54 de Brasília). Também existem `astreaDelta/2026-11-02` e `astreaDiario/2026-11-01`, este com 1.676 registros.
- O delta simulado deu 627 novos e 627 concluídos, investigado abaixo.
- Como os locais são não versionados e o `importar.py` não tem alteração local, o `git pull` da publicação **não** será recusado por eles.

### Delta de 627 + 627: defeito de comparação (artefato, não movimento real)

- **Mecanismo.** O `processar_arquivo` troca NaN por `None` com `df.where(pd.notnull(df), None)`, mas o pandas devolve NaN nas colunas com células vazias. A chave (`_chave_tarefa`) usa `str(valor or '')`, e NaN conta como verdadeiro, então uma célula vazia vira `"nan"` na planilha do dia. O dia anterior volta do Firestore com `null` (o robô grava NaN como null), e a mesma célula vira `""`. Resultado: **toda tarefa sem número de processo** muda de chave e conta como 1 concluída e 1 nova, sempre em pares iguais.
- **Evidência local**, só contagens, com as duas exportações antigas que existem neste PC (14/10 e 23/10):
  - cada planilha comparada **com ela mesma** depois de gravar e ler do Firestore já dá 543 + 543 e 567 + 567;
  - o único componente da chave que muda é o número do processo: 614 e 630 registros, exatamente as células vazias dessa coluna;
  - 627 de 1.676 (37%) é a mesma proporção (630 de 1.536).
- **Outros pontos revisados:**
  - **Ordem das colunas:** a chave pega a primeira coluna que contém "data", "hora" etc. Com as 15 colunas do Astrea, a escolha é a mesma na ordem da planilha e na ordem alfabética do Firestore. Não é causa.
  - **Repetições:** de 31 a 43 chaves aparecem mais de uma vez. O código atual conta cada chave uma vez, então uma tarefa repetida concluída não aparecia.
  - **Campos que mudam:** a chave inclui data e hora, então **remarcar** uma tarefa conta como 1 concluída e 1 nova. A análise mede isso; a mudança da chave fica para você decidir.
  - **Responsável vazio** virava a pessoa `"nan"` no delta por responsável.
- **Impacto:** o gráfico de entradas e saídas da Agenda (Números, últimos 35 dias de `astreaDelta`) mostra centenas de entradas e saídas falsas por dia. A agenda em si (`astreaDiario`) está correta, porque NaN é gravado como null.

**Correção preparada (`importar.py`; só chega ao escritório com a publicação):**
- `astype(object)` antes do `where`, para não sobrar NaN;
- `_texto()` normaliza os valores: vazio, None e NaN viram `""`; `123.0` vira `123`; espaços são normalizados;
- o delta conta repetições.

Conferências:
- o **conteúdo gravado no Firestore é idêntico** ao da versão em uso, conferido nas duas exportações reais (só a comparação "igual ou não") e nos testes;
- comparar um dia com ele mesmo passa a dar 0 + 0;
- `tests/djen/testar-delta-astrea.py`: 17 de 17, com dados fictícios.

**Fora desta correção:**
- **Os `astreaDelta` já gravados continuam inflados.** Recalculá-los a partir dos `astreaDiario` gravados seria uma gravação em produção, que fica como operação separada, só com autorização.
- A troca de data/hora pela data de criação na chave depende dos números da análise.

### Análise só de leitura no PC do escritório (executada em 02/11/2026; resultado abaixo)

O arquivo é `scripts/seguranca/analisar_delta_astrea.py`. Copie para `C:\Users\FB\diagnostico-astrea\` e rode com o python.exe da tarefa:
- `python analisar_delta_astrea.py`: **sem rede**. Não abre o Astrea, não grava nada e não faz `git pull`.
- `python analisar_delta_astrea.py --firebase`: também faz o **login do robô** e **lê** `astreaDiario` e `astreaDelta`, sem gravar.

O que ela mostra (só nomes de colunas, contagens, datas e códigos):
1. **Tarefas agendadas**: cada tarefa com "astrea", `importar.py` ou `watcher.py`, com estado, última execução, resultado (com o significado), próxima execução, conta, tipo de logon, limite de tempo, gatilhos e ação. Também mostra o histórico do Agendador dos últimos 6 dias, se estiver ligado.
2. **Arquivos**: as planilhas arquivadas em `historico\`, que só existem quando uma execução chegou ao fim, com horário; as planilhas soltas; as últimas 20 linhas do `log-watcher.txt`; e se existe a pasta `logs\`.
3. **Delta entre as duas últimas planilhas do histórico**: o delta do código atual, o corrigido, o tamanho do artefato, as células NaN por coluna, as repetições, as remarcações e a chave alternativa.
4. Com `--firebase`: os últimos 7 `astreaDiario` (total e horário), os últimos 12 `astreaDelta` (novos e concluídos gravados) e o mesmo cálculo com os dois dias gravados.

**Origem da gravação de 07:02:54:** a análise cruza a última execução de cada tarefa e o resultado dela com o horário da planilha arquivada `2026-11-02_*` e com o `atualizadoEm`. A falha de 01/11 (resultado 1) **não** prova que o robô está parado: a gravação de hoje indica uma execução de 02/11 que funcionou. Qual tarefa a fez (a das 7h ou o watcher) a análise vai mostrar.

### Resultado da análise no escritório (02/11/2026): código 0, sem rede, repositório inalterado

- **Origem da gravação de 07:02:54:** a tarefa **`AstreaImportDiario`** rodou em 02/11/2026 às 07:00:01 com **resultado 0**. A planilha de hoje foi arquivada às 07:02:50, compatível com o `atualizadoEm` de 07:02:54. **O robô diário está funcionando.** A causa do resultado 1 de 01/11 continua **não comprovada**; o log próprio (depois da publicação) vai registrar as próximas falhas.
- **`AstreaWatcher`:** Ready, última execução em 27/10 com resultado 0x41306 (encerrada). **Não está em execução.**
  - A tarefa só inicia **no logon** (`AtLogOn`) e tem **limite de 23 horas**. Um logoff, ou o limite, encerra o watcher, e ele só volta no próximo logon. Isso é compatível com o 0x41306, mas não está comprovado.
- O histórico do Agendador está indisponível (log desligado). O `importar.py` continua no commit `4d115d5`, sem alteração local.
- **Delta entre as planilhas arquivadas de 01/11 e 02/11** (1.676 registros em ambas):
  - o código atual dá **623 novos e 623 concluídos**; a comparação corrigida dá **0 e 0**;
  - 695 registros têm a chave alterada só pelo percurso de serialização;
  - 36 chaves repetidas somam 84 registros que o código antigo desconsidera.
  - **O defeito está reproduzido nesses dois arquivos.** Isso **não** prova que reproduz exatamente os 627/627 da B1, que usou uma exportação posterior.

### Fase B2: dispensada (02/11/2026)

Dispensada por decisão do responsável. O motivo: o login e a leitura passaram na B1, e a gravação diária funcionou hoje (resultado 0). A B2 não testaria as regras novas, que são cobertas pela V9, e regravaria o delta com o defeito.

### Recuperação do watcher: execução única e supervisionada (W1 e W2 aprovadas em 02/11/2026; tarefa não religada)

O arquivo é `scripts/seguranca/watcher_supervisionado.py`. Copie para `C:\Users\FB\diagnostico-astrea\` e rode com o **python.exe** da tarefa (não o pythonw):

| Passo | Comando | O que faz | Firebase | Importação |
|---|---|---|---|---|
| **W1** | `python watcher_supervisionado.py` | Consulta a tarefa `AstreaWatcher` (estado, último resultado, gatilho, limite) e se há algum `watcher.py` rodando. Faz o login do robô e **lê** `astreaTrigger/pedido`, mostrando o status e os horários. | Login + 1 leitura | **Nenhuma** |
| **W2** (depois de revisar a W1) | `python watcher_supervisionado.py --um-ciclo` | Roda **um** ciclo do `watcher.py` **real**, em primeiro plano, e termina. | Login + leitura | **Nenhuma** |

Proteções da W2:
- Recusa rodar se já houver um watcher ativo (código 4) ou se o pedido estiver **pendente** (código 5), porque o ciclo dispararia uma importação.
- A trava de rede só permite o login e a **leitura** do pedido. Se alguém clicar no portal durante o ciclo, a troca para "executando" é bloqueada e nada é importado (código 6).
- Não inicia, não para e não altera a tarefa. Não faz `git pull`: a atualização automática fica desligada também para processos filhos.
- Teste: `tests/djen/testar-watcher-supervisionado.py`, 9 de 9, com o `watcher.py` real e um Firestore falso.

**Como ler o status do pedido na W1:**
- **Não existe:** iniciar o watcher não dispara nada.
- **`pendente`:** iniciar o watcher **dispara uma importação completa em até 90 s**. Não iniciar sem combinar; quem pediu precisa saber.
- **`executando`:** o pedido ficou travado, provavelmente pelo encerramento de 27/10. O watcher o ignora, mas o botão do portal fica bloqueado. Liberar exige **apagar** o documento, uma gravação que só acontece com autorização (pelo console).
- **`concluido` ou `erro`:** o watcher ignora; o portal apaga o documento quando um admin abre a página.

**W1 e W2 (02/11/2026, PC do escritório): aprovadas**, com código 0 e o repositório inalterado.
- O login do robô no Firebase funcionou.
- Nenhum processo do watcher estava ativo.
- `astreaTrigger/pedido` não existia nas duas consultas.
- A W2 rodou um ciclo real do `watcher.py`, sem gravação e sem importação.
- A tarefa permanente **não** foi religada. A recuperação permanente fica para a publicação, junto da **V9**.

**Religar a tarefa** (`Start-ScheduledTask -TaskName AstreaWatcher`) só com autorização, depois de W1 e W2.
- **Recomendação:** religar **depois da publicação**, junto da **V9**, porque é o watcher que atende o botão "Executar robô agora". Antes da publicação, ele rodaria o código atual, que grava o delta com o defeito.
- Com as regras novas, o watcher também precisa de `robos/{uid}` (E3b).
- A configuração da tarefa (só no logon, limite de 23 h) faz o watcher parar sozinho. Mudá-la é uma alteração de tarefa, que fica para depois e só com autorização.

## 14. Pendências consolidadas para a publicação (02/11/2026)

### Antes de marcar o horário

| # | Pendência | Como conferir (sem alterar nada) | Situação |
|---|---|---|---|
| 1 | **Acesso à Cloudflare** (E7 e R6) | Entrar em dash.cloudflare.com com a conta dona do Worker. Abrir Workers & Pages › `portal-fb-gemini` e (a) ver que **Edit code** abre; (b) em **Deployments**, a versão ativa; (c) em **Settings**, só os **nomes** de `GOOGLE_SA_EMAIL`, `GOOGLE_SA_PRIVATE_KEY` e `USAGE_KV` (sem abrir valores). Opcional: copiar o código ativo para `Backups\...\worker\` e confirmar se é o "presumido". O `portal-fb-admin` fica na mesma conta. **Não** clicar em Deploy. | ☐ |
| 2 | **Acesso ao GitHub** (E1 e R7) | (a) Entrar em github.com/jowjo007/SISTEMA-FB com a conta dona; em **Settings › Pages**, a fonte é a `main`; em **Settings › Branches**, ver se há proteção que impeça o push. (b) No terminal: `git ls-remote origin main` e `git push --dry-run origin seguranca/revisao-asvs:main`. O dry-run autentica e simula sem enviar nada. | ☐ |
| 3 | **Watcher W1 e W2** (seção 13) | Só leitura. | ✅ aprovadas em 02/11/2026; religar a tarefa fica para a publicação, na V9 |
| 4 | **Robô diário em 03/11** | Na manhã seguinte: `Get-ScheduledTaskInfo AstreaImportDiario` com resultado 0 e `historico\2026-11-03_*`. Confirma que 02/11 não foi caso isolado. | ☐ |
| 5 | **Horário da publicação** | A sua confirmação (janela fora do expediente, 40 a 60 min, mais as verificações). | ☐ aguardando |
| 6 | **Testes no dia (P4)** | Repetir todos os testes de `tests/LEIA-ME.md` se houver qualquer mudança até lá. Agora incluem `testar-delta-astrea.py` (17) e `testar-watcher-supervisionado.py` (9). | ☐ |

### Já concluídas
- P1 (cópia verificada; restauração **não** testada, B7).
- P2 (acesso no Google).
- P3 (cópia local com manifesto).
- P5 (DJEN desativado).
- R0: identidade do robô, Fases A e B1, análise do delta e da origem; B2 dispensada.

### No dia: etapas que pedem a sua autorização no momento
- **E10:** execução da migração dos anexos do Chat (a simulação vem antes).
- **V6** (Assistente) e **V7** (Docs).
- **V9:** robô; exige o watcher religado.
- **V10:** anexos.
- **V12 e E12:** DJEN.

### Operações separadas: fora desta publicação, cada uma só com autorização
- **Recalcular os `astreaDelta` históricos**, inflados pelo defeito. É uma gravação em produção a partir dos `astreaDiario` gravados. **Aguardando autorização.**
- Mudar a chave do delta (data de criação no lugar de data/hora), conforme a sua decisão.
- Ajustar a tarefa `AstreaWatcher` (gatilho e limite de 23 h) e, se quiser, remover os argumentos `>> log-diario.txt 2>&1` da `AstreaImportDiario`. O log próprio já não depende disso.
- Liberar um `astreaTrigger/pedido` travado, se a W1 mostrar `executando`.
- Revogar os tokens dos links antigos do Chat (só depois da V10).
- Limpar branches e histórico (seção 8).
- Teste de restauração em projeto separado (B7).
