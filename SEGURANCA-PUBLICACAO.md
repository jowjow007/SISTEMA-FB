# Publicação da revisão de segurança (branch `seguranca/revisao-asvs`)

Roteiro para publicar as correções de 01/11/2026 com o menor tempo possível de dados expostos ou permissões amplas. Siga a ordem. Os passos 3 a 8 devem ser feitos numa mesma sessão de trabalho.

> **Não restaure as regras antigas para "consertar" uma falha de funcionamento.** As regras antigas deixam qualquer conta logada ler os dados. Corrija a regra específica (veja "Recuperação").

## 0. Antes de começar

| # | O quê | Onde |
|---|---|---|
| 0.1 | A tarefa `PortalFB_AtualizarPublicacoesDJEN` já está **desativada**. Ela fazia commit e push sozinha a partir de `C:\Users\jowjo\portal-fb`, inclusive em outra branch. Só reative no passo 10. | Agendador de Tarefas |
| 0.2 | Copie as regras **atuais** do Firestore e do Storage para um arquivo local. Isso é registro do que estava publicado, não plano de volta. | Console › Firestore › Regras / Storage › Regras |
| 0.3 | Anote a UID da conta do robô do Astrea. O robô passa a gravar no log `UID (para robos/{uid})`; ela também aparece em Console › Authentication, na conta configurada no `credenciais.env` do PC do escritório. | Console |
| 0.4 | Rode os testes (`tests/LEIA-ME.md`) na branch e confira **0 reprovados**. | PC local |

## 1. Dependências

```
merge na main (site) ──► migração de acesso (página admin, regras antigas aceitam)
                              │
          robos/{uid} pelo console ──┤
                              ▼
                      Worker do Assistente  (exige acesso == 'ativo')
                              ▼
                 regras do Firestore ──► regras do Storage
                              ▼
            envio dos dados privados (página admin, só com regras novas)
```

- **Site antes de tudo.** É o que tira os dados pessoais da página pública. Enquanto o resto não chega, os painéis restritos mostram "restrito / ainda não carregado". Isso é perda de função, não exposição. O Assistente fica fora do ar até o passo 5, porque o Worker antigo recusa o cabeçalho com o token.
- **Migração antes do Worker e das regras.** Os dois exigem `acesso == 'ativo'`. Sem a migração, ninguém entra.
- **`robos/{uid}` antes das regras.** Sem esse documento, o robô do Astrea recebe 403.
- **Dados privados só depois das regras.** As coleções `dadosPrivados` e `arquivosPrivados` não existem nas regras antigas.

## 2. Sequência

| Passo | Ação | Validação imediata |
|---|---|---|
| 1 | Merge de `seguranca/revisao-asvs` na `main` e push. O GitHub Pages publica em até ~10 min. | Em aba anônima, abra `/tools/numeros-escritorio/` e `/tools/condominios/`: nenhum nome de cliente ou síndico, nem CNPJ. `/tools/condominios/pdfs/relatorio-duo-2026-08.pdf` responde 404. |
| 2 | Abra `/tools/admin-seguranca/` logado como admin. **Passo 1 (acesso):** confira a lista e grave. **Passo 2 (patrimônio):** marque quem vê tudo (veja a seção 3) e grave. Baixe o CSV do registro. | Em Administração › Usuários, ninguém aparece como "sem status". |
| 3 | No console, crie `robos/{UID do robô}` com `descricao: "PC do escritório — Agenda Astrea"`. | O documento existe. |
| 4 | Peça para cada colaborador aprovado recarregar o portal (Ctrl+F5). | — |
| 5 | Publique o Worker: `cd tools/assistente-ia && wrangler deploy`. | O Assistente responde a um membro; uma conta pendente recebe "Acesso não liberado". |
| 6 | Cole `firestore.rules` em Console › Firestore › Regras e publique. | Login de admin e de membro funcionam; Agenda, Chat, Gestão e Anotações abrem. |
| 7 | Cole `storage.rules` em Console › Storage › Regras. Antes, confira se o bucket tem pastas além de `chat/`. | Enviar um PDF no Chat funciona; um anexo antigo continua abrindo pelo link. |
| 8 | Na página admin, **passo 4**: selecione `privado/numeros-stats.json`, `privado/condominios.json` e os 6 arquivos de `privado/condominios-pdfs/`. | As abas Clientes/Juízo/Efetividade/Qualidade e a lista de Condomínios voltam; o PDF de um relatório baixa. |
| 9 | Clique em "Executar robô agora" na Agenda. | O log do robô mostra a UID e a gravação, sem 403. |
| 10 | Reative o DJEN só **depois** que `C:\Users\jowjo\portal-fb` estiver na `main` e limpo: `Enable-ScheduledTask PortalFB_AtualizarPublicacoesDJEN`. Melhor ainda: aponte a tarefa para um clone separado, só da `main`. | No próximo dia, o log diz "Commit e push" ou "Sem diferenças", sem "Nada foi gravado". |

Os passos 2 a 8 encerram o período em que qualquer conta logada lê os dados. Faça-os em sequência, de preferência fora do expediente.

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
