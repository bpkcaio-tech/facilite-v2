// ═══════════════════════════════════════════════════
//  FACILITE — PERFIL COMPLETO
//  Foto, senha, planos, logout, sidebar sync
// ═══════════════════════════════════════════════════

const PLANOS = [
  {
    id: 'gratuito', nome: 'Gratuito', icone: '🆓', preco: null,
    features: ['1 usuário', 'Funcionalidades básicas', 'Até 3 contas bancárias'],
  },
  {
    id: 'pessoal', nome: 'Pessoal', icone: '⭐', preco: 19.90,
    features: ['Relatórios avançados', 'Exportação PDF/CSV', 'Sem limite de contas', 'Notificações premium'],
  },
  {
    id: 'corporativo', nome: 'Corporativo', icone: '🏢', preco: 49.90,
    features: ['Tudo do Pessoal', 'Até 5 dispositivos', 'Conta corporativa', 'Suporte prioritário'],
  },
];

const PerfilPage = {

  init() {
    const usuario = FaciliteStorage.get('usuario');
    const receita = FaciliteStorage.get('receita');
    const prefs   = FaciliteStorage.get('preferencias');

    // Preencher campos
    const elNome    = document.getElementById('perfil-nome');
    const elEmail   = document.getElementById('perfil-email');
    const elReceita = document.getElementById('perfil-receita');
    const elDia     = document.getElementById('perfil-dia-pgto');
    const elDisplay = document.getElementById('perfil-nome-display');
    const elPlano   = document.getElementById('perfil-plano-display');

    if (elNome) elNome.value = usuario?.nome || '';
    if (elEmail) elEmail.value = usuario?.email || '';
    if (elReceita) elReceita.value = receita?.mensal || '';
    if (elDia) elDia.value = prefs?.diaPreferidoPagamento || 5;
    if (elDisplay) elDisplay.textContent = usuario?.nome || 'Usuário';
    if (elPlano) {
      const nomes = { gratuito: 'Plano Gratuito', pessoal: 'Plano Pessoal', corporativo: 'Plano Corporativo' };
      elPlano.textContent = nomes[usuario?.plano] || 'Plano Gratuito';
    }

    this._renderAvatar(usuario);
    this._renderPlanos(usuario?.plano || 'gratuito');
    this._esconderSenha();
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
    const receita = parseValorBRL(document.getElementById('perfil-receita')?.value);
    const dia     = parseInt(document.getElementById('perfil-dia-pgto')?.value) || 5;

    if (receita && receita > 0) {
      FaciliteStorage.update('receita', { mensal: receita });
    }
    FaciliteStorage.update('preferencias', { diaPreferidoPagamento: dia });
    FaciliteState.refresh();
    FaciliteNotify.success('Preferências salvas!');
  },

  // ── Planos ─────────────────────────────────────────
  _renderPlanos(planoAtual) {
    const el = document.getElementById('perfil-planos');
    if (!el) return;

    el.innerHTML = PLANOS.map(p => {
      const ativo = p.id === planoAtual;
      const corBorda = ativo ? 'rgba(34,197,94,0.3)' : 'rgba(255,255,255,0.04)';
      const bgBadge = ativo ? 'rgba(34,197,94,0.12)' : 'rgba(255,255,255,0.03)';

      return `
        <div style="border:1px solid ${corBorda};border-radius:14px;padding:18px;background:${ativo ? 'rgba(34,197,94,0.03)' : 'transparent'};transition:border-color 0.15s">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
            <div style="display:flex;align-items:center;gap:10px">
              <span style="font-size:22px">${p.icone}</span>
              <div>
                <span style="font-family:'Sora',sans-serif;font-size:14px;font-weight:700;color:#F0FDF4">${p.nome.toUpperCase()}</span>
                ${p.preco ? `<span style="font-size:13px;color:#6B7280;margin-left:8px">R$ ${p.preco.toFixed(2).replace('.', ',')}/mês</span>` : ''}
              </div>
            </div>
            ${ativo
              ? '<span style="background:rgba(34,197,94,0.12);color:#22C55E;font-size:11px;padding:4px 12px;border-radius:6px;font-weight:700;font-family:\'DM Sans\',sans-serif">ATUAL</span>'
              : `<button type="button" onclick="PerfilPage.selecionarPlano('${p.id}')" style="background:#22C55E;color:#000;border:none;border-radius:8px;padding:7px 16px;font-family:'DM Sans',sans-serif;font-size:12px;font-weight:700;cursor:pointer;transition:background 0.15s" onmouseover="this.style.background='#16A34A';this.style.color='#fff'" onmouseout="this.style.background='#22C55E';this.style.color='#000'">ASSINAR</button>`
            }
          </div>
          <ul style="margin:0;padding:0;list-style:none;display:flex;flex-wrap:wrap;gap:4px 16px">
            ${p.features.map(f => `<li style="font-size:12px;color:#6B7280;display:flex;align-items:center;gap:4px"><span style="color:${ativo ? '#22C55E' : '#374151'}">•</span>${f}</li>`).join('')}
          </ul>
        </div>`;
    }).join('');
  },

  selecionarPlano(planoId) {
    if (planoId === 'gratuito') {
      FaciliteStorage.update('usuario', { plano: 'gratuito', planoVencimento: null });
      this._renderPlanos('gratuito');
      const elPlano = document.getElementById('perfil-plano-display');
      if (elPlano) elPlano.textContent = 'Plano Gratuito';
      this._atualizarSidebar(FaciliteStorage.get('usuario'));
      FaciliteNotify.success('Plano alterado para Gratuito.');
      return;
    }
    // Redirecionar para checkout com Pix
    window.location.href = `checkout.html?plano=${planoId}`;
  },

  // ── Logout ─────────────────────────────────────────
  logout() {
    if (!confirm('Deseja sair da sua conta?')) return;
    localStorage.removeItem('facilite_sessao');
    window.location.href = 'auth.html';
  },

  // ── Reset ──────────────────────────────────────────
  resetDados() {
    if (!confirm('Tem certeza? TODOS os seus dados serão apagados permanentemente:\n\n• Lançamentos\n• Contas bancárias\n• Reservas\n• Assinaturas\n• Relatórios\n• Preferências\n• Perfil')) return;
    if (!confirm('ÚLTIMA CHANCE!\n\nEsta ação é irreversível. Deseja continuar?')) return;
    FaciliteStorage.reset();
    // Recarregar a página para garantir estado limpo
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
});

window.PerfilPage = PerfilPage;
