// ═══════════════════════════════════════════════════════════
//  FACILITE — CHATBOT DATA BRIDGE
//  Conecta os dados do dashboard ao chatbot
// ═══════════════════════════════════════════════════════════

// Dados em memória — sincronizados com o dashboard
// Em produção, estes viriam de um banco de dados ou localStorage
window.FACILITE_DATA = {
  saldoTotal:    14945.61,
  receitaMensal: 13883.00,
  despesaMensal: 10520.00,
  gastosFixos:    6200.00,
  gastosVariaveis:4320.00,

  contas: [
    { nome: 'Conta Santander',       saldo: 1486.45,  tipo: 'conectada' },
    { nome: 'Conta Caixa Econômica', saldo: 5468.99,  tipo: 'manual'    },
    { nome: 'Conta Inter',           saldo: 3645.00,  tipo: 'manual'    },
    { nome: 'Conta Nubank',          saldo: 4345.17,  tipo: 'conectada' },
  ],

  cartoes: [
    {
      nome: 'Inter',
      limiteTotal: 5000.00,
      limiteDisponivel: 5000.00,
      faturaAtual: 0.00,
      vencimento: '2026-05-01',
    },
    {
      nome: 'Nubank',
      limiteTotal: 12763.71,
      limiteDisponivel: 10156.56,
      faturaAtual: -2607.15,
      vencimento: '2026-05-11',
    },
  ],

  lancamentos: [
    { descricao: 'Supermercado Extra', valor: -187.40,  categoria: 'Alimentação', data: '2026-03-24' },
    { descricao: 'Posto Shell',        valor: -210.00,  categoria: 'Transporte',  data: '2026-03-23' },
    { descricao: 'Salário',            valor: 6500.00,  categoria: 'Receita',     data: '2026-03-01' },
    { descricao: 'iFood',              valor: -64.90,   categoria: 'Alimentação', data: '2026-03-20' },
    { descricao: 'Aluguel',            valor: -1800.00, categoria: 'Moradia',     data: '2026-03-05' },
    { descricao: 'Farmácia',           valor: -89.50,   categoria: 'Saúde',       data: '2026-03-18' },
  ],

  assinaturas: [
    { nome: 'Netflix',    valor: 44.90,  venceDia: 5  },
    { nome: 'Spotify',    valor: 21.90,  venceDia: 10 },
    { nome: 'Google One', valor: 34.99,  venceDia: 15 },
    { nome: 'Academia',   valor: 89.90,  venceDia: 1  },
  ],
};

// ── Funções de acesso ──────────────────────────────────────

function getSaldoTotal()          { return window.FACILITE_DATA.saldoTotal; }
function getReceitaMensal()       { return window.FACILITE_DATA.receitaMensal; }
function getDespesaMensal()       { return window.FACILITE_DATA.despesaMensal; }
function getSaldoDisponivel()     {
  const r = getReceitaMensal();
  const f = window.FACILITE_DATA.gastosFixos;
  const v = window.FACILITE_DATA.gastosVariaveis;
  return r - f - v;
}
function getPercentualComprometido() {
  const r = getReceitaMensal();
  if (!r) return 0;
  return Math.round((getDespesaMensal() / r) * 100);
}
function getContas()         { return window.FACILITE_DATA.contas; }
function getCartoes()        { return window.FACILITE_DATA.cartoes; }
function getLancamentos()    { return window.FACILITE_DATA.lancamentos; }
function getAssinaturas()    { return window.FACILITE_DATA.assinaturas; }
function getGastosFixos()    { return window.FACILITE_DATA.gastosFixos; }
function getGastosVariaveis(){ return window.FACILITE_DATA.gastosVariaveis; }

function getFaturas() {
  return getCartoes().map(c => {
    const venc = c.vencimento ? new Date(c.vencimento) : null;
    const diasParaVencer = venc
      ? Math.ceil((venc - new Date()) / 86400000)
      : null;
    return {
      cartao: c.nome,
      valor: Math.abs(c.faturaAtual || 0),
      vencimento: c.vencimento,
      diasParaVencer,
      percentualUsado: c.limiteTotal
        ? Math.round(((c.limiteTotal - c.limiteDisponivel) / c.limiteTotal) * 100)
        : 0,
    };
  });
}

function getGastosPorCategoria() {
  const totais = {};
  getLancamentos().forEach(l => {
    if (l.valor >= 0) return; // ignora receitas
    const cat = l.categoria || 'Outros';
    totais[cat] = (totais[cat] || 0) + Math.abs(l.valor);
  });
  return totais;
}

function getMaiorGasto() {
  const lancamentos = getLancamentos().filter(l => l.valor < 0);
  if (!lancamentos.length) return null;
  return lancamentos.reduce((prev, curr) =>
    Math.abs(curr.valor) > Math.abs(prev.valor) ? curr : prev
  );
}

// ── Função principal de dados ──────────────────────────────
function getFinancialData() {
  const gastosPorCategoria = getGastosPorCategoria();
  const maiorGasto = getMaiorGasto();

  return {
    saldoTotal:            getSaldoTotal(),
    receitaMensal:         getReceitaMensal(),
    despesaMensal:         getDespesaMensal(),
    saldoDisponivel:       getSaldoDisponivel(),
    percentualComprometido:getPercentualComprometido(),
    contas:                getContas(),
    cartoes:               getCartoes(),
    lancamentos:           getLancamentos(),
    assinaturas:           getAssinaturas(),
    gastos: {
      fixos:     getGastosFixos(),
      variaveis: getGastosVariaveis(),
    },
    faturas:            getFaturas(),
    gastosPorCategoria,
    maiorGasto,
    dataAtual: new Date().toLocaleDateString('pt-BR'),
  };
}

// ── Registrar lançamento (chamado pelo chatbot) ────────────
function registrarLancamento(lancamento) {
  // Se FaciliteStorage está disponível, usar ele (sistema novo)
  if (window.FaciliteStorage) {
    const novoLanc = FaciliteStorage.addLancamento({
      descricao: lancamento.descricao || 'Lançamento',
      valor: lancamento.valor,
      categoria: lancamento.categoria || 'Outros',
    });
    // Sincronizar FACILITE_DATA
    if (window.ChartsUpdate) ChartsUpdate.atualizarCards();
    FaciliteState.refresh();
    console.log('Lançamento registrado (storage):', novoLanc);
    return novoLanc;
  }

  // Fallback: sistema antigo
  const novoLancamento = {
    descricao: lancamento.descricao || 'Lançamento',
    valor:     lancamento.valor,
    categoria: lancamento.categoria || 'Outros',
    data:      new Date().toISOString().split('T')[0],
  };

  window.FACILITE_DATA.lancamentos.unshift(novoLancamento);

  if (novoLancamento.valor < 0) {
    window.FACILITE_DATA.despesaMensal += Math.abs(novoLancamento.valor);
    window.FACILITE_DATA.gastosVariaveis += Math.abs(novoLancamento.valor);
  } else {
    window.FACILITE_DATA.receitaMensal += novoLancamento.valor;
  }

  window.FACILITE_DATA.saldoTotal += novoLancamento.valor;

  if (typeof window.atualizarCards === 'function') window.atualizarCards();

  console.log('Lançamento registrado:', novoLancamento);
  return novoLancamento;
}
