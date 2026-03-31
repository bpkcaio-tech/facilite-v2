// ═══════════════════════════════════════════════════
//  FACILITE — PERFIL COMPLETO
//  Foto, senha, planos, logout, sidebar sync
// ═══════════════════════════════════════════════════

const PerfilPage = {

  init() {
    const usuario = FaciliteStorage.get('usuario');
    const prefs   = FaciliteStorage.get('preferencias');

    const elNome    = document.getElementById('perfil-nome');
    const elEmail   = document.getElementById('perfil-email');
    const elDia     = document.getElementById('perfil-dia-pgto');
    const elDisplay = document.getElementById('perfil-nome-display');
    const elPlano   = document.getElementById('perfil-plano-display');

    if (elNome) elNome.value = usuario?.nome || '';
    if (elEmail) elEmail.value = usuario?.email || '';
    if (elDia) elDia.value = prefs?.diaPreferidoPagamento || 5;
    if (elDisplay) elDisplay.textContent = usuario?.nome || 'Usuário';
    if (elPlano) {
      const pago = window.FacilitePlano && FacilitePlano.ehPago();
      elPlano.textContent = pago ? 'Plano Premium' : 'Plano Gratuito';
    }

    this._renderAvatar(usuario);
    this._renderPlanoInfo();
    this._esconderSenha();
    this._initTema();
  },

  // ── Avatar / Foto ──────────────────────────────────
  _renderAvatar(usuario) {
    const letra = document.getElementById('perfil-avatar-letra');
    const img   = document.getElementById('perfil-avatar-img');
    if (!letra || !img) return;

    const foto = usuario?.foto;
    if (foto) {
      img.src = foto;
      img.style.display = 'block';
      letra.style.display = 'none';
    } else {
      img.style.display = 'none';
      letra.style.display = '';
      letra.textContent = (usuario?.nome || 'U')[0].toUpperCase();
    }
  },

  abrirUploadFoto() {
    document.getElementById('perfil-foto-input')?.click();
  },

  processarFoto(input) {
    const file = input.files?.[0];
    if (!file) return;
    if (file.size > 500 * 1024) {
      FaciliteNotify.warning('Imagem muito grande (máx 500KB).');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target.result;
      FaciliteStorage.update('usuario', { foto: dataUrl });
      const usuario = FaciliteStorage.get('usuario');
      this._renderAvatar(usuario);
      this._atualizarSidebar(usuario);
      this._atualizarTopbar(usuario);
      FaciliteNotify.success('Foto atualizada!');
    };
    reader.readAsDataURL(file);
  },

  // ── Salvar dados pessoais ──────────────────────────
  salvar() {
    const nome  = document.getElementById('perfil-nome')?.value?.trim();
    const email = document.getElementById('perfil-email')?.value?.trim();
    if (!nome) { FaciliteNotify.warning('Informe seu nome.'); return; }

    FaciliteStorage.update('usuario', { nome, email });
    const usuario = FaciliteStorage.get('usuario');

    // Atualizar displays na página
    const elDisplay = document.getElementById('perfil-nome-display');
    if (elDisplay) elDisplay.textContent = nome;
    this._renderAvatar(usuario);

    // Atualizar sidebar + topbar
    this._atualizarSidebar(usuario);
    this._atualizarTopbar(usuario);

    FaciliteNotify.success('Dados atualizados!');
  },

  // ── Senha ──────────────────────────────────────────
  _esconderSenha() {
    const form = document.getElementById('perfil-senha-form');
    if (form) form.style.display = 'none';
  },

  toggleSenha() {
    const form = document.getElementById('perfil-senha-form');
    const btn  = document.getElementById('btn-toggle-senha');
    if (!form) return;
    const aberto = form.style.display !== 'none';
    form.style.display = aberto ? 'none' : 'block';
    if (btn) btn.textContent = aberto ? 'Alterar senha' : 'Cancelar';
  },

  toggleVer(inputId) {
    const el = document.getElementById(inputId);
    if (el) el.type = el.type === 'password' ? 'text' : 'password';
  },

  salvarSenha() {
    const atual    = document.getElementById('perfil-senha-atual')?.value;
    const nova     = document.getElementById('perfil-senha-nova')?.value;
    const confirma = document.getElementById('perfil-senha-confirmar')?.value;
    const usuario  = FaciliteStorage.get('usuario');

    if (usuario.senha && atual !== usuario.senha) {
      FaciliteNotify.error('Senha atual incorreta.');
      return;
    }
    if (!nova || nova.length < 6) {
      FaciliteNotify.warning('A nova senha deve ter no mínimo 6 caracteres.');
      return;
    }
    if (nova !== confirma) {
      FaciliteNotify.warning('As senhas não conferem.');
      return;
    }

    FaciliteStorage.update('usuario', { senha: nova });

    // Limpar campos
    document.getElementById('perfil-senha-atual').value = '';
    document.getElementById('perfil-senha-nova').value = '';
    document.getElementById('perfil-senha-confirmar').value = '';
    this.toggleSenha();

    FaciliteNotify.success('Senha alterada com sucesso!');
  },

  // ── Preferências ───────────────────────────────────
  salvarPrefs() {
    const dia = parseInt(document.getElementById('perfil-dia-pgto')?.value) || 5;
    FaciliteStorage.update('preferencias', { diaPreferidoPagamento: dia });
    FaciliteState.refresh();
    FaciliteNotify.success('Preferências salvas!');
  },

  // ── Tema claro/escuro ──────────────────────────────
  _initTema() {
    const tema = localStorage.getItem('facilite_tema') || 'dark';
    this._marcarTema(tema);
  },

  setTema(tema) {
    localStorage.setItem('facilite_tema', tema);
    document.documentElement.setAttribute('data-theme', tema);
    this._marcarTema(tema);
  },

  _marcarTema(tema) {
    const btnDark = document.getElementById('btn-tema-dark');
    const btnLight = document.getElementById('btn-tema-light');
    if (btnDark) btnDark.classList.toggle('toggle-btn--active', tema === 'dark');
    if (btnLight) btnLight.classList.toggle('toggle-btn--active', tema === 'light');
  },

  // ── Info do plano ──────────────────────────────────
  _renderPlanoInfo() {
    const el = document.getElementById('perfil-plano-info');
    const btn = document.getElementById('perfil-btn-upgrade');
    if (!el) return;

    const pago = window.FacilitePlano && FacilitePlano.ehPago();

    if (pago) {
      try {
        const sessao = JSON.parse(localStorage.getItem('facilite_sessao') || '{}');
        const expira = sessao.planoExpira ? new Date(sessao.planoExpira).toLocaleDateString('pt-BR') : '';
        el.innerHTML = 'Premium ativo' + (expira ? ' — renova em ' + expira : '');
        el.style.color = '#22C55E';
      } catch(e) { el.textContent = 'Premium ativo'; }
      if (btn) btn.style.display = 'none';
    } else {
      el.textContent = 'Gratuito — funcionalidades limitadas';
      el.style.color = '#6B7280';
      if (btn) btn.style.display = '';
    }
  },

  // ── Logout ─────────────────────────────────────────
  logout() {
    if (!confirm('Deseja sair da sua conta?')) return;
    localStorage.removeItem('facilite_sessao');
    window.location.href = 'auth.html';
  },

  // ── Reset ──────────────────────────────────────────
  async resetDados() {
    if (!confirm('Tem certeza? TODOS os seus dados serão apagados permanentemente:\n\n• Lançamentos\n• Contas bancárias\n• Reservas\n• Assinaturas\n• Relatórios\n• Preferências\n• Perfil')) return;
    if (!confirm('ÚLTIMA CHANCE!\n\nEsta ação é irreversível. Deseja continuar?')) return;

    FaciliteNotify && FaciliteNotify.info('Apagando todos os dados...');

    var uid = window.FaciliteSync ? FaciliteSync._userId() : null;

    if (uid) {
      try {
        var h = FaciliteSync._h();
        var url = SUPABASE_URL + '/rest/v1/';

        await fetch(url + 'lancamentos?user_id=eq.' + uid, { method: 'DELETE', headers: h });
        await fetch(url + 'dados_usuario?user_id=eq.' + uid, { method: 'DELETE', headers: h });
        await fetch(url + 'receitas?user_id=eq.' + uid, { method: 'DELETE', headers: h });

        await fetch(url + 'controle_conta?on_conflict=user_id', {
          method: 'POST',
          headers: Object.assign({}, h, {
            'Prefer': 'resolution=merge-duplicates,return=representation'
          }),
          body: JSON.stringify({
            user_id: uid,
            reset_em: new Date().toISOString(),
            atualizado_em: new Date().toISOString()
          })
        });

        console.log('[Reset] Supabase limpo + timestamp gravado');
      } catch(e) {
        console.warn('[Reset] Erro:', e.message);
      }
    }

    FaciliteStorage.reset();
    localStorage.removeItem('facilite_ids_excluidos');
    localStorage.removeItem('facilite_ultimo_acesso');

    window.location.href = 'dashboard.html';
  },

  // ── Sync sidebar + topbar ──────────────────────────
  _atualizarSidebar(usuario) {
    const nome = usuario?.nome || 'Usuário';
    const foto = usuario?.foto;
    const plano = usuario?.plano || 'gratuito';

    // Nome
    const elNome = document.querySelector('.sidebar__user-name');
    if (elNome) elNome.textContent = nome;

    // Role
    const elRole = document.querySelector('.sidebar__user-role');
    if (elRole) {
      const roles = { gratuito: 'Conta pessoal', pessoal: 'Conta pessoal', corporativo: 'Conta corporativa' };
      elRole.textContent = roles[plano] || 'Conta pessoal';
    }

    // Avatar
    const elAvatar = document.querySelector('.sidebar__avatar');
    if (elAvatar) {
      if (foto) {
        elAvatar.innerHTML = `<img src="${foto}" style="width:100%;height:100%;object-fit:cover;border-radius:50%" alt="">`;
      } else {
        elAvatar.textContent = nome[0].toUpperCase();
        elAvatar.innerHTML = nome[0].toUpperCase();
      }
    }
  },

  _atualizarTopbar(usuario) {
    const nome = usuario?.nome || 'Usuário';
    const foto = usuario?.foto;
    const el = document.querySelector('.topbar__avatar');
    if (!el) return;

    if (foto) {
      el.innerHTML = `<img src="${foto}" style="width:100%;height:100%;object-fit:cover;border-radius:50%" alt="">`;
    } else {
      el.textContent = nome[0].toUpperCase();
    }
  },
};

// ── Inicializar ao carregar a página ─────────────────
FaciliteState.on('page-loaded', ({ page }) => {
  if (page === 'perfil') PerfilPage.init();
});

// ── Ao carregar qualquer página, sincronizar sidebar/topbar com dados do usuário ──
document.addEventListener('DOMContentLoaded', () => {
  // Primeiro tentar sessão do auth (mais recente), senão FaciliteStorage
  let usuario = FaciliteStorage.get('usuario');
  try {
    const sessao = JSON.parse(localStorage.getItem('facilite_sessao'));
    if (sessao && sessao.nome) {
      // Sincronizar dados da sessão auth → storage
      usuario = { ...usuario, nome: sessao.nome, email: sessao.email, foto: sessao.foto, plano: sessao.plano };
    }
  } catch(e) {}
  PerfilPage._atualizarSidebar(usuario);
  PerfilPage._atualizarTopbar(usuario);

  // Aplicar tema salvo
  const tema = localStorage.getItem('facilite_tema') || 'dark';
  document.documentElement.setAttribute('data-theme', tema);
});

window.PerfilPage = PerfilPage;
