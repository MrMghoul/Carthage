import { Router, Request, Response } from 'express';
import pool from '../database';

const router = Router();

// GET /api/menu — Liste tous les produits (filtrables par catégorie)
router.get('/', async (req: Request, res: Response) => {
  const { category } = req.query;
  try {
    let result;
    if (category) {
      result = await pool.query(
        'SELECT * FROM menu_items WHERE available = TRUE AND category = $1 ORDER BY name',
        [category]
      );
    } else {
      result = await pool.query(
        'SELECT * FROM menu_items WHERE available = TRUE ORDER BY category, name'
      );
    }
    return res.json(result.rows);
  } catch (error) {
    console.error('[MENU] Erreur GET:', error);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
});

// GET /api/menu/:id — Un produit
router.get('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const result = await pool.query('SELECT * FROM menu_items WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Produit introuvable' });
    }
    return res.json(result.rows[0]);
  } catch (error) {
    console.error('[MENU] Erreur GET/:id:', error);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
});

// POST /api/menu — Créer un produit
router.post('/', async (req: Request, res: Response) => {
  const { name, description, price, category } = req.body;
  if (!name || price === undefined || !category) {
    return res.status(400).json({ error: 'Champs requis : name, price, category' });
  }
  try {
    const result = await pool.query(
      'INSERT INTO menu_items (name, description, price, category) VALUES ($1, $2, $3, $4) RETURNING *',
      [name, description ?? '', price, category]
    );
    return res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('[MENU] Erreur POST:', error);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
});

// PUT /api/menu/:id — Modifier un produit
router.put('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, description, price, category, available } = req.body;
  try {
    const result = await pool.query(
      `UPDATE menu_items
       SET name = COALESCE($1, name),
           description = COALESCE($2, description),
           price = COALESCE($3, price),
           category = COALESCE($4, category),
           available = COALESCE($5, available)
       WHERE id = $6
       RETURNING *`,
      [name, description, price, category, available, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Produit introuvable' });
    }
    return res.json(result.rows[0]);
  } catch (error) {
    console.error('[MENU] Erreur PUT:', error);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
});

// DELETE /api/menu/:id — Supprimer un produit
router.delete('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const result = await pool.query('DELETE FROM menu_items WHERE id = $1 RETURNING id', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Produit introuvable' });
    }
    return res.json({ message: 'Produit supprimé' });
  } catch (error) {
    console.error('[MENU] Erreur DELETE:', error);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
});

export default router;
