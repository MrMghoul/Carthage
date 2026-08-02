import bcrypt from 'bcrypt';
import pool, { initDatabase } from './database';
import dotenv from 'dotenv';

dotenv.config();

const seed = async () => {
  await initDatabase();

  // ── Utilisateurs ──────────────────────────────────────────
  const passwordHash = await bcrypt.hash('password123', 10);

  await pool.query(`
    INSERT INTO users (username, password_hash, roles) VALUES
      ('serveur1', $1, '{serveur}'),
      ('cuisine1', $1, '{cuisine}'),
      ('polyvalent1', $1, '{serveur,cuisine}')
    ON CONFLICT (username) DO NOTHING;
  `, [passwordHash]);

  console.log('✅ Utilisateurs créés');

  // ── Produits du menu ────────────────────────────────────────
  const menuItems = [
    // Autres
    { name: 'Thé vert',          description: 'Thé vert nature',                               price: 3.50,  category: 'autres'   },
    { name: 'Harissa',           description: 'Harissa maison',                                price: 3.00,  category: 'autres'   },
    // Plats
    { name: 'Fricassé',          description: 'Pomme de terre, thon, oeuf, persil, olive',     price: 2.50,  category: 'plats'    },
    { name: 'Sandwich',          description: 'Pain, thon, salade tunisienne, oeuf, olives',   price: 5.00,  category: 'plats'    },
    { name: 'Brick',             description: 'Brick croustillante garnie',                    price: 5.00,  category: 'plats'    },
    { name: 'Brick Tunisienne',  description: 'Brick garnie à la tunisienne',                  price: 10.00, category: 'plats'    },
    { name: 'Brick Mechouia',    description: 'Brick garnie à la mechouia',                    price: 10.00, category: 'plats'    },
    { name: 'Carthage',          description: 'Plat traditionnel Carthage',                    price: 12.00, category: 'plats'    },
    { name: 'Salade Tunisienne', description: 'Salade fraîche à la tunisienne',                price: 6.00,  category: 'plats'    },
    { name: 'Salade Mechouia',   description: 'Salade de légumes grillés',                    price: 6.00,  category: 'plats'    },
    { name: 'Couscous',          description: 'Couscous maison avec légumes et viande',        price: 18.00, category: 'plats'    },
    // Desserts
    { name: 'Patisserie',        description: 'Pâtisserie orientale du jour',                  price: 2.00,  category: 'desserts' },
    { name: 'Rose des Sables',   description: 'Rose des sables artisanale',                    price: 2.50,  category: 'desserts' },
    { name: 'Makroud',           description: 'Gâteau de semoule aux dattes',                  price: 1.50,  category: 'desserts' },
    { name: 'Beignet',           description: 'Beignet nature',                                price: 2.50,  category: 'desserts' },
    { name: 'Beignet sucre',     description: 'Beignet au sucre',                              price: 2.50,  category: 'desserts' },
    { name: 'Beignet miel',      description: 'Beignet au miel',                               price: 3.00,  category: 'desserts' },
    // Boissons
    { name: 'Eau minérale',      description: '50cl',                                          price: 1.50,  category: 'boissons' },
    { name: 'Soda',              description: '33cl',                                          price: 2.00,  category: 'boissons' },
    { name: 'Citronnade',        description: 'Citronnade fraîche',                            price: 2.50,  category: 'boissons' },
    { name: 'Thé',               description: 'Verre',                                         price: 2.00,  category: 'boissons' },
    { name: 'Thé Pignon',        description: 'Thé aux pignons',                               price: 3.00,  category: 'boissons' },
    { name: 'Café',              description: 'Café express',                                  price: 2.00,  category: 'boissons' },
    { name: 'Café crème',        description: 'Café avec crème',                               price: 3.00,  category: 'boissons' },
    { name: 'Café noisette',     description: 'Café noisette',                                 price: 2.50,  category: 'boissons' },
    { name: 'Café américain',    description: 'Café long',                                     price: 2.50,  category: 'boissons' },
  ];

  for (const item of menuItems) {
    await pool.query(
      `INSERT INTO menu_items (name, description, price, category)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT DO NOTHING`,
      [item.name, item.description, item.price, item.category]
    );
  }

  console.log(`✅ ${menuItems.length} produits du menu créés`);

  // ── Tables du restaurant ───────────────────────────────────
  const tables = [
    { number: 'T1',   capacity: 2 },
    { number: 'T2',   capacity: 2 },
    { number: 'T3',   capacity: 4 },
    { number: 'T4',   capacity: 4 },
    { number: 'T5',   capacity: 4 },
    { number: 'T6',   capacity: 6 },
    { number: 'S1',   capacity: 2 },
    { number: 'S2',   capacity: 2 },
    { number: 'S3',   capacity: 4 },
    { number: 'Bar1', capacity: 1 },
    { number: 'Bar2', capacity: 1 },
  ];

  for (const table of tables) {
    await pool.query(
      `INSERT INTO tables (number, capacity) VALUES ($1, $2) ON CONFLICT (number) DO NOTHING`,
      [table.number, table.capacity]
    );
  }

  console.log(`✅ ${tables.length} tables créées`);
  console.log('');
  console.log('  Comptes de test :');
  console.log('  serveur1 / cuisine1 / polyvalent1  →  mot de passe : password123');
  console.log('');

  await pool.end();
  process.exit(0);
};

seed().catch((err) => {
  console.error('❌ Erreur seed:', err);
  process.exit(1);
});
