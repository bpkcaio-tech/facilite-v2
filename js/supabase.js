const SUPABASE_URL = 'https://ugoozmapozlwtijaveru.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVnb296bWFwb3psd3RpamF2ZXJ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ4MjIzMzgsImV4cCI6MjA5MDM5ODMzOH0.BZtq3wxBMIOhJ3iAqgPxN96PNxyKAj9R73_LvC25cek';

window.FaciliteSync = {

  _h: function() {
    return {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_KEY,
      'Authorization': 'Bearer ' + SUPABASE_KEY,
      'Prefer': 'return=representation'
    };
  },

  _userId: function() {
    try {
      return JSON.parse(localStorage.getItem('facilite_sessao') || '{}').id || null;
    } catch(e) { return null; }
  },

  salvarLancamento: async function(l) {
    var uid = this._userId();
    if (!uid) return;
    try {
      var r = await fetch(SUPABASE_URL + '/rest/v1/lancamentos', {
        method: 'POST',
        headers: this._h(),
        body: JSON.stringify({
          user_id: uid,
          descricao: l.descricao,
          valor: l.valor,
          categoria: l.categoria || 'Outros',
          tipo: l.tipo || 'variavel',
          data: l.data || new Date().toISOString().split('T')[0],
          mes: l.mes || (new Date().getMonth() + 1),
          ano: l.ano || new Date().getFullYear(),
          forma_pagamento: l.formaPagamento || 'dinheiro',
          status: l.status || 'pago',
          recorrente: l.recorrente || false
        })
      });
      if (!r.ok) return;
      console.log('[Supabase] Lancamento salvo');
    } catch(e) { console.warn('[Supabase] Erro:', e.message); }
  },

  salvarReceita: async function(valor) {
    var uid = this._userId();
    if (!uid) return;
    var mes = new Date().getMonth() + 1;
    var ano = new Date().getFullYear();
    try {
      await fetch(SUPABASE_URL + '/rest/v1/receitas?on_conflict=user_id,mes,ano', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY, 'Prefer': 'resolution=merge-duplicates,return=representation' },
        body: JSON.stringify({ user_id: uid, valor: valor, mes: mes, ano: ano })
      });
    } catch(e) { console.warn('[Supabase] Erro receita:', e.message); }
  },

  salvarUsuario: async function(u) {
    if (!u || !u.id) return;
    try {
      var r = await fetch(SUPABASE_URL + '/rest/v1/usuarios?on_conflict=id', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY, 'Prefer': 'resolution=merge-duplicates,return=representation' },
        body: JSON.stringify({
          id: u.id, nome: u.nome, email: u.email,
          foto: u.foto, provider: u.provider, plano: u.plano || 'gratuito'
        })
      });
      if (r.status === 401 || r.status === 404) return; // tabela não existe ou sem permissão — ignorar
    } catch(e) { console.warn('[Supabase] Erro usuario:', e.message); }
  },

  carregarTudo: async function(forcar) {
    var uid = this._userId();
    if (!uid) return;
    if (this._carregando && !forcar) return;
    this._carregando = true;

    try {
      var r = await fetch(
        SUPABASE_URL + '/rest/v1/lancamentos?user_id=eq.' + uid + '&order=data.desc&limit=500',
        { headers: this._h() }
      );

      if (!r.ok) { this._carregando = false; return; }
      var lancamentosServidor = await r.json();

      if (Array.isArray(lancamentosServidor) && lancamentosServidor.length > 0) {
        var local = window.FaciliteStorage ? (FaciliteStorage.get('lancamentos') || []) : [];
        var idsServidor = {};
        lancamentosServidor.forEach(function(l) { idsServidor[l.id] = true; });
        var somenteLocal = local.filter(function(l) { return !idsServidor[l.id]; });
        var merged = lancamentosServidor.concat(somenteLocal);
        if (window.FaciliteStorage) FaciliteStorage.set('lancamentos', merged);
      }

      var rRec = await fetch(
        SUPABASE_URL + '/rest/v1/receitas?user_id=eq.' + uid + '&order=ano.desc,mes.desc&limit=1',
        { headers: this._h() }
      );
      if (rRec.ok) {
        var receitas = await rRec.json();
        if (Array.isArray(receitas) && receitas.length > 0 && window.FaciliteStorage) {
          var recAtual = FaciliteStorage.get('receita') || {};
          FaciliteStorage.set('receita', {
            mensal: receitas[0].valor,
            nomeReceita: recAtual.nomeReceita || 'Salario',
            diaRecebimento: recAtual.diaRecebimento || 5
          });
        }
      }

      if (typeof window.atualizarCards === 'function') window.atualizarCards();
      if (typeof FaciliteState !== 'undefined') FaciliteState.refresh();
      if (typeof LancamentosPage !== 'undefined' && window.FaciliteRouter && FaciliteRouter.currentPage === 'lancamentos') {
        LancamentosPage.render();
      }

      console.log('[Supabase] Sync concluido — ' + (lancamentosServidor ? lancamentosServidor.length : 0) + ' lancamentos');

    } catch(e) {
      console.warn('[Supabase] Erro sync:', e.message);
    } finally {
      this._carregando = false;
    }
  },

  excluirLancamento: async function(id) {
    try {
      await fetch(SUPABASE_URL + '/rest/v1/lancamentos?id=eq.' + id, {
        method: 'DELETE',
        headers: this._h()
      });
    } catch(e) { console.warn('[Supabase] Erro excluir:', e.message); }
  }
};
