// ═══════════════════════════════════════════════════
//  FACILITE — PAINEL DE NOTIFICAÇÕES (sino)
// ═══════════════════════════════════════════════════

const NotifPanel = {
  _items: [],

  toggle() {
    const panel = document.getElementById('notif-panel');
    if (!panel) return;
    const isOpen = panel.style.display === 'block';
    panel.style.display = isOpen ? 'none' : 'block';

    if (!isOpen) {
      this.render();
      // Fechar ao clicar fora
      setTimeout(() => {
        const handler = (e) => {
          if (!panel.contains(e.target) && e.target.id !== 'btn-notificacoes' && !e.target.closest('#btn-notificacoes')) {
            panel.style.display = 'none';
            document.removeEventListener('click', handler);
          }
        };
        document.addEventListener('click', handler);
      }, 10);
    }
  },

  add(msg, tipo = 'info') {
    this._items.unshift({
      id: Date.now(),
      msg,
      tipo,
      data: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      lida: false,
    });
    if (this._items.length > 30) this._items = this._items.slice(0, 30);
    this._atualizarBadge();
  },

  render() {
    const list = document.getElementById('notif-list');
    if (!list) return;

    if (this._items.length === 0) {
      list.innerHTML = '<div style="padding:30px;text-align:center;color:#4B5563;font-size:13px">Nenhuma notificação</div>';
      return;
    }

    const icones = { info: 'ℹ️', warning: '⚠️', success: '✅', error: '❌' };
    const cores = { info: '#22C55E', warning: '#F59E0B', success: '#22C55E', error: '#EF4444' };

    list.innerHTML = this._items.map(n => `
      <div style="padding:12px 18px;border-bottom:1px solid rgba(255,255,255,0.025);display:flex;gap:10px;align-items:start;${n.lida ? 'opacity:0.5' : ''}">
        <span style="font-size:16px;flex-shrink:0;margin-top:1px">${icones[n.tipo] || 'ℹ️'}</span>
        <div style="flex:1;min-width:0">
          <div style="font-size:13px;color:#D1D5DB;line-height:1.4">${n.msg}</div>
          <div style="font-size:11px;color:#374151;margin-top:3px">${n.data}</div>
        </div>
      </div>
    `).join('');

    // Marcar todas como lidas
    this._items.forEach(n => n.lida = true);
    this._atualizarBadge();
  },

  limparTodas() {
    this._items = [];
    this.render();
    this._atualizarBadge();
  },

  _atualizarBadge() {
    const badge = document.getElementById('notif-badge-count');
    if (!badge) return;
    const naoLidas = this._items.filter(n => !n.lida).length;
    badge.textContent = naoLidas;
    badge.style.display = naoLidas > 0 ? 'flex' : 'none';
  },
};

// Integrar com notificações do ChartsUpdate
const _origNotifyShow = FaciliteNotify.show.bind(FaciliteNotify);
FaciliteNotify.show = function(msg, tipo, duracao) {
  _origNotifyShow(msg, tipo, duracao);
  NotifPanel.add(msg, tipo);
};

window.NotifPanel = NotifPanel;
