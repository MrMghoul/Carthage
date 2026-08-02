import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import dns from 'dns';
import { promisify } from 'util';
import { initDatabase } from './database';
import authRoutes from './routes/auth';
import menuRoutes from './routes/menu';
import tablesRoutes from './routes/tables';
import ordersRoutes from './routes/orders';

dotenv.config();

const resolve4 = promisify(dns.resolve4);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(cors());
app.use(express.json());

// Log chaque requête entrante
app.use((req, _res, next) => {
  console.log(`[HTTP] ${req.method} ${req.path}`);
  next();
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/menu', menuRoutes);
app.use('/api/tables', tablesRoutes);
app.use('/api/orders', ordersRoutes);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', message: 'Serveur Restaurant opérationnel' });
});

// Résoudre Supabase hostname en IPv4 avant d'initialiser la base de données
const resolveSupabaseURL = async () => {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) return;
  
  const match = dbUrl.match(/postgresql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)/);
  if (match) {
    const hostname = match[3];
    try {
      console.log(`[DNS] Resolving ${hostname} to IPv4...`);
      const addresses = await resolve4(hostname);
      if (addresses.length > 0) {
        const ipv4 = addresses[0];
        console.log(`[DNS] Resolved ${hostname} → ${ipv4}`);
        process.env.DATABASE_URL = dbUrl.replace(hostname, ipv4);
      }
    } catch (err) {
      console.warn(`[DNS] Could not resolve ${hostname}, using original:`, err);
    }
  }
};

const start = async () => {
  try {
    // Résoudre le hostname Supabase en IPv4 avant tout
    await resolveSupabaseURL();
    
    await initDatabase();
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`\n🚀 ══════════════════════════════════`);
      console.log(`   Serveur Restaurant démarré`);
      console.log(`   URL : http://localhost:${PORT}`);
      console.log(`   Health : http://localhost:${PORT}/api/health`);
      console.log(`══════════════════════════════════\n`);
    });
  } catch (error) {
    console.error('❌ Erreur au démarrage:', error);
    process.exit(1);
  }
};

start();

