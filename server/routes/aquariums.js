const express = require('express');
const router = express.Router();
const db = require('../database');

router.get('/', (req, res) => {
  const aquariums = db.prepare(`
    SELECT a.*,
      (SELECT COUNT(*) FROM creatures c WHERE c.aquarium_id = a.id) as creature_count,
      (SELECT COUNT(*) FROM water_parameters wp WHERE wp.aquarium_id = a.id) as param_count,
      (SELECT record_date FROM water_parameters wp WHERE wp.aquarium_id = a.id ORDER BY record_date DESC LIMIT 1) as last_param_date
    FROM aquariums a
    ORDER BY a.created_at DESC
  `).all();
  res.json(aquariums);
});

router.get('/:id', (req, res) => {
  const aquarium = db.prepare('SELECT * FROM aquariums WHERE id = ?').get(req.params.id);
  if (!aquarium) {
    return res.status(404).json({ error: 'Aquarium not found' });
  }
  res.json(aquarium);
});

router.post('/', (req, res) => {
  const { name, type, size, volume, setup_date, substrate, filter_system, lighting_system, co2_system, notes } = req.body;
  if (!name || !type) {
    return res.status(400).json({ error: 'Name and type are required' });
  }
  const stmt = db.prepare(`
    INSERT INTO aquariums (name, type, size, volume, setup_date, substrate, filter_system, lighting_system, co2_system, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const result = stmt.run(name, type, size || null, volume || null, setup_date || null,
    substrate || null, filter_system || null, lighting_system || null, co2_system || null, notes || null);
  const aquarium = db.prepare('SELECT * FROM aquariums WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(aquarium);
});

router.put('/:id', (req, res) => {
  const { name, type, size, volume, setup_date, substrate, filter_system, lighting_system, co2_system, notes } = req.body;
  const existing = db.prepare('SELECT * FROM aquariums WHERE id = ?').get(req.params.id);
  if (!existing) {
    return res.status(404).json({ error: 'Aquarium not found' });
  }
  const stmt = db.prepare(`
    UPDATE aquariums SET
      name = ?, type = ?, size = ?, volume = ?, setup_date = ?,
      substrate = ?, filter_system = ?, lighting_system = ?, co2_system = ?,
      notes = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `);
  stmt.run(
    name || existing.name,
    type || existing.type,
    size !== undefined ? size : existing.size,
    volume !== undefined ? volume : existing.volume,
    setup_date !== undefined ? setup_date : existing.setup_date,
    substrate !== undefined ? substrate : existing.substrate,
    filter_system !== undefined ? filter_system : existing.filter_system,
    lighting_system !== undefined ? lighting_system : existing.lighting_system,
    co2_system !== undefined ? co2_system : existing.co2_system,
    notes !== undefined ? notes : existing.notes,
    req.params.id
  );
  const aquarium = db.prepare('SELECT * FROM aquariums WHERE id = ?').get(req.params.id);
  res.json(aquarium);
});

router.delete('/:id', (req, res) => {
  const result = db.prepare('DELETE FROM aquariums WHERE id = ?').run(req.params.id);
  if (result.changes === 0) {
    return res.status(404).json({ error: 'Aquarium not found' });
  }
  res.json({ message: 'Aquarium deleted' });
});

module.exports = router;
