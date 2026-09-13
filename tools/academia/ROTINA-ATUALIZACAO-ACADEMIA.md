# Rotina de atualização — Academia do Escritório

A Academia é uma plataforma gamificada de treinamento (missões com cenário
prático + quiz, XP, níveis, badges, ranking, painel do gestor com heatmap de
risco). Fica em `tools/academia/index.html` — um arquivo único, sem
bibliotecas externas.

## Por que não tem "IA dentro do app"

Gerar conteúdo automaticamente a partir de um documento exige chamar uma API
de IA com uma chave secreta — isso não pode rodar só no navegador (o site é
público no GitHub Pages; qualquer um extrairia a chave). Rodar isso de
verdade exigiria um backend (Firebase Cloud Functions) e sair do plano
gratuito do Firebase. Ficou definido (2026-09) que, por enquanto, **isso não
vale o custo** — então o "motor de IA" é o seguinte fluxo manual, sem custo
de infraestrutura:

1. Você me manda o documento/POP numa conversa.
2. Eu leio e gero um **pacote de conteúdo** no formato JSON abaixo.
3. Você entra em **Academia → Gestão → Conteúdo**, cola o JSON na caixa
   "Importar novo pacote", clica em **Validar** e depois **Publicar**.
4. Fica disponível na hora para todos os colaboradores — sem mexer em código.

Isso cobre a essência do item "criação automática de treinamento" do pedido
original, sem custo de API/backend. Se um dia quiserem automatizar de
verdade dentro do app (documento → treinamento sem passar por mim), a
conversa sobre Firebase Blaze + API de IA (e como lidar com dados de
cliente) precisa ser retomada primeiro.

## Formato do pacote de conteúdo

```json
{
  "titulo": "Nome da missão",
  "setor": "juridico",
  "tema": "controle-de-prazos",
  "risco": "critico",
  "tipo": "missao",
  "obrigatorio": false,
  "fonte": { "doc": "POP 009", "item": "4.2" },
  "resumo": "Uma frase resumindo a situação.",
  "flashcards": [ { "frente": "Pergunta rápida?", "verso": "Resposta rápida." } ],
  "cenario": {
    "passos": [
      {
        "situacao": "Descreva a situação prática (o que aconteceu, quando).",
        "opcoes": [
          { "texto": "Alternativa correta", "correta": true, "pontos": 10, "feedback": "Por que está certa." },
          { "texto": "Alternativa errada", "correta": false, "pontos": 0,
            "erro": "O que a pessoa fez de errado.",
            "risco": "Qual problema isso pode causar.",
            "correto": "Qual é o procedimento correto.",
            "fonte": "POP 009, item 4.2" }
        ]
      }
    ]
  },
  "quiz": [
    { "q": "Pergunta objetiva?", "opcoes": ["A","B","C","D"], "correta": 1, "explica": "Por que B é a certa." }
  ],
  "xpBase": 40,
  "moedasBase": 10
}
```

- **setor**: uma destas chaves — `recepcao, administrativo, financeiro,
  juridico, controladoria, comercial, atendimento, reuniao, socios,
  tribunal, condominio, clientes, homeoffice`.
- **tema**: uma chave livre (ex.: `controle-de-prazos`, `atendimento`,
  `lgpd`) — é o que aparece no mapa de competências e no heatmap de risco.
  Use o mesmo `tema` em pacotes relacionados para os dados acumularem.
- **risco**: `baixo | medio | alto | critico`.
- **tipo**: `missao` (padrão) | `boss` (vários `passos` em sequência, vale
  mais XP) | `certificacao` (só quiz, exige 80% para emitir certificado).
- **`cenario.passos`**: cada passo é uma situação prática com alternativas —
  é o coração do sistema (o pedido original é bem específico: **priorizar
  decisão sobre uma situação real, não pergunta teórica solta**). Uma missão
  normal costuma ter 1 passo; um Boss Battle tem vários (cada um representa
  uma etapa de um caso maior).
- **obrigatorio**: `true` marca a missão como treinamento obrigatório — ela
  aparece como pendência no Painel do Gestor até todo mundo concluir.
- **id**: opcional — se enviar um `id` fixo (curto, sem espaço) ele fica
  estável entre reimportações; senão o sistema gera um automaticamente.

## Trilha de onboarding

Pacotes com `"trilha":"onboarding"` e `"ordem":1,2,3...` formam a trilha do
novo colaborador (Dia 1, Dia 2...). Já tem 5 exemplos genéricos publicados
(`onb-dia1`...`onb-dia5`, marcados `obrigatorio:true`) — substitua o
conteúdo deles pelo real quando tiver.

## Conteúdo de exemplo (`[EXEMPLO]`)

O arquivo já vem com alguns pacotes de exemplo (`SEED_PACOTES`, no topo do
`<script>`) usando literalmente as situações do pedido original ("intimação
às 15h32", "cliente insatisfeito") — servem para a plataforma já nascer
jogável. Estão marcados com `[EXEMPLO]` no título e `fonte.doc: "[POP a
definir]"`. Troque por conteúdo real quando quiser: publique um pacote novo
com o mesmo `id` de um exemplo (ex.: `ex-prazo-intimacao`) pela caixa de
importação — ele substitui o exemplo automaticamente (a lista prioriza
pacotes vindos do Firestore sobre os `SEED_PACOTES` com o mesmo id) — ou
simplesmente publique pacotes novos com temas melhores e vá despublicando os
de exemplo em Gestão → Conteúdo.

## O que já funciona (v1)

- Missões com cenário prático (decisão → feedback com erro/risco/correto/fonte),
  quiz e flashcards.
- XP, 7 níveis (Iniciante → Líder), moedas, streak diário, 7 badges, "Missão
  do dia" (prioriza obrigatórias pendentes, depois o tema com pior desempenho).
- Mapa de competências por tema, ranking geral.
- Boss Battle (`tipo:"boss"`) e Certificação com prova + certificado
  imprimível (`tipo:"certificacao"`, exige 80%).
- Pré-requisitos entre pacotes (`preRequisitos:["id1","id2"]`) — trava o
  botão "Jogar" até concluir os anteriores.
- Painel do Gestor: quem treinou, pendências de obrigatórias, XP — e um
  heatmap de risco por tema (tema com mais erro aparece primeiro).
- Importação/publicação de pacotes via JSON colado (com validação básica).

## O que ainda não tem (fica para depois, se fizer sentido)

- Geração automática de conteúdo por IA rodando dentro do app (ver seção
  acima — decisão consciente de não pagar infra/API agora).
- Quiz ao vivo estilo Kahoot e competição entre setores/equipes (tecnicamente
  dá para fazer só com Firestore em tempo real, sem precisar de IA/backend —
  fica como próxima leva se quiserem).
- Conversas com NPCs avaliadas por IA (analisar clareza/educação de uma
  resposta em texto livre exige IA de verdade rodando em algum lugar).
- Transcrição automática de vídeo.
- Variação automática de nomes/valores/personagens numa mesma pergunta
  (hoje as alternativas só embaralham de ordem — variar o conteúdo em si
  exigiria gerar múltiplas versões manualmente, ou IA).
- Cadastro de colaboradores/cargos/setores dentro da Academia — reaproveita
  o que já existe em Organograma/Administração do Portal.

## Regras do Firestore

A coleção `academiaConteudo`, `academiaProgresso` e `academiaPerfil`
precisam das regras que estão em `README-SETUP.md`. Sem publicá-las no
Firebase Console, a Academia não salva nada (fica preso na tela de
carregando ou dá erro de permissão no console).

## Como liberar a aba no Portal

A Academia não aparece sozinha — é preciso criar a aba pela própria tela do
Portal: **Administração → Abas → Nova aba**, apontando para
`tools/academia/index.html` (mesmo processo já usado para as outras
ferramentas, ex.: Treinamentos).
