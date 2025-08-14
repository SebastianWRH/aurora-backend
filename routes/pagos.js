// routes/pagos.js
import express from 'express';
import fetch from 'node-fetch';

const router = express.Router();

router.post('/pagar', async (req, res) => {
    const { token, monto, email, id_usuario, items } = req.body;

    if (!token || !monto || !email || !id_usuario || !items) {
        return res.status(400).json({ success: false, error: 'Faltan datos para procesar el pago.' });
    }

    try {
        // Crear cargo en Culqi
        const culqiRes = await fetch('https://api.culqi.com/v2/charges', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.CULQI_SECRET_KEY}`
            },
            body: JSON.stringify({
                amount: Math.round(monto * 100), // En céntimos
                currency_code: 'PEN',
                email,
                source_id: token
            })
        });

        const pago = await culqiRes.json();

        if (!(culqiRes.ok && pago.object === 'charge')) {
            return res.status(400).json({ success: false, error: pago });
        }

        // Aquí podrías guardar el pedido en tu BD
        // Ejemplo: llamar a otro endpoint
        const pedido = {
            id: Date.now(), // Simulación de ID
            id_usuario,
            total: monto,
            items
        };

        res.json({
            success: true,
            pago,
            pedido
        });

    } catch (error) {
        console.error('Error procesando pago:', error);
        res.status(500).json({ success: false, error: 'Error interno del servidor.' });
    }
});

export default router;
