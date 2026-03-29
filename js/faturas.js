// ═══════════════════════════════════════════════════
//  FACILITE — SISTEMA DE FATURAS
//  Motor de cálculo de fatura por ciclo de fechamento
//  + modal de visualização + histórico mensal
// ═══════════════════════════════════════════════════

const FaturasEngine = {

  // ── Calcular período da fatura ─────────────────────
  // O ciclo de fatura vai do dia de fechamento do mês anterior
  // até o dia de fechamento do mês atual.
  // Ex: fechamento dia 5 → ciclo de 06/fev a 05/mar, vence dia 11/mar
  getPeriodoAtual(cartao) {
    const hoje = new Date();
    const diaFecha = (cartao.vencimentoFatura || 1) - 10; // fechamento ~10 dias antes do vencimento
    const diaVenc  = cartao.vencimentoFatura || 1;

    // Calcular fechamento: se já passou o dia de fechamento este mês,
    // a fatura atual é a do próximo vencimento
    let fechaAno = hoje.getFullYear();
    let fechaMes = hoje.getMonth(); // 0-indexed

    // Data de fechamento deste mês
    let diaFechaReal = Math.max(1, diaFecha);
    let fechamento = new Date(fechaAno, fechaMes, diaFechaReal);

    let vencimento, inicioPerido, fimPeriodo, status;

    if (hoje.getDate() > diaFechaReal) {
      // Já passou o fechamento — fatura atual já fechou, próxima está aberta
      // Fatura FECHADA: do fechamento do mês passado até o fechamento deste mês
      // Fatura ABERTA: do fechamento deste mês até agora
      inicioPerido = new Date(fechaAno, fechaMes, diaFechaReal + 1);
      fimPeriodo = new Date(fechaAno, fechaMes + 1, diaFechaReal);
      vencimento = new Date(fechaAno, fechaMes + 1, diaVenc);
      status = 'aberta';
    } else {
      // Ainda não fechou — fatura atual está aberta
      inicioPerido = new Date(fechaAno, fechaMes - 1, diaFechaReal + 1);
      fimPeriodo = new Date(fechaAno, fechaMes, diaFechaReal);
      vencimento = new Date(fechaAno, fechaMes, diaVenc);
      status = 'aberta';
    }

    return { inicioPerido, fimPeriodo, vencimento, status, diaFecha: diaFechaReal, diaVenc };
  },

  // Período da fatura fechada (mês anterior)
  getPeriodoFechado(cartao) {
    const atual = this.getPeriodoAtual(cartao);
    const inicioPerido = new Date(atual.inicioPerido);
    inicioPerido.setMonth(inicioPerido.getMonth() - 1);
    const fimPeriodo = new Date(atual.inicioPerido);
    fimPeriodo.setDate(fimPeriodo.getDate() - 1);
    const vencimento = new Date(atual.vencimento);
    vencimento.setMonth(vencimento.getMonth() - 1);
    return { inicioPerido, fimPeriodo, vencimento, status: 'fechada' };
  },

  // ── Obter transações de um período ─────────────────
  getTransacoesPeriodo(cartaoId, inicio, fim) {
    const todos = FaciliteStorage.get('lancamentos') || [];
    return todos.filter(l => {
      if (l.cartaoId !== cartaoId) return false;
      const dt = new Date(l.data + 'T12:00:00');
      return dt >= inicio && dt <= fim;
    }).sort((a, b) => new Date(b.data) - new Date(a.data));
  },

  // ── Calcular fatura completa de um cartão ──────────
  calcularFatura(cartaoId, periodo) {
    const cartoes = FaciliteStorage.get('cartoes') || [];
    const cartao = cartoes.find(c => c.id === cartaoId);
    if (!cartao) return null;

    const p = periodo || this.getPeriodoAtual(cartao);
    const transacoes = this.getTransacoesPeriodo(cartaoId, p.inicioPerido, p.fimPeriodo);

    const totalFatura = transacoes.reduce((s, l) => s + Math.abs(l.valor), 0);
    const pendentes = transacoes.filter(t => t.status === 'pendente');
    const confirmadas = transacoes.filter(t => t.status !== 'pendente');
    const parcelamentos = transacoes.filter(t => t.descricao && t.descricao.includes('/'));

    // Agrupar por categoria
    const porCategoria = {};
    transacoes.forEach(t => {
      const cat = t.categoria || 'Outros';
      porCategoria[cat] = (porCategoria[cat] || 0) + Math.abs(t.valor);
    });

    const receita = FaciliteStorage.getTotaisMes(
      p.vencimento.getMonth() + 1,
      p.vencimento.getFullYear()
    ).receita || FaciliteStorage.get('receita')?.mensal || 0;

    const pctRenda = receita > 0 ? Math.round((totalFatura / receita) * 100) : 0;
    const pctLimite = cartao.limiteTotal > 0 ? Math.round(((cartao.limiteTotal - cartao.limiteDisponivel) / cartao.limiteTotal) * 100) : 0;

    return {
      cartao,
      periodo: p,
      transacoes,
      pendentes,
      confirmadas,
      parcelamentos,
      totalFatura,
      porCategoria,
      pctRenda,
      pctLimite,
      receita,
    };
  },

  // ── Obter histórico de faturas (últimos 6 meses) ───
  getHistorico(cartaoId) {
    const cartoes = FaciliteStorage.get('cartoes') || [];
    const cartao = cartoes.find(c => c.id === cartaoId);
    if (!cartao) return [];

    const meses = [];
    const diaFecha = Math.max(1, (cartao.vencimentoFatura || 1) - 10);
    const diaVenc = cartao.vencimentoFatura || 1;
    const hoje = new Date();

    for (let i = 0; i < 6; i++) {
      const fim = new Date(hoje.getFullYear(), hoje.getMonth() - i, diaFecha);
      const inicio = new Date(hoje.getFullYear(), hoje.getMonth() - i - 1, diaFecha + 1);
      const venc = new Date(hoje.getFullYear(), hoje.getMonth() - i, diaVenc);
      const transacoes = this.getTransacoesPeriodo(cartaoId, inicio, fim);
      const total = transacoes.reduce((s, l) => s + Math.abs(l.valor), 0);

      const mesesNome = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
      meses.push({
        label: mesesNome[venc.getMonth()] + '/' + venc.getFullYear(),
        total,
        transacoes: transacoes.length,
        vencimento: venc,
        inicio,
        fim,
        status: i === 0 ? 'aberta' : (total > 0 ? 'fechada' : 'sem fatura'),
      });
    }
    return meses;
  },

  // ══════════════════════════════════════════════════
  //  MODAL DE FATURA (chamável de qualquer lugar)
  // ══════════════════════════════════════════════════

  abrirFatura(cartaoId, periodoCustom) {
    const fatura = this.calcularFatura(cartaoId, periodoCustom);
    if (!fatura) {
      FaciliteNotify.warning('Cartão não encontrado.');
      return;
    }

    const { cartao, periodo, transacoes, pendentes, totalFatura, porCategoria, pctRenda, pctLimite, receita } = fatura;
    const historico = this.getHistorico(cartaoId);

    const corBarra = pctLimite >= 80 ? '#EF4444' : pctLimite >= 50 ? '#F59E0B' : '#22C55E';
    const BANDEIRAS = { visa: 'VISA', mastercard: 'MASTERCARD', elo: 'ELO', amex: 'AMEX' };

    const alertaRenda = pctRenda > 30
      ? `<div style="background:rgba(245,158,11,0.06);border:1px solid rgba(245,158,11,0.15);border-radius:10px;padding:12px 14px;margin-bottom:16px;font-size:13px;color:#F59E0B;display:flex;align-items:center;gap:8px">
          <span style="font-size:18px">⚠️</span>
          <span>Este cartão compromete <strong>${pctRenda}%</strong> da sua renda mensal (${fmtBRL(receita)}).</span>
        </div>`
      : '';

    // Transações agrupadas por data
    const grupos = {};
    transacoes.forEach(t => {
      const key = t.data;
      if (!grupos[key]) grupos[key] = [];
      grupos[key].push(t);
    });

    const ICONES = { 'Alimentação': '🍔', 'Transporte': '🚗', 'Moradia': '🏠', 'Saúde': '💊', 'Lazer': '🎮', 'Educação': '📚', 'Assinaturas': '📱', 'Outros': '📦' };

    let transacoesHTML = '';
    if (transacoes.length === 0) {
      transacoesHTML = '<div style="padding:24px;text-align:center;color:#374151;font-size:13px">Nenhuma transação neste período</div>';
    } else {
      for (const [data, items] of Object.entries(grupos)) {
        const dtFmt = new Date(data + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
        transacoesHTML += `<div style="padding:8px 0 4px;font-size:11px;color:#374151;font-weight:600;text-transform:uppercase;letter-spacing:0.5px">${dtFmt}</div>`;
        items.forEach(t => {
          const isPendente = t.status === 'pendente';
          transacoesHTML += `
            <div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.02)">
              <span style="font-size:14px">${ICONES[t.categoria] || '📦'}</span>
              <div style="flex:1;min-width:0">
                <div style="font-size:13px;color:#D1D5DB;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">
                  ${escapeHTML(t.descricao)}${isPendente ? ' <span style="color:#F59E0B;font-size:10px">⏳ pendente</span>' : ''}
                </div>
                <div style="font-size:11px;color:#374151">${t.categoria}</div>
              </div>
              <span style="color:#EF4444;font-weight:700;font-size:13px;font-family:'Sora',sans-serif;white-space:nowrap">-${fmtBRL(Math.abs(t.valor))}</span>
            </div>`;
        });
      }
    }

    // Categorias breakdown
    const catEntries = Object.entries(porCategoria).sort(([, a], [, b]) => b - a);
    const categoriasHTML = catEntries.length > 0 ? catEntries.map(([cat, val]) => {
      const pct = totalFatura > 0 ? Math.round((val / totalFatura) * 100) : 0;
      return `
        <div style="display:flex;align-items:center;gap:8px;font-size:12px;padding:4px 0">
          <span>${ICONES[cat] || '📦'}</span>
          <span style="color:#9CA3AF;flex:1">${cat}</span>
          <span style="color:#D1D5DB;font-weight:600">${fmtBRL(val)}</span>
          <span style="color:#4B5563;width:32px;text-align:right">${pct}%</span>
        </div>`;
    }).join('') : '<div style="font-size:12px;color:#374151;padding:4px 0">Sem gastos</div>';

    // Histórico mini
    const historicoHTML = historico.slice(0, 4).map((h, i) => {
      const isAtual = i === 0;
      return `
        <button type="button" onclick="FaturasEngine.abrirFatura('${cartaoId}',{inicioPerido:new Date('${h.inicio.toISOString()}'),fimPeriodo:new Date('${h.fim.toISOString()}'),vencimento:new Date('${h.vencimento.toISOString()}'),status:'${h.status}'})"
          style="flex:1;min-width:60px;padding:10px 6px;background:${isAtual ? 'rgba(34,197,94,0.08)' : 'rgba(255,255,255,0.02)'};border:1px solid ${isAtual ? 'rgba(34,197,94,0.2)' : 'rgba(255,255,255,0.04)'};border-radius:10px;cursor:pointer;text-align:center;font-family:'DM Sans',sans-serif;transition:all 0.12s"
          onmouseover="this.style.borderColor='rgba(34,197,94,0.3)'"
          onmouseout="this.style.borderColor='${isAtual ? 'rgba(34,197,94,0.2)' : 'rgba(255,255,255,0.04)'}'"
        >
          <div style="font-size:11px;color:${isAtual ? '#22C55E' : '#6B7280'};font-weight:600">${h.label}</div>
          <div style="font-size:14px;color:${h.total > 0 ? '#F0FDF4' : '#374151'};font-weight:700;margin-top:2px">${h.total > 0 ? fmtBRL(h.total) : '—'}</div>
          <div style="font-size:10px;color:#374151;margin-top:1px">${h.status === 'aberta' ? '🟢 aberta' : h.transacoes + ' lanç.'}</div>
        </button>`;
    }).join('');

    // Formatar datas do período
    const inicioFmt = periodo.inicioPerido.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    const fimFmt = periodo.fimPeriodo.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    const vencFmt = periodo.vencimento.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });

    // Criar/atualizar modal
    let modal = document.getElementById('modal-fatura-engine');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'modal-fatura-engine';
      modal.className = 'modal-overlay';
      document.body.appendChild(modal);
    }

    modal.innerHTML = `
      <div class="modal-box" style="width:480px;padding:0;max-height:90vh;display:flex;flex-direction:column">

        <!-- Header com visual do cartão -->
        <div style="background:linear-gradient(145deg,${cartao.cor || '#820AD1'},${cartao.cor || '#820AD1'}99);padding:22px 24px;border-radius:16px 16px 0 0;position:relative">
          <button type="button" onclick="document.getElementById('modal-fatura-engine').style.display='none'" style="position:absolute;top:14px;right:14px;background:rgba(0,0,0,0.3);border:none;color:#fff;cursor:pointer;font-size:16px;padding:4px 8px;border-radius:8px;backdrop-filter:blur(4px)">✕</button>
          <div style="display:flex;align-items:center;gap:14px">
            <div>
              <div style="font-size:18px;font-weight:700;color:#fff;font-family:'Sora',sans-serif">${escapeHTML(cartao.nome)}</div>
              <div style="font-size:12px;color:rgba(255,255,255,0.6);margin-top:2px">•••• ${cartao.numeroFinal || '0000'} · ${BANDEIRAS[cartao.bandeira] || ''}</div>
            </div>
          </div>
          <div style="display:flex;gap:16px;margin-top:16px">
            <div>
              <div style="font-size:10px;color:rgba(255,255,255,0.45);text-transform:uppercase;letter-spacing:0.5px">Fatura atual</div>
              <div style="font-size:22px;font-weight:700;color:#fff;font-family:'Sora',sans-serif">${fmtBRL(totalFatura)}</div>
            </div>
            <div style="margin-left:auto;text-align:right">
              <div style="font-size:10px;color:rgba(255,255,255,0.45);text-transform:uppercase;letter-spacing:0.5px">Vencimento</div>
              <div style="font-size:16px;font-weight:600;color:#fff">${vencFmt}</div>
            </div>
          </div>
          <div style="font-size:11px;color:rgba(255,255,255,0.4);margin-top:8px">Período: ${inicioFmt} a ${fimFmt} · ${periodo.status === 'aberta' ? '🟢 Aberta' : '🔒 Fechada'}</div>
        </div>

        <!-- Conteúdo scrollável -->
        <div style="padding:20px 24px;overflow-y:auto;flex:1">

          ${alertaRenda}

          <!-- Limites -->
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px">
            <div style="background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.04);border-radius:10px;padding:12px">
              <div style="font-size:10px;color:#4B5563;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:3px">Limite disponível</div>
              <div style="font-size:18px;font-weight:700;color:#22C55E;font-family:'Sora',sans-serif">${fmtBRL(cartao.limiteDisponivel)}</div>
            </div>
            <div style="background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.04);border-radius:10px;padding:12px">
              <div style="font-size:10px;color:#4B5563;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:3px">Limite total</div>
              <div style="font-size:18px;font-weight:700;color:#D1D5DB;font-family:'Sora',sans-serif">${fmtBRL(cartao.limiteTotal)}</div>
            </div>
          </div>

          <!-- Barra de uso -->
          <div style="margin-bottom:20px">
            <div style="display:flex;justify-content:space-between;font-size:11px;margin-bottom:5px">
              <span style="color:#EF4444;font-weight:600">${pctLimite}% usado</span>
              <span style="color:#22C55E;font-weight:600">${Math.max(0, 100 - pctLimite)}% disponível</span>
            </div>
            <div style="height:8px;background:rgba(255,255,255,0.03);border-radius:4px;overflow:hidden">
              <div style="height:100%;width:${Math.min(pctLimite, 100)}%;background:${corBarra};border-radius:4px;transition:width 0.5s"></div>
            </div>
          </div>

          ${pendentes.length > 0 ? `
          <div style="background:rgba(245,158,11,0.05);border:1px solid rgba(245,158,11,0.1);border-radius:10px;padding:10px 14px;margin-bottom:16px;font-size:12px;color:#F59E0B">
            ⏳ ${pendentes.length} transaç${pendentes.length > 1 ? 'ões' : 'ão'} pendente${pendentes.length > 1 ? 's' : ''} (valor pode mudar)
          </div>` : ''}

          <!-- Histórico de meses -->
          <div style="font-size:12px;color:#6B7280;font-weight:600;margin-bottom:8px;text-transform:uppercase;letter-spacing:0.5px">Histórico</div>
          <div style="display:flex;gap:6px;margin-bottom:20px;overflow-x:auto;padding-bottom:4px">${historicoHTML}</div>

          <!-- Categorias -->
          <div style="font-size:12px;color:#6B7280;font-weight:600;margin-bottom:8px;text-transform:uppercase;letter-spacing:0.5px">Por categoria</div>
          <div style="margin-bottom:20px;background:rgba(255,255,255,0.015);border-radius:10px;padding:10px 14px">${categoriasHTML}</div>

          <!-- Transações -->
          <div style="font-size:12px;color:#6B7280;font-weight:600;margin-bottom:8px;text-transform:uppercase;letter-spacing:0.5px">Transações (${transacoes.length})</div>
          <div>${transacoesHTML}</div>
        </div>
      </div>
    `;

    modal.style.display = 'flex';
    modal.onclick = e => { if (e.target === modal) modal.style.display = 'none'; };
  },
};

window.FaturasEngine = FaturasEngine;

// ── Substituir o _verFatura do ChartsUpdate ──────────
// Agora abre direto sem precisar navegar para cartões
if (window.ChartsUpdate) {
  ChartsUpdate._verFatura = function(cartaoId) {
    FaturasEngine.abrirFatura(cartaoId);
  };
}

// ── Substituir o _mostrarFatura do CartoesPage ───────
// Para funcionar tanto do dashboard quanto da aba cartões
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    if (window.CartoesPage) {
      CartoesPage._mostrarFatura = function(cartaoId) {
        FaturasEngine.abrirFatura(cartaoId);
      };
    }
  }, 500);
});
