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

A primeira sub-aba de Treinamentos é a **Comarca do FBzinho**: um jogo **3D**
estilizado (Three.js) de exploração / simulação (estilo farming/life sim),
tema jurídico, com o **treinamento embutido**. Câmera em **3ª pessoa** (sobre
o ombro). O colaborador anda com o **FBzinho** (um advogado de toga) por um
mundo 3D contínuo com **WASD / setas** (Shift corre, Q gira a câmera), visita
os prédios e faz as **10 aulas** (marcadores ⚖️ que brilham). Concluir as 10
libera o **Diploma de Integração** (imprimível/PDF); o **painel do gestor**
(botão "📊 Gestor", `admin`/`gestor`) mostra aulas, pontos e Easter eggs.

**Só funciona no computador** (teclado) — no celular aparece um aviso. Se o
3D/WebGL não carregar, aparece uma tela de erro amigável em vez de quebrar.
**Three.js** carrega de `cdnjs.cloudflare.com/ajax/libs/three.js/r128/` (igual
o Firebase carrega de `gstatic.com`; GitHub Pages não tem CSP). Dois arquivos
estáticos: `tools/treinamentos/jogo/index.html` (casca + HUD + CSS) e
`tools/treinamentos/jogo/game.js` (~1500 linhas, todo o jogo). Mundo,
personagens e props são geometria criada por código — **sem modelos/texturas
externos** (fotorrealismo não cabe nesse formato; o alvo é "estilizado com
atmosfera": sombras em tempo real, ciclo dia/noite, névoa, água com ondas,
luz das lâmpadas à noite, vinheta).

Salva em `treinamentoProgresso/{uid}`: `concluidas`/`pontosTotais`/`easterEggs`
no nível de cima (o painel do gestor lê daí) + `jogoEstado` (dia, dinheiro,
foco, inventário, lavoura, amizades, posição). Fallback em `localStorage`
offline. **Nenhuma regra nova de Firestore.**

- **Conteúdo das aulas:** array `AULAS` no topo de `game.js`. Cada aula tem
  `id` (estável — NÃO renomear), `emoji`, `titulo`, `curto`, `local:{x,z}`
  (posição do marcador no mundo 3D), `licao` (blocos `{h}`/`{p}`/`{ul}`/
  `{callout}`) e `quiz` (`{q,opcoes,correta,explica}`). Passa quem acerta ≥ 70%.
- **Easter eggs:** array `EGGS` — `{id, x, z, k (forma), cor, titulo, texto}`.
- **Dados entre `[colchetes]`** nas aulas são fatos do escritório a confirmar
  (endereço, horário, setores, prazos de SLA, prazo de retorno ao cliente,
  rotina do DJEN). Troque pelo texto real.
- **Vertical slice (o que já tem):** mundo 3D contínuo (Escritório, Praça com
  Fórum/Cartório/OAB/Vara, Bosque, Rio) com sombras + dia/noite + névoa + água
  com ondas + chuva; 3 NPCs (Dra. Helena, Sr. Tibério, Dona Íris) com rotina
  por horário; inventário + hotbar + dinheiro; loja no Cartório; "lavoura de
  processos" (Caneta prepara baia → planta um Caso → Carimbo/chuva → Sentença →
  vende na Caixa de Remessa); pesca/triagem do DJEN no rio; coleta no bosque;
  salvamento; as 10 aulas + quiz + diploma.
- **A expandir:** minas/combate, crafting com máquinas, estações do ano,
  festivais, casamento, mais NPCs, mais regiões e missões.
- Hook de depuração `window.__comarca` (`.j` grupo do FBzinho, `.e` estado,
  `.aula(i)`, `.tp(x,z)`, `.tecla{}`) fica exposto — inofensivo.

## Sub-aba de POPs

A sub-aba "POPs" dentro de Treinamentos apenas embute a ferramenta que
já existe em `tools/pop/`. Para adicionar/revisar um POP, siga a
rotina própria em `tools/pop/ROTINA-ATUALIZACAO-POPS.md` — não precisa
mexer em nada dentro de `tools/treinamentos/`.
