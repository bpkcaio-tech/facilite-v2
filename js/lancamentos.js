// ═══════════════════════════════════════════════════
//  FACILITE — LANÇAMENTOS (completo)
// ═══════════════════════════════════════════════════

const LancamentosPage = {
  tipoLanc: 'despesa',
  tagLanc: 'variavel',
  statusLanc: 'pago',
  editandoId: null,
  tabAtual: 'todos',
  dpData: null, // data selecionada no datepicker

  ICONES: {
    'Alimentação': '🍔', 'Transporte': '🚗', 'Moradia': '🏠',
    'Saúde': '💊', 'Lazer': '🎮', 'Educação': '📚',
    'Assinaturas': '📱', 'Salário': '💼', 'Renda Extra': '💵',
    'Receita': '💰', 'Reserva': '🛡️', 'Outros': '📦',
  },

  FORMAS: { pix: '📱 Pix', debito: '🏦 Débito', dinheiro: '💵 Dinheiro', cartao: '💳 Cartão' },

  // ── Init ───────────────────────────────────────────
  init() {
    this.render();
    this._preencherCartoes();
    this._setDataHoje();
    this._renderReceitaFixa();
    document.addEventListener('click', () => this._fecharContextMenu());
  },

  // ── Receita mensal fixa ───────────────────────────
  _renderReceitaFixa() {
    const receita = FaciliteStorage.get('receita');
    const el = document.getElementById('receita-fixa-valor');
    if (el) el.textContent = fmtBRL(receita?.mensal || 0);
    const desc = document.getElementById('receita-fixa-desc');
    if (desc) {
      const nome = receita?.nomeReceita || 'Salário';
      const dia = receita?.diaRecebimento || 5;
      desc.textContent = nome + ' — dia ' + dia + ' de cada mês';
    }
  },

  editarReceitaFixa() {
    const receita = FaciliteStorage.get('receita');
    const modal = document.getElementById('modal-receita-fixa');
    if (!modal) return;
    document.getElementById('receita-fixa-input').value = receita?.mensal || '';
    document.getElementById('receita-fixa-nome').value = receita?.nomeReceita || 'Salário';
    document.getElementById('receita-fixa-dia').value = receita?.diaRecebimento || 5;
    modal.style.display = 'flex';
    modal.onclick = function(e) { if (e.target === modal) { modal.style.display = 'none'; } };
    setTimeout(function() { document.getElementById('receita-fixa-input')?.focus(); }, 100);
  },

  salvarReceitaFixa() {
    if (window.FacilitePlano && !FacilitePlano.ehPago()) {
      FacilitePaywall.abrir('Para configurar sua receita, assine o Facilite Premium.');
      return;
    }
    var valor = parseValorBRL(document.getElementById('receita-fixa-input')?.value);
    var nome = document.getElementById('receita-fixa-nome')?.value?.trim() || 'Salário';
    var dia = parseInt(document.getElementById('receita-fixa-dia')?.value) || 5;

    if (!valor || valor <= 0) { FaciliteNotify.warning('Informe um valor válido.'); return; }

    FaciliteStorage.set('receita', { mensal: valor, nomeReceita: nome, diaRecebimento: dia });

    // Sincronizar receita com Supabase
    if (window.FaciliteSync) {
      FaciliteSync.salvarReceita(valor).catch(function(e) { console.warn('Sync receita:', e); });
    }

    // Criar/atualizar lançamento recorrente de receita no mês atual
    var mes = FaciliteState.mesAtual;
    var ano = FaciliteState.anoAtual;
    var lancamentos = FaciliteStorage.get('lancamentos') || [];
    var existente = lancamentos.find(function(l) { return l.mes === mes && l.ano === ano && l.valor > 0 && l.recorrente && l.descricao === nome; });

    if (existente) {
      existente.valor = valor;
      existente.diaVencimento = dia;
      FaciliteStorage.set('lancamentos', lancamentos);
    } else {
      var dataStr = ano + '-' + String(mes).padStart(2, '0') + '-' + String(Math.min(dia, 28)).padStart(2, '0');
      FaciliteStorage.addLancamento({
        descricao: nome, valor: valor, categoria: 'Receita', tipo: 'fixo',
        data: dataStr, formaPagamento: 'pix', status: 'pago',
        recorrente: true, diaVencimento: dia,
      });
    }

    var mrf = document.getElementById('modal-receita-fixa');
    if (mrf) { mrf.style.display = 'none'; }
    this._renderReceitaFixa();
    this.render();
    FaciliteState.refresh();
    FaciliteNotify.success('Receita fixa atualizada!');
  },

  // ── Navegação de mês ───────────────────────────────
  mesAnterior() {
    let m = FaciliteState.mesAtual - 1;
    let a = FaciliteState.anoAtual;
    if (m < 1) { m = 12; a--; }
    FaciliteState.setMes(m, a);
    this.render();
  },
  mesProximo() {
    let m = FaciliteState.mesAtual + 1;
    let a = FaciliteState.anoAtual;
    if (m > 12) { m = 1; a++; }
    FaciliteState.setMes(m, a);
    this.render();
  },

  // ── Tabs ───────────────────────────────────────────
  setTab(tab) {
    this.tabAtual = tab;
    document.querySelectorAll('.lanc-tab').forEach(t => {
      t.classList.toggle('lanc-tab--active', t.dataset.filter === tab);
    });
    this.render();
  },

  filtrar() { this.render(); },

  // ── Renderizar lista agrupada por data ─────────────
  render() {
    const mes = FaciliteState.mesAtual;
    const ano = FaciliteState.anoAtual;
    const todos = FaciliteStorage.getLancamentosMes(mes, ano);

    // Filtros
    const busca = (document.getElementById('lanc-busca')?.value || '').toLowerCase();
    let filtrados = todos;
    if (this.tabAtual === 'receitas')  filtrados = filtrados.filter(l => l.valor > 0 && l.tipoLanc !== 'reserva');
    if (this.tabAtual === 'despesas')  filtrados = filtrados.filter(l => l.valor < 0 && l.tipoLanc !== 'reserva');
    if (this.tabAtual === 'fixos')     filtrados = filtrados.filter(l => l.tipo === 'fixo');
    if (this.tabAtual === 'variaveis') filtrados = filtrados.filter(l => l.tipo === 'variavel');
    if (this.tabAtual === 'reservas')  filtrados = filtrados.filter(l => l.tipoLanc === 'reserva');
    if (busca) filtrados = filtrados.filter(l =>
      l.descricao.toLowerCase().includes(busca) || l.categoria.toLowerCase().includes(busca)
    );

    filtrados.sort((a, b) => new Date(b.data) - new Date(a.data));

    const lista = document.getElementById('lista-lancamentos');
    const empty = document.getElementById('empty-lancamentos');
    const elMes = document.getElementById('mes-label-lanc');
    if (elMes) elMes.textContent = FaciliteState.getMesLabel();
    if (!lista) return;

    if (filtrados.length === 0) {
      lista.innerHTML = '';
      if (empty) empty.style.display = 'block';
    } else {
      if (empty) empty.style.display = 'none';

      // Agrupar por data
      const grupos = {};
      filtrados.forEach(l => {
        const key = l.data;
        if (!grupos[key]) grupos[key] = [];
        grupos[key].push(l);
      });

      const hoje = new Date().toISOString().split('T')[0];
      const ontem = new Date(Date.now() - 86400000).toISOString().split('T')[0];

      let html = '';
      for (const [data, items] of Object.entries(grupos)) {
        const dtObj = new Date(data + 'T12:00:00');
        const fmt = dtObj.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
        let label = fmt;
        if (data === hoje) label += ' — Hoje';
        else if (data === ontem) label += ' — Ontem';

        html += `<div class="card" style="padding:0;overflow:hidden;margin-bottom:12px">`;
        html += `<div class="lanc-date-group">${label}</div>`;
        items.forEach(l => { html += this._renderRow(l); });
        html += '</div>';
      }
      lista.innerHTML = html;
    }

    // Atualizar resumo
    const receitas = todos.filter(l => l.valor > 0).reduce((s, l) => s + l.valor, 0);
    const despesas = todos.filter(l => l.valor < 0).reduce((s, l) => s + Math.abs(l.valor), 0);
    const elRec = document.getElementById('total-receitas-lanc');
    const elDes = document.getElementById('total-despesas-lanc');
    const elCnt = document.getElementById('total-count-lanc');
    if (elRec) elRec.textContent = fmtBRL(receitas);
    if (elDes) elDes.textContent = fmtBRL(despesas);
    if (elCnt) elCnt.textContent = todos.length;
  },

  _renderRow(l) {
    const icone = this.ICONES[l.categoria] || '📦';
    const cor = l.valor < 0 ? '#EF4444' : '#22C55E';
    const sinal = l.valor < 0 ? '- ' : '+ ';
    const tipoBadge = l.tipoLanc === 'reserva'
      ? '<span class="lanc-badge" style="background:rgba(59,130,246,0.1);color:#3B82F6;border-color:rgba(59,130,246,0.2)">🛡️ RESERVA</span>'
      : l.tipo === 'fixo'
        ? '<span class="lanc-badge lanc-badge--fixo">FIXO</span>'
        : '<span class="lanc-badge lanc-badge--variavel">VAR</span>';
    const parcelaBadge = l.totalParcelas
      ? `<span class="lanc-badge" style="background:rgba(59,130,246,0.1);color:#3B82F6;border-color:rgba(59,130,246,0.2)">${l.parcelaAtual}/${l.totalParcelas}</span>`
      : '';
    const statusBadge = l.status === 'pendente'
      ? '<span class="lanc-badge lanc-badge--pendente">PENDENTE</span>'
      : '<span class="lanc-badge lanc-badge--pago">PAGO</span>';
    const forma = this.FORMAS[l.formaPagamento] || '';

    return `
      <div class="lanc-row">
        <div class="lanc-icon" style="background:${l.valor < 0 ? 'rgba(239,68,68,0.08)' : 'rgba(34,197,94,0.08)'}">${icone}</div>
        <div class="lanc-info">
          <div class="lanc-desc">
            ${escapeHTML(l.descricao)}
            ${tipoBadge}
            ${parcelaBadge}
            ${statusBadge}
          </div>
          <div class="lanc-meta">${l.categoria} · ${forma}${l.recorrente ? ' · 🔄 Recorrente' : ''}</div>
        </div>
        <div class="lanc-valor" style="color:${cor}">${sinal}${fmtBRL(Math.abs(l.valor))}</div>
        <button type="button" class="lanc-menu-btn" onclick="event.stopPropagation();LancamentosPage.abrirMenu(event,'${l.id}')" title="Opções">⋯</button>
      </div>`;
  },

  // ── Context menu ───────────────────────────────────
  abrirMenu(event, id) {
    this._fecharContextMenu();
    const todos = FaciliteStorage.get('lancamentos') || [];
    const l = todos.find(x => x.id === id);
    if (!l) return;

    const menu = document.getElementById('lanc-context-menu');
    if (!menu) return;

    const isPago = l.status !== 'pendente';
    menu.innerHTML = `
      <button class="context-menu-item" onclick="LancamentosPage.editar('${id}')">✏️ Editar</button>
      <button class="context-menu-item" onclick="LancamentosPage.togglePago('${id}')">${isPago ? '⏳ Marcar como pendente' : '✅ Marcar como pago'}</button>
      <div class="context-menu-sep"></div>
      <button class="context-menu-item" style="color:#EF4444" onclick="LancamentosPage.remover('${id}')">🗑️ Excluir</button>
    `;

    const rect = event.target.getBoundingClientRect();
    menu.style.display = 'block';

    const menuHeight = menu.offsetHeight;
    const menuWidth = menu.offsetWidth;
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;

    const topBelow = rect.bottom + 4;
    const topAbove = rect.top - menuHeight - 4;
    const fitsBelow = topBelow + menuHeight <= viewportHeight - 8;
    const top = fitsBelow ? topBelow : Math.max(topAbove, 8);

    let left = rect.left;
    if (left + menuWidth > viewportWidth - 8) {
      left = Math.max(viewportWidth - menuWidth - 8, 8);
    }
    if (left < 8) {
      left = 8;
    }

    menu.style.top = top + 'px';
    menu.style.left = left + 'px';
  },

  _fecharContextMenu() {
    const menu = document.getElementById('lanc-context-menu');
    if (menu) menu.style.display = 'none';
  },

  togglePago(id) {
    this._fecharContextMenu();
    const todos = FaciliteStorage.get('lancamentos') || [];
    const l = todos.find(x => x.id === id);
    if (!l) return;
    l.status = l.status === 'pendente' ? 'pago' : 'pendente';
    FaciliteStorage.set('lancamentos', todos);
    this.render();
    FaciliteNotify.success(l.status === 'pago' ? 'Marcado como pago!' : 'Marcado como pendente.');
  },

  // ── Modal ──────────────────────────────────────────
  abrirModal(id) {
    this.editandoId = id || null;
    const modal = document.getElementById('modal-lancamento');
    const title = document.getElementById('modal-lanc-title');
    if (!modal) return;

    if (id) {
      const todos = FaciliteStorage.get('lancamentos') || [];
      const l = todos.find(x => x.id === id);
      if (!l) return;
      this._fecharContextMenu();
      if (title) title.textContent = 'Editar Lançamento';
      this.setTipoLanc(l.valor >= 0 ? 'receita' : 'despesa');
      this.setTag(l.tipo || 'variavel');
      this.setStatus(l.status || 'pago');
      document.getElementById('lanc-descricao').value = l.descricao;
      document.getElementById('lanc-valor').value = Math.abs(l.valor);
      document.getElementById('lanc-categoria').value = l.categoria;
      this._setDataStr(l.data);
      document.getElementById('lanc-forma').value = l.formaPagamento || 'pix';
      document.getElementById('lanc-recorrente').checked = l.recorrente || false;
      this.toggleRecorrente();
      this.toggleCartao();
      if (l.cartaoId) document.getElementById('lanc-cartao').value = l.cartaoId;
      if (l.diaVencimento) document.getElementById('lanc-dia-venc').value = l.diaVencimento;
    } else {
      if (title) title.textContent = 'Novo Lançamento';
      this.setTipoLanc('despesa');
      this.setTag('variavel');
      this.setStatus('pago');
      document.getElementById('lanc-descricao').value = '';
      document.getElementById('lanc-valor').value = '';
      this._setDataHoje();
      document.getElementById('lanc-forma').value = 'pix';
      document.getElementById('lanc-recorrente').checked = false;
      this.toggleRecorrente();
      this.toggleCartao();
      const parcEl = document.getElementById('lanc-parcelado');
      if (parcEl) { parcEl.checked = false; this.toggleParcelamento(); }
      const numParcEl = document.getElementById('lanc-num-parcelas');
      if (numParcEl) numParcEl.value = '';
      const reservaSel = document.getElementById('lanc-reserva-id');
      if (reservaSel) reservaSel.value = '';
    }

    modal.style.display = 'flex';
    modal.onclick = e => { if (e.target === modal) this.fecharModal(); };
    setTimeout(() => document.getElementById('lanc-descricao')?.focus(), 100);
  },

  fecharModal() {
    const modal = document.getElementById('modal-lancamento');
    if (modal) {
      modal.style.display = 'none';
    }
    this.editandoId = null;
    this._salvando = false;
    this._fecharDatePicker();
  },

  // ── Toggle helpers ─────────────────────────────────
  setTipoLanc(tipo) {
    this.tipoLanc = tipo;
    const btnDes = document.getElementById('btn-tipo-despesa');
    const btnRec = document.getElementById('btn-tipo-receita');
    const btnRes = document.getElementById('btn-tipo-reserva');
    const reservaWrap = document.getElementById('lanc-reserva-wrap');
    const descInput = document.getElementById('lanc-descricao');
    const catSelect = document.getElementById('lanc-categoria');

    if (btnDes) btnDes.classList.toggle('toggle-btn--active', tipo === 'despesa');
    if (btnRec) btnRec.classList.toggle('toggle-btn--active', tipo === 'receita');
    if (btnRes) btnRes.classList.toggle('toggle-btn--active', tipo === 'reserva');

    if (tipo === 'reserva') {
      if (reservaWrap) reservaWrap.style.display = 'block';
      this._preencherReservas();
      if (descInput) descInput.placeholder = 'Descrição (ex: Guardar salário)';
      if (catSelect) catSelect.value = 'Outros';
      this.setTag('fixo');
    } else {
      if (reservaWrap) reservaWrap.style.display = 'none';
      if (descInput) descInput.placeholder = 'Ex: Supermercado, Aluguel...';
    }
  },

  _preencherReservas() {
    const sel = document.getElementById('lanc-reserva-id');
    if (!sel) return;
    const reservas = FaciliteStorage.get('reservas') || [];
    sel.innerHTML = '<option value="">Selecione uma reserva...</option>' +
      reservas.map(r => `<option value="${r.id}">${r.icone || '🎯'} ${escapeHTML(r.nome)} (${fmtBRL(r.atual)} de ${fmtBRL(r.meta)})</option>`).join('');
  },

  onReservaChange() {
    const reservaId = document.getElementById('lanc-reserva-id')?.value;
    if (!reservaId) return;
    const reservas = FaciliteStorage.get('reservas') || [];
    const r = reservas.find(x => x.id === reservaId);
    if (!r) return;
    const descInput = document.getElementById('lanc-descricao');
    if (descInput && !descInput.value.trim()) {
      descInput.value = `Reserva: ${r.nome}`;
    }
  },

  setTag(tag) {
    this.tagLanc = tag;
    const btnF = document.getElementById('btn-tag-fixo');
    const btnV = document.getElementById('btn-tag-variavel');
    if (btnF) btnF.classList.toggle('toggle-btn--active-subtle', tag === 'fixo');
    if (btnV) btnV.classList.toggle('toggle-btn--active-subtle', tag === 'variavel');
    // Remove inactive state
    if (btnF) { if (tag !== 'fixo') btnF.classList.remove('toggle-btn--active-subtle'); }
    if (btnV) { if (tag !== 'variavel') btnV.classList.remove('toggle-btn--active-subtle'); }
  },

  setStatus(status) {
    this.statusLanc = status;
    const btnP = document.getElementById('btn-status-pago');
    const btnPe = document.getElementById('btn-status-pendente');
    if (btnP) btnP.classList.toggle('toggle-btn--active-subtle', status === 'pago');
    if (btnPe) btnPe.classList.toggle('toggle-btn--active-subtle', status === 'pendente');
    if (btnP) { if (status !== 'pago') btnP.classList.remove('toggle-btn--active-subtle'); }
    if (btnPe) { if (status !== 'pendente') btnPe.classList.remove('toggle-btn--active-subtle'); }
  },

  onCategoriaChange() {
    const cat = document.getElementById('lanc-categoria')?.value;
    const cats = FaciliteStorage.get('categorias') || {};
    if (cats[cat]) this.setTag(cats[cat]);
  },

  toggleCartao() {
    const forma = document.getElementById('lanc-forma')?.value;
    const wrap = document.getElementById('lanc-cartao-wrap');
    if (wrap) wrap.style.display = forma === 'cartao' ? 'block' : 'none';
  },

  toggleParcelamento() {
    const checked = document.getElementById('lanc-parcelado')?.checked;
    const fields = document.getElementById('lanc-parcelamento-fields');
    if (fields) fields.style.display = checked ? 'grid' : 'none';
    // Desmarcar recorrente se parcelado
    if (checked) {
      const rec = document.getElementById('lanc-recorrente');
      if (rec) { rec.checked = false; this.toggleRecorrente(); }
    }
    this.calcularParcela();
  },

  calcularParcela() {
    const valorRaw = parseValorBRL(document.getElementById('lanc-valor')?.value);
    const numParcelas = parseInt(document.getElementById('lanc-num-parcelas')?.value) || 0;
    const elParcela = document.getElementById('lanc-valor-parcela');
    if (!elParcela) return;
    if (valorRaw > 0 && numParcelas >= 2) {
      const parcela = valorRaw / numParcelas;
      elParcela.value = fmtBRL(parcela);
    } else {
      elParcela.value = '';
    }
  },

  toggleRecorrente() {
    const checked = document.getElementById('lanc-recorrente')?.checked;
    const fields = document.getElementById('lanc-recorrente-fields');
    if (fields) fields.style.display = checked ? 'grid' : 'none';
    // Desmarcar parcelado se recorrente
    if (checked) {
      const parc = document.getElementById('lanc-parcelado');
      if (parc) { parc.checked = false; this.toggleParcelamento(); }
    }
  },

  _preencherCartoes() {
    const sel = document.getElementById('lanc-cartao');
    if (!sel) return;
    const cartoes = FaciliteStorage.get('cartoes') || [];
    sel.innerHTML = cartoes.map(c => `<option value="${c.id}">${c.nome} (${c.numeroFinal || ''})</option>`).join('');
  },

  // ── Date picker ────────────────────────────────────
  _setDataHoje() {
    const hoje = new Date();
    this.dpData = { dia: hoje.getDate(), mes: hoje.getMonth() + 1, ano: hoje.getFullYear() };
    this._dpMes = this.dpData.mes;
    this._dpAno = this.dpData.ano;
    this._atualizarInputData();
  },

  _setDataStr(str) {
    const dt = new Date(str + 'T12:00:00');
    this.dpData = { dia: dt.getDate(), mes: dt.getMonth() + 1, ano: dt.getFullYear() };
    this._dpMes = this.dpData.mes;
    this._dpAno = this.dpData.ano;
    this._atualizarInputData();
  },

  _atualizarInputData() {
    const el = document.getElementById('lanc-data');
    if (!el || !this.dpData) return;
    const { dia, mes, ano } = this.dpData;
    el.value = String(dia).padStart(2, '0') + '/' + String(mes).padStart(2, '0') + '/' + ano;
  },

  // Permitir digitação manual DD/MM/AAAA com auto-formatação
  onDataInput(el) {
    let v = el.value.replace(/[^\d]/g, '');
    if (v.length > 8) v = v.slice(0, 8);
    let formatted = '';
    if (v.length >= 1) formatted = v.slice(0, 2);
    if (v.length >= 3) formatted += '/' + v.slice(2, 4);
    if (v.length >= 5) formatted += '/' + v.slice(4, 8);
    el.value = formatted;

    // Se tiver 8 dígitos, parsear
    if (v.length === 8) {
      const dia = parseInt(v.slice(0, 2));
      const mes = parseInt(v.slice(2, 4));
      const ano = parseInt(v.slice(4, 8));
      if (dia >= 1 && dia <= 31 && mes >= 1 && mes <= 12 && ano >= 2020 && ano <= 2099) {
        this.dpData = { dia, mes, ano };
        this._dpMes = mes;
        this._dpAno = ano;
      }
    }
  },

  onDataBlur() {
    // Se o input está incompleto, restaurar data válida
    const el = document.getElementById('lanc-data');
    if (!el) return;
    const v = el.value.replace(/[^\d]/g, '');
    if (v.length < 8 && this.dpData) {
      this._atualizarInputData();
    }
  },

  _getDataISO() {
    if (!this.dpData) return new Date().toISOString().split('T')[0];
    const { dia, mes, ano } = this.dpData;
    return `${ano}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
  },

  abrirDatePicker() {
    const dp = document.getElementById('lanc-datepicker');
    if (!dp) return;
    if (dp.style.display === 'block') { this._fecharDatePicker(); return; }
    // Sincronizar mês/ano do picker com a data selecionada
    if (this.dpData) {
      this._dpMes = this.dpData.mes;
      this._dpAno = this.dpData.ano;
    }
    dp.style.display = 'block';
    this._renderDatePicker();

    // Fechar ao clicar fora
    setTimeout(() => {
      const handler = (e) => {
        const wrap = document.getElementById('lanc-data-wrap');
        if (wrap && !wrap.contains(e.target)) {
          this._fecharDatePicker();
          document.removeEventListener('click', handler);
        }
      };
      document.addEventListener('click', handler);
    }, 10);
  },

  _fecharDatePicker() {
    const dp = document.getElementById('lanc-datepicker');
    if (dp) dp.style.display = 'none';
  },

  _dpMes: null,
  _dpAno: null,

  _renderDatePicker() {
    const dp = document.getElementById('lanc-datepicker');
    if (!dp) return;
    if (!this._dpMes) { this._dpMes = this.dpData?.mes || (new Date().getMonth() + 1); }
    if (!this._dpAno) { this._dpAno = this.dpData?.ano || new Date().getFullYear(); }

    const meses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    const diasSemana = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

    const primeiroDia = new Date(this._dpAno, this._dpMes - 1, 1).getDay();
    const diasNoMes = new Date(this._dpAno, this._dpMes, 0).getDate();
    const diasMesAnterior = new Date(this._dpAno, this._dpMes - 1, 0).getDate();

    const hoje = new Date();
    const hojeStr = `${hoje.getFullYear()}-${hoje.getMonth() + 1}-${hoje.getDate()}`;
    const selStr = this.dpData ? `${this.dpData.ano}-${this.dpData.mes}-${this.dpData.dia}` : '';

    let diasHTML = '';
    // Dias do mês anterior
    for (let i = primeiroDia - 1; i >= 0; i--) {
      const d = diasMesAnterior - i;
      diasHTML += `<button type="button" class="dp-day dp-day--other" onclick="LancamentosPage._dpNavMes(-1)">${d}</button>`;
    }
    // Dias do mês
    for (let d = 1; d <= diasNoMes; d++) {
      const chkStr = `${this._dpAno}-${this._dpMes}-${d}`;
      const isHoje = chkStr === hojeStr;
      const isSel = chkStr === selStr;
      const cls = ['dp-day'];
      if (isHoje) cls.push('dp-day--today');
      if (isSel) cls.push('dp-day--selected');
      diasHTML += `<button type="button" class="${cls.join(' ')}" onclick="LancamentosPage._dpSelect(${d})">${d}</button>`;
    }
    // Completar grid
    const totalCells = primeiroDia + diasNoMes;
    const remaining = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7);
    for (let d = 1; d <= remaining; d++) {
      diasHTML += `<button type="button" class="dp-day dp-day--other" onclick="LancamentosPage._dpNavMes(1)">${d}</button>`;
    }

    dp.innerHTML = `
      <div class="dp-header">
        <span class="dp-title">${meses[this._dpMes - 1].toLowerCase()} ${this._dpAno}</span>
        <div class="dp-nav-group">
          <button type="button" class="dp-nav" onclick="event.stopPropagation();LancamentosPage._dpNavMes(-1)">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          <button type="button" class="dp-nav" onclick="event.stopPropagation();LancamentosPage._dpNavMes(1)">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
        </div>
      </div>
      <div class="dp-weekdays">${diasSemana.map(d => `<span class="dp-weekday">${d}</span>`).join('')}</div>
      <div class="dp-days">${diasHTML}</div>
    `;
  },

  _dpNavMes(dir) {
    this._dpMes += dir;
    if (this._dpMes > 12) { this._dpMes = 1; this._dpAno++; }
    if (this._dpMes < 1) { this._dpMes = 12; this._dpAno--; }
    this._renderDatePicker();
  },

  _dpSelect(dia) {
    this.dpData = { dia, mes: this._dpMes, ano: this._dpAno };
    this._atualizarInputData();
    this._fecharDatePicker();
  },

  // ── Salvar ─────────────────────────────────────────
  salvar() {
    if (window.FacilitePlano && !FacilitePlano.ehPago()) {
      FacilitePaywall.abrir('Para adicionar lançamentos, assine o Facilite Premium.');
      return;
    }
    if (this._salvando) return;
    this._salvando = true;
    var self = this;
    setTimeout(function() { self._salvando = false; }, 2000);

    const descricao  = document.getElementById('lanc-descricao')?.value?.trim();
    const valorRaw   = parseValorBRL(document.getElementById('lanc-valor')?.value);
    const categoria  = document.getElementById('lanc-categoria')?.value;
    const data       = this._getDataISO();
    const forma      = document.getElementById('lanc-forma')?.value;
    const cartaoId   = forma === 'cartao' ? document.getElementById('lanc-cartao')?.value : null;
    const recorrente = document.getElementById('lanc-recorrente')?.checked || false;
    const diaVenc    = parseInt(document.getElementById('lanc-dia-venc')?.value) || null;
    const duracao    = parseInt(document.getElementById('lanc-duracao')?.value) || 0;

    if (!descricao) {
      FaciliteNotify.warning('Informe a descrição.');
      this._salvando = false;
      return;
    }
    if (!valorRaw || valorRaw <= 0) {
      FaciliteNotify.warning('Informe um valor válido.');
      this._salvando = false;
      return;
    }

    // Se for reserva, validar seleção
    const reservaId = this.tipoLanc === 'reserva' ? document.getElementById('lanc-reserva-id')?.value : null;
    if (this.tipoLanc === 'reserva' && !reservaId) {
      FaciliteNotify.warning('Selecione uma reserva.');
      this._salvando = false;
      return;
    }

    // Reserva = valor negativo (sai do saldo disponível para guardar)
    const valor = this.tipoLanc === 'despesa' ? -Math.abs(valorRaw)
      : this.tipoLanc === 'reserva' ? -Math.abs(valorRaw)
      : Math.abs(valorRaw);

    // Memorizar tag da categoria
    const cats = FaciliteStorage.get('categorias') || {};
    cats[categoria] = this.tagLanc;
    FaciliteStorage.set('categorias', cats);

    const parcelado   = document.getElementById('lanc-parcelado')?.checked || false;
    const numParcelas = parcelado ? (parseInt(document.getElementById('lanc-num-parcelas')?.value) || 0) : 0;

    const lancBase = {
      descricao, valor, categoria: this.tipoLanc === 'reserva' ? 'Reserva' : categoria,
      tipo: this.tagLanc, data,
      formaPagamento: forma, cartaoId, recorrente,
      diaVencimento: diaVenc, status: this.statusLanc,
      reservaId: reservaId || null,
      tipoLanc: this.tipoLanc,
    };

    if (this.editandoId) {
      FaciliteStorage.editLancamento(this.editandoId, {
        ...lancBase,
        mes: new Date(data + 'T12:00:00').getMonth() + 1,
        ano: new Date(data + 'T12:00:00').getFullYear(),
      });
      FaciliteNotify.success('Lançamento atualizado!');
    } else if (parcelado && numParcelas >= 2) {
      // Parcelamento: divide o valor total em N parcelas distribuídas nos meses
      const valorParcela = this.tipoLanc === 'despesa'
        ? -Math.abs(valorRaw / numParcelas)
        : Math.abs(valorRaw / numParcelas);
      const dt = new Date(data + 'T12:00:00');
      const parcelamentoId = FaciliteStorage.uid('parc');

      for (let i = 0; i < numParcelas; i++) {
        const futuro = new Date(dt.getFullYear(), dt.getMonth() + i, dt.getDate());
        FaciliteStorage.addLancamento({
          ...lancBase,
          valor: valorParcela,
          descricao: `${descricao} (${i + 1}/${numParcelas})`,
          data: futuro.toISOString().split('T')[0],
          parcelamentoId,
          parcelaAtual: i + 1,
          totalParcelas: numParcelas,
          status: i === 0 ? this.statusLanc : 'pendente',
        });
      }

      FaciliteNotify.success(`${numParcelas}x de ${fmtBRL(Math.abs(valorRaw / numParcelas))} lançadas! Total: ${fmtBRL(Math.abs(valorRaw))}`);
    } else {
      FaciliteStorage.addLancamento(lancBase);

      // Sincronizar com Supabase
      if (window.FaciliteSync) {
        const dataObj = new Date(data + 'T12:00:00');
        FaciliteSync.salvarLancamento({
          ...lancBase,
          mes: dataObj.getMonth() + 1,
          ano: dataObj.getFullYear(),
        }).catch(function(e) { console.warn('Sync error:', e); });
      }

      // Se recorrente: criar para meses futuros
      if (recorrente && duracao > 0) {
        const dt = new Date(data + 'T12:00:00');
        for (let i = 1; i < duracao; i++) {
          const futuro = new Date(dt.getFullYear(), dt.getMonth() + i, diaVenc || dt.getDate());
          FaciliteStorage.addLancamento({
            ...lancBase,
            data: futuro.toISOString().split('T')[0],
          });
        }
      }

      if (this.tipoLanc === 'reserva') {
        FaciliteNotify.success(`${fmtBRL(Math.abs(valor))} guardado na reserva!`);
      } else {
        FaciliteNotify.success(`${this.tipoLanc === 'despesa' ? 'Despesa' : 'Receita'} de ${fmtBRL(Math.abs(valor))} registrada!`);
      }
    }

    // Se for reserva → creditar o valor na reserva correspondente
    if (reservaId) {
      const reservas = FaciliteStorage.get('reservas') || [];
      const r = reservas.find(x => x.id === reservaId);
      if (r) {
        r.atual = (r.atual || 0) + Math.abs(valorRaw);
        FaciliteStorage.set('reservas', reservas);
        const atingiu = r.atual >= r.meta;
        if (atingiu) {
          FaciliteNotify.success(`Meta "${r.nome}" atingida! 🎉`, 5000);
          NotifPanel.adicionar(`Meta "${r.nome}" atingida! Parabéns! 🎉`, 'meta');
        }
      }
    }

    this.fecharModal();
    this.render();
    FaciliteState.refresh();
  },

  editar(id) {
    this._fecharContextMenu();
    this.abrirModal(id);
  },

  remover(id) {
    this._fecharContextMenu();
    const todos = FaciliteStorage.get('lancamentos') || [];
    const l = todos.find(x => x.id === id);
    if (!l) return;

    if (l.recorrente) {
      const choice = confirm('Excluir TODOS os lançamentos recorrentes com essa descrição?\n\n(Cancelar = excluir só este)');
      if (choice) {
        FaciliteStorage.set('lancamentos', todos.filter(x => !(x.descricao === l.descricao && x.recorrente)));
      } else {
        FaciliteStorage.removeLancamento(id);
      }
    } else {
      if (!confirm('Excluir este lançamento?')) return;
      FaciliteStorage.removeLancamento(id);
    }
    if (window.FaciliteSync) {
      FaciliteSync.excluirLancamento(id);
    }
    this.render();
    FaciliteState.refresh();
    FaciliteNotify.success('Lançamento removido.');
  },
};

// ── Event listeners ──────────────────────────────────
FaciliteState.on('page-loaded', ({ page }) => {
  if (page === 'lancamentos') LancamentosPage.init();
});

FaciliteState.on('dados-changed', () => {
  if (FaciliteRouter.currentPage === 'lancamentos') LancamentosPage.render();
});

window.LancamentosPage = LancamentosPage;
