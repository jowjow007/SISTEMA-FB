# Rotina de atualização dos POPs (fluxograma)

Fluxo manual, como a Matriz de Demandas: quando um POP for criado ou revisado,
mande o PDF novo numa conversa com o Claude para que ele:

1. Copie o PDF para `tools/pop/pdfs/` com um nome de arquivo simples
   (sem espaços/acentos), ex: `pop-012-nome-do-procedimento.pdf`.
2. Abra `tools/pop/index.html` e:
   - Se for um POP novo: adicione um card `<a class="pop-card">` na coluna
     de categoria correta (ou crie uma nova coluna, se for uma área nova).
   - Se for revisão de um POP existente: só troque o PDF na pasta `pdfs/`
     (o link no card não muda, se o nome do arquivo for mantido).
3. Faça commit e push do repositório `portal-fb` (branch `main`).
4. O GitHub Pages publica em ~1 minuto em
   `https://jowjow007.github.io/SISTEMA-FB/tools/pop/index.html`.

Nenhum passo depende de Firebase/Storage — os PDFs ficam versionados
diretamente no repositório, junto com o `index.html`.

**Atenção:** o repositório `SISTEMA-FB` é público (exigência do GitHub Pages
no plano gratuito). O login do Portal protege a navegação pelo app, mas
qualquer arquivo dentro do repositório — inclusive estes PDFs — fica
acessível por link direto, sem exigir login. Evite subir POPs com dados de
cliente ou credenciais reais.
