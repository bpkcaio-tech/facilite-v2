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
      texto: msg,
      tipo,
      data: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      tempo: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      lida: false,
    });
    if (this._items.length > 30) this._items = this._items.slice(0, 30);
    this._atualizarBadge();
  },

  render() {
    const list = document.getElementById('notif-list');
    if (!list) return;

    if (this._items.length === 0) {
      list.innerHTML = '<div class="notif-empty"><div class="notif-empty-icon">🔔</div><div class="notif-empty-text">Nenhuma notificação por enquanto</div></div>';
      return;
    }

    list.innerHTML = this._items.map((n, idx) => renderNotifItem(n, idx)).join('');

    // Marcar todas como lidas
    this._items.forEach(n => n.lida = true);
    this._atualizarBadge();
  },

  marcarLida(idx) {
    if (!this._items[idx]) return;
    this._items[idx].lida = true;
    this.render();
  },

  remover(idx) {
    if (typeof idx !== 'number' || idx < 0 || idx >= this._items.length) return;
    this._items.splice(idx, 1);
    this.render();
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

function getNotifEstilo(tipo) {
  var mapa = {
    'alerta':  { icone: '⚠️', classe: 'notif-icon--alerta'  },
    'sucesso': { icone: '✅', classe: 'notif-icon--sucesso' },
    'info':    { icone: '💡', classe: 'notif-icon--info'    },
    'aviso':   { icone: '🔔', classe: 'notif-icon--aviso'   },
    'meta':    { icone: '🎯', classe: 'notif-icon--sucesso' },
    'fatura':  { icone: '💳', classe: 'notif-icon--aviso'   },
  };
  return mapa[tipo] || { icone: '🔔', classe: 'notif-icon--info' };
}

function renderNotifItem(n, idx) {
  var estilo = getNotifEstilo(n.tipo);
  var naoLida = !n.lida ? 'notif-item--nao-lida' : '';
  return `
    <div class="notif-item ${naoLida}" onclick="NotifPanel.marcarLida(${idx})">
      <div class="notif-icon ${estilo.classe}">${estilo.icone}</div>
      <div class="notif-content">
        <div class="notif-texto">${n.texto || n.msg}</div>
        <div class="notif-tempo">${n.tempo || n.data || 'agora'}</div>
      </div>
      <button class="notif-acao" onclick="event.stopPropagation();NotifPanel.remover(${idx})" title="Remover">✕</button>
    </div>`;
}
