const express = require('express');
const router = express.Router();
const db = require('../database');

router.get('/:aquariumId', (req, res) => {
  const changes = db.prepare(`
    SELECT * FROM water_changes
    WHERE aquarium_id = ?
    ORDER BY change_date DESC
    LIMIT 50
  `).all(req.params.aquariumId);
  res.json(changes);
});

router.post('/:aquariumId', (req, res) => {
  const { change_date, volume, water_type, notes } = req.body;
  if (!change_date || !volume) {
    return res.status(400).json({ error: 'Date and volume are required' });
  }
  const stmt = db.prepare(`
    INSERT INTO water_changes (aquarium_id, change_date, volume, water_type, notes)
    VALUES (?, ?, ?, ?, ?)
  `);
  const result = stmt.run(req.params.aquariumId, change_date, volume, water_type || null, notes || null);
  const record = db.prepare('SELECT * FROM water_changes WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(record);
});

router.put('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM water_changes WHERE id = ?').get(req.params.id);
  if (!existing) {
    return res.status(404).json({ error: 'Record not found' });
  }
  const { change_date, volume, water_type, notes } = req.body;
  const stmt = db.prepare(`
    UPDATE water_changes SET change_date = ?, volume = ?, water_type = ?, notes = ?
    WHERE id = ?
  `);
  stmt.run(
    change_date || existing.change_date,
    volume || existing.volume,
    water_type !== undefined ? water_type : existing.water_type,
    notes !== undefined ? notes : existing.notes,
    req.params.id
  );
  const record = db.prepare('SELECT * FROM water_changes WHERE id = ?').get(req.params.id);
  res.json(record);
});

router.delete('/:id', (req, res) => {
  const result = db.prepare('DELETE FROM water_changes WHERE id = ?').run(req.params.id);
  if (result.changes === 0) {
    return res.status(404).json({ error: 'Record not found' });
  }
  res.json({ message: 'Record deleted' });
});

module.exports = router;
