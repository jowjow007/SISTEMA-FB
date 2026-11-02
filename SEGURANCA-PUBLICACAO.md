# Publicação da revisão de segurança (branch `seguranca/revisao-asvs`)

Roteiro para publicar as correções de 01/11/2026 com o menor tempo possível de dados expostos ou permissões amplas. Esta é a **única** sequência válida: as etapas vão de **E0 a E11**, e o restante do documento usa os mesmos números. As etapas **E3 a E8** devem ser feitas na mesma sessão de trabalho, porque é nesse intervalo que as permissões antigas, amplas, ainda valem.

> **Não restaure as regras antigas para "consertar" uma falha de funcionamento.** As regras antigas deixam qualquer conta logada ler os dados. Corrija a regra específica (seção 4, "Recuperação").

## 1. Dependências entre as etapas

```
E0 preparação (testes, cópia das regras atuais, UID do robô, DJEN desligado)
 │
E1 site (merge na main) ── tira os dados pessoais da página pública
 │
E2 conferência pública do site  ◄── não siga se algum dado ainda aparecer
 │
E3 migração de acesso e patrimônio (página admin; as regras ANTIGAS aceitam essa gravação)
 │
E4 robos/{uid} pelo console (as regras antigas não têm a coleção robos)
 │
E5 Worker do Assistente (exige acesso == 'ativo', criado em E3)
 │
E6 regras do Firestore ──► E7 regras do Storage
 │
E8 dados privados pela página admin (as coleções só existem nas regras novas)
 │
E9 links antigos do Chat (revogação dos tokens: decisão sua)
 │
E10 verificação final com usuários reais ──► E11 reativar o DJEN
```

## 2. Sequência, com verificação entre as etapas

Só passe para a etapa seguinte quando a verificação da etapa atual der o resultado esperado. Se não der, use a coluna "Se falhar" e não pule etapa.

| Etapa | Ação | Verificação antes de seguir | Se falhar |
|---|---|---|---|
| **E0** | **Preparação.** <br>a) Rode `npm test` e `firebase emulators:exec … funcional` (`tests/LEIA-ME.md`): **0 reprovados**. <br>b) Copie as regras atuais do Firestore e do Storage para um arquivo local; é registro, não plano de volta. <br>c) Anote a UID da conta do robô (Console › Authentication, conta do `credenciais.env` do PC do escritório). <br>d) Confirme que a tarefa `PortalFB_AtualizarPublicacoesDJEN` está **Desativada**. | Testes 0 reprovados; UID anotada; tarefa desativada. | Não publique. |
| **E1** | Merge de `seguranca/revisao-asvs` na `main` e push. O GitHub Pages publica em até ~10 min. | Em **Settings › Pages** do GitHub, o último deploy aparece como concluído. | Corrija com um novo commit. Não reverta o commit que tirou os dados. |
| **E2** | Em aba anônima: abra `/tools/numeros-escritorio/` e `/tools/condominios/`, use Ctrl+F para procurar um nome de cliente e um de síndico que você conheça, e abra `/tools/condominios/pdfs/relatorio-duo-2026-08.pdf`. | Nenhum nome encontrado; o PDF responde **404**. A aba Clientes mostra "Faça login…". | Espere o cache de ~10 min e confira de novo. Se persistir, há um arquivo que não saiu: pare e me chame. |
| **E3** | Abra `/tools/admin-seguranca/` logado como admin. <br>**Passo 1 (acesso):** confira a lista; desmarque ex-colaboradores e contas desconhecidas; grave. <br>**Passo 2 (patrimônio):** marque só quem deve ver tudo (seção 3); grave. <br>Baixe o **CSV** do registro. | Em Administração › Usuários ninguém aparece como "sem status". O CSV tem uma linha por alteração. | Repita o passo; ele grava só o que mudou. |
| **E4** | No console: Firestore › coleção `robos` › documento com ID = **UID do robô** e campo `descricao` = "PC do escritório — Agenda Astrea". | O documento existe com o ID exato da UID. | Corrija o ID; tem de ser a UID, não o e-mail. |
| **E5** | Publique o Worker: `cd tools/assistente-ia && wrangler deploy`. | Logado como membro, o Assistente responde. Numa aba anônima sem login, a página não consegue usá-lo. | `wrangler rollback` **não**: o Worker antigo era um proxy aberto. Se precisar, desative a rota e me chame. |
| **E6** | Cole `firestore.rules` em Console › Firestore › Regras e publique. Até ~1 min para valer. | Admin e um membro recarregam (Ctrl+F5) e abrem Agenda, Chat, Gestão e Anotações sem "permissão negada". | Seção 4. Admin trancado: no console, `users/{UID}.acesso = "ativo"`. |
| **E7** | Cole `storage.rules` em Console › Storage › Regras e publique. Antes, confira em Storage › Arquivos que só existe a pasta `chat/`. Se houver outra, **pare**: a regra nova bloqueia pastas desconhecidas. | No Chat: enviar um PDF numa conversa funciona; um anexo antigo continua abrindo. | Se houver outra pasta em uso, me mande o nome antes de publicar. |
| **E8** | Na página admin, **passo 4**: selecione `privado/numeros-stats.json`, `privado/condominios.json` e os 6 arquivos de `privado/condominios-pdfs/`. | Recarregue Números (aba Clientes) e Condomínios (Consultar Clientes e Relatórios): os dados voltam, e um relatório em PDF baixa. | Envie de novo; o envio substitui. |
| **E9** | **Links antigos do Chat** (seção 5). Escolha uma opção: (a) não revogar; (b) revogar arquivos específicos pelo console; (c) revogar todos com o script em modo de simulação e depois em modo real. | Para (b) ou (c): o link antigo copiado antes responde 403/404, e o arquivo continua visível para os participantes **se** o script também atualizar as mensagens. | Sem revogação, o risco continua (seção 5). |
| **E10** | Verificação com pessoas reais: <br>• um membro abre a Agenda, os holerites (se for CLT), o próprio patrimônio, o Chat e o Assistente; <br>• um síndico (cliente) entra e **não** vê clientes de Condomínios; <br>• clique em "Executar robô agora": o log do robô mostra a UID e a gravação, sem 403. | Tudo conforme. | Seção 4. |
| **E11** | Reative o DJEN só com `C:\Users\jowjo\portal-fb` na `main` e limpo: `Enable-ScheduledTask PortalFB_AtualizarPublicacoesDJEN`. O ideal é apontá-lo para um clone separado, só da `main`. | No dia seguinte o log diz "Commit e push" ou "Sem diferenças", nunca "Nada foi gravado". | Desative de novo e me chame. |

Entre E1 e E5, o Assistente fica fora do ar. Entre E1 e E8, as abas restritas de Números e Condomínios aparecem como "restrito" ou "ainda não carregado". As duas coisas são perda de função temporária, não exposição de dados.

## 3. Quem deve receber acesso

- **Acesso (`acesso = ativo`).** A página sugere quem tem acesso hoje: admin ou alguma aba liberada. Desmarque ex-colaboradores, contas de teste e cadastros que você não reconhece. Clientes (síndicos aprovadores) continuam com papel `cliente`. Eles não leem os dados privados de Condomínios, só o que já era deles (`condoAprovadores`, `condoUnidades`, `notificacoesGeradas`).
- **Patrimônio ("vê tudo").** Hoje, quem não tem o campo vê todo o patrimônio. Depois da publicação, só vê tudo quem estiver marcado. Critério sugerido: **ninguém além de admin e de quem já tem a permissão de cadastrar patrimônio em Gestão**, porque esses veem tudo de qualquer forma. Marque outra pessoa só se a função dela exigir. Cada decisão fica gravada no cadastro (`patrimonioDefinidoPor`, `patrimonioDefinidoEm`) e no CSV.
- **Robôs.** Só a UID da conta do robô do PC do escritório. Nenhuma pessoa deve estar em `robos`.

## 4. Recuperação (sem voltar às regras antigas)

| Sintoma | O que fazer |
|---|---|
| Admin perdeu acesso | No console, abra Firestore › `users/{sua UID}` e grave `acesso = "ativo"`. O console não passa pelas regras. |
| Colaborador sem acesso | Administração › Usuários › **Aprovar acesso**. |
| Robô com 403 | Crie ou corrija `robos/{UID}` no console. |
| Uma tela específica deu "permission-denied" | Abra o erro no console do navegador, ajuste **só** a regra daquela coleção, acrescente um caso em `tests/firestore-rules/regras.test.js`, rode os testes e publique. |
| Assistente com 401/403 para todos | Confira se a migração rodou. Se precisar tirar o Assistente do ar, desative a rota do Worker. Não volte o Worker antigo, que era um proxy aberto. |
| Erro de página no site | Corrija com um novo commit. Não reverta o commit que tirou os dados, porque isso os publica de novo. |

## 5. Links de download já emitidos (Chat)

Cada anexo enviado pelo Chat ganhou um link com token (`getDownloadURL`), gravado na mensagem. **Esse link funciona sem passar pelas regras do Storage.** Quem guardou o link continua baixando o arquivo, inclusive ex-colaboradores e não participantes que receberam o link encaminhado.

O que as regras novas resolvem:
- não participantes não geram links novos;
- não participantes não listam as pastas;
- ex-colaboradores não leem as mensagens onde os links estão.

O que elas não resolvem:
- os links que já saíram.

Como tratar, em ordem de esforço:

1. **Arquivos sensíveis conhecidos:** em Console › Storage, abra o arquivo › "Revogar token de acesso". O link antigo para de funcionar; quem é participante continua vendo pelo portal, que pede um link novo.
2. **Todos os anexos antigos:** script com o Admin SDK que, para cada objeto em `chat/`, regrava o metadado `firebaseStorageDownloadTokens` com um valor novo. Isso invalida todos os links antigos de uma vez. Rode primeiro em modo de simulação. Os links gravados nas mensagens antigas também param de funcionar, então essas mensagens perdem o anexo, a menos que o script também atualize `storageUrl` nas mensagens. É uma operação em produção: **só com sua autorização**.
3. **Daqui para frente:** guardar na mensagem o caminho do arquivo, não o link, e gerar o link na hora de abrir. Fica como próximo passo.

## 6. Site, repositório e histórico são três coisas diferentes

| Camada | Situação depois do passo 1 | O que **não** resolve |
|---|---|---|
| **Site publicado** (GitHub Pages) | A versão atual não tem mais os dados. | Cópias em cache do GitHub Pages (minutos), navegadores, Wayback Machine e buscadores podem guardar a versão antiga. Verifique e peça remoção onde houver. |
| **Repositório público** | Os arquivos saíram da versão atual. | Qualquer pessoa ainda vê as versões antigas pelo histórico (`github.com/.../commits`, `raw.githubusercontent.com/<commit>/...`). Isso vale também para as branches `redesign-elegante-2026`, `test/organograma-real` e `test/tema-claro`. |
| **Tornar o repositório privado** | Esconde código e histórico de quem não é colaborador. | **Não protege o site.** No plano Free, repositório privado **desliga o GitHub Pages** e o portal sai do ar. Nos planos Pro/Team, o site continua **público** com o repositório privado; só o Enterprise Cloud permite restringir quem vê o site. Também não apaga cópias e forks já feitos. |
| **Limpeza do histórico** | Ver a seção 7. | Não apaga clones e forks já feitos, nem caches. |

Os dados ficaram públicos desde **15/08/2026**: o painel de Números com nomes de clientes e números de processo, e os relatórios dos condomínios desde o primeiro envio dos PDFs. Avalie com o jurídico se é caso de registro de incidente (LGPD, art. 48).

## 6b. O que foi encontrado nas branches remotas e nos PDFs públicos (01/11/2026)

Só categorias e lugares; nenhum dado foi copiado para cá.

| Lugar | O que tem | Medida |
|---|---|---|
| `origin/test/organograma-real` | Nenhum commit próprio: aponta para um commit antigo da `main` (13/10/2026). Contém a mesma versão pública de: painel de Números com lista de clientes e números de processo; página de Condomínios com nomes de síndicos, 2 CNPJs, endereço e observações internas; os 6 relatórios (PDF/PNG) de condomínios. Não há organograma com dados reais embutido no código, apesar do nome. | Apagar a branch remota (não tem trabalho próprio). Os dados continuam no histórico da `main` até a limpeza da seção 7. |
| `origin/redesign-elegante-2026` (14 commits próprios, 13/09/2026) | As mesmas três categorias acima. | Se o redesenho ainda servir, aplicar nela a remoção dos dados antes de qualquer merge; se não servir, apagar a branch. Entra na limpeza da seção 7. |
| `origin/test/tema-claro` (6 commits próprios, 13/10/2026) | As mesmas três categorias. | Idem. |
| `tools/pop/pdfs/pop-010-fluxo-paralegal.pdf` | Só o contato institucional do escritório (telefone, endereço e site no rodapé). Cita a existência da "Planilha de Senhas Diversas" e a lista dos sistemas externos usados, sem nenhuma credencial. **Não há dado pessoal.** | Nenhuma obrigatória. Opcional: tirar a lista de sistemas e a menção à planilha do PDF público. |
| `tools/sistemas/index.html` | Telefones e nomes de órgãos públicos e cartórios (diretório institucional). Não é dado pessoal. | Nenhuma. |
| Imagens apagadas do chat (`tools/chat/assets/*`, no histórico) | Botões e ícones de interface. Sem dado pessoal. | Nenhuma. |
| Histórico (todas as branches) | Nenhum `.env`, chave de conta de serviço ou arquivo de credenciais foi commitado. E-mails de trabalho aparecem em 10 arquivos publicados. | Os e-mails de trabalho são dado pessoal de baixo risco: avaliar se ficam. |

## 7. Limpeza do histórico: operação destrutiva, separada e **não executada**

Reescreve todos os commits desde 15/08/2026. Mudam os IDs dos commits, e todo clone existente precisa ser refeito, inclusive o do PC do escritório, cujo `git pull` automático vai falhar. Faça só com backup, depois que o resto estiver publicado e estável, e com a sua decisão explícita.

```bash
# 1) backup completo (espelho) fora do projeto
git clone --mirror https://github.com/jowjow007/SISTEMA-FB.git SISTEMA-FB-backup.git

# 2) num clone espelho de trabalho, com git-filter-repo instalado
git clone --mirror https://github.com/jowjow007/SISTEMA-FB.git limpeza.git && cd limpeza.git
git filter-repo --invert-paths --path tools/condominios/pdfs/
# a linha "const STATS = {...}" do painel e a lista CONDOMINIOS: trocar o conteúdo em todas as versões
git filter-repo --replace-text ../substituicoes.txt   # regex:^const STATS = \{.*$==>const STATS = {};  (e similar para CONDOMINIOS)

# 3) conferir (nenhum resultado esperado)
git log --all -S topClientesDemais --oneline
git log --all --oneline -- tools/condominios/pdfs

# 4) publicar a reescrita (DESTRUTIVO)
git push --force --mirror
```

Depois:
- peça ao suporte do GitHub para remover as visualizações em cache e os commits órfãos (*"Removing sensitive data from a repository"*);
- reclone em todos os PCs: o do escritório (robô Astrea) e este;
- apague as branches remotas antigas que não forem mais usadas.
