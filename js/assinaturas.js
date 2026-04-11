// ═══════════════════════════════════════════════════
//  FACILITE — ASSINATURAS
// ═══════════════════════════════════════════════════

const ASSINATURAS_PRESET = [
  { nome: 'Netflix',       emoji: '🎬', cor: '#E50914', categoria: 'Streaming' },
  { nome: 'Disney+',       emoji: '🏰', cor: '#113CCF', categoria: 'Streaming' },
  { nome: 'HBO Max',       emoji: '🎭', cor: '#5822B4', categoria: 'Streaming' },
  { nome: 'Amazon Prime',  emoji: '📦', cor: '#00A8E1', categoria: 'Streaming' },
  { nome: 'Globoplay',     emoji: '🌐', cor: '#F26522', categoria: 'Streaming' },
  { nome: 'Apple TV+',     emoji: '🍎', cor: '#555555', categoria: 'Streaming' },
  { nome: 'Paramount+',    emoji: '⭐', cor: '#0064FF', categoria: 'Streaming' },
  { nome: 'Spotify',       emoji: '🎵', cor: '#1DB954', categoria: 'Música' },
  { nome: 'Apple Music',   emoji: '🎶', cor: '#FC3C44', categoria: 'Música' },
  { nome: 'Deezer',        emoji: '🎧', cor: '#FF0092', categoria: 'Música' },
  { nome: 'Google One',    emoji: '☁️',  cor: '#4285F4', categoria: 'Cloud' },
  { nome: 'iCloud',        emoji: '🍏', cor: '#555555', categoria: 'Cloud' },
  { nome: 'Dropbox',       emoji: '📂', cor: '#0061FF', categoria: 'Cloud' },
  { nome: 'ChatGPT Plus',  emoji: '🤖', cor: '#10A37F', categoria: 'IA' },
  { nome: 'Claude Pro',    emoji: '✦',  cor: '#D97706', categoria: 'IA' },
  { nome: 'Midjourney',    emoji: '🎨', cor: '#5865F2', categoria: 'IA' },
  { nome: 'Copilot',       emoji: '🪄', cor: '#0078D4', categoria: 'IA' },
  { nome: 'Academia',      emoji: '💪', cor: '#FF6B35', categoria: 'Saúde' },
  { nome: 'Gympass',       emoji: '🏋️', cor: '#00C4B3', categoria: 'Saúde' },
  { nome: 'Adobe CC',      emoji: '🅰️', cor: '#FF0000', categoria: 'Trabalho' },
  { nome: 'Microsoft 365', emoji: '📊', cor: '#D83B01', categoria: 'Trabalho' },
  { nome: 'Notion',        emoji: '📝', cor: '#787774', categoria: 'Trabalho' },
  { nome: 'Canva Pro',     emoji: '🖌️', cor: '#00C4CC', categoria: 'Trabalho' },
  { nome: 'Personalizado', emoji: '✏️', cor: '#6B7280', categoria: 'Outros' },
];

const AssinaturasPage = {
  presetSelecionado: null,
  filtroCategoria: 'todos',

  init() { this.render(); },

  // ── Criar lançamentos a partir de um mês/ano específico ──
  _criarLancamentosMeses(nome, valor, dia, meses, mesInicio, anoInicio) {
    meses = meses || 12;
    var mesBase = mesInicio || (window.FaciliteState ? FaciliteState.mesAtual : new Date().getMonth() + 1);
    var anoBase = anoInicio || (window.FaciliteState ? FaciliteState.anoAtual : new Date().getFullYear());
    const criados = [];

    for (let i = 0; i < meses; i++) {
      var totalMes = (mesBase - 1) + i;
      var anoLanc = anoBase + Math.floor(totalMes / 12);
      var mesLanc = (totalMes % 12) + 1;
      const diaReal = Math.min(dia, 28);
      const dataStr = anoLanc + '-' + String(mesLanc).padStart(2, '0') + '-' + String(diaReal).padStart(2, '0');

      const todos = FaciliteStorage.get('lancamentos') || [];
      const jaExiste = todos.some(function(l) {
        return l.descricao === nome && l.categoria === 'Assinaturas' && l.mes === mesLanc && l.ano === anoLanc;
      });
      if (jaExiste) continue;

      const novoLanc = {
        id: FaciliteStorage.uid('lanc'),
        descricao: nome,
        valor: -Math.abs(valor),
        categoria: 'Assinaturas',
        tipo: 'fixo',
        data: dataStr,
        mes: mesLanc,
        ano: anoLanc,
        formaPagamento: 'debito',
        recorrente: true,
        diaVencimento: dia,
        status: 'pendente',
      };

      FaciliteStorage.addLancamento(novoLanc);
      if (window.FaciliteSync) FaciliteSync.adicionarLancamento(novoLanc);
      criados.push(novoLanc);
      console.log('[Assinaturas] Lançamento criado:', nome, mesLanc + '/' + anoLanc);
    }

    return criados;
  },

  _removerLancamentosFuturos(nome) {
    const hoje = new Date();
    const mesAtual = hoje.getMonth() + 1;
    const anoAtual = hoje.getFullYear();
    const todos = FaciliteStorage.get('lancamentos') || [];

    const paraRemover = todos.filter(function(l) {
      if (!(l.descricao === nome && l.categoria === 'Assinaturas' && l.recorrente)) return false;
      if (l.ano > anoAtual) return true;
      if (l.ano === anoAtual && l.mes >= mesAtual) return true;
      return false;
    });

    const restantes = todos.filter(function(l) {
      return !(l.descricao === nome && l.categoria === 'Assinaturas' && l.recorrente &&
        (l.ano > anoAtual || (l.ano === anoAtual && l.mes >= mesAtual)));
    });
    FaciliteStorage.set('lancamentos', restantes);

    if (window.FaciliteSync) {
      paraRemover.forEach(function(l) { FaciliteSync.excluirLancamento(l.id); });
    }
    console.log('[Assinaturas] Removidos', paraRemover.length, 'lançamentos de', nome);
  },

  garantirLancamentosMesAtual() {
    const subs = FaciliteStorage.get('assinaturas') || [];
    const ativas = subs.filter(function(s) { return s.ativa; });
    if (ativas.length === 0) return;
    ativas.forEach(function(s) {
      var mesInicio = s.mesInicio || (new Date().getMonth() + 1);
      var anoInicio = s.anoInicio || new Date().getFullYear();
      AssinaturasPage._criarLancamentosMeses(s.nome, s.valor, s.diaVencimento || 5, 12, mesInicio, anoInicio);
    });
  },

  render() {
    const subs = FaciliteStorage.get('assinaturas') || [];
    const ativas = subs.filter(s => s.ativa);
    const total = ativas.reduce((s, a) => s + (a.valor || 0), 0);

    const elTotal = document.getElementById('subs-total');
    const lista   = document.getElementById('subs-ativas-list');
    const empty   = document.getElementById('subs-empty');
    if (elTotal) elTotal.textContent = fmtBRL(total);
    if (!lista) return;

    if (ativas.length === 0) {
      lista.innerHTML = '';
      if (empty) empty.style.display = 'block';
      return;
    }
    if (empty) empty.style.display = 'none';

    lista.innerHTML = ativas.map(s => `
      <div class="sub-card">
        <div class="sub-card__actions">
          <button type="button" class="lanc-act-btn" onclick="AssinaturasPage.toggleAtiva('${s.id}')" title="Desativar">⏸️</button>
          <button type="button" class="lanc-act-btn" onclick="AssinaturasPage.remover('${s.id}')" title="Remover">🗑️</button>
        </div>
        <div class="sub-card__header">
          <div class="sub-card__icon" style="background:${s.cor || '#22C55E'}22">${s.icone || '📱'}</div>
          <div class="sub-card__info">
            <div class="sub-card__nome">${escapeHTML(s.nome)}</div>
            <div class="sub-card__cat">${s.categoria || 'Assinaturas'}</div>
          </div>
        </div>
        <div class="sub-card__valor">${fmtBRL(s.valor)}<span style="font-size:12px;font-weight:400;color:#6B7280">/mês</span></div>
        <div class="sub-card__dia">Vence todo dia ${s.diaVencimento || '—'} · desde ${s.mesInicio || '?'}/${s.anoInicio || '?'}</div>
      </div>
    `).join('');
  },

  abrirModalNova() {
    const modal = document.getElementById('modal-assinatura');
    if (!modal) return;
    this.presetSelecionado = null;
    document.getElementById('sub-step-1').style.display = 'block';
    document.getElementById('sub-step-2').style.display = 'none';
    this.filtrarPresets('todos');
    modal.style.display = 'flex';
    modal.onclick = e => { if (e.target === modal) this.fecharModal(); };
  },

  fecharModal() {
    const modal = document.getElementById('modal-assinatura');
    if (modal) { modal.style.display = 'none'; }
  },

  filtrarPresets(cat) {
    this.filtroCategoria = cat;
    document.querySelectorAll('.sub-cat-btn').forEach(b => {
      const nomeCat = b.textContent.replace(/[^\w\sÀ-ÿ]/g, '').trim();
      b.classList.toggle('sub-cat-btn--active',
        cat === 'todos' ? b.textContent.includes('Todos') : nomeCat === cat
      );
    });

    const grid = document.getElementById('sub-preset-grid');
    if (!grid) return;

    const filtrados = cat === 'todos' ? ASSINATURAS_PRESET : ASSINATURAS_PRESET.filter(p => p.categoria === cat);
    grid.innerHTML = filtrados.map((p, i) => `
      <div class="sub-preset-card" onclick="AssinaturasPage.selecionarPreset(${ASSINATURAS_PRESET.indexOf(p)})">
        <span class="sub-preset-card__emoji">${p.emoji}</span>
        <span class="sub-preset-card__nome">${p.nome}</span>
      </div>
    `).join('');
  },

  selecionarPreset(idx) {
    const p = ASSINATURAS_PRESET[idx];
    if (!p) return;
    this.presetSelecionado = p;

    document.getElementById('sub-step-1').style.display = 'none';
    document.getElementById('sub-step-2').style.display = 'block';

    const preview = document.getElementById('sub-preview');
    if (preview) {
      preview.innerHTML = `
        <div style="width:46px;height:46px;border-radius:12px;background:${p.cor}22;display:flex;align-items:center;justify-content:center;font-size:22px;flex-shrink:0">${p.emoji}</div>
        <div>
          <div style="font-size:15px;font-weight:600;color:#F0FDF4">${p.nome}</div>
          <div style="font-size:12px;color:#4B5563">${p.categoria}</div>
        </div>
      `;
    }

    const customFields = document.getElementById('sub-custom-fields');
    if (customFields) customFields.style.display = p.nome === 'Personalizado' ? 'block' : 'none';

    document.getElementById('sub-valor').value = '';
    document.getElementById('sub-dia').value = '';
    setTimeout(() => document.getElementById('sub-valor')?.focus(), 100);
  },

  voltarPasso1() {
    document.getElementById('sub-step-1').style.display = 'block';
    document.getElementById('sub-step-2').style.display = 'none';
    this.presetSelecionado = null;
  },

  salvar() {
    if (window.FacilitePlano && !FacilitePlano.ehPago()) {
      FacilitePaywall.abrir('Para adicionar assinaturas, assine o Facilite Premium.');
      return;
    }
    const valor = parseValorBRL(document.getElementById('sub-valor')?.value);
    const dia   = parseInt(document.getElementById('sub-dia')?.value) || 5;

    if (!valor || valor <= 0) { FaciliteNotify.warning('Informe o valor da assinatura.'); return; }

    let nome, icone, cor, categoria;
    if (this.presetSelecionado?.nome === 'Personalizado') {
      nome = document.getElementById('sub-custom-nome')?.value?.trim();
      icone = document.getElementById('sub-custom-emoji')?.value?.trim() || '📱';
      cor = '#6B7280';
      categoria = 'Outros';
      if (!nome) { FaciliteNotify.warning('Informe o nome da assinatura.'); return; }
    } else {
      nome = this.presetSelecionado.nome;
      icone = this.presetSelecionado.emoji;
      cor = this.presetSelecionado.cor;
      categoria = this.presetSelecionado.categoria;
    }

    const subs = FaciliteStorage.get('assinaturas') || [];
    if (subs.some(s => s.nome === nome && s.ativa)) {
      FaciliteNotify.warning(`${nome} já está nas suas assinaturas.`);
      return;
    }

    // Usar o mês que o usuário está visualizando no dashboard
    const mesInicio = window.FaciliteState ? FaciliteState.mesAtual : new Date().getMonth() + 1;
    const anoInicio = window.FaciliteState ? FaciliteState.anoAtual : new Date().getFullYear();

    subs.push({
      id: FaciliteStorage.uid('s'),
      nome, icone, cor, valor,
      diaVencimento: dia, categoria, ativa: true,
      mesInicio, anoInicio,
    });
    FaciliteStorage.set('assinaturas', subs);
    if (window.FaciliteSync) FaciliteSync.salvarDadosUsuario();

    // Criar lançamentos a partir do mês selecionado
    this._criarLancamentosMeses(nome, valor, dia, 12, mesInicio, anoInicio);

    this.fecharModal();
    this.render();
    FaciliteState.refresh();
    FaciliteNotify.success(`${nome} adicionada! Lançamentos criados a partir de ${mesInicio}/${anoInicio}.`);
  },

  toggleAtiva(id) {
    const subs = FaciliteStorage.get('assinaturas') || [];
    const s = subs.find(x => x.id === id);
    if (!s) return;

    s.ativa = !s.ativa;
    FaciliteStorage.set('assinaturas', subs);
    if (window.FaciliteSync) FaciliteSync.salvarDadosUsuario();

    if (!s.ativa) {
      this._removerLancamentosFuturos(s.nome);
    } else {
      const mesInicio = s.mesInicio || (new Date().getMonth() + 1);
      const anoInicio = s.anoInicio || new Date().getFullYear();
      this._criarLancamentosMeses(s.nome, s.valor, s.diaVencimento || 5, 12, mesInicio, anoInicio);
    }

    this.render();
    FaciliteState.refresh();
    FaciliteNotify.info(s.ativa ? `${s.nome} reativada.` : `${s.nome} pausada.`);
  },

  remover(id) {
    if (!confirm('Remover esta assinatura? Os lançamentos futuros também serão removidos.')) return;
    const subs = FaciliteStorage.get('assinaturas') || [];
    const sub = subs.find(s => s.id === id);
    if (sub) this._removerLancamentosFuturos(sub.nome);
    FaciliteStorage.set('assinaturas', subs.filter(s => s.id !== id));
    if (window.FaciliteSync) FaciliteSync.salvarDadosUsuario();
    this.render();
    FaciliteState.refresh();
    FaciliteNotify.success('Assinatura e lançamentos futuros removidos.');
  },
};

FaciliteState.on('page-loaded', ({ page }) => {
  if (page === 'assinaturas') {
    AssinaturasPage.garantirLancamentosMesAtual();
    AssinaturasPage.init();
  }
});

FaciliteState.on('dados-changed', () => {
  if (FaciliteRouter.currentPage === 'assinaturas') AssinaturasPage.render();
});

window.AssinaturasPage = AssinaturasPage;
