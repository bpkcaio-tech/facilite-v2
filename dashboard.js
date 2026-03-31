// ═══════════════════════════════════════════════════
//  FACILITE — DASHBOARD JS
// ═══════════════════════════════════════════════════

// ── DATA E HORA NO TOPBAR ─────────────────────────
function atualizarDataTopbar() {
  const agora = new Date();
  const mobile = window.innerWidth <= 600;
  const opcoes = mobile
    ? { day:'2-digit', month:'short' }
    : { weekday:'long', day:'2-digit', month:'long', year:'numeric' };
  const dataFormatada = agora.toLocaleDateString('pt-BR', opcoes);
  const texto = dataFormatada.charAt(0).toUpperCase() + dataFormatada.slice(1);
  const elData = document.getElementById('data-topbar');
  if (elData) elData.textContent = texto;
}

atualizarDataTopbar();
setInterval(atualizarDataTopbar, 60000);

// Inicializa charts — chamado no DOMContentLoaded e ao voltar ao dashboard
function initDashboardCharts() {

  // ── GAUGE — valor definido dinamicamente por charts-update.js ──

  // ── CHART.JS — FLOW CHART (reativo) ──────────────
  const flowCtx = document.getElementById('flowChart');
  if (flowCtx) {
    const ctx = flowCtx.getContext('2d');

    const gradGreen = ctx.createLinearGradient(0, 0, 0, 220);
    gradGreen.addColorStop(0, 'rgba(34,197,94,0.85)');
    gradGreen.addColorStop(1, 'rgba(20,83,45,0.85)');

    const gradRed = ctx.createLinearGradient(0, 0, 0, 220);
    gradRed.addColorStop(0, 'rgba(239,68,68,0.85)');
    gradRed.addColorStop(1, 'rgba(127,29,29,0.85)');

    // Calcular últimos 6 meses a partir dos dados reais
    function calcularFluxo6Meses() {
      const mesesNome = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
      const labels = [];
      const receitas = [];
      const despesas = [];
      const hoje = new Date();

      for (let i = 5; i >= 0; i--) {
        const d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
        const mes = d.getMonth() + 1;
        const ano = d.getFullYear();
        labels.push(mesesNome[mes - 1]);

        if (window.FaciliteStorage) {
          const totais = FaciliteStorage.getTotaisMes(mes, ano);
          receitas.push(totais.receita);
          despesas.push(totais.despesas);
        } else {
          receitas.push(0);
          despesas.push(0);
        }
      }
      return { labels, receitas, despesas };
    }

    const dados6m = calcularFluxo6Meses();

    const flowChart = new Chart(flowCtx, {
      type: 'bar',
      data: {
        labels: dados6m.labels,
        datasets: [
          {
            label: 'Receitas',
            data: dados6m.receitas,
            backgroundColor: gradGreen,
            borderRadius: 6,
            borderSkipped: false,
            barPercentage: 0.4,
            categoryPercentage: 0.8,
          },
          {
            label: 'Despesas',
            data: dados6m.despesas,
            backgroundColor: gradRed,
            borderRadius: 6,
            borderSkipped: false,
            barPercentage: 0.4,
            categoryPercentage: 0.8,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 900, easing: 'easeOutQuart' },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#0F1A12',
            borderColor: 'rgba(255,255,255,0.08)',
            borderWidth: 1,
            titleColor: '#F0FDF4',
            bodyColor: '#6B7280',
            titleFont: { family: 'Sora', weight: '600', size: 13 },
            bodyFont: { family: 'DM Sans', size: 12 },
            padding: 12,
            cornerRadius: 10,
            callbacks: {
              label: c => ` R$ ${c.parsed.y.toLocaleString('pt-BR')}`,
            },
          },
        },
        scales: {
          x: {
            grid: { color: 'rgba(255,255,255,0.04)', drawBorder: false },
            ticks: { color: '#6B7280', font: { family: 'DM Sans', size: 11 } },
            border: { display: false },
          },
          y: {
            grid: { color: 'rgba(255,255,255,0.04)', drawBorder: false },
            beginAtZero: true,
            ticks: {
              color: '#6B7280',
              font: { family: 'DM Sans', size: 11 },
              maxTicksLimit: 5,
              callback: v => v === 0 ? 'R$ 0' : 'R$ ' + (v / 1000).toFixed(0) + 'k',
            },
            border: { display: false },
          },
        },
      },
    });

    // Expor função de atualização global
    window.atualizarGraficoFluxo = function() {
      const novo = calcularFluxo6Meses();
      flowChart.data.labels = novo.labels;
      flowChart.data.datasets[0].data = novo.receitas;
      flowChart.data.datasets[1].data = novo.despesas;
      flowChart.update();
    };

    // Tab switching
    let tabAtual = 'all';
    document.querySelectorAll('.chart-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.chart-tab').forEach(t => t.classList.remove('chart-tab--active'));
        tab.classList.add('chart-tab--active');
        tabAtual = tab.dataset.tab;

        const atual = calcularFluxo6Meses();
        if (tabAtual === 'all') {
          flowChart.data.datasets[0].data = atual.receitas;
          flowChart.data.datasets[1].data = atual.despesas;
        } else if (tabAtual === 'receitas') {
          flowChart.data.datasets[0].data = atual.receitas;
          flowChart.data.datasets[1].data = Array(6).fill(0);
        } else {
          flowChart.data.datasets[0].data = Array(6).fill(0);
          flowChart.data.datasets[1].data = atual.despesas;
        }
        flowChart.update();
      });
    });
  }

} // fim de initDashboardCharts()

window.initDashboardCharts = initDashboardCharts;
const DashNav = {
  MESES: ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'],
  init() { this._atualizarLabel(); },
  mesAnterior() {
    let m = FaciliteState.mesAtual - 1, a = FaciliteState.anoAtual;
    if (m < 1) { m = 12; a--; }
    FaciliteState.setMes(m, a);
    this._atualizarLabel();
    if (typeof window.atualizarCards === 'function') window.atualizarCards();
  },
  mesProximo() {
    let m = FaciliteState.mesAtual + 1, a = FaciliteState.anoAtual;
    if (m > 12) { m = 1; a++; }
    FaciliteState.setMes(m, a);
    this._atualizarLabel();
    if (typeof window.atualizarCards === 'function') window.atualizarCards();
  },
  _atualizarLabel() {
    const el = document.getElementById('dash-mes-label');
    if (!el) return;
    el.textContent = this.MESES[FaciliteState.mesAtual - 1] + ' ' + FaciliteState.anoAtual;
    const hoje = new Date();
    el.style.color = (FaciliteState.mesAtual === hoje.getMonth()+1 && FaciliteState.anoAtual === hoje.getFullYear()) ? '#F0FDF4' : '#22C55E';
  },
};
window.DashNav = DashNav;
```

5. Agora `Ctrl+F` e busca: `initDashboardCharts();` dentro do `DOMContentLoaded`
6. Adiciona `DashNav.init();` na linha seguinte
7. `Ctrl+S` para salvar

---

Depois roda:
```
git add .
git commit -m "navegacao mes dashboard"
git push

function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  if (!sidebar || !overlay) return;
  sidebar.classList.toggle('sidebar--open');
  overlay.classList.toggle('sidebar-overlay--visible');
  document.body.style.overflow = sidebar.classList.contains('sidebar--open') ? 'hidden' : '';
}

function fecharSidebar() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  if (!sidebar || !overlay) return;
  sidebar.classList.remove('sidebar--open');
  overlay.classList.remove('sidebar-overlay--visible');
  document.body.style.overflow = '';
}

document.addEventListener('DOMContentLoaded', () => {
  initDashboardCharts();

  // ── ACTIVE NAV ───────────────────────────────────
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => {
      document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('nav-item--active'));
      item.classList.add('nav-item--active');
      if (window.innerWidth <= 1024) fecharSidebar();
    });
  });
});

// ═══════════════════════════════════════════════════
//  FACILITE — MODAL DE EDIÇÃO DE RECEITA
// ═══════════════════════════════════════════════════

function abrirEdicaoReceita() {
  const modal = document.getElementById('modal-receita');
  const input = document.getElementById('input-receita');
  if (!modal || !input) return;
  const receita = window.FaciliteStorage
    ? FaciliteStorage.get('receita')?.mensal
    : window.FACILITE_DATA?.receitaMensal;
  input.value = receita || 0;
  modal.style.display = 'flex';
  setTimeout(() => input.focus(), 100);
  modal.onclick = e => { if (e.target === modal) fecharModalReceita(); };
}

function fecharModalReceita() {
  const modal = document.getElementById('modal-receita');
  if (modal) modal.style.display = 'none';
}

function salvarReceita() {
  const input = document.getElementById('input-receita');
  const valor = parseValorBRL(input?.value);
  if (!valor || valor <= 0) {
    if (input) input.style.borderColor = '#EF4444';
    setTimeout(() => { if (input) input.style.borderColor = 'rgba(255,255,255,0.08)'; }, 1500);
    return;
  }

  if (window.FaciliteStorage) {
    FaciliteStorage.update('receita', { mensal: valor });
    FaciliteState.refresh();
  } else if (window.FACILITE_DATA) {
    window.FACILITE_DATA.receitaMensal = valor;
  }

  fecharModalReceita();
  if (window.ChartsUpdate) ChartsUpdate.atualizarCards();

  const btn = document.getElementById('btn-editar-receita');
  if (btn) {
    btn.textContent = '✅ salvo!';
    setTimeout(() => { btn.textContent = '✏️ editar'; }, 2000);
  }

  if (window.FaciliteNotify) FaciliteNotify.success('Receita atualizada!');
}

document.addEventListener('keydown', ({ key }) => { if (key === 'Escape') fecharModalReceita(); });
