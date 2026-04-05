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

    // Se nunca processou, marcar como processado e sair (primeiro acesso)
    if (!ultimoProcessado) {
      FaciliteStorage.set('ultimoMesProcessado', chave);
      return;
    }

    // Se já processou este mês, nada a fazer
    if (ultimoProcessado === chave) return;

    // Mês virou! Processar
    console.log('[ViradaMes] Novo mês detectado:', chave, '(anterior:', ultimoProcessado, ')');

    // Descobrir mês anterior
    const [mesAnt, anoAnt] = ultimoProcessado.split('-').map(Number);

    this._salvarRelatorio(mesAnt, anoAnt);
    this._criarLancamentosFixos(mesAtual, anoAtual, mesAnt, anoAnt);
    this._notificarVirada(mesAtual, anoAtual);

    // Marcar como processado
    FaciliteStorage.set('ultimoMesProcessado', chave);

    // Atualizar dashboard
    setTimeout(() => FaciliteState.refresh(), 300);
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

    // d) Receita fixa (recorrente) do mês anterior
    const receitasFixas = lancAnteriores.filter(l => l.valor > 0 && l.recorrente);
    receitasFixas.forEach(l => {
      const jaExiste = lancNovos.find(n =>
        n.descricao === l.descricao && n.valor > 0 && n.recorrente
      );
      if (jaExiste) return;

      const dia = l.diaVencimento || 1;
      const dataStr = `${ano}-${String(mes).padStart(2, '0')}-${String(Math.min(dia, 28)).padStart(2, '0')}`;

      FaciliteStorage.addLancamento({
        descricao: l.descricao,
        valor: l.valor,
        categoria: l.categoria || 'Receita',
        tipo: 'fixo',
        data: dataStr,
        formaPagamento: l.formaPagamento || 'pix',
        status: 'pendente',
        recorrente: true,
        diaVencimento: l.diaVencimento,
      });
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
