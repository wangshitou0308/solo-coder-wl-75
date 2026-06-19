const express = require('express');
const router = express.Router();
const db = require('../database');

router.get('/:aquariumId', (req, res) => {
  const { category } = req.query;
  let query = 'SELECT * FROM creatures WHERE aquarium_id = ?';
  const params = [req.params.aquariumId];
  if (category) {
    query += ' AND category = ?';
    params.push(category);
  }
  query += ' ORDER BY created_at DESC';
  const creatures = db.prepare(query).all(...params);
  res.json(creatures);
});

router.get('/:aquariumId/summary', (req, res) => {
  const summary = db.prepare(`
    SELECT category, SUM(quantity) as total_quantity, COUNT(*) as species_count
    FROM creatures
    WHERE aquarium_id = ?
    GROUP BY category
  `).all(req.params.aquariumId);
  res.json(summary);
});

router.post('/:aquariumId', (req, res) => {
  const { name, species, category, quantity, add_date, is_high_value, notes } = req.body;
  if (!name || !category) {
    return res.status(400).json({ error: 'Name and category are required' });
  }
  const stmt = db.prepare(`
    INSERT INTO creatures (aquarium_id, name, species, category, quantity, add_date, is_high_value, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const result = stmt.run(
    req.params.aquariumId, name, species || null, category,
    quantity || 1, add_date || null, is_high_value ? 1 : 0, notes || null
  );
  const creature = db.prepare('SELECT * FROM creatures WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(creature);
});

router.put('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM creatures WHERE id = ?').get(req.params.id);
  if (!existing) {
    return res.status(404).json({ error: 'Creature not found' });
  }
  const { name, species, category, quantity, add_date, is_high_value, notes } = req.body;
  const stmt = db.prepare(`
    UPDATE creatures SET name = ?, species = ?, category = ?, quantity = ?,
      add_date = ?, is_high_value = ?, notes = ?
    WHERE id = ?
  `);
  stmt.run(
    name || existing.name,
    species !== undefined ? species : existing.species,
    category || existing.category,
    quantity !== undefined ? quantity : existing.quantity,
    add_date !== undefined ? add_date : existing.add_date,
    is_high_value !== undefined ? (is_high_value ? 1 : 0) : existing.is_high_value,
    notes !== undefined ? notes : existing.notes,
    req.params.id
  );
  const creature = db.prepare('SELECT * FROM creatures WHERE id = ?').get(req.params.id);
  res.json(creature);
});

router.delete('/:id', (req, res) => {
  const result = db.prepare('DELETE FROM creatures WHERE id = ?').run(req.params.id);
  if (result.changes === 0) {
    return res.status(404).json({ error: 'Creature not found' });
  }
  res.json({ message: 'Creature deleted' });
});

router.get('/:creatureId/records', (req, res) => {
  const records = db.prepare(`
    SELECT * FROM creature_records
    WHERE creature_id = ?
    ORDER BY record_date DESC
  `).all(req.params.creatureId);
  res.json(records);
});

router.post('/:creatureId/records', (req, res) => {
  const { record_type, record_date, quantity, length, description, photo_url, notes } = req.body;
  if (!record_type || !record_date) {
    return res.status(400).json({ error: 'Type and date are required' });
  }

  const creature = db.prepare('SELECT * FROM creatures WHERE id = ?').get(req.params.creatureId);
  if (!creature) {
    return res.status(404).json({ error: 'Creature not found' });
  }

  const stmt = db.prepare(`
    INSERT INTO creature_records (creature_id, record_type, record_date, quantity, length, description, photo_url, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const result = stmt.run(
    req.params.creatureId, record_type, record_date,
    quantity || 1, length || null, description || null, photo_url || null, notes || null
  );

  if (record_type === 'death' || record_type === 'move_out') {
    const qty = quantity || 1;
    db.prepare('UPDATE creatures SET quantity = MAX(0, quantity - ?) WHERE id = ?')
      .run(qty, req.params.creatureId);
  } else if (record_type === 'birth' || record_type === 'add') {
    const qty = quantity || 1;
    db.prepare('UPDATE creatures SET quantity = quantity + ? WHERE id = ?')
      .run(qty, req.params.creatureId);
  }

  const record = db.prepare('SELECT * FROM creature_records WHERE id = ?').get(result.lastInsertRowid);
  const updatedCreature = db.prepare('SELECT * FROM creatures WHERE id = ?').get(req.params.creatureId);

  res.status(201).json({ record, creature: updatedCreature });
});

router.delete('/records/:recordId', (req, res) => {
  const record = db.prepare('SELECT * FROM creature_records WHERE id = ?').get(req.params.recordId);
  if (!record) {
    return res.status(404).json({ error: 'Record not found' });
  }

  db.prepare('DELETE FROM creature_records WHERE id = ?').run(req.params.recordId);

  if (record.record_type === 'death' || record.record_type === 'move_out') {
    const qty = record.quantity || 1;
    db.prepare('UPDATE creatures SET quantity = quantity + ? WHERE id = ?')
      .run(qty, record.creature_id);
  } else if (record.record_type === 'birth' || record.record_type === 'add') {
    const qty = record.quantity || 1;
    db.prepare('UPDATE creatures SET quantity = MAX(0, quantity - ?) WHERE id = ?')
      .run(qty, record.creature_id);
  }

  const updatedCreature = db.prepare('SELECT * FROM creatures WHERE id = ?').get(record.creature_id);
  res.json({ message: 'Record deleted', creature: updatedCreature });
});

module.exports = router;
