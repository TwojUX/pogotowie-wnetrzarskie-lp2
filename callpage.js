/* CallPage consultation widget. Keep telephone links as a fallback. */
(() => {
  "use strict";
  if (window.callpage) return;

  window.callpage = function (method) {
    if (method === "__getQueue") return this.methods;
    if (!method) return;
    if (typeof window.callpage.execute === "function") {
      return window.callpage.execute.apply(this, arguments);
    }
    (this.methods = this.methods || []).push({ arguments });
  };
  window.callpage.__cp = {
    id: "QQi-nxbfiD9-0v3pmc9-HxQT4fdwKPgTDcB5cPxS-_s",
    version: "1.1"
  };

  let ready = false;
  window.callpage("event.onReady", () => { ready = true; });
  window.callpage("event.onWidgetExit", () => { ready = false; });
  window.callpage("api.button.autoshow");

  // Ordinary phone-number links continue to dial directly.
  document.addEventListener("click", event => {
    const cta = event.target.closest('a.cta[href^="tel:"]');
    if (!cta || !ready || event.defaultPrevented || event.button !== 0 ||
        event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    window.callpage("api.widget.open");
  });

  function loadWidget() {
    let version = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    try {
      const cookie = document.cookie.split(";").map(item => item.trim())
        .find(item => item.startsWith("callpage-widget-version="));
      if (cookie) version = decodeURIComponent(cookie.slice(cookie.indexOf("=") + 1));
    } catch (_) { /* A blocked or malformed cookie must not prevent loading. */ }
    const widget = document.createElement("script");
    widget.async = true;
    widget.src = "https://cdn-widget.callpage.io/build/js/callpage.js?v=" + encodeURIComponent(version);
    document.head.appendChild(widget);
  }

  // Dependencies and widget URL from the supplied CallPage installation code.
  const polyfill = document.createElement("script");
  polyfill.async = true;
  polyfill.src = "https://cdnjs.cloudflare.com/ajax/libs/babel-polyfill/7.12.1/polyfill.min.js";
  polyfill.onload = loadWidget;
  document.head.appendChild(polyfill);
})();
