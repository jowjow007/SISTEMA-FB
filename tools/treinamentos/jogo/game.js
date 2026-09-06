/* ================================================================
   COMARCA DO FBZINHO — 3D estilizado (Three.js), câmera 3ª pessoa
   Farming/life sim, tema jurídico, treinamento embutido. Um IIFE.
   ================================================================ */
(function(){
"use strict";

/* ---------------- AULAS (rascunho — editar à vontade) ----------------
   id: estável, NÃO renomear. local:{x,z} = posição do marcador no mundo.
   licao: {h}|{p}|{ul}|{callout}. quiz: {q,opcoes,correta,explica}. Passa >= 70%.
   [colchetes] = confirmar com o escritório.                              */
var AULAS = [
  { id:'boas-vindas', emoji:'👋', titulo:'Boas-vindas ao escritório', curto:'Boas-vindas', local:{x:-34,z:-19},
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
  { id:'valores-postura', emoji:'⚖️', titulo:'Valores e postura profissional', curto:'Ética', local:{x:12,z:-9},
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
  { id:'setores', emoji:'🗂️', titulo:'Setores e organograma', curto:'Setores', local:{x:-40,z:-27},
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
  { id:'portal-abas', emoji:'🧭', titulo:'O Portal por dentro', curto:'Portal', local:{x:-30,z:-26},
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
  { id:'sistemas-externos', emoji:'🔐', titulo:'Sistemas externos', curto:'Sistemas', local:{x:-13,z:-1},
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
  { id:'clientes-comunicacao', emoji:'💬', titulo:'Atendimento ao cliente', curto:'Clientes', local:{x:-26,z:-16},
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
  { id:'condominial', emoji:'🏢', titulo:'Rotina condominial e prazos', curto:'Condomínios', local:{x:14,z:5},
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
  { id:'seguranca-lgpd', emoji:'🛡️', titulo:'Segurança da informação e LGPD', curto:'Segurança', local:{x:-17,z:25},
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
  { id:'prazos-processos', emoji:'📅', titulo:'Prazos processuais e publicações', curto:'Prazos', local:{x:8,z:23},
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
  { id:'prova-final', emoji:'🏅', titulo:'Prova de Integração', curto:'Prova final', local:{x:0,z:-9},
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

/* ---------------- EASTER EGGS ---------------- */
var EGGS = [
  { id:'balanca', x:2, z:9, cor:'#e7b84f', k:'selo', titulo:'A balança da Justiça', texto:'A balança pesa os argumentos; a espada é a força da lei; a venda nos olhos é a imparcialidade.' },
  { id:'cpc219', x:-24, z:-8, cor:'#3b7dd8', k:'livro', titulo:'CPC art. 219', texto:'Os prazos processuais contam-se somente em dias úteis. Uma das maiores mudanças do CPC de 2015.' },
  { id:'cpc300', x:-44, z:-16, cor:'#c0392b', k:'livro', titulo:'CPC art. 300 — Tutela de urgência', texto:'Exige, ao mesmo tempo, probabilidade do direito e perigo de dano ou risco ao resultado útil do processo.' },
  { id:'stf', x:20, z:-14, cor:'#d7d2c8', k:'coluna', titulo:'STF', texto:'Guardião da Constituição, 11 ministros. A súmula vinculante (CF art. 103-A) obriga todos os juízes e a Administração.' },
  { id:'stj', x:-10, z:10, cor:'#cdd6e0', k:'coluna', titulo:'STJ', texto:'O "Tribunal da Cidadania": uniformiza a interpretação da lei federal. Julga recursos repetitivos (CPC art. 1.036).' },
  { id:'toga', x:-30, z:36, cor:'#2b2b30', k:'livro', titulo:'A toga preta', texto:'A cor sóbria lembra que, no tribunal, vale o argumento, não a pessoa. O advogado usa toga nas sustentações.' },
  { id:'prescricao', x:-36, z:20, cor:'#8e7cc3', k:'ampulheta', titulo:'Prescrição x decadência', texto:'A prescrição atinge a pretensão (pode ser interrompida). A decadência atinge o próprio direito e, em regra, não.' },
  { id:'oab', x:15, z:-6, cor:'#b8362e', k:'selo', titulo:'Estatuto da OAB', texto:'Lei 8.906/94: a advocacia é função essencial à Justiça (CF art. 133); o advogado é inviolável por seus atos no exercício da profissão.' },
  { id:'inicial', x:-30, z:-10, cor:'#e6d3a3', k:'pergaminho', titulo:'CPC art. 319 — Petição inicial', texto:'Precisa indicar: juízo, partes, fatos e fundamentos, pedido, valor da causa, provas e a opção por audiência de conciliação.' },
  { id:'coisajulgada', x:5, z:40, cor:'#7f8c8d', k:'carimbo', titulo:'CPC art. 502 — Coisa julgada', texto:'É a autoridade que torna imutável a decisão de mérito não mais sujeita a recurso. Segurança jurídica.' },
  { id:'forum', x:6, z:-16, cor:'#2e7d5b', k:'placa', titulo:'Fórum x Tribunal', texto:'O Fórum é a 1ª instância (juiz de direito). O Tribunal de Justiça (TJ) é a 2ª instância, onde os desembargadores julgam recursos.' },
  { id:'juri', x:-20, z:44, cor:'#8d6e63', k:'cadeira', titulo:'Tribunal do Júri', texto:'Competência para crimes dolosos contra a vida (CF art. 5º, XXXVIII). Conselho de Sentença de 7 jurados, decisão em sigilo.' },
  { id:'cafezinho', x:-32, z:-27, cor:'#6d4c41', k:'caneca', titulo:'Sabedoria forense', texto:'"Audiência sem cafezinho é nulidade material." Jurisprudência de corredor, pacífica. (Essa não cai na prova.)' },
  { id:'precatorio', x:22, z:38, cor:'#16a085', k:'livro', titulo:'Precatório (CF art. 100)', texto:'Ordem de pagamento de dívida da Fazenda Pública reconhecida por decisão transitada em julgado. Segue ordem cronológica.' }
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
  cob:{ dias:2, produto:'sent_cob', xp:6, cor:0xe0b24a },
  trab:{ dias:4, produto:'sent_trab', xp:14, cor:0x5aa0d8 },
  inv:{ dias:6, produto:'sent_inv', xp:30, cor:0xa07ad0 }
};
var LOJA = ['pasta_cob','pasta_trab','pasta_inv','cafe','marmita'];
var NPCS = {
  helena:{ nome:'Dra. Helena', cargo:'advogada sócia · sua mentora', pal:{roupa:0x7a2f5a,cabelo:0x3a2b24,pele:0xe8b48a,oculos:1},
    gosta:['ementa','sent_inv'],
    rotina:[ {h:0,x:-33,z:-16}, {h:9*60,x:2,z:-6}, {h:13*60,x:14,z:3}, {h:17*60,x:-33,z:-16}, {h:22*60,x:-37,z:-22} ],
    falas:['Bom te ver. O escritório é o que a gente constrói junto.','Fez as aulas de hoje? Elas abrem o resto da comarca.','Chuva protocola seus casos sozinha. Aproveita e explora.'] },
  tiberio:{ nome:'Sr. Tibério', cargo:'escrevente · Cartório', pal:{roupa:0x3a5a7a,cabelo:0x9a9a9a,pele:0xd8a877},
    gosta:['cafe'],
    rotina:[ {h:0,x:-13,z:1}, {h:19*60,x:-13,z:4}, {h:22*60,x:-13,z:4} ],
    falas:['Cartório aberto. Caso novo, café, marmita — é só chegar e apertar E.','Papel bom é papel carimbado, moço(a).','Traz um cafézinho um dia desses.'], loja:true },
  iris:{ nome:'Dona Íris', cargo:'copa e recepção', pal:{roupa:0x2e7d5b,cabelo:0x5c3a24,pele:0xe8b48a},
    gosta:['cravo','cafe'],
    rotina:[ {h:0,x:-30,z:-22}, {h:11*60,x:0,z:6}, {h:15*60,x:-30,z:-22}, {h:20*60,x:16,z:6} ],
    falas:['O café tá fresquinho.','Vi a Dra. Helena procurando você mais cedo.','Explora o bosque com calma — essa comarca tem cada história.'] }
};

/* prédios (x,z centro, w largura, d profundidade, h altura, cor, teto, nome) */
var PREDIOS = [
  { id:'escritorio', x:-38, z:-25, w:9, d:7, h:4.4, cor:0xd8b98a, teto:0x8a4b3a, nome:'Escritório', porta:{x:-38,z:-21.2} },
  { id:'forum', x:0, z:-15, w:11, d:8, h:6.5, cor:0xbfc4cc, teto:0x60656d, nome:'Fórum', porta:{x:0,z:-10.5} },
  { id:'cartorio', x:-14, z:-3, w:7, d:6, h:4.2, cor:0xc7a875, teto:0x7a5a3a, nome:'Cartório', porta:{x:-14,z:0.2}, loja:'tiberio' },
  { id:'oab', x:15, z:-13, w:6, d:5, h:4.6, cor:0xa9895b, teto:0x6a4326, nome:'OAB', porta:{x:15,z:-10} },
  { id:'vara', x:16, z:6, w:8, d:6, h:5.2, cor:0xb4bcc5, teto:0x60656d, nome:'Vara de Condomínios', porta:{x:16,z:9.2} },
  { id:'biblioteca', x:-18, z:27, w:7, d:5, h:4, cor:0x9a7a52, teto:0x5a3a24, nome:'Biblioteca da Comarca', porta:{x:-18,z:29.7} }
];
var CAMA = {x:-40.5,z:-25};
var REMESSA = {x:-33,z:-21};
var CORREIO = {x:-35,z:-21};
var DOCA = {x:8,z:22};
var PLANTIO = { x0:-33, z0:-13, x1:-21, z1:-3 };
var FORRAGEIO = [ {x:-28,z:38}, {x:-12,z:44}, {x:2,z:34}, {x:-24,z:22} ];
var GRID = 1.6;

/* ================================================================ */
var $ = function(id){ return document.getElementById(id); };
function esc(s){ return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }
function clamp(v,a,b){ return v<a?a:(v>b?b:v); }
var THREEOK = (typeof THREE !== 'undefined');

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

/* ---------------- Estado ---------------- */
var E = null;
function estadoNovo(){
  var inv=[]; for(var i=0;i<24;i++) inv.push(null);
  inv[0]={id:'caneta',qt:1}; inv[1]={id:'carimbo',qt:1}; inv[2]={id:'lupa',qt:1};
  inv[3]={id:'pasta_cob',qt:3}; inv[4]={id:'cafe',qt:2};
  return {
    dia:1, hora:6*60, clima:'sol',
    dinheiro:500, foco:100, focoMax:100,
    inv:inv, hot:0, skill:{ processos:0 },
    tilled:{}, plants:{},
    npc:{ helena:{amiz:0,pd:0}, tiberio:{amiz:0,pd:0}, iris:{amiz:0,pd:0} },
    px:-30, pz:-14, vendaPendente:0
  };
}
function invAdd(id,qt){
  qt=qt||1; var def=ITENS[id]; if(!def) return false;
  if (def.tipo!=='ferramenta') for (var i=0;i<E.inv.length;i++) if(E.inv[i] && E.inv[i].id===id){ E.inv[i].qt+=qt; return true; }
  for (var j=0;j<E.inv.length;j++) if(!E.inv[j]){ E.inv[j]={id:id,qt:qt}; return true; }
  return false;
}
function invRemove(id,qt){
  qt=qt||1;
  for (var i=0;i<E.inv.length;i++) if(E.inv[i] && E.inv[i].id===id){ E.inv[i].qt-=qt; if(E.inv[i].qt<=0) E.inv[i]=null; return true; }
  return false;
}
function invTem(id){ for(var i=0;i<E.inv.length;i++) if(E.inv[i]&&E.inv[i].id===id) return E.inv[i].qt; return 0; }
function itemSel(){ return E.inv[E.hot%8] || null; }
function gastarFoco(n){
  if (E.foco<n){ toast('Sem foco','Coma um cafézinho/marmita ou vá dormir.'); return false; }
  E.foco-=n; atualizaHud(); return true;
}

/* ================================================================
   ÍCONES 2D (hotbar/loja) — canvas
   ================================================================ */
var SPR={};
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
   MUNDO 3D
   ================================================================ */
var scene, camera, renderer, clock, raf=null;
var mundo, fb, fbParts, npc3d={}, aula3d=[], egg3d=[], plant3d={}, tilled3d={};
var sol, luaLuz, hemi, amb, skyMesh, agua, aguaGeoBase;
var luzesNoite=[], fireflies=[], nuvens=[], grama;
var colisores=[];   // {x,z,r}
var chuva3d=null;
var particulas=[], flutuantes3d=[];

var fbYaw=0, camYaw=0, camYawManual=0;
var teclas={}, pausado=true, jogoPronto=false;
var walkPhase=0, andando=false, actTimer=0;
var lastT=0;
var promptEl, hudEls={};

function C(hex){ return new THREE.Color(hex); }
function rand(a,b){ return a + Math.random()*(b-a); }

/* --- materiais --- */
function matStd(cor,rough,metal,extra){
  var o={ color:cor, roughness:rough==null?0.85:rough, metalness:metal==null?0.0:metal };
  if (extra) for (var k in extra) o[k]=extra[k];
  return new THREE.MeshStandardMaterial(o);
}

/* --- texto sprite (labels flutuantes) --- */
function labelSprite(txt, opt){
  opt=opt||{};
  var fs=opt.fs||44, padX=24, padY=14;
  var c=mk(4,4), g=c.getContext('2d');
  g.font='800 '+fs+'px "Segoe UI",system-ui,sans-serif';
  var w=g.measureText(txt).width;
  c.width=Math.ceil(w+padX*2); c.height=Math.ceil(fs+padY*2);
  g=c.getContext('2d'); g.font='800 '+fs+'px "Segoe UI",system-ui,sans-serif';
  g.fillStyle=opt.bg||'rgba(30,18,12,.82)';
  rr(g,0,0,c.width,c.height,20); g.fill();
  if (opt.borda){ g.strokeStyle=opt.borda; g.lineWidth=6; rr(g,3,3,c.width-6,c.height-6,17); g.stroke(); }
  g.fillStyle=opt.color||'#fff'; g.textAlign='center'; g.textBaseline='middle';
  g.fillText(txt, c.width/2, c.height/2+2);
  var t=new THREE.CanvasTexture(c); t.minFilter=THREE.LinearFilter; t.anisotropy=2;
  var sp=new THREE.Sprite(new THREE.SpriteMaterial({map:t,transparent:true,depthWrite:false,depthTest:opt.depthTest!==false}));
  var h=opt.h||1.1; sp.scale.set(h*c.width/c.height, h, 1);
  sp.userData.cv=c; sp.userData.tex=t;
  return sp;
}
function rr(g,x,y,w,h,r){ g.beginPath(); g.moveTo(x+r,y); g.arcTo(x+w,y,x+w,y+h,r); g.arcTo(x+w,y+h,x,y+h,r); g.arcTo(x,y+h,x,y,r); g.arcTo(x,y,x+w,y,r); g.closePath(); }
function setSpr(sp,txt){
  var c=sp.userData.cv,g=c.getContext('2d');
  g.clearRect(0,0,c.width,c.height);
  g.font='800 '+Math.round(c.height*0.62)+'px "Segoe UI",system-ui,sans-serif';
  g.textAlign='center'; g.textBaseline='middle'; g.fillStyle='#fff';
  g.fillText(txt, c.width/2, c.height/2+2);
  sp.userData.tex.needsUpdate=true;
}

/* --- textura de chão --- */
function texChao(){
  var s=1024, c=mk(s,s), g=c.getContext('2d');
  g.fillStyle='#5c9d54'; g.fillRect(0,0,s,s);
  for (var i=0;i<2600;i++){
    g.fillStyle='rgba('+(60+Math.random()*40|0)+','+(120+Math.random()*60|0)+','+(50+Math.random()*40|0)+','+(0.05+Math.random()*0.12).toFixed(2)+')';
    var r=2+Math.random()*10; g.beginPath(); g.arc(Math.random()*s,Math.random()*s,r,0,7); g.fill();
  }
  // caminhos de terra (mapa 140 -> 1024 ; centro do mundo em 512)
  function W(x){ return (x+70)/140*s; }
  g.strokeStyle='#b79a68'; g.lineJoin='round'; g.lineCap='round';
  var caminhos=[ [[-38,-21],[-14,-8],[0,-6]], [[0,-6],[15,-8]], [[0,-6],[16,6]], [[0,-6],[-14,0]], [[-14,0],[-18,26]], [[-18,26],[8,22]], [[0,-6],[0,4]] ];
  caminhos.forEach(function(p){
    g.lineWidth=26; g.beginPath();
    p.forEach(function(pt,idx){ if(idx===0) g.moveTo(W(pt[0]),W(pt[1])); else g.lineTo(W(pt[0]),W(pt[1])); });
    g.stroke();
    g.lineWidth=20; g.strokeStyle='#c9ac7a'; g.stroke(); g.strokeStyle='#b79a68';
  });
  // canteiro de trabalho
  g.fillStyle='#6b4a30';
  g.fillRect(W(PLANTIO.x0)-6, W(PLANTIO.z0)-6, W(PLANTIO.x1)-W(PLANTIO.x0)+12, W(PLANTIO.z1)-W(PLANTIO.z0)+12);
  var t=new THREE.CanvasTexture(c); t.wrapS=t.wrapT=THREE.ClampToEdgeWrapping; t.anisotropy=4;
  return t;
}

/* --- personagem --- */
function novaPessoa(pal){
  var g=new THREE.Group();
  var pele=pal.pele||0xe8b48a, cab=pal.cabelo||0x3a2b24, roupa=pal.roupa||0x2f2440;
  var mRoupa=matStd(roupa,0.8), mPele=matStd(pele,0.7), mCab=matStd(cab,0.75);
  var mToga=matStd(0x1c1720,0.85), mOuro=matStd(0xe7b84f,0.35,0.4), mBranco=matStd(0xf5f2ea,0.7);

  var pernaL=new THREE.Group(), pernaR=new THREE.Group();
  var lp=new THREE.Mesh(new THREE.BoxGeometry(0.22,0.62,0.22), matStd(0x2a2030,0.8)); lp.position.y=-0.31; pernaL.add(lp);
  var rp=lp.clone(); pernaR.add(rp);
  pernaL.position.set(-0.15,0.62,0); pernaR.position.set(0.15,0.62,0);
  var sapatoL=new THREE.Mesh(new THREE.BoxGeometry(0.26,0.12,0.34), matStd(0x1a1216,0.6)); sapatoL.position.set(0,-0.62,0.04); pernaL.add(sapatoL);
  pernaR.add(sapatoL.clone());
  g.add(pernaL,pernaR);

  var tronco=new THREE.Mesh(new THREE.BoxGeometry(0.62,0.8,0.36), mRoupa); tronco.position.y=1.05; g.add(tronco);
  var camisa=new THREE.Mesh(new THREE.BoxGeometry(0.18,0.5,0.08), mBranco); camisa.position.set(0,1.08,0.2); g.add(camisa);
  var gravata=new THREE.Mesh(new THREE.BoxGeometry(0.07,0.34,0.05), matStd(0xb8362e,0.7)); gravata.position.set(0,1.0,0.22); g.add(gravata);
  var toga=new THREE.Mesh(new THREE.BoxGeometry(0.8,1.15,0.12), mToga); toga.position.set(0,0.95,-0.22); toga.rotation.x=0.04; g.add(toga);
  var ombro=new THREE.Mesh(new THREE.BoxGeometry(0.86,0.22,0.28), mToga); ombro.position.set(0,1.42,-0.02); g.add(ombro);
  var t1=new THREE.Mesh(new THREE.BoxGeometry(0.06,1.05,0.05), mOuro); t1.position.set(-0.26,0.95,-0.28); g.add(t1);
  var t2=t1.clone(); t2.position.x=0.26; g.add(t2);

  var bandaL=new THREE.Mesh(new THREE.BoxGeometry(0.06,0.2,0.04), mBranco); bandaL.position.set(-0.05,1.36,0.2); g.add(bandaL);
  bandaL.clone(); var bandaR=bandaL.clone(); bandaR.position.x=0.05; g.add(bandaR);

  var bracoL=new THREE.Group(), bracoR=new THREE.Group();
  var la=new THREE.Mesh(new THREE.BoxGeometry(0.18,0.66,0.18), mRoupa); la.position.y=-0.33; bracoL.add(la);
  bracoR.add(la.clone());
  var maoL=new THREE.Mesh(new THREE.SphereGeometry(0.1,10,8), mPele); maoL.position.y=-0.68; bracoL.add(maoL);
  bracoR.add(maoL.clone());
  bracoL.position.set(-0.4,1.4,0); bracoR.position.set(0.4,1.4,0);
  g.add(bracoL,bracoR);

  var maleta=new THREE.Mesh(new THREE.BoxGeometry(0.42,0.3,0.14), matStd(0x5a3a22,0.6)); maleta.position.set(0,-0.78,0.06); bracoR.add(maleta);

  var cabeca=new THREE.Mesh(new THREE.SphereGeometry(0.26,18,14), mPele); cabeca.position.y=1.78; g.add(cabeca);
  var cabelo=new THREE.Mesh(new THREE.SphereGeometry(0.28,16,12,0,Math.PI*2,0,Math.PI*0.62), mCab); cabelo.position.y=1.8; g.add(cabelo);
  if (pal.oculos){
    var oc=matStd(0x20161a,0.4,0.3);
    var oL=new THREE.Mesh(new THREE.TorusGeometry(0.07,0.014,8,16), oc); oL.position.set(-0.09,1.79,0.22); g.add(oL);
    var oR=oL.clone(); oR.position.x=0.09; g.add(oR);
  } else {
    var eL=new THREE.Mesh(new THREE.SphereGeometry(0.03,6,6), matStd(0x20161a)); eL.position.set(-0.09,1.79,0.23); g.add(eL);
    g.add(eL.clone().translateX(0.18));
  }

  g.traverse(function(o){ if(o.isMesh){ o.castShadow=true; o.receiveShadow=false; } });
  return { group:g, pernaL:pernaL, pernaR:pernaR, bracoL:bracoL, bracoR:bracoR, tronco:tronco, cabeca:cabeca };
}

/* --- prédio --- */
function novoPredio(P){
  var g=new THREE.Group(); g.position.set(P.x,0,P.z);
  var corpo=new THREE.Mesh(new THREE.BoxGeometry(P.w,P.h,P.d), matStd(P.cor,0.9));
  corpo.position.y=P.h/2; corpo.castShadow=true; corpo.receiveShadow=true; g.add(corpo);
  var teto=new THREE.Mesh(new THREE.ConeGeometry(Math.max(P.w,P.d)*0.72, P.h*0.5, 4), matStd(P.teto,0.9));
  teto.position.y=P.h+P.h*0.24; teto.rotation.y=Math.PI/4; teto.castShadow=true; g.add(teto);
  // porta (frente = +z)
  var porta=new THREE.Mesh(new THREE.BoxGeometry(1.4,2.3,0.16), matStd(0x3a2416,0.7));
  porta.position.set(0,1.15,P.d/2+0.05); g.add(porta);
  var degrau=new THREE.Mesh(new THREE.BoxGeometry(2.4,0.3,1), matStd(0xcdbb9c,0.9));
  degrau.position.set(0,0.15,P.d/2+0.6); degrau.receiveShadow=true; g.add(degrau);
  // janelas (emissivas à noite)
  var jm=new THREE.MeshStandardMaterial({color:0x8fd0ff, emissive:0x2a2410, emissiveIntensity:0});
  var janelas=[];
  [-1,1].forEach(function(s){
    var j=new THREE.Mesh(new THREE.BoxGeometry(1.1,1.1,0.1), jm.clone());
    j.position.set(s*(P.w*0.28), P.h*0.55, P.d/2+0.03); g.add(j); janelas.push(j);
    if (P.d>5.5){
      var j2=new THREE.Mesh(new THREE.BoxGeometry(0.1,1.1,1.1), jm.clone());
      j2.position.set(s*(P.w/2+0.03), P.h*0.55, 0); g.add(j2); janelas.push(j2);
    }
  });
  // placa
  var placa=labelSprite(P.nome,{fs:40,h:0.9,borda:'#e7b84f'});
  placa.position.set(0, P.h+P.h*0.6, 0); g.add(placa);
  // luz de porta (noite)
  var pl=new THREE.PointLight(0xffcf8a, 0, 9, 2); pl.position.set(0,2.6,P.d/2+0.8); g.add(pl);
  luzesNoite.push({light:pl, base:1.3, janelas:janelas});

  mundo.add(g);
  colisores.push({x:P.x, z:P.z, r:Math.max(P.w,P.d)/2 + 0.5});
  return g;
}

/* --- árvore --- */
function novaArvore(x,z,esc){
  esc=esc||1;
  var g=new THREE.Group(); g.position.set(x,0,z);
  var tr=new THREE.Mesh(new THREE.CylinderGeometry(0.16*esc,0.24*esc,1.6*esc,7), matStd(0x6a4a28,0.9));
  tr.position.y=0.8*esc; tr.castShadow=true; g.add(tr);
  var cor= [0x3f7a3a,0x4a8a44,0x367034][Math.floor(Math.random()*3)];
  var c1=new THREE.Mesh(new THREE.IcosahedronGeometry(1.05*esc,0), matStd(cor,0.95));
  c1.position.y=2.2*esc; c1.castShadow=true; g.add(c1);
  var c2=new THREE.Mesh(new THREE.IcosahedronGeometry(0.8*esc,0), matStd(cor,0.95));
  c2.position.set(0.6*esc,1.7*esc,0.2*esc); c2.castShadow=true; g.add(c2);
  var c3=c2.clone(); c3.position.set(-0.55*esc,1.75*esc,-0.15*esc); g.add(c3);
  mundo.add(g);
  colisores.push({x:x,z:z,r:0.5*esc});
  return g;
}

/* --- prop de easter egg --- */
function propEgg(k,cor){
  var g=new THREE.Group();
  var m=matStd(cor,0.7,0.15);
  if (k==='livro'){ var b=new THREE.Mesh(new THREE.BoxGeometry(0.5,0.66,0.16),m); b.position.y=0.33; g.add(b); }
  else if (k==='coluna'){ var c=new THREE.Mesh(new THREE.CylinderGeometry(0.18,0.2,1.4,14),m); c.position.y=0.7; g.add(c);
    var cap=new THREE.Mesh(new THREE.BoxGeometry(0.5,0.14,0.5),m); cap.position.y=1.42; g.add(cap); g.add(cap.clone().translateY(-1.36)); }
  else if (k==='ampulheta'){ var t1=new THREE.Mesh(new THREE.ConeGeometry(0.28,0.5,12),m); t1.position.y=0.85; g.add(t1);
    var t2=new THREE.Mesh(new THREE.ConeGeometry(0.28,0.5,12),m); t2.rotation.x=Math.PI; t2.position.y=0.35; g.add(t2); }
  else if (k==='selo'){ var d=new THREE.Mesh(new THREE.CylinderGeometry(0.4,0.4,0.14,20),m); d.position.y=0.5; g.add(d);
    var pin=new THREE.Mesh(new THREE.CylinderGeometry(0.06,0.06,0.6,8),matStd(0x8a5a1e,0.7)); pin.position.y=0.2; g.add(pin); }
  else if (k==='carimbo'){ var kn=new THREE.Mesh(new THREE.CylinderGeometry(0.16,0.16,0.4,10),m); kn.position.y=0.8; g.add(kn);
    var pd=new THREE.Mesh(new THREE.BoxGeometry(0.5,0.28,0.5),m); pd.position.y=0.4; g.add(pd); }
  else if (k==='pergaminho'){ var rl=new THREE.Mesh(new THREE.CylinderGeometry(0.16,0.16,0.9,12),matStd(0xefe3c2,0.8)); rl.rotation.z=Math.PI/2; rl.position.y=0.5; g.add(rl); }
  else if (k==='cadeira'){ var st=new THREE.Mesh(new THREE.BoxGeometry(0.5,0.12,0.5),m); st.position.y=0.5; g.add(st);
    var bk=new THREE.Mesh(new THREE.BoxGeometry(0.5,0.6,0.1),m); bk.position.set(0,0.85,-0.2); g.add(bk); }
  else if (k==='placa'){ var pl=new THREE.Mesh(new THREE.BoxGeometry(0.9,0.5,0.08),m); pl.position.y=0.9; g.add(pl);
    var ps=new THREE.Mesh(new THREE.CylinderGeometry(0.05,0.05,1,8),matStd(0x8a5a1e,0.8)); ps.position.y=0.5; g.add(ps); }
  else if (k==='caneca'){ var mg=new THREE.Mesh(new THREE.CylinderGeometry(0.2,0.18,0.44,14),m); mg.position.y=0.4; g.add(mg); }
  else { var bo=new THREE.Mesh(new THREE.BoxGeometry(0.4,0.4,0.4),m); bo.position.y=0.3; g.add(bo); }
  g.traverse(function(o){ if(o.isMesh) o.castShadow=true; });
  return g;
}

/* --- marcador de aula --- */
function novoMarcador(A,i){
  var g=new THREE.Group(); g.position.set(A.local.x,0,A.local.z);
  var anel=new THREE.Mesh(new THREE.RingGeometry(0.9,1.3,32), new THREE.MeshBasicMaterial({color:0xe7b84f,transparent:true,opacity:0.5,side:THREE.DoubleSide}));
  anel.rotation.x=-Math.PI/2; anel.position.y=0.03; g.add(anel);
  var pilar=new THREE.Mesh(new THREE.CylinderGeometry(0.05,0.05,1.4,8), matStd(0xe7b84f,0.3,0.5));
  pilar.position.y=0.7; g.add(pilar);
  var sp=labelSprite(A.emoji,{fs:60,h:0.9,bg:'rgba(0,0,0,0)'});
  sp.position.y=1.9; g.add(sp);
  var luz=new THREE.PointLight(0xe7b84f,0,6,2); luz.position.y=1.2; g.add(luz);
  mundo.add(g);
  return { group:g, anel:anel, sp:sp, pilar:pilar, luz:luz, A:A, i:i };
}

/* --- água --- */
function novaAgua(){
  var geo=new THREE.PlaneGeometry(52, 30, 40, 24);
  geo.rotateX(-Math.PI/2);
  aguaGeoBase = geo.attributes.position.array.slice();
  var mat=new THREE.MeshStandardMaterial({ color:0x2d6b7a, roughness:0.12, metalness:0.5, transparent:true, opacity:0.92 });
  var m=new THREE.Mesh(geo,mat);
  m.position.set(6, 0.06, 26); m.receiveShadow=true;
  mundo.add(m);
  colisores.push({x:6,z:26,r:0}); // não bloqueia (r=0); água tratada à parte
  return m;
}
function dentroAgua(x,z){
  return x> -20 && x<32 && z>11 && z<41 && (Math.abs(x-6)/26 + Math.abs(z-26)/15) < 1.15;
}

/* --- planta --- */
function novaPlanta3d(cx,cz,cultivo,estagio){
  var C=CULTIVOS[cultivo];
  var g=new THREE.Group(); g.position.set(cx,0,cz);
  var f=estagio/C.dias;
  var haste=new THREE.Mesh(new THREE.CylinderGeometry(0.03,0.05,Math.max(0.12,f*0.7),6), matStd(0x3a7a3a,0.9));
  haste.position.y=Math.max(0.06,f*0.35); g.add(haste);
  if (estagio>=C.dias){
    var doc=new THREE.Mesh(new THREE.BoxGeometry(0.4,0.5,0.08), matStd(C.cor,0.7));
    doc.position.y=0.65; g.add(doc);
    var luz=new THREE.PointLight(C.cor,0.5,2,2); luz.position.y=0.7; g.add(luz);
  } else {
    var fo=new THREE.Mesh(new THREE.IcosahedronGeometry(0.12+f*0.14,0), matStd(0x4f9a48,0.9));
    fo.position.y=Math.max(0.1,f*0.55); g.add(fo);
  }
  g.traverse(function(o){ if(o.isMesh) o.castShadow=true; });
  mundo.add(g); return g;
}
function tilePatch(cx,cz){
  var m=new THREE.Mesh(new THREE.PlaneGeometry(GRID*0.92,GRID*0.92), matStd(0x5a3d28,1));
  m.rotation.x=-Math.PI/2; m.position.set(cx,0.04,cz); m.receiveShadow=true;
  mundo.add(m); return m;
}

/* --- decoração --- */
function espalharVerde(){
  var geoT=new THREE.ConeGeometry(0.12,0.4,5);
  var matT=matStd(0x4f9a48,0.95);
  var inst=new THREE.InstancedMesh(geoT, matT, 500);
  var d=new THREE.Object3D();
  for (var i=0;i<500;i++){
    var x=rand(-64,64), z=rand(-64,64);
    d.position.set(x,0.2,z); d.rotation.y=Math.random()*7; d.scale.setScalar(rand(0.6,1.4));
    d.updateMatrix(); inst.setMatrixAt(i,d.matrix);
  }
  inst.castShadow=false; inst.receiveShadow=true;
  mundo.add(inst); grama=inst;
  // flores
  var fm=[matStd(0xd84a7a,0.8),matStd(0xe7b84f,0.8),matStd(0x8f7cd0,0.8)];
  for (var f=0;f<50;f++){
    var fg=new THREE.Group(); fg.position.set(rand(-58,58),0,rand(-58,58));
    var st=new THREE.Mesh(new THREE.CylinderGeometry(0.02,0.02,0.3,5), matStd(0x3a7a3a,0.9)); st.position.y=0.15; fg.add(st);
    var pt=new THREE.Mesh(new THREE.IcosahedronGeometry(0.09,0), fm[f%3]); pt.position.y=0.32; fg.add(pt);
    mundo.add(fg);
  }
}
function novaNuvem(x,y,z){
  var g=new THREE.Group(); g.position.set(x,y,z);
  var m=new THREE.MeshStandardMaterial({color:0xffffff, roughness:1, metalness:0, transparent:true, opacity:0.9});
  for (var i=0;i<4;i++){
    var s=new THREE.Mesh(new THREE.IcosahedronGeometry(rand(2,3.4),0), m);
    s.position.set(i*3-4.5, rand(-0.6,0.6), rand(-1.4,1.4)); g.add(s);
  }
  g.userData.v=rand(0.3,0.7);
  mundo.add(g); nuvens.push(g);
}

/* --- céu (gradiente) --- */
function novoCeu(){
  var c=mk(2,256), g=c.getContext('2d');
  var t=new THREE.CanvasTexture(c);
  var geo=new THREE.SphereGeometry(300,24,16);
  var mat=new THREE.MeshBasicMaterial({map:t, side:THREE.BackSide, depthWrite:false, fog:false});
  var m=new THREE.Mesh(geo,mat);
  m.userData.cv=c; m.userData.tex=t;
  scene.add(m);
  return m;
}
function pintaCeu(topo,horiz){
  var c=skyMesh.userData.cv, g=c.getContext('2d');
  var gr=g.createLinearGradient(0,0,0,256);
  gr.addColorStop(0,topo); gr.addColorStop(0.55,horiz); gr.addColorStop(1,horiz);
  g.fillStyle=gr; g.fillRect(0,0,2,256);
  skyMesh.userData.tex.needsUpdate=true;
}

/* ================================================================
   INIT
   ================================================================ */
function init3D(){
  scene=new THREE.Scene();
  camera=new THREE.PerspectiveCamera(55, ar(), 0.1, 500);

  renderer=new THREE.WebGLRenderer({ canvas:$('cv'), antialias:true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1, 2));
  renderer.setSize(w(), h(), false);
  renderer.shadowMap.enabled=true;
  renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  if (THREE.sRGBEncoding) renderer.outputEncoding=THREE.sRGBEncoding;
  if (THREE.ACESFilmicToneMapping){ renderer.toneMapping=THREE.ACESFilmicToneMapping; renderer.toneMappingExposure=1.05; }

  mundo=new THREE.Group(); scene.add(mundo);
  skyMesh=novoCeu();
  scene.fog=new THREE.FogExp2(0xcfe0ea, 0.012);

  hemi=new THREE.HemisphereLight(0xbfe0ff, 0x4a5a3a, 0.7); scene.add(hemi);
  amb=new THREE.AmbientLight(0xffffff, 0.18); scene.add(amb);
  sol=new THREE.DirectionalLight(0xfff2d8, 1.15);
  sol.castShadow=true;
  sol.shadow.mapSize.set(2048,2048);
  sol.shadow.camera.left=-30; sol.shadow.camera.right=30; sol.shadow.camera.top=30; sol.shadow.camera.bottom=-30;
  sol.shadow.camera.near=1; sol.shadow.camera.far=120;
  sol.shadow.bias=-0.0004;
  scene.add(sol); scene.add(sol.target);
  luaLuz=new THREE.DirectionalLight(0x8fb4e0, 0.0); scene.add(luaLuz);

  // chão
  var chao=new THREE.Mesh(new THREE.PlaneGeometry(160,160), matStd(0x5c9d54,1));
  chao.material.map=texChao(); chao.material.needsUpdate=true;
  chao.rotation.x=-Math.PI/2; chao.receiveShadow=true; mundo.add(chao);

  PREDIOS.forEach(function(P){ novoPredio(P); });
  // árvores (bosque denso + espalhadas)
  var bosque=[ [-34,20],[-30,26],[-24,30],[-16,34],[-8,38],[-2,30],[4,26],[-34,34],[-26,40],[-14,44],[-6,46],[2,42],[10,40],[-38,14],[-38,28],[10,30],[8,34] ];
  bosque.forEach(function(t){ novaArvore(t[0],t[1], rand(0.9,1.4)); });
  var soltas=[ [-52,-30],[-50,10],[-48,40],[30,-30],[40,10],[44,-8],[38,30],[-20,-38],[20,-38],[-8,-32],[26,-18],[-46,-8] ];
  soltas.forEach(function(t){ novaArvore(t[0],t[1], rand(1,1.6)); });

  agua=novaAgua();
  // doca
  var doca=new THREE.Mesh(new THREE.BoxGeometry(3,0.3,5), matStd(0x7a5a3a,0.85));
  doca.position.set(DOCA.x, 0.2, DOCA.z-2); doca.castShadow=true; doca.receiveShadow=true; mundo.add(doca);
  // fonte da praça
  var fonte=new THREE.Group(); fonte.position.set(0,0,4);
  var fb1=new THREE.Mesh(new THREE.CylinderGeometry(1.6,1.8,0.5,20), matStd(0x9aa0a8,0.9)); fb1.position.y=0.25; fonte.add(fb1);
  var fw=new THREE.Mesh(new THREE.CylinderGeometry(1.3,1.3,0.1,20), matStd(0x4f92c0,0.2,0.4)); fw.position.y=0.45; fonte.add(fw);
  var fc=new THREE.Mesh(new THREE.CylinderGeometry(0.14,0.2,1.2,10), matStd(0x9aa0a8,0.9)); fc.position.y=0.9; fonte.add(fc);
  fonte.traverse(function(o){ if(o.isMesh) o.castShadow=true; });
  mundo.add(fonte); colisores.push({x:0,z:4,r:2});
  // caixa de remessa + correio
  var rem=new THREE.Mesh(new THREE.BoxGeometry(1,1.1,0.8), matStd(0x8a5a34,0.8)); rem.position.set(REMESSA.x,0.55,REMESSA.z); rem.castShadow=true; mundo.add(rem);
  var cor=new THREE.Group(); cor.position.set(CORREIO.x,0,CORREIO.z);
  var cp=new THREE.Mesh(new THREE.CylinderGeometry(0.06,0.06,1.1,8), matStd(0x7a5a3a,0.8)); cp.position.y=0.55; cor.add(cp);
  var cb=new THREE.Mesh(new THREE.BoxGeometry(0.5,0.4,0.35), matStd(0x3a6a9a,0.7)); cb.position.y=1.15; cor.add(cb);
  cor.traverse(function(o){ if(o.isMesh) o.castShadow=true; }); mundo.add(cor);
  // cama (fora do prédio)
  var cama=new THREE.Group(); cama.position.set(CAMA.x,0,CAMA.z);
  var cm=new THREE.Mesh(new THREE.BoxGeometry(1.2,0.4,2.1), matStd(0x8a5a3a,0.8)); cm.position.y=0.2; cama.add(cm);
  var cq=new THREE.Mesh(new THREE.BoxGeometry(1.2,0.2,2), matStd(0xd8d0e0,0.9)); cq.position.y=0.45; cama.add(cq);
  cama.traverse(function(o){ if(o.isMesh) o.castShadow=true; }); mundo.add(cama);

  // postes de luz ao longo dos caminhos
  [[-20,-4],[-8,-6],[6,-4],[0,10],[-18,14],[-10,24],[-32,-20]].forEach(function(p){
    var g=new THREE.Group(); g.position.set(p[0],0,p[1]);
    var post=new THREE.Mesh(new THREE.CylinderGeometry(0.06,0.09,3,8), matStd(0x30302f,0.7)); post.position.y=1.5; post.castShadow=true; g.add(post);
    var lamp=new THREE.Mesh(new THREE.SphereGeometry(0.16,10,8), new THREE.MeshStandardMaterial({color:0xffe6b0,emissive:0xffcf8a,emissiveIntensity:0})); lamp.position.y=3; g.add(lamp);
    var pl=new THREE.PointLight(0xffcf8a,0,8,2); pl.position.y=3; g.add(pl);
    luzesNoite.push({light:pl, base:1.1, lamp:lamp});
    mundo.add(g); colisores.push({x:p[0],z:p[1],r:0.3});
  });

  espalharVerde();
  novaNuvem(-30,26,-40); novaNuvem(20,30,10); novaNuvem(-10,24,40); novaNuvem(40,28,-10);

  // fireflies (partículas noturnas no bosque)
  var fg=new THREE.BufferGeometry();
  var fpos=new Float32Array(60*3);
  for (var i=0;i<60;i++){ fpos[i*3]=rand(-38,10); fpos[i*3+1]=rand(0.5,2.5); fpos[i*3+2]=rand(14,48); }
  fg.setAttribute('position', new THREE.BufferAttribute(fpos,3));
  var fmat=new THREE.PointsMaterial({color:0xffe08a, size:0.14, transparent:true, opacity:0});
  var fpts=new THREE.Points(fg,fmat); mundo.add(fpts); fireflies=fpts;

  // chuva
  var cg=new THREE.BufferGeometry();
  var cpos=new Float32Array(700*3);
  for (var r=0;r<700;r++){ cpos[r*3]=rand(-40,40); cpos[r*3+1]=rand(0,30); cpos[r*3+2]=rand(-40,40); }
  cg.setAttribute('position', new THREE.BufferAttribute(cpos,3));
  chuva3d=new THREE.Points(cg, new THREE.PointsMaterial({color:0xbfd0e0, size:0.08, transparent:true, opacity:0.6}));
  chuva3d.visible=false; scene.add(chuva3d);

  // personagem
  var P=novaPessoa({roupa:0x2f2440,cabelo:0x3a2b24,pele:0xf0c9a0,oculos:1});
  fb=P.group; fbParts=P; fb.position.set(E.px,0,E.pz);
  scene.add(fb);
  camYaw=0; camera.position.set(E.px, 6, E.pz-8);

  AULAS.forEach(function(A,i){ aula3d.push(novoMarcador(A,i)); });
  EGGS.forEach(function(eg){
    var g=new THREE.Group(); g.position.set(eg.x,0,eg.z);
    var prop=propEgg(eg.k, eg.cor); g.add(prop);
    var oct=new THREE.Mesh(new THREE.OctahedronGeometry(0.22), new THREE.MeshBasicMaterial({color:0xffe08a}));
    oct.position.y=1.7; g.add(oct);
    var q=labelSprite('?',{fs:56,h:0.5,bg:'rgba(0,0,0,0)',color:'#e7b84f'}); q.position.y=2.3; g.add(q);
    mundo.add(g);
    egg3d.push({group:g, oct:oct, q:q, eg:eg});
  });

  clock=new THREE.Clock();
  window.addEventListener('resize', onResize);
  document.addEventListener('keydown', onKey);
  document.addEventListener('keyup', onKey);
  window.addEventListener('wheel', onWheel, {passive:true});
  window.addEventListener('blur', function(){ teclas={}; });

  refazTilledEPlants();
  pintaAulas3d(); atualizaEggs3d();
  loop();
}
function w(){ return $('app').clientWidth||800; }
function h(){ return $('app').clientHeight||600; }
function ar(){ return w()/h(); }
function onResize(){ if(!renderer) return; camera.aspect=ar(); camera.updateProjectionMatrix(); renderer.setSize(w(),h(),false); }

function refazTilledEPlants(){
  Object.keys(tilled3d).forEach(function(k){ mundo.remove(tilled3d[k]); }); tilled3d={};
  Object.keys(plant3d).forEach(function(k){ mundo.remove(plant3d[k]); }); plant3d={};
  Object.keys(E.tilled).forEach(function(k){
    var p=k.split(','), cx=(+p[0])*GRID, cz=(+p[1])*GRID;
    tilled3d[k]=tilePatch(cx,cz);
  });
  Object.keys(E.plants).forEach(function(k){
    var p=k.split(','), cx=(+p[0])*GRID, cz=(+p[1])*GRID, pl=E.plants[k];
    plant3d[k]=novaPlanta3d(cx,cz,pl.cultivo,pl.estagio);
  });
}

/* ================================================================
   INPUT
   ================================================================ */
function onKey(e){
  var k=e.key.toLowerCase(), down=e.type==='keydown';
  if (['arrowup','arrowdown','arrowleft','arrowright',' '].indexOf(k)!==-1) e.preventDefault();
  if (k==='w'||k==='arrowup') teclas.up=down;
  else if (k==='s'||k==='arrowdown') teclas.down=down;
  else if (k==='a'||k==='arrowleft') teclas.left=down;
  else if (k==='d'||k==='arrowright') teclas.right=down;
  else if (k==='shift') teclas.run=down;
  else if (k==='q') teclas.q=down;
  else if (k==='r' && down) {}
  else if (down && (k==='e'||k===' ')){
    if (pescaSt){ pescaHold(); }
    else if (!algumPainel()) interagir();
    teclas.eHold=true;
  }
  if (!down && (k==='e'||k===' ')) teclas.eHold=false;
  if (k==='e' && !down) teclas.eHold=false;
}
function onWheel(e){ if (algumPainel()) return; E.hot=(E.hot+(e.deltaY>0?1:7))%8; renderHotbar(); }

/* ================================================================
   INTERAÇÃO
   ================================================================ */
function d2(ax,az,bx,bz){ var dx=ax-bx,dz=az-bz; return Math.sqrt(dx*dx+dz*dz); }
function frente(dist){
  return { x: fb.position.x + Math.sin(fbYaw)*dist, z: fb.position.z + Math.cos(fbYaw)*dist };
}
function celula(x,z){ return Math.round(x/GRID)+','+Math.round(z/GRID); }

function interagir(){
  if (pausado) return;
  var px=fb.position.x, pz=fb.position.z;

  // NPC
  var nk=null;
  Object.keys(NPCS).forEach(function(k){ var s=npc3d[k]; if(s && d2(px,pz,s.group.position.x,s.group.position.z)<2.4) nk=k; });
  if (nk){ falarNPC(nk); return; }

  // aula
  for (var i=0;i<AULAS.length;i++){
    var L=AULAS[i].local;
    if (d2(px,pz,L.x,L.z)<2.4){ if(aulaLiberada(i)) iniciarAula(i); else toast('Trancada','Termine a aula anterior primeiro.'); return; }
  }
  // loja
  for (var q=0;q<PREDIOS.length;q++){ var P=PREDIOS[q];
    if (P.loja && d2(px,pz,P.porta.x,P.porta.z)<2.6){ abrirLoja(P.loja); return; }
  }
  // cama
  if (d2(px,pz,CAMA.x,CAMA.z)<2.4){ dormir(); return; }
  // remessa
  if (d2(px,pz,REMESSA.x,REMESSA.z)<2.2){ abrirRemessa(); return; }
  // egg
  for (var g=0;g<EGGS.length;g++){ var eg=EGGS[g]; if(eggFeito(eg.id)) continue;
    if (d2(px,pz,eg.x,eg.z)<1.8){ coletarEgg(eg); return; }
  }
  // pesca
  var it=itemSel();
  if (it && it.id==='lupa' && dentroAguaPerto()){ pescar(); return; }
  // forrageio
  for (var f=0;f<FORRAGEIO.length;f++){ var fr=FORRAGEIO[f]; if(fr.colhido) continue;
    if (d2(px,pz,fr.x,fr.z)<2){ fr.colhido=true; var pk=Math.random()<0.5?'ementa':'cravo';
      invAdd(pk,1); flutua3d(px,1.6,pz,'+ '+ITENS[pk].nome,'#2e7d5b'); poeira(px,0.5,pz,0x8fd07a);
      (function(x){ setTimeout(function(){ x.colhido=false; }, 60000); })(fr); return; }
  }
  // ferramentas na baia
  var tf=frente(1.1);
  var dentro = tf.x>=PLANTIO.x0-0.8 && tf.x<=PLANTIO.x1+0.8 && tf.z>=PLANTIO.z0-0.8 && tf.z<=PLANTIO.z1+0.8;
  var kk=celula(tf.x,tf.z);
  var cx=Math.round(tf.x/GRID)*GRID, cz=Math.round(tf.z/GRID)*GRID;
  if (it && it.id==='caneta' && dentro && !E.tilled[kk]){
    if (gastarFoco(6)){ E.tilled[kk]=1; tilled3d[kk]=tilePatch(cx,cz); poeira(cx,0.3,cz,0x7a5a3a); actTimer=0.4; }
    return;
  }
  if (it && ITENS[it.id] && ITENS[it.id].tipo==='semente' && E.tilled[kk] && !E.plants[kk]){
    E.plants[kk]={cultivo:ITENS[it.id].cultivo,estagio:0,prot:false};
    plant3d[kk]=novaPlanta3d(cx,cz,ITENS[it.id].cultivo,0);
    invRemove(it.id,1); poeira(cx,0.3,cz,0x8fd07a); actTimer=0.4; return;
  }
  if (it && it.id==='carimbo' && E.plants[kk] && !E.plants[kk].prot){
    if (gastarFoco(4)){ E.plants[kk].prot=true; poeira(cx,0.4,cz,0xe7b84f); actTimer=0.4; }
    return;
  }
  if (E.plants[kk]){
    var pl=E.plants[kk], C=CULTIVOS[pl.cultivo];
    if (pl.estagio>=C.dias){
      invAdd(C.produto,1); delete E.plants[kk];
      if (plant3d[kk]){ mundo.remove(plant3d[kk]); delete plant3d[kk]; }
      E.skill.processos += C.xp;
      flutua3d(cx,1.2,cz,'+ '+ITENS[C.produto].nome,'#b8362e'); poeira(cx,0.5,cz,C.cor); actTimer=0.4;
      return;
    }
  }
  // comer
  if (it && ITENS[it.id] && ITENS[it.id].tipo==='comida'){
    E.foco=Math.min(E.focoMax, E.foco+ITENS[it.id].foco);
    invRemove(it.id,1); flutua3d(px,1.6,pz,'+'+ITENS[it.id].foco+' foco','#e7b84f'); atualizaHud();
    return;
  }
}
function dentroAguaPerto(){
  return dentroAgua(fb.position.x + Math.sin(fbYaw)*1.5, fb.position.z + Math.cos(fbYaw)*1.5)
      || d2(fb.position.x,fb.position.z,DOCA.x,DOCA.z)<4;
}

/* ---------------- NPC ---------------- */
var falaIdx={};
function falarNPC(nk){
  var N=NPCS[nk]; falaIdx[nk]=falaIdx[nk]||0;
  var fala=N.falas[falaIdx[nk]%N.falas.length]; falaIdx[nk]++;
  if (E.npc[nk].pd!==E.dia){ E.npc[nk].amiz=Math.min(100,E.npc[nk].amiz+3); E.npc[nk].pd=E.dia; }
  var it=itemSel();
  var podePresente = it && ITENS[it.id] && ITENS[it.id].tipo!=='ferramenta' && ITENS[it.id].tipo!=='comida';
  abrirDlgSimples(N.nome, N.cargo, fala, podePresente ? [
    {txt:'Dar "'+ITENS[it.id].nome+'"', fn:function(){
      var g = N.gosta && N.gosta.indexOf(it.id)!==-1;
      E.npc[nk].amiz=Math.min(100,E.npc[nk].amiz+(g?12:4)); invRemove(it.id,1);
      abrirDlgSimples(N.nome,N.cargo, g?'Ah, adorei! Muito obrigado(a).':'Obrigado(a), que gentileza.', []);
      atualizaHud();
    }},
    {txt:'Só conversar', fn:fecharDlg}
  ] : []);
}

/* ---------------- easter egg ---------------- */
function coletarEgg(eg){
  if (!eggFeito(eg.id)){ prog.easterEggs.push(eg.id); salvarTudo(); poeira(eg.x,1,eg.z,0xffe08a,20); }
  for (var i=0;i<egg3d.length;i++) if(egg3d[i].eg.id===eg.id){ egg3d[i].group.visible=false; egg3d[i].col=true; }
  toast('🥚 '+eg.titulo+'  ('+prog.easterEggs.length+'/'+EGGS.length+')', eg.texto);
  atualizaHud();
}

/* ---------------- pesca (DOM) ---------------- */
var pescaSt=null, pescaLoop=null;
function pescar(){
  if (pescaSt) return;
  pescaSt={ fase:'esperar', t:0, alvo:1+Math.random()*2, mira:0.5, alvoPos:0.5, prog:0, tempo:0, hold:false };
  pausado=true;
  $('pesca-msg').textContent='Vasculhando o DJEN…';
  $('pesca-arena').style.display='none'; $('pesca-bar').style.display='none';
  abrirPainel('p-pesca');
  pescaLoop=setInterval(function(){
    var s=pescaSt; if(!s){ clearInterval(pescaLoop); return; }
    s.t+=0.05;
    if (s.fase==='esperar'){
      if (s.t>=s.alvo){ s.fase='fisga'; s.t=0; $('pesca-msg').textContent='FISGOU! Aperte E / espaço!'; }
    } else if (s.fase==='fisga'){
      if (s.t>1.3){ finPesca(false,'A publicação sumiu na lista.'); }
    } else if (s.fase==='puxar'){
      s.tempo+=0.05;
      s.alvoPos=0.5+Math.sin(s.tempo*1.5)*0.34;
      s.mira=clamp(s.mira + (s.hold?0.028:-0.024), 0.05, 0.95);
      var perto=Math.abs(s.mira-s.alvoPos)<0.14;
      s.prog=clamp(s.prog + (perto?0.014:-0.011), 0, 1);
      $('pesca-alvo').style.left=(s.alvoPos*100-3)+'%';
      $('pesca-mira').style.left=(s.mira*100-8)+'%';
      $('pesca-fill').style.width=(s.prog*100)+'%';
      if (s.prog>=1) finPesca(true);
      else if (s.tempo>16) finPesca(false,'A vara escapou.');
    }
  },50);
}
function pescaHold(){
  var s=pescaSt; if(!s) return;
  if (s.fase==='fisga'){ s.fase='puxar'; s.t=0; s.prog=0; s.tempo=0; $('pesca-msg').textContent='Puxa!'; $('pesca-arena').style.display='block'; $('pesca-bar').style.display='block'; }
  s.hold=true;
}
document.addEventListener('keyup', function(e){ if((e.key===' '||e.key.toLowerCase()==='e') && pescaSt) pescaSt.hold=false; });
function finPesca(ok, msg){
  clearInterval(pescaLoop); pescaSt=null; fecharTudo();
  if (ok){ var pk=Math.random()<0.15?'ementa':'publicacao'; invAdd(pk,1);
    toast('Achou!','Uma '+ITENS[pk].nome+' na triagem do DJEN. Vale R$ '+ITENS[pk].preco+' na Caixa de Remessa.');
  } else toast('Escapou', msg||'Tente de novo.');
}

/* ---------------- dormir ---------------- */
function dormir(){
  var f=$('fade'); f.style.opacity='1'; pausado=true; fecharTudo();
  setTimeout(function(){
    var choveu=E.clima==='chuva';
    Object.keys(E.plants).forEach(function(k){
      var pl=E.plants[k]; if (pl.prot||choveu) pl.estagio++;
      pl.prot=false;
    });
    if (E.vendaPendente>0){ E.dinheiro+=E.vendaPendente; E.vendaPendente=0; }
    var tarde=E.hora>=24*60;
    E.dia++; E.hora=6*60;
    E.foco = tarde ? Math.round(E.focoMax*0.6) : E.focoMax;
    E.clima = Math.random()<0.30 ? 'chuva':'sol';
    fb.position.set(CAMA.x+1.5, 0, CAMA.z);
    refazTilledEPlants(); pintaAulas3d(); atualizaHud();
    salvarTudo();
    toast('Dia '+E.dia, (choveu?'Choveu — seus casos andaram sozinhos. ':'') + (E.clima==='chuva'?'Hoje: chuva ☔':'Hoje: sol ☀'));
    setTimeout(function(){ f.style.opacity='0'; pausado=false; }, 90);
  }, 420);
}

/* ---------------- painéis / loja / remessa ---------------- */
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

function abrirRemessa(){
  var lista=$('loja-lista'); $('loja-nome').textContent='Caixa de Remessa — vender';
  var itens=[]; E.inv.forEach(function(s,i){ if(s && ITENS[s.id] && ITENS[s.id].tipo==='produto') itens.push({i:i,id:s.id,qt:s.qt}); });
  lista.innerHTML = itens.length ? itens.map(function(x){
    return '<div class="loja-item"><canvas class="ii" data-id="'+x.id+'"></canvas><div><div class="li-n">'+esc(ITENS[x.id].nome)+' ×'+x.qt+'</div><div class="li-p">R$ '+ITENS[x.id].preco+' cada</div></div><button data-sell="'+x.i+'">vender 1</button></div>';
  }).join('') : '<div class="vazio" style="grid-column:1/-1">Nada para vender. Produza sentenças ou pesque publicações.</div>';
  $('loja-saldo').textContent='Recebe amanhã: R$ '+E.vendaPendente+'  ·  Saldo: R$ '+E.dinheiro;
  pintarIconesLoja();
  Array.prototype.forEach.call(lista.querySelectorAll('[data-sell]'), function(b){
    b.onclick=function(){ var i=parseInt(b.dataset.sell,10), s=E.inv[i]; if(!s) return; E.vendaPendente+=ITENS[s.id].preco; invRemove(s.id,1); abrirRemessa(); };
  });
  abrirPainel('p-loja');
}
function abrirLoja(nk){
  $('loja-nome').textContent=(NPCS[nk]?NPCS[nk].nome:'Cartório')+' — comprar';
  var lista=$('loja-lista');
  lista.innerHTML=LOJA.map(function(id){ var d=ITENS[id];
    return '<div class="loja-item"><canvas class="ii" data-id="'+id+'"></canvas><div><div class="li-n">'+esc(d.nome)+'</div><div class="li-p">R$ '+d.preco+'</div></div><button data-buy="'+id+'">comprar</button></div>';
  }).join('');
  $('loja-saldo').textContent='Saldo: R$ '+E.dinheiro;
  pintarIconesLoja();
  Array.prototype.forEach.call(lista.querySelectorAll('[data-buy]'), function(b){
    b.onclick=function(){ var id=b.dataset.buy, d=ITENS[id];
      if (E.dinheiro<d.preco){ b.textContent='sem R$'; setTimeout(function(){ b.textContent='comprar'; },700); return; }
      if (!invAdd(id,1)){ b.textContent='cheia'; setTimeout(function(){ b.textContent='comprar'; },800); return; }
      E.dinheiro-=d.preco; $('loja-saldo').textContent='Saldo: R$ '+E.dinheiro; atualizaHud(); renderHotbar();
    };
  });
  abrirPainel('p-loja');
}
function pintarIconesLoja(){
  Array.prototype.forEach.call(document.querySelectorAll('#loja-lista .ii'), function(c){
    c.width=28; c.height=28; var g=c.getContext('2d'); g.imageSmoothingEnabled=false; g.clearRect(0,0,28,28); g.drawImage(iconeItem(c.dataset.id),0,0,28,28);
  });
}

/* ---------------- diálogo simples ---------------- */
function abrirDlgSimples(nome,tag,txt,opcoes){
  $('dlg-nome').firstChild.textContent=nome+' ';
  $('dlg-tag').textContent=tag||'';
  $('dlg-corpo').className='corpo'; $('dlg-corpo').textContent=txt;
  var e2=$('dlg-escolhas'); e2.innerHTML='';
  (opcoes||[]).forEach(function(o){ var b=document.createElement('button'); b.className='escolha'; b.textContent=o.txt; b.onclick=o.fn; e2.appendChild(b); });
  $('dlg-rodape').innerHTML=(opcoes&&opcoes.length)?'':'<button class="bt claro" id="ds-ok">ok</button>';
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
  abrirPainel('p-dlg'); mostraFala();
}
function mostraFala(){
  var s=sessao; if(!s) return;
  if (s.fi>=s.fs.length){ iniciaQuiz(); return; }
  var fa=s.fs[s.fi];
  $('dlg-escolhas').innerHTML='';
  $('dlg-corpo').className='corpo'+(fa.t==='dica'?' dica':fa.t==='titulo'?' titulo':'');
  if (fa.t==='lista') tw('<ul>'+fa.itens.map(function(i){return '<li>'+esc(i)+'</li>';}).join('')+'</ul>', false);
  else tw(fa.x);
  var ult=s.fi===s.fs.length-1;
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
    $('dlg-rodape').innerHTML = (ult&&!jaFeita) ? '<button class="bt ouro" id="rc">🏅 Ver diploma</button><button class="bt claro" id="rm">Voltar</button>'
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
  pintaAulas3d(); atualizaHud();
}

/* ---------------- persistência ---------------- */
function recalcPontos(c){ return Object.keys(c).reduce(function(a,id){ return a+(c[id].pontos||0); },0); }
function salvarConclusao(id,pt,tot){
  prog.concluidas[id]={pontos:pt,total:tot,em:Date.now()};
  prog.pontosTotais=recalcPontos(prog.concluidas); prog.nome=meuNome;
  atualizaHud(); salvarTudo();
}
function salvarTudo(){
  if (fb){ E.px=fb.position.x; E.pz=fb.position.z; }
  try { localStorage.setItem('fbzinho-comarca', JSON.stringify({prog:prog, E:E})); } catch(e){}
  if (!progRef) return;
  var tudo = Object.keys(prog.concluidas).length >= AULAS.length;
  if (tudo && !prog.concluidoEm) prog.concluidoEm = Date.now();
  var payload = { concluidas:prog.concluidas, pontosTotais:prog.pontosTotais, easterEggs:prog.easterEggs, nome:meuNome, jogoEstado:E, atualizadoEm:firebase.firestore.FieldValue.serverTimestamp() };
  if (tudo) payload.concluidoEm = prog.concluidoEm;
  progRef.set(payload, { merge:true }).catch(function(err){ console.warn('save:', err && err.message); });
}
function carregar(cb){
  var local=null;
  try { local=JSON.parse(localStorage.getItem('fbzinho-comarca')||'null'); } catch(e){}
  function aplica(d){
    if (d && d.concluidas){ prog.concluidas=d.concluidas||{}; prog.pontosTotais=d.pontosTotais||recalcPontos(prog.concluidas); prog.easterEggs=Array.isArray(d.easterEggs)?d.easterEggs:[]; prog.concluidoEm=d.concluidoEm||null; prog.nome=d.nome||''; }
    var je=d && d.jogoEstado;
    E = je && je.inv ? je : (local && local.E && local.E.inv ? local.E : estadoNovo());
    if (!E.npc) E.npc={ helena:{amiz:0,pd:0}, tiberio:{amiz:0,pd:0}, iris:{amiz:0,pd:0} };
    if (!E.skill) E.skill={processos:0};
    if (typeof E.px!=='number'){ E.px=-30; E.pz=-14; }
    if (cb) cb();
  }
  if (progRef){
    progRef.get().then(function(doc){ aplica(doc.exists?doc.data():(local&&local.prog?Object.assign({},local.prog,{jogoEstado:local.E}):null)); })
      .catch(function(){ aplica(local?Object.assign({},local.prog,{jogoEstado:local.E}):null); });
  } else aplica(local?Object.assign({},local.prog,{jogoEstado:local.E}):null);
}

/* ---------------- diploma ---------------- */
function abrirDiploma(){
  if (Object.keys(prog.concluidas).length < AULAS.length){ toast('Ainda não','Conclua as 10 aulas para o diploma.'); return; }
  var nome=meuNome||prog.nome||'Colaborador(a)';
  var dataStr=new Date(prog.concluidoEm||Date.now()).toLocaleDateString('pt-BR',{day:'2-digit',month:'long',year:'numeric'});
  var extra=prog.easterEggs.length>=EGGS.length?' Encontrou tambem todos os '+EGGS.length+' easter eggs sobre advocacia, tribunais e o CPC.':'';
  var wnd=window.open('','_blank'); if(!wnd){ toast('Pop-up bloqueado','Permita pop-ups para abrir o diploma.'); return; }
  wnd.document.write('<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Diploma — '+esc(nome)+'</title><style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:"Segoe UI",system-ui,sans-serif;background:#1a1210;padding:40px;display:flex;justify-content:center}.c{width:900px;max-width:100%;background:#faf6f0;color:#241c1b;border:2px solid #b8362e;border-radius:8px;padding:56px 60px;text-align:center;position:relative}.c::after{content:"";position:absolute;inset:14px;border:1px solid #d8b25a;border-radius:4px}.k{letter-spacing:.32em;font-size:.8rem;color:#b8362e;font-weight:700;text-transform:uppercase}h1{font-family:Georgia,serif;font-size:2.5rem;margin:18px 0 6px}.s{color:#7d716b;font-size:.95rem;margin-bottom:34px}.n{font-family:Georgia,serif;font-size:2rem;color:#5c1a16;border-bottom:2px solid #d8b25a;display:inline-block;padding:0 30px 8px;margin-bottom:26px}.b{font-size:1rem;line-height:1.7;max-width:640px;margin:0 auto 36px}.p{font-weight:700;color:#b8362e}.r{display:flex;justify-content:space-between;font-size:.85rem;color:#7d716b;margin-top:40px}@media print{body{background:#fff;padding:0}.np{display:none}}.np{margin-top:24px;text-align:center}button{padding:10px 22px;border-radius:22px;border:1px solid #b8362e;background:#b8362e;color:#fff;font-weight:700;cursor:pointer}</style></head><body><div class="c"><div class="k">Fonseca e Braga Advocacia</div><h1>Diploma de Integracao</h1><div class="s">Comarca do FBzinho — Portal Interno</div><div>Certificamos que</div><div class="n">'+esc(nome)+'</div><div class="b">concluiu todas as '+AULAS.length+' aulas da Trilha de Integracao, demonstrando conhecimento sobre a estrutura do escritorio, o Portal interno, os sistemas utilizados, as rotinas de atendimento, os prazos e a seguranca da informacao, com <span class="p">'+prog.pontosTotais+' de '+pontosPossiveis+' pontos</span>.'+extra+'</div><div style="font-size:2.2rem">&#9878;</div><div class="r"><span>Emitido em '+esc(dataStr)+'</span><span>Portal Fonseca e Braga</span></div></div><div class="np"><button onclick="window.print()">Imprimir / Salvar PDF</button></div></body></html>');
  wnd.document.close();
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
function poeira(x,y,z,cor,n){
  n=n||10;
  for (var i=0;i<n;i++){
    var m=new THREE.Mesh(new THREE.BoxGeometry(0.06,0.06,0.06), new THREE.MeshBasicMaterial({color:cor}));
    m.position.set(x,y,z);
    m.userData={ vx:rand(-1.5,1.5), vy:rand(1,3), vz:rand(-1.5,1.5), vida:0.6+Math.random()*0.4 };
    mundo.add(m); particulas.push(m);
  }
}
function flutua3d(x,y,z,txt,cor){
  var sp=labelSprite(txt,{fs:34,h:0.5,bg:'rgba(255,255,255,.92)',color:cor||'#333'});
  sp.position.set(x,y,z); mundo.add(sp);
  flutuantes3d.push({sp:sp, vida:1.6});
}

/* ---------------- HUD ---------------- */
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
    if (s){ var c=document.createElement('canvas'); c.width=30; c.height=30; c.getContext('2d').drawImage(iconeItem(s.id),0,0,30,30); d.appendChild(c);
      if (ITENS[s.id] && ITENS[s.id].tipo!=='ferramenta'){ var q=document.createElement('span'); q.className='qt'; q.textContent=s.qt; d.appendChild(q); } }
    hb.appendChild(d);
  }
}

/* ---------------- estados visuais 3D ---------------- */
function pintaAulas3d(){
  var atual=idxAulaAtual();
  aula3d.forEach(function(M){
    var feita=aulaFeita(M.A.id), lib=aulaLiberada(M.i), ehAtual=(M.i===atual)&&!feita;
    M.anel.material.color.set(feita?0x4c9a68:(lib?0xe7b84f:0x777777));
    M.anel.material.opacity=feita?0.35:(lib?0.55:0.18);
    M.pilar.visible = lib && !feita;
    setSpr(M.sp, feita?'✓':(lib?M.A.emoji:'🔒'));
  });
}
function atualizaEggs3d(){
  egg3d.forEach(function(g){ if (eggFeito(g.eg.id)){ g.group.visible=false; g.col=true; } });
}

/* ================================================================
   LOOP
   ================================================================ */
function corLerp(a,b,t){ return new THREE.Color(a).lerp(new THREE.Color(b), t); }

function aplicaHoraDoDia(){
  var hAbs=(E.hora/60)%24;
  // fases: 0=noite,5-7 amanhecer,7-17 dia,17-20 entardecer,20-24 noite
  var luzDia; // 0..1
  if (hAbs<5) luzDia=0;
  else if (hAbs<7) luzDia=(hAbs-5)/2;
  else if (hAbs<17) luzDia=1;
  else if (hAbs<20) luzDia=1-(hAbs-17)/3;
  else luzDia=0;
  var entardecer = (hAbs>=16 && hAbs<20) ? (1-Math.abs(hAbs-18)/2) : 0;
  var amanhecer = (hAbs>=5 && hAbs<8) ? (1-Math.abs(hAbs-6.5)/1.5) : 0;
  var quente = Math.max(entardecer, amanhecer*0.7);

  // sol
  var ang = ((hAbs-6)/12) * Math.PI; // 6h no leste, 18h no oeste
  sol.position.set(Math.cos(ang)*60, Math.max(-6, Math.sin(ang)*70), 24);
  sol.target.position.copy(fb.position); sol.target.updateMatrixWorld();
  sol.position.add(fb.position);
  sol.intensity = 0.12 + luzDia*1.25;
  sol.color.copy( corLerp(0xfff2d8, 0xff9a55, quente) );

  hemi.intensity = 0.14 + luzDia*0.62;
  hemi.color.copy( corLerp(0x24304a, 0xbfe0ff, luzDia) );
  hemi.groundColor.copy( corLerp(0x1a2018, 0x4a5a3a, luzDia) );
  amb.intensity = 0.06 + luzDia*0.16;

  var noite = 1-luzDia;
  luaLuz.intensity = noite*0.35;
  luaLuz.position.set(-40+fb.position.x, 50, -30+fb.position.z);

  // céu + névoa
  var topo = corLerp( corLerp(0x0a1030, 0x0a1030, 0), 0x2f6fb0, luzDia );
  topo = topo.lerp(new THREE.Color(0x3a2352), quente*0.6);
  var horiz = corLerp(0x121a30, 0xbcd6e8, luzDia);
  horiz = horiz.lerp(new THREE.Color(0xe8875a), quente*0.8);
  pintaCeu('#'+topo.getHexString(), '#'+horiz.getHexString());
  scene.fog.color.copy(horiz);
  scene.fog.density = 0.010 + noite*0.010 + (E.clima==='chuva'?0.012:0);

  renderer.toneMappingExposure = 1.15 - noite*0.25;

  // luzes de rua / janelas
  var acende = clamp((noite-0.15)/0.5, 0, 1);
  luzesNoite.forEach(function(L){
    L.light.intensity = L.base * acende;
    if (L.lamp) L.lamp.material.emissiveIntensity = acende*1.4;
    if (L.janelas) L.janelas.forEach(function(j){ j.material.emissiveIntensity = acende*1.1; j.material.emissive.set(0xffcf8a); });
  });
  fireflies.material.opacity = acende*0.9;

  // chuva
  chuva3d.visible = (E.clima==='chuva');
}

function loop(){
  raf=requestAnimationFrame(loop);
  var dt=Math.min(0.05, clock.getDelta());

  // partículas
  for (var i=particulas.length-1;i>=0;i--){
    var m=particulas[i], u=m.userData; u.vida-=dt;
    if (u.vida<=0){ mundo.remove(m); particulas.splice(i,1); continue; }
    u.vy-=6*dt; m.position.x+=u.vx*dt; m.position.y+=u.vy*dt; m.position.z+=u.vz*dt;
    m.material.opacity=Math.max(0,u.vida*2); m.material.transparent=true;
  }
  for (var j=flutuantes3d.length-1;j>=0;j--){
    var fl=flutuantes3d[j]; fl.vida-=dt; fl.sp.position.y+=0.7*dt;
    fl.sp.material.opacity=Math.min(1,fl.vida);
    if (fl.vida<=0){ mundo.remove(fl.sp); flutuantes3d.splice(j,1); }
  }
  // nuvens
  nuvens.forEach(function(c){ c.position.x+=c.userData.v*dt; if(c.position.x>70) c.position.x=-70; });
  // eggs girando
  egg3d.forEach(function(g){ if(g.col) return; g.oct.rotation.y+=dt*2.4; g.oct.rotation.x+=dt*1.3;
    g.oct.position.y=1.7+Math.sin(clock.elapsedTime*2+g.eg.x)*0.15; });
  // marcadores
  aula3d.forEach(function(M){ if(M.pilar.visible){ M.group.rotation.y+=dt*0.6; } });

  // água
  if (agua){
    var pos=agua.geometry.attributes.position.array, base=aguaGeoBase, t=clock.elapsedTime;
    for (var v=0;v<pos.length;v+=3){
      var bx=base[v], bz=base[v+2];
      pos[v+1]=Math.sin(bx*0.35+t*1.3)*0.12 + Math.cos(bz*0.4+t*0.9)*0.1;
    }
    agua.geometry.attributes.position.needsUpdate=true;
    if ((frameN=(frameN||0)+1)%4===0) agua.geometry.computeVertexNormals();
  }

  if (!pausado){
    E.hora += dt*1.7;
    if (E.hora>=26*60){ dormir(); }
    else {
      // movimento relativo à câmera
      var inX=(teclas.right?1:0)-(teclas.left?1:0);
      var inZ=(teclas.down?1:0)-(teclas.up?1:0);
      andando=(inX||inZ)?true:false;
      if (andando){
        var cf=new THREE.Vector3(Math.sin(camYaw),0,Math.cos(camYaw));
        var cr=new THREE.Vector3(Math.cos(camYaw),0,-Math.sin(camYaw));
        var dir=new THREE.Vector3();
        dir.addScaledVector(cf, -inZ); dir.addScaledVector(cr, inX);
        dir.normalize();
        fbYaw = Math.atan2(dir.x, dir.z);
        var sp=(teclas.run?9:5)*dt;
        var nx=fb.position.x+dir.x*sp, nz=fb.position.z+dir.z*sp;
        // colisão
        var bloq=false;
        for (var c=0;c<colisores.length;c++){ var o=colisores[c]; if(o.r<=0) continue;
          if (d2(nx,nz,o.x,o.z) < o.r+0.4){ bloq=true;
            var aw=Math.atan2(nz-o.z, nx-o.x);
            nx=o.x+Math.cos(aw)*(o.r+0.4); nz=o.z+Math.sin(aw)*(o.r+0.4);
          }
        }
        if (dentroAgua(nx,nz) && d2(nx,nz,DOCA.x,DOCA.z)>2.2){ nx=fb.position.x; nz=fb.position.z; }
        nx=clamp(nx,-66,66); nz=clamp(nz,-66,66);
        fb.position.x=nx; fb.position.z=nz;
        walkPhase+=dt*10;
      } else walkPhase*=0.6;
      // rotação suave do modelo
      var cur=fb.rotation.y, tgt=fbYaw, diff=Math.atan2(Math.sin(tgt-cur),Math.cos(tgt-cur));
      fb.rotation.y = cur + diff*Math.min(1,dt*12);

      // anim
      var sw=Math.sin(walkPhase)*(andando?1:0);
      fbParts.pernaL.rotation.x=sw*0.5; fbParts.pernaR.rotation.x=-sw*0.5;
      fbParts.bracoL.rotation.x=-sw*0.4; fbParts.bracoR.rotation.x=sw*0.4;
      fb.position.y = Math.abs(Math.sin(walkPhase))*(andando?0.05:0) + (andando?0:Math.sin(clock.elapsedTime*2)*0.01);
      if (actTimer>0){ actTimer-=dt; fbParts.bracoR.rotation.x = -0.9; }

      // câmera manual
      if (teclas.q) camYawManual += dt*1.6;
      stepNPCs(dt);
      atualizaPrompt();
    }
    atualizaHud();
  }

  // câmera
  var alvoYaw = andando ? fbYaw + camYawManual : camYaw;
  camYaw += Math.atan2(Math.sin(alvoYaw-camYaw),Math.cos(alvoYaw-camYaw)) * Math.min(1,dt*3);
  var cfw=new THREE.Vector3(Math.sin(camYaw),0,Math.cos(camYaw));
  var desej=fb.position.clone().addScaledVector(cfw,-5.2).add(new THREE.Vector3(0,3.1,0));
  camera.position.lerp(desej, 1-Math.pow(0.002,dt));
  camera.lookAt(fb.position.x, fb.position.y+1.5, fb.position.z);

  aplicaHoraDoDia();

  // chuva anim
  if (E.clima==='chuva'){
    var rp=chuva3d.geometry.attributes.position.array;
    for (var r=0;r<rp.length;r+=3){ rp[r+1]-=22*dt; rp[r]-=3*dt; if(rp[r+1]<0){ rp[r+1]=28; rp[r]=fb.position.x+rand(-30,30); rp[r+2]=fb.position.z+rand(-30,30); } }
    chuva3d.geometry.attributes.position.needsUpdate=true;
    chuva3d.position.set(0,0,0);
  }

  renderer.render(scene, camera);
}
var frameN=0;

function atualizaPrompt(){
  var px=fb.position.x, pz=fb.position.z, txt='';
  Object.keys(NPCS).forEach(function(k){ var s=npc3d[k]; if(s && d2(px,pz,s.group.position.x,s.group.position.z)<2.4) txt='E — falar com '+NPCS[k].nome; });
  for (var i=0;i<AULAS.length && !txt;i++){ var L=AULAS[i].local;
    if (d2(px,pz,L.x,L.z)<2.4) txt = aulaLiberada(i) ? ('E — '+(aulaFeita(AULAS[i].id)?'revisar':'iniciar')+' aula: '+AULAS[i].titulo) : 'E — aula trancada'; }
  if (!txt) for (var q=0;q<PREDIOS.length;q++){ var P=PREDIOS[q]; if(P.loja && d2(px,pz,P.porta.x,P.porta.z)<2.6){ txt='E — entrar no '+P.nome; break; } }
  if (!txt && d2(px,pz,CAMA.x,CAMA.z)<2.4) txt='E — dormir (encerra o dia)';
  if (!txt && d2(px,pz,REMESSA.x,REMESSA.z)<2.2) txt='E — Caixa de Remessa (vender)';
  if (!txt){ var it=itemSel(); if(it&&it.id==='lupa'&&dentroAguaPerto()) txt='E — triagem de publicações (DJEN)'; }
  if (!txt) for (var g=0;g<EGGS.length;g++){ var eg=EGGS[g]; if(eggFeito(eg.id)) continue; if(d2(px,pz,eg.x,eg.z)<1.8){ txt='E — examinar'; break; } }
  if (!txt) for (var f=0;f<FORRAGEIO.length;f++){ var fr=FORRAGEIO[f]; if(fr.colhido) continue; if(d2(px,pz,fr.x,fr.z)<2){ txt='E — vasculhar'; break; } }
  var el=$('prompt');
  if (txt && !algumPainel()){ el.textContent=txt; el.classList.add('on'); } else el.classList.remove('on');
}

function stepNPCs(dt){
  Object.keys(NPCS).forEach(function(nk){
    var s=npc3d[nk]; if(!s) return;
    var rot=NPCS[nk].rotina, cur=rot[0];
    for (var i=0;i<rot.length;i++) if (rot[i].h<=E.hora) cur=rot[i];
    s.tgx=cur.x; s.tgz=cur.z;
    var g=s.group, dx=s.tgx-g.position.x, dz=s.tgz-g.position.z, dd=Math.sqrt(dx*dx+dz*dz);
    if (dd>0.4){
      var st=Math.min(dd, 2.6*dt);
      g.position.x+=dx/dd*st; g.position.z+=dz/dd*st;
      g.rotation.y = g.rotation.y + Math.atan2(Math.sin(Math.atan2(dx,dz)-g.rotation.y),Math.cos(Math.atan2(dx,dz)-g.rotation.y))*Math.min(1,dt*8);
      s.wp=(s.wp||0)+dt*8;
      var sw=Math.sin(s.wp);
      s.parts.pernaL.rotation.x=sw*0.4; s.parts.pernaR.rotation.x=-sw*0.4;
      s.parts.bracoL.rotation.x=-sw*0.3; s.parts.bracoR.rotation.x=sw*0.3;
    } else {
      s.parts.pernaL.rotation.x*=0.8; s.parts.pernaR.rotation.x*=0.8;
      s.parts.bracoL.rotation.x*=0.8; s.parts.bracoR.rotation.x*=0.8;
    }
  });
}
/* ================================================================
   BOOT
   ================================================================ */
function ehMobile(){
  try { if (window.matchMedia && window.matchMedia('(pointer: coarse)').matches && !window.matchMedia('(pointer: fine)').matches) return true; } catch(e){}
  return (window.innerWidth||999) < 760;
}

window.__comarca = {
  get j(){ return fb; }, get e(){ return E; },
  aula:function(i){ iniciarAula(i); }, tp:function(x,z){ fb.position.set(x,0,z); },
  set tecla(o){ for(var k in o) teclas[k]=o[k]; },
  step:function(dt){ /* usa o loop real; aqui só avança relógio p/ teste */ E.hora+=(dt||0.05)*60; }
};

function comecar(){
  try {
    init3D();
  } catch(err){
    console.error(err);
    $('erro3d-msg').textContent='Erro ao iniciar o 3D: '+(err && err.message || err);
    $('erro3d').classList.add('on'); $('app').classList.remove('on');
    return;
  }
  // NPCs 3D
  Object.keys(NPCS).forEach(function(nk){
    var P=novaPessoa(NPCS[nk].pal);
    var rot=NPCS[nk].rotina, cur=rot[0];
    for (var i=0;i<rot.length;i++) if (rot[i].h<=E.hora) cur=rot[i];
    P.group.position.set(cur.x,0,cur.z);
    var nm=labelSprite(NPCS[nk].nome,{fs:32,h:0.6,borda:'#e7b84f'}); nm.position.y=2.5; P.group.add(nm);
    scene.add(P.group);
    npc3d[nk]={ group:P.group, parts:P, tgx:cur.x, tgz:cur.z };
  });
  pintaFace($('dlg-face'));
  renderHotbar(); atualizaHud();
  jogoPronto=true; pausado=true;

  setTimeout(function(){
    var f=Object.keys(prog.concluidas).length;
    var oi = f===0
      ? ('Oi'+(meuNome?', '+meuNome.split(' ')[0]:'')+'! Eu sou o FBzinho. Bem-vindo(a) à Comarca. Ande com WASD/setas, aperte E para interagir, e comece pela minha aula aqui perto do escritório (marcador ⚖️).')
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
} else if (!THREEOK){
  $('erro3d').classList.add('on');
} else if (temFirebase && auth){
  auth.onAuthStateChanged(function(user){
    if (!user){ $('gate').classList.add('on'); $('app').classList.remove('on'); return; }
    meuUid=user.uid; meuNome=user.displayName||'';
    $('gate').classList.remove('on');
    progRef=db.collection('treinamentoProgresso').doc(meuUid);
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
  $('app').classList.add('on');
  carregar(comecar);
}

})();
