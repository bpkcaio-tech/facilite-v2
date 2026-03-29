// ═══════════════════════════════════════════════════
//  FACILITE — CARTÕES
// ═══════════════════════════════════════════════════

const CartoesPage = {
  editandoId: null,
  corSelecionada: '#820AD1',
  bandeiraSelecionada: 'mastercard',

  BANDEIRA_LABEL: { visa: 'VISA', mastercard: 'MASTERCARD', elo: 'ELO', amex: 'AMEX', outro: '' },

  init() { this.render(); },

  render() {
    const cartoes = FaciliteStorage.get('cartoes') || [];
    const lista = document.getElementById('lista-cartoes');
    const empty = document.getElementById('empty-cartoes');
    const elTotal = document.getElementById('cartoes-limite-total');

    const totalDisp = cartoes.reduce((s, c) => s + (c.limiteDisponivel || 0), 0);
    if (elTotal) elTotal.textContent = fmtBRL(totalDisp);
    if (!lista) return;

    if (cartoes.length === 0) {
      lista.style.display = 'none';
      if (empty) empty.style.display = 'block';
      return;
    }
    lista.style.display = 'grid';
    if (empty) empty.style.display = 'none';

    lista.innerHTML = cartoes.map(c => {
      const usado = c.limiteTotal - c.limiteDisponivel;
      const pctUsado = c.limiteTotal > 0 ? Math.round((usado / c.limiteTotal) * 100) : 0;
      const corBarra = pctUsado >= 80 ? '#EF4444' : pctUsado >= 50 ? '#F59E0B' : '#22C55E';
      const bandeira = this.BANDEIRA_LABEL[c.bandeira] || c.bandeira || '';

      return `
        <div class="cc-card-wrap">
          <div class="cc-card-actions">
            <button type="button" class="cc-act" onclick="CartoesPage.editar('${c.id}')" title="Editar">✏️</button>
            <button type="button" class="cc-act" onclick="CartoesPage.remover('${c.id}')" title="Remover">🗑️</button>
          </div>
          <div class="cc-visual" style="background:linear-gradient(145deg,${c.cor || '#820AD1'},${c.cor || '#820AD1'}AA,${c.cor || '#820AD1'}55)">
            <div>
              <div class="cc-visual__chip"></div>
              <div class="cc-visual__nome">${escapeHTML(c.nome)}</div>
              <div class="cc-visual__numero">•••• •••• •••• ${c.numeroFinal || '0000'}</div>
            </div>
            <div class="cc-visual__bottom">
              <div>
                <div class="cc-visual__titular">${escapeHTML(c.titular || 'TITULAR')}</div>
                <div class="cc-visual__validade">${c.vencimentoCartao || '--/--'}</div>
              </div>
              <div class="cc-visual__bandeira">${bandeira}</div>
            </div>
          </div>
          <div class="cc-info">
            <div class="cc-info-row">
              <span class="cc-info-label">Limite total</span>
              <span class="cc-info-val">${fmtBRL(c.limiteTotal)}</span>
            </div>
            <div class="cc-info-row">
              <span class="cc-info-label">Disponível</span>
              <span class="cc-info-val" style="color:#22C55E">${fmtBRL(c.limiteDisponivel)}</span>
            </div>
            <div class="cc-info-row">
              <span class="cc-info-label">Fatura atual</span>
              <span class="cc-info-val" style="color:${usado > 0 ? '#EF4444' : '#6B7280'}">${usado > 0 ? fmtBRL(usado) : 'Sem fatura'}</span>
            </div>
            <div class="cc-info-row">
              <span class="cc-info-label">Venc. fatura</span>
              <span class="cc-info-val">Dia ${c.vencimentoFatura || '—'}</span>
            </div>
            <div style="margin-top:10px">
              <div style="display:flex;justify-content:space-between;font-size:11px;color:#4B5563;margin-bottom:5px">
                <span>Uso do limite</span>
                <span style="color:${corBarra}">${pctUsado}%</span>
              </div>
              <div style="height:6px;background:rgba(255,255,255,0.03);border-radius:3px;overflow:hidden">
                <div style="height:100%;width:${pctUsado}%;background:${corBarra};border-radius:3px;transition:width 0.6s"></div>
              </div>
            </div>
            <button class="btn-outline-sm" style="margin-top:12px" onclick="FaturasEngine.abrirFatura('${c.id}')">Ver fatura detalhada</button>
          </div>
        </div>`;
    }).join('');
  },

  // ── Modal ──────────────────────────────────────────
  abrirModal(id) {
    this.editandoId = id || null;
    const modal = document.getElementById('modal-cartao');
    const title = document.getElementById('modal-cartao-title');
    if (!modal) return;

    if (id) {
      const cartoes = FaciliteStorage.get('cartoes') || [];
      const c = cartoes.find(x => x.id === id);
      if (!c) return;
      if (title) title.textContent = 'Editar Cartão';
      document.getElementById('cartao-nome').value = c.nome;
      document.getElementById('cartao-final').value = c.numeroFinal || '';
      document.getElementById('cartao-titular').value = c.titular || '';
      document.getElementById('cartao-limite').value = c.limiteTotal;
      document.getElementById('cartao-disponivel').value = c.limiteDisponivel;
      document.getElementById('cartao-venc-fatura').value = c.vencimentoFatura || '';
      document.getElementById('cartao-validade').value = c.vencimentoCartao || '';
      this.setBandeira(c.bandeira || 'mastercard');
      this.setCor(c.cor || '#820AD1');
    } else {
      if (title) title.textContent = 'Novo Cartão';
      document.getElementById('cartao-nome').value = '';
      document.getElementById('cartao-final').value = '';
      document.getElementById('cartao-titular').value = '';
      document.getElementById('cartao-limite').value = '';
      document.getElementById('cartao-disponivel').value = '';
      document.getElementById('cartao-venc-fatura').value = '';
      document.getElementById('cartao-validade').value = '';
      this.setBandeira('mastercard');
      this.setCor('#820AD1');
    }

    modal.style.display = 'flex';
    modal.onclick = e => { if (e.target === modal) this.fecharModal(); };
    setTimeout(() => document.getElementById('cartao-nome')?.focus(), 100);
  },

  fecharModal() {
    const modal = document.getElementById('modal-cartao');
    if (modal) modal.style.display = 'none';
    this.editandoId = null;
  },

  setBandeira(b) {
    this.bandeiraSelecionada = b;
    document.querySelectorAll('#bandeira-group .bandeira-btn').forEach(btn => {
      btn.classList.toggle('bandeira-btn--active', btn.dataset.b === b);
    });
  },

  setCor(cor) {
    this.corSelecionada = cor;
    document.querySelectorAll('.cor-btn').forEach(btn => {
      const match = btn.style.backgroundColor === cor || btn.style.background === cor;
      btn.classList.toggle('cor-btn--active', match);
    });
    // Fallback: match by rgb
    document.querySelectorAll('.cor-btn').forEach(btn => {
      btn.classList.remove('cor-btn--active');
    });
    document.querySelectorAll('.cor-btn').forEach(btn => {
      if (btn.getAttribute('onclick')?.includes(cor)) {
        btn.classList.add('cor-btn--active');
      }
    });
  },

  formatarValidade(el) {
    let v = el.value.replace(/[^\d]/g, '');
    if (v.length > 4) v = v.slice(0, 4);
    if (v.length >= 3) v = v.slice(0, 2) + '/' + v.slice(2);
    el.value = v;
  },

  salvar() {
    const nome       = document.getElementById('cartao-nome')?.value?.trim();
    const final4     = document.getElementById('cartao-final')?.value?.trim();
    const titular    = document.getElementById('cartao-titular')?.value?.trim();
    const limite     = parseValorBRL(document.getElementById('cartao-limite')?.value);
    const disponivel = parseValorBRL(document.getElementById('cartao-disponivel')?.value);
    const vencFatura = parseInt(document.getElementById('cartao-venc-fatura')?.value) || 1;
    const validade   = document.getElementById('cartao-validade')?.value?.trim();
    const limDisp    = isNaN(disponivel) ? limite : disponivel;

    if (!nome) { FaciliteNotify.warning('Informe o nome do banco.'); return; }
    if (limite <= 0) { FaciliteNotify.warning('Informe o limite do cartão.'); return; }

    const cartoes = FaciliteStorage.get('cartoes') || [];

    if (this.editandoId) {
      const idx = cartoes.findIndex(c => c.id === this.editandoId);
      if (idx >= 0) {
        cartoes[idx] = {
          ...cartoes[idx], nome, numeroFinal: final4, titular,
          bandeira: this.bandeiraSelecionada, limiteTotal: limite,
          limiteDisponivel: limDisp, vencimentoFatura: vencFatura,
          vencimentoCartao: validade, cor: this.corSelecionada,
        };
      }
      FaciliteNotify.success('Cartão atualizado!');
    } else {
      cartoes.push({
        id: FaciliteStorage.uid('c'),
        nome, bandeira: this.bandeiraSelecionada, cor: this.corSelecionada,
        numeroFinal: final4, titular: titular || 'TITULAR',
        limiteTotal: limite, limiteDisponivel: limDisp,
        vencimentoFatura: vencFatura, vencimentoCartao: validade,
      });
      FaciliteNotify.success('Cartão adicionado!');
    }

    FaciliteStorage.set('cartoes', cartoes);
    this.fecharModal();
    this.render();
    FaciliteState.refresh();
  },

  editar(id) { this.abrirModal(id); },

  remover(id) {
    if (!confirm('Remover este cartão?')) return;
    const cartoes = FaciliteStorage.get('cartoes') || [];
    FaciliteStorage.set('cartoes', cartoes.filter(c => c.id !== id));
    this.render();
    FaciliteState.refresh();
    FaciliteNotify.success('Cartão removido.');
  },

  // ── Ver fatura detalhada ───────────────────────────
  _mostrarFatura(cartaoId) {
    const cartoes = FaciliteStorage.get('cartoes') || [];
    const c = cartoes.find(x => x.id === cartaoId);
    if (!c) return;

    const mes = FaciliteState.mesAtual;
    const ano = FaciliteState.anoAtual;
    const lancamentos = FaciliteStorage.getLancamentosMes(mes, ano)
      .filter(l => l.cartaoId === cartaoId)
      .sort((a, b) => new Date(b.data) - new Date(a.data));

    const totalFatura = lancamentos.reduce((s, l) => s + Math.abs(l.valor), 0);
    const usado = c.limiteTotal - c.limiteDisponivel;
    const pctLimite = c.limiteTotal > 0 ? Math.round((usado / c.limiteTotal) * 100) : 0;
    const receita = FaciliteStorage.get('receita')?.mensal || 0;
    const pctRenda = receita > 0 ? Math.round((totalFatura / receita) * 100) : 0;
    const corBarra = pctLimite >= 80 ? '#EF4444' : pctLimite >= 50 ? '#F59E0B' : '#22C55E';

    const alertaRenda = pctRenda > 30
      ? `<div style="background:rgba(245,158,11,0.08);border:1px solid rgba(245,158,11,0.2);border-radius:10px;padding:12px 14px;margin-bottom:16px;font-size:13px;color:#F59E0B">
          ⚠️ Este cartão compromete <strong>${pctRenda}%</strong> da sua renda mensal. Considere reduzir os gastos.
        </div>`
      : '';

    const lancHTML = lancamentos.length === 0
      ? '<div style="padding:20px;text-align:center;color:#4B5563;font-size:13px">Nenhum lançamento neste cartão este mês</div>'
      : lancamentos.map(l => `
          <div style="display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.025)">
            <div style="flex:1;min-width:0">
              <div style="font-size:13px;color:#F0FDF4;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escapeHTML(l.descricao)}</div>
              <div style="font-size:11px;color:#4B5563">${new Date(l.data + 'T12:00:00').toLocaleDateString('pt-BR', {day:'2-digit',month:'2-digit'})} · ${l.categoria}</div>
            </div>
            <span style="color:#EF4444;font-weight:700;font-size:13px;font-family:'Sora',sans-serif">-${fmtBRL(Math.abs(l.valor))}</span>
          </div>
        `).join('');

    // Criar modal de fatura
    let modal = document.getElementById('modal-fatura');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'modal-fatura';
      modal.className = 'modal-overlay';
      document.body.appendChild(modal);
    }

    modal.innerHTML = `
      <div class="modal-box" style="width:440px">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px">
          <h3 class="modal-title" style="margin:0">Fatura ${escapeHTML(c.nome)}</h3>
          <button type="button" onclick="document.getElementById('modal-fatura').style.display='none'" style="background:none;border:none;color:#6B7280;cursor:pointer;font-size:18px;padding:4px">✕</button>
        </div>

        ${alertaRenda}

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px">
          <div style="background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.04);border-radius:10px;padding:14px">
            <div style="font-size:11px;color:#4B5563;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px">Total fatura</div>
            <div style="font-size:20px;font-weight:700;color:#EF4444;font-family:'Sora',sans-serif">${fmtBRL(totalFatura)}</div>
          </div>
          <div style="background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.04);border-radius:10px;padding:14px">
            <div style="font-size:11px;color:#4B5563;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px">Disponível</div>
            <div style="font-size:20px;font-weight:700;color:#22C55E;font-family:'Sora',sans-serif">${fmtBRL(c.limiteDisponivel)}</div>
          </div>
        </div>

        <!-- Barra de limite -->
        <div style="margin-bottom:16px">
          <div style="display:flex;justify-content:space-between;font-size:11px;margin-bottom:5px">
            <span style="color:#EF4444;font-weight:600">${pctLimite}% usado</span>
            <span style="color:#22C55E;font-weight:600">${100 - pctLimite}% disponível</span>
          </div>
          <div style="height:8px;background:rgba(255,255,255,0.03);border-radius:4px;overflow:hidden">
            <div style="height:100%;width:${pctLimite}%;background:${corBarra};border-radius:4px;transition:width 0.5s"></div>
          </div>
        </div>

        <!-- Lançamentos do cartão -->
        <div style="font-size:13px;font-weight:600;color:#F0FDF4;margin-bottom:8px">Lançamentos no cartão</div>
        <div style="max-height:250px;overflow-y:auto">${lancHTML}</div>
      </div>
    `;

    modal.style.display = 'flex';
    modal.onclick = e => { if (e.target === modal) modal.style.display = 'none'; };
  },
};

FaciliteState.on('page-loaded', ({ page }) => {
  if (page === 'cartoes') CartoesPage.init();
});

FaciliteState.on('dados-changed', () => {
  if (FaciliteRouter.currentPage === 'cartoes') CartoesPage.render();
});

window.CartoesPage = CartoesPage;
