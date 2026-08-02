import { Router, Request, Response } from 'express';
import pool from '../database';

const router = Router();

// GET /api/tables
router.get('/', async (_req: Request, res: Response) => {
  try {
    const result = await pool.query('SELECT * FROM tables ORDER BY number');
    return res.json(result.rows);
  } catch (error) {
    console.error('[TABLES] Erreur GET:', error);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
});

// POST /api/tables
router.post('/', async (req: Request, res: Response) => {
  const { number, capacity } = req.body;
  if (!number || !number.trim()) {
    return res.status(400).json({ error: 'Le numéro de table est requis' });
  }
  try {
    const result = await pool.query(
      'INSERT INTO tables (number, capacity) VALUES ($1, $2) RETURNING *',
      [number.trim(), capacity ?? 4]
    );
    return res.status(201).json(result.rows[0]);
  } catch (error: any) {
    if (error.code === '23505') {
      return res.status(409).json({ error: 'Ce numéro de table existe déjà' });
    }
    console.error('[TABLES] Erreur POST:', error);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
});

// PUT /api/tables/:id
router.put('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { number, capacity } = req.body;
  try {
    const result = await pool.query(
      `UPDATE tables
       SET number   = COALESCE($1, number),
           capacity = COALESCE($2, capacity)
       WHERE id = $3 RETURNING *`,
      [number?.trim(), capacity, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Table introuvable' });
    }
    return res.json(result.rows[0]);
  } catch (error: any) {
    if (error.code === '23505') {
      return res.status(409).json({ error: 'Ce numéro de table existe déjà' });
    }
    console.error('[TABLES] Erreur PUT:', error);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
});

// DELETE /api/tables/:id
router.delete('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const result = await pool.query('DELETE FROM tables WHERE id = $1 RETURNING id', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Table introuvable' });
    }
    return res.json({ message: 'Table supprimée' });
  } catch (error) {
    console.error('[TABLES] Erreur DELETE:', error);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
});

export default router;
