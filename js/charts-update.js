// ═══════════════════════════════════════════════════
//  FACILITE — CHARTS UPDATE (atualização reativa)
//  Sincroniza os cards KPI e gráficos do dashboard
//  com os dados do FaciliteStorage
// ═══════════════════════════════════════════════════

const ChartsUpdate = {
  init() {
    this.atualizarCards();

    // Reagir a qualquer mudança de dados — SEMPRE sincroniza,
    // e atualiza DOM só se estiver no dashboard
    FaciliteState.on('dados-changed', () => {
      this.atualizarCards();
    });

    // Quando voltar ao dashboard — re-criar charts no canvas restaurado
    FaciliteState.on('dashboard-loaded', () => {
      setTimeout(() => {
        if (typeof window.initDashboardCharts === 'function') initDashboardCharts();
        this.atualizarCards();
      }, 100);
    });
  },

  atualizarCards() {
    var _scrollY = window.scrollY || window.pageYOffset || 0;
    const mes  = FaciliteState.mesAtual;
    const ano  = FaciliteState.anoAtual;
    const totais = FaciliteStorage.getTotaisMes(mes, ano);
    const saldoTotal = FaciliteStorage.getSaldoTotal();

    const elSaldo      = document.getElementById('valor-saldo-total');
    const elReceita    = document.getElementById('valor-receita-mensal');
    const elDespesa    = document.getElementById('valor-despesas-mensais');
    const elDisponivel = document.getElementById('valor-disponivel');
    const elGaugePct   = document.getElementById('gauge-pct-label');
    const elGauge      = document.getElementById('gaugeFill');

    if (elSaldo)      this._animarValor(elSaldo, saldoTotal);
    if (elReceita)    this._animarValor(elReceita, totais.receita);
    if (elDespesa)    this._animarValor(elDespesa, totais.despesas, true);
    if (elDisponivel) this._animarValor(elDisponivel, totais.disponivel);
    // pct = % gasto (usado). Cor baseada em quanto já gastou:
    // pouco gasto = verde, metade = amarelo, quase tudo = vermelho
    const corUsado = totais.pct >= 90 ? '#EF4444'
      : totais.pct >= 75 ? '#F97316'
      : totais.pct >= 50 ? '#F59E0B'
      : '#22C55E';

    // Badge de % no card Disponível
    const elPctBadge = document.getElementById('valor-percentual-badge');
    if (elPctBadge) {
      const pctDisp = 100 - totais.pct;
      elPctBadge.textContent = pctDisp + '% disponível';
    }

    if (elGaugePct) {
      elGaugePct.textContent = totais.pct + '% comprometido';
      elGaugePct.style.color = corUsado;
    }

    if (elGauge) {
      elGauge.style.width = Math.min(totais.pct, 100) + '%';
      if (totais.pct >= 90)      elGauge.style.background = 'linear-gradient(90deg,#EF4444,#B91C1C)';
      else if (totais.pct >= 75) elGauge.style.background = 'linear-gradient(90deg,#F97316,#EA580C)';
      else if (totais.pct >= 50) elGauge.style.background = 'linear-gradient(90deg,#F59E0B,#D97706)';
      else                       elGauge.style.background = 'linear-gradient(90deg,#22C55E,#16A34A)';
    }

    // Atualizar Resumo do Mês
    const elRenda  = document.getElementById('resumo-renda');
    const elFixos  = document.getElementById('resumo-fixos');
    const elVar    = document.getElementById('resumo-variaveis');
    const elDisp   = document.getElementById('resumo-disponivel');
    if (elRenda)  elRenda.textContent  = fmtBRL(totais.receita);
    if (elFixos)  elFixos.textContent  = '- ' + fmtBRL(totais.fixos);
    if (elVar)    elVar.textContent    = '- ' + fmtBRL(totais.variaveis);
    if (elDisp) {
      elDisp.textContent = fmtBRL(totais.disponivel);
      elDisp.style.color = totais.disponivel >= 0 ? 'var(--color-positive)' : '#EF4444';
    }

    // Últimos Lançamentos (6 mais recentes)
    this._atualizarUltimosLancamentos(mes, ano);
    this._atualizarReservasDash();
    this._atualizarAssinaturasDash();

    // Atualizar gráfico de fluxo
    if (typeof window.atualizarGraficoFluxo === 'function') window.atualizarGraficoFluxo();

    // Sincronizar FACILITE_DATA para o chatbot
    this._syncFaciliteData(totais, saldoTotal);

    requestAnimationFrame(function() { window.scrollTo(0, _scrollY); });
  },

  _animarValor(el, valorFinal, ehDespesa = false) {
    const textoAtual = el.textContent.replace(/[^\d,]/g, '').replace(',', '.');
    const valorAtual = parseFloat(textoAtual) || 0;
    const duracao = 500;
    const inicio = performance.now();

    function tick(agora) {
      const progresso = Math.min((agora - inicio) / duracao, 1);
      const ease = 1 - Math.pow(1 - progresso, 3);
      const v = valorAtual + (valorFinal - valorAtual) * ease;
      el.textContent = fmtBRL(v);
      el.style.color = ehDespesa ? '#EF4444' : (v >= 0 ? '#22C55E' : '#EF4444');
      if (progresso < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  },

  // ── Assinaturas no dashboard ─────────────────────
  _atualizarAssinaturasDash() {
    const el = document.getElementById('dash-subs-list');
    const elCount = document.getElementById('dash-subs-count');
    const elTotal = document.getElementById('dash-subs-total');
    if (!el) return;

    const subs = (FaciliteStorage.get('assinaturas') || []).filter(s => s.ativa);
    const total = subs.reduce((s, a) => s + (a.valor || 0), 0);

    if (elCount) elCount.textContent = subs.length;
    if (elTotal) elTotal.textContent = fmtBRL(total);

    if (subs.length === 0) {
      el.innerHTML = '<li style="padding:16px;text-align:center;color:#4B5563;font-size:13px">Nenhuma assinatura ativa</li>';
      return;
    }

    el.innerHTML = subs.map(s => `
      <li class="sub-item">
        <div class="sub-icon" style="background:${s.cor || '#22C55E'}20;color:${s.cor || '#22C55E'}">${s.icone || '📱'}</div>
        <div class="sub-info"><span>${escapeHTML(s.nome)}</span><span class="sub-date">Vence dia ${s.diaVencimento || '—'}</span></div>
        <span class="sub-val">- ${fmtBRL(s.valor)}</span>
      </li>
    `).join('');
  },

  // ── Reservas no dashboard (máx 3) ──────────────────
  _atualizarReservasDash() {
    const el = document.getElementById('dash-reservas-list');
    const elResumo = document.getElementById('dash-reservas-resumo');
    if (!el) return;

    const reservas = FaciliteStorage.get('reservas') || [];

    if (reservas.length === 0) {
      el.innerHTML = '<div style="padding:20px;text-align:center;color:#4B5563;font-size:13px">Nenhuma reserva criada</div>';
      if (elResumo) elResumo.innerHTML = '<div style="padding:20px;text-align:center;color:#4B5563;font-size:13px">Crie sua primeira reserva</div>';
      return;
    }

    const max3 = reservas.slice(0, 3);
    const totalMeta = reservas.reduce((s, r) => s + (r.meta || 0), 0);
    const totalAtual = reservas.reduce((s, r) => s + (r.atual || 0), 0);
    const pctGeral = totalMeta > 0 ? Math.round((totalAtual / totalMeta) * 100) : 0;

    el.innerHTML = max3.map(r => {
      const pct = r.meta > 0 ? Math.min(Math.round((r.atual / r.meta) * 100), 100) : 0;
      const falta = Math.max(0, r.meta - r.atual);
      const corBarra = pct >= 100 ? '#22C55E' : pct >= 60 ? '#3B82F6' : pct >= 30 ? '#F59E0B' : '#6B7280';

      let prazoLabel = '';
      if (r.prazo) {
        const dias = Math.ceil((new Date(r.prazo) - new Date()) / 86400000);
        prazoLabel = dias > 0 ? `${dias}d restantes` : dias === 0 ? 'Vence hoje!' : 'Prazo vencido';
      }

      return `
        <div style="padding:14px 0;border-bottom:1px solid rgba(255,255,255,0.03)">
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
            <div style="width:36px;height:36px;border-radius:10px;background:${r.cor || '#22C55E'}18;display:flex;align-items:center;justify-content:center;font-size:16px">${r.icone || '🎯'}</div>
            <div style="flex:1;min-width:0">
              <div style="font-size:13px;color:#F0FDF4;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escapeHTML(r.nome)}</div>
              <div style="font-size:11px;color:#4B5563">${prazoLabel || r.categoria || ''}</div>
            </div>
            <div style="text-align:right">
              <div style="font-size:13px;font-weight:700;color:${corBarra};font-family:'Sora',sans-serif">${pct}%</div>
            </div>
          </div>
          <div style="height:5px;background:rgba(255,255,255,0.04);border-radius:3px;overflow:hidden">
            <div style="height:100%;width:${pct}%;background:${corBarra};border-radius:3px;transition:width 0.6s ease"></div>
          </div>
          <div style="display:flex;justify-content:space-between;font-size:11px;margin-top:4px">
            <span style="color:#6B7280">${fmtBRL(r.atual)} de ${fmtBRL(r.meta)}</span>
            <span style="color:#4B5563">falta ${fmtBRL(falta)}</span>
          </div>
        </div>`;
    }).join('');

    // Resumo geral (painel lateral)
    if (elResumo) {
      const corGeral = pctGeral >= 80 ? '#22C55E' : pctGeral >= 50 ? '#3B82F6' : pctGeral >= 25 ? '#F59E0B' : '#6B7280';
      elResumo.innerHTML = `
        <div style="text-align:center;padding:8px 0">
          <div style="position:relative;width:100px;height:100px;margin:0 auto 12px">
            <svg viewBox="0 0 36 36" width="100" height="100">
              <circle cx="18" cy="18" r="14" fill="none" stroke="rgba(255,255,255,0.04)" stroke-width="3"/>
              <circle cx="18" cy="18" r="14" fill="none" stroke="${corGeral}" stroke-width="3"
                stroke-dasharray="${(pctGeral / 100 * 87.96).toFixed(1)} ${(87.96 - pctGeral / 100 * 87.96).toFixed(1)}"
                stroke-linecap="round" transform="rotate(-90 18 18)" style="transition:stroke-dasharray 0.8s ease"/>
            </svg>
            <div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center">
              <span style="font-size:20px;font-weight:700;color:${corGeral};font-family:'Sora',sans-serif">${pctGeral}%</span>
            </div>
          </div>
          <div style="font-size:12px;color:#6B7280;margin-bottom:4px">guardado</div>
          <div style="font-size:18px;font-weight:700;color:#22C55E;font-family:'Sora',sans-serif">${fmtBRL(totalAtual)}</div>
          <div style="font-size:12px;color:#4B5563">de ${fmtBRL(totalMeta)}</div>
          <div style="margin-top:12px;font-size:12px;color:#6B7280">${reservas.length} reserva${reservas.length > 1 ? 's' : ''} ativa${reservas.length > 1 ? 's' : ''}</div>
        </div>`;
    }
  },

  _atualizarUltimosLancamentos(mes, ano) {
    const el = document.getElementById('dash-tx-list');
    if (!el) return;
    const lancamentos = FaciliteStorage.getLancamentosMes(mes, ano);
    lancamentos.sort((a, b) => new Date(b.data) - new Date(a.data));
    const recentes = lancamentos.slice(0, 6);

    const icones = {
      'Alimentação': '🛒', 'Transporte': '⛽', 'Moradia': '🏠',
      'Saúde': '💊', 'Lazer': '🎮', 'Educação': '📚',
      'Assinaturas': '📱', 'Salário': '💼', 'Renda Extra': '💵',
      'Receita': '💰', 'Outros': '📦',
    };

    const hoje = new Date().toISOString().split('T')[0];
    const ontem = new Date(Date.now() - 86400000).toISOString().split('T')[0];

    if (recentes.length === 0) {
      el.innerHTML = '<li style="padding:24px;text-align:center;color:#4B5563;font-size:13px">Nenhum lançamento este mês</li>';
      return;
    }

    el.innerHTML = recentes.map(l => {
      const icone = icones[l.categoria] || '📦';
      const corIcon = l.valor < 0 ? 'rgba(239,68,68,0.1)' : 'rgba(34,197,94,0.1)';
      const corVal = l.valor < 0 ? 'neg' : 'pos';
      const sinal = l.valor < 0 ? '-' : '+';
      let dataLabel;
      if (l.data === hoje) dataLabel = 'Hoje';
      else if (l.data === ontem) dataLabel = 'Ontem';
      else dataLabel = new Date(l.data + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });

      return `<li class="tx-item">
        <div class="tx-icon" style="background:${corIcon}">${icone}</div>
        <div class="tx-info">
          <span class="tx-name">${escapeHTML(l.descricao)}</span>
          <span class="tx-meta">${dataLabel} · ${l.categoria}</span>
        </div>
        <span class="tx-val ${corVal}">${sinal}${fmtBRL(Math.abs(l.valor))}</span>
      </li>`;
    }).join('');
  },

  // Manter window.FACILITE_DATA sincronizado para o chatbot
  _syncFaciliteData(totais, saldoTotal) {
    if (!window.FACILITE_DATA) window.FACILITE_DATA = {};
    const d = window.FACILITE_DATA;
    d.saldoTotal       = saldoTotal;
    d.receitaMensal    = totais.receita;
    d.despesaMensal    = totais.despesas;
    d.gastosFixos      = totais.fixos;
    d.gastosVariaveis  = totais.variaveis;
    d.contas           = FaciliteStorage.get('contas');
    d.cartoes          = FaciliteStorage.get('cartoes');
    d.lancamentos      = FaciliteStorage.get('lancamentos');
    d.assinaturas      = FaciliteStorage.get('assinaturas');
  },
};

document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => ChartsUpdate.init(), 200);

  // Verificar notificações de fatura a cada 4 horas
  setInterval(() => ChartsUpdate._verificarNotificacoesFatura(), 4 * 60 * 60 * 1000);
});

window.ChartsUpdate = ChartsUpdate;
