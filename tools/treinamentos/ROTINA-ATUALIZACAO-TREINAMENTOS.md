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

## Sub-aba de POPs

A sub-aba "POPs" dentro de Treinamentos apenas embute a ferramenta que
já existe em `tools/pop/`. Para adicionar/revisar um POP, siga a
rotina própria em `tools/pop/ROTINA-ATUALIZACAO-POPS.md` — não precisa
mexer em nada dentro de `tools/treinamentos/`.
