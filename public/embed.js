/* RedCube OS — form embed loader.
 * Usage:
 *   <div data-redcube-form="TOKEN"></div>
 *   <script src="https://app.redcube.co/embed.js" async></script>
 * Replaces each target with an iframe to /f/TOKEN, forwarding UTM params. */
(function () {
  var origin = (function () {
    try {
      var s = document.currentScript || document.querySelector('script[src*="embed.js"]')
      return s ? new URL(s.src).origin : window.location.origin
    } catch (e) {
      return window.location.origin
    }
  })()

  function utmQuery() {
    var here = new URLSearchParams(window.location.search)
    var keep = ['utm_source', 'utm_medium', 'utm_campaign']
    var out = new URLSearchParams()
    keep.forEach(function (k) { if (here.get(k)) out.set(k, here.get(k)) })
    var s = out.toString()
    return s ? '?' + s : ''
  }

  function mount(el) {
    if (el.getAttribute('data-redcube-mounted')) return
    el.setAttribute('data-redcube-mounted', '1')
    var token = el.getAttribute('data-redcube-form')
    var iframe = document.createElement('iframe')
    iframe.src = origin + '/f/' + token + utmQuery()
    iframe.width = '100%'
    iframe.style.border = '0'
    iframe.style.minHeight = '560px'
    iframe.setAttribute('title', 'RedCube form')
    el.appendChild(iframe)
  }

  function init() {
    var nodes = document.querySelectorAll('[data-redcube-form]')
    for (var i = 0; i < nodes.length; i++) mount(nodes[i])
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init)
  } else {
    init()
  }
})()
