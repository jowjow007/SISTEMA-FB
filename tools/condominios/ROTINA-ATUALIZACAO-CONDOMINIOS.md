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
  Administrativo, Contrato de Honorários — data no formato DD.MM.AA, 2
  dígitos de ano, confirmado no PDF real do POP) e um 4º tipo "Notificação
  Condominial", corrigido em 2026-08-17 a partir de nomes de arquivo reais
  vistos na pasta de modelos do Mirante das Brisas: padrão
  `(COND. {NOME} X T{TORRE}, APTO {APTO}) #{OCORRÊNCIA} – {TÍTULO} - {CRIADOR} - {DD.MM.AAAA}`
  — sem a palavra "NOTIFICAÇÃO" (a tentativa anterior, sem evidência real,
  tinha isso errado) e com ano de 4 dígitos (diferente do padrão de 2 dígitos
  dos outros 3 tipos).
- A sub-área "AlmahCondos" (segundo pill do `condoSubnav`, dentro da aba
  Condomínios) é o guia de cores de ocorrências do sistema ALMAH Condo,
  reconstruído em HTML a partir de uma imagem que o usuário colou na
  conversa (não há arquivo de imagem real embutido — ver `ALMAH_ABERTA` /
  `ALMAH_ENCERRADA` / `ALMAH_PAINEL` no script).

## Fluxo de aprovação de notificações ("Gerar Notificação" + "Notificações Prontas")

Essa parte **usa Firebase de verdade** (Auth + Firestore), diferente do resto
da ferramenta que é só HTML estático. Inclui os mesmos `<script>` do Firebase
compat e o mesmo `../../firebase-config.js` que `tools/sugestoes` usa — como
tudo roda no mesmo domínio do Portal (GitHub Pages), a ferramenta reconhece
sozinha quem já está logado no Portal (`auth.onAuthStateChanged`), sem tela de
login própria. Duas coleções novas no Firestore (regras completas e explicação
em `README-SETUP.md` do repositório raiz — procure por `condoAprovadores` e
`notificacoesGeradas`; **o usuário precisa colar o bloco de regras atualizado
no console do Firebase** para isso funcionar em produção):

- **`condoAprovadores/{slug}`** — um aprovador por condomínio (`slug` =
  nome do condomínio simplificado, ex. `mirante-das-brisas`, gerado pela
  função `slugify()`). Só admin do Portal atribui, pela própria aba
  "Notificações Prontas" (botão "⚙ Atribuir aprovadores por condomínio",
  só aparece para quem tem `role:'admin'` em `users/{uid}`).
- **`notificacoesGeradas/{docId}`** — cada notificação enviada em "Gerar
  Notificação": `condominio`, `condominioSlug`, `torre`, `apto`, `ocorrencia`,
  `tipoPenalidade`, `texto`, `status` (`pendente`/`aprovada`/`rejeitada`),
  `tentativa` (contador, começa em 1), `historico` (array com cada rejeição
  passada), `criadoPorUid`/`criadoPorNome`/`criadoEm`,
  `decididoPorUid`/`decididoPorNome`/`decididoEm`, `motivoRejeicao`.

**Modelos reais do Mirante das Brisas (2026-08-17)**: o usuário compartilhou uma
pasta do Google Drive com ~40 notificações reais já enviadas para esse
condomínio, organizadas em 16 subpastas por categoria de infração (estacionamento
irregular, carrinho de compras, vaga de garagem, happy hour sem reserva, crianças
desacompanhadas, tráfego em contramão, lavagem de janela, dano ao patrimônio,
cigarro, alta velocidade, trajes inadequados, pedestre pelo portão de veículos,
animal sem guia, piscina, falta de capacete, objeto na janela). O texto jurídico
fixo de cada categoria (fundamentação, artigos citados, chamada "NOTIFICA-SE")
foi extraído verbatim desses documentos reais e vive em `MIRANTE_CATEGORIAS`,
com `[DATA]`, `[HORA]` e `[DESCREVER: ...]` como os únicos pontos deixados em
aberto (a narrativa dos fatos sempre varia, mesmo dentro da mesma categoria — não
dá para automatizar isso com segurança). O bloco "DO RECURSO" + assinaturas +
rodapé (`MIRANTE_RODAPE_TPL`) é idêntico em todos os ~40 exemplos reais, por isso
é compartilhado por todas as categorias. O bloco de penalidade
(`PENALIDADE_ADVERTENCIA_TPL` / `penalidadeMultaTpl()`) segue o campo "Tipo"
já existente no formulário. Quando o condomínio selecionado é "Mirante das
Brisas", aparece o campo "Categoria da infração" e o botão "🪄 Gerar texto do
modelo", que monta o texto completo (cabeçalho + corpo da categoria +
penalidade + rodapé) dentro do campo de texto, editável antes de enviar — não
é enviado automaticamente sem revisão humana. **Se o usuário mandar os modelos
dos outros condomínios**, o mesmo padrão se replica: acrescentar um novo array
tipo `MIRANTE_CATEGORIAS` para aquele condomínio e trocar a condição
`isMirante` (hoje só compara `condSel === 'Mirante das Brisas'`) por uma busca
no condomínio selecionado.

Fluxo: qualquer usuário logado monta e envia uma notificação em "Gerar
Notificação" (`status:'pendente'`). Só quem está em `condoAprovadores` como
aprovador **daquele condomínio específico** (ou admin) vê e decide essa
notificação em "Notificações Prontas" — um aprovador de um condomínio nunca
vê notificações de outro (é assim que a regra do Firestore filtra, e é assim
que a consulta no cliente filtra também). Aprovar não pede motivo; rejeitar
exige motivo (fica salvo em `motivoRejeicao` + entra no `historico`). O
criador vê a rejeição e o motivo na lista "Minhas notificações enviadas" (em
"Gerar Notificação"), corrige pelo botão "Corrigir e reenviar", que reabre o
formulário pré-preenchido e, ao reenviar, volta o `status` para `pendente` e
soma 1 em `tentativa` — é esse número que aparece como "🔁 já rejeitada Nx
antes" para o aprovador.

**Notificação ao criador é só dentro do app** (ele vê ao abrir "Gerar
Notificação" de novo), não é push de verdade — mesma decisão já tomada para o
Chat Interno: push com o app fechado exigiria upgrade do Firebase para o
plano pago Blaze. Se um dia quiserem push de verdade, é só pedir.

**Índices do Firestore**: as consultas usadas (`where('criadoPorUid','==',...)`
e `where('condominioSlug','in',[...])`, sempre sozinhas, sem `orderBy` nem
outro `where` junto) foram desenhadas de propósito para não precisar de
nenhum índice composto — a ordenação é feita no JavaScript depois de buscar
os dados. Se um dia alguém adicionar um filtro combinado (ex.: status +
condomínio na mesma query do Firestore), o Firestore vai pedir para criar um
índice (aparece um link no erro do console do navegador).

Para atualizar (novo condomínio, novo POP, texto revisado, etc.):

1. Edite `tools/condominios/index.html` na seção correspondente.
2. Faça commit e push do repositório `portal-fb` (branch `main`).
3. O GitHub Pages publica em ~1 minuto em
   `https://jowjow007.github.io/SISTEMA-FB/tools/condominios/index.html`.

**Ainda falta:** adicionar esta aba no Portal (Administração > Abas) — feito
pela própria interface, não por código.
