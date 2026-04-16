import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import Database from 'better-sqlite3';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database('focus_stats.db');

// SQL Table Creation - User's requested SQL
// CREATE TABLE IF NOT EXISTS focus_stats (
//   date TEXT PRIMARY KEY,
//   duration INTEGER DEFAULT 0
// );

db.exec(`
  CREATE TABLE IF NOT EXISTS focus_stats (
    date TEXT PRIMARY KEY,
    duration INTEGER DEFAULT 0
  )
`);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes for Focus Stats
  app.get('/api/focus-stats', (req, res) => {
    try {
      const stats = db.prepare('SELECT * FROM focus_stats').all();
      // Convert array to object mapping
      const statsMap = stats.reduce((acc: any, curr: any) => {
        acc[curr.date] = curr.duration;
        return acc;
      }, {});
      res.json(statsMap);
    } catch (error) {
      console.error('Error fetching focus stats:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  app.post('/api/focus-stats', (req, res) => {
    const { date, duration } = req.body;
    if (!date || typeof duration !== 'number') {
      return res.status(400).json({ error: 'Invalid data' });
    }

    try {
      const stmt = db.prepare('INSERT OR REPLACE INTO focus_stats (date, duration) VALUES (?, ?)');
      stmt.run(date, duration);
      res.json({ success: true });
    } catch (error) {
      console.error('Error updating focus stats:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Database connected and focus_stats table initialized.`);
  });
}

startServer();
