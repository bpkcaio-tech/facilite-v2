// ═══════════════════════════════════════════════════════════
//  FACILITE — CHATBOT  |  Assistente Financeiro
//  Chama o backend /api/chat (chave segura no servidor)
// ═══════════════════════════════════════════════════════════

let chatHistory = [];
let isTyping    = false;

// ── Inicialização ──────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  // Enter via event delegation (funciona em qualquer ambiente)
  document.addEventListener('keydown', function(e) {
    if (
      e.key === 'Enter' && !e.shiftKey &&
      e.target &&
      (e.target.id === 'chatbot-input' || e.target.classList.contains('chatbot-input'))
    ) {
      e.preventDefault();
      sendMessage();
    }
  });

  showWelcomeMessage();
  checkAndShowAlerts();
});

function showWelcomeMessage() {
  let saldo = 'R$ 0,00', pct = 0;
  try { const d = getFinancialData(); saldo = fmt(d.saldoTotal); pct = d.percentualComprometido; } catch(_) {}

  const hora     = new Date().getHours();
  const saudacao = hora < 12 ? 'Bom dia' : hora < 18 ? 'Boa tarde' : 'Boa noite';
  const alerta   = pct > 80 ? `\n\n⚠️ **Atenção:** ${pct}% da renda já está comprometida este mês.` : '';

  addBotMessage(
    `${saudacao}! 👋 Sou seu **Assistente Financeiro**.\n\n` +
    `Saldo atual: **${saldo}**.${alerta}\n\n` +
    `Pergunte sobre gastos, faturas, assinaturas — ou diga algo como _"gastei R$50 no mercado"_ para registrar um lançamento.`
  );
}

// ── Toggle do painel ───────────────────────────────────────
function toggleChatbot() {
  const panel = document.getElementById('chatbot-panel');
  const fab   = document.getElementById('chatbot-fab');
  const badge = document.getElementById('chatbot-badge');
  const isOpen = panel.classList.contains('chatbot-visible');

  if (isOpen) {
    panel.classList.replace('chatbot-visible', 'chatbot-hidden');
    fab.classList.remove('is-open');
  } else {
    panel.classList.replace('chatbot-hidden', 'chatbot-visible');
    fab.classList.add('is-open');
    if (badge) badge.style.display = 'none';
    fab.classList.remove('has-notification');
    setTimeout(() => document.getElementById('chatbot-input')?.focus(), 320);
  }
}

// ── Envio de mensagens ─────────────────────────────────────
async function sendMessage() {
  const input = document.getElementById('chatbot-input');
  const text  = (input?.value || '').trim();
  if (!text || isTyping) return;

  if (input) input.value = '';
  autoResizeInput(input);
  addUserMessage(text);
  showTyping();

  try {
    const resposta = await callBackend(text);
    hideTyping();
    addBotMessage(resposta);

    chatHistory.push({ role: 'user',      content: text     });
    chatHistory.push({ role: 'assistant', content: resposta });
    if (chatHistory.length > 20) chatHistory = chatHistory.slice(-20);

    checkIfIsLancamento(resposta);
  } catch (err) {
    hideTyping();
    let msg;
    const status = err.status || 0;
    if (status === 429) {
      msg = '⏳ Muitas requisições. Aguarde alguns segundos e tente novamente.';
    } else if (status === 500) {
      msg = '🔧 Erro no servidor. Tente novamente em instantes.';
    } else if (err.message?.includes('Failed to fetch') || err.message?.includes('NetworkError')) {
      msg = '🌐 Sem conexão com a internet. Verifique sua rede.';
    } else {
      msg = `❌ Erro: ${err.message || 'tente novamente.'}`;
    }
    addBotMessage(msg);
    console.error('[Chatbot] Erro:', status, err.message);
  }
}

function sendQuickMessage(text) {
  const input = document.getElementById('chatbot-input');
  if (input) input.value = text;
  sendMessage();
}

function handleInputKeydown(e) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
}

function autoResizeInput(el) {
  if (!el) return;
  el.style.height = 'auto';
  el.style.height = Math.min(el.scrollHeight, 100) + 'px';
}

// ── Chamada ao backend /api/chat ───────────────────────────
async function callBackend(textoAtual) {
  let dados;
  try { dados = getFinancialData(); }
  catch(_) {
    dados = {
      saldoTotal: 0, receitaMensal: 0, despesaMensal: 0, saldoDisponivel: 0,
      percentualComprometido: 0, gastos: { fixos: 0, variaveis: 0 },
      lancamentos: [], assinaturas: [], faturas: [], gastosPorCategoria: {},
      dataAtual: new Date().toLocaleDateString('pt-BR'),
    };
  }

  const gastosCat = Object.entries(dados.gastosPorCategoria || {})
    .sort(([, a], [, b]) => b - a)
    .map(([cat, val]) => `  - ${cat}: ${fmt(val)}`)
    .join('\n') || '  (sem dados)';

  const faturasTxt = (dados.faturas || [])
    .map(f => `  - ${f.cartao}: ${fmt(f.valor)} | Vence ${f.vencimento || '?'} (em ${f.diasParaVencer ?? '?'}d)`)
    .join('\n') || '  (sem faturas)';

  const lancTxt = (dados.lancamentos || []).slice(0, 8)
    .map(l => `  - ${l.data} | ${l.descricao}: ${fmt(l.valor)} (${l.categoria})`)
    .join('\n') || '  (sem lançamentos)';

  const asstxt = (dados.assinaturas || [])
    .map(a => `  - ${a.nome}: ${fmt(a.valor)}/mês (dia ${a.venceDia})`)
    .join('\n') || '  (sem assinaturas)';

  const systemPrompt = `Você é um assistente financeiro pessoal integrado ao Facilite, uma planilha financeira online.
Responda SEMPRE em português brasileiro. Use os dados reais abaixo.

DADOS FINANCEIROS (${dados.dataAtual}):
- Saldo total: ${fmt(dados.saldoTotal)}
- Receita mensal: ${fmt(dados.receitaMensal)}
- Despesa mensal: ${fmt(dados.despesaMensal)}
- Disponível: ${fmt(dados.saldoDisponivel)}
- Comprometido: ${dados.percentualComprometido}%
- Gastos fixos: ${fmt((dados.gastos || {}).fixos || 0)} | Variáveis: ${fmt((dados.gastos || {}).variaveis || 0)}

GASTOS POR CATEGORIA:
${gastosCat}

FATURAS DE CARTÃO:
${faturasTxt}

ÚLTIMAS TRANSAÇÕES:
${lancTxt}

ASSINATURAS:
${asstxt}

INSTRUÇÕES:
1. Use APENAS os dados acima. Nunca invente valores.
2. Se o usuário pedir algo que você não consegue fazer (transferências, acesso a outros bancos, etc.), responda: "Não tenho essa informação ou não consigo realizar essa ação no momento."
3. Para registrar gastos ou receitas ditos pelo usuário, inclua ao FINAL (não mostre ao usuário):
   LANCAMENTO:{"valor":-50.00,"categoria":"Alimentação","descricao":"Supermercado"}
   Valor negativo = despesa. Valor positivo = receita.
4. Categorias: Alimentação, Transporte, Moradia, Saúde, Lazer, Educação, Assinaturas, Receita, Outros
5. Seja direto e amigável. Máximo 3 parágrafos.`;

  const mensagens = [
    ...chatHistory.slice(-10),
    { role: 'user', content: textoAtual },
  ];

  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages: mensagens, systemPrompt }),
  });

  const data = await response.json();

  if (!response.ok) {
    const error = new Error(data.error || `HTTP ${response.status}`);
    error.status = response.status;
    throw error;
  }

  return data.content?.[0]?.text || '';
}

// ── Detectar e confirmar lançamentos ──────────────────────
function checkIfIsLancamento(botResponse) {
  const match = botResponse.match(/LANCAMENTO:(\{[^}]+\})/);
  if (!match) return;
  try { showConfirmacaoLancamento(JSON.parse(match[1])); }
  catch (e) { console.warn('[Chatbot] Erro ao parsear lançamento:', e); }
}

function showConfirmacaoLancamento(lancamento) {
  const tipo  = lancamento.valor < 0 ? 'Despesa' : 'Receita';
  const cor   = lancamento.valor < 0 ? 'negative' : 'positive';
  const valor = fmt(Math.abs(lancamento.valor));
  const sinal = lancamento.valor < 0 ? '-' : '+';
  const dataL = JSON.stringify(lancamento).replace(/"/g, '&quot;');

  const div = document.createElement('div');
  div.className = 'msg-bot';
  div.innerHTML = `
    <div class="msg-bot-avatar">✅</div>
    <div style="max-width:86%">
      <div class="msg-data-card">
        <div style="font-family:'Sora',sans-serif;font-weight:600;font-size:13px;margin-bottom:8px;color:#F0FDF4">
          Confirmar lançamento?
        </div>
        <div class="data-row"><span class="data-label">Tipo</span><span class="data-value ${cor}">${tipo}</span></div>
        <div class="data-row"><span class="data-label">Valor</span><span class="data-value ${cor}">${sinal} ${valor}</span></div>
        <div class="data-row"><span class="data-label">Categoria</span><span class="data-value">${escapeHTML(lancamento.categoria || '—')}</span></div>
        <div class="data-row"><span class="data-label">Descrição</span><span class="data-value">${escapeHTML(lancamento.descricao || '')}</span></div>
        <div style="display:flex;gap:8px;margin-top:12px">
          <button type="button" onclick="confirmarLancamento(JSON.parse(this.dataset.l))" data-l="${dataL}"
            style="flex:1;padding:8px;background:#22C55E;border:none;border-radius:8px;color:#000;font-family:'DM Sans',sans-serif;font-weight:700;font-size:13px;cursor:pointer"
            onmouseover="this.style.background='#16A34A';this.style.color='#fff'"
            onmouseout="this.style.background='#22C55E';this.style.color='#000'">
            ✓ Confirmar
          </button>
          <button type="button" onclick="this.closest('.msg-bot').remove()"
            style="flex:1;padding:8px;background:rgba(239,68,68,0.12);border:1px solid rgba(239,68,68,0.3);border-radius:8px;color:#EF4444;font-family:'DM Sans',sans-serif;font-weight:600;font-size:13px;cursor:pointer">
            ✕ Cancelar
          </button>
        </div>
      </div>
    </div>`;
  document.getElementById('chatbot-messages')?.appendChild(div);
  scrollToBottom();
}

function confirmarLancamento(lancamento) {
  if (typeof registrarLancamento === 'function') {
    registrarLancamento(lancamento);
    addBotMessage(
      `✅ **${escapeHTML(lancamento.descricao)}** registrado! ` +
      `${lancamento.valor < 0 ? '-' : '+'}${fmt(Math.abs(lancamento.valor))} em ${lancamento.categoria}.`
    );
  } else {
    addBotMessage('⚠️ Não foi possível registrar o lançamento automaticamente.');
  }
}

// ── Alertas automáticos ────────────────────────────────────
function checkAndShowAlerts() {
  try {
    const dados = getFinancialData();
    const alertas = [];
    if ((dados.percentualComprometido || 0) > 80) alertas.push('renda');
    (dados.faturas || []).forEach(f => {
      if (f.valor > 0 && f.diasParaVencer >= 0 && f.diasParaVencer <= 5) alertas.push(f.cartao);
    });
    if (alertas.length) {
      const badge = document.getElementById('chatbot-badge');
      if (badge) { badge.textContent = alertas.length; badge.style.display = 'flex'; }
      document.getElementById('chatbot-fab')?.classList.add('has-notification');
    }
  } catch(_) {}
}

// ── UI helpers ─────────────────────────────────────────────
function addBotMessage(text) {
  const msgs = document.getElementById('chatbot-messages');
  if (!msgs) return;
  const now = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const html = text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/_(.*?)_/g, '<em>$1</em>')
    .replace(/LANCAMENTO:\{[^}]+\}/g, '')
    .replace(/\n/g, '<br>');
  const div = document.createElement('div');
  div.className = 'msg-bot';
  div.innerHTML = `
    <div class="msg-bot-avatar">✦</div>
    <div>
      <div class="msg-bot-bubble">${html}</div>
      <div class="msg-time">${now}</div>
    </div>`;
  msgs.appendChild(div);
  scrollToBottom();
}

function addUserMessage(text) {
  const msgs = document.getElementById('chatbot-messages');
  if (!msgs) return;
  const now = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const div = document.createElement('div');
  div.className = 'msg-user';
  div.innerHTML = `
    <div>
      <div class="msg-user-bubble">${escapeHTML(text)}</div>
      <div class="msg-time" style="text-align:right">${now}</div>
    </div>`;
  msgs.appendChild(div);
  scrollToBottom();
}

function showTyping() {
  isTyping = true;
  const btn = document.getElementById('chatbot-send');
  if (btn) btn.disabled = true;
  const msgs = document.getElementById('chatbot-messages');
  if (!msgs) return;
  const el = document.createElement('div');
  el.className = 'msg-bot';
  el.id = 'chatbot-typing';
  el.innerHTML = `
    <div class="msg-bot-avatar">✦</div>
    <div class="typing-indicator">
      <div class="typing-dot"></div>
      <div class="typing-dot"></div>
      <div class="typing-dot"></div>
    </div>`;
  msgs.appendChild(el);
  scrollToBottom();
}

function hideTyping() {
  isTyping = false;
  const btn = document.getElementById('chatbot-send');
  if (btn) btn.disabled = false;
  document.getElementById('chatbot-typing')?.remove();
}

function clearChat() {
  chatHistory = [];
  const msgs = document.getElementById('chatbot-messages');
  if (msgs) msgs.innerHTML = '';
  showWelcomeMessage();
}

function scrollToBottom() {
  const msgs = document.getElementById('chatbot-messages');
  if (msgs) setTimeout(() => msgs.scrollTo({ top: msgs.scrollHeight, behavior: 'smooth' }), 40);
}

function escapeHTML(str) {
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function fmt(val) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);
}
