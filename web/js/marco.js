// Anti-clickjacking (SEC-06). GitHub Pages no deja mandar X-Frame-Options ni CSP frame-ancestors (en <meta> se
// ignora), así que se frena desde acá: si MedMar se abre dentro de un iframe de otro sitio, la página no se muestra
// y se intenta salir del marco. Se carga en <head>, antes que el resto, para que no llegue a pintarse nada.
(function () {
    if (window.top === window.self) return
    document.documentElement.style.visibility = "hidden"
    try { window.top.location.replace(window.self.location.href) } catch (_) {}
})()
