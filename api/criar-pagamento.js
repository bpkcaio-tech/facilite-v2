export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST');
  res.setHeader('Content-Type', 'application/json');

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  const token = process.env.MP_ACCESS_TOKEN;
  if (!token) {
    return res.status(500).json({ error: 'Token do Mercado Pago não configurado' });
  }

  const { valor, descricao, email, nome, userId } = req.body;

  try {
    const response = await fetch('https://api.mercadopago.com/v1/payments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token,
        'X-Idempotency-Key': 'facilite-' + (userId || 'anon') + '-' + Date.now(),
      },
      body: JSON.stringify({
        transaction_amount: Number(valor),
        description: descricao || 'Facilite Premium',
        payment_method_id: 'pix',
        payer: {
          email: email || 'usuario@facilite.app',
          first_name: (nome || 'Usuario').split(' ')[0],
          last_name: (nome || 'Usuario').split(' ').slice(1).join(' ') || 'Facilite',
        },
        metadata: { userId: userId || 'anonimo' },
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(400).json({ error: data.message || 'Erro Mercado Pago' });
    }

    return res.status(200).json({
      id: data.id,
      status: data.status,
      qr_code: data.point_of_interaction?.transaction_data?.qr_code,
      qr_code_base64: data.point_of_interaction?.transaction_data?.qr_code_base64,
    });

  } catch(e) {
    return res.status(500).json({ error: e.message });
  }
}
