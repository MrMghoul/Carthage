import { Router, Request, Response } from 'express';
import pool from '../database';

const router = Router();

// POST /api/orders — Créer une commande avec ses items
router.post('/', async (req: Request, res: Response) => {
  const { tableId, items } = req.body;

  if (!tableId || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'tableId et items requis' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const total = items.reduce(
      (sum: number, item: any) => sum + parseFloat(item.price) * item.quantity,
      0
    );

    // Annuler les commandes en cours existantes pour cette table
    await client.query(
      `UPDATE orders SET status = 'annulé' WHERE table_id = $1 AND status = 'en_cours'`,
      [tableId]
    );

    // Créer la nouvelle commande
    const orderResult = await client.query(
      `INSERT INTO orders (table_id, total) VALUES ($1, $2) RETURNING *`,
      [tableId, total]
    );
    const order = orderResult.rows[0];

    // Insérer les items
    for (const item of items) {
      await client.query(
        `INSERT INTO order_items (order_id, menu_item_id, name, price, quantity)
         VALUES ($1, $2, $3, $4, $5)`,
        [order.id, item.id, item.name, parseFloat(item.price), item.quantity]
      );
    }

    await client.query('COMMIT');
    console.log(`[ORDERS] ✅ Commande #${order.id} créée pour table ${tableId} — Total: ${total} €`);

    return res.status(201).json({ ...order, items });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[ORDERS] Erreur POST:', error);
    return res.status(500).json({ error: 'Erreur serveur' });
  } finally {
    client.release();
  }
});

// GET /api/orders/table/:tableId — Commande active d'une table
router.get('/table/:tableId', async (req: Request, res: Response) => {
  const { tableId } = req.params;
  console.log(`[ORDERS] 🔍 GET /table/${tableId} - Début de la requête`);
  
  try {
    console.log(`[ORDERS] 🔄 Requête DB : SELECT * FROM orders WHERE table_id = ${tableId} AND status = 'en_cours'`);
    const orderResult = await pool.query(
      `SELECT * FROM orders WHERE table_id = $1 AND status = 'en_cours' ORDER BY created_at DESC LIMIT 1`,
      [tableId]
    );
    console.log(`[ORDERS] ✅ Résultat query orders:`, orderResult.rows.length, 'ligne(s)');
    
    if (orderResult.rows.length === 0) {
      console.log(`[ORDERS] ℹ️ Aucune commande trouvée, renvoi null`);
      return res.json(null);
    }
    
    const order = orderResult.rows[0];
    console.log(`[ORDERS] 🔄 Requête DB : SELECT * FROM order_items WHERE order_id = ${order.id}`);
    
    const itemsResult = await pool.query(
      `SELECT * FROM order_items WHERE order_id = $1`,
      [order.id]
    );
    console.log(`[ORDERS] ✅ Résultat query items:`, itemsResult.rows.length, 'ligne(s)');
    console.log(`[ORDERS] 📤 Envoi de la réponse`);
    
    return res.json({ ...order, items: itemsResult.rows });
  } catch (error) {
    console.error('[ORDERS] ❌ Erreur GET table:', error);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
});

// GET /api/orders/all — Toutes les commandes en cours (pour la cuisine)
router.get('/all', async (_req: Request, res: Response) => {
  try {
    const result = await pool.query(`
      SELECT o.*, t.number AS table_number,
        json_agg(json_build_object(
          'id', oi.id, 'name', oi.name, 'price', oi.price, 'quantity', oi.quantity
        )) AS items
      FROM orders o
      JOIN tables t ON o.table_id = t.id
      JOIN order_items oi ON oi.order_id = o.id
      WHERE o.status = 'en_cours'
      GROUP BY o.id, t.number
      ORDER BY o.created_at ASC
    `);
    return res.json(result.rows);
  } catch (error) {
    console.error('[ORDERS] Erreur GET all:', error);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
});

// PUT /api/orders/table/:tableId/status — Marquer la commande d'une table comme payée
router.put('/table/:tableId/status', async (req: Request, res: Response) => {
  const { tableId } = req.params;
  const { status } = req.body;

  console.log(`[ORDERS] 📝 PUT /table/${tableId}/status — Mise à jour statut: ${status}`);

  try {
    // Trouver la commande active de la table
    const orderResult = await pool.query(
      `SELECT id FROM orders WHERE table_id = $1 AND status != 'payé' ORDER BY created_at DESC LIMIT 1`,
      [tableId]
    );

    if (orderResult.rows.length === 0) {
      console.log(`[ORDERS] ℹ️ Aucune commande active trouvée`);
      return res.status(404).json({ error: 'Aucune commande active' });
    }

    const orderId = orderResult.rows[0].id;
    console.log(`[ORDERS] 🔄 Mise à jour commande #${orderId} au statut: ${status}`);

    // Mettre à jour le statut
    const updateResult = await pool.query(
      `UPDATE orders SET status = $1 WHERE id = $2 RETURNING *`,
      [status, orderId]
    );

    console.log(`[ORDERS] ✅ Commande #${orderId} marquée comme ${status}`);
    return res.json(updateResult.rows[0]);
  } catch (error) {
    console.error('[ORDERS] ❌ Erreur PUT table/:tableId/status:', error);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
});

// PUT /api/orders/:id/status — Changer le statut (payé, annulé)
router.put('/:id/status', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { status } = req.body;
  const validStatuses = ['en_cours', 'payé', 'annulé'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: 'Statut invalide' });
  }
  try {
    const result = await pool.query(
      `UPDATE orders SET status = $1 WHERE id = $2 RETURNING *`,
      [status, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Commande introuvable' });
    }
    return res.json(result.rows[0]);
  } catch (error) {
    console.error('[ORDERS] Erreur PUT status:', error);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
});

export default router;
