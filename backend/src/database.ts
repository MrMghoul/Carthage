import { Pool } from 'pg';
import dotenv from 'dotenv';
import dns from 'dns';

// Force IPv4
dns.setDefaultResultOrder('ipv4first');

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  family: 4,
} as any);

export const initDatabase = async (): Promise<void> => {
  // Créer la table avec le nouveau schéma (roles = tableau)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username VARCHAR(100) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      roles TEXT[] NOT NULL DEFAULT '{serveur}',
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS menu_items (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      description TEXT,
      price DECIMAL(10,2) NOT NULL,
      category VARCHAR(50) NOT NULL,
      available BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS tables (
      id SERIAL PRIMARY KEY,
      number VARCHAR(20) UNIQUE NOT NULL,
      capacity INT NOT NULL DEFAULT 4,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS orders (
      id SERIAL PRIMARY KEY,
      table_id INT NOT NULL REFERENCES tables(id) ON DELETE CASCADE,
      status VARCHAR(20) NOT NULL DEFAULT 'en_cours',
      total DECIMAL(10,2) NOT NULL DEFAULT 0,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS order_items (
      id SERIAL PRIMARY KEY,
      order_id INT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      menu_item_id INT,
      name VARCHAR(100) NOT NULL,
      price DECIMAL(10,2) NOT NULL,
      quantity INT NOT NULL
    );
  `);

  console.log('Base de données initialisée');
};

export default pool;
