# Academia FB — aba de teste (rotina interna)

Esta pasta é uma **aba de teste**, ainda não registrada no menu do Portal e sem
nenhuma conexão com o Firestore de produção. Ela existe para avaliação antes de
qualquer publicação.

## Modo de demonstração

O app roda inteiramente com dados locais (localStorage do navegador). Não há
chamada de rede, não há chave de API, não há IA ao vivo. O botão "Reiniciar
dados de demonstração" (rodapé do menu lateral) restaura o estado inicial a
qualquer momento.

Login: tela inicial com 5 usuários fictícios cobrindo os 4 papéis do sistema
(colaborador, gestor, administrador, autor de conteúdo).

## Quando for conectar ao Firestore de verdade

O código já foi organizado para que a troca seja apenas na camada de
armazenamento (`carregarDB` / `salvarDB` em index.html). As coleções previstas,
mapeadas a partir do objeto `DB` usado hoje em memória:

- `academiaConteudo` / `academiaMissoes` → `DB.conteudo.missoes`
- `academiaTrilhas` → array `TRILHAS` (hoje fixo no código; migrar para coleção editável)
- `academiaProgresso/{uid}` → `DB.usuarios[uid].progresso`
- `academiaTentativas` → histórico de tentativas (hoje só a última tentativa é somada; expandir para log completo)
- `academiaConquistas/{uid}` → `DB.usuarios[uid].badges`
- `academiaCertificados` → `DB.usuarios[uid].certificadosEmitidos`
- `academiaAtribuicoes` → `DB.atribuicoes`
- `academiaMateriais` → array `MATERIAIS`
- `academiaPerfilPublico/{uid}` → espelho público para o ranking (hoje o próprio `DB.usuarios[uid]` faz esse papel)
- `academiaConfiguracoes` → `DB.configuracoes`

Antes de publicar: registrar a aba em Administração > Abas, publicar as regras
do Firestore (seguindo o padrão de `isSignedIn()/isAdmin()/isGestor()` já usado
no restante do Portal) e só então trocar `carregarDB/salvarDB` pelas chamadas
reais ao Firestore, mantendo o fallback em memória para quando o banco não
estiver configurado (exigência do prompt original).

## O que é uma simplificação deliberada nesta rodada de teste

- Os 6 personagens são representados por iniciais coloridas, não por
  ilustrações — não há pipeline de arte disponível nesta etapa.
- O tipo "vídeo interativo" é uma narrativa em cenas com checkpoints, deixada
  explicitamente rotulada como tal — não existe arquivo de vídeo real, para não
  simular uma integração que não existe.
- A contagem de prazo em dias úteis, na missão de exemplo, ignora feriados
  forenses específicos (fica isso dito no próprio enunciado da missão).
- "Importar missão por IA" aparece desabilitado, com aviso "em breve" — nenhuma
  chamada de IA ao vivo foi feita ou prometida.
