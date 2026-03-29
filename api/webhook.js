export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { type, data } = req.body || {};

  if (type === 'payment' && data?.id) {
    try {
      const response = await fetch(`https://api.mercadopago.com/v1/payments/${data.id}`, {
        headers: { 'Authorization': `Bearer ${process.env.MP_ACCESS_TOKEN}` }
      });
      const pagamento = await response.json();

      if (pagamento.status === 'approved') {
        console.log('Pagamento aprovado:', pagamento.id, 'userId:', pagamento.metadata?.userId);
      }
    } catch (e) {
      console.error('Webhook error:', e);
    }
  }

  return res.status(200).json({ received: true });
}
