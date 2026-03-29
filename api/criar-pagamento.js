export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  const { valor, descricao, email, nome, userId } = req.body;

  if (!process.env.MP_ACCESS_TOKEN) {
    return res.status(500).json({ error: 'MP_ACCESS_TOKEN não configurado' });
  }

  try {
    const response = await fetch('https://api.mercadopago.com/v1/payments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.MP_ACCESS_TOKEN}`,
        'X-Idempotency-Key': `facilite-${userId}-${Date.now()}`,
      },
      body: JSON.stringify({
        transaction_amount: valor || 29.90,
        description: descricao || 'Facilite Premium - 1 mes',
        payment_method_id: 'pix',
        payer: {
          email: email || 'usuario@facilite.app',
          first_name: (nome || 'Usuario').split(' ')[0],
          last_name: (nome || 'Usuario').split(' ').slice(1).join(' ') || 'Facilite',
        },
        notification_url: `https://facilite-v2.vercel.app/api/webhook`,
        metadata: { userId: userId || 'anonimo' },
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('MP Error:', data);
      return res.status(400).json({ error: data.message || 'Erro ao criar pagamento' });
    }

    return res.status(200).json({
      id: data.id,
      status: data.status,
      qr_code: data.point_of_interaction?.transaction_data?.qr_code,
      qr_code_base64: data.point_of_interaction?.transaction_data?.qr_code_base64,
    });

  } catch (e) {
    console.error('Erro criar pagamento:', e);
    return res.status(500).json({ error: 'Erro interno: ' + e.message });
  }
}
