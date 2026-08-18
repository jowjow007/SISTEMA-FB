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
condomínio, organizadas em 16 subpastas por categoria de infração. O texto
jurídico fixo de cada categoria (fundamentação, artigos citados, chamada
"NOTIFICA-SE") foi extraído verbatim desses documentos reais e vive em
`MIRANTE_CATEGORIAS`, com `[DATA]`, `[HORA]` e `[DESCREVER: ...]` como os
pontos que variam de caso a caso. O bloco "DO RECURSO" + assinaturas + rodapé
(`MIRANTE_RODAPE_TPL`) é idêntico em todos os ~40 exemplos reais, por isso é
compartilhado por todas as categorias. O bloco de penalidade
(`PENALIDADE_ADVERTENCIA_TPL` / `penalidadeMultaTpl()`) segue o campo "Tipo"
já existente no formulário.

**Lista única de categorias, válida para todos os condomínios (2026-08-17,
pedido explícito do usuário)**: `CATEGORIAS_INFRACAO` tem as ~42 categorias
que o usuário ditou (USO INADEQUADO DA INFRAESTRUTURA, ADEQUAÇÃO, ALTA
VELOCIDADE, ... — ver o array no código para a lista completa), na mesma
ordem, com `id` gerado por `slugify()`. O campo "Categoria da infração"
aparece sempre, para qualquer condomínio selecionado — não só Mirante das
Brisas. `CATEGORIA_PARA_MIRANTE` liga 13 dessas categorias aos modelos reais
já existentes (ex.: `'alta-velocidade': 'velocidade'`, `'criancas': 'criancas'`)
via a função `getMirCategoria(condominio, categoriaId)`, que só retorna algo
quando `condominio === 'Mirante das Brisas'` **e** a categoria está mapeada —
as outras ~29 categorias (e todos os outros 9 condomínios, em qualquer
categoria) mostram o aviso "ainda não temos modelo pronto" e o texto continua
manual. **O usuário disse que vai mandar as convenções e regimentos de todos
os condomínios** para virarem modelos de verdade — quando isso acontecer, o
padrão é: extrair o texto jurídico fixo de cada categoria (igual foi feito
para o Mirante), colocar num array `{CONDOMINIO}_CATEGORIAS` e um mapeamento
`CATEGORIA_PARA_{CONDOMINIO}`, e estender `getMirCategoria` (bom candidato a
renomear para algo tipo `getCategoriaTemplate` nesse momento, já que deixa de
ser exclusivo do Mirante) para checar o condomínio certo.

**Campos estruturados dos fatos (sem IA)**: perguntado explicitamente, o
usuário preferiu **não** integrar uma IA de verdade para reescrever texto
livre em português formal (isso exigiria backend novo — ex. Cloudflare
Workers — mais uma chave de API da Anthropic paga por uso; ver decisão em
2026-08-17). Em vez disso, quando existe modelo real para a categoria
(`getMirCategoria` retorna algo), aparecem os campos "Data do fato", "Hora do
fato" e "O que aconteceu (em poucas palavras)" — o placeholder desse último
campo é preenchido dinamicamente com o texto de exemplo que já estava dentro
do `[DESCREVER: ...]` do modelo, para orientar o usuário sobre o nível de
detalhe esperado. Ao clicar "🪄 Gerar texto do modelo", `gerarTextoDoModelo()`
faz um `split/join` simples trocando `[DATA]` → data do fato, `[HORA]` → hora
do fato, e a regex `/\[DESCREVER:[^\]]*\]/` → o texto digitado pelo usuário,
sem nenhuma correção gramatical — é literalmente o que a pessoa escreveu,
encaixado na frase do modelo. O resultado sempre fica editável no campo de
texto antes de enviar.

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

**Índices do Firestore**: as consultas usadas (`where('criadoPorUid','==',...)`,
`where('condominioSlug','in',[...])`, e as de `fetchOcorrenciasUnidade()` —
até 4 `where(...,'==',...)` encadeados: `condominioSlug`/`torre`/`apto`/
`status` — sempre sem `orderBy` nem filtro de intervalo/`in` junto) foram
desenhadas de propósito para não precisar de nenhum índice composto —
Firestore só exige índice composto quando mistura `orderBy`/intervalo com
outros filtros; múltiplos `==` sozinhos não precisam. A ordenação e o corte
por data de reset são feitos no JavaScript depois de buscar os dados. Se um
dia alguém adicionar um filtro combinado com `orderBy` ou intervalo (ex.:
`criadoEm >= X` direto na query do Firestore, em vez de filtrar no cliente),
o Firestore vai pedir para criar um índice (aparece um link no erro do
console do navegador).

## Reincidência por unidade e "zerar" (troca de inquilino)

Adicionado em 2026-08-17, a pedido do usuário. Nova coleção no Firestore,
**`unidadeResets/{docId}`** (`docId` = `slugify(condominioSlug + '-T' + torre
+ '-' + apto)`, função `unidadeResetDocId()`): guarda, por unidade, a partir
de qual data (`resetAPartirDe`, string `AAAA-MM-DD`) as ocorrências antigas
param de contar — quem zerou (`resetPorUid`/`resetPorNome`) e quando
(`resetEm`). Regras: qualquer logado lê, só admin (`isAdmin()`) escreve — o
usuário pediu que só ele pudesse zerar, mas quando perguntado se isso deveria
ser travado numa conta específica ou em qualquer admin do Portal, escolheu
"qualquer admin do Portal" (mais simples, reaproveita o `role:'admin'` que já
existe em `users/{uid}`).

**Nunca apaga nada.** Zerar só grava a data de corte; as notificações antigas
continuam em `notificacoesGeradas` para histórico/auditoria. `aplicarCorteReset(itens, reset)`
é quem aplica o corte, no cliente, comparando `criadoEm` de cada item com a
data do reset — só entra na contagem de reincidência quem é `criadoEm >=`
a data escolhida.

**Duas telas usam isso:**
- Em **Gerar Notificação**, o botão "🔍 Consultar reincidência desta unidade"
  (`consultarReincidencia()`) aparece assim que Torre e Apartamento estão
  preenchidos — mostra quantas notificações **aprovadas** (só aprovadas contam
  como reincidência; pendente/rejeitada não) essa unidade já teve, filtradas
  pelo reset se houver. É manual (botão), não dispara sozinho a cada tecla,
  para não gerar uma consulta ao Firestore por keystroke.
- Em **Notificações Prontas**, o painel "🔎 Consultar ocorrências por unidade"
  (`viewConsultaUnidadePanel()`/`consultarUnidadeAprovador()`) deixa o
  aprovador — ou o admin, que pode escolher qualquer condomínio, não só os
  que aprova (`condominiosConsultaveis()`) — ver o histórico completo (todos
  os status, não só aprovadas) de uma unidade, e é onde fica o botão "Zerar
  ocorrências desta unidade", visível só para quem `isAdminUser()`.

**Mudança de regra relacionada**: para o botão de reincidência funcionar para
qualquer pessoa criando uma notificação nova (não só para quem já é aprovador
daquele condomínio ou autor das notificações antigas), a regra de leitura de
`notificacoesGeradas` deixou de ser restrita (`criadoPorUid == uid || isAdmin()
|| isAprovadorDoCondo(...)`) e virou simplesmente `isSignedIn()` — qualquer
colaborador logado lê qualquer notificação. A permissão de **decidir**
(aprovar/rejeitar) continua travada como antes, só a leitura ficou mais
aberta. Ver explicação completa no `README-SETUP.md` do repositório raiz.

Para atualizar (novo condomínio, novo POP, texto revisado, etc.):

1. Edite `tools/condominios/index.html` na seção correspondente.
2. Faça commit e push do repositório `portal-fb` (branch `main`).
3. O GitHub Pages publica em ~1 minuto em
   `https://jowjow007.github.io/SISTEMA-FB/tools/condominios/index.html`.

**Ainda falta:** adicionar esta aba no Portal (Administração > Abas) — feito
pela própria interface, não por código.
