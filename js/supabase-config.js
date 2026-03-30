// ═══════════════════════════════════════════════════
//  FACILITE — SUPABASE CONFIG
//  Substitua URL e KEY pelo seu projeto
// ═══════════════════════════════════════════════════
var SUPABASE_URL  = 'https://ugoozmapozlwtijaveru.supabase.co';
var SUPABASE_KEY  = 'sb_publishable_buYEFedUuYKHwrdmtm6a1g_SdTqePVj';

if (window.supabase && SUPABASE_URL !== 'COLE_SUA_SUPABASE_URL_AQUI') {
  window.FaciliteDB = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
} else {
  window.FaciliteDB = null;
  if (SUPABASE_URL === 'COLE_SUA_SUPABASE_URL_AQUI') {
    console.warn('[Supabase] URL/KEY não configurados. Rodando apenas com localStorage.');
  }
}
