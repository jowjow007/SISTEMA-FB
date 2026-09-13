/*!
 * Portal FB — tema compartilhado (pré-pintura + sincronização entre abas/iframes).
 * Carregar via <script src="assets/theme-init.js"></script> (ou "../../assets/theme-init.js"
 * dentro de tools/*) ANTES do <style>, sem async/defer — precisa rodar antes da primeira
 * pintura para não haver flash do tema errado. Mesmo padrão que já existia, copiado à mão,
 * em ~19 arquivos; agora vive num só lugar.
 */
(function (global) {
  "use strict";
  var KEY = "fb-portal-theme";

  function read() {
    try { return localStorage.getItem(KEY); } catch (e) { return null; }
  }

  function apply(theme) {
    var root = document.documentElement;
    if (theme === "light") root.setAttribute("data-theme", "light");
    else root.removeAttribute("data-theme");
  }

  // Pré-pintura: aplica antes do CSS ser parseado.
  apply(read());

  function set(theme, opts) {
    opts = opts || {};
    apply(theme);
    try { localStorage.setItem(KEY, theme); } catch (e) {}
    if (!opts.silent) notify(theme);
  }

  function toggle(opts) {
    var current = document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark";
    var next = current === "light" ? "dark" : "light";
    set(next, opts);
    return next;
  }

  function current() {
    return document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark";
  }

  var listeners = [];
  function onChange(fn) { listeners.push(fn); }
  function notify(theme) {
    for (var i = 0; i < listeners.length; i++) {
      try { listeners[i](theme); } catch (e) {}
    }
  }

  // Sincroniza quando outra aba/iframe (ex.: o shell) muda o tema.
  global.addEventListener("storage", function (e) {
    if (e.key !== KEY) return;
    var theme = e.newValue === "light" ? "light" : "dark";
    apply(theme);
    notify(theme);
  });

  global.FBTheme = { set: set, toggle: toggle, current: current, onChange: onChange };
})(window);
