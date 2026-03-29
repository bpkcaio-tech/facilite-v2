// ═══════════════════════════════════════════════════
//  FACILITE — STATE (estado global reativo)
// ═══════════════════════════════════════════════════

const FaciliteState = {
  _listeners: {},
  mesAtual: new Date().getMonth() + 1,
  anoAtual: new Date().getFullYear(),

  // ── Listeners ──────────────────────────────────────
  on(evento, fn) {
    if (!this._listeners[evento]) this._listeners[evento] = [];
    this._listeners[evento].push(fn);
  },

  off(evento, fn) {
    if (!this._listeners[evento]) return;
    this._listeners[evento] = this._listeners[evento].filter(f => f !== fn);
  },

  emit(evento, data) {
    (this._listeners[evento] || []).forEach(fn => {
      try { fn(data); } catch (e) { console.error('[State] Listener error:', e); }
    });
    // Sempre emite wildcard
    if (evento !== '*') {
      (this._listeners['*'] || []).forEach(fn => {
        try { fn({ evento, data }); } catch (e) { console.error('[State] Listener error:', e); }
      });
    }
  },

  // ── Obter snapshot dos totais ─────────────────────
  getTotais() {
    return FaciliteStorage.getTotaisMes(this.mesAtual, this.anoAtual);
  },

  getSaldoTotal() {
    return FaciliteStorage.getSaldoTotal();
  },

  // ── Mudar mês visualizado ─────────────────────────
  setMes(mes, ano) {
    this.mesAtual = mes;
    this.anoAtual = ano;
    this.emit('mes-changed', { mes, ano });
    this.emit('dados-changed');
  },

  // ── Disparar atualização geral ────────────────────
  refresh() {
    this.emit('dados-changed');
  },

  // ── Meses helper ──────────────────────────────────
  getMesLabel() {
    const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    return meses[this.mesAtual - 1] + ' ' + this.anoAtual;
  },
};

// Reagir a mudanças no storage
window.addEventListener('facilite:update', (e) => {
  FaciliteState.emit('dados-changed', e.detail);
});

window.FaciliteState = FaciliteState;
