// ═══════════════════════════════════════════════════
//  FACILITE — PLANO.JS
// ═══════════════════════════════════════════════════
window.FacilitePlano = {

  // Lê plano do localStorage (síncrono — usado em verificações rápidas)
  ehPago: function() {
    try {
      var s = JSON.parse(localStorage.getItem('facilite_sessao') || '{}');
      if (s.admin === true) return true;
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

  isPago: function() { return this.ehPago(); },

  // Verifica plano no Supabase e atualiza localStorage (assíncrono)
  sincronizarPlano: async function() {
    try {
      var s = JSON.parse(localStorage.getItem('facilite_sessao') || '{}');
      if (!s.id) return;
      if (s.admin === true) return;

      var h = {
        'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVnb296bWFwb3psd3RpamF2ZXJ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ4MjIzMzgsImV4cCI6MjA5MDM5ODMzOH0.BZtq3wxBMIOhJ3iAqgPxN96PNxyKAj9R73_LvC25cek',
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVnb296bWFwb3psd3RpamF2ZXJ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ4MjIzMzgsImV4cCI6MjA5MDM5ODMzOH0.BZtq3wxBMIOhJ3iAqgPxN96PNxyKAj9R73_LvC25cek'
      };

      var r = await fetch(
        'https://ugoozmapozlwtijaveru.supabase.co/rest/v1/usuarios?id=eq.' + s.id,
        { headers: h }
      );

      if (!r.ok) return;
      var arr = await r.json();
      if (!arr || arr.length === 0) return;

      var usuario = arr[0];
      var planoPago = usuario.plano === 'pago' || usuario.plano === 'pessoal' || usuario.plano === 'corporativo';

      if (planoPago) {
        s.plano = usuario.plano;
        if (usuario.plano_expira) s.planoExpira = usuario.plano_expira;
        localStorage.setItem('facilite_sessao', JSON.stringify(s));
        console.log('[Plano] Premium restaurado do Supabase:', usuario.plano);
        window.dispatchEvent(new CustomEvent('facilite:plano-ativado'));

        // Remover banners de upgrade se existirem
        var banner = document.getElementById('banner-upgrade');
        if (banner) banner.remove();
        document.querySelectorAll('.upgrade-notice').forEach(function(el) { el.remove(); });
      }
      window._planoSincronizado = true;
    } catch(e) {
      console.warn('[Plano] Erro ao sincronizar:', e.message);
      window._planoSincronizado = true;
    }
  },

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

      // Salvar no Supabase imediatamente
      this._salvarNoSupabase(s);
      return true;
    } catch(e) { return false; }
  },

  _salvarNoSupabase: async function(sessao) {
    try {
      var h = {
        'Content-Type': 'application/json',
        'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVnb296bWFwb3psd3RpamF2ZXJ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ4MjIzMzgsImV4cCI6MjA5MDM5ODMzOH0.BZtq3wxBMIOhJ3iAqgPxN96PNxyKAj9R73_LvC25cek',
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVnb296bWFwb3psd3RpamF2ZXJ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ4MjIzMzgsImV4cCI6MjA5MDM5ODMzOH0.BZtq3wxBMIOhJ3iAqgPxN96PNxyKAj9R73_LvC25cek',
        'Prefer': 'resolution=merge-duplicates,return=representation'
      };
      await fetch(
        'https://ugoozmapozlwtijaveru.supabase.co/rest/v1/usuarios?on_conflict=id',
        {
          method: 'POST',
          headers: h,
          body: JSON.stringify({
            id: sessao.id,
            nome: sessao.nome,
            email: sessao.email,
            foto: sessao.foto,
            provider: sessao.provider,
            plano: sessao.plano,
            plano_expira: sessao.planoExpira || null
          })
        }
      );
      console.log('[Plano] Plano salvo no Supabase:', sessao.plano);
    } catch(e) {
      console.warn('[Plano] Erro ao salvar no Supabase:', e.message);
    }
  },

  ativarPlano: function(m) { return this.ativar(m); },

  verificar: function(callback, msg) {
    if (this.ehPago()) {
      if (typeof callback === 'function') callback();
    } else {
      window.FacilitePaywall.abrir(msg || '');
    }
  },

  verificarAcesso: function(cb, msg) { return this.verificar(cb, msg); }
};
