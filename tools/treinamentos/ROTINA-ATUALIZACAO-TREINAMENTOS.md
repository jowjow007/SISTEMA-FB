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

## Sub-aba "Comarca do FBzinho" (o game)

A primeira sub-aba de Treinamentos é a **Comarca do FBzinho**: um jogo **2D
top-down** de exploração / simulação (estilo farming/life sim), tema
jurídico, com o **treinamento embutido**. O colaborador anda com o
**FBzinho** (um advogado) pela comarca com **WASD / setas**, visita os
prédios e faz as **10 aulas** (marcadores ⚖️ que brilham). Concluir as 10
libera o **Diploma de Integração** (imprimível/PDF); o **painel do gestor**
(botão "📊 Gestor", `admin`/`gestor`) mostra aulas concluídas, pontos e
Easter eggs de cada um.

**Visual em pixel art original**, no espírito acolhedor/colorido de jogos
como Stardew Valley — mas **desenhado do zero por código** (nenhum asset de
jogo comercial foi copiado; usar assets de terceiros sem licença seria
violação de direitos autorais). O chão é pré-renderizado uma vez por mapa
(`prerenderTerreno()`) com manchas orgânicas, tufos de grama, flores e
(na praça) lajes de pedra — bem mais rico que um chão xadrez liso. Prédios
têm textura de tábuas, telhado com sombra e linhas de telha, chaminé com
fumaça, janelas com caixilho e floreira. Personagens (`drawPessoa()`) são
maiores e sombreados (luz/sombra por lado). Árvores têm 3 variações de copa
(uma com frutinhas vermelhas). Água tem ondulação + brilho cintilante.

**Só funciona no computador** (teclado) — no celular aparece um aviso.
Sem bibliotecas externas: dois arquivos estáticos —
`tools/treinamentos/jogo/index.html` (casca + HUD + CSS) e
`tools/treinamentos/jogo/game.js` (todo o jogo, arte incluída). Salva em
`treinamentoProgresso/{uid}`: `concluidas`/`pontosTotais`/`easterEggs` no
nível de cima (o painel do gestor lê daí) + `jogoEstado` com o estado do
jogo (dia, dinheiro, foco, inventário, lavoura, amizades, posição).
Fallback em `localStorage` quando offline. **Nenhuma regra nova de
Firestore.**

- **Conteúdo das aulas:** array `AULAS` no topo de `game.js`. Cada aula tem
  `id` (estável — NÃO renomear), `emoji`, `titulo`, `curto`, `local:{mapa,tx,ty}`
  (onde fica o marcador), `licao` (blocos `{h}`/`{p}`/`{ul}`/`{callout}`) e
  `quiz` (`{q,opcoes,correta,explica}`). Passa quem acerta ≥ 70%.
- **Easter eggs:** array `EGGS` — `{id, mapa, tx, ty, k (forma), cor, titulo, texto}`.
- **Para ajustar o visual:** as funções de desenho ficam todas juntas —
  `prerenderTerreno`/`desenhaAgua` (chão e água), `drawPessoa`/`sprHeroi`/
  `sprNPC` (personagens), `drawPredio` (prédios), `drawArvore`, `drawProp`
  (móveis/objetos), `drawPlanta` (lavoura), `drawEgg`, `drawMarcador`. Os
  helpers `shade(hex,fator)` e `mix(hexA,hexB,t)` clareiam/escurecem/misturam
  cores para sombreado rápido.
- **Dados entre `[colchetes]` no conteúdo** são fatos do escritório que
  ainda precisam ser confirmados (endereço, horário, lista real de setores,
  prazos de SLA, prazo de retorno ao cliente etc.) — troque pelo texto real.
- **Vertical slice:** 4 regiões conectadas (Escritório, Praça, Bosque, Rio)
  com transição por borda; relógio + dia/noite + iluminação; 3 NPCs (Dra.
  Helena, Sr. Tibério, Dona Íris) com rotina por horário, diálogo e
  amizade/presentes; inventário + hotbar + dinheiro; loja no Cartório;
  "lavoura de processos" (Caneta prepara baia → planta um Caso → Carimbo/
  chuva → Sentença → vende na Caixa de Remessa); pesca/triagem do DJEN no
  rio; coleta no bosque; clima sol/chuva; salvamento; as 10 aulas + quiz +
  diploma.
- **A expandir:** minas/combate, crafting com máquinas, estações do ano,
  festivais, casamento, mais NPCs, mais regiões e missões.
- **Regras do Firestore:** a coleção `treinamentoProgresso` precisa das
  regras que estão em `README-SETUP.md`. Se a Comarca não salvar progresso
  (erro de permissão no console), é sinal de que as regras não foram
  publicadas ainda no Firebase Console.

## Sub-aba de POPs

A sub-aba "POPs" dentro de Treinamentos apenas embute a ferramenta que
já existe em `tools/pop/`. Para adicionar/revisar um POP, siga a
rotina própria em `tools/pop/ROTINA-ATUALIZACAO-POPS.md` — não precisa
mexer em nada dentro de `tools/treinamentos/`.
