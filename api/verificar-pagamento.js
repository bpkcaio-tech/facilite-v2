module.exports = async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  const { id } = req.query;
  if (!id) return res.status(400).json({ error: 'ID não fornecido' });
  const token = process.env.MP_ACCESS_TOKEN;
  if (!token) return res.status(500).json({ error: 'Token não configurado' });
  try {
    const r = await fetch('https://api.mercadopago.com/v1/payments/' + id, {
      headers: { 'Authorization': 'Bearer ' + token }
    });
    const data = await r.json();
    return res.status(200).json({ status: data.status });
  } catch(e) {
    return res.status(500).json({ error: e.message });
  }
}