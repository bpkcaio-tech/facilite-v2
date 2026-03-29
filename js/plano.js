// ═══════════════════════════════════════════════════
//  FACILITE — PLANO.JS
// ═══════════════════════════════════════════════════
window.FacilitePlano = {

  ehPago: function() {
    try {
      var s = JSON.parse(localStorage.getItem('facilite_sessao') || '{}');
      if (s.plano === 'pago' || s.plano === 'pessoal' || s.plano === 'corporativo') {
        if (s.planoExpira && new Date(s.planoExpira) < new Date()) {
          s.plano = 'gratuito';
          localStorage.setItem('facilite_sessao', JSON.stringify(s));
          return false;
        }
        return true;
      }
      return false;
    } catch(e) { return false; }
  },

  // Alias para compatibilidade com código existente
  isPago: function() { return this.ehPago(); },

  ativar: function(meses) {
    meses = meses || 1;
    try {
      var s = JSON.parse(localStorage.getItem('facilite_sessao') || '{}');
      var expira = new Date();
      expira.setMonth(expira.getMonth() + meses);
      s.plano = 'pago';
      s.planoExpira = expira.toISOString();
      s.planoAtivadoEm = new Date().toISOString();
      localStorage.setItem('facilite_sessao', JSON.stringify(s));
      window.dispatchEvent(new CustomEvent('facilite:plano-ativado'));
      return true;
    } catch(e) { return false; }
  },

  // Alias
  ativarPlano: function(m) { return this.ativar(m); },

  verificar: function(callback, msg) {
    if (this.ehPago()) {
      if (typeof callback === 'function') callback();
    } else {
      window.FacilitePaywall.abrir(msg || '');
    }
  },

  // Alias
  verificarAcesso: function(cb, msg) { return this.verificar(cb, msg); }
};
