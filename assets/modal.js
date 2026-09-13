/*!
 * Portal FB — modal de confirmação + toasts compartilhados (substitui window.alert()/
 * window.confirm() nativos, que o navegador estiliza feio e de forma inconsistente
 * entre si). Depende de assets/design-system.css (classes .modal-*/.toast-*) e,
 * se presente, de assets/icons.js (ícones nos toasts) — funciona sem ele também.
 *
 * Uso:
 *   FBModal.confirm({title:'Excluir item?', body:'Essa ação não pode ser desfeita.', danger:true})
 *     .then(function(ok){ if (ok) apagar(); });
 *   FBModal.alert({title:'Tudo certo', body:'Salvo com sucesso.'});
 *   FBModal.toast('Salvo com sucesso.');                    // tipo padrão = 'success'
 *   FBModal.toast('Não foi possível salvar.', {type:'error'});
 */
(function (global) {
  "use strict";

  var root = null;
  var toastHost = null;
  var openModal = null; // {backdrop, lastFocus, resolve}

  function ensureRoot() {
    if (root) return root;
    root = document.createElement("div");
    root.className = "fb-modal-root";
    document.body.appendChild(root);
    toastHost = document.createElement("div");
    toastHost.className = "toast-host";
    toastHost.setAttribute("aria-live", "polite");
    document.body.appendChild(toastHost);
    return root;
  }

  function icon(name, opts) {
    if (global.FBIcons) return global.FBIcons.svg(name, opts);
    return "";
  }

  function focusablesIn(container) {
    return Array.prototype.slice.call(
      container.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')
    ).filter(function (n) { return !n.disabled && n.offsetParent !== null; });
  }

  function closeOpen(result) {
    if (!openModal) return;
    var m = openModal;
    openModal = null;
    m.backdrop.classList.remove("is-open");
    document.removeEventListener("keydown", m.onKeydown, true);
    setTimeout(function () {
      if (m.backdrop.parentNode) m.backdrop.parentNode.removeChild(m.backdrop);
      if (m.lastFocus && typeof m.lastFocus.focus === "function") m.lastFocus.focus();
    }, 160);
    m.resolve(result);
  }

  function open(config) {
    ensureRoot();
    return new Promise(function (resolve) {
      // Só um modal FBModal por vez — se já houver um aberto, resolve o antigo como cancelado.
      if (openModal) closeOpen(false);

      var backdrop = document.createElement("div");
      backdrop.className = "modal-backdrop fb-modal-backdrop";

      var toneClass = config.danger ? "is-danger" : "";
      var iconName = config.icon || (config.danger ? "warning" : "info");

      backdrop.innerHTML =
        '<div class="modal ' + toneClass + '" role="alertdialog" aria-modal="true" aria-labelledby="fbm-title" tabindex="-1">' +
          '<div class="modal-header">' +
            '<span class="modal-icon">' + icon(iconName, { size: 20 }) + '</span>' +
            '<h3 class="modal-title" id="fbm-title"></h3>' +
            '<button type="button" class="modal-close" aria-label="Fechar">' + icon("x", { size: 18 }) + '</button>' +
          '</div>' +
          '<div class="modal-body"></div>' +
          '<div class="modal-footer"></div>' +
        '</div>';

      backdrop.querySelector(".modal-title").textContent = config.title || "";
      var bodyEl = backdrop.querySelector(".modal-body");
      if (config.body) bodyEl.textContent = config.body;
      else bodyEl.remove();

      var footer = backdrop.querySelector(".modal-footer");
      var buttons = config.buttons || [
        { label: config.cancelLabel || "Cancelar", value: false, variant: "secondary" },
        { label: config.confirmLabel || "Confirmar", value: true, variant: config.danger ? "danger" : "primary" }
      ];
      buttons.forEach(function (b) {
        var btn = document.createElement("button");
        btn.type = "button";
        btn.className = "btn btn-" + (b.variant || "secondary");
        btn.textContent = b.label;
        btn.addEventListener("click", function () { closeOpen(b.value); });
        footer.appendChild(btn);
      });
      if (!buttons.length) footer.remove();

      var closeBtn = backdrop.querySelector(".modal-close");
      closeBtn.addEventListener("click", function () { closeOpen(config.dismissValue !== undefined ? config.dismissValue : false); });
      backdrop.addEventListener("mousedown", function (e) {
        if (e.target === backdrop && config.dismissOnBackdrop !== false) {
          closeOpen(config.dismissValue !== undefined ? config.dismissValue : false);
        }
      });

      function onKeydown(e) {
        if (e.key === "Escape") {
          e.stopPropagation();
          closeOpen(config.dismissValue !== undefined ? config.dismissValue : false);
        } else if (e.key === "Tab") {
          var f = focusablesIn(backdrop.querySelector(".modal"));
          if (!f.length) return;
          var first = f[0], last = f[f.length - 1];
          if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
          else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
        }
      }
      document.addEventListener("keydown", onKeydown, true);

      openModal = { backdrop: backdrop, lastFocus: document.activeElement, resolve: resolve, onKeydown: onKeydown };
      root.appendChild(backdrop);
      requestAnimationFrame(function () {
        backdrop.classList.add("is-open");
        var f = focusablesIn(backdrop.querySelector(".modal"));
        (f[f.length - 1] || backdrop.querySelector(".modal")).focus();
      });
    });
  }

  function confirm(config) {
    return open(Object.assign({}, config));
  }

  function alertBox(config) {
    return open(Object.assign({ buttons: [{ label: config.okLabel || "OK", value: true, variant: "primary" }] }, config));
  }

  var TOAST_ICON = { success: "checkcircle", error: "xcircle", info: "info", warning: "warning" };

  function toast(message, opts) {
    ensureRoot();
    opts = opts || {};
    var type = opts.type || "success";
    var el = document.createElement("div");
    el.className = "toast toast-" + type;
    el.setAttribute("role", type === "error" ? "alert" : "status");
    el.innerHTML = '<span class="toast-icon">' + icon(TOAST_ICON[type] || "info", { size: 18 }) + '</span>' +
      '<span class="toast-msg"></span>' +
      '<button type="button" class="toast-close" aria-label="Fechar">' + icon("x", { size: 14 }) + '</button>';
    el.querySelector(".toast-msg").textContent = message;
    toastHost.appendChild(el);

    var dur = opts.duration || (type === "error" ? 6000 : 3800);
    var timer = setTimeout(dismiss, dur);
    el.querySelector(".toast-close").addEventListener("click", dismiss);
    function dismiss() {
      clearTimeout(timer);
      el.classList.add("is-leaving");
      setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 220);
    }
    requestAnimationFrame(function () { el.classList.add("is-open"); });
    return { dismiss: dismiss };
  }

  global.FBModal = { confirm: confirm, alert: alertBox, toast: toast };
})(window);
