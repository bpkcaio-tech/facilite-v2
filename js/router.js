// ═══════════════════════════════════════════════════
//  FACILITE — ROUTER (SPA navigation)
// ═══════════════════════════════════════════════════

const FaciliteRouter = {
  currentPage: 'dashboard',
  mainEl: null,
  dashboardHTML: '',
  pageCache: {},
  navItems: null,

  init() {
    this.mainEl = document.querySelector('main.dashboard');
    this.navItems = document.querySelectorAll('.nav-item');
    if (!this.mainEl) return;

    // Salvar conteúdo original do dashboard
    this.dashboardHTML = this.mainEl.innerHTML;

    // Mapear nav items
    const pageMap = ['dashboard', 'lancamentos', 'relatorios', 'contas', 'reservas', 'assinaturas'];

    this.navItems.forEach((item, i) => {
      item.setAttribute('data-page', pageMap[i]);
      item.addEventListener('click', (e) => {
        e.preventDefault();
        this.navigate(pageMap[i]);
        // Fechar sidebar no mobile
        if (window.innerWidth <= 1024) {
          const sidebar = document.querySelector('.sidebar');
          const overlay = document.querySelector('.sidebar-overlay');
          if (sidebar) sidebar.classList.remove('sidebar--open');
          if (overlay) { overlay.classList.remove('sidebar-overlay--visible'); overlay.classList.remove('active'); }
        }
      });
    });

    // Suportar back/forward do browser
    window.addEventListener('popstate', (e) => {
      if (e.state?.page) this.navigate(e.state.page, false);
    });

    // Check URL hash on load
    const hash = location.hash.replace('#', '');
    if (hash && pageMap.includes(hash)) {
      this.navigate(hash, true);
    }
  },

  async navigate(page, pushState = true) {
    if (page === this.currentPage) return;

    // Fechar sidebar sempre ao navegar
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.querySelector('.sidebar-overlay');
    if (sidebar) sidebar.classList.remove('sidebar--open');
    if (overlay) { overlay.classList.remove('sidebar-overlay--visible'); overlay.classList.remove('active'); }
    document.body.style.overflow = '';

    // Atualizar nav ativa (perfil não tem nav-item, limpa todos)
    this.navItems.forEach(item => {
      item.classList.toggle('nav-item--active', item.getAttribute('data-page') === page);
    });

    // Atualizar título do topbar
    const titles = {
      dashboard: ['Dashboard', 'Visão geral das suas finanças'],
      lancamentos: ['Lançamentos', 'Gerencie suas receitas e despesas'],
      relatorios: ['Relatórios', 'Análises e gráficos detalhados'],
      contas: ['Contas', 'Gerencie suas contas bancárias'],
      reservas: ['Reservas', 'Gerencie suas metas de poupança'],
      assinaturas: ['Assinaturas', 'Gerencie suas assinaturas mensais'],
      perfil: ['Perfil', 'Configurações da sua conta'],
    };

    const titleEl = document.querySelector('.topbar__title h1');
    const subtitleEl = document.querySelector('.topbar__title p');
    if (titleEl) titleEl.textContent = titles[page]?.[0] || page;
    if (subtitleEl) subtitleEl.textContent = titles[page]?.[1] || '';

    // Carregar conteúdo
    if (page === 'dashboard') {
      this.mainEl.innerHTML = this.dashboardHTML;
      this.currentPage = page;
      // Re-inicializar dashboard
      FaciliteState.emit('dashboard-loaded');
    } else {
      try {
        let html;
        if (this.pageCache[page]) {
          html = this.pageCache[page];
        } else {
          html = await this._loadPage(page);
          if (html) this.pageCache[page] = html;
          else throw new Error('Página não encontrada');
        }
        this.mainEl.innerHTML = html;
        this.currentPage = page;
        // Scroll para o topo ao trocar de aba
        this.mainEl.scrollTop = 0;
        window.scrollTo(0, 0);
        FaciliteState.emit('page-loaded', { page });
      } catch (e) {
        console.error('[Router] Erro ao carregar', page, ':', e);
        this.mainEl.innerHTML = `
          <div style="display:flex;align-items:center;justify-content:center;height:60vh;flex-direction:column;gap:12px">
            <span style="font-size:48px">🚧</span>
            <h2 style="color:#F0FDF4;font-family:'Sora',sans-serif">Erro ao carregar página</h2>
            <p style="color:#6B7280">${e.message || 'Tente recarregar a página.'}</p>
            <button onclick="location.reload()" style="margin-top:8px;padding:8px 20px;background:#22C55E;border:none;border-radius:8px;color:#000;font-family:'DM Sans',sans-serif;font-weight:600;cursor:pointer">Recarregar</button>
          </div>`;
        this.currentPage = page;
      }
    }

    if (pushState) {
      history.pushState({ page }, '', '#' + page);
    }
  },

  // Carrega HTML da página tentando múltiplos caminhos
  async _loadPage(page) {
    const resp = await fetch(`pages/${page}.html`);
    if (!resp.ok) throw new Error('Página não encontrada');
    let html = await resp.text();
    // Remover script injetado pelo Vite (dev mode)
    html = html.replace(/<script type="module" src="\/@vite\/client"><\/script>\s*/g, '');
    return html;
  },
};

document.addEventListener('DOMContentLoaded', () => {
  FaciliteRouter.init();
});

window.FaciliteRouter = FaciliteRouter;
