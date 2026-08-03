# Portal Fonseca e Braga — guia de configuração

Site estático (funciona no GitHub Pages, igual ao painel-tv e ao painel-recepção),
com login de verdade via **Firebase Authentication** e controle de quais abas cada
pessoa vê, guardado no **Firestore**. Não precisa manter servidor nenhum — tudo
roda no navegador, o Firebase (gratuito no plano Spark) cuida das senhas.

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
      allow update, delete: if isAdmin();
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
  }
}
```

4. Clique em **Publicar**.

> A regra de `perfis` acima é usada pelas ferramentas de aniversariantes: cada pessoa só edita o próprio perfil (data de nascimento + foto), admin pode editar qualquer um, e qualquer usuário logado pode ler (para montar o mural do mês).

> A regra de `sugestoes` acima garante: qualquer usuário logado pode criar sua própria sugestão (sempre como "aberta"); só o admin pode marcar como implantada ou excluída, e não pode alterar o texto/autor originais; marcar como excluída exige preencher o motivo (fica registrado no histórico, visível a todos). Só o admin também pode apagar uma sugestão de vez (botão "Excluir permanentemente" na ferramenta) — pensado para lixo/teste, já que isso não deixa rastro nenhum no histórico (diferente de "Marcar como excluída", que mantém o registro com o motivo).

> A regra `allow create` acima é o que permite a tela de **"Cadastre-se"** do login funcionar: qualquer pessoa pode criar a própria conta, mas só com papel `membro` e zero abas — ela só ganha acesso de verdade quando um admin libera as abas pelo painel. Ninguém consegue se autopromover a admin nem se autoliberar abas por essa via, porque a regra trava os valores exatos permitidos na criação.

> As regras de `conversas` / `conversas/{id}/mensagens` (usadas pela ferramenta **Chat Interno**) só deixam ler/escrever quem está no array `participantes` daquela conversa — ninguém vê conversas ou grupos dos quais não faz parte. Mensagens não podem ser editadas nem apagadas depois de enviadas (só o campo `lidaPor`, usado para o contador de não lidas, pode ser atualizado). `chatPrefs/{uid}/conversas/{conversaId}` guarda quais etiquetas e a fixação de cada conversa — é sempre pessoal, cada um só lê/escreve a própria pasta (mesmo participante veem etiquetas diferentes na mesma conversa, de propósito). `chatPrefs/{uid}/etiquetas/{etiquetaId}` é o catálogo reutilizável de etiquetas de cada pessoa (nome sempre em maiúsculas + cor), também pessoal. O chat só suporta texto e foto (fotos comprimidas no navegador, como no mural de aniversariantes) — áudio e vídeo ficaram de fora porque exigiriam ativar o Firebase Storage, que só existe no plano pago (Blaze) do Firebase; se um dia quiserem isso, é só pedir.

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
  abas ela pode ver), editar as abas liberadas de alguém, ou **revogar**
  acesso (a pessoa deixa de ver qualquer aba, mas a conta de login continua
  existindo — se quiser apagar a conta de login por completo, isso só dá
  para fazer direto no Firebase Console, em Authentication > Users, porque
  o site (sem servidor próprio) não tem permissão para apagar contas de
  outras pessoas).
- **Abas**: adicionar, listar e excluir as ferramentas disponíveis no
  sistema.
