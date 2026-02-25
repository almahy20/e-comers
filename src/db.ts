import Database from 'better-sqlite3';

const db = new Database('store.db');

export function initDb() {
  // Users table
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT DEFAULT 'user' -- 'user' or 'admin'
    )
  `);

  // Products table
  db.exec(`
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      price REAL NOT NULL,
      category TEXT,
      image TEXT,
      stock INTEGER DEFAULT 0
    )
  `);

  // Orders table
  db.exec(`
    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      total REAL NOT NULL,
      status TEXT DEFAULT 'pending', -- 'pending', 'completed', 'cancelled'
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id)
    )
  `);

  // Order Items table
  db.exec(`
    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER,
      product_id INTEGER,
      quantity INTEGER NOT NULL,
      price REAL NOT NULL,
      FOREIGN KEY(order_id) REFERENCES orders(id),
      FOREIGN KEY(product_id) REFERENCES products(id)
    )
  `);

  // Seed data if empty
  const userCount = db.prepare('SELECT count(*) as count FROM users').get() as { count: number };
  if (userCount.count === 0) {
    console.log('Seeding database...');
    
    // Admin user (password: admin123)
    db.prepare('INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)').run('Admin User', 'admin@lumina.com', 'admin123', 'admin');
    
    // Normal user (password: user123)
    db.prepare('INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)').run('John Doe', 'user@lumina.com', 'user123', 'user');

    // Products
    const products = [
      {
        name: 'Minimalist Watch',
        description: 'A sleek, modern timepiece for the everyday professional.',
        price: 129.99,
        category: 'Accessories',
        image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=800&q=80',
        stock: 50
      },
      {
        name: 'Leather Backpack',
        description: 'Handcrafted leather backpack with laptop compartment.',
        price: 199.50,
        category: 'Bags',
        image: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=800&q=80',
        stock: 20
      },
      {
        name: 'Wireless Headphones',
        description: 'Noise-cancelling over-ear headphones with 30h battery life.',
        price: 249.00,
        category: 'Electronics',
        image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=80',
        stock: 35
      },
      {
        name: 'Ceramic Coffee Set',
        description: 'Set of 4 handcrafted ceramic mugs and a pour-over dripper.',
        price: 85.00,
        category: 'Home',
        image: 'https://images.unsplash.com/photo-1517256064527-09c73fc73e38?auto=format&fit=crop&w=800&q=80',
        stock: 15
      },
      {
        name: 'Mechanical Keyboard',
        description: 'Compact 65% mechanical keyboard with Gateron Brown switches.',
        price: 110.00,
        category: 'Electronics',
        image: 'https://images.unsplash.com/photo-1595225476474-87563907a212?auto=format&fit=crop&w=800&q=80',
        stock: 40
      },
      {
        name: 'Cotton Linen Shirt',
        description: 'Breathable fabric, perfect for summer days.',
        price: 45.00,
        category: 'Clothing',
        image: 'https://images.unsplash.com/photo-1598033129183-c4f50c736f10?auto=format&fit=crop&w=800&q=80',
        stock: 100
      }
    ];

    const insertProduct = db.prepare('INSERT INTO products (name, description, price, category, image, stock) VALUES (?, ?, ?, ?, ?, ?)');
    products.forEach(p => {
      insertProduct.run(p.name, p.description, p.price, p.category, p.image, p.stock);
    });
  }
}

export default db;
