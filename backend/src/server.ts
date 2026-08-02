import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { initDatabase } from './database';
import authRoutes from './routes/auth';
import menuRoutes from './routes/menu';
import tablesRoutes from './routes/tables';
import ordersRoutes from './routes/orders';

dotenv.config();

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

const start = async () => {
  try {
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

