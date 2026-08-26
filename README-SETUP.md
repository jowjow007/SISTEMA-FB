# Portal Fonseca e Braga — guia de configuração

Site estático (funciona no GitHub Pages, igual ao painel-tv e ao painel-recepção),
com login de verdade via **Firebase Authentication** e controle de quais abas cada
pessoa vê, guardado no **Firestore**. Não precisa manter servidor nenhum — tudo
roda no navegador, o Firebase (gratuito no plano Spark) cuida das senhas.

## Versão

O número de versão aparece ao lado de "Portal Fonseca e Braga" no topo do sistema
(`<span class="version-tag">vN</span>`, dentro de `index.html`). **Convenção: toda
vez que qualquer coisa for alterada no sistema — o portal principal ou qualquer
ferramenta em `tools/*` — incremente esse número em 1 antes de publicar.** Isso
vale para qualquer conversa/sessão que mexer neste repositório, não só a que criou
o portal, para que o número reflita o estado real do sistema como um todo (não é
por arquivo, é uma versão única para tudo).

## 1. Criar o projeto no Firebase

1. Acesse https://console.firebase.google.com e clique em **"Adicionar projeto"**.
2. Dê um nome (ex: `portal-fonseca-braga`) e conclua a criação (pode desativar o
   Google Analytics, não é necessário).
3. No painel do projeto, clique no ícone **`</>`** ("Web") para registrar um app
   da Web. Dê um apelido (ex: `portal-web`) e **não** marque Firebase Hosting
   (vamos usar o GitHub Pages, como os outros painéis).
4. Copie o objeto `firebaseConfig` mostrado na tela e cole em
   [`firebase-config.js`](firebase-config.js) deste projeto, substituindo os
   valores `COLE_AQUI...`.

## 2. Ativar login por e-mail/senha

1. No menu lateral, vá em **Build > Authentication > Sign-in method**.
2. Clique em **E-mail/senha** e ative a primeira opção (deixe "Link de e-mail"
   desativado).

## 3. Criar o banco de dados (Firestore)

1. No menu lateral, vá em **Build > Firestore Database > Criar banco de dados**.
2. Escolha o modo de produção e a região mais próxima (ex: `southamerica-east1`
   — São Paulo).
3. Depois de criado, vá na aba **Regras** e cole:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function isSignedIn() { return request.auth != null; }
    function isAdmin() {
      return isSignedIn() &&
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
    match /users/{userId} {
      allow read: if isSignedIn() && (request.auth.uid == userId || isAdmin());
      allow create: if isSignedIn() && request.auth.uid == userId
                    && request.resource.data.role == 'membro'
                    && request.resource.data.tabs.size() == 0;
      allow update: if isAdmin() || (
                      isSignedIn() && request.auth.uid == userId &&
                      request.resource.data.role == resource.data.role &&
                      request.resource.data.tabs == resource.data.tabs &&
                      request.resource.data.email == resource.data.email &&
                      request.resource.data.displayName == resource.data.displayName
                    );
      allow delete: if isAdmin();
    }
    match /tabs/{tabId} {
      allow read: if isSignedIn();
      allow write: if isAdmin();
    }
    match /perfis/{uid} {
      allow read: if isSignedIn();
      allow write: if isSignedIn() && (request.auth.uid == uid || isAdmin());
    }
    match /sugestoes/{sugestaoId} {
      allow read: if isSignedIn();
      allow create: if isSignedIn()
                    && request.resource.data.autorUid == request.auth.uid
                    && request.resource.data.status == 'aberta'
                    && request.resource.data.texto is string
                    && request.resource.data.texto.size() > 0
                    && request.resource.data.texto.size() <= 2000
                    && request.resource.data.autorNome is string
                    && request.resource.data.autorNome.size() > 0
                    && request.resource.data.autorNome.size() <= 120
                    && request.resource.data.autorNome.matches('.+ .+')
                    && request.resource.data.motivoExclusao == null;
      allow update: if isAdmin()
                    && resource.data.status == 'aberta'
                    && request.resource.data.texto == resource.data.texto
                    && request.resource.data.autorUid == resource.data.autorUid
                    && request.resource.data.autorNome == resource.data.autorNome
                    && request.resource.data.criadoEm == resource.data.criadoEm
                    && request.resource.data.status in ['implantada', 'excluida']
                    && request.resource.data.decididoPor is string
                    && request.resource.data.decididoEm == request.time
                    && (request.resource.data.status == 'implantada'
                        ? request.resource.data.motivoExclusao == null
                        : (request.resource.data.motivoExclusao is string && request.resource.data.motivoExclusao.size() > 0));
      allow delete: if isAdmin();
    }
    match /conversas/{conversaId} {
      allow read: if isSignedIn() && request.auth.uid in resource.data.participantes;
      allow create: if isSignedIn()
                    && request.auth.uid in request.resource.data.participantes
                    && request.resource.data.participantes.size() >= 2
                    && request.resource.data.criadoPor == request.auth.uid;
      allow update: if isSignedIn()
                    && request.auth.uid in resource.data.participantes
                    && request.auth.uid in request.resource.data.participantes;
      allow delete: if false;

      match /mensagens/{mensagemId} {
        allow read: if isSignedIn()
                    && request.auth.uid in get(/databases/$(database)/documents/conversas/$(conversaId)).data.participantes;
        allow create: if isSignedIn()
                      && request.auth.uid in get(/databases/$(database)/documents/conversas/$(conversaId)).data.participantes
                      && request.resource.data.autorUid == request.auth.uid;
        allow update: if isSignedIn()
                      && request.auth.uid in get(/databases/$(database)/documents/conversas/$(conversaId)).data.participantes
                      && request.resource.data.diff(resource.data).affectedKeys().hasOnly(['lidaPor']);
        allow delete: if false;
      }
    }
    match /chatPrefs/{uid}/{document=**} {
      allow read, write: if isSignedIn() && request.auth.uid == uid;
    }
    match /pendGrupos/{grupoId} {
      allow read, delete: if isSignedIn() && resource.data.ownerUid == request.auth.uid;
      allow create: if isSignedIn()
                    && request.resource.data.ownerUid == request.auth.uid
                    && request.resource.data.nome is string
                    && request.resource.data.nome.size() > 0
                    && request.resource.data.nome.size() <= 80
                    && request.resource.data.emoji is string;
      allow update: if isSignedIn()
                    && resource.data.ownerUid == request.auth.uid
                    && request.resource.data.ownerUid == request.auth.uid;
    }
    match /pendTarefas/{tarefaId} {
      allow read, delete: if isSignedIn() && resource.data.ownerUid == request.auth.uid;
      allow create: if isSignedIn()
                    && request.resource.data.ownerUid == request.auth.uid
                    && request.resource.data.texto is string
                    && request.resource.data.texto.size() > 0
                    && request.resource.data.texto.size() <= 300
                    && request.resource.data.grupoId is string
                    && request.resource.data.concluida == false;
      allow update: if isSignedIn()
                    && resource.data.ownerUid == request.auth.uid
                    && request.resource.data.ownerUid == request.auth.uid;
    }
    match /contratosGerados/{docId} {
      allow read: if isSignedIn();
      allow create: if isSignedIn()
                    && request.resource.data.criadoPorUid == request.auth.uid
                    && request.resource.data.tipo is string
                    && request.resource.data.nomeDisplay is string
                    && request.resource.data.dados is map;
      allow update: if false;
      allow delete: if isSignedIn() && (resource.data.criadoPorUid == request.auth.uid || isAdmin());
    }
    match /organograma/{uid} {
      allow read: if isSignedIn();
      allow write: if isAdmin();
    }
    function isAprovadorDoCondo(slug) {
      return isSignedIn() &&
        exists(/databases/$(database)/documents/condoAprovadores/$(slug)) &&
        get(/databases/$(database)/documents/condoAprovadores/$(slug)).data.aprovadorUid == request.auth.uid;
    }
    match /condoAprovadores/{slug} {
      allow read: if isSignedIn();
      allow write: if isAdmin();
    }
    match /unidadeResets/{docId} {
      allow read: if isSignedIn();
      allow write: if isAdmin();
    }
    match /notificacoesGeradas/{docId} {
      allow read: if isSignedIn();
      allow create: if isSignedIn()
                    && request.resource.data.criadoPorUid == request.auth.uid
                    && request.resource.data.status == 'pendente'
                    && request.resource.data.tentativa == 1
                    && request.resource.data.condominio is string
                    && request.resource.data.condominioSlug is string
                    && request.resource.data.texto is string && request.resource.data.texto.size() > 0;
      allow update: if isSignedIn() && (
                      (
                        resource.data.criadoPorUid == request.auth.uid
                        && resource.data.status == 'rejeitada'
                        && request.resource.data.status == 'pendente'
                        && request.resource.data.criadoPorUid == resource.data.criadoPorUid
                        && request.resource.data.condominio == resource.data.condominio
                        && request.resource.data.condominioSlug == resource.data.condominioSlug
                        && request.resource.data.tentativa == resource.data.tentativa + 1
                      ) || (
                        resource.data.status == 'pendente'
                        && (isAdmin() || isAprovadorDoCondo(resource.data.condominioSlug))
                        && request.resource.data.status in ['aprovada', 'rejeitada']
                        && request.resource.data.decididoPorUid == request.auth.uid
                        && request.resource.data.criadoPorUid == resource.data.criadoPorUid
                        && request.resource.data.texto == resource.data.texto
                        && request.resource.data.condominioSlug == resource.data.condominioSlug
                        && (request.resource.data.status == 'aprovada'
                            || (request.resource.data.motivoRejeicao is string && request.resource.data.motivoRejeicao.size() > 0))
                      )
                    );
      allow delete: if isAdmin();
    }
    match /patrimonio/{itemId} {
      allow read: if isSignedIn();
      allow create: if isSignedIn()
                    && request.resource.data.nome is string && request.resource.data.nome.size() > 0
                    && request.resource.data.codigo is string
                    && request.resource.data.criadoPorUid == request.auth.uid;
      allow update: if isSignedIn();
      allow delete: if isAdmin();
    }
    match /contadores/{contadorId} {
      allow read: if isSignedIn();
      allow write: if isSignedIn();
    }
    match /compras/{docId} {
      allow read: if isSignedIn();
      allow create: if isSignedIn()
                    && request.resource.data.item is string && request.resource.data.item.size() > 0
                    && request.resource.data.status == 'pendente'
                    && request.resource.data.solicitanteUid == request.auth.uid;
      allow update: if isAdmin();
      allow delete: if isAdmin();
    }
  }
}
```

4. Clique em **Publicar**.

> A regra de `perfis` acima é usada pelas ferramentas de aniversariantes: cada pessoa só edita o próprio perfil (data de nascimento + foto), admin pode editar qualquer um, e qualquer usuário logado pode ler (para montar o mural do mês).

> A regra de `sugestoes` acima garante: qualquer usuário logado pode criar sua própria sugestão (sempre como "aberta"); só o admin pode marcar como implantada ou excluída, e não pode alterar o texto/autor originais; marcar como excluída exige preencher o motivo (fica registrado no histórico, visível a todos). Só o admin também pode apagar uma sugestão de vez (botão "Excluir permanentemente" na ferramenta) — pensado para lixo/teste, já que isso não deixa rastro nenhum no histórico (diferente de "Marcar como excluída", que mantém o registro com o motivo).

> A regra `allow update` de `users` acima também permite que a própria pessoa atualize seu cadastro, mas só se `role`, `tabs`, `email` e `displayName` continuarem exatamente iguais — na prática isso só serve para ela marcar `mustChangePassword: false` depois de trocar a senha forçada no primeiro login (ver seção 7). Ela não consegue se autopromover a admin nem alterar suas próprias abas por essa via.

> A regra `allow create` acima é o que permite a tela de **"Cadastre-se"** do login funcionar: qualquer pessoa pode criar a própria conta, mas só com papel `membro` e zero abas — ela só ganha acesso de verdade quando um admin libera as abas pelo painel. Ninguém consegue se autopromover a admin nem se autoliberar abas por essa via, porque a regra trava os valores exatos permitidos na criação.

> **Dados cadastrais (CPF, RG, telefone, endereço, data de ingresso, departamento)**: obrigatórios desde o cadastro (`Cadastre-se aqui`), gravados direto em `users/{uid}` — como a regra de `create` só trava os campos `role`/`tabs`, os campos extras passam sem precisar de ajuste na regra. Ficam visíveis só para o próprio dono do cadastro e para admins (mesma regra de `read` de sempre). **Remuneração do contrato** é o único campo que não entra no autocadastro — só o admin preenche/edita depois, pela aba Administração > Usuários > botão **"Dados"** (mesmo princípio: `isAdmin()` já libera esse `update`, sem precisar mudar a regra).

> As regras de `conversas` / `conversas/{id}/mensagens` (usadas pela ferramenta **Chat Interno**) só deixam ler/escrever quem está no array `participantes` daquela conversa — ninguém vê conversas ou grupos dos quais não faz parte. Mensagens não podem ser editadas nem apagadas depois de enviadas (só o campo `lidaPor`, usado para o contador de não lidas, pode ser atualizado). `chatPrefs/{uid}/conversas/{conversaId}` guarda quais etiquetas e a fixação de cada conversa — é sempre pessoal, cada um só lê/escreve a própria pasta (mesmo participante veem etiquetas diferentes na mesma conversa, de propósito). `chatPrefs/{uid}/etiquetas/{etiquetaId}` é o catálogo reutilizável de etiquetas de cada pessoa (nome sempre em maiúsculas + cor), também pessoal. O chat só suporta texto e foto (fotos comprimidas no navegador, como no mural de aniversariantes) — áudio e vídeo ficaram de fora porque exigiriam ativar o Firebase Storage, que só existe no plano pago (Blaze) do Firebase; se um dia quiserem isso, é só pedir.

> As regras de `pendGrupos` e `pendTarefas` (usadas pela ferramenta **Minhas Anotações**) são 100% pessoais: `ownerUid` trava tudo, então cada pessoa só lê, cria, edita e apaga os próprios grupos e tarefas — inclusive admin não enxerga a lista de pendências de ninguém. Cada tarefa carrega o `grupoId` do grupo em que está; "mover para outro grupo" é só um `update` trocando esse campo. Apagar um grupo também remove (no próprio app, via lote/batch) todas as tarefas dele.

> A regra de `contratosGerados` (usada pela ferramenta **Contratos e Propostas**, histórico "últimos documentos gerados") é compartilhada entre toda a equipe: qualquer usuário logado lê a lista inteira (para reaproveitar contratos gerados por colegas), mas só cria registros com o próprio `criadoPorUid`. Os registros nunca são editados depois de criados (`allow update: if false`) — cada geração de PDF cria um novo documento, não atualiza um existente. Apagar é permitido para quem criou o registro ou para admin (ex.: remover um teste/engano da lista). O campo `dados` guarda o objeto inteiro do formulário (nome, CPF, valores, cláusulas preenchidas etc.) para permitir recarregar o formulário com um clique — não guarda o PDF em si, só os dados usados para gerá-lo.

> A regra de `organograma` (usada pela ferramenta **Organograma**) existe porque `users/{uid}` só pode ser lido pelo próprio dono do cadastro ou por um admin (regra `allow read` de `users` acima) — então um gestor sem papel de admin nunca conseguiria montar a lista de todo mundo direto de `users`. `organograma/{uid}` é um espelho **só com os campos não sensíveis** (`displayName`, `deptoAtual`, `dataIngresso`, `remuneracao`) que qualquer usuário logado pode ler — CPF, RG, telefone e endereço nunca são copiados para cá, continuam só em `users`. Só admin escreve (`allow write: if isAdmin()`), e a ferramenta grava nos dois lugares ao mesmo tempo (`users` e `organograma`) sempre que os 3 campos editáveis são alterados, seja pelo modal "Dados cadastrais" em Administração > Usuários, seja pelo próprio bloco do Organograma — para os dois nunca ficarem dessincronizados.

> As regras de `condoAprovadores` e `notificacoesGeradas` (usadas pela ferramenta **Condomínios**, aba "Notificações Prontas") implementam a aprovação de notificações extrajudiciais por condomínio. `condoAprovadores/{slug}` (`slug` = nome do condomínio simplificado, ex. `mirante-das-brisas`) guarda **um aprovador por condomínio** (`aprovadorUid`/`aprovadorNome`/`aprovadorEmail`) — só admin atribui (pela própria ferramenta, botão "⚙ Atribuir aprovadores"), qualquer logado lê (necessário para a tela descobrir quem é aprovador de quê). `notificacoesGeradas/{docId}` guarda cada notificação enviada pela aba "Gerar Notificação": `criadoPorUid` só pode criar com `status:'pendente'` e `tentativa:1`. `allow update` cobre exatamente dois casos: (1) o próprio criador reenviando uma notificação que **estava** `rejeitada`, sempre incrementando `tentativa` em exatamente 1 (é esse número que gera o "já rejeitada Nx antes" na tela); (2) o aprovador designado (ou admin) decidindo uma notificação `pendente`, travando que ele não altere `texto`/`criadoPorUid`/`condominioSlug` e exigindo `motivoRejeicao` preenchido sempre que a decisão for `rejeitada`. Ninguém mais pode escrever nesses documentos — nem o próprio criador altera uma notificação já aprovada. `allow read` é `isSignedIn()` simples (qualquer colaborador logado lê qualquer notificação) — mais aberto do que a leitura sempre foi para `update`/`decide`, de propósito: a partir de 2026-08-17 qualquer pessoa criando uma notificação nova precisa poder consultar o histórico de qualquer unidade (ver `unidadeResets` abaixo) para saber se ela é reincidente, mesmo sem ser aprovadora daquele condomínio nem autora das notificações antigas — só a permissão de **decidir** (aprovar/rejeitar) continua travada por `isAprovadorDoCondo`.

> `unidadeResets/{docId}` (`docId` = condomínio+torre+apto simplificados) guarda, por unidade, a partir de qual data as ocorrências antigas deixam de contar para fins de reincidência (`resetAPartirDe`, `resetPorUid`/`resetPorNome`, `resetEm`) — usado quando a unidade troca de inquilino. Qualquer logado lê (necessário tanto para o aprovador consultar quanto para quem está lançando uma notificação nova ver se a unidade é reincidente); **só admin do Portal escreve** (`allow write: if isAdmin()`), pedido explícito do usuário ("quem pode zerar tem que ser somente eu administrador geral" — na prática, qualquer conta com `role:'admin'`, não uma pessoa específica por e-mail). Zerar nunca apaga as notificações antigas — elas continuam existindo em `notificacoesGeradas` para histórico/auditoria; o reset só faz a contagem de reincidência (calculada no cliente, em `aplicarCorteReset()`) ignorar tudo com `criadoEm` anterior à data escolhida.

> As regras de `patrimonio`, `contadores` e `compras` (usadas pela ferramenta **Gestão**, sub-abas "Patrimônio" e "Controle de Compras") liberam qualquer usuário logado a cadastrar/editar itens de patrimônio e a abrir solicitações de compra, mas travam as ações financeiras/administrativas para admin. `patrimonio/{itemId}`: qualquer logado lê, cria (com `criadoPorUid` = o próprio uid, e obrigando `nome`/`codigo` preenchidos) e edita um item; só admin apaga (a ferramenta só mostra o botão "Excluir" para admin). `contadores/{contadorId}` guarda só o contador sequencial (`seq`) que gera o código de etiqueta (`PAT-0001`, `PAT-0002`, ...) via transação — qualquer logado pode incrementá-lo, já que criar um item de patrimônio depende disso. `compras/{docId}`: qualquer logado lê e cria sua própria solicitação (sempre como `status:'pendente'`, com `solicitanteUid` = o próprio uid); só admin atualiza — é o que cobre tanto aprovar/reprovar (grava `aprovadoPor`/`dataAprovacao`/`motivoReprovacao`) quanto lançar a chegada de uma compra já aprovada (grava `valorPago`/`fornecedor`/`notaFiscal`/`dataChegada`/`status:'recebido'`) — e só admin apaga.

## 4. Criar o primeiro administrador (bootstrap manual)

As regras acima só deixam criar/editar usuários se você **já** for admin — então
o primeiro precisa ser criado manualmente, direto no console:

1. Vá em **Authentication > Users > Add user**. Coloque seu e-mail e uma senha.
2. Copie o **User UID** gerado (aparece na lista de usuários).
3. Vá em **Firestore Database > Dados > Iniciar coleção**. Nome da coleção:
   `users`. ID do documento: **cole o UID copiado**. Campos do documento:
   - `email` (string) — seu e-mail
   - `displayName` (string) — seu nome
   - `role` (string) — `admin`
   - `tabs` (array) — pode deixar vazio `[]` por enquanto

Pronto — esse é o seu login de administrador. As próximas contas (para os
outros funcionários) você já cria pela tela **Administração** dentro do
próprio portal, sem precisar voltar ao console.

## 5. Adicionar as abas iniciais

Depois de logar como admin no portal, vá em **Administração > Abas** e
cadastre, por exemplo:

| Nome | URL |
|---|---|
| Painel de Notícias | `https://jowjow007.github.io/PAINEL-FB/` |
| Matriz de Demandas | `https://jowjow007.github.io/demandas-fb/` |
| Sugestões | `https://jowjow007.github.io/SISTEMA-FB/tools/sugestoes/` |
| Meu Perfil | `https://jowjow007.github.io/SISTEMA-FB/tools/perfil/` |
| Aniversariantes | `https://jowjow007.github.io/SISTEMA-FB/tools/aniversariantes/` |
| Chat Interno | `https://jowjow007.github.io/SISTEMA-FB/tools/chat/` |
| Minhas Anotações | `https://jowjow007.github.io/SISTEMA-FB/tools/minhas-anotacoes/` |
| Sistemas | `https://jowjow007.github.io/SISTEMA-FB/tools/sistemas/` |
| Organograma | `https://jowjow007.github.io/SISTEMA-FB/tools/organograma/` |
| Assistente IA | `https://jowjow007.github.io/SISTEMA-FB/tools/assistente-ia/` |

> **Aba "Organograma"**: diferente das demais, essa aba **não deve ser
> liberada para todo mundo por padrão** — cadastre-a normalmente em
> Administração > Abas, mas só marque a caixinha dela em **Editar abas**
> para os sócios/gestores que devem acompanhar o quadro de colaboradores
> (Depto, data de ingresso e remuneração). Quem não tiver a aba liberada
> simplesmente não a vê no menu lateral, como qualquer outra aba restrita.

Qualquer coisa nova que vocês pedirem para eu construir também pode entrar
aqui como uma aba nova — não precisa mexer no código do portal, só cadastrar
a URL (se for outro site) ou eu publico a ferramenta em um link e você
cadastra do mesmo jeito.

> **Aba "Sistemas"**: reúne, em sub-abas dentro de uma única aba, o acesso a
> ASTREA, E-mail, Digisac, ZapSign, Agenda (Google Calendar), BRCondos,
> AlmahCondo e os principais links de tribunais. Se o catálogo de abas ainda
> tiver "ASTREA" e/ou "E-mail" cadastrados como abas separadas de nível
> superior, exclua-os em **Administração > Abas** — eles foram incorporados
> como sub-abas dentro de "Sistemas" e ficariam duplicados se continuassem
> como abas independentes. Agenda e BRCondos abrem em nova aba do navegador
> em vez de aparecer embutidos, porque esses dois sites bloqueiam
> deliberadamente ser exibidos dentro de outra página (cabeçalho
> `X-Frame-Options`); todos os outros abrem embutidos normalmente.

> **Nota:** para uma aba abrir corretamente dentro do portal (em `<iframe>`),
> o site de destino não pode bloquear ser exibido dentro de outra página
> (cabeçalho `X-Frame-Options`/`Content-Security-Policy: frame-ancestors`).
> Sites no GitHub Pages, por padrão, não bloqueiam — então painel-tv,
> painel-recepção e a matriz devem funcionar sem ajuste nenhum.

## 6. Publicar no GitHub Pages

Igual aos outros painéis: crie um repositório novo (ex: `PORTAL-FB`) em
`github.com/jowjow007`, suba os arquivos desta pasta (`index.html`,
`firebase-config.js` — com as chaves já preenchidas) e ative o GitHub Pages
em **Settings > Pages > Branch: main / root**.

Não tem problema o `firebase-config.js` ficar público no repositório: a
`apiKey` do Firebase não é secreta, ela só identifica o projeto. Quem
protege os dados de verdade são as **regras do Firestore** do passo 3.

## 7. Gerenciar usuários no dia a dia

Tudo pela aba **Administração** do próprio portal (só admins veem essa aba):

- **Usuários**: criar conta nova (nome + e-mail + senha temporária + quais
  abas ela pode ver), editar as abas liberadas de alguém, **revogar**
  acesso (a pessoa deixa de ver qualquer aba, mas o cadastro continua
  existindo — fácil de reverter depois), ou **excluir** definitivamente
  (apaga o cadastro dela por completo — acesso, abas e perfil — e ela para
  de conseguir entrar no sistema imediatamente, mesmo digitando a senha
  certa). Em todos os casos, o *login* em si (e-mail/senha no Firebase
  Authentication) continua tecnicamente existindo — o site, sem servidor
  próprio, não tem permissão para apagar o login de outra pessoa. Para
  apagar o login por completo (não só o acesso ao portal), é preciso ir
  direto no Firebase Console, em Authentication > Users.
- **Senha provisória com troca obrigatória**: toda conta criada pelo admin
  nasce marcada para pedir troca de senha — na primeira vez que a pessoa
  logar com a senha temporária, o sistema mostra uma tela pedindo para ela
  definir uma senha só dela antes de liberar o acesso ao portal. Isso não
  se aplica a quem se cadastra sozinho pelo "Cadastre-se aqui" (ela já
  escolhe a própria senha na hora).
- **Abas**: adicionar, listar e excluir as ferramentas disponíveis no
  sistema.

## 8. Aba "E-mail" (Gmail dentro do Portal)

A ferramenta em `tools/gmail/` mostra a caixa de entrada do Gmail e permite
ler/responder/escrever e-mails sem sair do Portal. Como o Gmail **bloqueia**
ser exibido dentro de um `<iframe>` (diferente dos outros painéis), essa aba
não carrega `mail.google.com` diretamente — ela é uma telinha própria que
conversa com a **Gmail API** usando a conta Google de cada pessoa. Isso exige
uma configuração única no **Google Cloud Console**.

**Importante — projeto SEPARADO do Firebase:** a ideia original era usar o
mesmo projeto que já existe por trás do Firebase (`sistema-fb-4cce5`), mas
isso não deu certo: esse projeto pertence à conta pessoal
`jowjow07@gmail.com`, não ao domínio Workspace, então a Tela de consentimento
OAuth só oferecia o tipo **Externo** (com aviso de "app não verificado" e
limite de usuários de teste). A solução foi criar um **projeto Google Cloud
novo, separado**, chamado **`Portal FB - Gmail`**, logado com a conta
Workspace `jonathan@fonsecaebraga.com.br` — assim o projeto nasce dentro da
organização do domínio e a opção **Interno** fica disponível. O Gmail API
não depende de estar no mesmo projeto do Firebase, então isso não afeta nada
do resto do Portal. Se um dia precisar mexer nessa configuração de novo,
entre no Cloud Console **já logado com a conta `jonathan@fonsecaebraga.com.br`**
e selecione o projeto **`Portal FB - Gmail`** (não o `sistema-fb-4cce5`).

1. Acesse https://console.cloud.google.com logado com
   `jonathan@fonsecaebraga.com.br` e selecione o projeto **`Portal FB -
   Gmail`** no seletor de projetos no topo da tela.
2. Vá em **APIs e serviços > Biblioteca**, busque **"Gmail API"** e clique
   em **Ativar**.
3. Vá em **"Google Auth Platform"** (nome novo da antiga "Tela de
   consentimento OAuth") no menu lateral:
   - Em **Público-alvo**, escolha **Interno** — como o projeto pertence à
     organização do domínio Workspace `@fonsecaebraga.com.br`, isso libera
     o acesso para todo mundo do domínio sem o Google exigir um processo de
     revisão/verificação do app.
   - Preencha nome do app (ex: "Portal Fonseca e Braga — E-mail"), e-mail
     de suporte e domínio autorizado (`fonsecaebraga.com.br`).
   - Em **Escopos**, adicione `.../auth/gmail.modify` (aparece como escopo
     "restrito" — normal, é o que permite ler, marcar como lida e
     responder e-mails).
4. Vá em **"Google Auth Platform" > Clientes** (ou **APIs e serviços >
   Credenciais > Criar credenciais > ID do cliente OAuth**, é a mesma
   coisa em outro menu) > **Criar cliente**:
   - Tipo de aplicativo: **Aplicativo da Web**.
   - Nome: `Portal FB - Gmail` (só identificação interna, não aparece
     para os usuários).
   - Em **Origens JavaScript autorizadas**, adicione os endereços onde o
     Portal roda: `https://portal.fonsecaebraga.com.br` e
     `https://jowjow007.github.io`.
   - Não precisa preencher URI de redirecionamento (o login usa o fluxo
     "token" do Google, tudo pelo navegador, sem voltar para nenhuma URL
     específica).
   - Clique em **Criar** e copie o **Client ID** gerado (algo como
     `123456-abc.apps.googleusercontent.com`). Ele não é secreto — pode
     ficar público no repositório, igual a `apiKey` do Firebase.
5. Cole o Client ID em [`tools/gmail/google-config.js`](tools/gmail/google-config.js),
   no lugar de `COLE_AQUI_SEU_CLIENT_ID...`.
6. Se em algum momento a equipe ver um aviso de que o app foi **bloqueado
   pelo administrador** ao tentar conectar: um admin do Google Workspace
   precisa ir em **admin.google.com > Segurança > Controles de API >
   Acesso de apps de terceiros**, encontrar "Portal Fonseca e Braga — E-mail"
   e marcá-lo como **Confiável** — é uma trava separada que o Workspace
   coloca em cima de qualquer app novo que peça acesso a dados sensíveis
   (como e-mail), independente da tela de consentimento OAuth configurada
   acima.
7. Cadastre a aba **E-mail** em **Administração > Abas**, como na tabela do
   passo 5, apontando para `tools/gmail/`.

**O que a ferramenta faz e não faz:** tem uma coluna de pastas à esquerda —
Caixa de entrada, Marcados, Enviados, Rascunhos, Spam, Lixeira e "Todos os
e-mails", mais as categorias do Gmail (Principal/Social/Promoções/
Atualizações/Fóruns, se a conta tiver categorização ativa) e as etiquetas
personalizadas da conta (com a cor de cada uma) — clicar em qualquer uma
recarrega a lista filtrada por aquele rótulo. Também mostra, em cada
e-mail da lista, as etiquetas personalizadas aplicadas a ele. Dentro de
uma mensagem aberta dá para: marcar/desmarcar com estrela, arquivar,
excluir (manda pra Lixeira, reversível) ou restaurar (se já estiver na
Lixeira), marcar/desmarcar como spam, e adicionar/remover etiquetas
existentes (não cria etiqueta nova pela ferramenta — isso ainda precisa
ser feito no Gmail de verdade). O corpo do e-mail abre dentro de um
`<iframe>` travado (sem rodar scripts nem abrir pop-ups do conteúdo do
e-mail, por segurança) e marca como lida automaticamente ao abrir.
Responder mantém a mesma conversa no Gmail; responder ou escrever um
e-mail novo é sempre em texto simples, sem formatação rica nem anexos por
enquanto. Rascunhos abrem só para leitura (editar de verdade um rascunho
ainda precisa ser feito no Gmail). Cada pessoa conecta a própria conta
Google (o token de acesso fica só na memória da aba, não é salvo em lugar
nenhum) — quando expira (cerca de 1h), a ferramenta tenta renovar sozinha
em segundo plano; se não conseguir, pede para clicar em "Conectar com
Google" de novo.

## 9. Aba "Assistente IA" (chat livre com o Gemini)

A ferramenta em `tools/assistente-ia/` é um chat livre estilo ChatGPT,
usando a **API do Google Gemini**, com um botão opcional de **busca no
Google** (útil para jurisprudência, notícias, qualquer coisa que precise
de informação atual/verificável em vez do modelo "lembrar de cabeça" —
IA sem busca pode inventar número de acórdão que não existe). Não tem
acesso a nenhum dado do Portal (processos, contratos, clientes) — é só um
assistente de propósito geral embutido no sistema.

**A cota realmente gratuita é pequena demais para uso real do escritório**
(testado na prática: só 20 mensagens por dia no total, para todo mundo,
no nível sem faturamento) — e a busca do Google nem funciona sem
faturamento ativado. Por isso o passo a passo abaixo já inclui ativar
faturamento no projeto do Google Cloud (custo baixo, ~US$1,50 por milhão
de tokens de entrada / US$9 por milhão de saída no `gemini-3.5-flash`) **e**
um limite diário configurado no próprio Worker (independente do Google,
nunca deixa passar de um teto fixo de mensagens/dia) como rede de
segurança contra gasto inesperado.

**Importante — mudou desde que o Gmail foi configurado**: as chaves novas
que o Google AI Studio cria hoje vêm obrigatoriamente "vinculadas a uma
conta de serviço", e esse tipo de chave **só aceita autenticação OAuth2 de
verdade** (testado na prática: chamar a API com o formato simples `?key=`
retorna erro 401 "Expected OAuth 2 access token"). Além disso o GitHub
bloqueia automaticamente qualquer push que contenha esse tipo de chave em
texto puro (diferente da `apiKey` do Firebase ou do Client ID do Gmail,
que são seguros para ficar públicos). Por isso a autenticação do Gemini
**não fica em nenhum arquivo deste repositório** — ela mora só dentro de
um **Cloudflare Worker** (gratuito, sem cartão de crédito exigido no
plano free), que funciona como um pequeno intermediário: o navegador de
cada pessoa fala só com o Worker (endereço público, sem segredo nenhum),
e é o Worker — rodando no servidor da Cloudflare, nunca no navegador —
quem assina um token OAuth2 com a chave privada da conta de serviço e
conversa com o Gemini.

1. Acesse https://aistudio.google.com/apikey (pode logar com a mesma conta
   Google usada no Firebase) e clique em **"Create API key"** para gerar
   uma chave nova, escolhendo o projeto `SISTEMA-FB` (`sistema-fb-4cce5`).
   Isso cria automaticamente uma **conta de serviço** dedicada (algo como
   `ais-gemini-key-XXXX@...iam.gserviceaccount.com`) e ativa a Generative
   Language API no projeto — é dela que precisamos, não da chave em si
   (a chave simples gerada aqui não é usada em lugar nenhum).
2. No [Google Cloud Console](https://console.cloud.google.com/iam-admin/serviceaccounts),
   no mesmo projeto, clique na conta de serviço criada no passo 1 → aba
   **"Chaves"** → **"Adicionar chave" → "Criar nova chave"** → formato
   **JSON** → **Criar**. Isso baixa um arquivo `.json` para o computador
   — ele contém duas informações que vamos usar: `client_email` e
   `private_key`. **Guarde esse arquivo com cuidado e não o suba para
   nenhum repositório** — quem tiver esse arquivo consegue se autenticar
   como essa conta de serviço.
3. Acesse https://dash.cloudflare.com e crie uma conta gratuita (só
   e-mail + senha, sem cartão).
4. No menu lateral, vá em **Compute > Workers & Pages > Create
   application**, escolha **"Start with Hello World!"**, dê um nome (ex:
   `portal-fb-gemini`) e clique em **"Deploy"**.
5. Clique em **"Edit code"**, apague todo o conteúdo e cole o código de
   [`tools/assistente-ia/worker.js`](tools/assistente-ia/worker.js) deste
   repositório. Clique em **"Deploy"**.
6. Volte para a página do Worker → aba **"Settings" → "Variables and
   secrets"**:
   - Adicione **`GOOGLE_SA_EMAIL`** (tipo **Secret**) = o valor de
     `client_email` do JSON baixado no passo 2 (algo como
     `ais-gemini-key-...@sistema-fb-4cce5.iam.gserviceaccount.com`).
   - Adicione **`GOOGLE_SA_PRIVATE_KEY`** (tipo **Secret**) = o valor de
     `private_key` do mesmo JSON, **completo**, incluindo as linhas
     `-----BEGIN PRIVATE KEY-----` e `-----END PRIVATE KEY-----` — copie
     só o conteúdo entre as aspas do JSON, sem incluir as aspas nem a
     vírgula do final (é o erro mais fácil de cometer aqui).
   - Opcional: adicione **`GEMINI_MODEL`** (tipo **Text**, não Secret) com
     o modelo desejado — em agosto de 2026 o recomendado é
     `gemini-3.5-flash` (o `gemini-2.5-flash` antigo parou de aceitar
     usuários novos). Sem essa variável, o Worker usa `gemini-3.5-flash`
     por padrão. Vale conferir de tempos em tempos em
     https://ai.google.dev/gemini-api/docs/models se saiu um modelo mais
     novo/melhor.
7. **Passo fácil de esquecer**: adicionar as variáveis cria uma *nova
   versão* do Worker, mas não promove ela automaticamente para receber
   tráfego. Vá na aba **"Deployments"** e confira se a versão mais recente
   da "Version History" é a mesma que aparece em "Active deployment" (com
   100% de tráfego) — se não for, clique nos **"..."** da versão mais nova
   e promova/publique ela.
8. **Ativar faturamento** (necessário — sem isso o limite fica em 20
   mensagens/dia e a busca do Google não funciona): no
   [Google AI Studio](https://aistudio.google.com/apikey), botão
   **"Configurar faturamento"** no topo da tela de "Limite de taxa", ou
   direto em https://console.cloud.google.com/billing — vincule um cartão
   ao projeto `SISTEMA-FB`. Recomendado criar também um **orçamento com
   alerta** (Faturamento > Orçamentos e alertas > Criar orçamento, ex:
   avisar em US$10/mês) — é só um aviso por e-mail, não trava o gasto
   sozinho (por isso o limite diário do passo 9 é a proteção de verdade).
9. **Limite diário próprio, independente do Google** — cria um "cofrinho"
   (KV Namespace) para o Worker contar quantas mensagens já saíram hoje:
   - No Cloudflare, vá em **Compute > Workers & Pages > KV** (menu
     lateral) → **"Create namespace"** → nome ex. `assistente-ia-usage`
     → Criar.
   - Volte no Worker `portal-fb-gemini` → **Settings > Bindings** → **Add
     binding** → tipo **KV Namespace** → **Variable name** (tem que ser
     exatamente) `USAGE_KV` → selecione o namespace criado → Salvar.
   - Opcional: em **Settings > Variables and secrets**, adicione
     **`DAILY_LIMIT`** (tipo **Text**) com o teto desejado de mensagens
     por dia para o escritório inteiro (padrão sem essa variável: `200`).
   - Confirme de novo em **Deployments** que a versão mais nova está ativa
     (mesmo aviso do passo 7).
10. Copie a URL pública do Worker (aparece no topo da página dele, algo
    como `https://portal-fb-gemini.SEU-USUARIO.workers.dev`) e cole em
    [`tools/assistente-ia/gemini-config.js`](tools/assistente-ia/gemini-config.js),
    no lugar de `COLE_AQUI_A_URL_DO_SEU_WORKER`.
11. Cadastre a aba **Assistente IA** em **Administração > Abas**, como na
    tabela do passo 5, apontando para `tools/assistente-ia/`.

**Botão de busca na internet**: dentro do chat, acima da caixa de
mensagem, tem um interruptor "🔎 Pesquisar na internet" — desligado por
padrão (fica salvo por navegador). Quando ligado, cada resposta pode
trazer uma lista de links das fontes reais usadas (aparecem como
"chips" clicáveis embaixo da mensagem) e o assistente é instruído a nunca
inventar jurisprudência, sempre dizendo quando não encontrou nada em vez
de supor. **Ainda assim é IA — sempre confira a fonte antes de citar
algo em uma petição**, o aviso fica visível na tela sempre que a busca
está ligada.

**Testando o Worker sem precisar abrir o Portal** (útil para depurar):

```
curl -s -X POST "https://portal-fb-gemini.SEU-USUARIO.workers.dev" \
  -H "Origin: https://jowjow007.github.io" \
  -H "Content-Type: application/json" \
  -d '{"contents":[{"role":"user","parts":[{"text":"oi"}]}]}'
```

Uma resposta com `"candidates"` significa que está tudo funcionando. Erros
comuns e o que significam:
- `"Credenciais da conta de serviço não configuradas"` → a versão ativa do
  Worker não tem as duas Secrets do passo 6 (veja o passo 7).
- `401 ... Expected OAuth 2 access token` → algo está chamando a API com
  `?key=` em vez de OAuth2 (não deveria acontecer com o `worker.js` atual).
- `403 ... insufficient authentication scopes` → o `scope` usado ao gerar
  o token está errado (tem que ser
  `https://www.googleapis.com/auth/generative-language`, já configurado
  no `worker.js`).
- `404 ... model ... no longer available` → o nome do modelo em
  `GEMINI_MODEL` (ou o padrão no código) ficou desatualizado — veja o
  passo 6.
- `"O Assistente IA atingiu o limite diário..."` → o teto do `DAILY_LIMIT`
  (passo 9) foi atingido — some sozinho à meia-noite UTC, ou aumenta o
  valor da variável se for baixo demais para o dia a dia.
- `429 ... RESOURCE_EXHAUSTED` vindo do Google (não do Worker) → cota do
  Google esgotada — sem faturamento ativado (passo 8) isso acontece muito
  rápido (20/dia); com faturamento ativado, confira o painel "Limite de
  taxa" no AI Studio para ver o teto atual.

O Worker já vem configurado para só aceitar pedidos vindos dos domínios do
Portal (`portal.fonsecaebraga.com.br` e `jowjow007.github.io`) — qualquer
outro site que tentar usá-lo é recusado. Se um dia o domínio do Portal
mudar, é só editar a lista `ALLOWED_ORIGINS` no topo do `worker.js` (tanto
aqui no repositório quanto colando o código atualizado no editor do
Worker) e reimplantar.

**O que a ferramenta faz e não faz:** conversa livre, com histórico
guardado só no navegador de cada pessoa (`localStorage`, não vai para o
Firestore) — trocar de computador ou limpar os dados do navegador reinicia
a conversa. Não lê nem grava nada do Portal. Como as mensagens saem do
Portal e são processadas pelo Google, a própria tela mostra um aviso para
não colar dados sigilosos de clientes (CPF, número de processo, teor de
contratos) no chat — é só um assistente de uso geral, não uma ferramenta
de trabalho com os dados do escritório.

## 10. Exclusão definitiva de usuário (Auth + Firestore)

**O problema que isto resolve**: no botão "Excluir" da tabela de usuários
(Administração > Usuários), o app apagava só o cadastro dentro do Portal
(Firestore) — a pessoa parava de conseguir entrar, mas o **login** dela
(e-mail/senha) continuava existindo escondido dentro do Firebase
Authentication. Resultado: se ela tentasse se cadastrar de novo com o
mesmo e-mail, o sistema recusava dizendo que o e-mail já estava em uso,
mesmo sem aparecer em lugar nenhum da tela de Administração. Isso já
aconteceu na prática (e-mail `hecy.braga@fonsecaebraga.com.br` — corrigido
manualmente apagando o login em Firebase Console > Authentication > Users
enquanto este Worker não estava configurado).

**Por que não dá para simplesmente apagar o login pelo navegador**: o SDK
do Firebase usado no resto do Portal só consegue apagar a conta de login
da **própria pessoa logada** — nunca a de outra pessoa, por desenho de
segurança do Firebase, sem contorno possível só no navegador. Apagar o
login de outra pessoa exige uma "conta de serviço" com permissão de
administrador do projeto, e esse tipo de credencial não pode ficar em
nenhum arquivo público deste repositório — por isso ela mora dentro de
outro **Cloudflare Worker** (mesma técnica gratuita já usada na seção 9,
Worker separado e com credencial própria, para não misturar a permissão
"apagar contas de login" com a do Assistente IA).

**Enquanto este Worker não estiver configurado**, o botão "Excluir" continua
funcionando como antes (só limpa o cadastro no Portal) e mostra um aviso
na confirmação lembrando que o login precisa ser apagado manualmente em
Firebase Console > Authentication > Users. Depois de configurado, o botão
passa a apagar tudo de uma vez automaticamente.

1. No [Google Cloud Console](https://console.cloud.google.com/iam-admin/serviceaccounts),
   confira que está no projeto `SISTEMA-FB` (`sistema-fb-4cce5`) — o mesmo
   do Firebase — e clique em **"Criar conta de serviço"**.
2. Dê um nome, ex: `portal-fb-admin` → **"Criar e continuar"**.
3. Em **"Conceder a esta conta de serviço acesso ao projeto"**, adicione
   **dois** papéis (um de cada vez, botão "Adicionar outro papel"):
   - **Firebase Authentication Admin** (apagar o login de um usuário)
   - **Cloud Datastore User** (ler/apagar documentos no Firestore)

   Não conceda mais nada além disso — é só o suficiente para esta tarefa.
4. **"Concluído"**. Na lista de contas de serviço, clique na que acabou de
   criar → aba **"Chaves"** → **"Adicionar chave" → "Criar nova chave"** →
   formato **JSON** → **Criar**. Isso baixa um arquivo `.json` — guarde com
   cuidado e não suba para nenhum repositório (contém `client_email` e
   `private_key`, que vamos usar a seguir).
5. Em https://dash.cloudflare.com (mesma conta já usada na seção 9), vá em
   **Compute > Workers & Pages > Create application** → **"Start with
   Hello World!"** → nome ex. `portal-fb-admin` → **"Deploy"**.
6. Clique em **"Edit code"**, apague todo o conteúdo e cole o código de
   [`admin-worker.js`](admin-worker.js) deste repositório. Clique em
   **"Deploy"**.
7. Volte para a página do Worker → aba **"Settings" → "Variables and
   secrets"**:
   - Adicione **`ADMIN_SA_EMAIL`** (tipo **Secret**) = o valor de
     `client_email` do JSON baixado no passo 4.
   - Adicione **`ADMIN_SA_PRIVATE_KEY`** (tipo **Secret**) = o valor de
     `private_key` do mesmo JSON, **completo**, incluindo as linhas
     `-----BEGIN PRIVATE KEY-----` e `-----END PRIVATE KEY-----` — copie
     só o conteúdo entre as aspas do JSON, sem incluir as aspas nem a
     vírgula do final.
   - Adicione **`FIREBASE_PROJECT_ID`** (tipo **Text**, não Secret) =
     `sistema-fb-4cce5`.
8. **Passo fácil de esquecer** (mesmo aviso da seção 9): adicionar as
   variáveis cria uma *nova versão* do Worker, mas não promove ela
   automaticamente. Vá na aba **"Deployments"** e confira se a versão mais
   recente está mesmo em **"Active deployment"** (100% do tráfego) — se
   não estiver, promova/publique ela.
9. Copie a URL pública do Worker (topo da página, algo como
   `https://portal-fb-admin.SEU-USUARIO.workers.dev`) e cole em
   [`admin-config.js`](admin-config.js), no lugar de
   `COLE_AQUI_A_URL_DO_SEU_WORKER`. A partir daqui o botão "Excluir" já
   passa a apagar o login de verdade — não precisa cadastrar nada em
   Administração > Abas, isso é só usado internamente pelo próprio botão.

**Correção manual imediata (uma vez só, antes do Worker acima existir)**:
qualquer e-mail já preso nessa situação (o login existe, mas o cadastro no
Portal já foi apagado) precisa ser liberado manualmente: Firebase Console
→ projeto `SISTEMA-FB` → **Authentication → Users**, encontre o e-mail na
lista, menu **⋮** na linha dele → **"Excluir conta"**. Depois disso a
pessoa consegue se cadastrar de novo normalmente.

**O que o Worker verifica antes de apagar qualquer coisa**: confirma que
quem está pedindo a exclusão está mesmo logado no Portal agora (verifica a
assinatura do token de sessão do Firebase) e que essa pessoa tem
`role: "admin"` no Firestore — qualquer outro caso é recusado. Também
recusa se o admin tentar se auto-excluir por esse caminho. Apaga, nessa
ordem: o login (Firebase Authentication) e os documentos `users/{uid}`,
`perfis/{uid}` e `organograma/{uid}` da pessoa alvo. Dados pessoais sem
relação com o cadastro em si (tags de conversa no Chat Interno, anotações
pessoais em "Minhas Anotações") não são apagados por este Worker — ficam
órfãos mas inofensivos, sem ninguém mais conseguindo lê-los; se um dia
quiserem uma limpeza completa disso também, é só pedir.
