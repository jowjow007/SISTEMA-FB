# Publicação acompanhada da revisão de segurança (branch `seguranca/revisao-asvs`)

Plano final para publicar as correções de 01/11/2026 preservando as funções existentes. Esta é a **única** sequência válida (etapas P1–P5 antes do dia, E1–E12 no dia, V1–V12 de verificação). **Nada aqui foi executado em produção.**

A ordem leva em conta as regras **realmente publicadas hoje** (copiadas do console em 01/11/2026). Nelas, cada pessoa pode gravar quase qualquer campo do próprio cadastro: `acesso`, `patrimonioVerTudo`, `remuneracao`. Por isso:
- a migração de acesso só roda **depois** das regras novas;
- as regras novas exigem **aprovação e ao menos uma aba**, ou ser admin.

> **Regra de ouro da recuperação: nunca republique as regras antigas, o Worker antigo nem o HTML antigo com dados de clientes.** Toda falha se corrige para frente, na regra ou no arquivo específico (seção 4).

## 1. Pré-requisitos (antes do dia)

| # | O quê | Situação |
|---|---|---|
| **P1** | **Cópia dos dados em produção.** Firestore: Console › Firestore › aba "Importar/exportar" (ou `gcloud firestore export gs://<bucket-de-backup>/2026-11-portal`). Storage, anexos do Chat: `gsutil -m cp -r gs://sistema-fb-4cce5.firebasestorage.app/chat <pasta local>`. Confira se a exportação terminou e quantos arquivos foram copiados. | **Depende de você.** Exige o console ou o gcloud com a sua conta. |
| **P2** | **Acesso de recuperação** (ver seção 11, B3: permissões **efetivas**; abrir telas não comprova). Com a conta dona do projeto, confira, sem alterar nada: (a) Console › Firestore › Dados, abra `users/{sua UID}`: você consegue **ver e editar** campos; (b) Console › Authentication: sua conta e a do robô aparecem (anote as duas UIDs); (c) Console › Configurações do projeto › Usuários e permissões: seu papel é **Proprietário**; (d) Console › Firestore e Storage › Regras: o botão "Publicar" está habilitado. | **Depende de você.** Daqui não consigo verificar a sua conta. |
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
| **E3** | Console: `users/{sua UID}.acesso = "ativo"`; `robos/{UID do robô}` com `descricao`. | Os dois documentos existem. | Você não consegue editar pelo console (P2 falhou). | Não seguir para E4 sem acesso de recuperação. |
| **E4** | Publicar `firestore.rules`. | Você recarrega (Ctrl+F5) e entra. | Você não entra. | Console: confira `acesso`, `role` e a UID do seu cadastro. **Não** republique as regras antigas. |
| **E5** | Página `tools/admin-seguranca`: passo 1 (acesso: desmarque os **⚠ conferir**), passo 2 (patrimônio: marque **só** os admins e as pessoas que você autorizar; ninguém vem marcado). Baixe o CSV. | Um colaborador entra e abre a Agenda. | Alguém da equipe continua sem acesso **e** "Aprovar acesso" não resolve. | Reabra a página; ela grava só o que mudou. Pessoa sem aba: Usuários › Editar abas. |
| **E6** | Publicar `storage.rules` (antes, confira que só existe `chat/`) e **aceitar a permissão "cross-service"** que o console pedir. | Enviar um PDF numa conversa de teste funciona; um anexo antigo continua abrindo. | O envio falha com "unauthorized". | Conceda a permissão cross-service (Storage › Regras). Não volte às regras antigas do Storage. |
| **E7** | `wrangler deploy` do Worker. | V6 (Assistente) ✓. | Assistente com 401/403 para toda a equipe. | Conferir E5. Se persistir, desativar a rota do Worker. **Não** voltar o Worker antigo (era proxy aberto). |
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
| V9 | **Robô do Astrea** 🔒 autorização (o robô entra no Astrea com a conta do escritório) | "Executar robô agora". | O log mostra a UID e a gravação, sem 403. |
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
| Projeto, localização do banco e volume conferidos (B1) | ☐ | |
| Custo estimado com volume e região reais (B2) | ☐ | |
| Permissões efetivas conferidas (B3) | ☐ | |
| Bucket de backup criado, **privado e restrito** (B4) | ☐ | |
| Exportação do Firestore **concluída e verificada** (B5) | ☐ | ID da operação: |
| Cópia dos anexos **concluída e verificada** (B6) | ☐ | |
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
