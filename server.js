// @vercel-ignore
// ═══════════════════════════════════════════════════════════
//  FACILITE — Servidor local de desenvolvimento
//  Roda a API /api/chat localmente com sua chave do .env
//  Uso: npm run server
// ═══════════════════════════════════════════════════════════

import http   from 'http';
import fs     from 'fs';
import path   from 'path';
import { fileURLToPath } from 'url';

// Lê o arquivo .env manualmente (sem precisar de dotenv)
const __dir = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dir, '.env');
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf8').split('\n').forEach(line => {
    const [key, ...vals] = line.split('=');
    if (key && key.trim() && !key.trim().startsWith('#')) {
      process.env[key.trim()] = vals.join('=').trim();
    }
  });
}

const PORT = 3001;

const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') { res.writeHead(200); res.end(); return; }

  if (req.url !== '/api/chat' || req.method !== 'POST') {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Rota não encontrada' }));
    return;
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || apiKey === 'sk-ant-...') {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'ANTHROPIC_API_KEY não configurada no arquivo .env' }));
    return;
  }

  let body = '';
  req.on('data', chunk => body += chunk);
  req.on('end', async () => {
    try {
      const { messages, systemPrompt } = JSON.parse(body);

      const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-3-5-haiku-20241022',
          max_tokens: 1024,
          system: systemPrompt || '',
          messages,
        }),
      });

      const data = await anthropicRes.json();
      res.writeHead(anthropicRes.ok ? 200 : anthropicRes.status, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(anthropicRes.ok ? data : { error: data?.error?.message || 'Erro da API' }));
    } catch (err) {
      console.error('[server] Erro:', err.message);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
  });
});

server.listen(PORT, () => {
  console.log(`✅ API local rodando em http://localhost:${PORT}`);
  console.log(`   Chave configurada: ${process.env.ANTHROPIC_API_KEY ? 'sim ✓' : 'NÃO — configure o arquivo .env'}`);
});
