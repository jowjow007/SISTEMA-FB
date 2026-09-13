/*!
 * Portal FB — sistema único de ícones (linha, 24x24, stroke=currentColor).
 * Substitui os 3 sistemas incompatíveis que existiam (emoji cru no condominios/
 * minhas-anotacoes, o objeto ICO{}+icoSvg() do chat, e o sprite <symbol> do
 * numeros-escritorio) por UMA fonte única, carregada via
 * <script src="assets/icons.js"></script> (ou "../../assets/icons.js" em tools/*).
 *
 * Uso:
 *   FBIcons.svg('trash')                      -> string SVG pronta (20px)
 *   FBIcons.svg('trash', {size:16, title:'Excluir'})
 *   FBIcons.el('trash', {size:20})            -> elemento <svg> real (DOM)
 *
 * Regra do projeto (ver memória): emoji que é CONTEÚDO real (picker de reação
 * do chat, catálogo de emoji das anotações) NÃO entra aqui — só ícone de UI.
 */
(function (global) {
  "use strict";

  // Cada valor é o miolo do <svg> (paths/formas), sempre em viewBox 0 0 24 24,
  // desenhado para stroke-width ~1.8 com stroke-linecap/linejoin round.
  var ICONS = {
    // ---- navegação / abas (equivalente ao antigo TAB_ICONS do shell) ----
    newspaper: '<path d="M4 4h13a2 2 0 0 1 2 2v13a1 1 0 0 1-1.7.7L16 18H6a2 2 0 0 1-2-2V4Z"/><path d="M8 8h7M8 12h7M8 16h4"/><path d="M19 8v9a2 2 0 0 0 2 0"/>',
    clipboard: '<rect x="6" y="4" width="12" height="17" rx="2"/><rect x="9" y="2.5" width="6" height="3.5" rx="1"/><path d="M9 11h6M9 15h6"/>',
    lightbulb: '<path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 0 0-3.6 10.8c.5.4.8 1 .8 1.7V16h5.6v-.5c0-.7.3-1.3.8-1.7A6 6 0 0 0 12 3Z"/>',
    user: '<circle cx="12" cy="8" r="3.6"/><path d="M5 20c1.2-4 4-5.8 7-5.8s5.8 1.8 7 5.8"/>',
    gift: '<rect x="4" y="9" width="16" height="11" rx="1.5"/><path d="M4 9h16v3H4z" opacity=".001"/><path d="M12 9v11M4 9V7.5A1.5 1.5 0 0 1 5.5 6H9a3 3 0 0 1 3 3 3 3 0 0 1 3-3h3.5A1.5 1.5 0 0 1 20 7.5V9"/><path d="M9 6a2.2 2.2 0 1 1 3-3c.6.6 1 2.3 1 3M15 6a2.2 2.2 0 1 0-3-3c-.6.6-1 2.3-1 3"/>',
    flow: '<circle cx="5.5" cy="6" r="2.3"/><circle cx="18.5" cy="6" r="2.3"/><circle cx="12" cy="18" r="2.3"/><path d="M7.6 7.1 10.3 16M16.4 7.1 13.7 16M7.8 6h8.4"/>',
    chat: '<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5v7A2.5 2.5 0 0 1 17.5 15H10l-4.5 4v-4H6.5A2.5 2.5 0 0 1 4 12.5v-7Z"/>',
    chart: '<path d="M4 20V4M4 20h16"/><rect x="7" y="13" width="2.6" height="7"/><rect x="12" y="9" width="2.6" height="11"/><rect x="17" y="5" width="2.6" height="15"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 13a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V19a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H4a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3H10a1.7 1.7 0 0 0 1-1.5V4a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9V10a1.7 1.7 0 0 0 1.5 1H20a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z"/>',
    folder: '<path d="M4 6.5A1.5 1.5 0 0 1 5.5 5H10l2 2.2h6.5A1.5 1.5 0 0 1 20 8.7V17a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 17V6.5Z"/>',
    monitor: '<rect x="3" y="4.5" width="18" height="12" rx="1.5"/><path d="M8.5 20h7M12 16.5V20"/>',
    calculator: '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M8 7h8M8 11h.01M12 11h.01M16 11h.01M8 14.5h.01M12 14.5h.01M16 14.5v3.5M8 18h.01M12 18h.01"/>',
    book: '<path d="M5 4.5A1.5 1.5 0 0 1 6.5 3H18a1 1 0 0 1 1 1v15.5a1 1 0 0 1-1 1H6.5A1.5 1.5 0 0 1 5 19V4.5Z"/><path d="M5 17.2c0-.9.8-1.7 1.7-1.7H19"/>',
    contract: '<path d="M7 3h7l4 4v13.5a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z"/><path d="M14 3v4h4"/><path d="M9 12.5h6M9 15.5h6M9 9.5h3"/>',
    docstack: '<path d="M6 3h9l4 4v11.5a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" opacity=".001"/><path d="M8 3h7l4 4v12.5a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z"/><path d="M15 3v4h4"/><path d="M4 7.5v12A1.5 1.5 0 0 0 5.5 21H15" stroke-dasharray="0"/>',
    envelope: '<rect x="3.5" y="5.5" width="17" height="13" rx="1.8"/><path d="m4 6.5 8 6.5 8-6.5"/>',
    pencil: '<path d="M4 20 4.6 16.7 15.2 6.1a1.8 1.8 0 0 1 2.5 0l1.2 1.2a1.8 1.8 0 0 1 0 2.5L8.3 20.4 4 20Z"/><path d="M13.7 7.6 16.4 10.3"/>',
    grid: '<rect x="4" y="4" width="7" height="7" rx="1.2"/><rect x="13" y="4" width="7" height="7" rx="1.2"/><rect x="4" y="13" width="7" height="7" rx="1.2"/><rect x="13" y="13" width="7" height="7" rx="1.2"/>',
    gear: '<circle cx="12" cy="12" r="7.5"/><path d="M12 8v1.6M12 14.4V16M16 12h-1.6M9.6 12H8M14.8 9.2l-1.1 1.1M10.3 13.6l-1.1 1.1M14.8 14.8l-1.1-1.1M10.3 10.4 9.2 9.2"/>',
    logout: '<path d="M9 4H6.5A1.5 1.5 0 0 0 5 5.5v13A1.5 1.5 0 0 0 6.5 20H9"/><path d="M14 16.5 19 12l-5-4.5M19 12H9"/>',
    building: '<rect x="5" y="3" width="9" height="18" rx="1"/><rect x="15" y="9" width="4.5" height="12" rx="1"/><path d="M8 6.5h.01M11 6.5h.01M8 10h.01M11 10h.01M8 13.5h.01M11 13.5h.01M8 17h.01M11 17h.01M17.2 12.5h.01M17.2 16h.01"/>',
    team: '<circle cx="8.5" cy="8" r="2.8"/><circle cx="16.3" cy="9" r="2.3"/><path d="M3.2 19c.8-3.4 2.8-5 5.3-5s4.5 1.6 5.3 5M14.2 14.5c2.1.1 3.7 1.6 4.4 4.5"/>',
    sparkle: '<path d="M12 3.5 13.4 9l5.6 1.4-5.6 1.4L12 17.2l-1.4-5.4L5 10.4 10.6 9 12 3.5Z"/><path d="M18.5 15.5 19.2 18l2.3.7-2.3.7-.7 2.4-.7-2.4-2.3-.7 2.3-.7.7-2.4Z"/>',
    graduation: '<path d="M2.5 9 12 4.5 21.5 9 12 13.5 2.5 9Z"/><path d="M6.5 11v4.2c0 1.4 2.5 2.8 5.5 2.8s5.5-1.4 5.5-2.8V11"/><path d="M21.5 9v5.5"/>',
    shieldcheck: '<path d="M12 3.2 19 6v6c0 4.6-3 8-7 9-4-1-7-4.4-7-9V6l7-2.8Z"/><path d="m9 12 2.2 2.2L15.5 10"/>',
    checkcircle: '<circle cx="12" cy="12" r="8.5"/><path d="m8.3 12.2 2.6 2.6 5-5.4"/>',
    xcircle: '<circle cx="12" cy="12" r="8.5"/><path d="m9.2 9.2 5.6 5.6M14.8 9.2l-5.6 5.6"/>',

    // ---- ícones de interface (substituem emoji de UI / sprites soltos) ----
    bell: '<path d="M6 10.5a6 6 0 0 1 12 0v3.7l1.6 2.6H4.4L6 14.2V10.5Z"/><path d="M10 19.5a2 2 0 0 0 4 0"/>',
    trash: '<path d="M5 7h14"/><path d="M9.5 7V5.2A1.2 1.2 0 0 1 10.7 4h2.6a1.2 1.2 0 0 1 1.2 1.2V7"/><path d="M7.5 7 8.2 19a1.5 1.5 0 0 0 1.5 1.4h4.6a1.5 1.5 0 0 0 1.5-1.4L16.5 7"/><path d="M10.3 11v6M13.7 11v6"/>',
    check: '<path d="m4.5 12.5 5 5 10-11"/>',
    x: '<path d="m6 6 12 12M18 6 6 18"/>',
    'chevron-down': '<path d="m6 9 6 6 6-6"/>',
    'chevron-up': '<path d="m6 15 6-6 6 6"/>',
    'chevron-left': '<path d="m15 6-6 6 6 6"/>',
    'chevron-right': '<path d="m9 6 6 6-6 6"/>',
    search: '<circle cx="10.8" cy="10.8" r="6.3"/><path d="m20 20-4.4-4.4"/>',
    calendar: '<rect x="3.5" y="5" width="17" height="15.5" rx="1.8"/><path d="M3.5 9.5h17M8 3v4M16 3v4"/>',
    scale: '<path d="M12 3.5v16"/><path d="M5 7h14"/><path d="M5 7 2.6 12.3a2.6 2.6 0 0 0 4.8 0Z"/><path d="M19 7 16.6 12.3a2.6 2.6 0 0 0 4.8 0Z"/><path d="M8.5 20.5h7"/>',
    clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3.2 2"/>',
    money: '<rect x="2.5" y="6.5" width="19" height="11" rx="1.8"/><circle cx="12" cy="12" r="2.6"/><path d="M6 6.5v11M18 6.5v11" opacity=".5"/>',
    upload: '<path d="M12 15.5V4M8 8l4-4 4 4"/><path d="M4.5 16v2.5A1.5 1.5 0 0 0 6 20h12a1.5 1.5 0 0 0 1.5-1.5V16"/>',
    download: '<path d="M12 4v11.5M8 12l4 4 4-4"/><path d="M4.5 16v2.5A1.5 1.5 0 0 0 6 20h12a1.5 1.5 0 0 0 1.5-1.5V16"/>',
    print: '<path d="M7 8.5V4h10v4.5"/><rect x="4" y="8.5" width="16" height="7.5" rx="1.5"/><path d="M7 14h10v6H7Z"/>',
    'external-link': '<path d="M9 6H6.5A1.5 1.5 0 0 0 5 7.5v10A1.5 1.5 0 0 0 6.5 19h10a1.5 1.5 0 0 0 1.5-1.5V15"/><path d="M14 4h6v6M20 4l-9.5 9.5"/>',
    lock: '<rect x="5" y="10.5" width="14" height="9.5" rx="1.8"/><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3"/>',
    star: '<path d="M12 3.8 14.6 9l5.7.8-4.1 4 1 5.7-5.2-2.7-5.2 2.7 1-5.7-4.1-4L9.4 9 12 3.8Z"/>',
    tag: '<path d="M11.5 4h-5A1.5 1.5 0 0 0 5 5.5v5c0 .4.2.8.4 1.1l8 8a1.5 1.5 0 0 0 2.1 0l5-5a1.5 1.5 0 0 0 0-2.1l-8-8a1.5 1.5 0 0 0-1-.5Z"/><circle cx="9" cy="9" r="1.3"/>',
    send: '<path d="M4.5 11.2 19.5 4l-5.8 15.5-2.9-6.4-6.3-1.9Z"/><path d="M10.8 13.1 19.5 4"/>',
    camera: '<path d="M9 6.5 10.2 4h3.6L15 6.5h3A1.5 1.5 0 0 1 19.5 8v10A1.5 1.5 0 0 1 18 19.5H6A1.5 1.5 0 0 1 4.5 18V8A1.5 1.5 0 0 1 6 6.5h3Z"/><circle cx="12" cy="13" r="3.4"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    minus: '<path d="M5 12h14"/>',
    info: '<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5.5"/><circle cx="12" cy="8" r="0.15" fill="currentColor" stroke-width="2.6"/>',
    warning: '<path d="M12 4 21 19.5H3L12 4Z"/><path d="M12 10.2v4M12 17v.01"/>',
    eye: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z"/><circle cx="12" cy="12" r="2.8"/>',
    'eye-off': '<path d="M4 4l16 16"/><path d="M10.6 6.1A9.7 9.7 0 0 1 12 6c6 0 9.5 6 9.5 6a15.5 15.5 0 0 1-3.4 4M6.9 7.4C4.4 9 2.5 12 2.5 12S6 18.5 12 18.5c1.3 0 2.5-.3 3.5-.7"/><path d="M9.9 10a2.8 2.8 0 0 0 3.9 3.9"/>',
    filter: '<path d="M4 5.5h16L14.5 12v5.5L9.5 20V12L4 5.5Z"/>',
    refresh: '<path d="M20 11a8 8 0 0 0-14.3-4.6M4 13a8 8 0 0 0 14.3 4.6"/><path d="M5.5 4v3.5H9M18.5 20v-3.5H15"/>',
    home: '<path d="M4 11.5 12 4l8 7.5"/><path d="M6 10v9a1 1 0 0 0 1 1h3.5v-5.5h3V20H17a1 1 0 0 0 1-1v-9"/>',
    menu: '<path d="M4 6.5h16M4 12h16M4 17.5h16"/>',
    'more-horizontal': '<circle cx="5.5" cy="12" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="18.5" cy="12" r="1.4"/>',
    'drag-handle': '<circle cx="9" cy="6" r="1.2"/><circle cx="15" cy="6" r="1.2"/><circle cx="9" cy="12" r="1.2"/><circle cx="15" cy="12" r="1.2"/><circle cx="9" cy="18" r="1.2"/><circle cx="15" cy="18" r="1.2"/>',
    spinner: '<circle cx="12" cy="12" r="8.5" opacity=".25"/><path d="M20.5 12A8.5 8.5 0 0 0 12 3.5"/>'
  };

  function svg(name, opts) {
    opts = opts || {};
    var size = opts.size || 20;
    var strokeWidth = opts.strokeWidth || 1.8;
    var body = ICONS[name] || ICONS.folder;
    var titleTag = opts.title ? ('<title>' + String(opts.title).replace(/</g, '&lt;') + '</title>') : '';
    var cls = opts.className ? (' class="' + opts.className + '"') : '';
    return '<svg' + cls + ' width="' + size + '" height="' + size + '" viewBox="0 0 24 24" ' +
      'fill="none" stroke="currentColor" stroke-width="' + strokeWidth + '" ' +
      'stroke-linecap="round" stroke-linejoin="round" aria-hidden="' + (opts.title ? 'false' : 'true') + '" ' +
      (opts.title ? 'role="img"' : 'focusable="false"') + '>' + titleTag + body + '</svg>';
  }

  function el(name, opts) {
    var wrap = document.createElement('div');
    wrap.innerHTML = svg(name, opts);
    return wrap.firstElementChild;
  }

  global.FBIcons = { svg: svg, el: el, names: Object.keys(ICONS) };
})(window);
