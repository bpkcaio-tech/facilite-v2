// ═══════════════════════════════════════════════════
//  FACILITE — RELATÓRIOS
//  Visualização do mês atual + relatórios anteriores
// ═══════════════════════════════════════════════════

const RelatoriosPage = {
  mes: new Date().getMonth() + 1,
  ano: new Date().getFullYear(),

  cores: {
    'Alimentação': '#F59E0B', 'Transporte': '#3B82F6', 'Moradia': '#8B5CF6',
    'Saúde': '#EF4444', 'Lazer': '#EC4899', 'Educação': '#06B6D4',
    'Assinaturas': '#22C55E', 'Receita': '#22C55E', 'Outros': '#6B7280',
  },

  MESES: ['', 'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'],

  init() {
    this.mes = FaciliteState.mesAtual;
    this.ano = FaciliteState.anoAtual;
    this.render();
  },

  // ── Navegação entre meses ────────────────────────
  mesAnterior() {
    this.mes--;
    if (this.mes < 1) { this.mes = 12; this.ano--; }
    this.render();
  },

  mesProximo() {
    const hoje = new Date();
    const mesAtual = hoje.getMonth() + 1;
    const anoAtual = hoje.getFullYear();
    // Não avançar além do mês atual
    if (this.ano > anoAtual || (this.ano === anoAtual && this.mes >= mesAtual)) return;
    this.mes++;
    if (this.mes > 12) { this.mes = 1; this.ano++; }
    this.render();
  },

  irParaMes(mes, ano) {
    this.mes = mes;
    this.ano = ano;
    this.render();
  },

  render() {
    const mes = this.mes;
    const ano = this.ano;
    const hoje = new Date();
    const mesAtual = hoje.getMonth() + 1;
    const anoAtual = hoje.getFullYear();
    const ehMesAtual = (mes === mesAtual && ano === anoAtual);

    // Label do mês
    const elLabel = document.getElementById('rel-mes-label');
    if (elLabel) elLabel.textContent = this.MESES[mes] + ' ' + ano;

    // Badge: mês atual ou relatório salvo
    const elBadge = document.getElementById('rel-badge-tipo');
    if (elBadge) {
      if (ehMesAtual) {
        elBadge.textContent = 'Mês atual';
        elBadge.style.background = 'rgba(34,197,94,0.12)';
        elBadge.style.color = '#22C55E';
      } else {
        const temRelatorio = FaciliteStorage.getRelatorioMes(mes, ano);
        elBadge.textContent = temRelatorio ? 'Relatório salvo' : 'Sem dados';
        elBadge.style.background = temRelatorio ? 'rgba(59,130,246,0.12)' : 'rgba(107,114,128,0.12)';
        elBadge.style.color = temRelatorio ? '#3B82F6' : '#6B7280';
      }
    }

    // Dados: mês atual = ao vivo, meses anteriores = relatório salvo ou dados reais
    let totais, gastosCat, lancamentos;

    if (ehMesAtual) {
      totais = FaciliteStorage.getTotaisMes(mes, ano);
      gastosCat = FaciliteStorage.getGastosPorCategoria(mes, ano);
      lancamentos = FaciliteStorage.getLancamentosMes(mes, ano);
    } else {
      const relatorio = FaciliteStorage.getRelatorioMes(mes, ano);
      if (relatorio) {
        totais = relatorio.totais;
        gastosCat = relatorio.gastosPorCategoria;
        lancamentos = relatorio.lancamentos || [];
      } else {
        // Tentar dados reais (lançamentos ainda no storage)
        totais = FaciliteStorage.getTotaisMes(mes, ano);
        gastosCat = FaciliteStorage.getGastosPorCategoria(mes, ano);
        lancamentos = FaciliteStorage.getLancamentosMes(mes, ano);
      }
    }

    // Cards resumo
    const elRec = document.getElementById('rel-receita');
    const elDes = document.getElementById('rel-despesa');
    const elSal = document.getElementById('rel-saldo');
    const elEco = document.getElementById('rel-economia');
    if (elRec) elRec.textContent = fmtBRL(totais.receita);
    if (elDes) elDes.textContent = fmtBRL(totais.despesas);
    if (elSal) {
      elSal.textContent = fmtBRL(totais.saldo);
      elSal.style.color = totais.saldo >= 0 ? '#22C55E' : '#EF4444';
    }
    if (elEco) {
      const pctEco = totais.receita > 0 ? Math.round(((totais.receita - totais.despesas) / totais.receita) * 100) : 0;
      elEco.textContent = pctEco + '%';
      elEco.style.color = pctEco >= 20 ? '#22C55E' : pctEco >= 0 ? '#F59E0B' : '#EF4444';
    }

    this._renderCategorias(gastosCat, totais.despesas);
    this._renderTopGastos(lancamentos);
    this._renderFixoVar(totais);
    this._renderInsights(totais, gastosCat, lancamentos);
    this._renderRelatoriosSalvos();
  },

  _renderCategorias(gastos, totalDesp) {
    const el = document.getElementById('rel-categorias');
    if (!el) return;
    const entries = Object.entries(gastos).sort(([, a], [, b]) => b - a);
    if (entries.length === 0) {
      el.innerHTML = '<p style="color:#6B7280;font-size:13px">Nenhum gasto registrado neste mês.</p>';
      return;
    }
    el.innerHTML = entries.map(([cat, val]) => {
      const pct = totalDesp > 0 ? Math.round((val / totalDesp) * 100) : 0;
      const cor = this.cores[cat] || '#6B7280';
      return `
        <div class="rel-bar-wrap">
          <div class="rel-bar-header">
            <span class="rel-bar-label">${cat}</span>
            <span class="rel-bar-value">${fmtBRL(val)} (${pct}%)</span>
          </div>
          <div class="rel-bar-track">
            <div class="rel-bar-fill" style="width:${pct}%;background:${cor}"></div>
          </div>
        </div>`;
    }).join('');
  },

  _renderTopGastos(lancamentos) {
    const el = document.getElementById('rel-top-gastos');
    if (!el) return;
    const despesas = lancamentos.filter(l => l.valor < 0).sort((a, b) => a.valor - b.valor).slice(0, 5);
    if (despesas.length === 0) {
      el.innerHTML = '<p style="color:#6B7280;font-size:13px">Nenhum gasto registrado.</p>';
      return;
    }
    el.innerHTML = despesas.map((l, i) => `
      <div style="display:flex;align-items:center;gap:12px;padding:10px 0;${i < despesas.length - 1 ? 'border-bottom:1px solid rgba(255,255,255,0.03)' : ''}">
        <span style="font-size:13px;color:#6B7280;width:20px">${i + 1}.</span>
        <div style="flex:1;min-width:0">
          <div style="font-size:13px;color:#F0FDF4;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escapeHTML(l.descricao)}</div>
          <div style="font-size:11px;color:#6B7280">${l.categoria || ''}</div>
        </div>
        <span style="color:#EF4444;font-weight:700;font-size:13px;font-family:'Sora',sans-serif">-${fmtBRL(Math.abs(l.valor))}</span>
      </div>
    `).join('');
  },

  _renderFixoVar(totais) {
    const el = document.getElementById('rel-fixo-var');
    if (!el) return;
    const totalDesp = totais.fixos + totais.variaveis;
    const pctFixo = totalDesp > 0 ? Math.round((totais.fixos / totalDesp) * 100) : 0;
    const pctVar = 100 - pctFixo;

    el.innerHTML = `
      <div style="flex:1;min-width:200px">
        <div style="display:flex;height:12px;border-radius:6px;overflow:hidden;background:rgba(255,255,255,0.04)">
          <div style="width:${pctFixo}%;background:#8B5CF6;transition:width 0.6s"></div>
          <div style="width:${pctVar}%;background:#F59E0B;transition:width 0.6s"></div>
        </div>
        <div style="display:flex;justify-content:space-between;margin-top:10px">
          <div style="display:flex;align-items:center;gap:6px">
            <div style="width:10px;height:10px;border-radius:3px;background:#8B5CF6"></div>
            <span style="font-size:12px;color:#D1D5DB">Fixos: ${fmtBRL(totais.fixos)} (${pctFixo}%)</span>
          </div>
          <div style="display:flex;align-items:center;gap:6px">
            <div style="width:10px;height:10px;border-radius:3px;background:#F59E0B"></div>
            <span style="font-size:12px;color:#D1D5DB">Variáveis: ${fmtBRL(totais.variaveis)} (${pctVar}%)</span>
          </div>
        </div>
      </div>`;
  },

  _renderInsights(totais, gastosCat, lancamentos) {
    const el = document.getElementById('rel-insights');
    if (!el) return;
    const insights = [];

    if (totais.pct >= 90) {
      insights.push('Atenção! ' + totais.pct + '% da renda comprometida. Reduza gastos variáveis.');
    } else if (totais.pct >= 75) {
      insights.push('Cuidado: <strong>' + totais.pct + '%</strong> da renda comprometida.');
    } else if (totais.pct < 50 && totais.receita > 0) {
      insights.push('Parabéns! Apenas <strong>' + totais.pct + '%</strong> da renda comprometida.');
    }

    const catEntries = Object.entries(gastosCat).sort(([, a], [, b]) => b - a);
    if (catEntries.length > 0) {
      const [maiorCat, maiorVal] = catEntries[0];
      const pctCat = totais.despesas > 0 ? Math.round((maiorVal / totais.despesas) * 100) : 0;
      insights.push('Maior gasto: <strong>' + maiorCat + '</strong> com ' + fmtBRL(maiorVal) + ' (' + pctCat + '%).');
    }

    if (totais.variaveis > totais.fixos && totais.fixos > 0) {
      insights.push('Gastos variáveis (' + fmtBRL(totais.variaveis) + ') superam os fixos (' + fmtBRL(totais.fixos) + ').');
    }

    if (insights.length === 0) {
      insights.push('Adicione lançamentos para ver insights do mês.');
    }

    el.innerHTML = insights.map(i => `<div class="rel-insight">${i}</div>`).join('');
  },

  // ── Relatórios anteriores salvos ───────────────────
  _renderRelatoriosSalvos() {
    const el = document.getElementById('rel-salvos');
    if (!el) return;

    const relatorios = FaciliteStorage.getRelatorios();

    if (relatorios.length === 0) {
      el.innerHTML = '<p style="color:#6B7280;font-size:13px">Nenhum relatório salvo ainda. Os relatórios são gerados automaticamente quando o mês vira.</p>';
      return;
    }

    // Ordenar do mais recente ao mais antigo
    const sorted = [...relatorios].sort((a, b) => {
      if (a.ano !== b.ano) return b.ano - a.ano;
      return b.mes - a.mes;
    });

    el.innerHTML = sorted.map(r => {
      const saldoCor = r.totais.saldo >= 0 ? '#22C55E' : '#EF4444';
      const saldoIcon = r.totais.saldo >= 0 ? '+' : '';
      const ativo = r.mes === this.mes && r.ano === this.ano;

      return `
        <div class="rel-mes-card" onclick="RelatoriosPage.irParaMes(${r.mes},${r.ano})" style="${ativo ? 'border-color:rgba(34,197,94,0.3);background:rgba(34,197,94,0.04)' : ''}">
          <div>
            <div style="font-size:14px;font-weight:600;color:#F0FDF4;font-family:'Sora',sans-serif">${this.MESES[r.mes]} ${r.ano}</div>
            <div style="font-size:11px;color:#6B7280;margin-top:2px">
              Receita ${fmtBRL(r.totais.receita)} · Despesa ${fmtBRL(r.totais.despesas)}
            </div>
          </div>
          <div style="text-align:right">
            <div style="font-size:15px;font-weight:700;color:${saldoCor};font-family:'Sora',sans-serif">${saldoIcon}${fmtBRL(r.totais.saldo)}</div>
            <div style="font-size:11px;color:#6B7280">${r.totais.pct}% usado</div>
          </div>
        </div>`;
    }).join('<div style="height:8px"></div>');
  },
};

FaciliteState.on('page-loaded', ({ page }) => {
  if (page === 'relatorios') RelatoriosPage.init();
});

FaciliteState.on('dados-changed', () => {
  if (FaciliteRouter.currentPage === 'relatorios') RelatoriosPage.render();
});

window.RelatoriosPage = RelatoriosPage;
