// ═══════════════════════════════════════════════════
//  FACILITE — CHATBOT FINANCEIRO
// ═══════════════════════════════════════════════════

const FaciliteChat = {
  aberto: false,
  historico: [],
  _digitando: false,

  // ── Abrir/fechar ───────────────────────────────
  toggle() {
    this.aberto = !this.aberto;
    const painel = document.getElementById('chat-painel');
    const fab = document.getElementById('chat-fab');
    if (!painel || !fab) return;

    if (this.aberto) {
      painel.style.display = 'flex';
      fab.classList.add('chat-fab--aberto');
      setTimeout(() => {
        painel.style.opacity = '1';
        painel.style.transform = 'scale(1) translateY(0)';
        document.getElementById('chat-input')?.focus();
      }, 10);
      if (this.historico.length === 0) this._mensagemBoasVindas();
    } else {
      painel.style.opacity = '0';
      painel.style.transform = 'scale(0.95) translateY(10px)';
      fab.classList.remove('chat-fab--aberto');
      setTimeout(() => { painel.style.display = 'none'; }, 200);
    }
  },

  fechar() {
    if (this.aberto) this.toggle();
  },

  // ── Mensagem de boas vindas ────────────────────
  _mensagemBoasVindas() {
    const sessao = this._getSessao();
    const nome = sessao.nome ? sessao.nome.split(' ')[0] : 'você';
    this._adicionarMensagem('bot', `Olá, ${nome}! 👋 Sou o assistente financeiro do Facilite.\n\nPosso te ajudar com:\n• 💬 Responder dúvidas sobre suas finanças\n• ➕ Registrar lançamentos (ex: "gastei R$50 no mercado")\n• 📊 Analisar seus gastos e dar insights\n\nComo posso te ajudar hoje?`);
  },

  // ── Enviar mensagem ────────────────────────────
  async enviar() {
    const input = document.getElementById('chat-input');
    if (!input) return;
    const texto = input.value.trim();
    if (!texto || this._digitando) return;

    input.value = '';
    input.style.height = 'auto';
    this._adicionarMensagem('user', texto);
    this._mostrarDigitando();

    try {
      const resposta = await this._chamarAPI(texto);
      this._esconderDigitando();
      this._processarResposta(resposta, texto);
    } catch(e) {
      this._esconderDigitando();
      this._adicionarMensagem('bot', '❌ Erro ao conectar com o servidor. Tente novamente em instantes.');
      console.error('[Chat]', e);
    }
  },

  // ── Processar resposta e detectar lançamentos ──
  _processarResposta(resposta, textoOriginal) {
    // Tentar extrair lançamento da resposta
    try {
      const jsonMatch = resposta.match(/```json\n?([\s\S]*?)\n?```/);
      if (jsonMatch) {
        const dados = JSON.parse(jsonMatch[1]);
        if (dados.tipo === 'lancamento' && dados.valor && dados.descricao) {
          this._adicionarMensagem('bot', dados.mensagem || 'Lançamento identificado!');
          this._mostrarConfirmacaoLancamento(dados);
          return;
        }
      }
    } catch(e) {}

    this._adicionarMensagem('bot', resposta);
  },

  // ── Card de confirmação de lançamento ──────────
  _mostrarConfirmacaoLancamento(dados) {
    const cor = dados.valor < 0 ? '#EF4444' : '#22C55E';
    const sinal = dados.valor < 0 ? '-' : '+';
    const html = `
      <div class="chat-card-lancamento">
        <div class="chat-card-lancamento__titulo">Confirmar lançamento?</div>
        <div class="chat-card-lancamento__info">
          <span>${dados.descricao}</span>
          <span style="color:${cor};font-weight:700">${sinal}${fmtBRL(Math.abs(dados.valor))}</span>
        </div>
        <div class="chat-card-lancamento__meta">${dados.categoria || 'Outros'} · ${dados.tipo === 'receita' ? 'Receita' : 'Despesa'}</div>
        <div class="chat-card-lancamento__btns">
          <button onclick="FaciliteChat._confirmarLancamento(${JSON.stringify(dados).replace(/"/g, '&quot;')})" class="chat-btn-confirmar">✅ Confirmar</button>
          <button onclick="this.closest('.chat-card-lancamento').remove()" class="chat-btn-cancelar">❌ Cancelar</button>
        </div>
      </div>
    `;
    const lista = document.getElementById('chat-mensagens');
    if (lista) lista.insertAdjacentHTML('beforeend', html);
    this._scrollBottom();
  },

  // ── Confirmar lançamento ───────────────────────
  _confirmarLancamento(dados) {
    const hoje = new Date().toISOString().split('T')[0];
    const dataObj = new Date(hoje + 'T12:00:00');

    const lanc = {
      id: FaciliteStorage.uid('lanc'),
      descricao: dados.descricao,
      valor: dados.valor,
      categoria: dados.categoria || 'Outros',
      tipo: dados.tipoGasto || 'variavel',
      data: hoje,
      mes: dataObj.getMonth() + 1,
      ano: dataObj.getFullYear(),
      formaPagamento: dados.formaPagamento || 'pix',
      status: 'pago',
      recorrente: false,
    };

    FaciliteStorage.addLancamento(lanc);

    if (window.FaciliteSync && FaciliteSync.ready) {
      FaciliteSync.adicionarLancamento(lanc);
    }

    FaciliteState.refresh();
    if (typeof window.atualizarCards === 'function') window.atualizarCards();

    // Remover card de confirmação
    document.querySelectorAll('.chat-card-lancamento').forEach(el => el.remove());

    this._adicionarMensagem('bot', `✅ Lançamento registrado! **${dados.descricao}** de **${fmtBRL(Math.abs(dados.valor))}** adicionado com sucesso.`);
  },

  // ── Chamar API do Claude ───────────────────────
  async _chamarAPI(mensagem) {
    const dadosFinanceiros = this._coletarDados();
    const systemPrompt = `Você é o assistente financeiro do Facilite, um app de gestão financeira pessoal.

DADOS FINANCEIROS DO USUÁRIO (mês atual):
${JSON.stringify(dadosFinanceiros, null, 2)}

SUAS RESPONSABILIDADES:
1. Responder perguntas sobre as finanças do usuário usando os dados acima
2. Detectar quando o usuário quer registrar um lançamento e retornar JSON estruturado
3. Dar insights e análises úteis sobre os gastos

PARA DETECTAR LANÇAMENTOS:
Se o usuário mencionar um gasto ou receita, responda APENAS com bloco JSON:
\`\`\`json
{
  "tipo": "lancamento",
  "descricao": "Nome do gasto",
  "valor": -50.00,
  "categoria": "Alimentação",
  "tipoGasto": "variavel",
  "formaPagamento": "pix",
  "mensagem": "Entendi! Vou registrar esse gasto para você."
}
\`\`\`

CATEGORIAS: Alimentação, Transporte, Moradia, Saúde, Lazer, Educação, Assinaturas, Salário, Renda Extra, Outros
REGRAS: valores negativos = despesas, positivos = receitas. Responda em português do Brasil.`;

    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemPrompt: systemPrompt,
        messages: [
          ...this.historico.slice(-10).map(m => ({
            role: m.tipo === 'user' ? 'user' : 'assistant',
            content: m.texto
          })),
          { role: 'user', content: mensagem }
        ]
      })
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || 'Erro ' + response.status);
    }

    const data = await response.json();
    return data.texto || data.content?.[0]?.text || '';
  },

  // ── Coletar dados financeiros ──────────────────
  _coletarDados() {
    const mes = FaciliteState.mesAtual;
    const ano = FaciliteState.anoAtual;
    const totais = FaciliteStorage.getTotaisMes(mes, ano);
    const lancamentos = FaciliteStorage.getLancamentosMes(mes, ano);
    const receita = FaciliteStorage.get('receita');
    const assinaturas = (FaciliteStorage.get('assinaturas') || []).filter(s => s.ativa);

    return {
      mes: mes,
      ano: ano,
      receitaMensal: receita?.mensal || 0,
      totalReceitas: totais.receita,
      totalDespesas: totais.despesas,
      saldoDisponivel: totais.disponivel,
      percentualGasto: totais.pct,
      gastosFixos: totais.fixos,
      gastosVariaveis: totais.variaveis,
      totalAssinaturas: assinaturas.reduce((s, a) => s + a.valor, 0),
      ultimosLancamentos: lancamentos.slice(0, 10).map(l => ({
        descricao: l.descricao,
        valor: l.valor,
        categoria: l.categoria,
        data: l.data
      }))
    };
  },

  // ── UI helpers ─────────────────────────────────
  _getSessao() {
    try { return JSON.parse(localStorage.getItem('facilite_sessao') || '{}'); } catch(e) { return {}; }
  },

  _adicionarMensagem(tipo, texto) {
    this.historico.push({ tipo, texto });
    const lista = document.getElementById('chat-mensagens');
    if (!lista) return;

    const div = document.createElement('div');
    div.className = 'chat-msg chat-msg--' + tipo;

    // Converter **texto** em negrito
    const html = escapeHTML(texto)
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\n/g, '<br>');

    div.innerHTML = `<div class="chat-msg__balao">${html}</div>`;
    lista.appendChild(div);
    this._scrollBottom();
  },

  _mostrarDigitando() {
    this._digitando = true;
    const lista = document.getElementById('chat-mensagens');
    if (!lista) return;
    lista.insertAdjacentHTML('beforeend', `
      <div class="chat-msg chat-msg--bot" id="chat-digitando">
        <div class="chat-msg__balao">
          <span class="chat-dots"><span></span><span></span><span></span></span>
        </div>
      </div>
    `);
    this._scrollBottom();
  },

  _esconderDigitando() {
    this._digitando = false;
    document.getElementById('chat-digitando')?.remove();
  },

  _scrollBottom() {
    const lista = document.getElementById('chat-mensagens');
    if (lista) lista.scrollTop = lista.scrollHeight;
  },

  _keydown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      FaciliteChat.enviar();
    }
  },

  _autoResize(el) {
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 100) + 'px';
  },
};

window.FaciliteChat = FaciliteChat;
