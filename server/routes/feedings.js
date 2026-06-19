const express = require('express');
const router = express.Router();
const db = require('../database');

router.get('/:aquariumId', (req, res) => {
  const feedings = db.prepare(`
    SELECT * FROM feedings
    WHERE aquarium_id = ?
    ORDER BY feed_date DESC
    LIMIT 50
  `).all(req.params.aquariumId);
  res.json(feedings);
});

router.get('/:aquariumId/food-stats', (req, res) => {
  const stats = db.prepare(`
    SELECT food_type, COUNT(*) as feed_count, SUM(amount) as total_amount
    FROM feedings
    WHERE aquarium_id = ?
    GROUP BY food_type
    ORDER BY feed_count DESC
  `).all(req.params.aquariumId);
  res.json(stats);
});

router.post('/:aquariumId', (req, res) => {
  const { feed_date, food_type, amount, notes } = req.body;
  if (!feed_date || !food_type) {
    return res.status(400).json({ error: 'Date and food type are required' });
  }
  const stmt = db.prepare(`
    INSERT INTO feedings (aquarium_id, feed_date, food_type, amount, notes)
    VALUES (?, ?, ?, ?, ?)
  `);
  const result = stmt.run(req.params.aquariumId, feed_date, food_type, amount || null, notes || null);
  const feeding = db.prepare('SELECT * FROM feedings WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(feeding);
});

router.put('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM feedings WHERE id = ?').get(req.params.id);
  if (!existing) {
    return res.status(404).json({ error: 'Feeding record not found' });
  }
  const { feed_date, food_type, amount, notes } = req.body;
  const stmt = db.prepare(`
    UPDATE feedings SET feed_date = ?, food_type = ?, amount = ?, notes = ?
    WHERE id = ?
  `);
  stmt.run(
    feed_date || existing.feed_date,
    food_type || existing.food_type,
    amount !== undefined ? amount : existing.amount,
    notes !== undefined ? notes : existing.notes,
    req.params.id
  );
  const feeding = db.prepare('SELECT * FROM feedings WHERE id = ?').get(req.params.id);
  res.json(feeding);
});

router.delete('/:id', (req, res) => {
  const result = db.prepare('DELETE FROM feedings WHERE id = ?').run(req.params.id);
  if (result.changes === 0) {
    return res.status(404).json({ error: 'Feeding record not found' });
  }
  res.json({ message: 'Feeding record deleted' });
});

module.exports = router;
