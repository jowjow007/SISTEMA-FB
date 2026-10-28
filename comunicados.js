// Comunicados oficiais do escritório (pop-up obrigatório + histórico do megafone no topo do portal).
// Só entram aqui os comunicados que a coordenação pedir — tarefas enviadas NÃO fazem parte deste histórico.
// Para publicar um novo: acrescente um item NO TOPO da lista, com um "id" novo e único (nunca reaproveite
// nem altere o id de um comunicado já publicado: é ele que liga cada ciência registrada ao comunicado).
// "data" (AAAA-MM-DD) é o dia a partir do qual o comunicado aparece.
window.COMUNICADOS_FB = [
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
