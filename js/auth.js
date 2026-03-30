// ═══════════════════════════════════════════════════
//  FACILITE — AUTH.JS
//  Sistema completo de autenticação
// ═══════════════════════════════════════════════════

const DASHBOARD_URL = 'dashboard.html';

// ── Configuração OAuth ─────────────────────────────
const AUTH_CONFIG = {
  google: {
    clientId: '331761194331-qgdncm6lsbevhfl8suej7656bkrdcol4.apps.googleusercontent.com',
    redirectUri: 'https://facilite-v2.vercel.app/auth.html',
    scope: 'openid email profile',
  },
  facebook: {
    appId: '1845567119452026',
    redirectUri: 'https://facilite-v2.vercel.app/auth.html',
    scope: 'public_profile',
  }
};

let modoAtual = 'login';

// ── Admins (bypass paywall, acesso total) ──────────
const ADMIN_EMAILS = [
  'caio@facilite.app',
  'admin@facilite.app',
  'dev@facilite.app',
  'suporte@facilite.app',
];

// ── Inicialização ──────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  verificarCallbackOAuth();
  const emailSalvo = localStorage.getItem('facilite_lembrar_email');
  if (emailSalvo) {
    document.getElementById('login-email').value = emailSalvo;
    document.getElementById('lembrar-me').checked = true;
  }
});

// ── Alternar Login / Cadastro ──────────────────────
function mostrarLogin() {
  modoAtual = 'login';
  document.getElementById('form-login').style.display    = 'block';
  document.getElementById('form-cadastro').style.display = 'none';
  document.getElementById('tab-login').classList.add('auth-tab--active');
  document.getElementById('tab-cadastro').classList.remove('auth-tab--active');
  document.getElementById('auth-title').textContent    = 'Bem-vindo de volta';
  document.getElementById('auth-subtitle').textContent = 'Entre na sua conta para continuar';
  document.getElementById('google-btn-text').textContent   = 'Continuar com Google';
  document.getElementById('facebook-btn-text').textContent = 'Continuar com Facebook';
  document.getElementById('auth-footer-text').innerHTML =
    'Não tem conta? <a href="#" onclick="mostrarCadastro(); return false;" class="auth-link">Criar conta grátis</a>';
  esconderMensagem();
}

function mostrarCadastro() {
  modoAtual = 'cadastro';
  document.getElementById('form-login').style.display    = 'none';
  document.getElementById('form-cadastro').style.display = 'block';
  document.getElementById('tab-cadastro').classList.add('auth-tab--active');
  document.getElementById('tab-login').classList.remove('auth-tab--active');
  document.getElementById('auth-title').textContent    = 'Criar sua conta';
  document.getElementById('auth-subtitle').textContent = 'Comece grátis, sem compromisso';
  document.getElementById('google-btn-text').textContent   = 'Cadastrar com Google';
  document.getElementById('facebook-btn-text').textContent = 'Cadastrar com Facebook';
  document.getElementById('auth-footer-text').innerHTML =
    'Já tem conta? <a href="#" onclick="mostrarLogin(); return false;" class="auth-link">Entrar</a>';
  esconderMensagem();
}

// ── LOGIN COM EMAIL ────────────────────────────────
function submitLogin(e) {
  e.preventDefault();
  const email   = document.getElementById('login-email').value.trim();
  const senha   = document.getElementById('login-senha').value;
  const lembrar = document.getElementById('lembrar-me').checked;
  const btn     = document.getElementById('btn-login');

  if (!email || !senha) { mostrarMensagem('Preencha email e senha.', 'erro'); return; }

  btn.classList.add('loading');
  btn.disabled = true;

  setTimeout(async () => {
    const resultado = await FaciliteAuth.login(email, senha);
    btn.classList.remove('loading');
    btn.disabled = false;

    if (resultado.sucesso) {
      if (lembrar) localStorage.setItem('facilite_lembrar_email', email);
      else localStorage.removeItem('facilite_lembrar_email');
      mostrarMensagem('Login realizado! Redirecionando...', 'sucesso');
      setTimeout(() => { window.location.href = DASHBOARD_URL; }, 800);
    } else {
      mostrarMensagem(resultado.erro, 'erro');
      document.getElementById('login-senha').classList.add('input-erro');
      setTimeout(() => document.getElementById('login-senha').classList.remove('input-erro'), 2000);
    }
  }, 600);
}

// ── CADASTRO COM EMAIL ─────────────────────────────
function submitCadastro(e) {
  e.preventDefault();
  const nome      = document.getElementById('cadastro-nome').value.trim();
  const email     = document.getElementById('cadastro-email').value.trim();
  const senha     = document.getElementById('cadastro-senha').value;
  const confirmar = document.getElementById('cadastro-confirmar').value;
  const termos    = document.getElementById('aceitar-termos').checked;
  const btn       = document.getElementById('btn-cadastro');

  if (!nome || !email || !senha || !confirmar) { mostrarMensagem('Preencha todos os campos.', 'erro'); return; }
  if (!validarEmail(email)) { mostrarMensagem('Email inválido.', 'erro'); return; }
  if (senha.length < 8) { mostrarMensagem('A senha deve ter no mínimo 8 caracteres.', 'erro'); return; }
  if (senha !== confirmar) {
    mostrarMensagem('As senhas não coincidem.', 'erro');
    document.getElementById('cadastro-confirmar').classList.add('input-erro');
    setTimeout(() => document.getElementById('cadastro-confirmar').classList.remove('input-erro'), 2000);
    return;
  }
  if (!termos) { mostrarMensagem('Aceite os termos de uso para continuar.', 'erro'); return; }

  btn.classList.add('loading');
  btn.disabled = true;

  setTimeout(async () => {
    const resultado = await FaciliteAuth.cadastrar({ nome, email, senha });
    btn.classList.remove('loading');
    btn.disabled = false;

    if (resultado.sucesso) {
      mostrarMensagem('Conta criada com sucesso! Redirecionando...', 'sucesso');
      setTimeout(() => { window.location.href = DASHBOARD_URL; }, 1000);
    } else {
      mostrarMensagem(resultado.erro, 'erro');
    }
  }, 800);
}

// ── LOGIN COM GOOGLE ───────────────────────────────
function loginGoogle() {
  const params = new URLSearchParams({
    client_id:     AUTH_CONFIG.google.clientId,
    redirect_uri:  AUTH_CONFIG.google.redirectUri,
    response_type: 'token',
    scope:         AUTH_CONFIG.google.scope,
    prompt:        'select_account',
    state:         'google_' + Date.now(),
  });
  window.location.href = 'https://accounts.google.com/o/oauth2/v2/auth?' + params;
}

// ── LOGIN COM FACEBOOK ─────────────────────────────
function loginFacebook() {
  const params = new URLSearchParams({
    client_id:     AUTH_CONFIG.facebook.appId,
    redirect_uri:  AUTH_CONFIG.facebook.redirectUri,
    response_type: 'token',
    scope:         AUTH_CONFIG.facebook.scope,
    state:         'facebook_' + Date.now(),
  });
  window.location.href = 'https://www.facebook.com/v18.0/dialog/oauth?' + params;
}

// ── CALLBACK OAUTH ─────────────────────────────────
function verificarCallbackOAuth() {
  const hash = window.location.hash;
  const search = window.location.search;
  if (hash.includes('access_token') || search.includes('code=')) {
    const params = new URLSearchParams(hash.replace('#', '') || search.replace('?', ''));
    const token = params.get('access_token') || params.get('code');
    const state = params.get('state') || '';
    if (token) {
      mostrarMensagem('Verificando autenticação...', 'sucesso');
      window.history.replaceState({}, document.title, window.location.pathname);
      if (state.startsWith('google_')) buscarDadosGoogle(token);
      else if (state.startsWith('facebook_')) buscarDadosFacebook(token);
    }
  }
}

async function buscarDadosGoogle(token) {
  try {
    const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', { headers: { Authorization: 'Bearer ' + token } });
    const data = await res.json();
    FaciliteAuth.salvarSessao({ id: 'google_' + data.sub, nome: data.name, email: data.email, foto: data.picture, provider: 'google', plano: 'gratuito' });
    window.location.href = DASHBOARD_URL;
  } catch(e) { mostrarMensagem('Erro ao autenticar com Google. Tente novamente.', 'erro'); }
}

async function buscarDadosFacebook(token) {
  try {
    const res = await fetch('https://graph.facebook.com/me?fields=id,name,email,picture&access_token=' + token);
    const data = await res.json();
    FaciliteAuth.salvarSessao({ id: 'facebook_' + data.id, nome: data.name, email: data.email || '', foto: data.picture?.data?.url || null, provider: 'facebook', plano: 'gratuito' });
    window.location.href = DASHBOARD_URL;
  } catch(e) { mostrarMensagem('Erro ao autenticar com Facebook. Tente novamente.', 'erro'); }
}

// ── ESQUECI A SENHA ────────────────────────────────
function mostrarEsqueciSenha(e) {
  e.preventDefault();
  const email = document.getElementById('login-email').value.trim();
  if (!email) { mostrarMensagem('Digite seu email acima primeiro.', 'erro'); document.getElementById('login-email').focus(); return; }

  const usuarios = JSON.parse(localStorage.getItem('facilite_usuarios') || '[]');
  const existe = usuarios.find(u => u.email === email);
  if (!existe) { mostrarMensagem('Email não encontrado. Verifique ou crie uma conta.', 'erro'); return; }

  const novaSenha = 'Facilite@' + Math.floor(1000 + Math.random() * 9000);
  existe.senha = hashSenha(novaSenha);
  localStorage.setItem('facilite_usuarios', JSON.stringify(usuarios));
  mostrarMensagem('Senha redefinida para: ' + novaSenha + ' — anote e altere no perfil após entrar.', 'sucesso');
}

// ── FORÇA DA SENHA ─────────────────────────────────
function verificarForcaSenha(senha) {
  const fill = document.getElementById('senha-forca-fill');
  const texto = document.getElementById('senha-forca-texto');
  if (!fill || !texto) return;

  let forca = 0;
  if (senha.length >= 8) forca++;
  if (/[A-Z]/.test(senha)) forca++;
  if (/[0-9]/.test(senha)) forca++;
  if (/[^A-Za-z0-9]/.test(senha)) forca++;

  const niveis = [
    { width: '25%', color: '#EF4444', texto: 'Fraca' },
    { width: '50%', color: '#F59E0B', texto: 'Regular' },
    { width: '75%', color: '#3B82F6', texto: 'Boa' },
    { width: '100%', color: '#22C55E', texto: 'Forte' },
  ];

  const nivel = niveis[Math.max(0, forca - 1)] || niveis[0];
  fill.style.width = senha.length ? nivel.width : '0';
  fill.style.background = nivel.color;
  texto.textContent = senha.length ? nivel.texto : '';
  texto.style.color = nivel.color;
}

// ── TOGGLE SENHA ───────────────────────────────────
function toggleSenha(inputId, btn) {
  const input = document.getElementById(inputId);
  if (!input) return;
  input.type = input.type === 'password' ? 'text' : 'password';
  btn.textContent = input.type === 'password' ? '👁' : '🙈';
}

// ── UI HELPERS ─────────────────────────────────────
function mostrarMensagem(texto, tipo) {
  const el = document.getElementById('auth-mensagem');
  el.textContent = texto;
  el.className = 'auth-mensagem auth-mensagem--' + tipo;
  el.style.display = 'block';
}

function esconderMensagem() {
  const el = document.getElementById('auth-mensagem');
  if (el) el.style.display = 'none';
}

function validarEmail(email) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email); }

function hashSenha(senha) {
  let hash = 0;
  for (let i = 0; i < senha.length; i++) {
    hash = ((hash << 5) - hash) + senha.charCodeAt(i);
    hash |= 0;
  }
  return 'h_' + Math.abs(hash).toString(36) + '_' + senha.length;
}

// ── Pré-registrar contas admin ─────────────────────
(function() {
  var admins = [
    { id: 'admin_1', nome: 'Caio Admin', email: 'caio@facilite.app', senha: hashSenha('Facilite@2026'), provider: 'email', plano: 'pago' },
    { id: 'admin_2', nome: 'Admin Facilite', email: 'admin@facilite.app', senha: hashSenha('Admin@F4cilit3'), provider: 'email', plano: 'pago' },
    { id: 'admin_3', nome: 'Dev Facilite', email: 'dev@facilite.app', senha: hashSenha('Dev@Fac2026'), provider: 'email', plano: 'pago' },
    { id: 'admin_4', nome: 'Suporte Facilite', email: 'suporte@facilite.app', senha: hashSenha('Suporte@F4c'), provider: 'email', plano: 'pago' },
  ];
  var usuarios = [];
  try { usuarios = JSON.parse(localStorage.getItem('facilite_usuarios') || '[]'); } catch(e) {}
  var mudou = false;
  admins.forEach(function(a) {
    if (!usuarios.find(function(u) { return u.email === a.email; })) {
      usuarios.push(a);
      mudou = true;
    }
  });
  if (mudou) localStorage.setItem('facilite_usuarios', JSON.stringify(usuarios));
})();

// ── FACILITEAUTH — Objeto Global ───────────────────
window.FaciliteAuth = {
  async cadastrar({ nome, email, senha }) {
    const usuarios = JSON.parse(localStorage.getItem('facilite_usuarios') || '[]');
    if (usuarios.find(u => u.email === email)) {
      return { sucesso: false, erro: 'Este email já está cadastrado. Faça login.' };
    }
    const novoUsuario = {
      id: 'local_' + Date.now(), nome, email, senha: hashSenha(senha),
      foto: null, provider: 'email', plano: 'gratuito', criadoEm: new Date().toISOString(),
    };
    usuarios.push(novoUsuario);
    localStorage.setItem('facilite_usuarios', JSON.stringify(usuarios));
    this.salvarSessao(novoUsuario);

    // Criar conta no Supabase (para sincronização)
    if (window.FaciliteSync) {
      await FaciliteSync.signUp(email, senha).catch(function(e) { console.warn('[Auth] Supabase signUp:', e); });
    }

    return { sucesso: true };
  },

  async login(email, senha) {
    const usuarios = JSON.parse(localStorage.getItem('facilite_usuarios') || '[]');
    const usuario = usuarios.find(u => u.email === email);
    if (!usuario) return { sucesso: false, erro: 'Email não encontrado. Crie uma conta.' };
    if (usuario.provider !== 'email') return { sucesso: false, erro: 'Esta conta usa login com ' + usuario.provider + '. Use o botão correspondente.' };
    if (usuario.senha !== hashSenha(senha)) return { sucesso: false, erro: 'Senha incorreta. Tente novamente.' };
    this.salvarSessao(usuario);

    // Login no Supabase + sincronizar dados
    if (window.FaciliteSync) {
      await FaciliteSync.signIn(email, senha).catch(function(e) { console.warn('[Auth] Supabase signIn:', e); });
      await FaciliteSync.init().catch(function(e) { console.warn('[Auth] Sync init:', e); });
    }

    return { sucesso: true };
  },

  salvarSessao(usuario) {
    // Preservar dados financeiros existentes
    var dadosExistentes = {};
    try { dadosExistentes = JSON.parse(localStorage.getItem('facilite_usuario') || '{}'); } catch(e) {}

    var isAdmin = ADMIN_EMAILS.includes((usuario.email || '').toLowerCase());
    var planoFinal = 'gratuito';
    if (isAdmin) {
      planoFinal = 'pago';
    } else if (dadosExistentes.plano === 'pago' && dadosExistentes.planoExpira) {
      if (new Date(dadosExistentes.planoExpira) > new Date()) planoFinal = 'pago';
    }

    var sessao = {
      id: usuario.id,
      nome: usuario.nome,
      email: usuario.email,
      foto: usuario.foto || dadosExistentes.foto || null,
      provider: usuario.provider,
      plano: planoFinal,
      admin: isAdmin,
      loginEm: new Date().toISOString(),
    };

    localStorage.setItem('facilite_sessao', JSON.stringify(sessao));
    localStorage.setItem('facilite_usuario', JSON.stringify({
      ...dadosExistentes,
      nome: usuario.nome,
      email: usuario.email,
      foto: usuario.foto || dadosExistentes.foto || null,
      plano: planoFinal,
    }));

    // Carregar dados do Supabase APÓS salvar sessão
    setTimeout(function() {
      if (window.FaciliteSync) {
        FaciliteSync.salvarUsuario(sessao);
        setTimeout(function() {
          FaciliteSync.carregarTudo();
        }, 800);
      }
    }, 500);
  },

  estaLogado() {
    try {
      const dados = JSON.parse(localStorage.getItem('facilite_sessao'));
      return !!(dados && dados.id && dados.loginEm);
    } catch { return false; }
  },

  getUsuario() {
    try { return JSON.parse(localStorage.getItem('facilite_sessao') || 'null'); }
    catch { return null; }
  },

  logout() {
    if (window.FaciliteSync) FaciliteSync.signOut().catch(function(){});
    localStorage.removeItem('facilite_sessao');
    window.location.href = 'auth.html';
  }
};
