// ═══════════════════════════════════════════════════
//  FACILITE — SUPABASE SYNC
//  Sincroniza localStorage ↔ Supabase (user_data)
//  localStorage = cache offline, Supabase = fonte da verdade
// ═══════════════════════════════════════════════════

var SYNC_KEYS = [
  'lancamentos', 'contas', 'cartoes', 'assinaturas',
  'categorias', 'reservas', 'relatorios', 'receita',
  'preferencias', 'notificacoes', 'ultimoMesProcessado', 'usuario'
];

window.FaciliteSync = {
  ready: false,
  userId: null,

  // Inicializa: puxa dados da nuvem ou faz upload inicial
  init: async function() {
    if (!window.FaciliteDB) { this.ready = true; return; }

    try {
      var result = await FaciliteDB.auth.getSession();
      var session = result.data.session;
      if (!session) { this.ready = true; return; }

      this.userId = session.user.id;

      // Verificar se já tem dados na nuvem
      var resp = await FaciliteDB
        .from('user_data')
        .select('key')
        .eq('user_id', this.userId);

      var rows = resp.data;

      if (!rows || rows.length === 0) {
        // Primeira vez: enviar dados locais para a nuvem
        console.log('[Sync] Primeiro acesso — enviando dados locais para nuvem...');
        await this._pushAll();
      } else {
        // Nuvem tem dados: puxar tudo
        console.log('[Sync] Sincronizando dados da nuvem...');
        await this.pullAll();
      }

      this.ready = true;
      console.log('[Sync] Pronto!');

      // Atualizar dashboard se já carregou
      if (window.FaciliteState) {
        FaciliteState.emit('dados-changed');
      }
    } catch(e) {
      console.warn('[Sync] Erro na inicialização:', e.message);
      this.ready = true; // funciona offline com localStorage
    }
  },

  // Puxa TODOS os dados da nuvem → localStorage
  pullAll: async function() {
    if (!FaciliteDB || !this.userId) return;

    try {
      var resp = await FaciliteDB
        .from('user_data')
        .select('key, value')
        .eq('user_id', this.userId);

      if (resp.data) {
        resp.data.forEach(function(row) {
          localStorage.setItem('facilite_' + row.key, JSON.stringify(row.value));
        });
      }
    } catch(e) {
      console.warn('[Sync] pullAll falhou:', e.message);
    }
  },

  // Envia UMA chave para a nuvem
  pushKey: async function(chave, valor) {
    if (!FaciliteDB || !this.userId) return;
    if (SYNC_KEYS.indexOf(chave) === -1) return; // não sincronizar chaves internas

    try {
      await FaciliteDB
        .from('user_data')
        .upsert({
          user_id: this.userId,
          key: chave,
          value: valor,
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id,key' });
    } catch(e) {
      console.warn('[Sync] pushKey falhou (' + chave + '):', e.message);
    }
  },

  // Envia TODOS os dados locais para a nuvem (primeira vez)
  _pushAll: async function() {
    if (!FaciliteDB || !this.userId) return;

    var self = this;
    var promises = SYNC_KEYS.map(function(key) {
      var raw = localStorage.getItem('facilite_' + key);
      var val;
      try { val = raw ? JSON.parse(raw) : null; } catch(e) { val = null; }
      if (val === null || val === undefined) return Promise.resolve();
      return self.pushKey(key, val);
    });

    await Promise.all(promises);
  },

  // Autenticação Supabase: cadastrar
  signUp: async function(email, senha) {
    if (!FaciliteDB) return null;
    try {
      var result = await FaciliteDB.auth.signUp({ email: email, password: senha });
      if (result.error) console.warn('[Sync] signUp error:', result.error.message);
      if (result.data.session) this.userId = result.data.session.user.id;
      return result;
    } catch(e) { console.warn('[Sync] signUp falhou:', e.message); return null; }
  },

  // Autenticação Supabase: login
  signIn: async function(email, senha) {
    if (!FaciliteDB) return null;
    try {
      var result = await FaciliteDB.auth.signInWithPassword({ email: email, password: senha });
      if (result.error) {
        // Se não existe no Supabase, criar automaticamente
        if (result.error.message.includes('Invalid login')) {
          return await this.signUp(email, senha);
        }
        console.warn('[Sync] signIn error:', result.error.message);
      }
      if (result.data && result.data.session) this.userId = result.data.session.user.id;
      return result;
    } catch(e) { console.warn('[Sync] signIn falhou:', e.message); return null; }
  },

  // Logout
  signOut: async function() {
    if (!FaciliteDB) return;
    try { await FaciliteDB.auth.signOut(); } catch(e) {}
    this.userId = null;
    this.ready = false;
  }
};
