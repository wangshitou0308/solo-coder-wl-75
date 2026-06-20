const express = require('express');
const router = express.Router();
const db = require('../database');

router.get('/', (req, res) => {
  const { aquarium_id, category, low_stock_only } = req.query;
  let sql = 'SELECT ii.*, a.name as aquarium_name FROM inventory_items ii LEFT JOIN aquariums a ON ii.aquarium_id = a.id WHERE 1=1';
  const params = [];

  if (aquarium_id) {
    sql += ' AND ii.aquarium_id = ?';
    params.push(aquarium_id);
  }
  if (category) {
    sql += ' AND ii.category = ?';
    params.push(category);
  }
  if (low_stock_only === 'true') {
    sql += ' AND ii.low_stock_threshold IS NOT NULL AND ii.current_quantity <= ii.low_stock_threshold';
  }
  sql += ' ORDER BY ii.category, ii.name';

  const items = db.prepare(sql).all(...params);
  const result = items.map(item => {
    let estimatedDaysRemaining = null;
    if (item.estimated_daily_usage && item.estimated_daily_usage > 0) {
      estimatedDaysRemaining = Math.floor(item.current_quantity / item.estimated_daily_usage);
    }
    const isLowStock = item.low_stock_threshold !== null && item.current_quantity <= item.low_stock_threshold;
    return { ...item, estimated_days_remaining: estimatedDaysRemaining, is_low_stock: isLowStock };
  });
  res.json(result);
});

router.get('/alerts', (req, res) => {
  const items = db.prepare(`
    SELECT ii.*, a.name as aquarium_name FROM inventory_items ii
    LEFT JOIN aquariums a ON ii.aquarium_id = a.id
    WHERE ii.low_stock_threshold IS NOT NULL AND ii.current_quantity <= ii.low_stock_threshold
    ORDER BY (ii.current_quantity - ii.low_stock_threshold) ASC
  `).all();
  const result = items.map(item => {
    let estimatedDaysRemaining = null;
    if (item.estimated_daily_usage && item.estimated_daily_usage > 0) {
      estimatedDaysRemaining = Math.floor(item.current_quantity / item.estimated_daily_usage);
    }
    return { ...item, estimated_days_remaining: estimatedDaysRemaining };
  });
  res.json(result);
});

router.get('/:id', (req, res) => {
  const item = db.prepare(`
    SELECT ii.*, a.name as aquarium_name FROM inventory_items ii
    LEFT JOIN aquariums a ON ii.aquarium_id = a.id WHERE ii.id = ?
  `).get(req.params.id);
  if (!item) {
    return res.status(404).json({ error: 'Inventory item not found' });
  }
  let estimatedDaysRemaining = null;
  if (item.estimated_daily_usage && item.estimated_daily_usage > 0) {
    estimatedDaysRemaining = Math.floor(item.current_quantity / item.estimated_daily_usage);
  }
  res.json({ ...item, estimated_days_remaining: estimatedDaysRemaining });
});

router.post('/', (req, res) => {
  const { aquarium_id, name, category, current_quantity, unit, low_stock_threshold, estimated_daily_usage, notes } = req.body;
  if (!name || !category || !unit) {
    return res.status(400).json({ error: 'name, category and unit are required' });
  }
  const stmt = db.prepare(`
    INSERT INTO inventory_items (aquarium_id, name, category, current_quantity, unit, low_stock_threshold, estimated_daily_usage, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const result = stmt.run(
    aquarium_id || null, name, category,
    current_quantity || 0, unit,
    low_stock_threshold || null, estimated_daily_usage || null, notes || null
  );
  const item = db.prepare('SELECT * FROM inventory_items WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(item);
});

router.put('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM inventory_items WHERE id = ?').get(req.params.id);
  if (!existing) {
    return res.status(404).json({ error: 'Inventory item not found' });
  }
  const { aquarium_id, name, category, current_quantity, unit, low_stock_threshold, estimated_daily_usage, notes } = req.body;
  const stmt = db.prepare(`
    UPDATE inventory_items SET aquarium_id = ?, name = ?, category = ?, current_quantity = ?,
      unit = ?, low_stock_threshold = ?, estimated_daily_usage = ?, notes = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `);
  stmt.run(
    aquarium_id !== undefined ? aquarium_id : existing.aquarium_id,
    name || existing.name,
    category || existing.category,
    current_quantity !== undefined ? current_quantity : existing.current_quantity,
    unit || existing.unit,
    low_stock_threshold !== undefined ? low_stock_threshold : existing.low_stock_threshold,
    estimated_daily_usage !== undefined ? estimated_daily_usage : existing.estimated_daily_usage,
    notes !== undefined ? notes : existing.notes,
    req.params.id
  );
  const item = db.prepare('SELECT * FROM inventory_items WHERE id = ?').get(req.params.id);
  res.json(item);
});

router.put('/:id/consume', (req, res) => {
  const existing = db.prepare('SELECT * FROM inventory_items WHERE id = ?').get(req.params.id);
  if (!existing) {
    return res.status(404).json({ error: 'Inventory item not found' });
  }
  const { quantity } = req.body;
  if (!quantity || quantity <= 0) {
    return res.status(400).json({ error: 'quantity must be positive' });
  }
  const newQty = Math.max(0, existing.current_quantity - quantity);
  db.prepare('UPDATE inventory_items SET current_quantity = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(newQty, req.params.id);
  const item = db.prepare('SELECT * FROM inventory_items WHERE id = ?').get(req.params.id);
  res.json(item);
});

router.delete('/:id', (req, res) => {
  const result = db.prepare('DELETE FROM inventory_items WHERE id = ?').run(req.params.id);
  if (result.changes === 0) {
    return res.status(404).json({ error: 'Inventory item not found' });
  }
  res.json({ message: 'Inventory item deleted' });
});

router.get('/:id/purchases', (req, res) => {
  const purchases = db.prepare(`
    SELECT * FROM inventory_purchases WHERE inventory_item_id = ?
    ORDER BY purchase_date DESC
  `).all(req.params.id);
  res.json(purchases);
});

router.post('/:id/purchases', (req, res) => {
  const existing = db.prepare('SELECT * FROM inventory_items WHERE id = ?').get(req.params.id);
  if (!existing) {
    return res.status(404).json({ error: 'Inventory item not found' });
  }
  const { purchase_date, quantity, unit_price, supplier, notes } = req.body;
  if (!purchase_date || !quantity) {
    return res.status(400).json({ error: 'purchase_date and quantity are required' });
  }
  const stmt = db.prepare(`
    INSERT INTO inventory_purchases (inventory_item_id, purchase_date, quantity, unit_price, supplier, notes)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  const result = stmt.run(req.params.id, purchase_date, quantity, unit_price || null, supplier || null, notes || null);
  const purchase = db.prepare('SELECT * FROM inventory_purchases WHERE id = ?').get(result.lastInsertRowid);

  db.prepare('UPDATE inventory_items SET current_quantity = current_quantity + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
    .run(quantity, req.params.id);

  res.status(201).json(purchase);
});

router.delete('/purchases/:purchaseId', (req, res) => {
  const purchase = db.prepare('SELECT * FROM inventory_purchases WHERE id = ?').get(req.params.purchaseId);
  if (!purchase) {
    return res.status(404).json({ error: 'Purchase record not found' });
  }
  db.prepare('UPDATE inventory_items SET current_quantity = current_quantity - ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
    .run(purchase.quantity, purchase.inventory_item_id);
  db.prepare('DELETE FROM inventory_purchases WHERE id = ?').run(req.params.purchaseId);
  res.json({ message: 'Purchase record deleted' });
});

module.exports = router;
