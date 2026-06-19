const express = require('express');
const router = express.Router();
const db = require('../database');

router.get('/overview', (req, res) => {
  const aquariumCount = db.prepare('SELECT COUNT(*) as count FROM aquariums').get().count;

  const creatureStats = db.prepare(`
    SELECT
      SUM(CASE WHEN category = 'fish' THEN quantity ELSE 0 END) as fish_count,
      SUM(CASE WHEN category = 'shrimp' THEN quantity ELSE 0 END) as shrimp_count,
      SUM(CASE WHEN category = 'coral' THEN quantity ELSE 0 END) as coral_count,
      SUM(CASE WHEN category = 'plant' THEN quantity ELSE 0 END) as plant_count,
      SUM(quantity) as total_creatures
    FROM creatures
  `).get();

  const activeDiseases = db.prepare('SELECT COUNT(*) as count FROM diseases WHERE end_date IS NULL').get().count;

  const today = new Date().toISOString().split('T')[0];
  const upcomingMaintenances = db.prepare(`
    SELECT COUNT(*) as count FROM maintenances
    WHERE next_maintenance_date IS NOT NULL
    AND next_maintenance_date >= ?
  `).get(today).count;

  const overdueMaintenances = db.prepare(`
    SELECT COUNT(*) as count FROM maintenances
    WHERE next_maintenance_date IS NOT NULL
    AND next_maintenance_date < ?
  `).get(today).count;

  res.json({
    aquariumCount,
    creatureStats,
    activeDiseases,
    upcomingMaintenances,
    overdueMaintenances
  });
});

router.get('/aquarium-status', (req, res) => {
  const aquariums = db.prepare('SELECT id, name, type FROM aquariums ORDER BY name').all();

  const result = aquariums.map(aq => {
    const latestParams = db.prepare(`
      SELECT * FROM water_parameters
      WHERE aquarium_id = ?
      ORDER BY record_date DESC
      LIMIT 1
    `).get(aq.id);

    const creatureCount = db.prepare(`
      SELECT COALESCE(SUM(quantity), 0) as count
      FROM creatures WHERE aquarium_id = ?
    `).get(aq.id).count;

    const lastWaterChange = db.prepare(`
      SELECT change_date, volume FROM water_changes
      WHERE aquarium_id = ?
      ORDER BY change_date DESC
      LIMIT 1
    `).get(aq.id);

    return {
      id: aq.id,
      name: aq.name,
      type: aq.type,
      latestParams: latestParams || null,
      creatureCount,
      lastWaterChange: lastWaterChange || null
    };
  });

  res.json(result);
});

router.get('/monthly-stats', (req, res) => {
  const { months } = req.query;
  const monthCount = months || 6;

  const waterChangeStats = db.prepare(`
    SELECT
      strftime('%Y-%m', change_date) as month,
      COUNT(*) as count,
      SUM(volume) as total_volume
    FROM water_changes
    WHERE change_date >= date('now', ?)
    GROUP BY strftime('%Y-%m', change_date)
    ORDER BY month ASC
  `).all(`-${monthCount} months`);

  const paramTestStats = db.prepare(`
    SELECT
      strftime('%Y-%m', record_date) as month,
      COUNT(*) as count
    FROM water_parameters
    WHERE record_date >= date('now', ?)
    GROUP BY strftime('%Y-%m', record_date)
    ORDER BY month ASC
  `).all(`-${monthCount} months`);

  const diseaseStats = db.prepare(`
    SELECT
      strftime('%Y-%m', start_date) as month,
      COUNT(*) as count
    FROM diseases
    WHERE start_date >= date('now', ?)
    GROUP BY strftime('%Y-%m', start_date)
    ORDER BY month ASC
  `).all(`-${monthCount} months`);

  res.json({
    waterChanges: waterChangeStats,
    paramTests: paramTestStats,
    diseases: diseaseStats
  });
});

router.get('/creature-trends', (req, res) => {
  const { aquariumId, months } = req.query;
  const monthCount = months || 6;

  let sql = `
    SELECT
      strftime('%Y-%m', record_date) as month,
      SUM(CASE WHEN record_type IN ('add', 'birth') THEN quantity ELSE 0 END) as added,
      SUM(CASE WHEN record_type IN ('death', 'move_out') THEN quantity ELSE 0 END) as lost
    FROM creature_records cr
    JOIN creatures c ON cr.creature_id = c.id
    WHERE record_date >= date('now', ?)
  `;
  const params = [`-${monthCount} months`];

  if (aquariumId) {
    sql += ' AND c.aquarium_id = ?';
    params.push(aquariumId);
  }

  sql += ' GROUP BY strftime(\'%Y-%m\', record_date) ORDER BY month ASC';

  const addRecords = db.prepare(sql).all(...params);
  res.json(addRecords);
});

module.exports = router;
