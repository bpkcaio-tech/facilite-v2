// ═══════════════════════════════════════════════════
//  FACILITE — SUPABASE (fonte de verdade)
// ═══════════════════════════════════════════════════

var SUPABASE_URL = 'https://ugoozmapozlwtijaveru.supabase.co';
var SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVnb296bWFwb3psd3RpamF2ZXJ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ4MjIzMzgsImV4cCI6MjA5MDM5ODMzOH0.BZtq3wxBMIOhJ3iAqgPxN96PNxyKAj9R73_LvC25cek';

window.FaciliteSync = {

  _carregando: false,
  _refreshTimer: null,

  // ── Headers padrão ─────────────────────────────
  _h: function() {
    return {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_KEY,
      'Authorization': 'Bearer ' + SUPABASE_KEY,
      'Prefer': 'return=representation'
    };
  },

  // ── ID do usuário logado ───────────────────────
  _userId: function() {
    try {
      var s = JSON.parse(localStorage.getItem('facilite_sessao') || '{}');
      return s.id || null;
    } catch(e) { return null; }
  },

  // ── Atualiza UI uma única vez (debounce) ───────
  _refreshUI: function() {
    if (this._refreshTimer) clearTimeout(this._refreshTimer);
    this._refreshTimer = setTimeout(function() {
      if (typeof window.atualizarCards === 'function') window.atualizarCards();
      if (typeof FaciliteState !== 'undefined') FaciliteState.refresh();
      if (
        typeof LancamentosPage !== 'undefined' &&
        window.FaciliteRouter &&
        FaciliteRouter.currentPage === 'lancamentos'
      ) {
        LancamentosPage.render();
      }
    }, 200);
  },

  // ══════════════════════════════════════════════
  //  CARREGAR TUDO (Supabase → localStorage → UI)
  // ══════════════════════════════════════════════
  carregarTudo: async function(forcar) {
    var uid = this._userId();
    if (!uid) return;
    if (this._carregando && !forcar) return;
    this._carregando = true;

    try {
      // Buscar lançamentos
      var rLanc = await fetch(
        SUPABASE_URL + '/rest/v1/lancamentos?user_id=eq.' + uid + '&order=data.desc&limit=1000',
        { headers: this._h() }
      );

      if (rLanc.ok) {
        var dados = await rLanc.json();
        if (Array.isArray(dados)) {
          if (window.FaciliteStorage) {
            FaciliteStorage.set('lancamentos', dados);
          }
          console.log('[Sync] ' + dados.length + ' lancamentos carregados do Supabase');
        }
      }

      // Buscar receita
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

      this._refreshUI();

    } catch(e) {
      console.warn('[Sync] Erro ao carregar:', e.message);
    } finally {
      this._carregando = false;
    }
  },

  // ══════════════════════════════════════════════
  //  ADICIONAR lançamento
  // ══════════════════════════════════════════════
  adicionarLancamento: async function(lancamento) {
    var uid = this._userId();
    if (!uid) return false;

    try {
      var body = {
        id: lancamento.id,
        user_id: uid,
        descricao: lancamento.descricao,
        valor: lancamento.valor,
        categoria: lancamento.categoria || 'Outros',
        tipo: lancamento.tipo || 'variavel',
        data: lancamento.data || new Date().toISOString().split('T')[0],
        mes: lancamento.mes || (new Date().getMonth() + 1),
        ano: lancamento.ano || new Date().getFullYear(),
        forma_pagamento: lancamento.formaPagamento || 'pix',
        status: lancamento.status || 'pago',
        recorrente: lancamento.recorrente || false
      };

      var r = await fetch(SUPABASE_URL + '/rest/v1/lancamentos', {
        method: 'POST',
        headers: this._h(),
        body: JSON.stringify(body)
      });

      if (!r.ok) {
        var err = await r.json().catch(function() { return {}; });
        console.warn('[Sync] Erro ao adicionar:', r.status, err);
        return false;
      }

      console.log('[Sync] Lancamento adicionado:', lancamento.id);
      return true;

    } catch(e) {
      console.warn('[Sync] Erro ao adicionar:', e.message);
      return false;
    }
  },

  // ══════════════════════════════════════════════
  //  EXCLUIR lançamento
  // ══════════════════════════════════════════════
  excluirLancamento: async function(id) {
    if (!id) return false;
    var uid = this._userId();
    if (!uid) return false;

    try {
      var r = await fetch(
        SUPABASE_URL + '/rest/v1/lancamentos?id=eq.' + id + '&user_id=eq.' + uid,
        {
          method: 'DELETE',
          headers: this._h()
        }
      );

      if (!r.ok) {
        console.warn('[Sync] Erro ao excluir:', r.status);
        return false;
      }

      console.log('[Sync] Lancamento excluido do Supabase:', id);
      return true;

    } catch(e) {
      console.warn('[Sync] Erro ao excluir:', e.message);
      return false;
    }
  },

  // ══════════════════════════════════════════════
  //  EDITAR lançamento
  // ══════════════════════════════════════════════
  editarLancamento: async function(id, dados) {
    if (!id) return false;
    var uid = this._userId();
    if (!uid) return false;

    try {
      var body = {
        descricao: dados.descricao,
        valor: dados.valor,
        categoria: dados.categoria,
        tipo: dados.tipo,
        data: dados.data,
        mes: dados.mes,
        ano: dados.ano,
        forma_pagamento: dados.formaPagamento,
        status: dados.status,
        recorrente: dados.recorrente
      };

      var r = await fetch(
        SUPABASE_URL + '/rest/v1/lancamentos?id=eq.' + id + '&user_id=eq.' + uid,
        {
          method: 'PATCH',
          headers: this._h(),
          body: JSON.stringify(body)
        }
      );

      if (!r.ok) {
        console.warn('[Sync] Erro ao editar:', r.status);
        return false;
      }

      console.log('[Sync] Lancamento editado:', id);
      return true;

    } catch(e) {
      console.warn('[Sync] Erro ao editar:', e.message);
      return false;
    }
  },

  // ══════════════════════════════════════════════
  //  SALVAR RECEITA
  // ══════════════════════════════════════════════
  salvarReceita: async function(valor) {
    var uid = this._userId();
    if (!uid) return;
    var mes = new Date().getMonth() + 1;
    var ano = new Date().getFullYear();
    try {
      await fetch(
        SUPABASE_URL + '/rest/v1/receitas?on_conflict=user_id,mes,ano',
        {
          method: 'POST',
          headers: Object.assign({}, this._h(), { 'Prefer': 'resolution=merge-duplicates,return=representation' }),
          body: JSON.stringify({ user_id: uid, valor: valor, mes: mes, ano: ano })
        }
      );
    } catch(e) {
      console.warn('[Sync] Erro receita:', e.message);
    }
  },

  // ══════════════════════════════════════════════
  //  SALVAR USUÁRIO
  // ══════════════════════════════════════════════
  salvarUsuario: async function(u) {
    if (!u || !u.id) return;
    try {
      await fetch(
        SUPABASE_URL + '/rest/v1/usuarios?on_conflict=id',
        {
          method: 'POST',
          headers: Object.assign({}, this._h(), { 'Prefer': 'resolution=merge-duplicates,return=representation' }),
          body: JSON.stringify({
            id: u.id,
            nome: u.nome,
            email: u.email,
            foto: u.foto,
            provider: u.provider,
            plano: u.plano || 'gratuito'
          })
        }
      );
    } catch(e) {
      console.warn('[Sync] Erro usuario:', e.message);
    }
  }

};
