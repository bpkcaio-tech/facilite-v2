// ═══════════════════════════════════════════════════
//  FACILITE — SUPABASE CONFIG
// ═══════════════════════════════════════════════════
var SUPABASE_URL = 'https://ugoozmapozlwtijaveru.supabase.co';
var SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVnb296bWFwb3psd3RpamF2ZXJ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ4MjIzMzgsImV4cCI6MjA5MDM5ODMzOH0.BZtq3wxBMIOhJ3iAqgPxN96PNxyKAj9R73_LvC25cek';

if (window.supabase) {
  window.FaciliteDB = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
} else {
  window.FaciliteDB = null;
  console.warn('[Supabase] SDK não carregado. Rodando apenas com localStorage.');
}
