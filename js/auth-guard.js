// ═══════════════════════════════════════════════════
//  FACILITE — AUTH GUARD
//  Redireciona para auth.html se não logado
// ═══════════════════════════════════════════════════
(function() {
  var pagina = window.location.pathname.split('/').pop();
  var livres = ['auth.html', 'index.html', 'checkout.html', ''];
  if (livres.indexOf(pagina) !== -1) return;

  var sessao = localStorage.getItem('facilite_sessao');
  if (!sessao) { window.location.replace('auth.html'); return; }
  try {
    var dados = JSON.parse(sessao);
    if (!dados.id) window.location.replace('auth.html');
  } catch(e) {
    window.location.replace('auth.html');
  }
})();
