// Comunicados oficiais do escritório (pop-up obrigatório + histórico do megafone no topo do portal).
// Só entram aqui os comunicados que a coordenação pedir — tarefas enviadas NÃO fazem parte deste histórico.
// Para publicar um novo: acrescente um item NO TOPO da lista, com um "id" novo e único (nunca reaproveite
// nem altere o id de um comunicado já publicado: é ele que liga cada ciência registrada ao comunicado).
// "data" (AAAA-MM-DD) é o dia a partir do qual o comunicado aparece.
window.COMUNICADOS_FB = [
  {
    id: '2026-10-29-videos-organizacao-aprovacao',
    data: '2026-10-29',
    titulo: 'Treinamento obrigatório: organização de pastas e tarefas para aprovação',
    html:
      '<p>Preparamos dois vídeos sobre a <b>organização de pastas</b> e o envio de <b>tarefas para aprovação</b>. Todos devem assistir.</p>' +
      '<p>📌 Clique em <b>▶ Assistir</b> em cada vídeo e assista <b>até o final</b>. A confirmação de ciência só é liberada depois que os dois vídeos forem assistidos.</p>' +
      '<p>Os vídeos também ficam disponíveis a qualquer momento na aba <b>Treinamentos › Vídeos</b>.</p>',
    // vídeos obrigatórios: "minutos" = tempo mínimo com o vídeo aberto (duração de cada um: 2:31 e 3:39)
    videos: [
      { titulo: 'Organização de pastas e tarefas para aprovação (parte 1)', drive: '12fTsL1PZwQQlIeI3iYW_kp97eEzaRnNL', minutos: 151 / 60 },
      { titulo: 'Organização de pastas e tarefas para aprovação (parte 2)', drive: '1L-Jm0zNn8RTs8afrPQQQbLJ7sKrrmXNZ', minutos: 219 / 60 }
    ]
  },
  {
    id: '2026-10-28-errata-etiquetas-astrea',
    data: '2026-10-28',
    titulo: 'Errata: regras de etiquetas no Astrea',
    html:
      '<p>Complementando o comunicado de 28/10/2026 sobre as etiquetas do Astrea, esclarecemos:</p>' +
      '<p>📁 <b>Nas tarefas de processos</b>, utilizem <b>as duas etiquetas</b>:</p>' +
      '<p>🔴 <b>PRAZO FATAL:</b> a data final do prazo processual, como contestações, recursos e manifestações judiciais.</p>' +
      '<p>🟢 <b>PRAZO INTERNO:</b> a data interna para concluir a peça ou atividade do processo, antes do prazo fatal.</p>' +
      '<p>📋 <b>Nas demais atividades</b>, que não são processuais:</p>' +
      '<p>🟤 <b>PRAZO DE RETORNO:</b> para atividades com data-limite obrigatória que não podem atrasar, como entregas, respostas e compromissos assumidos.</p>' +
      '<p>✅ <b>IMPORTANTE:</b> não utilizem as etiquetas <b>PRAZO FATAL</b> e <b>PRAZO INTERNO</b> em atividades administrativas ou fora dos processos. Para essas, a etiqueta é a <b>PRAZO DE RETORNO</b>.</p>' +
      '<p>O objetivo é facilitar a gestão, identificar prioridades e evitar atrasos nas entregas.</p>'
  },
  {
    id: '2026-10-28-etiquetas-astrea',
    data: '2026-10-28',
    titulo: 'Novas regras de etiquetas no Astrea',
    html:
      '<p>Para facilitar a identificação e o controle dos prazos, utilizaremos as etiquetas da seguinte forma:</p>' +
      '<p>🔴 <b>PRAZO FATAL:</b> Exclusivamente para prazos processuais, como contestações, recursos e manifestações judiciais.</p>' +
      '<p>🟤 <b>PRAZO DE RETORNO:</b> Para atividades não processuais que possuem data-limite obrigatória e não podem sofrer atrasos, como entregas, respostas e compromissos assumidos.</p>' +
      '<p>✅ <b>IMPORTANTE:</b> As etiquetas devem ser utilizadas conforme a natureza do prazo. Não utilizem a etiqueta <b>PRAZO FATAL</b> para atividades administrativas ou extraprocessuais.</p>' +
      '<p>O objetivo é facilitar a gestão, identificar prioridades e evitar atrasos nas entregas.</p>'
  }
];
