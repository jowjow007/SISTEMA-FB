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
  }
}
```

4. Clique em **Publicar**.

> A regra de `perfis` acima é usada pelas ferramentas de aniversariantes: cada pessoa só edita o próprio perfil (data de nascimento + foto), admin pode editar qualquer um, e qualquer usuário logado pode ler (para montar o mural do mês).

> A regra de `sugestoes` acima garante: qualquer usuário logado pode criar sua própria sugestão (sempre como "aberta"); só o admin pode marcar como implantada ou excluída, e não pode alterar o texto/autor originais; marcar como excluída exige preencher o motivo (fica registrado no histórico, visível a todos). Só o admin também pode apagar uma sugestão de vez (botão "Excluir permanentemente" na ferramenta) — pensado para lixo/teste, já que isso não deixa rastro nenhum no histórico (diferente de "Marcar como excluída", que mantém o registro com o motivo).

> A regra `allow update` de `users` acima também permite que a própria pessoa atualize seu cadastro, mas só se `role`, `tabs`, `email` e `displayName` continuarem exatamente iguais — na prática isso só serve para ela marcar `mustChangePassword: false` depois de trocar a senha forçada no primeiro login (ver seção 7). Ela não consegue se autopromover a admin nem alterar suas próprias abas por essa via.

> A regra `allow create` acima é o que permite a tela de **"Cadastre-se"** do login funcionar: qualquer pessoa pode criar a própria conta, mas só com papel `membro` e zero abas — ela só ganha acesso de verdade quando um admin libera as abas pelo painel. Ninguém consegue se autopromover a admin nem se autoliberar abas por essa via, porque a regra trava os valores exatos permitidos na criação.

> As regras de `conversas` / `conversas/{id}/mensagens` (usadas pela ferramenta **Chat Interno**) só deixam ler/escrever quem está no array `participantes` daquela conversa — ninguém vê conversas ou grupos dos quais não faz parte. Mensagens não podem ser editadas nem apagadas depois de enviadas (só o campo `lidaPor`, usado para o contador de não lidas, pode ser atualizado). `chatPrefs/{uid}/conversas/{conversaId}` guarda quais etiquetas e a fixação de cada conversa — é sempre pessoal, cada um só lê/escreve a própria pasta (mesmo participante veem etiquetas diferentes na mesma conversa, de propósito). `chatPrefs/{uid}/etiquetas/{etiquetaId}` é o catálogo reutilizável de etiquetas de cada pessoa (nome sempre em maiúsculas + cor), também pessoal. O chat só suporta texto e foto (fotos comprimidas no navegador, como no mural de aniversariantes) — áudio e vídeo ficaram de fora porque exigiriam ativar o Firebase Storage, que só existe no plano pago (Blaze) do Firebase; se um dia quiserem isso, é só pedir.

> As regras de `pendGrupos` e `pendTarefas` (usadas pela ferramenta **Minhas Anotações**) são 100% pessoais: `ownerUid` trava tudo, então cada pessoa só lê, cria, edita e apaga os próprios grupos e tarefas — inclusive admin não enxerga a lista de pendências de ninguém. Cada tarefa carrega o `grupoId` do grupo em que está; "mover para outro grupo" é só um `update` trocando esse campo. Apagar um grupo também remove (no próprio app, via lote/batch) todas as tarefas dele.

> A regra de `contratosGerados` (usada pela ferramenta **Contratos e Propostas**, histórico "últimos documentos gerados") é compartilhada entre toda a equipe: qualquer usuário logado lê a lista inteira (para reaproveitar contratos gerados por colegas), mas só cria registros com o próprio `criadoPorUid`. Os registros nunca são editados depois de criados (`allow update: if false`) — cada geração de PDF cria um novo documento, não atualiza um existente. Apagar é permitido para quem criou o registro ou para admin (ex.: remover um teste/engano da lista). O campo `dados` guarda o objeto inteiro do formulário (nome, CPF, valores, cláusulas preenchidas etc.) para permitir recarregar o formulário com um clique — não guarda o PDF em si, só os dados usados para gerá-lo.

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
| E-mail | `https://jowjow007.github.io/SISTEMA-FB/tools/gmail/` (precisa da configuração extra na seção 8 antes de funcionar) |

Qualquer coisa nova que vocês pedirem para eu construir também pode entrar
aqui como uma aba nova — não precisa mexer no código do portal, só cadastrar
a URL (se for outro site) ou eu publico a ferramenta em um link e você
cadastra do mesmo jeito.

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
