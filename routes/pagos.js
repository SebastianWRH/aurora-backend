import express from 'express';
import fetch from 'node-fetch';

const router = express.Router();

router.post('/pagar', async (req, res) => {
    const { token, monto, email, id_usuario, items } = req.body;

    if (!token || !monto || !email || !id_usuario || !items) {
        return res.status(400).json({ success: false, error: 'Faltan datos para procesar el pago.' });
    }

    try {
        const culqiRes = await fetch('https://api.culqi.com/v2/charges', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.CULQI_SECRET_KEY}`
            },
            body: JSON.stringify({
                amount: Math.round(monto * 100),
                currency_code: 'PEN',
                email: email,
                source_id: token
            })
        });

        const pago = await culqiRes.json();

        if (!(culqiRes.ok && pago.object === 'charge' && pago.outcome && pago.outcome.type === 'venta_exitosa')) {
            return res.status(400).json({ success: false, error: pago });
        }

        const pedidoRes = await fetch('https://aurora-backend-ve7u.onrender.com/pedido', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                id_usuario,
                total: monto,
                items
            })
        });

        const pedidoData = await pedidoRes.json();

        if (!pedidoRes.ok) {
            return res.status(400).json({ success: false, error: pedidoData });
        }

        res.json({
            success: true,
            pago,
            pedido: pedidoData
        });

    } catch (error) {
        console.error('Error procesando pago y pedido:', error);
        res.status(500).json({ success: false, error: 'Error interno del servidor.' });
    }
});

export default router;
