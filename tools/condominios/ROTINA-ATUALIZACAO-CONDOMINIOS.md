# Rotina de atualização — Manual (Condomínios)

Esta aba replica o manual "FB Onboard Guide" (`https://fb-onboard-guide.lovable.app/`)
inteiro — Início, Comece por Aqui, POPs, Condomínios, ASTREA, BRCondos,
Notificações, Nomenclatura e Links Úteis — como uma única página, com um menu
horizontal no topo no lugar da barra lateral vertical do site original (pedido
explícito do usuário). Conteúdo copiado manualmente em 2026-08-10. Não há
integração automática com aquele site nem com BRCondos/ASTREA — é uma cópia
estática, no mesmo padrão do `tools/pop`.

Tudo fica em `tools/condominios/index.html`, num único arquivo. Estrutura:

- `SECTIONS` — as 9 abas do menu horizontal.
- `CONDOMINIOS` — array com os 10 condomínios (nome, síndico, plataforma,
  CNPJ, endereço, nota/particularidade). É o mesmo dado usado na grade e na
  página de detalhe de cada condomínio.
- `POPS` — os 3 cards da aba POPs. Os PDFs de nº 008 e 009 são reaproveitados
  de `../pop/pdfs/` (já existiam no repositório); o POP nº 010 (BRCondos —
  Livro de Ocorrências) não tem PDF local, então o botão do card leva para a
  aba BRCondos desta mesma página em vez de um arquivo.
- `LINKS` — os 4 cards da aba Links Úteis.
- As demais seções (Início, Comece por Aqui, ASTREA, BRCondos, Notificações)
  são funções `view...()` com o texto direto no HTML — para editar o texto,
  edite a função correspondente.
- A aba Nomenclatura é um gerador funcional (JS puro, sem backend), com as
  regras dos 4 tipos de documento extraídas do POP nº 008/2023 (Judicial,
  Administrativo, Contrato de Honorários) e um 4º tipo "Notificação
  Condominial" inferido do padrão visto no site de referência (não havia PDF
  correspondente para conferir a regra exata — revisar com o usuário se o
  formato gerado não bater com o que o site original produzia).

Para atualizar (novo condomínio, novo POP, texto revisado, etc.):

1. Edite `tools/condominios/index.html` na seção correspondente.
2. Faça commit e push do repositório `portal-fb` (branch `main`).
3. O GitHub Pages publica em ~1 minuto em
   `https://jowjow007.github.io/SISTEMA-FB/tools/condominios/index.html`.

**Ainda falta:** adicionar esta aba no Portal (Administração > Abas) — feito
pela própria interface, não por código.
