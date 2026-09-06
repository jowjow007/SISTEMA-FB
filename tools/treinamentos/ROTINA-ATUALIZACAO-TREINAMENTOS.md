# Rotina de atualização — Treinamentos

Fluxo manual, igual ao dos POPs: quando quiser adicionar um vídeo ou
documento novo, mande numa conversa com o Claude.

## Adicionar um vídeo

1. Suba o vídeo no YouTube (pode ser "não listado") ou no Google Drive
   (com o link de compartilhamento aberto para "qualquer pessoa com o
   link") e me envie o link, o título e (opcional) uma descrição curta
   e uma categoria.
2. Eu adiciono uma entrada no array `VIDEOS` em
   `tools/treinamentos/index.html`:
   ```js
   { titulo: 'Nome do vídeo', descricao: 'Descrição curta', categoria: 'Categoria', url: 'https://...' }
   ```
3. Commit e push do repositório `portal-fb` (branch `main`).
4. Publica em ~1 minuto em
   `https://jowjow007.github.io/SISTEMA-FB/tools/treinamentos/index.html`.

Não precisa de upload nenhum dentro do sistema — o vídeo continua
hospedado no YouTube/Drive, o Treinamentos só embute o player. Isso
mantém o Firebase no plano gratuito (Spark), sem custo.

## Adicionar um documento

1. Mande o arquivo (PDF, manual, apostila) numa conversa com o Claude,
   com o título e (opcional) descrição/categoria.
2. Eu copio o arquivo para `tools/treinamentos/docs/` com um nome
   simples (sem espaços/acentos), ex: `manual-atendimento-cliente.pdf`.
3. Adiciono uma entrada no array `DOCS` em
   `tools/treinamentos/index.html`:
   ```js
   { titulo: 'Nome do documento', descricao: 'Descrição curta', categoria: 'Categoria', arquivo: 'nome-do-arquivo.pdf' }
   ```
4. Commit e push do repositório `portal-fb` (branch `main`).

**Atenção:** o repositório `SISTEMA-FB` é público (exigência do GitHub
Pages no plano gratuito). O login do Portal protege a navegação pelo
app, mas qualquer arquivo dentro do repositório — inclusive estes
documentos — fica acessível por link direto, sem exigir login. Evite
subir documentos com dados de cliente ou credenciais reais.

## Sub-aba "Trilha do FBzinho" (o game 3D)

A primeira sub-aba de Treinamentos é a **Trilha do FBzinho**: um jogo 3D em que
o colaborador anda com o **FBzinho** (um advogado de toga) pelo mapa, em 3ª
pessoa, com as **setas do teclado**. Cada **prédio** é uma parada — ele entra
(tecla **E**), o FBzinho ensina o assunto (diálogo com efeito de máquina de
escrever) e faz um quiz. Ao concluir todos os prédios o colaborador libera um
**diploma de integração** (imprimível/PDF) e passa a aparecer como "Concluída"
no **painel de progresso** (botão "📊 Gestor", visível só para `admin`/`gestor`
dentro do próprio jogo). O painel também mostra quantos Easter eggs cada um
achou.

É um jogo **3D** (Three.js): o colaborador anda com o FBzinho — um advogado de
toga — pelas **setas do teclado**, em 3ª pessoa, e visita 10 **prédios** (um por
parada). Chega perto de um prédio liberado, aperta **E** e abre a lição + quiz.
Espalhados pelo mapa há **Easter eggs** (objetos que brilham/giram) com
curiosidades sobre advocacia, tribunais e o CPC — encostar neles coleciona.

- **Só funciona no computador.** No celular aparece um aviso "abra no computador"
  (o jogo é controlado por teclado). É de propósito.
- **Three.js** carrega de `cdnjs.cloudflare.com` (igual o Firebase carrega de
  `gstatic.com`). GitHub Pages não tem CSP, então funciona. Se o 3D não abrir,
  o jogo mostra uma tela de erro amigável em vez de quebrar.
- É um único arquivo estático (`tools/treinamentos/jogo/index.html`). Mundo,
  prédios, FBzinho e eggs são todos geometria criada por código, sem imagens.
- Paleta própria, sempre colorida — **não** segue o tema claro/escuro do Portal.

- **Onde fica o conteúdo:** tudo está no array `CONTEUDO`, no topo do
  `<script>` de `tools/treinamentos/jogo/index.html`. Cada fase tem `id`,
  `emoji`, `cor`, `titulo`, `curto` (rótulo no prédio), `resumo`, `licao`
  (blocos `{h}`/`{p}`/`{ul}`/`{callout}`) e `quiz` (`{q, opcoes, correta,
  explica}`). Comentário no próprio arquivo explica o formato.
- **Easter eggs:** array `EASTER_EGGS` logo abaixo de `CONTEUDO` — cada um tem
  `id` (estável), `kind` (forma 3D), `cor`, `x`/`z` (posição no mapa),
  `titulo` e `texto`. Para acrescentar/editar curiosidades, mexa só nesse array.
- **Para editar uma fase / trocar textos / ajustar perguntas:** mande o que
  quer mudar numa conversa, ou edite direto o array. É só HTML/JS estático —
  commit + push e publica sozinho.
- **Nunca renomeie o `id` de uma fase** depois que houver gente com progresso
  salvo: o progresso de cada pessoa é gravado por `id` de fase em
  `treinamentoProgresso/{uid}` no Firestore. Renomear o `id` faz a fase
  parecer "não concluída" para quem já passou. Adicionar fases novas no fim
  é seguro (elas entram como bloqueadas até a anterior ser concluída).
- **Dados entre `[colchetes]` no conteúdo** são fatos do escritório que
  ainda precisam ser confirmados (endereço, horário, lista real de setores,
  prazos de SLA, prazo de retorno ao cliente etc.) — troque pelo texto real.
- **Regras do Firestore:** a coleção `treinamentoProgresso` precisa das regras
  que estão em `README-SETUP.md`. Se a Trilha não salvar progresso
  (erro de permissão no console), é sinal de que as regras não foram
  publicadas ainda no Firebase Console.

## Sub-aba de POPs

A sub-aba "POPs" dentro de Treinamentos apenas embute a ferramenta que
já existe em `tools/pop/`. Para adicionar/revisar um POP, siga a
rotina própria em `tools/pop/ROTINA-ATUALIZACAO-POPS.md` — não precisa
mexer em nada dentro de `tools/treinamentos/`.
