// ═══════════════════════════════════════════════════
//  FACILITE — AUTH GUARD
//  1) Redireciona para auth.html se não logado
//  2) Redireciona para paywall se plano gratuito
// ═══════════════════════════════════════════════════
(function() {
  // Páginas que NÃO precisam de assinatura (checkout, paywall)
  var pagina = window.location.pathname.split('/').pop();
  var paginasLivres = ['checkout.html', 'auth.html', 'index.html', ''];
  if (paginasLivres.indexOf(pagina) !== -1) return;

  // 1) Verificar login
  var sessao = localStorage.getItem('facilite_sessao');
  if (!sessao) { window.location.replace('auth.html'); return; }

  try {
    var dados = JSON.parse(sessao);
    if (!dados.id) { window.location.replace('auth.html'); return; }

    // 2) Verificar se tem plano pago
    var plano = dados.plano || 'gratuito';
    if (plano === 'gratuito') {
      // Marcar que precisa mostrar paywall
      window._facilitePaywall = true;
    }
  } catch(e) {
    window.location.replace('auth.html');
  }
})();
