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

A primeira sub-aba de Treinamentos é a **Comarca do FBzinho**: um jogo 2D
top-down de exploração / simulação (estilo farming/life sim), tema jurídico,
com o **treinamento embutido**. O colaborador anda com o **FBzinho** (um
advogado) pela comarca com **WASD / setas**, visita os prédios e faz as **10
aulas** (marcadores ⚖️ que brilham). Concluir as 10 libera o **Diploma de
Integração** (imprimível/PDF); o **painel do gestor** (botão "📊 Gestor",
`admin`/`gestor`) mostra aulas concluídas, pontos e Easter eggs de cada um.

**Só funciona no computador** (teclado) — no celular aparece um aviso.
Sem bibliotecas externas: dois arquivos estáticos —
`tools/treinamentos/jogo/index.html` (casca + HUD + CSS) e
`tools/treinamentos/jogo/game.js` (todo o jogo). Mundo, personagens e itens
são pixel art desenhada por código. Salva em `treinamentoProgresso/{uid}`:
`concluidas`/`pontosTotais`/`easterEggs` no nível de cima (o painel do gestor
lê daí) + `jogoEstado` com o estado do jogo (dia, dinheiro, foco, inventário,
lavoura, amizades). Fallback em `localStorage` quando offline. **Nenhuma regra
nova de Firestore** — os campos extras entram no doc que já existe.

- **Conteúdo das aulas:** array `AULAS` no topo de `game.js`. Cada aula tem
  `id` (estável — NÃO renomear), `emoji`, `titulo`, `curto`, `local:{mapa,tx,ty}`
  (onde fica o marcador), `licao` (blocos `{h}`/`{p}`/`{ul}`/`{callout}`) e
  `quiz` (`{q,opcoes,correta,explica}`). Passa quem acerta ≥ 70%.
- **Easter eggs:** array `EGGS` — `{id, mapa, tx, ty, k (forma), cor, titulo, texto}`.
- **Dados entre `[colchetes]`** nas aulas são fatos do escritório a confirmar
  (endereço, horário, lista de setores, prazos de SLA, prazo de retorno ao
  cliente, rotina do DJEN). Troque pelo texto real.
- **Vertical slice (o que já tem):** 4 regiões conectadas (Escritório, Praça,
  Bosque, Rio) com transição por borda; relógio + dia/noite + iluminação;
  3 NPCs (Dra. Helena, Sr. Tibério, Dona Íris) com rotina por horário, diálogo
  e amizade/presentes; inventário + hotbar + dinheiro; loja no Cartório;
  "lavoura de processos" no Escritório (Caneta prepara baia → planta um Caso →
  Carimbo/chuva fazem andar → vira Sentença → vende na Caixa de Remessa);
  pesca/triagem do DJEN na beira do rio; coleta no bosque; clima sol/chuva;
  salvamento; as 10 aulas + quiz + diploma.
- **A expandir (não está no slice):** minas/combate, crafting com máquinas,
  estações do ano completas, festivais, casamento, mais regiões e missões.
- Hook de depuração `window.__comarca` (`.j` jogador, `.e` estado, `.aula(i)`,
  `.tp(tx,ty)`) fica exposto — inofensivo, ajuda a testar.

## Sub-aba de POPs

A sub-aba "POPs" dentro de Treinamentos apenas embute a ferramenta que
já existe em `tools/pop/`. Para adicionar/revisar um POP, siga a
rotina própria em `tools/pop/ROTINA-ATUALIZACAO-POPS.md` — não precisa
mexer em nada dentro de `tools/treinamentos/`.
