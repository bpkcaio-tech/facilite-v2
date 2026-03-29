export default async function handler(req, res) {
  const { id } = req.query;

  if (!id) return res.status(400).json({ error: 'ID não fornecido' });

  if (!process.env.MP_ACCESS_TOKEN) {
    return res.status(500).json({ error: 'MP_ACCESS_TOKEN não configurado' });
  }

  try {
    const response = await fetch(`https://api.mercadopago.com/v1/payments/${id}`, {
      headers: {
        'Authorization': `Bearer ${process.env.MP_ACCESS_TOKEN}`,
      }
    });

    const data = await response.json();
    return res.status(200).json({ status: data.status });

  } catch (e) {
    return res.status(500).json({ error: 'Erro ao verificar: ' + e.message });
  }
}
