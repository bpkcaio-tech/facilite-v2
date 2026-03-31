// ═══════════════════════════════════════════════════
//  FACILITE — CONTAS
// ═══════════════════════════════════════════════════

const ContasPage = {
  editandoId: null,
  corSelecionada: '#22C55E',

  init() { this.render(); },

  render() {
    const contas = FaciliteStorage.get('contas') || [];
    const lista = document.getElementById('lista-contas');
    const empty = document.getElementById('empty-contas');
    const elTotal = document.getElementById('contas-saldo-total');

    if (elTotal) elTotal.textContent = fmtBRL(FaciliteStorage.getSaldoContas());

    if (!lista) return;

    if (contas.length === 0) {
      lista.style.display = 'none';
      if (empty) empty.style.display = 'block';
      return;
    }
    lista.style.display = 'grid';
    if (empty) empty.style.display = 'none';

    lista.innerHTML = contas.map(c => `
      <div class="conta-card">
        <div class="conta-card__stripe" style="background:${c.cor || '#22C55E'}"></div>
        <div class="conta-card__actions">
          <button type="button" class="lanc-act-btn" onclick="ContasPage.editar('${c.id}')" title="Editar">✏️</button>
          <button type="button" class="lanc-act-btn" onclick="ContasPage.remover('${c.id}')" title="Remover">🗑️</button>
        </div>
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:14px;margin-top:4px">
          <div style="width:42px;height:42px;border-radius:12px;background:${c.cor || '#22C55E'}20;display:flex;align-items:center;justify-content:center;font-size:20px">${c.icone || '🏦'}</div>
          <div>
            <div style="font-size:14px;font-weight:600;color:#F0FDF4">${escapeHTML(c.nome)}</div>
            <div style="font-size:12px;color:#6B7280">${escapeHTML(c.banco || '')} · ${c.tipo === 'conectada' ? '🔗 Conectada' : '✍️ Manual'}</div>
          </div>
        </div>
        <div style="font-family:'Sora',sans-serif;font-size:22px;font-weight:700;color:${c.saldo >= 0 ? '#22C55E' : '#EF4444'}">${fmtBRL(c.saldo)}</div>
      </div>
    `).join('');
  },

  abrirModal(id) {
    this.editandoId = id || null;
    const modal = document.getElementById('modal-conta');
    const title = document.getElementById('modal-conta-title');
    if (!modal) return;

    if (id) {
      const contas = FaciliteStorage.get('contas') || [];
      const c = contas.find(x => x.id === id);
      if (!c) return;
      if (title) title.textContent = 'Editar Conta';
      document.getElementById('conta-nome').value = c.nome;
      document.getElementById('conta-banco').value = c.banco || '';
      document.getElementById('conta-saldo').value = c.saldo;
      document.getElementById('conta-tipo').value = c.tipo || 'manual';
      this.setCor(c.cor || '#22C55E');
    } else {
      if (title) title.textContent = 'Nova Conta';
      document.getElementById('conta-nome').value = '';
      document.getElementById('conta-banco').value = '';
      document.getElementById('conta-saldo').value = '';
      document.getElementById('conta-tipo').value = 'manual';
      this.setCor('#22C55E');
    }

    modal.style.display = 'flex';
    modal.onclick = e => { if (e.target === modal) this.fecharModal(); };
    setTimeout(() => document.getElementById('conta-nome')?.focus(), 100);
  },

  fecharModal() {
    const modal = document.getElementById('modal-conta');
    if (modal) { modal.style.display = 'none'; }
    this.editandoId = null;
  },

  setCor(cor) {
    this.corSelecionada = cor;
    document.querySelectorAll('#conta-cores .cor-btn').forEach(btn => {
      btn.classList.toggle('cor-btn--active', btn.getAttribute('onclick')?.includes(cor));
    });
  },

  salvar() {
    if (window.FacilitePlano && !FacilitePlano.ehPago()) {
      FacilitePaywall.abrir('Para adicionar contas, assine o Facilite Premium.');
      return;
    }
    const nome  = document.getElementById('conta-nome')?.value?.trim();
    const banco = document.getElementById('conta-banco')?.value?.trim();
    const saldo = parseValorBRL(document.getElementById('conta-saldo')?.value);
    const tipo  = document.getElementById('conta-tipo')?.value;

    if (!nome) { FaciliteNotify.warning('Informe o nome da conta.'); return; }

    const contas = FaciliteStorage.get('contas') || [];

    if (this.editandoId) {
      const idx = contas.findIndex(c => c.id === this.editandoId);
      if (idx >= 0) {
        contas[idx] = { ...contas[idx], nome, banco, saldo, tipo, cor: this.corSelecionada };
      }
      FaciliteNotify.success('Conta atualizada!');
    } else {
      contas.push({
        id: FaciliteStorage.uid('b'),
        nome, banco, saldo, tipo,
        cor: this.corSelecionada,
        icone: '🏦',
      });
      FaciliteNotify.success('Conta adicionada!');
    }

    FaciliteStorage.set('contas', contas);
    if (window.FaciliteSync && FaciliteSync.ready) {
      FaciliteSync.salvarDadosUsuario();
    }
    this.fecharModal();
    this.render();
    FaciliteState.refresh();
  },

  editar(id) { this.abrirModal(id); },

  remover(id) {
    if (!confirm('Remover esta conta?')) return;
    const contas = FaciliteStorage.get('contas') || [];
    FaciliteStorage.set('contas', contas.filter(c => c.id !== id));
    if (window.FaciliteSync && FaciliteSync.ready) {
      FaciliteSync.salvarDadosUsuario();
    }
    this.render();
    FaciliteState.refresh();
    FaciliteNotify.success('Conta removida.');
  },
};

FaciliteState.on('page-loaded', ({ page }) => {
  if (page === 'contas') ContasPage.init();
});

FaciliteState.on('dados-changed', () => {
  if (FaciliteRouter.currentPage === 'contas') ContasPage.render();
});

window.ContasPage = ContasPage;
