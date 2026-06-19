const express = require('express');
const router = express.Router();
const db = require('../database');

function calculateNextDate(maintenanceDate, reminderDays) {
  if (!reminderDays) return null;
  const date = new Date(maintenanceDate);
  date.setDate(date.getDate() + reminderDays);
  return date.toISOString().split('T')[0];
}

router.get('/:aquariumId', (req, res) => {
  const maintenances = db.prepare(`
    SELECT * FROM maintenances
    WHERE aquarium_id = ?
    ORDER BY maintenance_date DESC
    LIMIT 50
  `).all(req.params.aquariumId);
  res.json(maintenances);
});

router.get('/:aquariumId/upcoming', (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  const upcoming = db.prepare(`
    SELECT * FROM maintenances
    WHERE aquarium_id = ? AND next_maintenance_date IS NOT NULL
    AND next_maintenance_date >= ?
    ORDER BY next_maintenance_date ASC
    LIMIT 10
  `).all(req.params.aquariumId, today);

  const overdue = db.prepare(`
    SELECT * FROM maintenances
    WHERE aquarium_id = ? AND next_maintenance_date IS NOT NULL
    AND next_maintenance_date < ?
    ORDER BY next_maintenance_date ASC
  `).all(req.params.aquariumId, today);

  res.json({ upcoming, overdue });
});

router.post('/:aquariumId', (req, res) => {
  const { maintenance_type, maintenance_date, description, reminder_days, notes } = req.body;
  if (!maintenance_type || !maintenance_date) {
    return res.status(400).json({ error: 'Type and date are required' });
  }
  const next_date = calculateNextDate(maintenance_date, reminder_days);
  const stmt = db.prepare(`
    INSERT INTO maintenances (aquarium_id, maintenance_type, maintenance_date, description, reminder_days, next_maintenance_date, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  const result = stmt.run(
    req.params.aquariumId, maintenance_type, maintenance_date,
    description || null, reminder_days || null, next_date, notes || null
  );
  const maintenance = db.prepare('SELECT * FROM maintenances WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(maintenance);
});

router.put('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM maintenances WHERE id = ?').get(req.params.id);
  if (!existing) {
    return res.status(404).json({ error: 'Maintenance record not found' });
  }
  const { maintenance_type, maintenance_date, description, reminder_days, notes } = req.body;
  const newDate = maintenance_date || existing.maintenance_date;
  const newReminder = reminder_days !== undefined ? reminder_days : existing.reminder_days;
  const next_date = calculateNextDate(newDate, newReminder);

  const stmt = db.prepare(`
    UPDATE maintenances SET maintenance_type = ?, maintenance_date = ?, description = ?,
      reminder_days = ?, next_maintenance_date = ?, notes = ?
    WHERE id = ?
  `);
  stmt.run(
    maintenance_type || existing.maintenance_type,
    newDate,
    description !== undefined ? description : existing.description,
    newReminder,
    next_date,
    notes !== undefined ? notes : existing.notes,
    req.params.id
  );
  const maintenance = db.prepare('SELECT * FROM maintenances WHERE id = ?').get(req.params.id);
  res.json(maintenance);
});

router.delete('/:id', (req, res) => {
  const result = db.prepare('DELETE FROM maintenances WHERE id = ?').run(req.params.id);
  if (result.changes === 0) {
    return res.status(404).json({ error: 'Maintenance record not found' });
  }
  res.json({ message: 'Maintenance record deleted' });
});

module.exports = router;
