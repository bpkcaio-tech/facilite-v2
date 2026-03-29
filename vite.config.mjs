import { defineConfig } from 'vite';
import fs   from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Lê o .env
function loadEnv() {
  const envPath = path.join(__dirname, '.env');
  if (!fs.existsSync(envPath)) return;
  fs.readFileSync(envPath, 'utf8').split('\n').forEach(line => {
    const [key, ...vals] = line.split('=');
    if (key && key.trim() && !key.trim().startsWith('#')) {
      process.env[key.trim()] = vals.join('=').trim();
    }
  });
}
loadEnv();

function apiPlugin() {
  return {
    name: 'facilite-api',
    configureServer(server) {
      server.middlewares.use('/api/chat', (req, res) => {
        res.setHeader('Content-Type', 'application/json');

        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end(JSON.stringify({ error: 'Método não permitido' }));
          return;
        }

        const apiKey = process.env.ANTHROPIC_API_KEY;
        if (!apiKey || apiKey.includes('COLOQUE_SUA_CHAVE')) {
          res.statusCode = 500;
          res.end(JSON.stringify({ error: 'Configure ANTHROPIC_API_KEY no arquivo .env' }));
          return;
        }

        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', async () => {
          try {
            const { messages, systemPrompt } = JSON.parse(body);
            const r = await fetch('https://api.anthropic.com/v1/messages', {
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
            const data = await r.json();
            res.statusCode = r.ok ? 200 : r.status;
            res.end(JSON.stringify(r.ok ? data : { error: data?.error?.message || 'Erro da API' }));
          } catch (err) {
            res.statusCode = 500;
            res.end(JSON.stringify({ error: err.message }));
          }
        });
      });
    },
  };
}

export default defineConfig({
  plugins: [apiPlugin()],
  // Garantir que arquivos em pages/ sejam servidos como estáticos
  server: {
    fs: {
      allow: ['.'],
    },
  },
  // Não usar SPA fallback para páginas parciais
  appType: 'mpa',
});
