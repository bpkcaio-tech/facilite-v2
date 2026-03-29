// ═══════════════════════════════════════════════════
//  FACILITE — NOTIFICAÇÕES
// ═══════════════════════════════════════════════════

const FaciliteNotify = {
  container: null,

  init() {
    if (this.container) return;
    this.container = document.createElement('div');
    this.container.id = 'facilite-toasts';
    this.container.style.cssText = 'position:fixed;top:20px;right:20px;z-index:100000;display:flex;flex-direction:column;gap:10px;pointer-events:none;max-width:380px';
    document.body.appendChild(this.container);
  },

  show(msg, tipo = 'info', duracao = 4000) {
    this.init();
    const cores = {
      success: { bg: 'rgba(34,197,94,0.15)', border: 'rgba(34,197,94,0.4)', icon: '✅', color: '#22C55E' },
      error:   { bg: 'rgba(239,68,68,0.15)', border: 'rgba(239,68,68,0.4)', icon: '❌', color: '#EF4444' },
      warning: { bg: 'rgba(245,158,11,0.15)', border: 'rgba(245,158,11,0.4)', icon: '⚠️', color: '#F59E0B' },
      info:    { bg: 'rgba(34,197,94,0.08)', border: 'rgba(34,197,94,0.25)', icon: 'ℹ️', color: '#86EFAC' },
    };
    const c = cores[tipo] || cores.info;

    const toast = document.createElement('div');
    toast.style.cssText = `
      background:${c.bg};backdrop-filter:blur(16px);border:1px solid ${c.border};
      border-radius:12px;padding:14px 18px;display:flex;align-items:center;gap:10px;
      font-family:'DM Sans',sans-serif;font-size:14px;color:${c.color};
      pointer-events:auto;cursor:pointer;
      opacity:0;transform:translateX(100%);transition:all 0.3s ease;
      box-shadow:0 8px 24px rgba(0,0,0,0.3);
    `;
    toast.innerHTML = `<span style="font-size:18px;flex-shrink:0">${c.icon}</span><span style="flex:1">${msg}</span>`;
    toast.onclick = () => this._remove(toast);

    this.container.appendChild(toast);
    requestAnimationFrame(() => {
      toast.style.opacity = '1';
      toast.style.transform = 'translateX(0)';
    });

    if (duracao > 0) {
      setTimeout(() => this._remove(toast), duracao);
    }
  },

  _remove(toast) {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    setTimeout(() => toast.remove(), 300);
  },

  success(msg, dur) { this.show(msg, 'success', dur); },
  error(msg, dur)   { this.show(msg, 'error', dur); },
  warning(msg, dur) { this.show(msg, 'warning', dur); },
  info(msg, dur)    { this.show(msg, 'info', dur); },
};

window.FaciliteNotify = FaciliteNotify;

// ═══════════════════════════════════════════════════
//  PAINEL DE NOTIFICAÇÕES (sino)
// ═══════════════════════════════════════════════════

const NotifPanel = {
  _open: false,

  toggle() {
    this._open = !this._open;
    const panel = document.getElementById('notif-panel');
    if (panel) panel.style.display = this._open ? 'block' : 'none';
    if (this._open) this.render();
    // Fechar ao clicar fora
    if (this._open) {
      setTimeout(() => {
        const handler = (e) => {
          if (!panel.contains(e.target) && e.target.id !== 'btn-notificacoes' && !e.target.closest('#btn-notificacoes')) {
            this._open = false;
            panel.style.display = 'none';
            document.removeEventListener('click', handler);
          }
        };
        document.addEventListener('click', handler);
      }, 10);
    }
  },

  render() {
    const list = document.getElementById('notif-list');
    if (!list) return;
    const notifs = FaciliteStorage.get('notificacoes') || [];
    const sorted = [...notifs].sort((a, b) => new Date(b.criadoEm) - new Date(a.criadoEm));

    if (sorted.length === 0) {
      list.innerHTML = '<div style="padding:24px;text-align:center;color:#4B5563;font-size:13px">Nenhuma notificação</div>';
      return;
    }

    list.innerHTML = sorted.slice(0, 20).map(n => {
      const icones = { vencimento: '📅', pagamento: '💰', parabens: '🎉', alerta: '🚨', meta: '🎯', assinatura: '📋', reserva: '🛡️' };
      const icone = icones[n.tipo] || 'ℹ️';
      const tempo = this._tempoRelativo(n.criadoEm);
      const opacity = n.lida ? '0.5' : '1';
      const bgLida = n.lida ? '' : 'background:rgba(34,197,94,0.03);';

      return `
        <div style="padding:12px 18px;border-bottom:1px solid rgba(255,255,255,0.03);display:flex;gap:10px;align-items:flex-start;opacity:${opacity};${bgLida}">
          <span style="font-size:16px;flex-shrink:0;margin-top:2px">${icone}</span>
          <div style="flex:1;min-width:0">
            <div style="font-size:13px;color:#D1D5DB;line-height:1.4">${escapeHTML(n.mensagem)}</div>
            <div style="font-size:11px;color:#4B5563;margin-top:3px">${tempo}</div>
          </div>
          ${!n.lida ? `<button onclick="NotifPanel.marcarLida('${n.id}')" style="background:none;border:none;color:#22C55E;font-size:14px;cursor:pointer;padding:4px;flex-shrink:0" title="Marcar como lida">✓</button>` : ''}
        </div>`;
    }).join('');

    this._atualizarBadge();
  },

  adicionar(mensagem, tipo = 'info') {
    const notifs = FaciliteStorage.get('notificacoes') || [];
    // Evitar duplicata na mesma hora
    const agora = new Date().toISOString();
    const duplicada = notifs.find(n => n.mensagem === mensagem && !n.lida);
    if (duplicada) return;

    notifs.unshift({
      id: FaciliteStorage.uid('n'),
      mensagem, tipo, lida: false,
      criadoEm: agora,
    });

    // Manter máximo de 50
    if (notifs.length > 50) notifs.length = 50;
    FaciliteStorage.set('notificacoes', notifs);
    this._atualizarBadge();
  },

  marcarLida(id) {
    const notifs = FaciliteStorage.get('notificacoes') || [];
    const n = notifs.find(x => x.id === id);
    if (n) { n.lida = true; FaciliteStorage.set('notificacoes', notifs); }
    this.render();
  },

  limparTodas() {
    const notifs = FaciliteStorage.get('notificacoes') || [];
    notifs.forEach(n => n.lida = true);
    FaciliteStorage.set('notificacoes', notifs);
    this.render();
  },

  _atualizarBadge() {
    const notifs = FaciliteStorage.get('notificacoes') || [];
    const naoLidas = notifs.filter(n => !n.lida).length;
    const badge = document.getElementById('notif-badge-count');
    if (badge) {
      badge.textContent = naoLidas;
      badge.style.display = naoLidas > 0 ? 'flex' : 'none';
    }
  },

  _tempoRelativo(iso) {
    const diff = Date.now() - new Date(iso).getTime();
    const min = Math.floor(diff / 60000);
    if (min < 1) return 'agora';
    if (min < 60) return `há ${min}min`;
    const hrs = Math.floor(min / 60);
    if (hrs < 24) return `há ${hrs}h`;
    const dias = Math.floor(hrs / 24);
    return `há ${dias}d`;
  },

  // ── Verificações automáticas (ao carregar) ─────────
  verificar() {
    const hoje = new Date();
    const diaHoje = hoje.getDate();
    const mes = hoje.getMonth() + 1;
    const ano = hoje.getFullYear();
    const prefs = FaciliteStorage.get('preferencias') || {};
    const diasAntes = prefs.diasAntesNotificacao || 10;

    // 1. Lançamentos pendentes vencendo
    const lancamentos = FaciliteStorage.get('lancamentos') || [];
    lancamentos.forEach(l => {
      if (l.status !== 'pendente' || l.valor >= 0) return;
      if (l.diaVencimento) {
        const diasFaltam = l.diaVencimento - diaHoje;
        if (diasFaltam >= 0 && diasFaltam <= diasAntes) {
          const msg = diasFaltam === 0
            ? `"${l.descricao}" vence HOJE! ${fmtBRL(Math.abs(l.valor))}`
            : `"${l.descricao}" vence em ${diasFaltam} dias. ${fmtBRL(Math.abs(l.valor))}`;
          this.adicionar(msg, 'vencimento');
        }
      }
    });

    // 2. Assinaturas vencendo
    const assinaturas = FaciliteStorage.get('assinaturas') || [];
    assinaturas.forEach(a => {
      if (!a.ativa) return;
      const diasFaltam = a.diaVencimento - diaHoje;
      if (diasFaltam >= 0 && diasFaltam <= 5) {
        const msg = diasFaltam === 0
          ? `Assinatura "${a.nome}" vence HOJE! ${fmtBRL(a.valor)}`
          : `Assinatura "${a.nome}" vence em ${diasFaltam} dias.`;
        this.adicionar(msg, 'assinatura');
      }
    });

    // 3. Dia preferido de pagamento
    if (diaHoje === (prefs.diaPreferidoPagamento || 5)) {
      const pendentes = lancamentos.filter(l => l.status === 'pendente' && l.valor < 0 && l.mes === mes && l.ano === ano);
      if (pendentes.length > 0) {
        const total = pendentes.reduce((s, l) => s + Math.abs(l.valor), 0);
        this.adicionar(`Dia de pagamento! Você tem ${pendentes.length} conta${pendentes.length > 1 ? 's' : ''} pendente${pendentes.length > 1 ? 's' : ''} (${fmtBRL(total)}).`, 'pagamento');
      }
    }

    // 4. Reservas com prazo vencendo
    const reservas = FaciliteStorage.get('reservas') || [];
    reservas.forEach(r => {
      if (!r.prazo || r.atual >= r.meta) return;
      const dias = Math.ceil((new Date(r.prazo) - hoje) / 86400000);
      if (dias >= 0 && dias <= 7) {
        const msg = dias === 0
          ? `Prazo da reserva "${r.nome}" vence HOJE! Falta ${fmtBRL(r.meta - r.atual)}.`
          : `Prazo da reserva "${r.nome}" vence em ${dias} dias.`;
        this.adicionar(msg, 'reserva');
      }
    });

    // 5. Avaliação do mês (se for último dia do mês)
    const ultimoDia = new Date(ano, mes, 0).getDate();
    if (diaHoje === ultimoDia) {
      const totais = FaciliteStorage.getTotaisMes(mes, ano);
      if (totais.saldo >= 0) {
        this.adicionar(`Parabéns! Você fechou o mês com saldo positivo de ${fmtBRL(totais.saldo)}! 🎉`, 'parabens');
      } else {
        this.adicionar(`Atenção: mês fechando no negativo (${fmtBRL(totais.saldo)}). Revise seus gastos.`, 'alerta');
      }
    }

    this._atualizarBadge();
  },
};

window.NotifPanel = NotifPanel;

// Verificar notificações ao carregar
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    NotifPanel.verificar();
    NotifPanel._atualizarBadge();
  }, 500);
});
