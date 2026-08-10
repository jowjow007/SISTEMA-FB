# Rotina de atualização — Condomínios

Dados vieram do manual "FB Onboard Guide" (`https://fb-onboard-guide.lovable.app/condominios`),
copiados manualmente em 2026-08-10. Não há integração automática com aquele site
nem com o BRCondos — é uma cópia estática, igual ao padrão do `tools/pop`.

Para atualizar (novo condomínio, troca de síndico, nova particularidade, etc.):

1. Abra `tools/condominios/index.html` e edite o array `CONDOMINIOS` no `<script>`
   final do arquivo. Cada item tem: `nome`, `sindico`, `plataforma`, `cnpj`,
   `endereco`, `nota` (deixe `""` quando não houver informação).
2. Para adicionar um condomínio novo, copie um bloco `{ nome:..., sindico:..., ... }`
   e ajuste os campos.
3. Faça commit e push do repositório `portal-fb` (branch `main`).
4. O GitHub Pages publica em ~1 minuto em
   `https://jowjow007.github.io/SISTEMA-FB/tools/condominios/index.html`.

**Ainda falta:** adicionar "Condomínios" como aba no Portal — isso é feito pela
própria interface (Administração > Abas), não por código; nenhuma sessão do
Claude tem acesso ao navegador/admin para fazer isso automaticamente.
