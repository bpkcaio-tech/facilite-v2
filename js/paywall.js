// ═══════════════════════════════════════════════════
//  FACILITE — PAYWALL.JS
// ═══════════════════════════════════════════════════
window.FacilitePaywall = {

  abrir: function(msg) {
    var anterior = document.getElementById('facilite-paywall-modal');
    if (anterior) anterior.remove();

    if (!document.getElementById('paywall-css')) {
      var st = document.createElement('style');
      st.id = 'paywall-css';
      st.textContent = [
        '.pw-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.85);backdrop-filter:blur(8px);z-index:999997}',
        '.pw-box{position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:#0F1A12;border:1px solid rgba(34,197,94,0.25);border-radius:20px;padding:32px;width:420px;max-width:95vw;max-height:90vh;overflow-y:auto;z-index:999998;box-shadow:0 24px 64px rgba(0,0,0,0.7),0 0 40px rgba(34,197,94,0.1);animation:pwIn 0.3s cubic-bezier(0.34,1.56,0.64,1)}',
        '@keyframes pwIn{from{opacity:0;transform:translate(-50%,-48%) scale(0.93)}to{opacity:1;transform:translate(-50%,-50%) scale(1)}}',
        '.pw-close{position:absolute;top:14px;right:14px;background:rgba(255,255,255,0.06);border:none;color:#9CA3AF;width:30px;height:30px;border-radius:8px;cursor:pointer;font-size:16px;display:flex;align-items:center;justify-content:center}',
        '.pw-badge{display:inline-block;background:linear-gradient(135deg,#22C55E,#16A34A);color:#000;font-size:11px;font-weight:700;padding:4px 12px;border-radius:20px;font-family:"DM Sans",sans-serif;letter-spacing:1px;margin-bottom:12px}',
        '.pw-title{font-family:"Sora",sans-serif;font-size:22px;font-weight:700;color:#F0FDF4;margin:0 0 8px}',
        '.pw-sub{font-size:14px;color:#6B7280;margin:0 0 20px;line-height:1.6}',
        '.pw-preco{background:rgba(34,197,94,0.07);border:1px solid rgba(34,197,94,0.18);border-radius:12px;padding:16px;text-align:center;margin-bottom:20px}',
        '.pw-valor{font-family:"Sora",sans-serif;font-size:38px;font-weight:700;color:#22C55E}',
        '.pw-periodo{font-size:16px;color:#6B7280}',
        '.pw-lista{list-style:none;padding:0;margin:0 0 24px;display:flex;flex-direction:column;gap:9px}',
        '.pw-lista li{font-size:14px;color:#F0FDF4;font-family:"DM Sans",sans-serif}',
        '.pw-btn{width:100%;padding:14px;background:linear-gradient(135deg,#22C55E,#16A34A);border:none;border-radius:12px;color:#000;font-family:"Sora",sans-serif;font-size:16px;font-weight:700;cursor:pointer;transition:all 0.2s;margin-bottom:16px}',
        '.pw-btn:hover{transform:translateY(-1px);box-shadow:0 8px 24px rgba(34,197,94,0.35)}',
        '.pw-btn:disabled{opacity:0.6;cursor:not-allowed;transform:none}',
        '.pw-pix{display:none;text-align:center}',
        '.pw-pix-titulo{font-size:14px;font-weight:600;color:#F0FDF4;margin-bottom:12px}',
        '.pw-qr-wrap{background:white;padding:8px;border-radius:12px;display:inline-block;margin-bottom:12px}',
        '.pw-qr-wrap img{width:180px;height:180px;display:block;border-radius:6px}',
        '.pw-copy-row{display:flex;gap:8px;margin-bottom:12px}',
        '.pw-code-input{flex:1;background:#070E0A;border:1px solid rgba(255,255,255,0.08);border-radius:8px;color:#6B7280;font-size:11px;padding:8px 10px;outline:none;font-family:monospace}',
        '.pw-copy-btn{padding:8px 14px;background:rgba(34,197,94,0.12);border:1px solid rgba(34,197,94,0.3);border-radius:8px;color:#22C55E;font-size:12px;font-weight:600;cursor:pointer;white-space:nowrap}',
        '.pw-timer{font-size:13px;color:#F59E0B;font-weight:500;margin-bottom:12px}',
        '.pw-steps{background:rgba(255,255,255,0.03);border-radius:10px;padding:12px;font-size:12px;color:#6B7280;line-height:1.8;margin-bottom:12px}',
        '.pw-seguro{font-size:11px;color:#374151;text-align:center;margin:0}'
      ].join('');
      document.head.appendChild(st);
    }

    var mensagem = msg || 'Assine agora e tenha acesso completo à plataforma.';

    var modal = document.createElement('div');
    modal.id = 'facilite-paywall-modal';
    modal.innerHTML = [
      '<div class="pw-overlay" onclick="FacilitePaywall.fechar()"></div>',
      '<div class="pw-box">',
        '<button class="pw-close" onclick="FacilitePaywall.fechar()">\u2715</button>',
        '<div class="pw-badge">\u2B50 PREMIUM</div>',
        '<h2 class="pw-title">Desbloqueie o Facilite completo</h2>',
        '<p class="pw-sub">' + mensagem + '</p>',
        '<div class="pw-preco">',
          '<span class="pw-valor">R$ 29,90</span>',
          '<span class="pw-periodo">/m\u00EAs</span>',
        '</div>',
        '<ul class="pw-lista">',
          '<li>\u2705 Lan\u00E7amentos ilimitados</li>',
          '<li>\u2705 Relat\u00F3rios completos e exporta\u00E7\u00E3o</li>',
          '<li>\u2705 Reservas e metas financeiras</li>',
          '<li>\u2705 Contas e assinaturas</li>',
          '<li>\u2705 Notifica\u00E7\u00F5es inteligentes</li>',
          '<li>\u2705 Suporte priorit\u00E1rio</li>',
        '</ul>',
        '<button class="pw-btn" id="pw-btn-pix" onclick="FacilitePaywall.gerarPix()">',
          '\uD83D\uDCA0 Pagar com PIX \u2014 R$ 29,90',
        '</button>',
        '<div class="pw-pix" id="pw-pix-area">',
          '<div class="pw-pix-titulo">\uD83D\uDCF1 Escaneie o QR Code para pagar</div>',
          '<div class="pw-qr-wrap"><img id="pw-qr-img" src="" alt="QR Code PIX"></div>',
          '<div class="pw-copy-row">',
            '<input type="text" class="pw-code-input" id="pw-code-input" readonly>',
            '<button class="pw-copy-btn" onclick="FacilitePaywall.copiar()">\uD83D\uDCCB Copiar</button>',
          '</div>',
          '<div class="pw-timer">\u23F3 Aguardando pagamento... <span id="pw-timer">10:00</span></div>',
          '<div class="pw-steps">1. Abra o app do seu banco<br>2. Escolha pagar via PIX<br>3. Escaneie o QR Code ou cole o c\u00F3digo<br>4. Acesso liberado na hora!</div>',
        '</div>',
        '<p class="pw-seguro">\uD83D\uDD12 Pagamento seguro via Mercado Pago</p>',
      '</div>'
    ].join('');

    document.body.appendChild(modal);
  },

  fechar: function() {
    var m = document.getElementById('facilite-paywall-modal');
    if (m) m.remove();
    this._pararTimer();
    this._pararPolling();
  },

  gerarPix: async function() {
    var btn = document.getElementById('pw-btn-pix');
    if (!btn) return;
    btn.textContent = '\u23F3 Gerando PIX...';
    btn.disabled = true;

    try {
      var sessao = {};
      try { sessao = JSON.parse(localStorage.getItem('facilite_sessao') || '{}'); } catch(e) {}

      var res = await fetch('/api/criar-pagamento', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          valor: 29.90,
          descricao: 'Facilite Premium - 1 mes',
          email: sessao.email || 'usuario@facilite.app',
          nome: sessao.nome || 'Usuario',
          userId: sessao.id || ('anonimo_' + Date.now())
        })
      });

      var data = await res.json();

      if (data.qr_code && data.qr_code_base64) {
        btn.style.display = 'none';
        var area = document.getElementById('pw-pix-area');
        if (area) area.style.display = 'block';
        var img = document.getElementById('pw-qr-img');
        if (img) img.src = 'data:image/png;base64,' + data.qr_code_base64;
        var inp = document.getElementById('pw-code-input');
        if (inp) inp.value = data.qr_code;
        this._pagamentoId = data.id;
        this._iniciarTimer(600);
        this._iniciarPolling(data.id);
      } else {
        throw new Error(data.error || 'QR Code nao gerado');
      }
    } catch(e) {
      if (btn) {
        btn.textContent = '\uD83D\uDCA0 Pagar com PIX \u2014 R$ 29,90';
        btn.disabled = false;
      }
      alert('Erro ao gerar PIX: ' + e.message);
    }
  },

  copiar: function() {
    var inp = document.getElementById('pw-code-input');
    if (!inp) return;
    inp.select();
    try { navigator.clipboard.writeText(inp.value); } catch(e) { document.execCommand('copy'); }
    var btn = document.querySelector('.pw-copy-btn');
    if (btn) { btn.textContent = '\u2705 Copiado!'; setTimeout(function() { btn.textContent = '\uD83D\uDCCB Copiar'; }, 2000); }
  },

  _timer: null,
  _iniciarTimer: function(seg) {
    this._pararTimer();
    var restante = seg;
    var self = this;
    this._timer = setInterval(function() {
      restante--;
      var el = document.getElementById('pw-timer');
      if (!el) { self._pararTimer(); return; }
      var m = Math.floor(restante / 60).toString().padStart(2, '0');
      var s = (restante % 60).toString().padStart(2, '0');
      el.textContent = m + ':' + s;
      if (restante <= 0) { self._pararTimer(); el.textContent = 'Expirado'; el.style.color = '#EF4444'; }
    }, 1000);
  },

  _pararTimer: function() {
    if (this._timer) { clearInterval(this._timer); this._timer = null; }
  },

  _polling: null,
  _iniciarPolling: function(id) {
    this._pararPolling();
    var self = this;
    this._polling = setInterval(async function() {
      try {
        var res = await fetch('/api/verificar-pagamento?id=' + id);
        var data = await res.json();
        if (data.status === 'approved') {
          self._pararPolling();
          self._pararTimer();
          self._aprovado();
        }
      } catch(e) {}
    }, 5000);
  },

  _pararPolling: function() {
    if (this._polling) { clearInterval(this._polling); this._polling = null; }
  },

  _aprovado: function() {
    FacilitePlano.ativar(1);
    this.fechar();

    var ok = document.createElement('div');
    ok.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.92);z-index:999999;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:16px';
    ok.innerHTML = [
      '<div style="font-size:64px">\uD83C\uDF89</div>',
      '<h2 style="font-family:Sora,sans-serif;font-size:28px;color:#22C55E;font-weight:700;margin:0">Pagamento confirmado!</h2>',
      '<p style="color:#6B7280;font-size:16px;margin:0">Bem-vindo ao Facilite Premium</p>',
      '<button onclick="location.reload()" style="margin-top:16px;padding:14px 32px;background:#22C55E;border:none;border-radius:12px;color:#000;font-family:DM Sans,sans-serif;font-size:16px;font-weight:700;cursor:pointer">Acessar plataforma completa \u2192</button>'
    ].join('');
    document.body.appendChild(ok);
  }
};
