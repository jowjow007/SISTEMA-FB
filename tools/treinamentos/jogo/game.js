/* ================================================================
   COMARCA DO FBZINHO — vertical slice (farming/life sim, tema jurídico)
   Treinamento de integração embutido. Um arquivo, sem libs externas.
   ================================================================ */
(function(){
"use strict";

/* ---------------- CONTEÚDO DAS AULAS (rascunho — editar à vontade) ----------------
   id: estável, NÃO renomear depois que houver progresso salvo.
   local: {mapa, tx, ty} = onde fica o marcador da aula.
   licao: blocos {h}|{p}|{ul}|{callout}. quiz: {q,opcoes,correta,explica}. Passa >= 70%.
   Texto entre [colchetes] = confirmar com o escritório.                                */
var AULAS = [
  { id:'boas-vindas', emoji:'👋', titulo:'Boas-vindas ao escritório', curto:'Boas-vindas', local:{mapa:'escritorio',tx:10,ty:10},
    licao:[
      {p:'Oi! Sou o FBzinho, advogado e seu guia. Bem-vindo(a) à Fonseca e Braga Advocacia!'},
      {p:'Nesta comarca você cuida do seu escritório, conhece os colegas e faz as 10 aulas de integração, espalhadas pelos prédios.'},
      {h:'Como funciona'},
      {ul:['Cada aula tem uma conversa e um quiz. Acerte 70% para concluir.','Pode refazer quantas vezes quiser.','Seu progresso e o jogo ficam salvos na sua conta.','Concluiu as 10 aulas? Ganha o Diploma de Integração.']},
      {h:'O escritório em uma frase'},
      {p:'A Fonseca e Braga atua em [áreas — confirmar] com foco em [diferencial — confirmar]. Sede em [endereço — confirmar], horário [horário — confirmar].'},
      {callout:'Dúvida em qualquer aula? Fale com o seu gestor.'}
    ],
    quiz:[
      {q:'Como você conclui uma aula?', opcoes:['Assistindo a um vídeo','Acertando pelo menos 70% do quiz','Pedindo ao gestor','Esperando 24h'], correta:1, explica:'70% ou mais. Pode refazer à vontade.'},
      {q:'Seu progresso…', opcoes:['Fica só neste PC','É salvo na sua conta','Some ao fechar','Só o gestor vê'], correta:1, explica:'Fica gravado na sua conta do Portal.'}
    ] },
  { id:'valores-postura', emoji:'⚖️', titulo:'Valores e postura profissional', curto:'Ética', local:{mapa:'praca',tx:7,ty:11},
    licao:[
      {h:'Nossos valores'},
      {ul:['Sigilo: tudo de cliente é confidencial, dentro e fora do escritório.','Prazo é compromisso — perder um pode custar o direito do cliente.','Comunicação clara: o cliente precisa entender o caso dele.','Respeito entre colegas: pergunte, ajude, revise sem constrangimento.']},
      {h:'Postura'},
      {ul:['Não comente casos, nomes ou valores de clientes em lugar público.','Mensagens em nome do escritório: tom profissional, revisadas.','Documento de cliente não vai para dispositivo pessoal sem autorização.','Dúvida de ética ou conflito de interesse: leve ao gestor antes de agir.']},
      {callout:'O Código de Ética da OAB proíbe prometer resultado. Explicamos caminhos e riscos — nunca garantimos ganho de causa.'}
    ],
    quiz:[
      {q:'Num churrasco perguntam sobre um caso conhecido do escritório. Você:', opcoes:['Conta, já saiu na imprensa','Não comenta — é sigiloso','Conta só o valor','Pede segredo e conta'], correta:1, explica:'Sigilo vale sempre, mesmo sobre o que "saiu na imprensa".'},
      {q:'Cliente pede garantia de vitória:', opcoes:['Garantir para não perdê-lo','Explicar caminhos e riscos, sem prometer','Garantir se pagar mais','Passar ao sócio'], correta:1, explica:'Prometer resultado é vedado pela OAB.'},
      {q:'Documentos de clientes:', opcoes:['Podem ir para o e-mail pessoal','Ficam nos sistemas do escritório','Posso levar para casa','Vão por qualquer app'], correta:1, explica:'Só nos sistemas oficiais.'}
    ] },
  { id:'setores', emoji:'🗂️', titulo:'Setores e organograma', curto:'Setores', local:{mapa:'escritorio',tx:23,ty:5},
    licao:[
      {p:'O escritório se organiza por departamentos. O quadro completo (foto, cargo, departamento) está na aba Organograma do Portal.'},
      {h:'Departamentos (confirmar na aba Organograma)'},
      {ul:['Cível — cobrança, contratos, indenizações.','Condominial — condomínios, notificações, relatórios.','Trabalhista — reclamações e defesas.','Família — divórcios, guarda, alimentos, inventários.','Consumidor — Procon e práticas abusivas.','Administrativo / Financeiro — apoio, compras, patrimônio.']},
      {h:'Como usar'},
      {ul:['Veja em qual departamento cada colega está.','Não sabe com quem falar numa área? Comece pelo gestor dela.','Seu cadastro também aparece lá.']},
      {callout:'Não sabe seu departamento? Confirme com quem te integrou — define quais abas você recebe.'}
    ],
    quiz:[
      {q:'Onde você vê o departamento de cada colega?', opcoes:['Aba Organograma','Grupo de WhatsApp','Recepção','Aba Notícias'], correta:0, explica:'A aba Organograma mostra o quadro por departamento.'},
      {q:'Precisa resolver algo com o Condominial e não conhece ninguém:', opcoes:['E-mail para todos','Procurar o gestor do departamento','Esperar alguém falar com você','Chamado externo'], correta:1, explica:'O gestor do departamento é o ponto de entrada.'}
    ] },
  { id:'portal-abas', emoji:'🧭', titulo:'O Portal por dentro', curto:'Portal', local:{mapa:'escritorio',tx:5,ty:18},
    licao:[
      {p:'O Portal reúne as ferramentas internas em abas. Você só vê as abas que o administrador liberou para o seu perfil.'},
      {h:'Ferramentas comuns'},
      {ul:['Treinamentos — esta trilha, o Manual, POPs, vídeos, documentos.','POPs — o passo a passo de cada tarefa recorrente.','Organograma, Chat, Minhas Anotações, Condomínios, Gestão, Documentos/Contratos.']},
      {h:'Regras de ouro'},
      {ul:['Falta uma aba? Peça ao administrador — acesso é por pessoa.','O tema claro/escuro vale em todo o Portal.','O ícone ao lado da engrenagem mostra os sistemas externos já liberados para você.']},
      {callout:'Antes de perguntar "como faço X?", procure o POP de X.'}
    ],
    quiz:[
      {q:'Uma aba que deveria ter não aparece:', opcoes:['Criar outra conta','Pedir ao administrador para liberar','Usar a conta de um colega','Desistir'], correta:1, explica:'Abas são liberadas por pessoa pelo administrador.'},
      {q:'Primeira coisa a consultar para uma tarefa recorrente:', opcoes:['O POP','O Google','Um colega','Aba Notícias'], correta:0, explica:'O POP é a instrução oficial e atualizada.'},
      {q:'Sua escolha de tema:', opcoes:['Vale só na aba aberta','Vale em todo o Portal','Refaz toda vez','Só o admin muda'], correta:1, explica:'É sincronizado em todo o Portal.'}
    ] },
  { id:'sistemas-externos', emoji:'🔐', titulo:'Sistemas externos', curto:'Sistemas', local:{mapa:'praca',tx:19,ty:20},
    licao:[
      {p:'Além do Portal, o escritório usa sistemas de terceiros. O ícone ao lado da engrenagem mostra os já liberados para você.'},
      {h:'Os sistemas'},
      {ul:['ASTREA — controle jurídico central: pessoas, clientes, processos e casos.','Google Drive / Agenda / Workspace — documentos, compromissos, e-mail.','Digisac — atendimento a clientes por WhatsApp.','ZapSign — assinatura digital.','Token e Authenticator — acesso e 2FA nos sistemas dos tribunais.']},
      {callout:'Nunca compartilhe senha, token ou códigos do Authenticator — nem com colegas. Cada acesso é pessoal e rastreável.'}
    ],
    quiz:[
      {q:'Sistema jurídico central (pessoas, clientes, processos, casos):', opcoes:['Digisac','ASTREA','ZapSign','Google Agenda'], correta:1, explica:'O ASTREA concentra o cadastro jurídico.'},
      {q:'Para WhatsApp com cliente usa-se:', opcoes:['O WhatsApp pessoal','Digisac','ZapSign','Google Chat'], correta:1, explica:'Digisac é o canal oficial.'},
      {q:'Colega pede seu código do Authenticator:', opcoes:['Passo, é da equipe','Não passo — acesso é pessoal','Passo uma vez','Passo se o gestor autorizar'], correta:1, explica:'2FA, token e senha são intransferíveis.'},
      {q:'Precisa do ZapSign mas está como não liberado:', opcoes:['Uso a conta de outra pessoa','Peço a liberação ao administrador','Assino à mão','Instalo outro app'], correta:1, explica:'A liberação é feita pelo administrador.'}
    ] },
  { id:'clientes-comunicacao', emoji:'💬', titulo:'Atendimento ao cliente', curto:'Clientes', local:{mapa:'escritorio',tx:15,ty:12},
    licao:[
      {h:'Canais'},
      {ul:['WhatsApp: sempre pelo Digisac, nunca o número pessoal.','E-mail: documentos e confirmações formais.','Ligação / reunião: decisões importantes e notícias sensíveis.']},
      {h:'Boas práticas'},
      {ul:['Dê um retorno em até [prazo interno — confirmar], mesmo que seja "estou verificando".','Traduza o juridiquês: o cliente precisa entender o próximo passo e o prazo.','Registre no ASTREA o que foi combinado.','Notícia ruim: combine uma ligação, não mande mensagem seca.']},
      {callout:'Cliente ansioso perto de audiência é normal. Retorno curto e honesto vale mais que silêncio.'}
    ],
    quiz:[
      {q:'Canal certo para WhatsApp com cliente:', opcoes:['Meu número pessoal','O Digisac','Grupo com vários clientes','SMS'], correta:1, explica:'Tudo pelo Digisac — registrado e sem expor seu número.'},
      {q:'Saiu decisão desfavorável. Como comunicar?', opcoes:['Mensagem curta','Ligação explicando cenário e próximos passos','Esperar o cliente perguntar','Só registrar'], correta:1, explica:'Notícia sensível pede contato por voz.'},
      {q:'Ainda não tem a resposta que o cliente pediu:', opcoes:['Não responder até ter tudo','Retornar dizendo que está verificando e quando responde','Responder qualquer coisa','Repassar sem avisar'], correta:1, explica:'Um retorno rápido evita a sensação de abandono.'}
    ] },
  { id:'condominial', emoji:'🏢', titulo:'Rotina condominial e prazos', curto:'Condomínios', local:{mapa:'praca',tx:32,ty:8},
    licao:[
      {p:'Se você atua com condomínios, a aba Condomínios do Portal é a base: POPs, clientes, guia do ASTREA, gerador de notificações e relatórios.'},
      {h:'Prazos que não se perde'},
      {ul:['Notificação de Infração de RI: [3 dias úteis — confirmar].','Notificação Extrajudicial: [7 dias úteis — confirmar].','Análise Contratual / Parecer: [7 dias úteis — confirmar].','Relatório Mensal Geral: [7 dias corridos — confirmar].']},
      {p:'A ferramenta traz a tabela de SLA detalhada. Sempre confira nela.'},
      {h:'Notificações'},
      {ul:['A notificação passa por aprovação antes de sair.','Só o autor corrige e reenvia se for rejeitada.','A lista de enviadas é visível para toda a equipe da aba.']},
      {callout:'Não decore prazos daqui. A fonte oficial é a tabela de SLA na aba Condomínios.'}
    ],
    quiz:[
      {q:'Fonte oficial dos prazos (SLA) da área condominial:', opcoes:['Este resumo','A tabela de SLA na aba Condomínios','O grupo de WhatsApp','O colega mais antigo'], correta:1, explica:'A tabela na aba Condomínios é a versão mantida.'},
      {q:'Sua notificação foi rejeitada. Quem corrige e reenvia?', opcoes:['Qualquer um da equipe','Somente você, o autor','Só o administrador','Ninguém'], correta:1, explica:'Apenas o autor original.'},
      {q:'Onde ficam a lista de condomínios e o gerador de notificações?', opcoes:['Aba Condomínios','Aba Organograma','Aba Contratos','Só no ASTREA'], correta:0, explica:'A aba Condomínios concentra tudo da área.'}
    ] },
  { id:'seguranca-lgpd', emoji:'🛡️', titulo:'Segurança da informação e LGPD', curto:'Segurança', local:{mapa:'bosque',tx:9,ty:21},
    licao:[
      {h:'LGPD em uma frase'},
      {p:'A LGPD (Lei 13.709/2018) trata dado pessoal como algo guardado em confiança. Nome, CPF, processo, valores de cliente: tudo é dado protegido.'},
      {h:'O que você faz'},
      {ul:['Senha forte e única; ativa 2FA onde houver.','Nada de documento de cliente em pen drive, e-mail pessoal ou nuvem particular.','Bloqueia a tela ao sair da mesa.','Confere o destinatário antes de enviar anexo de cliente.','Só compartilha dado de cliente com quem precisa para o trabalho.']},
      {h:'Backup'},
      {p:'Regra 3-2-1: 3 cópias, 2 tipos de mídia, 1 fora do local. Salve o trabalho nos locais oficiais — o que fica só na sua máquina não entra no backup.'},
      {callout:'Suspeita de vazamento? Avise o gestor na hora. A LGPD dá prazo curto para comunicar incidentes.'}
    ],
    quiz:[
      {q:'Onde NÃO pode ficar documento de cliente?', opcoes:['Nos sistemas oficiais','No seu pen drive pessoal','Na pasta do cliente no Drive do escritório','No ASTREA'], correta:1, explica:'Mídia e contas pessoais estão fora do controle e do backup.'},
      {q:'Enviou anexo com dados de cliente para o e-mail errado. Primeiro:', opcoes:['Nada, foi engano','Avisar o gestor imediatamente','Apagar e seguir','Esperar para ver'], correta:1, explica:'É possível incidente — comunicação rápida.'},
      {q:'A regra 3-2-1 de backup:', opcoes:['3 senhas, 2 usuários, 1 admin','3 cópias, 2 mídias, 1 fora do local','3 dias, 2 responsáveis, 1 relatório','Nada específico'], correta:1, explica:'3 cópias / 2 mídias / 1 off-site.'},
      {q:'Trabalho salvo só no disco do seu PC:', opcoes:['Está no backup','NÃO entra no backup','Vai sozinho para o Drive','É mais seguro'], correta:1, explica:'O backup cobre os sistemas oficiais.'}
    ] },
  { id:'prazos-processos', emoji:'📅', titulo:'Prazos processuais e publicações', curto:'Prazos', local:{mapa:'rio',tx:17,ty:16},
    licao:[
      {p:'O maior risco do trabalho jurídico é perder um prazo. O escritório monitora as publicações oficiais e distribui os prazos.'},
      {h:'Como funciona'},
      {ul:['As publicações do DJEN são monitoradas [rotina — confirmar].','Cada intimação vira um prazo com data fatal, contado em dias úteis (CPC art. 219).','Prazos têm régua de lembrete (D-7, D-3, D-1).','Prazo que cai para você: confirme o recebimento e registre.']},
      {h:'Sua responsabilidade'},
      {ul:['Nunca deixe um prazo "para depois" sem registrar.','Dúvida na contagem? Pergunte antes, não no último dia.','Vai se ausentar? Combine a cobertura dos seus prazos.']},
      {callout:'Recesso forense (20/12 a 20/01) e feriados do tribunal suspendem prazos.'}
    ],
    quiz:[
      {q:'Como se contam os prazos processuais, em regra, no CPC atual?', opcoes:['Dias corridos','Dias úteis','Semanas','Depende do juiz'], correta:1, explica:'CPC art. 219: dias úteis.'},
      {q:'Um prazo foi atribuído a você. Primeira atitude:', opcoes:['Deixar para depois','Confirmar o recebimento e registrar com a data fatal','Assumir que alguém lembra','Só se sobrar tempo'], correta:1, explica:'Confirmar e registrar na hora.'},
      {q:'Vai tirar férias e tem prazos no período:', opcoes:['Não avisar','Combinar a cobertura com antecedência','Levar o notebook','Adiar as férias'], correta:1, explica:'A cobertura precisa estar combinada antes.'}
    ] },
  { id:'prova-final', emoji:'🏅', titulo:'Prova de Integração', curto:'Prova final', local:{mapa:'praca',tx:24,ty:9},
    licao:[
      {p:'Última aula! As perguntas misturam tudo que você viu.'},
      {p:'Acertando 70% ou mais, sua integração é concluída e o diploma fica disponível no topo da tela.'},
      {callout:'Depois de concluir, seu gestor vê que você terminou no painel de progresso.'}
    ],
    quiz:[
      {q:'Informação de cliente pode ser comentada fora do escritório se saiu na imprensa?', opcoes:['Pode','Não — o sigilo vale sempre','Só o valor','Depende'], correta:1, explica:'Sigilo não tem exceção.'},
      {q:'WhatsApp com cliente é sempre por:', opcoes:['Número pessoal','Digisac','Grupo geral','Telegram'], correta:1, explica:'Digisac.'},
      {q:'Sistema jurídico central:', opcoes:['ZapSign','ASTREA','Google Agenda','Portal'], correta:1, explica:'ASTREA.'},
      {q:'Prazo processual, em regra:', opcoes:['Dias corridos','Dias úteis','Meses','Horas'], correta:1, explica:'Dias úteis (CPC 219).'},
      {q:'Documento de cliente no e-mail pessoal?', opcoes:['Sim, se prático','Não — só nos sistemas oficiais','Sim, com cópia ao gestor','Só PDFs'], correta:1, explica:'Fora do controle e do backup.'},
      {q:'Aba do Portal que não aparece:', opcoes:['Criar outra conta','Pedir ao administrador','Usar a de um colega','Desistir'], correta:1, explica:'Acesso é por pessoa.'},
      {q:'Fonte oficial de "como fazer":', opcoes:['O POP','Um colega','O Google','Aba Notícias'], correta:0, explica:'O POP.'},
      {q:'Suspeita de vazamento:', opcoes:['Espera','Avisa o gestor imediatamente','Apaga o rastro','Resolve sozinho'], correta:1, explica:'Comunicação rápida.'},
      {q:'Colega pede seu código do Authenticator:', opcoes:['Passo','Não passo — é pessoal','Passo uma vez','Passo se pedir por escrito'], correta:1, explica:'Intransferível.'},
      {q:'Cliente quer garantia de vitória:', opcoes:['Garanto','Explico caminhos e riscos','Garanto se pagar mais','Ignoro'], correta:1, explica:'Vedado pela OAB.'}
    ] }
];
var PASS = 0.7;

/* ---------------- EASTER EGGS (advocacia / tribunais / CPC) ---------------- */
var EGGS = [
  { id:'balanca', mapa:'praca', tx:14, ty:22, cor:'#e7b84f', k:'selo', titulo:'A balança da Justiça', texto:'A balança pesa os argumentos; a espada é a força da lei; a venda nos olhos é a imparcialidade.' },
  { id:'cpc219', mapa:'escritorio', tx:31, ty:22, cor:'#3b7dd8', k:'livro', titulo:'CPC art. 219', texto:'Os prazos processuais contam-se somente em dias úteis. Uma das maiores mudanças do CPC de 2015.' },
  { id:'cpc300', mapa:'escritorio', tx:4, ty:26, cor:'#c0392b', k:'livro', titulo:'CPC art. 300 — Tutela de urgência', texto:'Exige, ao mesmo tempo, probabilidade do direito e perigo de dano ou risco ao resultado útil do processo.' },
  { id:'stf', mapa:'praca', tx:38, ty:22, cor:'#d7d2c8', k:'coluna', titulo:'STF', texto:'Guardião da Constituição, 11 ministros. A súmula vinculante (CF art. 103-A) obriga todos os juízes e a Administração.' },
  { id:'stj', mapa:'praca', tx:4, ty:26, cor:'#cdd6e0', k:'coluna', titulo:'STJ', texto:'O "Tribunal da Cidadania": uniformiza a interpretação da lei federal. Julga recursos repetitivos (CPC art. 1.036).' },
  { id:'toga', mapa:'bosque', tx:28, ty:9, cor:'#2b2b30', k:'livro', titulo:'A toga preta', texto:'A cor sóbria lembra que, no tribunal, vale o argumento, não a pessoa. O advogado usa toga nas sustentações.' },
  { id:'prescricao', mapa:'bosque', tx:6, ty:6, cor:'#8e7cc3', k:'ampulheta', titulo:'Prescrição x decadência', texto:'A prescrição atinge a pretensão (pode ser interrompida). A decadência atinge o próprio direito e, em regra, não.' },
  { id:'oab', mapa:'praca', tx:9, ty:15, cor:'#b8362e', k:'selo', titulo:'Estatuto da OAB', texto:'Lei 8.906/94: a advocacia é função essencial à Justiça (CF art. 133); o advogado é inviolável por seus atos no exercício da profissão.' },
  { id:'inicial', mapa:'escritorio', tx:18, ty:27, cor:'#e6d3a3', k:'pergaminho', titulo:'CPC art. 319 — Petição inicial', texto:'Precisa indicar: juízo, partes, fatos e fundamentos, pedido, valor da causa, provas e a opção por audiência de conciliação.' },
  { id:'coisajulgada', mapa:'bosque', tx:33, ty:26, cor:'#7f8c8d', k:'carimbo', titulo:'CPC art. 502 — Coisa julgada', texto:'É a autoridade que torna imutável a decisão de mérito não mais sujeita a recurso. Segurança jurídica.' },
  { id:'forum', mapa:'praca', tx:29, ty:15, cor:'#2e7d5b', k:'placa', titulo:'Fórum x Tribunal', texto:'O Fórum é a 1ª instância (juiz de direito). O Tribunal de Justiça (TJ) é a 2ª instância, onde os desembargadores julgam recursos.' },
  { id:'juri', mapa:'bosque', tx:15, ty:5, cor:'#8d6e63', k:'cadeira', titulo:'Tribunal do Júri', texto:'Competência para crimes dolosos contra a vida (CF art. 5º, XXXVIII). Conselho de Sentença de 7 jurados, decisão em sigilo.' },
  { id:'cafezinho', mapa:'escritorio', tx:12, ty:4, cor:'#6d4c41', k:'caneca', titulo:'Sabedoria forense', texto:'"Audiência sem cafezinho é nulidade material." Jurisprudência de corredor, pacífica. (Essa não cai na prova.)' },
  { id:'precatorio', mapa:'rio', tx:6, ty:9, cor:'#16a085', k:'livro', titulo:'Precatório (CF art. 100)', texto:'Ordem de pagamento de dívida da Fazenda Pública reconhecida por decisão transitada em julgado. Segue ordem cronológica.' }
];

/* ---------------- ITENS / CULTIVOS / LOJA / NPCs ---------------- */
var ITENS = {
  caneta:{nome:'Caneta Tinteiro', tipo:'ferramenta'},
  carimbo:{nome:'Carimbo de Protocolo', tipo:'ferramenta'},
  lupa:{nome:'Lupa de Pesquisa', tipo:'ferramenta'},
  pasta_cob:{nome:'Caso de Cobrança', tipo:'semente', cultivo:'cob', preco:20},
  pasta_trab:{nome:'Caso Trabalhista', tipo:'semente', cultivo:'trab', preco:45},
  pasta_inv:{nome:'Caso de Inventário', tipo:'semente', cultivo:'inv', preco:90},
  sent_cob:{nome:'Sentença de Cobrança', tipo:'produto', preco:55},
  sent_trab:{nome:'Acórdão Trabalhista', tipo:'produto', preco:120},
  sent_inv:{nome:'Formal de Partilha', tipo:'produto', preco:260},
  cafe:{nome:'Cafézinho', tipo:'comida', foco:35, preco:12},
  marmita:{nome:'Marmita do Fórum', tipo:'comida', foco:80, preco:40},
  publicacao:{nome:'Publicação do DJEN', tipo:'produto', preco:14},
  ementa:{nome:'Ementa Rara', tipo:'produto', preco:38},
  cravo:{nome:'Flor de Jacarandá', tipo:'presente', preco:0}
};
var CULTIVOS = {
  cob:{ dias:2, produto:'sent_cob', xp:6, cor:'#e0b24a' },
  trab:{ dias:4, produto:'sent_trab', xp:14, cor:'#5aa0d8' },
  inv:{ dias:6, produto:'sent_inv', xp:30, cor:'#a07ad0' }
};
var LOJA = ['pasta_cob','pasta_trab','pasta_inv','cafe','marmita'];
var NPCS = {
  helena:{ nome:'Dra. Helena', cargo:'advogada sócia · sua mentora', pal:{roupa:'#7a2f5a',cabelo:'#3a2b24',pele:'#e8b48a',oculos:1},
    gosta:['ementa','sent_inv'],
    rotina:[ {h:0,m:'escritorio',x:14,y:9}, {h:9*60,m:'praca',x:25,y:13}, {h:13*60,m:'praca',x:30,y:13}, {h:17*60,m:'escritorio',x:14,y:9}, {h:22*60,m:'escritorio',x:8,y:5} ],
    falas:['Bom te ver. O escritório é o que a gente constrói junto.','Fez as aulas de hoje? Elas abrem o resto da comarca.','Chuva protocola seus casos sozinha. Aproveita e explora.'] },
  tiberio:{ nome:'Sr. Tibério', cargo:'escrevente · Cartório', pal:{roupa:'#3a5a7a',cabelo:'#9a9a9a',pele:'#d8a877'},
    gosta:['cafe'],
    rotina:[ {h:0,m:'praca',x:19,y:19}, {h:19*60,m:'praca',x:12,y:24}, {h:22*60,m:'praca',x:12,y:24} ],
    falas:['Cartório aberto. Caso novo, café, marmita — é só pedir (aperte E aqui na porta).','Papel bom é papel carimbado, moço(a).','Traz um cafézinho um dia desses.'], loja:true },
  iris:{ nome:'Dona Íris', cargo:'copa e recepção', pal:{roupa:'#2e7d5b',cabelo:'#5c3a24',pele:'#e8b48a'},
    gosta:['cravo','cafe'],
    rotina:[ {h:0,m:'escritorio',x:13,y:6}, {h:11*60,m:'praca',x:16,y:12}, {h:15*60,m:'escritorio',x:13,y:6}, {h:20*60,m:'praca',x:33,y:23} ],
    falas:['O café tá fresquinho.','Vi a Dra. Helena procurando você mais cedo.','Explora o bosque com calma — essa comarca tem cada história.'] }
};

/* ================================================================ */
var TILE = 16;
var $ = function(id){ return document.getElementById(id); };
function esc(s){ return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }
function clamp(v,a,b){ return v<a?a:(v>b?b:v); }
function keyt(tx,ty){ return tx+','+ty; }

/* ---------------- Firebase ---------------- */
var auth=null, db=null, temFirebase=false;
try {
  if (typeof firebaseConfig !== 'undefined' && firebaseConfig && firebaseConfig.apiKey !== 'COLE_AQUI_SUA_API_KEY'){
    firebase.initializeApp(firebaseConfig); auth=firebase.auth(); db=firebase.firestore(); temFirebase=true;
  }
} catch(e){ console.warn(e); }

var meuUid=null, meuNome='', souAdmin=false, souGestor=false, progRef=null;
var prog = { concluidas:{}, pontosTotais:0, concluidoEm:null, nome:'', easterEggs:[] };
var pontosPossiveis = AULAS.reduce(function(a,x){ return a + x.quiz.length; }, 0);
function aulaFeita(id){ return !!prog.concluidas[id]; }
function idxAulaAtual(){ for(var i=0;i<AULAS.length;i++) if(!aulaFeita(AULAS[i].id)) return i; return AULAS.length; }
function aulaLiberada(i){ return i<=0 || aulaFeita(AULAS[i-1].id); }
function eggFeito(id){ return prog.easterEggs.indexOf(id)!==-1; }

/* ---------------- Estado do jogo ---------------- */
var E = null;
function estadoNovo(){
  var inv=[]; for(var i=0;i<24;i++) inv.push(null);
  inv[0]={id:'caneta',qt:1}; inv[1]={id:'carimbo',qt:1}; inv[2]={id:'lupa',qt:1};
  inv[3]={id:'pasta_cob',qt:3}; inv[4]={id:'cafe',qt:2};
  return {
    dia:1, hora:6*60, clima:'sol',
    dinheiro:500, foco:100, focoMax:100,
    inv:inv, hot:0,
    skill:{ processos:0 },
    tilled:{}, plants:{},
    npc:{ helena:{amiz:0,pd:0}, tiberio:{amiz:0,pd:0}, iris:{amiz:0,pd:0} },
    mapa:'escritorio', px:10*TILE+8, py:12*TILE+8,
    vendaPendente:0
  };
}
function invAdd(id,qt){
  qt=qt||1; var def=ITENS[id]; if(!def) return false;
  if (def.tipo!=='ferramenta'){
    for (var i=0;i<E.inv.length;i++) if(E.inv[i] && E.inv[i].id===id){ E.inv[i].qt+=qt; return true; }
  }
  for (var j=0;j<E.inv.length;j++) if(!E.inv[j]){ E.inv[j]={id:id,qt:qt}; return true; }
  return false;
}
function invRemove(id,qt){
  qt=qt||1;
  for (var i=0;i<E.inv.length;i++) if(E.inv[i] && E.inv[i].id===id){
    E.inv[i].qt-=qt; if(E.inv[i].qt<=0) E.inv[i]=null; return true;
  }
  return false;
}
function invTem(id){ for(var i=0;i<E.inv.length;i++) if(E.inv[i]&&E.inv[i].id===id) return E.inv[i].qt; return 0; }
function itemSel(){ return E.inv[E.hot%8] || null; }

/* ================================================================
   SPRITES procedurais
   ================================================================ */
var SPR = {};
function mk(w,h){ var c=document.createElement('canvas'); c.width=w; c.height=h; return c; }

function iconeItem(id){
  if (SPR['ic_'+id]) return SPR['ic_'+id];
  var c=mk(32,32), g=c.getContext('2d'); g.imageSmoothingEnabled=false;
  var d=ITENS[id]||{};
  function bx(x,y,w,h,cor){ g.fillStyle='#2a1c14'; g.fillRect(x-1,y-1,w+2,h+2); g.fillStyle=cor; g.fillRect(x,y,w,h); }
  if (id==='caneta'){ bx(13,3,5,20,'#2b2b30'); bx(11,22,9,5,'#e7b84f'); }
  else if (id==='carimbo'){ bx(11,3,10,7,'#7a2f2a'); bx(13,10,6,7,'#5a5a5a'); bx(7,17,18,8,'#3a3a3a'); }
  else if (id==='lupa'){ g.strokeStyle='#2a1c14'; g.lineWidth=3; g.beginPath(); g.arc(13,13,8,0,7); g.stroke(); g.fillStyle='#bfe3ff'; g.beginPath(); g.arc(13,13,6,0,7); g.fill(); g.strokeStyle='#7a4a22'; g.lineWidth=4; g.beginPath(); g.moveTo(19,19); g.lineTo(27,27); g.stroke(); }
  else if (d.tipo==='semente'){ var cc=d.cultivo==='cob'?'#d9a441':d.cultivo==='trab'?'#4f8fc8':'#9a6fc4'; bx(6,6,20,20,cc); g.fillStyle='#fff'; g.fillRect(6,6,20,4); g.fillStyle='#2a1c14'; g.fillRect(10,14,10,2); g.fillRect(10,18,7,2); }
  else if (d.tipo==='produto'){ bx(6,4,20,24,'#faf4e6'); g.fillStyle='#b8362e'; g.fillRect(6,4,20,3); g.fillStyle='#7a6b58'; g.fillRect(10,12,13,2); g.fillRect(10,16,13,2); g.fillRect(10,20,8,2); if(id.indexOf('sent')===0){ g.fillStyle='#e7b84f'; g.beginPath(); g.arc(22,24,4,0,7); g.fill(); } }
  else if (id==='cafe'){ bx(9,10,14,14,'#6d4c41'); g.fillStyle='#c9a27a'; g.fillRect(9,10,14,3); g.fillStyle='#6d4c41'; g.fillRect(22,13,5,7); g.fillStyle='#d8c4b0'; g.fillRect(11,7,10,3); }
  else if (id==='marmita'){ bx(6,10,20,15,'#c0392b'); g.fillStyle='#8a2a20'; g.fillRect(6,7,20,4); g.fillStyle='#e0b24a'; g.fillRect(10,14,5,5); g.fillStyle='#5aa04a'; g.fillRect(17,14,5,5); }
  else if (id==='cravo'){ g.fillStyle='#3a7a3a'; g.fillRect(15,12,2,14); g.fillStyle='#d84a7a'; g.beginPath(); g.arc(16,10,6,0,7); g.fill(); }
  else { bx(8,8,16,16,'#8a8a8a'); }
  SPR['ic_'+id]=c; return c;
}

/* pessoa 16x24 (pés no y=23). dir 0=baixo 1=cima 2=esq 3=dir. */
function drawPessoa(g, pal, dir, wf, acting){
  var pele=pal.pele||'#e8b48a', cab=pal.cabelo||'#3a2b24', roupa=pal.roupa||'#2f2440';
  var pp = wf===1?1:0;
  g.fillStyle='rgba(0,0,0,.22)'; g.beginPath(); g.ellipse(8,22,6,2,0,0,7); g.fill();
  g.fillStyle='#241a30';
  if (dir===2||dir===3){ g.fillRect(6,17,3,5-pp); g.fillRect(9,17,3,4+pp); }
  else { g.fillRect(5,17,3,5-pp); g.fillRect(9,17,3,4+pp); }
  g.fillStyle=roupa; g.fillRect(4,9,9,9);
  g.fillStyle='#e7b84f'; g.fillRect(4,9,1,9); g.fillRect(12,9,1,9);
  if (dir===0){ g.fillStyle='#f7f4ee'; g.fillRect(7,9,3,6); g.fillStyle='#b8362e'; g.fillRect(8,9,1,6); }
  g.fillStyle=roupa;
  if (acting){ if(dir===3) g.fillRect(13,7,3,6); else if(dir===2) g.fillRect(1,7,3,6); else { g.fillRect(2,7,2,5); g.fillRect(13,7,2,5); } }
  else { g.fillRect(2,10,2,6-pp); g.fillRect(13,10,2,5+pp); }
  g.fillStyle=pele; g.fillRect(5,2,7,7);
  g.fillStyle=cab; g.fillRect(4,1,9,3); if(dir!==1){ g.fillRect(4,2,2,4); g.fillRect(11,2,2,4); }
  g.fillStyle='#20161a';
  if (dir===0){ g.fillRect(7,5,1,2); g.fillRect(10,5,1,2); }
  else if (dir===2){ g.fillRect(6,5,1,2); }
  else if (dir===3){ g.fillRect(10,5,1,2); }
  if (pal.oculos && dir!==1){ g.strokeStyle='#20161a'; g.lineWidth=0.7; g.strokeRect(6,4.3,2,2.4); g.strokeRect(9,4.3,2,2.4); }
}
function sprHeroi(dir,wf,act){
  var k='h'+dir+wf+(act?1:0);
  if (SPR[k]) return SPR[k];
  var c=mk(16,24), g=c.getContext('2d'); g.imageSmoothingEnabled=false;
  drawPessoa(g,{roupa:'#2f2440',cabelo:'#3a2b24',pele:'#f0c9a0',oculos:1},dir,wf,act);
  SPR[k]=c; return c;
}
function sprNPC(nk,dir,wf){
  var k='n'+nk+dir+wf;
  if (SPR[k]) return SPR[k];
  var c=mk(16,24), g=c.getContext('2d'); g.imageSmoothingEnabled=false;
  drawPessoa(g,NPCS[nk].pal,dir,wf,0);
  SPR[k]=c; return c;
}
function pintaFace(cv){
  var g=cv.getContext('2d'); g.imageSmoothingEnabled=false; g.clearRect(0,0,16,16);
  g.fillStyle='#f0c9a0'; g.fillRect(3,3,10,11);
  g.fillStyle='#3a2b24'; g.fillRect(2,1,12,4); g.fillRect(2,2,3,6); g.fillRect(11,2,3,6);
  g.fillStyle='#20161a'; g.fillRect(6,7,2,2); g.fillRect(9,7,2,2);
  g.strokeStyle='#20161a'; g.lineWidth=0.7; g.strokeRect(5,6,3,3); g.strokeRect(8,6,3,3);
  g.strokeStyle='#8a3b32'; g.lineWidth=1; g.beginPath(); g.moveTo(6,11); g.quadraticCurveTo(8,13,10,11); g.stroke();
  g.fillStyle='#2f2440'; g.fillRect(2,14,12,2);
}

/* ================================================================
   MAPAS
   ================================================================ */
var MAPAS = {};
function novoMapa(nome,w,h,base,piso2){
  return { nome:nome, w:w, h:h, base:base, piso2:piso2||base, solidos:[], predios:[], arvores:[], props:[], agua:[], caminhos:[], saidas:[], plantio:null, luzes:[] };
}
function sol(m,tx,ty,tw,th){ m.solidos.push({x:tx*TILE,y:ty*TILE,w:tw*TILE,h:th*TILE}); }
function borda(m){ sol(m,-2,-2,m.w+4,2); sol(m,-2,m.h,m.w+4,2); sol(m,-2,-2,2,m.h+4); sol(m,m.w,-2,2,m.h+4); }
function predio(m,tx,ty,tw,th,cor,teto,nome,acao){
  var p={tx:tx,ty:ty,tw:tw,th:th,cor:cor,teto:teto,nome:nome,acao:acao||null,
         portaX:(tx+Math.floor(tw/2)), portaY:(ty+th)};
  m.predios.push(p);
  sol(m, tx, ty, tw, th-1);         // corpo bloqueia; deixa a fileira da porta livre
  sol(m, tx, ty+th-1, Math.floor(tw/2)-1<0?0:Math.max(0,Math.floor(tw/2)-1), 1);
  sol(m, tx+Math.floor(tw/2)+2, ty+th-1, tw-(Math.floor(tw/2)+2), 1);
  return p;
}
function arv(m,tx,ty){ m.arvores.push({x:tx*TILE+8,y:ty*TILE+16}); m.solidos.push({x:tx*TILE+4,y:ty*TILE+10,w:8,h:6}); }
function prop(m,tx,ty,tipo,cor){ m.props.push({x:tx*TILE+8,y:ty*TILE+14,tipo:tipo,cor:cor||'#8a8a8a'}); }

function construirMapas(){
  /* ESCRITÓRIO 40x30 */
  var o = novoMapa('escritorio',40,30,'#7fbf6a','#6fae5c'); borda(o);
  predio(o,6,2,7,4,'#c58a55','#8a4b3a','Casa');
  o.cama = {tx:9,ty:6};
  o.correio = {tx:14,ty:6};
  o.remessa = {tx:17,ty:6};
  prop(o,14,6,'correio','#3a6a9a');
  prop(o,17,6,'remessa','#7a5a3a');
  prop(o,5,18,'pc','#3a3a4a');
  prop(o,23,4,'quadro','#7a5a3a');
  prop(o,15,12,'mesa','#8a5a3a');
  prop(o,12,4,'cafeteira','#6d4c41');
  o.plantio = {x0:16,y0:15,x1:31,y1:26};
  var obs=[[3,10,'g'],[9,12,'p'],[33,7,'p'],[36,20,'g'],[2,22,'p'],[6,25,'p'],[34,26,'p'],[13,20,'g'],[31,14,'p'],[3,15,'g'],[35,11,'p'],[10,26,'p']];
  obs.forEach(function(t){ if(t[2]==='p') arv(o,t[0],t[1]); else prop(o,t[0],t[1],'gaveteiro','#7a7f88'); if(t[2]==='g') sol(o,t[0],t[1],1,1); });
  for (var a=0;a<4;a++) for(var b=0;b<3;b++){ o.agua.push({x:(3+a),y:(23+b)}); }
  sol(o,3,23,4,3);
  o.saidas.push({ edge:'o', from:12, to:17, alvo:'praca', ex:40*TILE-10, ey:15*TILE });
  o.luzes.push({tx:8,ty:6},{tx:23,ty:5});
  MAPAS.escritorio=o;

  /* PRAÇA 44x32 */
  var p = novoMapa('praca',44,32,'#c9c3b4','#bdb7a6'); borda(p);
  predio(p,3,5,6,5,'#a9895b','#7a5a3a','OAB');
  predio(p,16,13,7,6,'#8a8f98','#5a6068','Fórum');
  predio(p,15,17,6,4,'#a9895b','#7a5a3a','Cartório', {tipo:'loja', npc:'tiberio'});
  predio(p,26,4,9,6,'#8f9aa4','#5a6068','Vara de Condomínios');
  prop(p,14,20,'fonte','#6aa8d8');
  prop(p,29,14,'placa','#2e7d5b');
  // arvores decor
  [[2,3],[41,3],[2,29],[41,29],[10,26],[36,25],[6,18],[38,10]].forEach(function(t){ arv(p,t[0],t[1]); });
  p.saidas.push({ edge:'l', from:12, to:20, alvo:'escritorio', ex:1*TILE+10, ey:15*TILE });
  p.saidas.push({ edge:'o', from:10, to:24, alvo:'bosque', ex:38*TILE-10, ey:18*TILE });
  p.luzes.push({tx:14,ty:20},{tx:24,ty:11},{tx:31,ty:11});
  MAPAS.praca=p;

  /* BOSQUE 40x34 */
  var b = novoMapa('bosque',40,34,'#4f8f4a','#448040'); borda(b);
  predio(b,7,17,6,5,'#8a6a44','#5a3a24','Biblioteca da Comarca');
  var floresta=[[3,3],[8,4],[13,3],[19,4],[25,3],[31,4],[36,3],[3,9],[36,9],[3,15],[36,16],[3,22],[3,28],[9,29],[15,30],[22,29],[29,30],[35,28],[36,22],[24,14],[29,17],[33,13],[12,10],[18,11],[6,12],[16,25],[22,24],[27,26],[31,23]];
  floresta.forEach(function(t){ arv(b,t[0],t[1]); });
  prop(b,20,7,'toco','#7a5a3a');
  b.forrageio=[{tx:24,ty:20},{tx:11,ty:27},{tx:30,ty:10},{tx:17,ty:16}];
  b.saidas.push({ edge:'l', from:14, to:24, alvo:'praca', ex:1*TILE+10, ey:18*TILE });
  b.saidas.push({ edge:'s', from:14, to:26, alvo:'rio', ex:18*TILE, ey:1*TILE+12 });
  b.luzes.push({tx:10,ty:20});
  MAPAS.bosque=b;

  /* RIO 36x28 */
  var r = novoMapa('rio',36,28,'#6db35c','#5fa550'); borda(r);
  for (var y=18;y<28;y++) for(var x=0;x<36;x++){ r.agua.push({x:x,y:y}); }
  sol(r,0,20,36,8);
  // doca
  prop(r,16,17,'doca','#7a5a3a');
  r.pescaSpot={tx:17,ty:18};
  [[3,3],[10,4],[18,3],[26,4],[33,3],[3,10],[33,11],[7,14]].forEach(function(t){ arv(r,t[0],t[1]); });
  prop(r,6,9,'toco','#7a5a3a');
  r.saidas.push({ edge:'n', from:12, to:26, alvo:'bosque', ex:18*TILE, ey:32*TILE-16 });
  MAPAS.rio=r;
}

/* ================================================================
   MOTOR
   ================================================================ */
var cv, ctx, VW, VH, SC=3;
var cam={x:0,y:0};
var teclas={};
var jogador={ x:0,y:0, dir:0, wf:0, animT:0, mv:false, act:0 };
var npcState={};
var particulas=[], flutuantes=[];
var pausado=true, jogoPronto=false;
var promptTxt='';
var lastT=0;
var chuvaPart=[];
var mapaAtual=null;

function p111() {}

function tileSolido(px,py,m){
  if (px<0||py<0||px>=m.w*TILE||py>=m.h*TILE) return true;
  for (var i=0;i<m.solidos.length;i++){
    var s=m.solidos[i];
    if (px>=s.x && px<s.x+s.w && py>=s.y && py<s.y+s.h) return true;
  }
  return false;
}
function colideCaixa(cx,cy,m){
  var fx=cx-5, fy=cy+4, fw=10, fh=5;
  var pts=[[fx,fy],[fx+fw,fy],[fx,fy+fh],[fx+fw,fy+fh],[cx,fy+fh]];
  for (var i=0;i<pts.length;i++) if (tileSolido(pts[i][0],pts[i][1],m)) return true;
  return false;
}

function trocaMapa(alvo, ex, ey){
  var f=$('fade'); f.style.opacity='1';
  pausado=true;
  setTimeout(function(){
    E.mapa=alvo; mapaAtual=MAPAS[alvo];
    jogador.x=ex; jogador.y=ey; E.px=ex; E.py=ey;
    cam.x=clamp(jogador.x-VW/2,0,Math.max(0,mapaAtual.w*TILE-VW));
    cam.y=clamp(jogador.y-VH/2,0,Math.max(0,mapaAtual.h*TILE-VH));
    reposNPCs();
    setTimeout(function(){ f.style.opacity='0'; pausado=false; }, 60);
  }, 230);
}

function reposNPCs(){
  Object.keys(NPCS).forEach(function(nk){
    var alvo=alvoRotina(nk);
    npcState[nk]=npcState[nk]||{x:0,y:0,dir:0,wf:0,animT:0};
    npcState[nk].mapa=alvo.m;
    npcState[nk].x=alvo.x*TILE+8; npcState[nk].y=alvo.y*TILE+8;
    npcState[nk].tx=alvo.x*TILE+8; npcState[nk].ty=alvo.y*TILE+8;
  });
}
function alvoRotina(nk){
  var rot=NPCS[nk].rotina, cur=rot[0];
  for (var i=0;i<rot.length;i++) if (rot[i].h<=E.hora) cur=rot[i];
  return { m:cur.m, x:cur.x, y:cur.y };
}

/* ---------------- input ---------------- */
function onKey(e){
  var k=e.key.toLowerCase();
  var down=e.type==='keydown';
  if (['arrowup','arrowdown','arrowleft','arrowright',' '].indexOf(k)!==-1) e.preventDefault();
  if (k==='w'||k==='arrowup') teclas.up=down;
  else if (k==='s'||k==='arrowdown') teclas.down=down;
  else if (k==='a'||k==='arrowleft') teclas.left=down;
  else if (k==='d'||k==='arrowright') teclas.right=down;
  else if (k==='shift') teclas.run=down;
  else if (down && (k==='e'||k===' ')) { if(!algumPainel()) interagir(); }
  else if (down && k>='1' && k<='8') { E.hot=parseInt(k,10)-1; renderHotbar(); }
  else if (down && k==='escape'){ if(algumPainel()) fecharTudo(); else abrirPainel('p-menu'); }
}
function onWheel(e){
  if (algumPainel()) return;
  E.hot = (E.hot + (e.deltaY>0?1:7)) % 8;
  renderHotbar();
}

/* ---------------- interação ---------------- */
function dist(ax,ay,bx,by){ var dx=ax-bx,dy=ay-by; return Math.sqrt(dx*dx+dy*dy); }
function tileFrente(){
  var tx=Math.floor(jogador.x/TILE), ty=Math.floor(jogador.y/TILE);
  if (jogador.dir===0) ty++; else if (jogador.dir===1) ty--; else if (jogador.dir===2) tx--; else tx++;
  return {tx:tx,ty:ty};
}

function interagir(){
  if (pausado) return;
  var m=mapaAtual;

  // NPC por perto?
  var nkPerto=null;
  Object.keys(NPCS).forEach(function(nk){
    var s=npcState[nk]; if(!s||s.mapa!==E.mapa) return;
    if (dist(jogador.x,jogador.y,s.x,s.y) < 26) nkPerto=nk;
  });
  if (nkPerto){ falarNPC(nkPerto); return; }

  // aula por perto?
  for (var i=0;i<AULAS.length;i++){
    var L=AULAS[i].local; if (L.mapa!==E.mapa) continue;
    if (dist(jogador.x,jogador.y, L.tx*TILE+8, L.ty*TILE+8) < 26){
      if (aulaLiberada(i)) iniciarAula(i);
      else toast('Trancada','Termine a aula anterior primeiro.');
      return;
    }
  }

  // prédio-loja por perto?
  for (var q=0;q<m.predios.length;q++){
    var pr=m.predios[q];
    if (pr.acao && pr.acao.tipo==='loja'){
      if (dist(jogador.x,jogador.y, pr.portaX*TILE+8, pr.portaY*TILE) < 30){ abrirLoja(pr.acao.npc); return; }
    }
  }

  // cama?
  if (m.cama && dist(jogador.x,jogador.y, m.cama.tx*TILE+8, m.cama.ty*TILE+8) < 26){ dormir(); return; }
  // caixa de remessa?
  if (m.remessa && dist(jogador.x,jogador.y, m.remessa.tx*TILE+8, m.remessa.ty*TILE+8) < 26){ abrirRemessa(); return; }
  // cafeteira -> café grátis 1x/dia? Não: interage = pega café se tiver copo... simplifica: nada.

  // easter egg por perto?
  for (var g=0;g<EGGS.length;g++){
    var eg=EGGS[g]; if (eg.mapa!==E.mapa || eggFeito(eg.id)) continue;
    if (dist(jogador.x,jogador.y, eg.tx*TILE+8, eg.ty*TILE+8) < 22){ coletarEgg(eg); return; }
  }

  // pesca (rio, lupa, perto da água)
  var it=itemSel();
  if (m.pescaSpot && it && it.id==='lupa' && dist(jogador.x,jogador.y,m.pescaSpot.tx*TILE+8,m.pescaSpot.ty*TILE+8)<40){ pescar(); return; }

  // forrageio (bosque)
  if (m.forrageio){
    for (var f=0;f<m.forrageio.length;f++){
      var fr=m.forrageio[f]; if(fr.colhido) continue;
      if (dist(jogador.x,jogador.y,fr.tx*TILE+8,fr.ty*TILE+8)<22){
        fr.colhido=true; var pk = Math.random()<0.5?'ementa':'cravo';
        invAdd(pk,1); flutua(jogador.x,jogador.y-18,'+ '+ITENS[pk].nome,'#2e7d5b'); spawnPoeira(fr.tx*TILE+8,fr.ty*TILE+12,'#8fd07a');
        setTimeout(function(fr2){ return function(){ fr2.colhido=false; }; }(fr), 1000*60);
        return;
      }
    }
  }

  // ferramentas na baia de trabalho (escritório)
  if (E.mapa==='escritorio' && m.plantio){
    var tf=tileFrente();
    var dentro = tf.tx>=m.plantio.x0 && tf.tx<=m.plantio.x1 && tf.ty>=m.plantio.y0 && tf.ty<=m.plantio.y1;
    var kk=keyt(tf.tx,tf.ty);
    if (it && it.id==='caneta' && dentro){
      if (!E.tilled[kk] && !tileSolido(tf.tx*TILE+8,tf.ty*TILE+8,m)){
        if (gastarFoco(6)){ E.tilled[kk]=1; spawnPoeira(tf.tx*TILE+8,tf.ty*TILE+10,'#7a5a3a'); jogador.act=0.3; }
      }
      return;
    }
    if (it && ITENS[it.id] && ITENS[it.id].tipo==='semente' && E.tilled[kk] && !E.plants[kk]){
      E.plants[kk]={cultivo:ITENS[it.id].cultivo, estagio:0, prot:false};
      invRemove(it.id,1); spawnPoeira(tf.tx*TILE+8,tf.ty*TILE+8,'#8fd07a'); jogador.act=0.3;
      return;
    }
    if (it && it.id==='carimbo' && E.plants[kk] && !E.plants[kk].prot){
      if (gastarFoco(4)){ E.plants[kk].prot=true; spawnPoeira(tf.tx*TILE+8,tf.ty*TILE+8,'#e7b84f'); jogador.act=0.3; }
      return;
    }
    // colher (mão / qualquer coisa) planta pronta
    if (E.plants[kk]){
      var pl=E.plants[kk], C=CULTIVOS[pl.cultivo];
      if (pl.estagio>=C.dias){
        invAdd(C.produto,1); delete E.plants[kk];
        E.skill.processos += C.xp;
        flutua(tf.tx*TILE+8, tf.ty*TILE-8, '+ '+ITENS[C.produto].nome, '#b8362e');
        spawnPoeira(tf.tx*TILE+8,tf.ty*TILE+4,C.cor);
        return;
      }
    }
  }

  // comer item selecionado
  if (it && ITENS[it.id] && ITENS[it.id].tipo==='comida'){
    E.foco=Math.min(E.focoMax, E.foco+ITENS[it.id].foco);
    invRemove(it.id,1); flutua(jogador.x,jogador.y-18,'+'+ITENS[it.id].foco+' foco','#e7b84f'); atualizaHud();
    return;
  }
}

function gastarFoco(n){
  if (E.foco<n){ toast('Sem foco','Coma um cafézinho/marmita ou vá dormir.'); return false; }
  E.foco-=n; atualizaHud(); return true;
}

/* ---------------- NPC ---------------- */
var falaIdx={};
function falarNPC(nk){
  var N=NPCS[nk]; falaIdx[nk]=(falaIdx[nk]||0);
  var fala=N.falas[falaIdx[nk]%N.falas.length]; falaIdx[nk]++;
  if (E.npc[nk].pd!==E.dia){ E.npc[nk].amiz=Math.min(100,E.npc[nk].amiz+3); E.npc[nk].pd=E.dia; }
  var it=itemSel();
  var podePresente = it && ITENS[it.id] && ITENS[it.id].tipo!=='ferramenta' && ITENS[it.id].tipo!=='comida';
  abrirDlgSimples(N.nome, N.cargo, fala, podePresente ? [
    {txt:'Dar "'+ITENS[it.id].nome+'"', fn:function(){
      var gosta = N.gosta && N.gosta.indexOf(it.id)!==-1;
      E.npc[nk].amiz=Math.min(100,E.npc[nk].amiz+(gosta?12:4));
      invRemove(it.id,1);
      abrirDlgSimples(N.nome,N.cargo, gosta?'Ah, adorei! Muito obrigado(a).':'Obrigado(a), que gentileza.', []);
      atualizaHud();
    }},
    {txt:'Só conversar', fn:fecharDlg}
  ] : []);
}

/* ---------------- easter egg ---------------- */
function coletarEgg(eg){
  if (!eggFeito(eg.id)){
    prog.easterEggs.push(eg.id); salvarProgresso(); spawnPoeira(jogador.x,jogador.y-8,'#ffe08a',18);
  }
  toast('🥚 '+eg.titulo+'  ('+prog.easterEggs.length+'/'+EGGS.length+')', eg.texto);
  atualizaHud();
}

/* ---------------- pesca (minigame simples) ---------------- */
var pescaSt=null;
function pescar(){
  if (pescaSt) return;
  pescaSt={ fase:'esperar', t:0, alvo:1+Math.random()*2.2, barra:0, pos:0.5, dir:1, tempo:0 };
  pausado=true; toast('Triagem no DJEN','Aguarde a mordida… (o jogo continua na barra que vai aparecer)');
  var loop=setInterval(function(){
    if (!pescaSt){ clearInterval(loop); return; }
    var s=pescaSt; s.t+=0.05;
    if (s.fase==='esperar'){
      if (s.t>=s.alvo){ s.fase='fisga'; s.t=0; toastEsconde(); toast('Fisgou!','Aperte E / espaço agora!'); }
    } else if (s.fase==='fisga'){
      if (s.t>1.1){ pescaSt=null; pausado=false; clearInterval(loop); toast('Escapou','A publicação sumiu na lista. Tente de novo.'); }
    } else if (s.fase==='puxar'){
      s.tempo+=0.05;
      s.pos += s.dir*0.02; if (s.pos>0.9||s.pos<0.1) s.dir*=-1;
      var seg = (teclas.pescaHold ? 0.03 : -0.02);
      s.barra = clamp(s.barra + seg, 0, 1);
      // "peixe" alvo se move devagar
      s.peixe = 0.5 + Math.sin(s.tempo*1.6)*0.32;
      var perto = Math.abs(s.barra - s.peixe) < 0.16;
      s.prog = clamp((s.prog||0) + (perto?0.012:-0.010), 0, 1);
      if (s.prog>=1){ pescaSt=null; pausado=false; clearInterval(loop); ganhoPesca(); }
      else if (s.tempo>14){ pescaSt=null; pausado=false; clearInterval(loop); toast('Cansou','A vara escapou. Tente de novo.'); }
    }
  }, 50);
}
function ganhoPesca(){
  var r=Math.random(); var pk = r<0.15?'ementa':'publicacao';
  invAdd(pk,1);
  toast('Achou!', 'Uma '+ITENS[pk].nome+' na triagem do DJEN. (Vale R$ '+ITENS[pk].preco+' na Caixa de Remessa.)');
  flutua(jogador.x,jogador.y-18,'+ '+ITENS[pk].nome,'#3a6a9a');
}

/* ---------------- dormir / novo dia ---------------- */
function dormir(){
  var f=$('fade'); f.style.opacity='1'; pausado=true; fecharTudo();
  setTimeout(function(){
    // crescimento
    var choveu = E.clima==='chuva';
    Object.keys(E.plants).forEach(function(k){
      var pl=E.plants[k]; if (pl.prot || choveu){ pl.estagio++; }
      pl.prot=false;
    });
    // venda
    if (E.vendaPendente>0){ E.dinheiro+=E.vendaPendente; E.vendaPendente=0; }
    // novo dia
    var tarde = E.hora>=24*60;
    E.dia++; E.hora=6*60;
    E.foco = tarde ? Math.round(E.focoMax*0.6) : E.focoMax;
    E.clima = Math.random()<0.30 ? 'chuva':'sol';
    // volta pro escritório na cama
    E.mapa='escritorio'; mapaAtual=MAPAS.escritorio;
    jogador.x=MAPAS.escritorio.cama.tx*TILE+8; jogador.y=(MAPAS.escritorio.cama.ty+1)*TILE+8;
    E.px=jogador.x; E.py=jogador.y;
    reposNPCs(); atualizaHud();
    salvarTudo();
    toast('Dia '+E.dia, (choveu?'Choveu — seus casos andaram sozinhos. ':'') + (E.clima==='chuva'?'Hoje: chuva ☔':'Hoje: sol ☀'));
    setTimeout(function(){ f.style.opacity='0'; pausado=false; }, 80);
  }, 400);
}

/* ---------------- remessa (vender) ---------------- */
function abrirRemessa(){
  var lista=$('loja-lista'); $('loja-nome').textContent='Caixa de Remessa — vender';
  var itens=[];
  E.inv.forEach(function(s,i){ if(s && ITENS[s.id] && ITENS[s.id].tipo==='produto') itens.push({i:i,id:s.id,qt:s.qt}); });
  if (!itens.length){ lista.innerHTML='<div class="vazio" style="grid-column:1/-1">Nada para vender. Produza sentenças ou pesque publicações.</div>'; }
  else lista.innerHTML = itens.map(function(x){
    return '<div class="loja-item"><canvas class="ii" data-id="'+x.id+'"></canvas><div><div class="li-n">'+esc(ITENS[x.id].nome)+' ×'+x.qt+'</div><div class="li-p">R$ '+ITENS[x.id].preco+' cada</div></div><button data-sell="'+x.i+'">vender 1</button></div>';
  }).join('');
  $('loja-saldo').textContent = 'Recebe amanhã: R$ '+E.vendaPendente+'  ·  Saldo: R$ '+E.dinheiro;
  pintarIconesLoja();
  Array.prototype.forEach.call(lista.querySelectorAll('[data-sell]'), function(b){
    b.onclick=function(){
      var i=parseInt(b.dataset.sell,10); var s=E.inv[i]; if(!s) return;
      E.vendaPendente += ITENS[s.id].preco; invRemove(s.id,1);
      abrirRemessa();
    };
  });
  abrirPainel('p-loja');
}

/* ---------------- loja ---------------- */
function abrirLoja(nk){
  $('loja-nome').textContent = (NPCS[nk] ? NPCS[nk].nome : 'Cartório') + ' — comprar';
  var lista=$('loja-lista');
  lista.innerHTML = LOJA.map(function(id){
    var d=ITENS[id];
    return '<div class="loja-item"><canvas class="ii" data-id="'+id+'"></canvas><div><div class="li-n">'+esc(d.nome)+'</div><div class="li-p">R$ '+d.preco+'</div></div><button data-buy="'+id+'">comprar</button></div>';
  }).join('');
  $('loja-saldo').textContent = 'Saldo: R$ '+E.dinheiro;
  pintarIconesLoja();
  Array.prototype.forEach.call(lista.querySelectorAll('[data-buy]'), function(b){
    b.onclick=function(){
      var id=b.dataset.buy, d=ITENS[id];
      if (E.dinheiro < d.preco){ b.textContent='sem R$'; setTimeout(function(){ b.textContent='comprar'; },700); return; }
      if (!invAdd(id,1)){ b.textContent='mochila cheia'; setTimeout(function(){ b.textContent='comprar'; },900); return; }
      E.dinheiro-=d.preco; $('loja-saldo').textContent='Saldo: R$ '+E.dinheiro; atualizaHud(); renderHotbar();
    };
  });
  abrirPainel('p-loja');
}
function pintarIconesLoja(){
  Array.prototype.forEach.call(document.querySelectorAll('#loja-lista .ii'), function(c){
    var ic=iconeItem(c.dataset.id); c.width=28; c.height=28;
    var g=c.getContext('2d'); g.imageSmoothingEnabled=false; g.clearRect(0,0,28,28); g.drawImage(ic,0,0,28,28);
  });
}

/* ---------------- painéis ---------------- */
function algumPainel(){ return document.querySelector('.painel.on') != null; }
function abrirPainel(id){
  Array.prototype.forEach.call(document.querySelectorAll('.painel.on'), function(p){ p.classList.remove('on'); });
  pausado=true; $(id).classList.add('on');
}
function fecharTudo(){
  Array.prototype.forEach.call(document.querySelectorAll('.painel.on'), function(p){ p.classList.remove('on'); });
  if (!sessao && !pescaSt) pausado=false;
}
['dlg-x','loja-x','menu-x','ajuda-x','gestor-x'].forEach(function(id){ var e=$(id); if(e) e.onclick=function(){ if(id==='dlg-x') fecharDlg(); else fecharTudo(); }; });
$('b-menu').onclick=function(){ abrirPainel('p-menu'); };
$('b-ajuda').onclick=function(){ abrirPainel('p-ajuda'); };
$('m-voltar').onclick=fecharTudo;
$('m-ajuda').onclick=function(){ abrirPainel('p-ajuda'); };
$('m-salvar').onclick=function(){ salvarTudo(); toast('Salvo','Progresso e jogo guardados na sua conta.'); fecharTudo(); };
$('m-dormir').onclick=function(){ fecharTudo(); dormir(); };

/* ---------------- diálogo simples ---------------- */
function abrirDlgSimples(nome, tag, txt, opcoes){
  $('dlg-nome').firstChild.textContent = nome+' ';
  $('dlg-tag').textContent = tag||'';
  $('dlg-corpo').className='corpo'; $('dlg-corpo').textContent = txt;
  var esc2=$('dlg-escolhas'); esc2.innerHTML='';
  (opcoes||[]).forEach(function(o){
    var b=document.createElement('button'); b.className='escolha'; b.textContent=o.txt; b.onclick=o.fn; esc2.appendChild(b);
  });
  $('dlg-rodape').innerHTML = (opcoes&&opcoes.length)?'':'<button class="bt claro" id="ds-ok">ok</button>';
  if ($('ds-ok')) $('ds-ok').onclick=fecharDlg;
  abrirPainel('p-dlg');
}

/* ---------------- AULA (lição + quiz) ---------------- */
var sessao=null, twTok=0, twDone=null;
function tw(txt, plano){
  twTok++; var meu=twTok; var el=$('dlg-corpo');
  el.classList.add('tw');
  if (plano===false){ el.innerHTML=txt; el.classList.remove('tw'); twDone=null; return; }
  el.textContent=''; var t=txt, i=0;
  twDone=function(){ if(meu===twTok){ el.textContent=t; el.classList.remove('tw'); twDone=null; } };
  (function passo(){ if(meu!==twTok) return; i+=2; el.textContent=t.slice(0,i); if(i<t.length) setTimeout(passo,16); else { el.classList.remove('tw'); twDone=null; } })();
}
function falasDaAula(A,idx){
  var fs=[{t:'fala',x:'Aula '+(idx+1)+': '+A.titulo+'. '+A.emoji}];
  A.licao.forEach(function(b){
    if (b.h) fs.push({t:'titulo',x:b.h});
    else if (b.p) fs.push({t:'fala',x:b.p});
    else if (b.callout) fs.push({t:'dica',x:b.callout});
    else if (b.ul) fs.push({t:'lista',itens:b.ul});
  });
  fs.push({t:'fala',x:'Agora '+A.quiz.length+' pergunta(s). Presta atenção!'});
  return fs;
}
function iniciarAula(idx){
  var A=AULAS[idx];
  sessao={A:A,idx:idx,fs:falasDaAula(A,idx),fi:0,qi:0,acertos:0};
  pausado=true;
  $('dlg-nome').firstChild.textContent='FBzinho ';
  $('dlg-tag').textContent='aula '+(idx+1)+': '+(A.curto||A.titulo);
  abrirPainel('p-dlg');
  mostraFala();
}
function mostraFala(){
  var s=sessao; if(!s) return;
  if (s.fi>=s.fs.length){ iniciaQuiz(); return; }
  var fa=s.fs[s.fi];
  $('dlg-escolhas').innerHTML='';
  $('dlg-corpo').className='corpo'+(fa.t==='dica'?' dica':fa.t==='titulo'?' titulo':'');
  if (fa.t==='lista') tw('<ul>'+fa.itens.map(function(i){return '<li>'+esc(i)+'</li>';}).join('')+'</ul>', false);
  else tw(fa.x);
  var ult = s.fi===s.fs.length-1;
  $('dlg-rodape').innerHTML='<span class="hint">'+(s.fi+1)+' / '+s.fs.length+'</span><button class="bt" id="dn">'+(ult?'Ao quiz! ▶':'Continuar ▶')+'</button>';
  $('dn').onclick=function(){ if(twDone){ twDone(); return; } s.fi++; mostraFala(); };
}
function iniciaQuiz(){ sessao.qi=0; sessao.acertos=0; mostraPergunta(); }
function mostraPergunta(){
  var s=sessao, q=s.A.quiz[s.qi];
  $('dlg-corpo').className='corpo';
  tw('Pergunta '+(s.qi+1)+' de '+s.A.quiz.length+': '+q.q);
  $('dlg-escolhas').innerHTML=q.opcoes.map(function(op,oi){ return '<button class="escolha" data-oi="'+oi+'">'+esc(op)+'</button>'; }).join('');
  $('dlg-rodape').innerHTML='<span class="hint">Escolha uma resposta</span>';
  Array.prototype.forEach.call($('dlg-escolhas').querySelectorAll('.escolha'), function(b){ b.onclick=function(){ responde(parseInt(b.dataset.oi,10)); }; });
}
function responde(oi){
  var s=sessao, q=s.A.quiz[s.qi], ok=oi===q.correta;
  if (ok) s.acertos++;
  Array.prototype.forEach.call($('dlg-escolhas').querySelectorAll('.escolha'), function(b){
    b.disabled=true; var bi=parseInt(b.dataset.oi,10);
    if (bi===q.correta) b.classList.add('certa'); else if (bi===oi) b.classList.add('errada');
  });
  $('dlg-corpo').className='corpo dica';
  tw((ok?'Boa! ':'Quase! ')+(q.explica||''));
  var ult=s.qi===s.A.quiz.length-1;
  $('dlg-rodape').innerHTML='<span class="hint">'+s.acertos+' certo(s)</span><button class="bt" id="dn">'+(ult?'Ver resultado ▶':'Próxima ▶')+'</button>';
  $('dn').onclick=function(){ if(ult) resultado(); else { s.qi++; mostraPergunta(); } };
}
function resultado(){
  var s=sessao, tot=s.A.quiz.length, min=Math.ceil(tot*PASS);
  var passou=s.acertos>=min, jaFeita=aulaFeita(s.A.id), ult=s.idx===AULAS.length-1;
  $('dlg-escolhas').innerHTML=''; $('dlg-corpo').className='corpo';
  if (passou){
    if (!jaFeita) salvarConclusao(s.A.id, s.acertos, tot);
    var msg = jaFeita ? ('Você fez '+s.acertos+'/'+tot+'. Revisão concluída! 🎉')
      : (ult ? ('PERFEITO! '+s.acertos+'/'+tot+'. Você terminou as 10 aulas — está pronto(a). Seu diploma está lá em cima! 🎓')
             : ('Mandou bem! '+s.acertos+'/'+tot+'. A próxima aula tá liberada — anda pela comarca e procura o próximo marcador ⚖️.'));
    tw(msg);
    $('dlg-rodape').innerHTML = (ult&&!jaFeita)
      ? '<button class="bt ouro" id="rc">🏅 Ver diploma</button><button class="bt claro" id="rm">Voltar</button>'
      : '<button class="bt verde" id="rm">Voltar ao jogo ▶</button>';
    if ($('rc')) $('rc').onclick=function(){ fecharDlg(); abrirDiploma(); };
    if ($('rm')) $('rm').onclick=fecharDlg;
  } else {
    tw('Você fez '+s.acertos+'/'+tot+' e o mínimo é '+min+'. Sem crise — revisa e tenta de novo!');
    $('dlg-rodape').innerHTML='<button class="bt" id="rq">Refazer o quiz</button><button class="bt claro" id="rl">Rever a conversa</button><button class="bt claro" id="rm">Voltar</button>';
    $('rq').onclick=function(){ sessao.qi=0; sessao.acertos=0; mostraPergunta(); };
    $('rl').onclick=function(){ sessao.fi=0; mostraFala(); };
    $('rm').onclick=fecharDlg;
  }
}
function fecharDlg(){
  twTok++; $('p-dlg').classList.remove('on');
  $('dlg-corpo').className='corpo'; $('dlg-corpo').innerHTML=''; $('dlg-escolhas').innerHTML=''; $('dlg-rodape').innerHTML='';
  $('dlg-nome').firstChild.textContent='FBzinho '; $('dlg-tag').textContent='seu guia';
  sessao=null; if(!pescaSt) pausado=false;
  atualizaHud();
}

/* ---------------- persistência ---------------- */
function recalcPontos(c){ return Object.keys(c).reduce(function(a,id){ return a+(c[id].pontos||0); },0); }
function salvarConclusao(id,pt,tot){
  prog.concluidas[id]={pontos:pt,total:tot,em:Date.now()};
  prog.pontosTotais=recalcPontos(prog.concluidas); prog.nome=meuNome;
  atualizaHud(); salvarProgresso();
}
function salvarProgresso(){ salvarTudo(); }
function salvarTudo(){
  E.px=jogador.x; E.py=jogador.y;
  try { localStorage.setItem('fbzinho-comarca', JSON.stringify({prog:prog, E:E})); } catch(e){}
  if (!progRef) return;
  var tudo = Object.keys(prog.concluidas).length >= AULAS.length;
  if (tudo && !prog.concluidoEm) prog.concluidoEm = Date.now();
  var payload = {
    concluidas: prog.concluidas, pontosTotais: prog.pontosTotais,
    easterEggs: prog.easterEggs, nome: meuNome, jogoEstado: E,
    atualizadoEm: firebase.firestore.FieldValue.serverTimestamp()
  };
  if (tudo) payload.concluidoEm = prog.concluidoEm;
  progRef.set(payload, { merge:true }).catch(function(err){ console.warn('save:', err && err.message); });
}
function carregar(cb){
  var local=null;
  try { local = JSON.parse(localStorage.getItem('fbzinho-comarca')||'null'); } catch(e){}
  function aplica(d){
    if (d && d.concluidas){ prog.concluidas=d.concluidas||{}; prog.pontosTotais=d.pontosTotais||recalcPontos(prog.concluidas); prog.easterEggs=Array.isArray(d.easterEggs)?d.easterEggs:[]; prog.concluidoEm=d.concluidoEm||null; prog.nome=d.nome||''; }
    var je = d && d.jogoEstado;
    E = je && je.inv ? je : (local && local.E && local.E.inv ? local.E : estadoNovo());
    // sanidade
    if (!E.npc) E.npc={ helena:{amiz:0,pd:0}, tiberio:{amiz:0,pd:0}, iris:{amiz:0,pd:0} };
    if (!E.skill) E.skill={processos:0};
    if (!MAPAS[E.mapa]) E.mapa='escritorio';
    if (cb) cb();
  }
  if (progRef){
    progRef.get().then(function(doc){ aplica(doc.exists ? doc.data() : (local&&local.prog?Object.assign({},local.prog,{jogoEstado:local.E}):null)); })
      .catch(function(){ aplica(local?Object.assign({},local.prog,{jogoEstado:local.E}):null); });
  } else {
    aplica(local?Object.assign({},local.prog,{jogoEstado:local.E}):null);
  }
}

/* ---------------- diploma ---------------- */
function abrirDiploma(){
  if (Object.keys(prog.concluidas).length < AULAS.length){ toast('Ainda não','Conclua as 10 aulas para o diploma.'); return; }
  var nome=meuNome||prog.nome||'Colaborador(a)';
  var dataStr=new Date(prog.concluidoEm||Date.now()).toLocaleDateString('pt-BR',{day:'2-digit',month:'long',year:'numeric'});
  var extra = prog.easterEggs.length>=EGGS.length ? ' Encontrou tambem todos os '+EGGS.length+' easter eggs sobre advocacia, tribunais e o CPC.' : '';
  var w=window.open('','_blank'); if(!w){ toast('Pop-up bloqueado','Permita pop-ups para abrir o diploma.'); return; }
  w.document.write('<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Diploma — '+esc(nome)+'</title><style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:"Segoe UI",system-ui,sans-serif;background:#1a1210;padding:40px;display:flex;justify-content:center}.c{width:900px;max-width:100%;background:#faf6f0;color:#241c1b;border:2px solid #b8362e;border-radius:8px;padding:56px 60px;text-align:center;position:relative}.c::after{content:"";position:absolute;inset:14px;border:1px solid #d8b25a;border-radius:4px}.k{letter-spacing:.32em;font-size:.8rem;color:#b8362e;font-weight:700;text-transform:uppercase}h1{font-family:Georgia,serif;font-size:2.5rem;margin:18px 0 6px}.s{color:#7d716b;font-size:.95rem;margin-bottom:34px}.n{font-family:Georgia,serif;font-size:2rem;color:#5c1a16;border-bottom:2px solid #d8b25a;display:inline-block;padding:0 30px 8px;margin-bottom:26px}.b{font-size:1rem;line-height:1.7;max-width:640px;margin:0 auto 36px}.p{font-weight:700;color:#b8362e}.r{display:flex;justify-content:space-between;font-size:.85rem;color:#7d716b;margin-top:40px}@media print{body{background:#fff;padding:0}.np{display:none}}.np{margin-top:24px;text-align:center}button{padding:10px 22px;border-radius:22px;border:1px solid #b8362e;background:#b8362e;color:#fff;font-weight:700;cursor:pointer}</style></head><body><div class="c"><div class="k">Fonseca e Braga Advocacia</div><h1>Diploma de Integracao</h1><div class="s">Comarca do FBzinho — Portal Interno</div><div>Certificamos que</div><div class="n">'+esc(nome)+'</div><div class="b">concluiu todas as '+AULAS.length+' aulas da Trilha de Integracao, demonstrando conhecimento sobre a estrutura do escritorio, o Portal interno, os sistemas utilizados, as rotinas de atendimento, os prazos e a seguranca da informacao, com <span class="p">'+prog.pontosTotais+' de '+pontosPossiveis+' pontos</span>.'+extra+'</div><div style="font-size:2.2rem">&#9878;</div><div class="r"><span>Emitido em '+esc(dataStr)+'</span><span>Portal Fonseca e Braga</span></div></div><div class="np"><button onclick="window.print()">Imprimir / Salvar PDF</button></div></body></html>');
  w.document.close();
}
$('b-diploma').onclick=abrirDiploma;

/* ---------------- gestor ---------------- */
var gestorCarregado=false;
$('b-gestor').onclick=function(){ abrirPainel('p-gestor'); if(!gestorCarregado) carregarGestor(); };
function carregarGestor(){
  gestorCarregado=true;
  if (!db){ $('gestor-body').innerHTML='<div class="vazio">Sem conexão.</div>'; return; }
  Promise.all([ db.collection('treinamentoProgresso').get(), db.collection('organograma').get().catch(function(){ return {docs:[]}; }) ])
  .then(function(res){
    var progs=res[0].docs.map(function(d){ return Object.assign({uid:d.id}, d.data()); });
    var nomes={}; res[1].docs.forEach(function(d){ nomes[d.id]=(d.data()&&d.data().displayName)||''; });
    if (!progs.length){ $('gestor-body').innerHTML='<div class="vazio">Ninguém começou a trilha ainda.</div>'; return; }
    progs.sort(function(a,b){ return (b.concluidas?Object.keys(b.concluidas).length:0)-(a.concluidas?Object.keys(a.concluidas).length:0); });
    $('gestor-body').innerHTML='<table class="prog"><thead><tr><th>Colaborador</th><th>Aulas</th><th>Progresso</th><th>Pontos</th><th>Eggs</th><th>Status</th></tr></thead><tbody>'+
      progs.map(function(p){
        var f=p.concluidas?Object.keys(p.concluidas).length:0, pct=Math.round(f/AULAS.length*100);
        var ne=Array.isArray(p.easterEggs)?p.easterEggs.length:0;
        return '<tr><td>'+esc(nomes[p.uid]||p.nome||'(sem nome)')+'</td><td>'+f+' / '+AULAS.length+'</td><td><div class="mt"><div class="mf" style="width:'+pct+'%"></div></div></td><td>'+(p.pontosTotais||0)+' / '+pontosPossiveis+'</td><td>'+ne+' / '+EGGS.length+'</td><td>'+(f>=AULAS.length?'<span style="color:#3f8f36;font-weight:800">✓ Concluída</span>':'Em andamento')+'</td></tr>';
      }).join('')+'</tbody></table>';
  }).catch(function(err){ $('gestor-body').innerHTML='<div class="vazio">Não foi possível carregar ('+esc(err&&err.message)+').</div>'; });
}

/* ---------------- toast / partículas ---------------- */
var toastTimer=null;
function toast(t,x){ $('toast-t').textContent=t; $('toast-x').textContent=x||''; $('toast').classList.add('on');
  if (toastTimer) clearTimeout(toastTimer); toastTimer=setTimeout(function(){ $('toast').classList.remove('on'); }, x&&x.length>60?8000:4500); }
function toastEsconde(){ $('toast').classList.remove('on'); }
function spawnPoeira(x,y,cor,n){
  n=n||8;
  for (var i=0;i<n;i++) particulas.push({x:x,y:y,vx:(Math.random()-0.5)*40,vy:-Math.random()*40-10,g:80,vida:0.5+Math.random()*0.4,cor:cor||'#ddd',r:1+Math.random()*1.5});
}
function flutua(x,y,txt,cor){ flutuantes.push({x:x,y:y,txt:txt,cor:cor||'#fff',vida:1.4}); }

/* ---------------- HUD / hotbar ---------------- */
function atualizaHud(){
  $('h-data').textContent='Dia '+E.dia+(E.clima==='chuva'?' ☔':' ☀');
  var hh=Math.floor(E.hora/60)%24, mm=Math.floor(E.hora%60);
  $('h-hora').textContent=(hh<10?'0':'')+hh+':'+(mm<10?'0':'')+mm;
  $('h-din').textContent='R$ '+E.dinheiro;
  $('h-foco').textContent='Foco '+Math.max(0,Math.round(E.foco));
  var f=Object.keys(prog.concluidas).length;
  $('h-aulas').textContent='Aulas '+f+'/'+AULAS.length;
  $('h-egg').textContent='🥚 '+prog.easterEggs.length+'/'+EGGS.length;
  $('b-diploma').style.display = f>=AULAS.length ? 'inline-block':'none';
}
function renderHotbar(){
  var hb=$('hotbar'); hb.innerHTML='';
  for (var i=0;i<8;i++){
    var s=E.inv[i];
    var d=document.createElement('div'); d.className='slot'+(i===E.hot?' sel':'');
    d.innerHTML='<span class="k">'+(i+1)+'</span>';
    if (s){ var c=document.createElement('canvas'); c.width=30; c.height=30; var g=c.getContext('2d'); g.imageSmoothingEnabled=false; g.drawImage(iconeItem(s.id),0,0,30,30); d.appendChild(c);
      if (ITENS[s.id] && ITENS[s.id].tipo!=='ferramenta'){ var q=document.createElement('span'); q.className='qt'; q.textContent=s.qt; d.appendChild(q); } }
    hb.appendChild(d);
  }
}

/* ================================================================
   UPDATE + RENDER
   ================================================================ */
function update(dt){
  if (!jogoPronto) return;
  // partículas / flutuantes sempre animam
  for (var i=particulas.length-1;i>=0;i--){ var p=particulas[i]; p.vida-=dt; if(p.vida<=0){ particulas.splice(i,1); continue; } p.vy+=p.g*dt; p.x+=p.vx*dt; p.y+=p.vy*dt; }
  for (var j=flutuantes.length-1;j>=0;j--){ var fl=flutuantes[j]; fl.vida-=dt; fl.y-=18*dt; if(fl.vida<=0) flutuantes.splice(j,1); }
  if (E.clima==='chuva'){
    if (chuvaPart.length<120) chuvaPart.push({x:Math.random()*VW, y:Math.random()*VH, v:260+Math.random()*160});
    for (var c=0;c<chuvaPart.length;c++){ var rp=chuvaPart[c]; rp.y+=rp.v*dt; rp.x-=40*dt; if(rp.y>VH){ rp.y=-8; rp.x=Math.random()*VW; } }
  } else chuvaPart.length=0;

  if (pausado) return;

  // relógio
  E.hora += dt * 1.7;
  if (E.hora >= 26*60){ dormir(); return; }

  // movimento
  var dx=0, dy=0;
  if (teclas.up) dy-=1; if (teclas.down) dy+=1; if (teclas.left) dx-=1; if (teclas.right) dx+=1;
  jogador.mv = (dx||dy)?true:false;
  if (jogador.mv){
    if (dy>0) jogador.dir=0; else if (dy<0) jogador.dir=1; else if (dx<0) jogador.dir=2; else if (dx>0) jogador.dir=3;
    var len=Math.sqrt(dx*dx+dy*dy)||1;
    var sp=(teclas.run?92:58)*dt;
    var nx=jogador.x + dx/len*sp, ny=jogador.y + dy/len*sp;
    if (!colideCaixa(nx,jogador.y,mapaAtual)) jogador.x=nx;
    else if (!colideCaixa(jogador.x + (dx>0?2:-2), jogador.y, mapaAtual) && dx) {} // parede
    if (!colideCaixa(jogador.x,ny,mapaAtual)) jogador.y=ny;
    jogador.animT+=dt; jogador.wf = Math.floor(jogador.animT*8)%2;
  } else { jogador.animT=0; jogador.wf=0; }
  if (jogador.act>0) jogador.act-=dt;

  // transições de borda
  var m=mapaAtual;
  m.saidas.forEach(function(sa){
    var tX=jogador.x/TILE, tY=jogador.y/TILE, ok=false;
    if (sa.edge==='o' && jogador.x < 6 && tY>=sa.from && tY<=sa.to) ok=true;
    if (sa.edge==='l' && jogador.x > m.w*TILE-6 && tY>=sa.from && tY<=sa.to) ok=true;
    if (sa.edge==='n' && jogador.y < 6 && tX>=sa.from && tX<=sa.to) ok=true;
    if (sa.edge==='s' && jogador.y > m.h*TILE-6 && tX>=sa.from && tX<=sa.to) ok=true;
    if (ok) trocaMapa(sa.alvo, sa.ex, sa.ey);
  });

  // NPCs
  Object.keys(NPCS).forEach(function(nk){
    var s=npcState[nk], al=alvoRotina(nk);
    if (s.mapa!==al.m){ s.mapa=al.m; s.x=al.x*TILE+8; s.y=al.y*TILE+8; }
    s.tx=al.x*TILE+8; s.ty=al.y*TILE+8;
    var ddx=s.tx-s.x, ddy=s.ty-s.y, dd=Math.sqrt(ddx*ddx+ddy*ddy);
    if (dd>1.5){
      var st=Math.min(dd, 34*dt);
      s.x+=ddx/dd*st; s.y+=ddy/dd*st;
      if (Math.abs(ddx)>Math.abs(ddy)) s.dir = ddx<0?2:3; else s.dir = ddy<0?1:0;
      s.animT=(s.animT||0)+dt; s.wf=Math.floor(s.animT*7)%2;
    } else { s.wf=0; }
  });

  // câmera
  var cx=jogador.x-VW/2, cy=jogador.y-VH/2;
  cam.x += (clamp(cx,0,Math.max(0,m.w*TILE-VW)) - cam.x)*Math.min(1,dt*8);
  cam.y += (clamp(cy,0,Math.max(0,m.h*TILE-VH)) - cam.y)*Math.min(1,dt*8);

  // prompt
  atualizaPrompt();
  atualizaHud();
}

function atualizaPrompt(){
  var m=mapaAtual, txt='';
  Object.keys(NPCS).forEach(function(nk){ var s=npcState[nk]; if(s&&s.mapa===E.mapa && dist(jogador.x,jogador.y,s.x,s.y)<26) txt='E — falar com '+NPCS[nk].nome; });
  for (var i=0;i<AULAS.length && !txt;i++){ var L=AULAS[i].local; if(L.mapa!==E.mapa) continue;
    if (dist(jogador.x,jogador.y,L.tx*TILE+8,L.ty*TILE+8)<26) txt = aulaLiberada(i) ? ('E — '+(aulaFeita(AULAS[i].id)?'revisar':'iniciar')+' aula: '+AULAS[i].titulo) : 'E — aula trancada'; }
  if (!txt) for (var q=0;q<m.predios.length;q++){ var pr=m.predios[q]; if(pr.acao&&pr.acao.tipo==='loja' && dist(jogador.x,jogador.y,pr.portaX*TILE+8,pr.portaY*TILE)<30){ txt='E — entrar no '+pr.nome; break; } }
  if (!txt && m.cama && dist(jogador.x,jogador.y,m.cama.tx*TILE+8,m.cama.ty*TILE+8)<26) txt='E — dormir (encerra o dia)';
  if (!txt && m.remessa && dist(jogador.x,jogador.y,m.remessa.tx*TILE+8,m.remessa.ty*TILE+8)<26) txt='E — Caixa de Remessa (vender)';
  if (!txt && m.pescaSpot){ var it=itemSel(); if(it&&it.id==='lupa' && dist(jogador.x,jogador.y,m.pescaSpot.tx*TILE+8,m.pescaSpot.ty*TILE+8)<40) txt='E — triagem de publicações (DJEN)'; }
  if (!txt) for (var g=0;g<EGGS.length;g++){ var eg=EGGS[g]; if(eg.mapa!==E.mapa||eggFeito(eg.id)) continue; if(dist(jogador.x,jogador.y,eg.tx*TILE+8,eg.ty*TILE+8)<22){ txt='E — examinar'; break; } }
  var el=$('prompt');
  if (txt && !algumPainel()){ el.textContent=txt; el.classList.add('on'); } else el.classList.remove('on');
}

/* ---------- render ---------- */
function tint(){
  var h=(E.hora/60)%24;
  var a=0, col='#0a0f2a';
  if (h<5) a=0.55; else if (h<7) a=0.55-(h-5)/2*0.5; else if (h<17) a=0.05; else if (h<20) a=0.05+(h-17)/3*0.4, col='#3a1a2a'; else if (h<22) a=0.45+(h-20)/2*0.1, col='#0a0f2a'; else a=0.55;
  return {a:Math.max(0,a), col:col};
}
function render(){
  if (!jogoPronto){ ctx.fillStyle='#111'; ctx.fillRect(0,0,cv.width,cv.height); return; }
  var m=mapaAtual;
  ctx.imageSmoothingEnabled=false;
  ctx.setTransform(1,0,0,1,0,0);
  ctx.fillStyle=m.base; ctx.fillRect(0,0,cv.width,cv.height);

  var ox=Math.round(-cam.x*SC), oy=Math.round(-cam.y*SC);
  ctx.setTransform(SC,0,0,SC, ox, oy);

  var t0x=Math.floor(cam.x/TILE)-1, t1x=Math.ceil((cam.x+VW)/TILE)+1;
  var t0y=Math.floor(cam.y/TILE)-1, t1y=Math.ceil((cam.y+VH)/TILE)+1;

  // chão (checker sutil)
  for (var ty=t0y;ty<t1y;ty++) for (var tx=t0x;tx<t1x;tx++){
    if (tx<0||ty<0||tx>=m.w||ty>=m.h) continue;
    ctx.fillStyle = ((tx+ty)&1) ? m.base : m.piso2;
    ctx.fillRect(tx*TILE,ty*TILE,TILE,TILE);
  }
  // água
  var wob=Math.sin(Date.now()/300)*1;
  m.agua.forEach(function(a){
    if (a.x<t0x||a.x>t1x||a.y<t0y||a.y>t1y) return;
    ctx.fillStyle='#3a78b0'; ctx.fillRect(a.x*TILE,a.y*TILE,TILE,TILE);
    ctx.fillStyle='#5b9bd0'; ctx.fillRect(a.x*TILE, a.y*TILE+ (((a.x+Math.floor(Date.now()/500))&1)?4:9), TILE, 2+wob);
  });
  // baias de trabalho (escritório)
  if (E.mapa==='escritorio'){
    Object.keys(E.tilled).forEach(function(k){
      var pr=k.split(','), tx=+pr[0], ty=+pr[1];
      ctx.fillStyle='#5a3d28'; ctx.fillRect(tx*TILE+1,ty*TILE+1,TILE-2,TILE-2);
      ctx.fillStyle='#6b4a30'; ctx.fillRect(tx*TILE+2,ty*TILE+3,TILE-4,2); ctx.fillRect(tx*TILE+2,ty*TILE+8,TILE-4,2);
    });
    // moldura do plantio
    var pa=m.plantio;
    ctx.strokeStyle='rgba(231,184,79,.35)'; ctx.lineWidth=1;
    ctx.strokeRect(pa.x0*TILE, pa.y0*TILE, (pa.x1-pa.x0+1)*TILE, (pa.y1-pa.y0+1)*TILE);
  }

  // lista y-sort
  var draws=[];
  m.predios.forEach(function(p){ draws.push({y:(p.ty+p.th)*TILE, f:function(){ drawPredio(p); }}); });
  m.arvores.forEach(function(a){ draws.push({y:a.y, f:function(){ drawArvore(a); }}); });
  m.props.forEach(function(p){ draws.push({y:p.y, f:function(){ drawProp(p); }}); });
  if (E.mapa==='escritorio') Object.keys(E.plants).forEach(function(k){
    var pr=k.split(','), tx=+pr[0], ty=+pr[1], pl=E.plants[k];
    draws.push({y:ty*TILE+15, f:function(){ drawPlanta(tx,ty,pl); }});
  });
  EGGS.forEach(function(eg){ if(eg.mapa===E.mapa && !eggFeito(eg.id)) draws.push({y:eg.ty*TILE+14, f:function(){ drawEgg(eg); }}); });
  AULAS.forEach(function(A,i){ if(A.local.mapa===E.mapa) draws.push({y:A.local.ty*TILE+2, f:function(){ drawMarcador(A,i); }}); });
  Object.keys(NPCS).forEach(function(nk){ var s=npcState[nk]; if(s&&s.mapa===E.mapa) draws.push({y:s.y+12, f:function(){ ctx.drawImage(sprNPC(nk,s.dir,s.wf), Math.round(s.x-8), Math.round(s.y-16)); drawNome(NPCS[nk].nome, s.x, s.y-20); }}); });
  draws.push({y:jogador.y+12, f:function(){
    var act = jogador.act>0;
    ctx.drawImage(sprHeroi(jogador.dir, jogador.mv?jogador.wf:0, act), Math.round(jogador.x-8), Math.round(jogador.y-17));
  }});
  draws.sort(function(a,b){ return a.y-b.y; });
  draws.forEach(function(d){ d.f(); });

  // partículas
  particulas.forEach(function(p){ ctx.fillStyle=p.cor; ctx.globalAlpha=Math.max(0,p.vida*2); ctx.fillRect(p.x-p.r,p.y-p.r,p.r*2,p.r*2); ctx.globalAlpha=1; });
  flutuantes.forEach(function(fl){ ctx.fillStyle=fl.cor; ctx.globalAlpha=Math.min(1,fl.vida); ctx.font='7px "Segoe UI"'; ctx.textAlign='center'; ctx.fillText(fl.txt, fl.x, fl.y); ctx.globalAlpha=1; ctx.textAlign='left'; });

  // ---- overlays em tela ----
  ctx.setTransform(1,0,0,1,0,0);
  var T=tint();
  if (T.a>0.02){ ctx.fillStyle=T.col; ctx.globalAlpha=T.a; ctx.fillRect(0,0,cv.width,cv.height); ctx.globalAlpha=1; }
  // luzes à noite
  if (T.a>0.25){
    ctx.globalCompositeOperation='lighter';
    m.luzes.forEach(function(l){
      var sx=(l.tx*TILE+8 - cam.x)*SC, sy=(l.ty*TILE+8 - cam.y)*SC;
      var gr=ctx.createRadialGradient(sx,sy,0,sx,sy,60*SC);
      gr.addColorStop(0,'rgba(255,210,120,.5)'); gr.addColorStop(1,'rgba(255,210,120,0)');
      ctx.fillStyle=gr; ctx.beginPath(); ctx.arc(sx,sy,60*SC,0,7); ctx.fill();
    });
    // luz do jogador
    var px=(jogador.x-cam.x)*SC, py=(jogador.y-cam.y)*SC;
    var g2=ctx.createRadialGradient(px,py,0,px,py,70*SC);
    g2.addColorStop(0,'rgba(255,235,190,.35)'); g2.addColorStop(1,'rgba(255,235,190,0)');
    ctx.fillStyle=g2; ctx.beginPath(); ctx.arc(px,py,70*SC,0,7); ctx.fill();
    ctx.globalCompositeOperation='source-over';
  }
  // chuva
  if (E.clima==='chuva'){
    ctx.strokeStyle='rgba(180,205,230,.5)'; ctx.lineWidth=1;
    chuvaPart.forEach(function(rp){ ctx.beginPath(); ctx.moveTo(rp.x,rp.y); ctx.lineTo(rp.x-5,rp.y+12); ctx.stroke(); });
    ctx.fillStyle='rgba(40,60,90,.12)'; ctx.fillRect(0,0,cv.width,cv.height);
  }
  // minigame pesca
  if (pescaSt) drawPesca();
}

function drawNome(txt,x,y){
  ctx.font='6px "Segoe UI"'; ctx.textAlign='center';
  ctx.fillStyle='rgba(0,0,0,.5)'; ctx.fillRect(x-txt.length*1.8-2, y-6, txt.length*3.6+4, 8);
  ctx.fillStyle='#fff'; ctx.fillText(txt, x, y);
  ctx.textAlign='left';
}
function drawPredio(p){
  var x=p.tx*TILE, y=p.ty*TILE, w=p.tw*TILE, h=p.th*TILE;
  ctx.fillStyle='rgba(0,0,0,.18)'; ctx.fillRect(x+3,y+h-2,w,4);
  ctx.fillStyle=p.cor; ctx.fillRect(x,y+8,w,h-8);
  ctx.fillStyle='rgba(0,0,0,.12)'; ctx.fillRect(x,y+8,w,4);
  // telhado
  ctx.fillStyle=p.teto;
  ctx.beginPath(); ctx.moveTo(x-3,y+10); ctx.lineTo(x+w/2,y-6); ctx.lineTo(x+w+3,y+10); ctx.closePath(); ctx.fill();
  // porta
  var px=(p.tx+Math.floor(p.tw/2))*TILE;
  ctx.fillStyle='#3a2416'; ctx.fillRect(px, y+h-TILE-2, TILE, TILE+2);
  ctx.fillStyle='#e7b84f'; ctx.fillRect(px+TILE-4, y+h-TILE+4, 2, 2);
  // janelas
  ctx.fillStyle='#bfe3ff';
  if (w>=4*TILE){ ctx.fillRect(x+6, y+18, 8, 8); ctx.fillRect(x+w-14, y+18, 8, 8); }
  // placa
  ctx.fillStyle='rgba(30,18,12,.85)'; ctx.fillRect(x+2, y+2, w-4, 9);
  ctx.fillStyle='#ffe0a0'; ctx.font='6px "Segoe UI"'; ctx.textAlign='center';
  ctx.fillText(p.nome, x+w/2, y+8.5); ctx.textAlign='left';
}
function drawArvore(a){
  ctx.fillStyle='rgba(0,0,0,.18)'; ctx.beginPath(); ctx.ellipse(a.x,a.y,7,2.5,0,0,7); ctx.fill();
  ctx.fillStyle='#6a4a28'; ctx.fillRect(a.x-2,a.y-12,4,12);
  ctx.fillStyle='#3f7a3a';
  ctx.beginPath(); ctx.arc(a.x,a.y-18,9,0,7); ctx.fill();
  ctx.beginPath(); ctx.arc(a.x-7,a.y-12,7,0,7); ctx.fill();
  ctx.beginPath(); ctx.arc(a.x+7,a.y-12,7,0,7); ctx.fill();
  ctx.fillStyle='#4f9a48'; ctx.beginPath(); ctx.arc(a.x-2,a.y-20,5,0,7); ctx.fill();
}
function drawProp(p){
  var x=p.x, y=p.y;
  if (p.tipo==='correio'){ ctx.fillStyle='#7a5a3a'; ctx.fillRect(x-1,y-2,2,8); ctx.fillStyle='#3a6a9a'; ctx.fillRect(x-5,y-9,10,8); ctx.fillStyle='#e7b84f'; ctx.fillRect(x+3,y-7,2,2); }
  else if (p.tipo==='remessa'){ ctx.fillStyle='#8a5a34'; ctx.fillRect(x-7,y-9,14,11); ctx.fillStyle='#a9723f'; ctx.fillRect(x-7,y-9,14,3); ctx.fillStyle='#5a3a22'; ctx.fillRect(x-1,y-5,2,7); }
  else if (p.tipo==='pc'){ ctx.fillStyle='#3a3a4a'; ctx.fillRect(x-6,y-10,12,9); ctx.fillStyle='#7ec6ff'; ctx.fillRect(x-4,y-8,8,5); ctx.fillStyle='#555'; ctx.fillRect(x-4,y-1,8,3); }
  else if (p.tipo==='quadro'){ ctx.fillStyle='#5a3a22'; ctx.fillRect(x-9,y-12,18,12); ctx.fillStyle='#e8e2d0'; ctx.fillRect(x-7,y-10,14,8); ctx.fillStyle='#b8362e'; ctx.fillRect(x-5,y-8,5,3); ctx.fillStyle='#3a6a9a'; ctx.fillRect(x+1,y-4,5,2); }
  else if (p.tipo==='mesa'){ ctx.fillStyle='#8a5a3a'; ctx.fillRect(x-9,y-4,18,6); ctx.fillStyle='#6a4326'; ctx.fillRect(x-8,y+2,2,4); ctx.fillRect(x+6,y+2,2,4); ctx.fillStyle='#faf4e6'; ctx.fillRect(x-3,y-6,6,3); }
  else if (p.tipo==='cafeteira'){ ctx.fillStyle='#6d4c41'; ctx.fillRect(x-4,y-9,8,10); ctx.fillStyle='#c9a27a'; ctx.fillRect(x-4,y-9,8,2); ctx.fillStyle='#3a2a20'; ctx.fillRect(x+3,y-5,3,4); }
  else if (p.tipo==='gaveteiro'){ ctx.fillStyle='rgba(0,0,0,.15)'; ctx.beginPath(); ctx.ellipse(x,y+2,7,2,0,0,7); ctx.fill(); ctx.fillStyle=p.cor; ctx.fillRect(x-6,y-12,12,14); ctx.fillStyle='rgba(0,0,0,.2)'; ctx.fillRect(x-6,y-6,12,1); ctx.fillRect(x-6,y-1,12,1); ctx.fillStyle='#444'; ctx.fillRect(x-1,y-9,2,1); }
  else if (p.tipo==='fonte'){ ctx.fillStyle='#8a8f98'; ctx.beginPath(); ctx.arc(x,y,11,0,7); ctx.fill(); ctx.fillStyle='#6aa8d8'; ctx.beginPath(); ctx.arc(x,y,8,0,7); ctx.fill(); ctx.fillStyle='#8a8f98'; ctx.fillRect(x-2,y-10,4,10); }
  else if (p.tipo==='placa'){ ctx.fillStyle='#7a5a3a'; ctx.fillRect(x-1,y-2,2,8); ctx.fillStyle=p.cor; ctx.fillRect(x-8,y-11,16,9); ctx.fillStyle='#fff'; ctx.font='5px "Segoe UI"'; ctx.textAlign='center'; ctx.fillText('FÓRUM', x, y-5); ctx.textAlign='left'; }
  else if (p.tipo==='doca'){ ctx.fillStyle='#7a5a3a'; ctx.fillRect(x-14,y-3,28,8); ctx.fillStyle='#6a4326'; for(var i=-12;i<14;i+=6) ctx.fillRect(x+i,y+5,3,5); }
  else if (p.tipo==='toco'){ ctx.fillStyle='#7a5a3a'; ctx.fillRect(x-5,y-5,10,7); ctx.fillStyle='#9a7a4a'; ctx.beginPath(); ctx.ellipse(x,y-5,5,2.5,0,0,7); ctx.fill(); }
  else { ctx.fillStyle=p.cor; ctx.fillRect(x-5,y-8,10,10); }
}
function drawPlanta(tx,ty,pl){
  var C=CULTIVOS[pl.cultivo], x=tx*TILE+8, y=ty*TILE+15;
  var f=pl.estagio/C.dias;
  ctx.fillStyle='#3a7a3a'; ctx.fillRect(x-1, y-Math.max(2,f*10), 2, Math.max(2,f*10));
  if (pl.estagio>=C.dias){
    ctx.fillStyle=C.cor; ctx.fillRect(x-5,y-13,10,10); ctx.fillStyle='#fff'; ctx.fillRect(x-5,y-13,10,3);
    // brilho pronto
    if ((Date.now()/200|0)%2){ ctx.strokeStyle='#fff'; ctx.strokeRect(x-6,y-14,12,12); }
  } else {
    ctx.fillStyle='#4f9a48'; ctx.beginPath(); ctx.arc(x-2, y-f*10, 2+f*2, 0,7); ctx.fill();
    ctx.beginPath(); ctx.arc(x+2, y-f*8, 2+f*2, 0,7); ctx.fill();
    if (pl.prot){ ctx.fillStyle='rgba(120,180,255,.4)'; ctx.fillRect(tx*TILE+1,ty*TILE+1,TILE-2,TILE-2); }
  }
}
function drawEgg(eg){
  var x=eg.tx*TILE+8, y=eg.ty*TILE+14, t=Date.now()/400;
  ctx.fillStyle='rgba(0,0,0,.15)'; ctx.beginPath(); ctx.ellipse(x,y+1,5,2,0,0,7); ctx.fill();
  ctx.fillStyle=eg.cor;
  if (eg.k==='livro'){ ctx.fillRect(x-5,y-8,10,9); ctx.fillStyle='#fff'; ctx.fillRect(x-1,y-8,2,9); }
  else if (eg.k==='coluna'){ ctx.fillRect(x-3,y-14,6,14); ctx.fillRect(x-5,y-15,10,2); ctx.fillRect(x-5,y-1,10,2); }
  else if (eg.k==='ampulheta'){ ctx.beginPath(); ctx.moveTo(x-4,y-12); ctx.lineTo(x+4,y-12); ctx.lineTo(x,y-6); ctx.closePath(); ctx.fill(); ctx.beginPath(); ctx.moveTo(x-4,y); ctx.lineTo(x+4,y); ctx.lineTo(x,y-6); ctx.closePath(); ctx.fill(); }
  else if (eg.k==='selo'){ ctx.beginPath(); ctx.arc(x,y-5,5,0,7); ctx.fill(); ctx.fillStyle='#e7b84f'; ctx.beginPath(); ctx.arc(x,y-5,2,0,7); ctx.fill(); }
  else if (eg.k==='carimbo'){ ctx.fillRect(x-2,y-12,4,6); ctx.fillRect(x-5,y-6,10,6); }
  else if (eg.k==='pergaminho'){ ctx.fillRect(x-6,y-6,12,5); ctx.fillStyle='#c99a34'; ctx.fillRect(x-7,y-7,2,7); ctx.fillRect(x+5,y-7,2,7); }
  else if (eg.k==='cadeira'){ ctx.fillRect(x-4,y-4,8,3); ctx.fillRect(x-4,y-11,8,7); ctx.fillRect(x-4,y-1,2,3); ctx.fillRect(x+2,y-1,2,3); }
  else if (eg.k==='placa'){ ctx.fillRect(x-1,y-2,2,6); ctx.fillRect(x-6,y-11,12,8); }
  else if (eg.k==='caneca'){ ctx.fillRect(x-4,y-8,8,9); ctx.strokeStyle=eg.cor; ctx.strokeRect(x+3,y-6,3,4); }
  else { ctx.fillRect(x-4,y-8,8,8); }
  // brilho girando
  ctx.save(); ctx.translate(x, y-16 + Math.sin(t)*1.5); ctx.rotate(t);
  ctx.fillStyle='#ffe08a'; ctx.beginPath(); ctx.moveTo(0,-3); ctx.lineTo(3,0); ctx.lineTo(0,3); ctx.lineTo(-3,0); ctx.closePath(); ctx.fill();
  ctx.restore();
}
function drawMarcador(A,i){
  var x=A.local.tx*TILE+8, y=A.local.ty*TILE+8;
  var feita=aulaFeita(A.id), lib=aulaLiberada(i), t=Date.now()/300;
  ctx.fillStyle = feita ? 'rgba(76,154,104,.35)' : lib ? 'rgba(231,184,79,'+(0.28+Math.sin(t)*0.12)+')' : 'rgba(120,120,120,.2)';
  ctx.beginPath(); ctx.ellipse(x,y+4,10,4,0,0,7); ctx.fill();
  if (lib && !feita){
    ctx.fillStyle='#e7b84f'; ctx.beginPath(); ctx.moveTo(x,y-14-Math.sin(t)*2); ctx.lineTo(x+4,y-8); ctx.lineTo(x-4,y-8); ctx.closePath(); ctx.fill();
  }
  ctx.font='9px "Segoe UI"'; ctx.textAlign='center';
  ctx.fillStyle='#fff';
  ctx.fillText(feita?'✓':(lib?'⚖️':'🔒'), x, y-2);
  ctx.textAlign='left';
}
function drawPesca(){
  var s=pescaSt;
  ctx.fillStyle='rgba(0,0,0,.55)'; ctx.fillRect(0,0,cv.width,cv.height);
  var bw=Math.min(320,cv.width*0.7), bx=(cv.width-bw)/2, by=cv.height*0.5;
  ctx.fillStyle='#fdf6e8'; ctx.fillRect(bx-8,by-30,bw+16,86);
  ctx.strokeStyle='#7a2f2a'; ctx.lineWidth=3; ctx.strokeRect(bx-8,by-30,bw+16,86);
  ctx.fillStyle='#3a2b24'; ctx.font='14px "Segoe UI"'; ctx.textAlign='center';
  if (s.fase==='esperar'){ ctx.fillText('🔎 Vasculhando o DJEN…', cv.width/2, by-6); }
  else if (s.fase==='fisga'){ ctx.fillText('FISGOU! Aperte E / espaço!', cv.width/2, by-6); }
  else if (s.fase==='puxar'){
    ctx.fillText('Segure E para subir, solte para descer', cv.width/2, by-14);
    ctx.fillStyle='#cdb98f'; ctx.fillRect(bx, by, bw, 16);
    ctx.fillStyle='#5aa0d8'; ctx.fillRect(bx + s.barra*(bw-24), by, 24, 16);
    ctx.fillStyle='#b8362e'; ctx.fillRect(bx + s.peixe*(bw-10), by-4, 10, 24);
    ctx.fillStyle='#4c9a68'; ctx.fillRect(bx, by+24, s.prog*bw, 8);
  }
  ctx.textAlign='left';
}

/* pesca precisa de hold no E durante 'puxar' */
document.addEventListener('keydown', function(e){
  if (pescaSt){
    if (e.key===' '||e.key.toLowerCase()==='e'){
      if (pescaSt.fase==='fisga'){ pescaSt.fase='puxar'; pescaSt.t=0; pescaSt.prog=0; pescaSt.tempo=0; toastEsconde(); }
      teclas.pescaHold=true;
    }
  }
});
document.addEventListener('keyup', function(e){ if(e.key===' '||e.key.toLowerCase()==='e') teclas.pescaHold=false; });

/* ================================================================
   LOOP / BOOT
   ================================================================ */
function resize(){
  var w=$('app').clientWidth, h=$('app').clientHeight;
  cv.width=w; cv.height=h;
  SC = Math.max(2, Math.round(w/(24*TILE)));
  VW = w/SC; VH = h/SC;
}
function frame(ts){
  requestAnimationFrame(frame);
  var dt=Math.min(0.05,(ts-lastT)/1000||0); lastT=ts;
  update(dt); render();
}

function ehMobile(){
  try { if (window.matchMedia && window.matchMedia('(pointer: coarse)').matches && !window.matchMedia('(pointer: fine)').matches) return true; } catch(e){}
  return (window.innerWidth||999) < 760;
}

/* hook de depuração (inofensivo) */
window.__comarca = {
  get j(){ return jogador; }, get e(){ return E; }, get m(){ return mapaAtual; },
  get pausado(){ return pausado; }, aula:function(i){ iniciarAula(i); },
  tp:function(tx,ty){ jogador.x=tx*TILE+8; jogador.y=ty*TILE+8; },
  step:function(dt){ update(dt||0.05); },
  set tecla(o){ for(var k in o) teclas[k]=o[k]; }
};

function comecar(){
  cv=$('cv'); ctx=cv.getContext('2d');
  construirMapas();
  mapaAtual = MAPAS[E.mapa] || MAPAS.escritorio;
  jogador.x=E.px; jogador.y=E.py;
  cam.x=clamp(jogador.x-9*TILE,0,Math.max(0,mapaAtual.w*TILE-9*TILE*2));
  cam.y=clamp(jogador.y-6*TILE,0,Math.max(0,mapaAtual.h*TILE-6*TILE*2));
  pintaFace($('dlg-face'));
  reposNPCs();
  resize();
  renderHotbar(); atualizaHud();
  window.addEventListener('resize', resize);
  document.addEventListener('keydown', onKey);
  document.addEventListener('keyup', onKey);
  window.addEventListener('wheel', onWheel, {passive:true});
  window.addEventListener('blur', function(){ teclas={}; });
  jogoPronto=true; pausado=true;
  requestAnimationFrame(frame);

  // saudação
  setTimeout(function(){
    var f=Object.keys(prog.concluidas).length;
    var oi = f===0
      ? ('Oi'+(meuNome?', '+meuNome.split(' ')[0]:'')+'! Eu sou o FBzinho. Bem-vindo(a) à Comarca. Ande com WASD/setas, aperte E para interagir, e comece pela minha aula aqui do escritório (marcador ⚖️).')
      : (f>=AULAS.length ? 'Você já concluiu as 10 aulas! Explore à vontade, ache os easter eggs ou veja seu diploma lá em cima.'
                         : 'De volta! Falta a aula '+(idxAulaAtual()+1)+' — procure o marcador ⚖️ que brilha pela comarca.');
    abrirDlgSimples('FBzinho','seu guia', oi, []);
  }, 500);
}

if (typeof firebaseConfig === 'undefined' || !firebaseConfig || firebaseConfig.apiKey === 'COLE_AQUI_SUA_API_KEY'){
  $('gate').classList.add('on');
  var gp=$('gate').querySelector('p'); if(gp) gp.textContent='Configuração pendente: firebase-config.js não foi preenchido.';
} else if (ehMobile()){
  $('mgate').classList.add('on');
} else if (temFirebase && auth){
  auth.onAuthStateChanged(function(user){
    if (!user){ $('gate').classList.add('on'); $('app').classList.remove('on'); return; }
    meuUid=user.uid; meuNome=user.displayName||'';
    $('gate').classList.remove('on');
    progRef = db.collection('treinamentoProgresso').doc(meuUid);
    db.collection('users').doc(meuUid).get().then(function(doc){
      var d=doc.exists?doc.data():{};
      souAdmin=d.role==='admin'; souGestor=d.role==='gestor';
      if (!meuNome) meuNome=d.displayName||'';
      $('b-gestor').style.display=(souAdmin||souGestor)?'inline-block':'none';
    }).catch(function(){}).finally(function(){
      var vai=function(){ $('app').classList.add('on'); carregar(comecar); };
      if (!meuNome){ db.collection('organograma').doc(meuUid).get().then(function(o){ if(o.exists&&o.data().displayName) meuNome=o.data().displayName; }).catch(function(){}).finally(vai); }
      else vai();
    });
  });
} else {
  // sem firebase: joga offline (localStorage)
  $('app').classList.add('on');
  carregar(comecar);
}

})();
