// ═══════════════════════════════════════════════════
//  FACILITE — VIRADA DE MÊS
//  Executa automaticamente ao carregar o dashboard:
//  1. Detecta se o mês virou
//  2. Salva relatório do mês anterior
//  3. Cria lançamentos fixos (recorrentes + assinaturas)
//  4. Zera despesas variáveis
// ═══════════════════════════════════════════════════

const ViradaMes = {

  verificar() {
    const hoje = new Date();
    const mesAtual = hoje.getMonth() + 1;
    const anoAtual = hoje.getFullYear();
    const chave = mesAtual + '-' + anoAtual;

    const ultimoProcessado = FaciliteStorage.get('ultimoMesProcessado');

    // Primeiro acesso — garantir lançamentos do mês atual
    if (!ultimoProcessado) {
      FaciliteStorage.set('ultimoMesProcessado', chave);
      // Garantir assinaturas do mês atual mesmo no primeiro acesso
      this._garantirAssinaturasMesAtual(mesAtual, anoAtual);
      return;
    }

    // Já processou este mês — apenas garantir assinaturas (caso venham de outro dispositivo)
    if (ultimoProcessado === chave) {
      this._garantirAssinaturasMesAtual(mesAtual, anoAtual);
      return;
    }

    // Mês virou — processar normalmente
    console.log('[ViradaMes] Novo mês detectado:', chave);
    const [mesAnt, anoAnt] = ultimoProcessado.split('-').map(Number);

    this._salvarRelatorio(mesAnt, anoAnt);
    this._criarLancamentosFixos(mesAtual, anoAtual, mesAnt, anoAnt);
    this._notificarVirada(mesAtual, anoAtual);

    FaciliteStorage.set('ultimoMesProcessado', chave);
    setTimeout(() => FaciliteState.refresh(), 300);
  },

  // Garante que assinaturas ativas têm lançamento no mês atual
  _garantirAssinaturasMesAtual(mes, ano) {
    const assinaturas = FaciliteStorage.get('assinaturas') || [];
    const ativas = assinaturas.filter(a => a.ativa);
    if (ativas.length === 0) return;

    const lancNovos = FaciliteStorage.getLancamentosMes(mes, ano);

    ativas.forEach(a => {
      const jaExiste = lancNovos.find(n =>
        n.descricao === a.nome && n.categoria === 'Assinaturas' &&
        n.mes === mes && n.ano === ano
      );
      if (jaExiste) return;

      const dia = a.diaVencimento || 1;
      const dataStr = `${ano}-${String(mes).padStart(2,'0')}-${String(Math.min(dia,28)).padStart(2,'0')}`;

      const novoLanc = {
        id: FaciliteStorage.uid('lanc'),
        descricao: a.nome,
        valor: -Math.abs(a.valor),
        categoria: 'Assinaturas',
        tipo: 'fixo',
        data: dataStr,
        mes: mes,
        ano: ano,
        formaPagamento: 'debito',
        status: 'pendente',
        recorrente: true,
        diaVencimento: dia,
      };

      FaciliteStorage.addLancamento(novoLanc);

      if (window.FaciliteSync && FaciliteSync.ready) {
        FaciliteSync.adicionarLancamento(novoLanc).then(function(ok) {
          if (ok) console.log('[ViradaMes] Assinatura garantida:', a.nome, mes + '/' + ano);
        });
      }
    });
  },

  // ── 1. Salvar relatório do mês anterior ────────────
  _salvarRelatorio(mes, ano) {
    FaciliteStorage.salvarRelatorioMes(mes, ano);
    console.log('[ViradaMes] Relatório salvo:', mes + '/' + ano);
  },

  // ── 2. Criar lançamentos fixos no novo mês ─────────
  _criarLancamentosFixos(mes, ano, mesAnt, anoAnt) {
    const lancAnteriores = FaciliteStorage.getLancamentosMes(mesAnt, anoAnt);
    const lancNovos = FaciliteStorage.getLancamentosMes(mes, ano);

    // a) Lançamentos recorrentes fixos do mês anterior
    const recorrentes = lancAnteriores.filter(l => l.recorrente && l.tipo === 'fixo');

    recorrentes.forEach(l => {
      // Verificar se já existe no novo mês (evitar duplicata)
      const jaExiste = lancNovos.find(n =>
        n.descricao === l.descricao && n.recorrente && n.tipo === 'fixo'
      );
      if (jaExiste) return;

      const dia = l.diaVencimento || new Date(l.data).getDate() || 1;
      const dataStr = `${ano}-${String(mes).padStart(2, '0')}-${String(Math.min(dia, 28)).padStart(2, '0')}`;

      const lancCriado = FaciliteStorage.addLancamento({
        descricao: l.descricao,
        valor: l.valor,
        categoria: l.categoria,
        tipo: 'fixo',
        data: dataStr,
        mes: mes,
        ano: ano,
        formaPagamento: l.formaPagamento || 'pix',
        status: 'pendente',
        recorrente: true,
        diaVencimento: l.diaVencimento,
      });

      if (window.FaciliteSync && lancCriado) {
        FaciliteSync.adicionarLancamento(lancCriado);
      }
    });

    // b) Parcelamentos em andamento
    const parcelamentos = lancAnteriores.filter(l => l.parcelamento && l.parcelamento.atual < l.parcelamento.total);

    parcelamentos.forEach(l => {
      const jaExiste = lancNovos.find(n =>
        n.descricao === l.descricao && n.parcelamento
      );
      if (jaExiste) return;

      const proxParcela = (l.parcelamento.atual || 0) + 1;
      if (proxParcela > l.parcelamento.total) return;

      const dia = l.diaVencimento || 1;
      const dataStr = `${ano}-${String(mes).padStart(2, '0')}-${String(Math.min(dia, 28)).padStart(2, '0')}`;

      FaciliteStorage.addLancamento({
        descricao: l.descricao,
        valor: l.valor,
        categoria: l.categoria,
        tipo: 'fixo',
        data: dataStr,
        formaPagamento: l.formaPagamento || 'pix',
        status: 'pendente',
        recorrente: false,
        parcelamento: { atual: proxParcela, total: l.parcelamento.total },
      });
    });

    // c) Assinaturas ativas → gerar como lançamento fixo
    const assinaturas = FaciliteStorage.get('assinaturas') || [];
    assinaturas.filter(a => a.ativa).forEach(a => {
      const jaExiste = lancNovos.find(n =>
        n.descricao === a.nome && n.categoria === 'Assinaturas'
      );
      if (jaExiste) return;

      const dia = a.diaVencimento || 1;
      const dataStr = `${ano}-${String(mes).padStart(2, '0')}-${String(Math.min(dia, 28)).padStart(2, '0')}`;

      const novoLanc = {
        id: FaciliteStorage.uid('lanc'),
        descricao: a.nome,
        valor: -Math.abs(a.valor),
        categoria: 'Assinaturas',
        tipo: 'fixo',
        data: dataStr,
        mes: mes,
        ano: ano,
        formaPagamento: 'debito',
        status: 'pendente',
        recorrente: true,
        diaVencimento: dia,
      };

      FaciliteStorage.addLancamento(novoLanc);

      // Sincronizar com Supabase
      if (window.FaciliteSync) {
        FaciliteSync.adicionarLancamento(novoLanc).then(function(ok) {
          if (ok) console.log('[ViradaMes] Assinatura sincronizada:', a.nome);
        });
      }
    });

    console.log('[ViradaMes] Lançamentos fixos criados para', mes + '/' + ano);
  },

  // ── 3. Notificar o usuário ─────────────────────────
  _notificarVirada(mes, ano) {
    const meses = ['', 'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

    if (typeof FaciliteNotify !== 'undefined') {
      FaciliteNotify.success(
        `Novo mês! ${meses[mes]} ${ano} iniciado. Despesas fixas e assinaturas já foram lançadas. O relatório do mês anterior foi salvo.`,
        8000
      );
    }
  },
};

// Executar ao carregar
document.addEventListener('DOMContentLoaded', () => {
  // Esperar storage carregar
  setTimeout(() => ViradaMes.verificar(), 500);
});

window.ViradaMes = ViradaMes;
