import { Router, Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import pool from '../database';

const router = Router();

// POST /api/auth/register
router.post('/register', async (req: Request, res: Response) => {
  const { username, password, roles } = req.body;

  console.log(`\n[REGISTER] ──────────────────────────────`);
  console.log(`[REGISTER] Tentative d'inscription`);
  console.log(`[REGISTER] Username: "${username}", Rôles: ${JSON.stringify(roles)}`);

  if (!username || !password || !roles) {
    console.log(`[REGISTER] ❌ Champs manquants`);
    return res.status(400).json({ error: 'Tous les champs sont requis' });
  }

  if (!Array.isArray(roles) || roles.length === 0) {
    return res.status(400).json({ error: 'Sélectionnez au moins un rôle' });
  }

  const validRoles = ['serveur', 'cuisine'];
  const invalidRole = roles.find((r: string) => !validRoles.includes(r));
  if (invalidRole) {
    console.log(`[REGISTER] ❌ Rôle invalide: "${invalidRole}"`);
    return res.status(400).json({ error: 'Rôle invalide (serveur ou cuisine)' });
  }

  if (username.trim().length < 3) {
    return res.status(400).json({ error: 'Le nom d\'utilisateur doit faire au moins 3 caractères' });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: 'Le mot de passe doit faire au moins 6 caractères' });
  }

  try {
    console.log(`[REGISTER] 🔍 Vérification si le username existe déjà...`);
    const existing = await pool.query(
      'SELECT id FROM users WHERE username = $1',
      [username.trim()]
    );

    if (existing.rows.length > 0) {
      console.log(`[REGISTER] ❌ Username "${username}" déjà utilisé`);
      return res.status(409).json({ error: 'Ce nom d\'utilisateur est déjà pris' });
    }

    console.log(`[REGISTER] 🔐 Hashage du mot de passe...`);
    const passwordHash = await bcrypt.hash(password, 10);

    const result = await pool.query(
      'INSERT INTO users (username, password_hash, roles) VALUES ($1, $2, $3) RETURNING id, username, roles',
      [username.trim(), passwordHash, roles]
    );

    const newUser = result.rows[0];
    console.log(`[REGISTER] ✅ Utilisateur créé → id: ${newUser.id}, rôles: ${newUser.roles}`);

    const token = jwt.sign(
      { id: newUser.id, username: newUser.username, roles: newUser.roles },
      process.env.JWT_SECRET as string,
      { expiresIn: '24h' }
    );

    console.log(`[REGISTER] ✅ Inscription réussie pour "${username}"`);
    console.log(`[REGISTER] ──────────────────────────────\n`);

    return res.status(201).json({
      token,
      user: {
        id: newUser.id,
        username: newUser.username,
        roles: newUser.roles,
      },
    });
  } catch (error) {
    console.error(`[REGISTER] 💥 Erreur serveur:`, error);
    return res.status(500).json({ error: 'Erreur serveur, réessayez plus tard' });
  }
});

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response) => {
  const { username, password } = req.body;

  console.log(`\n[LOGIN] ──────────────────────────────`);
  console.log(`[LOGIN] Tentative de connexion`);
  console.log(`[LOGIN] Username: "${username}"`);
  console.log(`[LOGIN] IP: ${req.ip}`);
  console.log(`[LOGIN] Date: ${new Date().toLocaleString('fr-FR')}`);

  if (!username || !password) {
    console.log(`[LOGIN] ❌ Champs manquants`);
    return res.status(400).json({ error: 'Veuillez remplir tous les champs' });
  }

  try {
    console.log(`[LOGIN] 🔍 Recherche de l'utilisateur en base...`);
    const result = await pool.query(
      'SELECT * FROM users WHERE username = $1',
      [username]
    );

    if (result.rows.length === 0) {
      console.log(`[LOGIN] ❌ Utilisateur "${username}" introuvable en base`);
      return res.status(401).json({ error: 'Nom d\'utilisateur incorrect' });
    }

    const user = result.rows[0];
    console.log(`[LOGIN] ✅ Utilisateur trouvé → id: ${user.id}, rôles: ${user.roles}`);
    console.log(`[LOGIN] 🔐 Vérification du mot de passe...`);

    const validPassword = await bcrypt.compare(password, user.password_hash);

    if (!validPassword) {
      console.log(`[LOGIN] ❌ Mot de passe incorrect pour "${username}"`);
      return res.status(401).json({ error: 'Mot de passe incorrect' });
    }

    console.log(`[LOGIN] ✅ Mot de passe valide`);
    console.log(`[LOGIN] 🎟️  Génération du token JWT...`);

    const token = jwt.sign(
      { id: user.id, username: user.username, roles: user.roles },
      process.env.JWT_SECRET as string,
      { expiresIn: '24h' }
    );

    console.log(`[LOGIN] ✅ Connexion réussie pour "${username}" (rôles: ${user.roles})`);
    console.log(`[LOGIN] ──────────────────────────────\n`);

    return res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        roles: user.roles,
      },
    });
  } catch (error) {
    console.error(`[LOGIN] 💥 Erreur serveur:`, error);
    return res.status(500).json({ error: 'Erreur serveur, réessayez plus tard' });
  }
});

export default router;

