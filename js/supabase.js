// ═══════════════════════════════════════════════════
//  FACILITE — SUPABASE (fonte de verdade)
// ═══════════════════════════════════════════════════

var SUPABASE_URL = 'https://ugoozmapozlwtijaveru.supabase.co';
var SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVnb296bWFwb3psd3RpamF2ZXJ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ4MjIzMzgsImV4cCI6MjA5MDM5ODMzOH0.BZtq3wxBMIOhJ3iAqgPxN96PNxyKAj9R73_LvC25cek';

window.FaciliteSync = {

  _carregando: false,
  _refreshTimer: null,
  _salvandoDados: false,
  ready: false,

  // ── Headers ────────────────────────────────────
  _h: function() {
    return {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_KEY,
      'Authorization': 'Bearer ' + SUPABASE_KEY,
      'Prefer': 'return=representation'
    };
  },

  // ── ID do usuário ──────────────────────────────
  _userId: function() {
    try {
      var s = JSON.parse(localStorage.getItem('facilite_sessao') || '{}');
      return s.id || null;
    } catch(e) { return null; }
  },

  // ── Debounce UI ───────────────────────────────
  _refreshUI: function() {
    if (this._refreshTimer) clearTimeout(this._refreshTimer);
    this._refreshTimer = setTimeout(function() {
      var scrollY = window.scrollY || 0;
      if (typeof window.atualizarCards === 'function') window.atualizarCards();
      if (typeof FaciliteState !== 'undefined') FaciliteState.refresh();
      if (
        typeof LancamentosPage !== 'undefined' &&
        window.FaciliteRouter &&
        FaciliteRouter.currentPage === 'lancamentos'
      ) LancamentosPage.render();
      requestAnimationFrame(function() { window.scrollTo(0, scrollY); });
    }, 200);
  },

  // ══════════════════════════════════════════════
  //  CARREGAR TUDO — lançamentos + dados_usuario
  // ══════════════════════════════════════════════
  carregarTudo: async function(forcar) {
    var uid = this._userId();
    if (!uid) return;
    if (this._carregando && !forcar) return;
    this._carregando = true;

    try {
      // ── 1. Lançamentos ──────────────────────────
      var rLanc = await fetch(
        SUPABASE_URL + '/rest/v1/lancamentos?user_id=eq.' + uid + '&order=data.desc&limit=1000',
        { headers: this._h() }
      );

      if (rLanc.ok) {
        var lancamentos = await rLanc.json();
        if (Array.isArray(lancamentos)) {
          // Lista negra: IDs excluídos localmente
          var idsExcluidos = JSON.parse(localStorage.getItem('facilite_ids_excluidos') || '[]');
          var idsServidor = lancamentos.map(function(l) { return l.id; });

          var filtrados = lancamentos.filter(function(l) {
            return !idsExcluidos.includes(l.id);
          });

          // Limpar lista negra: remover IDs que o servidor já não tem
          var listaLimpa = idsExcluidos.filter(function(id) {
            return idsServidor.includes(id);
          });
          localStorage.setItem('facilite_ids_excluidos', JSON.stringify(listaLimpa));

          if (filtrados.length > 0 && window.FaciliteStorage) {
            FaciliteStorage.set('lancamentos', filtrados);
            console.log('[Sync] ' + filtrados.length + ' lancamentos carregados');
          } else if (lancamentos.length === 0) {
            // Servidor vazio — tentar subir dados locais
            var local = window.FaciliteStorage ? (FaciliteStorage.get('lancamentos') || []) : [];
            if (local.length > 0) {
              console.log('[Sync] Supabase vazio, subindo ' + local.length + ' lancamentos locais...');
              this._subirLancamentosLocais(local);
            }
          }
        }
      }

      // ── 2. Dados do usuário (receita, cartões, assinaturas, reservas, categorias) ──
      var rDados = await fetch(
        SUPABASE_URL + '/rest/v1/dados_usuario?user_id=eq.' + uid,
        { headers: this._h() }
      );

      if (rDados.ok) {
        var dadosArr = await rDados.json();
        if (Array.isArray(dadosArr) && dadosArr.length > 0 && window.FaciliteStorage) {
          var d = dadosArr[0];

          if (d.receita && (d.receita.mensal || d.receita.mensal === 0)) {
            FaciliteStorage.set('receita', d.receita);
          }
          if (Array.isArray(d.contas) && d.contas.length > 0) {
            FaciliteStorage.set('contas', d.contas);
          }
          if (Array.isArray(d.cartoes) && d.cartoes.length > 0) {
            FaciliteStorage.set('cartoes', d.cartoes);
          }
          if (Array.isArray(d.assinaturas) && d.assinaturas.length > 0) {
            FaciliteStorage.set('assinaturas', d.assinaturas);
          }
          if (Array.isArray(d.reservas) && d.reservas.length > 0) {
            FaciliteStorage.set('reservas', d.reservas);
          }
          if (d.categorias && Object.keys(d.categorias).length > 0) {
            FaciliteStorage.set('categorias', d.categorias);
          }
          if (Array.isArray(d.relatorios) && d.relatorios.length > 0) {
            FaciliteStorage.set('relatorios', d.relatorios);
          }
          if (d.preferencias && Object.keys(d.preferencias).length > 0) {
            FaciliteStorage.set('preferencias', d.preferencias);
          }
          if (Array.isArray(d.notificacoes) && d.notificacoes.length > 0) {
            FaciliteStorage.set('notificacoes', d.notificacoes);
          }

          console.log('[Sync] Dados usuario restaurados do Supabase');
        } else {
          // Servidor sem dados — subir dados locais
          console.log('[Sync] Sem dados no servidor, subindo dados locais...');
          await this.salvarDadosUsuario();
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
  //  SALVAR DADOS DO USUÁRIO (receita, cartões, etc)
  //  Chamar sempre que qualquer dado desses mudar
  // ══════════════════════════════════════════════
  salvarDadosUsuario: async function() {
    var uid = this._userId();
    if (!uid || this._salvandoDados) return;
    this._salvandoDados = true;

    try {
      var dados = {
        user_id: uid,
        receita:       window.FaciliteStorage ? (FaciliteStorage.get('receita')       || {})  : {},
        contas:        window.FaciliteStorage ? (FaciliteStorage.get('contas')        || [])  : [],
        cartoes:       window.FaciliteStorage ? (FaciliteStorage.get('cartoes')       || [])  : [],
        assinaturas:   window.FaciliteStorage ? (FaciliteStorage.get('assinaturas')   || [])  : [],
        reservas:      window.FaciliteStorage ? (FaciliteStorage.get('reservas')      || [])  : [],
        categorias:    window.FaciliteStorage ? (FaciliteStorage.get('categorias')    || {})  : {},
        relatorios:    window.FaciliteStorage ? (FaciliteStorage.get('relatorios')    || [])  : [],
        preferencias:  window.FaciliteStorage ? (FaciliteStorage.get('preferencias')  || {})  : {},
        notificacoes:  window.FaciliteStorage ? (FaciliteStorage.get('notificacoes')  || [])  : [],
        atualizado_em: new Date().toISOString()
      };

      var r = await fetch(
        SUPABASE_URL + '/rest/v1/dados_usuario?on_conflict=user_id',
        {
          method: 'POST',
          headers: Object.assign({}, this._h(), {
            'Prefer': 'resolution=merge-duplicates,return=representation'
          }),
          body: JSON.stringify(dados)
        }
      );

      if (r.ok) {
        console.log('[Sync] Dados salvos: receita, contas, cartoes, assinaturas, reservas, relatorios');
      } else {
        var err = await r.json().catch(function() { return {}; });
        console.warn('[Sync] Erro ao salvar dados:', r.status, JSON.stringify(err));
      }
    } catch(e) {
      console.warn('[Sync] Erro salvarDadosUsuario:', e.message);
    } finally {
      this._salvandoDados = false;
    }
  },

  // ══════════════════════════════════════════════
  //  PUSH KEY — chamado automaticamente pelo storage.js
  //  a cada FaciliteStorage.set()
  // ══════════════════════════════════════════════
  pushKey: async function(chave, valor) {
    var uid = this._userId();
    if (!uid) return;

    if (chave === 'lancamentos') return;

    var chavesUsuario = ['receita', 'contas', 'cartoes', 'assinaturas', 'reservas', 'categorias', 'relatorios', 'preferencias', 'notificacoes'];
    if (!chavesUsuario.includes(chave)) return;

    if (!this._pushTimers) this._pushTimers = {};
    if (this._pushTimers[chave]) clearTimeout(this._pushTimers[chave]);

    var self = this;
    this._pushTimers[chave] = setTimeout(async function() {
      await self.salvarDadosUsuario();
    }, 500);
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
        console.warn('[Sync] Erro ao adicionar:', r.status, JSON.stringify(err));
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

    // Adicionar à lista negra IMEDIATAMENTE
    var idsExcluidos = JSON.parse(localStorage.getItem('facilite_ids_excluidos') || '[]');
    if (!idsExcluidos.includes(id)) {
      idsExcluidos.push(id);
      localStorage.setItem('facilite_ids_excluidos', JSON.stringify(idsExcluidos));
    }

    try {
      var r = await fetch(
        SUPABASE_URL + '/rest/v1/lancamentos?id=eq.' + id,
        { method: 'DELETE', headers: this._h() }
      );

      if (r.ok) {
        console.log('[Sync] Excluido:', id);
      } else {
        console.warn('[Sync] Erro ao excluir:', r.status);
      }
      return r.ok;
    } catch(e) {
      console.warn('[Sync] Erro excluir:', e.message);
      return false;
    }
  },

  // ══════════════════════════════════════════════
  //  EDITAR lançamento
  // ══════════════════════════════════════════════
  editarLancamento: async function(id, dados) {
    if (!id) return false;
    try {
      var r = await fetch(
        SUPABASE_URL + '/rest/v1/lancamentos?id=eq.' + id,
        {
          method: 'PATCH',
          headers: this._h(),
          body: JSON.stringify({
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
          })
        }
      );
      if (r.ok) console.log('[Sync] Editado:', id);
      return r.ok;
    } catch(e) {
      console.warn('[Sync] Erro editar:', e.message);
      return false;
    }
  },

  // ══════════════════════════════════════════════
  //  SALVAR RECEITA (atalho que chama salvarDadosUsuario)
  // ══════════════════════════════════════════════
  salvarReceita: async function(valor) {
    if (window.FaciliteStorage) {
      var recAtual = FaciliteStorage.get('receita') || {};
      FaciliteStorage.set('receita', Object.assign({}, recAtual, { mensal: valor }));
    }
    await this.salvarDadosUsuario();
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
          headers: Object.assign({}, this._h(), {
            'Prefer': 'resolution=merge-duplicates,return=representation'
          }),
          body: JSON.stringify({
            id: u.id, nome: u.nome, email: u.email,
            foto: u.foto, provider: u.provider, plano: u.plano || 'gratuito'
          })
        }
      );
    } catch(e) {
      console.warn('[Sync] Erro usuario:', e.message);
    }
  },

  // ══════════════════════════════════════════════
  //  SUBIR LANÇAMENTOS LOCAIS AO SUPABASE
  // ══════════════════════════════════════════════
  _subirLancamentosLocais: async function(lancamentos) {
    var uid = this._userId();
    if (!uid) return;
    for (var i = 0; i < lancamentos.length; i++) {
      var l = lancamentos[i];
      if (l.id) await this.adicionarLancamento(l);
    }
    console.log('[Sync] Upload local concluido');
  }

};

window.FaciliteSync.ready = true;
console.log('[Sync] FaciliteSync pronto');
