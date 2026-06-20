const express = require('express');
const router = express.Router();
const db = require('../database');

router.get('/today', (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  const tasks = db.prepare(`
    SELECT ct.*, a.name as aquarium_name, a.type as aquarium_type
    FROM care_tasks ct
    JOIN aquariums a ON ct.aquarium_id = a.id
    WHERE ct.status = 'pending' AND ct.next_due_date <= ?
    ORDER BY ct.next_due_date ASC
  `).all(today);

  const overdue = tasks.filter(t => t.next_due_date < today);
  const dueToday = tasks.filter(t => t.next_due_date === today);
  res.json({ overdue, dueToday, all: tasks });
});

router.get('/:aquariumId', (req, res) => {
  const tasks = db.prepare(`
    SELECT * FROM care_tasks
    WHERE aquarium_id = ?
    ORDER BY next_due_date ASC
  `).all(req.params.aquariumId);
  res.json(tasks);
});

router.post('/:aquariumId', (req, res) => {
  const { task_type, cycle_days, next_due_date, notes } = req.body;
  if (!task_type || !cycle_days || !next_due_date) {
    return res.status(400).json({ error: 'task_type, cycle_days and next_due_date are required' });
  }
  const stmt = db.prepare(`
    INSERT INTO care_tasks (aquarium_id, task_type, cycle_days, next_due_date, status, notes)
    VALUES (?, ?, ?, ?, 'pending', ?)
  `);
  const result = stmt.run(req.params.aquariumId, task_type, cycle_days, next_due_date, notes || null);
  const task = db.prepare('SELECT * FROM care_tasks WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(task);
});

router.put('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM care_tasks WHERE id = ?').get(req.params.id);
  if (!existing) {
    return res.status(404).json({ error: 'Care task not found' });
  }
  const { task_type, cycle_days, next_due_date, notes } = req.body;
  const stmt = db.prepare(`
    UPDATE care_tasks SET task_type = ?, cycle_days = ?, next_due_date = ?, notes = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `);
  stmt.run(
    task_type || existing.task_type,
    cycle_days !== undefined ? cycle_days : existing.cycle_days,
    next_due_date || existing.next_due_date,
    notes !== undefined ? notes : existing.notes,
    req.params.id
  );
  const task = db.prepare('SELECT * FROM care_tasks WHERE id = ?').get(req.params.id);
  res.json(task);
});

router.put('/:id/complete', (req, res) => {
  const existing = db.prepare('SELECT * FROM care_tasks WHERE id = ?').get(req.params.id);
  if (!existing) {
    return res.status(404).json({ error: 'Care task not found' });
  }
  const today = new Date().toISOString().split('T')[0];
  const nextDue = new Date(today);
  nextDue.setDate(nextDue.getDate() + existing.cycle_days);
  const nextDueStr = nextDue.toISOString().split('T')[0];

  db.prepare(`
    UPDATE care_tasks SET status = 'completed', completed_date = ?, next_due_date = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(today, nextDueStr, req.params.id);

  const aquariumId = existing.aquarium_id;
  const taskType = existing.task_type;

  if (taskType === 'water_change') {
    const volume = req.body.volume || 0;
    db.prepare(`
      INSERT INTO water_changes (aquarium_id, change_date, volume, water_type, notes)
      VALUES (?, ?, ?, ?, ?)
    `).run(aquariumId, today, volume, req.body.water_type || null, req.body.notes || '养护任务自动生成');
  } else if (taskType === 'water_test') {
    const paramData = req.body.param_data || {};
    db.prepare(`
      INSERT INTO water_parameters (aquarium_id, record_date, temperature, ph, ammonia, nitrite, nitrate, phosphate, gh, kh, tds, salinity, calcium, magnesium, alkalinity, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      aquariumId, today,
      paramData.temperature || null, paramData.ph || null, paramData.ammonia || null,
      paramData.nitrite || null, paramData.nitrate || null, paramData.phosphate || null,
      paramData.gh || null, paramData.kh || null, paramData.tds || null,
      paramData.salinity || null, paramData.calcium || null, paramData.magnesium || null,
      paramData.alkalinity || null, paramData.notes || '养护任务自动生成'
    );
  } else if (taskType === 'filter_clean') {
    db.prepare(`
      INSERT INTO maintenances (aquarium_id, maintenance_type, maintenance_date, description, notes)
      VALUES (?, 'filter_change', ?, '清洗过滤棉', ?)
    `).run(aquariumId, today, req.body.notes || '养护任务自动生成');
  } else if (taskType === 'co2_check') {
    db.prepare(`
      INSERT INTO maintenances (aquarium_id, maintenance_type, maintenance_date, description, notes)
      VALUES (?, 'co2_refill', ?, 'CO₂检查', ?)
    `).run(aquariumId, today, req.body.notes || '养护任务自动生成');
  } else if (taskType === 'feeding') {
    db.prepare(`
      INSERT INTO feedings (aquarium_id, feed_date, food_type, amount, notes)
      VALUES (?, ?, ?, ?, ?)
    `).run(aquariumId, today, req.body.food_type || '常规饲料', req.body.amount || null, req.body.notes || '养护任务自动生成');
  }

  const newTask = db.prepare(`
    SELECT ct.*, a.name as aquarium_name FROM care_tasks ct
    JOIN aquariums a ON ct.aquarium_id = a.id WHERE ct.id = ?
  `).get(req.params.id);

  db.prepare(`
    UPDATE care_tasks SET status = 'pending' WHERE id = ?
  `).run(req.params.id);

  const refreshedTask = db.prepare('SELECT * FROM care_tasks WHERE id = ?').get(req.params.id);
  res.json(refreshedTask);
});

router.put('/:id/skip', (req, res) => {
  const existing = db.prepare('SELECT * FROM care_tasks WHERE id = ?').get(req.params.id);
  if (!existing) {
    return res.status(404).json({ error: 'Care task not found' });
  }
  const today = new Date().toISOString().split('T')[0];
  const nextDue = new Date(today);
  nextDue.setDate(nextDue.getDate() + existing.cycle_days);
  const nextDueStr = nextDue.toISOString().split('T')[0];

  db.prepare(`
    UPDATE care_tasks SET status = 'skipped', completed_date = ?, next_due_date = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(today, nextDueStr, req.params.id);

  db.prepare(`UPDATE care_tasks SET status = 'pending' WHERE id = ?`).run(req.params.id);

  const task = db.prepare('SELECT * FROM care_tasks WHERE id = ?').get(req.params.id);
  res.json(task);
});

router.delete('/:id', (req, res) => {
  const result = db.prepare('DELETE FROM care_tasks WHERE id = ?').run(req.params.id);
  if (result.changes === 0) {
    return res.status(404).json({ error: 'Care task not found' });
  }
  res.json({ message: 'Care task deleted' });
});

module.exports = router;
