// ═══════════════════════════════════════════════════
//  FACILITE — STORAGE (base de tudo)
//  Gerenciamento centralizado do localStorage
// ═══════════════════════════════════════════════════

const FaciliteStorage = {
  PREFIX: 'facilite_',

  defaultData: {
    usuario: {
      nome: '',
      email: '',
      foto: null,
      plano: 'gratuito',
    },
    receita: {
      mensal: 0,
      historico: [],
    },
    lancamentos: [],
    contas: [],
    cartoes: [],
    assinaturas: [],
    categorias: {
      'Alimentação': 'variavel',
      'Transporte': 'variavel',
      'Moradia': 'fixo',
      'Saúde': 'variavel',
      'Lazer': 'variavel',
      'Educação': 'fixo',
      'Assinaturas': 'fixo',
      'Receita': 'fixo',
      'Outros': 'variavel',
    },
    reservas: [],
    relatorios: [],
    ultimoMesProcessado: null, // "3-2026" = já processou março 2026
    notificacoes: [],
    preferencias: {
      diaPreferidoPagamento: 5,
      diasAntesNotificacao: 10,
      moeda: 'BRL',
    },
  },

  // ── CRUD genérico ──────────────────────────────────
  get(chave) {
    try {
      const raw = localStorage.getItem(this.PREFIX + chave);
      return raw ? JSON.parse(raw) : structuredClone(this.defaultData[chave]);
    } catch { return structuredClone(this.defaultData[chave]); }
  },

  set(chave, valor) {
    try {
      localStorage.setItem(this.PREFIX + chave, JSON.stringify(valor));
      window.dispatchEvent(new CustomEvent('facilite:update', { detail: { chave, valor } }));
      // Sincronizar com nuvem (fire-and-forget)
      if (window.FaciliteSync && FaciliteSync.ready) {
        FaciliteSync.pushKey(chave, valor).catch(function(e) {
          console.warn('[Storage] sync falhou:', e);
        });
      }
    } catch (e) { console.error('[Storage] Erro:', e); }
  },

  // Atualizar propriedade dentro de um objeto
  update(chave, parcial) {
    const atual = this.get(chave);
    if (typeof atual === 'object' && !Array.isArray(atual)) {
      this.set(chave, { ...atual, ...parcial });
    } else {
      this.set(chave, parcial);
    }
  },

  // ── Lançamentos ────────────────────────────────────
  getLancamentosMes(mes, ano) {
    const todos = this.get('lancamentos') || [];
    return todos.filter(l => l.mes === mes && l.ano === ano);
  },

  addLancamento(dados) {
    const todos = this.get('lancamentos') || [];
    const dt = dados.data ? new Date(dados.data + 'T12:00:00') : new Date();
    const novo = Object.assign({}, dados);
    if (!novo.id) novo.id = this.uid('lanc');
    novo.descricao = novo.descricao || 'Lançamento';
    novo.valor = novo.valor;
    novo.categoria = novo.categoria || 'Outros';
    novo.tipo = novo.tipo || this.defaultData.categorias[novo.categoria] || 'variavel';
    novo.data = novo.data || dt.toISOString().split('T')[0];
    novo.mes = novo.mes || dt.getMonth() + 1;
    novo.ano = novo.ano || dt.getFullYear();
    novo.formaPagamento = novo.formaPagamento || 'debito';
    novo.cartaoId = novo.cartaoId || null;
    novo.status = novo.status || 'pago';
    novo.recorrente = novo.recorrente || false;
    novo.diaVencimento = novo.diaVencimento || null;
    todos.unshift(novo);
    this.set('lancamentos', todos);
    
    // Atualizar saldos das contas
    if (novo.formaPagamento === 'cartao' && novo.cartaoId) {
      const cartoes = this.get('cartoes');
      const c = cartoes.find(x => x.id === novo.cartaoId);
      if (c) {
        c.limiteDisponivel = Math.max(0, c.limiteDisponivel + novo.valor);
        this.set('cartoes', cartoes);
      }
    }

    return novo;
  },

  removeLancamento(id) {
    const todos = this.get('lancamentos') || [];
    this.set('lancamentos', todos.filter(l => l.id !== id));
  },

  editLancamento(id, dados) {
    const todos = this.get('lancamentos') || [];
    const idx = todos.findIndex(l => l.id === id);
    if (idx >= 0) {
      todos[idx] = { ...todos[idx], ...dados };
      this.set('lancamentos', todos);
    }
  },

  // ── Totais do mês ──────────────────────────────────
  getTotaisMes(mes, ano) {
    const lancamentos = this.getLancamentosMes(mes, ano);
    // Receita = soma de TODOS os lançamentos positivos do mês
    const receita  = lancamentos.filter(l => l.valor > 0).reduce((s, l) => s + l.valor, 0);
    const despesas = lancamentos.filter(l => l.valor < 0).reduce((s, l) => s + Math.abs(l.valor), 0);
    const fixos    = lancamentos.filter(l => l.valor < 0 && l.tipo === 'fixo').reduce((s, l) => s + Math.abs(l.valor), 0);
    const variaveis = lancamentos.filter(l => l.valor < 0 && l.tipo === 'variavel').reduce((s, l) => s + Math.abs(l.valor), 0);
    const disponivel = receita - despesas;
    const pct = receita > 0 ? Math.round((despesas / receita) * 100) : 0;
    return { receita, despesas, fixos, variaveis, disponivel, pct, saldo: disponivel };
  },

  // ── Gastos por categoria ───────────────────────────
  getGastosPorCategoria(mes, ano) {
    const lancamentos = this.getLancamentosMes(mes, ano);
    const totais = {};
    lancamentos.forEach(l => {
      if (l.valor >= 0) return;
      const cat = l.categoria || 'Outros';
      totais[cat] = (totais[cat] || 0) + Math.abs(l.valor);
    });
    return totais;
  },

  // ── Saldo total = contas bancárias + reservas + disponível do mês ──
  getSaldoTotal() {
    const contas = this.get('contas') || [];
    const saldoContas = contas.reduce((s, c) => s + (c.saldo || 0), 0);

    const reservas = this.get('reservas') || [];
    const totalReservas = reservas.reduce((s, r) => s + (r.atual || 0), 0);

    const mes = new Date().getMonth() + 1;
    const ano = new Date().getFullYear();
    const totais = this.getTotaisMes(mes, ano);

    return saldoContas + totalReservas + totais.disponivel;
  },

  // Saldo apenas das contas (para a aba Contas)
  getSaldoContas() {
    const contas = this.get('contas') || [];
    return contas.reduce((s, c) => s + (c.saldo || 0), 0);
  },

  // ── Faturas ────────────────────────────────────────
  getFaturas() {
    const cartoes = this.get('cartoes') || [];
    const hoje = new Date();
    return cartoes.map(c => {
      const usado = c.limiteTotal - c.limiteDisponivel;
      const diaVenc = c.vencimentoFatura || 1;
      const proxVenc = new Date(hoje.getFullYear(), hoje.getMonth(), diaVenc);
      if (proxVenc < hoje) proxVenc.setMonth(proxVenc.getMonth() + 1);
      const dias = Math.ceil((proxVenc - hoje) / 86400000);
      return {
        cartao: c.nome,
        cartaoId: c.id,
        valor: usado,
        vencimento: proxVenc.toISOString().split('T')[0],
        diasParaVencer: dias,
        percentualUsado: c.limiteTotal ? Math.round((usado / c.limiteTotal) * 100) : 0,
      };
    });
  },

  // ── Assinaturas ────────────────────────────────────
  getTotalAssinaturas() {
    const subs = this.get('assinaturas') || [];
    return subs.filter(s => s.ativa).reduce((s, a) => s + a.valor, 0);
  },

  // ── Relatórios mensais salvos ──────────────────────
  getRelatorios() { return this.get('relatorios') || []; },

  salvarRelatorioMes(mes, ano) {
    const relatorios = this.getRelatorios();
    // Não salvar duplicado
    if (relatorios.find(r => r.mes === mes && r.ano === ano)) return;

    const totais = this.getTotaisMes(mes, ano);
    const gastosCat = this.getGastosPorCategoria(mes, ano);
    const lancamentos = this.getLancamentosMes(mes, ano);
    const totalSubs = this.getTotalAssinaturas();

    relatorios.push({
      mes, ano,
      salvoEm: new Date().toISOString(),
      totais,
      gastosPorCategoria: gastosCat,
      lancamentos: lancamentos.map(l => ({ descricao: l.descricao, valor: l.valor, categoria: l.categoria, tipo: l.tipo, data: l.data })),
      totalAssinaturas: totalSubs,
    });

    this.set('relatorios', relatorios);
  },

  getRelatorioMes(mes, ano) {
    const relatorios = this.getRelatorios();
    return relatorios.find(r => r.mes === mes && r.ano === ano) || null;
  },

  // ── ID generator ──────────────────────────────────
  uid(prefix) { return prefix + Date.now() + Math.random().toString(36).slice(2, 6); },

  // ── Reset para padrão ──────────────────────────────
  reset() {
    // Remover TODAS as chaves com prefixo facilite_
    const toRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(this.PREFIX)) toRemove.push(key);
    }
    toRemove.forEach(k => localStorage.removeItem(k));
    // Também limpar dados legados
    localStorage.removeItem('facilite_dados');
    window.dispatchEvent(new CustomEvent('facilite:update', { detail: { chave: '*' } }));
  },
};

window.FaciliteStorage = FaciliteStorage;

// ── Utilitários globais ────────────────────────────
// Usados por todos os módulos (lancamentos, contas, etc)
window.fmtBRL = function(val) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);
};

window.escapeHTML = function(str) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
};

// Parsear valor monetário (aceita "1.234,56" ou "1234.56" ou "1234,56")
window.parseValorBRL = function(str) {
  if (typeof str === 'number') return str;
  if (!str) return 0;
  str = String(str).trim();
  // Se tem vírgula e ponto: "1.234,56" → remove pontos, troca vírgula por ponto
  if (str.includes(',') && str.includes('.')) {
    str = str.replace(/\./g, '').replace(',', '.');
  }
  // Se tem só vírgula: "1234,56" → troca por ponto
  else if (str.includes(',')) {
    str = str.replace(',', '.');
  }
  return parseFloat(str) || 0;
};
