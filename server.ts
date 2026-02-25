import express from 'express';
import { createServer as createViteServer } from 'vite';
import { initDb } from './src/db';
import db from './src/db';

const PORT = 3000;

async function startServer() {
  const app = express();
  
  // Initialize Database
  initDb();

  app.use(express.json());

  // API Routes
  
  // Products
  app.get('/api/products', (req, res) => {
    const stmt = db.prepare('SELECT * FROM products');
    const products = stmt.all();
    res.json(products);
  });

  app.get('/api/products/:id', (req, res) => {
    const stmt = db.prepare('SELECT * FROM products WHERE id = ?');
    const product = stmt.get(req.params.id);
    if (product) res.json(product);
    else res.status(404).json({ error: 'Product not found' });
  });

  // Auth (Simple Mock Auth)
  app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body;
    const stmt = db.prepare('SELECT * FROM users WHERE email = ? AND password = ?');
    const user = stmt.get(email, password);
    
    if (user) {
      // In a real app, use JWT or sessions. Here we just return the user info.
      const { password, ...userWithoutPassword } = user as any;
      res.json(userWithoutPassword);
    } else {
      res.status(401).json({ error: 'Invalid credentials' });
    }
  });

  app.post('/api/auth/register', (req, res) => {
    const { name, email, password } = req.body;
    try {
      const stmt = db.prepare('INSERT INTO users (name, email, password) VALUES (?, ?, ?)');
      const info = stmt.run(name, email, password);
      res.json({ id: info.lastInsertRowid, name, email, role: 'user' });
    } catch (err: any) {
      if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
        res.status(400).json({ error: 'Email already exists' });
      } else {
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  });

  // Orders
  app.post('/api/orders', (req, res) => {
    const { userId, items, total } = req.body;
    
    const createOrder = db.transaction(() => {
      const stmt = db.prepare('INSERT INTO orders (user_id, total) VALUES (?, ?)');
      const info = stmt.run(userId, total);
      const orderId = info.lastInsertRowid;

      const itemStmt = db.prepare('INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)');
      for (const item of items) {
        itemStmt.run(orderId, item.id, item.quantity, item.price);
      }
      return orderId;
    });

    try {
      const orderId = createOrder();
      res.json({ success: true, orderId });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to create order' });
    }
  });

  app.get('/api/orders/user/:userId', (req, res) => {
    const stmt = db.prepare(`
      SELECT o.*, json_group_array(json_object('name', p.name, 'quantity', oi.quantity, 'price', oi.price)) as items
      FROM orders o
      JOIN order_items oi ON o.id = oi.order_id
      JOIN products p ON oi.product_id = p.id
      WHERE o.user_id = ?
      GROUP BY o.id
      ORDER BY o.created_at DESC
    `);
    const orders = stmt.all(req.params.userId).map((o: any) => ({
      ...o,
      items: JSON.parse(o.items)
    }));
    res.json(orders);
  });

  // Admin Routes
  app.get('/api/admin/stats', (req, res) => {
    const totalSales = db.prepare('SELECT SUM(total) as total FROM orders').get() as { total: number };
    const totalOrders = db.prepare('SELECT COUNT(*) as count FROM orders').get() as { count: number };
    const totalProducts = db.prepare('SELECT COUNT(*) as count FROM products').get() as { count: number };
    const totalUsers = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };

    res.json({
      revenue: totalSales.total || 0,
      orders: totalOrders.count || 0,
      products: totalProducts.count || 0,
      users: totalUsers.count || 0
    });
  });

  app.get('/api/admin/orders', (req, res) => {
    const stmt = db.prepare(`
      SELECT o.*, u.name as user_name, u.email as user_email
      FROM orders o
      JOIN users u ON o.user_id = u.id
      ORDER BY o.created_at DESC
    `);
    const orders = stmt.all();
    res.json(orders);
  });

  // Vite middleware
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
