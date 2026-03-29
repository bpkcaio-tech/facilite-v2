// ═══════════════════════════════════════════════════════════
//  FACILITE — Backend Serverless (Vercel)
//  Proxy seguro para a API Anthropic
//  A chave ANTHROPIC_API_KEY fica no servidor, nunca no browser
// ═══════════════════════════════════════════════════════════

export default async function handler(req, res) {
  // CORS — permite chamadas do próprio site
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  // Chave guardada como variável de ambiente no Vercel
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'API key não configurada no servidor.' });
  }

  const { messages, systemPrompt } = req.body || {};

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'Campo "messages" inválido ou vazio.' });
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-5-haiku-20241022',
        max_tokens: 1024,
        system: systemPrompt || 'Você é um assistente financeiro pessoal.',
        messages,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        error: data?.error?.message || `Erro ${response.status} da API Anthropic`,
      });
    }

    return res.status(200).json(data);
  } catch (err) {
    console.error('[api/chat] Erro interno:', err.message);
    return res.status(500).json({ error: 'Erro interno ao chamar a API.' });
  }
}
