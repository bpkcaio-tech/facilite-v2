// ═══════════════════════════════════════════════════
//  FACILITE — RESERVAS FINANCEIRAS
//  Metas de poupança com progresso visual
// ═══════════════════════════════════════════════════

const EMOJIS_RESERVAS = [
  '🎯', '🛡️', '✈️', '🏖️', '🌍', '🏠', '🚗', '📱',
  '💻', '🎮', '📚', '🎓', '💍', '👶', '🐕', '🏋️',
  '🎸', '🎨', '📷', '🛒', '💰', '📈', '🏦', '🎁',
  '⭐', '🔥', '💎', '🏆', '❤️', '🌟', '🚀', '🎪',
];

const ReservasPage = {
  editandoId: null,
  valorReservaId: null,
  tipoValor: 'guardar',
  corSelecionada: '#22C55E',
  catSelecionada: 'Outros',
  iconeSelecionado: '🎯',

  init() { this.render(); },

  render() {
    const reservas = FaciliteStorage.get('reservas') || [];
    const lista = document.getElementById('reservas-lista');
    const empty = document.getElementById('reservas-empty');
    const elTotal = document.getElementById('reservas-total-guardado');
    const elMeta  = document.getElementById('reservas-total-meta');
    const elCount = document.getElementById('reservas-count');
    const elPct   = document.getElementById('reservas-pct-geral');
    const elComp  = document.getElementById('reservas-completas');

    const totalGuardado = reservas.reduce((s, r) => s + (r.atual || 0), 0);
    const totalMeta = reservas.reduce((s, r) => s + (r.meta || 0), 0);
    const pctGeral = totalMeta > 0 ? Math.round((totalGuardado / totalMeta) * 100) : 0;
    const completas = reservas.filter(r => r.atual >= r.meta).length;

    if (elTotal) elTotal.textContent = fmtBRL(totalGuardado);
    if (elMeta)  elMeta.textContent = `de ${fmtBRL(totalMeta)} em metas`;
    if (elCount) elCount.textContent = reservas.length;
    if (elPct)   { elPct.textContent = pctGeral + '%'; elPct.style.color = '#3B82F6'; }
    if (elComp)  elComp.textContent = completas;

    if (!lista) return;

    if (reservas.length === 0) {
      lista.innerHTML = '';
      if (empty) empty.style.display = 'block';
      return;
    }
    if (empty) empty.style.display = 'none';

    lista.innerHTML = reservas.map(r => {
      const pct = r.meta > 0 ? Math.min(Math.round((r.atual / r.meta) * 100), 100) : 0;
      const falta = Math.max(0, r.meta - r.atual);
      const completa = r.atual >= r.meta;
      const corBarra = completa ? '#22C55E' : pct >= 60 ? '#3B82F6' : pct >= 30 ? '#F59E0B' : '#6B7280';

      let prazoHTML = '';
      if (r.prazo) {
        const dias = Math.ceil((new Date(r.prazo) - new Date()) / 86400000);
        if (dias > 30) {
          const meses = Math.round(dias / 30);
          prazoHTML = `<span style="font-size:11px;color:#4B5563">${meses} ${meses === 1 ? 'mês' : 'meses'} restante${meses > 1 ? 's' : ''}</span>`;
        } else if (dias > 0) {
          prazoHTML = `<span style="font-size:11px;color:${dias <= 7 ? '#F59E0B' : '#4B5563'}">${dias} dias restantes</span>`;
        } else if (dias === 0) {
          prazoHTML = '<span style="font-size:11px;color:#EF4444">Prazo vence hoje!</span>';
        } else {
          prazoHTML = '<span style="font-size:11px;color:#EF4444">Prazo vencido</span>';
        }
      }

      // Quanto guardar por mês para atingir no prazo
      let sugestaoHTML = '';
      if (r.prazo && falta > 0) {
        const mesesRestantes = Math.max(1, Math.ceil((new Date(r.prazo) - new Date()) / (30 * 86400000)));
        const porMes = falta / mesesRestantes;
        sugestaoHTML = `<div style="font-size:11px;color:#3B82F6;margin-top:4px">💡 Guarde ${fmtBRL(porMes)}/mês para atingir no prazo</div>`;
      }

      return `
        <div class="reserva-card">
          <div class="reserva-card__stripe" style="background:${r.cor || '#22C55E'}"></div>
          <div class="reserva-card__actions">
            <button type="button" class="lanc-act-btn" onclick="ReservasPage.editar('${r.id}')" title="Editar">✏️</button>
            <button type="button" class="lanc-act-btn" onclick="ReservasPage.remover('${r.id}')" title="Remover">🗑️</button>
          </div>

          <div style="display:flex;align-items:center;gap:14px;margin-bottom:14px">
            <div style="width:48px;height:48px;border-radius:14px;background:${r.cor || '#22C55E'}15;display:flex;align-items:center;justify-content:center;font-size:24px">${r.icone || '🎯'}</div>
            <div style="flex:1">
              <div style="font-size:15px;font-weight:600;color:#F0FDF4;font-family:'Sora',sans-serif">${escapeHTML(r.nome)}</div>
              <div style="font-size:12px;color:#4B5563">${r.categoria || 'Outros'}</div>
            </div>
            ${completa ? '<span style="background:rgba(34,197,94,0.1);color:#22C55E;font-size:11px;padding:3px 10px;border-radius:6px;font-weight:600">✓ META ATINGIDA</span>' : ''}
          </div>

          <div style="display:flex;align-items:baseline;gap:8px">
            <span class="reserva-card__pct" style="color:${corBarra}">${pct}%</span>
            <span style="font-size:13px;color:#6B7280">${fmtBRL(r.atual)} de ${fmtBRL(r.meta)}</span>
          </div>

          <div class="reserva-card__progress">
            <div class="reserva-card__fill" style="width:${pct}%;background:linear-gradient(90deg,${r.cor || '#22C55E'},${corBarra})"></div>
          </div>

          <div style="display:flex;justify-content:space-between;align-items:center">
            <span style="font-size:12px;color:${falta > 0 ? '#6B7280' : '#22C55E'}">${falta > 0 ? 'Falta ' + fmtBRL(falta) : 'Meta completa! 🎉'}</span>
            ${prazoHTML}
          </div>
          ${sugestaoHTML}

          <button type="button" class="reserva-card__btn" onclick="ReservasPage.abrirModalValor('${r.id}')">
            ${completa ? '📤 Retirar' : '💰 Guardar dinheiro'}
          </button>
        </div>`;
    }).join('');
  },

  // ── Modal criar/editar ─────────────────────────────
  abrirModal(id) {
    this.editandoId = id || null;
    const modal = document.getElementById('modal-reserva');
    const title = document.getElementById('modal-reserva-title');
    if (!modal) return;

    if (id) {
      const reservas = FaciliteStorage.get('reservas') || [];
      const r = reservas.find(x => x.id === id);
      if (!r) return;
      if (title) title.textContent = 'Editar Reserva';
      document.getElementById('reserva-nome').value = r.nome;
      document.getElementById('reserva-meta').value = r.meta;
      document.getElementById('reserva-atual').value = r.atual;
      // Formatar data ISO → DD/MM/AAAA
      const prazoEl = document.getElementById('reserva-prazo');
      if (prazoEl && r.prazo) {
        const [y, m, d] = r.prazo.split('-');
        prazoEl.value = `${d}/${m}/${y}`;
      } else if (prazoEl) { prazoEl.value = ''; }
      this.setCor(r.cor || '#22C55E');
      this.setCat(r.categoria || 'Outros');
      this.setIcone(r.icone || '🎯');
    } else {
      if (title) title.textContent = 'Nova Reserva';
      document.getElementById('reserva-nome').value = '';
      document.getElementById('reserva-meta').value = '';
      document.getElementById('reserva-atual').value = '';
      document.getElementById('reserva-prazo').value = '';
      this.setCor('#22C55E');
      this.setCat('Outros');
      this.setIcone('🎯');
    }

    modal.style.display = 'flex';
    modal.onclick = e => { if (e.target === modal) this.fecharModal(); };
    setTimeout(() => document.getElementById('reserva-nome')?.focus(), 100);
  },

  fecharModal() {
    const modal = document.getElementById('modal-reserva');
    if (modal) modal.style.display = 'none';
    this.editandoId = null;
  },

  setCor(cor) {
    this.corSelecionada = cor;
    document.querySelectorAll('#reserva-cores .cor-btn').forEach(btn => {
      btn.classList.toggle('cor-btn--active', btn.getAttribute('onclick')?.includes(cor));
    });
  },

  setCat(cat) {
    this.catSelecionada = cat;
    document.querySelectorAll('#reserva-cats .toggle-btn').forEach(btn => {
      btn.classList.toggle('toggle-btn--active-subtle', btn.dataset.cat === cat);
    });
  },

  setIcone(emoji) {
    this.iconeSelecionado = emoji;
    const btn = document.getElementById('reserva-icone-btn');
    if (btn) btn.textContent = emoji;
  },

  abrirEmojiPicker() {
    const btn = document.getElementById('reserva-icone-btn');
    let picker = document.getElementById('emoji-picker-reserva');

    if (picker) { picker.remove(); return; }

    picker = document.createElement('div');
    picker.id = 'emoji-picker-reserva';
    picker.style.cssText = 'position:absolute;z-index:100002;background:#0D1B12;border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:10px;box-shadow:0 12px 36px rgba(0,0,0,0.5);width:280px';
    picker.innerHTML = `<div class="emoji-grid">${EMOJIS_RESERVAS.map(e =>
      `<button type="button" class="emoji-opt" onclick="ReservasPage.setIcone('${e}');document.getElementById('emoji-picker-reserva')?.remove()">${e}</button>`
    ).join('')}</div>`;

    btn.parentElement.style.position = 'relative';
    btn.parentElement.appendChild(picker);

    setTimeout(() => {
      const handler = (ev) => {
        if (!picker.contains(ev.target) && ev.target !== btn) {
          picker.remove();
          document.removeEventListener('click', handler);
        }
      };
      document.addEventListener('click', handler);
    }, 10);
  },

  // ── Date picker (mesmo estilo do lancamentos) ─────
  _dpMes: 0, _dpAno: 0,

  onPrazoInput(el) {
    let v = el.value.replace(/\D/g, '');
    if (v.length > 2) v = v.slice(0, 2) + '/' + v.slice(2);
    if (v.length > 5) v = v.slice(0, 5) + '/' + v.slice(5, 9);
    el.value = v;
  },

  _getPrazoISO() {
    const val = document.getElementById('reserva-prazo')?.value || '';
    const m = val.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (m) return `${m[3]}-${m[2]}-${m[1]}`;
    return null;
  },

  abrirDatePicker() {
    const dp = document.getElementById('reserva-datepicker');
    if (!dp) return;
    if (dp.style.display !== 'none') { dp.style.display = 'none'; return; }
    const hoje = new Date();
    const iso = this._getPrazoISO();
    if (iso) {
      const d = new Date(iso + 'T12:00:00');
      this._dpMes = d.getMonth() + 1;
      this._dpAno = d.getFullYear();
    } else {
      this._dpMes = hoje.getMonth() + 1;
      this._dpAno = hoje.getFullYear();
    }
    dp.style.display = 'block';
    this._renderDP();
  },

  _renderDP() {
    const dp = document.getElementById('reserva-datepicker');
    if (!dp) return;
    const meses = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
    const diasSemana = ['D','S','T','Q','Q','S','S'];
    const diasNoMes = new Date(this._dpAno, this._dpMes, 0).getDate();
    const primeiroDia = new Date(this._dpAno, this._dpMes - 1, 1).getDay();
    const diasMesAnt = new Date(this._dpAno, this._dpMes - 1, 0).getDate();
    const hoje = new Date();
    const hojeStr = `${hoje.getFullYear()}-${hoje.getMonth() + 1}-${hoje.getDate()}`;
    const selISO = this._getPrazoISO();
    let selStr = '';
    if (selISO) { const d = new Date(selISO + 'T12:00:00'); selStr = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`; }

    let dias = '';
    for (let i = primeiroDia - 1; i >= 0; i--) {
      dias += `<button type="button" class="dp-day dp-day--other">${diasMesAnt - i}</button>`;
    }
    for (let d = 1; d <= diasNoMes; d++) {
      const chk = `${this._dpAno}-${this._dpMes}-${d}`;
      const cls = ['dp-day'];
      if (chk === hojeStr) cls.push('dp-day--today');
      if (chk === selStr) cls.push('dp-day--selected');
      dias += `<button type="button" class="${cls.join(' ')}" onclick="ReservasPage._dpSelect(${d})">${d}</button>`;
    }
    const total = primeiroDia + diasNoMes;
    const rest = total % 7 === 0 ? 0 : 7 - (total % 7);
    for (let d = 1; d <= rest; d++) { dias += `<button type="button" class="dp-day dp-day--other">${d}</button>`; }

    dp.innerHTML = `
      <div class="dp-header">
        <span class="dp-title">${meses[this._dpMes - 1]} ${this._dpAno}</span>
        <div class="dp-nav-group">
          <button type="button" class="dp-nav" onclick="event.stopPropagation();ReservasPage._dpNav(-1)">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          <button type="button" class="dp-nav" onclick="event.stopPropagation();ReservasPage._dpNav(1)">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
        </div>
      </div>
      <div class="dp-weekdays">${diasSemana.map(d => `<span class="dp-weekday">${d}</span>`).join('')}</div>
      <div class="dp-days">${dias}</div>
    `;
  },

  _dpNav(dir) {
    this._dpMes += dir;
    if (this._dpMes > 12) { this._dpMes = 1; this._dpAno++; }
    if (this._dpMes < 1) { this._dpMes = 12; this._dpAno--; }
    this._renderDP();
  },

  _dpSelect(dia) {
    const d = String(dia).padStart(2, '0');
    const m = String(this._dpMes).padStart(2, '0');
    const input = document.getElementById('reserva-prazo');
    if (input) input.value = `${d}/${m}/${this._dpAno}`;
    const dp = document.getElementById('reserva-datepicker');
    if (dp) dp.style.display = 'none';
  },

  salvar() {
    if (window.FacilitePlano && !FacilitePlano.ehPago()) {
      FacilitePaywall.abrir('Para criar reservas, assine o Facilite Premium.');
      return;
    }
    const nome  = document.getElementById('reserva-nome')?.value?.trim();
    const meta  = parseValorBRL(document.getElementById('reserva-meta')?.value);
    const atual = parseValorBRL(document.getElementById('reserva-atual')?.value);
    const prazo = this._getPrazoISO();

    if (!nome) { FaciliteNotify.warning('Informe o nome da reserva.'); return; }
    if (!meta || meta <= 0) { FaciliteNotify.warning('Informe uma meta válida.'); return; }

    const reservas = FaciliteStorage.get('reservas') || [];

    if (this.editandoId) {
      const idx = reservas.findIndex(r => r.id === this.editandoId);
      if (idx >= 0) {
        reservas[idx] = {
          ...reservas[idx], nome, meta, atual: atual || reservas[idx].atual,
          prazo, cor: this.corSelecionada, categoria: this.catSelecionada,
          icone: this.iconeSelecionado,
        };
      }
      FaciliteNotify.success('Reserva atualizada!');
    } else {
      reservas.push({
        id: FaciliteStorage.uid('r'),
        nome, icone: this.iconeSelecionado, cor: this.corSelecionada,
        meta, atual: atual || 0, categoria: this.catSelecionada,
        criadoEm: new Date().toISOString().split('T')[0], prazo,
      });
      FaciliteNotify.success(`Reserva "${nome}" criada!`);
    }

    FaciliteStorage.set('reservas', reservas);
    this.fecharModal();
    this.render();
    FaciliteState.refresh();
  },

  editar(id) { this.abrirModal(id); },

  remover(id) {
    if (!confirm('Remover esta reserva?')) return;
    const reservas = FaciliteStorage.get('reservas') || [];
    FaciliteStorage.set('reservas', reservas.filter(r => r.id !== id));
    this.render();
    FaciliteState.refresh();
    FaciliteNotify.success('Reserva removida.');
  },

  // ── Modal guardar/retirar valor ────────────────────
  abrirModalValor(id) {
    this.valorReservaId = id;
    this.tipoValor = 'guardar';
    const modal = document.getElementById('modal-reserva-valor');
    const title = document.getElementById('modal-rv-title');
    const info  = document.getElementById('modal-rv-info');
    if (!modal) return;

    const reservas = FaciliteStorage.get('reservas') || [];
    const r = reservas.find(x => x.id === id);
    if (!r) return;

    const pct = r.meta > 0 ? Math.round((r.atual / r.meta) * 100) : 0;
    const falta = Math.max(0, r.meta - r.atual);

    if (title) title.textContent = r.atual >= r.meta ? 'Retirar da reserva' : 'Guardar dinheiro';
    if (info) {
      info.innerHTML = `
        <div style="display:flex;align-items:center;gap:10px">
          <span style="font-size:24px">${r.icone || '🎯'}</span>
          <div>
            <div style="font-size:14px;font-weight:600;color:#F0FDF4">${escapeHTML(r.nome)}</div>
            <div style="font-size:12px;color:#6B7280">${fmtBRL(r.atual)} de ${fmtBRL(r.meta)} · ${pct}%${falta > 0 ? ' · falta ' + fmtBRL(falta) : ''}</div>
          </div>
        </div>`;
    }

    this.setTipoValor(r.atual >= r.meta ? 'retirar' : 'guardar');
    document.getElementById('rv-valor').value = '';

    modal.style.display = 'flex';
    modal.onclick = e => { if (e.target === modal) modal.style.display = 'none'; };
    setTimeout(() => document.getElementById('rv-valor')?.focus(), 100);
  },

  setTipoValor(tipo) {
    this.tipoValor = tipo;
    const btnG = document.getElementById('btn-rv-guardar');
    const btnR = document.getElementById('btn-rv-retirar');
    if (btnG) btnG.classList.toggle('toggle-btn--active', tipo === 'guardar');
    if (btnR) btnR.classList.toggle('toggle-btn--active', tipo === 'retirar');
  },

  confirmarValor() {
    if (window.FacilitePlano && !FacilitePlano.ehPago()) {
      FacilitePaywall.abrir('Para guardar dinheiro em reservas, assine o Facilite Premium.');
      return;
    }
    const valor = parseValorBRL(document.getElementById('rv-valor')?.value);
    if (!valor || valor <= 0) { FaciliteNotify.warning('Informe um valor.'); return; }

    const reservas = FaciliteStorage.get('reservas') || [];
    const r = reservas.find(x => x.id === this.valorReservaId);
    if (!r) return;

    if (this.tipoValor === 'guardar') {
      r.atual = (r.atual || 0) + valor;
      const atingiu = r.atual >= r.meta;
      FaciliteNotify.success(`${fmtBRL(valor)} adicionado à "${r.nome}"!${atingiu ? ' 🎉 Meta atingida!' : ''}`);
    } else {
      r.atual = Math.max(0, (r.atual || 0) - valor);
      FaciliteNotify.info(`${fmtBRL(valor)} retirado de "${r.nome}".`);
    }

    FaciliteStorage.set('reservas', reservas);
    document.getElementById('modal-reserva-valor').style.display = 'none';
    this.render();
    FaciliteState.refresh();
  },
};

// ── Events ───────────────────────────────────────────
FaciliteState.on('page-loaded', ({ page }) => {
  if (page === 'reservas') ReservasPage.init();
});

FaciliteState.on('dados-changed', () => {
  if (FaciliteRouter.currentPage === 'reservas') ReservasPage.render();
});

window.ReservasPage = ReservasPage;
