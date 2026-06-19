const express = require('express');
const router = express.Router();
const db = require('../database');

function checkParameterWarnings(params, aquariumType) {
  const ranges = db.prepare('SELECT * FROM parameter_ranges WHERE aquarium_type = ?').all(aquariumType);
  const warnings = [];
  const rangeMap = {};
  ranges.forEach(r => { rangeMap[r.parameter_name] = r; });

  const paramNames = ['temperature', 'ph', 'ammonia', 'nitrite', 'nitrate', 'phosphate',
    'gh', 'kh', 'tds', 'salinity', 'calcium', 'magnesium', 'alkalinity'];

  paramNames.forEach(param => {
    if (params[param] !== null && params[param] !== undefined && rangeMap[param]) {
      const range = rangeMap[param];
      if (params[param] < range.min_value || params[param] > range.max_value) {
        warnings.push({
          parameter: param,
          value: params[param],
          min: range.min_value,
          max: range.max_value,
          unit: range.unit,
          status: params[param] < range.min_value ? 'too_low' : 'too_high'
        });
      }
    }
  });
  return warnings;
}

router.get('/:aquariumId', (req, res) => {
  const { limit, offset } = req.query;
  const params = db.prepare(`
    SELECT * FROM water_parameters
    WHERE aquarium_id = ?
    ORDER BY record_date DESC
    LIMIT ? OFFSET ?
  `).all(req.params.aquariumId, limit || 30, offset || 0);

  const aquarium = db.prepare('SELECT type FROM aquariums WHERE id = ?').get(req.params.aquariumId);
  if (!aquarium) {
    return res.status(404).json({ error: 'Aquarium not found' });
  }

  const result = params.map(p => ({
    ...p,
    warnings: checkParameterWarnings(p, aquarium.type)
  }));

  res.json(result);
});

router.get('/:aquariumId/latest', (req, res) => {
  const param = db.prepare(`
    SELECT * FROM water_parameters
    WHERE aquarium_id = ?
    ORDER BY record_date DESC
    LIMIT 1
  `).get(req.params.aquariumId);

  const aquarium = db.prepare('SELECT type FROM aquariums WHERE id = ?').get(req.params.aquariumId);
  if (!aquarium) {
    return res.status(404).json({ error: 'Aquarium not found' });
  }

  if (param) {
    param.warnings = checkParameterWarnings(param, aquarium.type);
  }
  res.json(param || null);
});

router.get('/:aquariumId/chart', (req, res) => {
  const { param, days } = req.query;
  const daysBack = days || 30;
  const params = db.prepare(`
    SELECT record_date, ${param} as value
    FROM water_parameters
    WHERE aquarium_id = ? AND ${param} IS NOT NULL
    ORDER BY record_date ASC
    LIMIT 100
  `).all(req.params.aquariumId);

  res.json(params);
});

router.post('/:aquariumId', (req, res) => {
  const { record_date, temperature, ph, ammonia, nitrite, nitrate, phosphate,
    gh, kh, tds, salinity, calcium, magnesium, alkalinity, notes } = req.body;

  if (!record_date) {
    return res.status(400).json({ error: 'Record date is required' });
  }

  const stmt = db.prepare(`
    INSERT INTO water_parameters (aquarium_id, record_date, temperature, ph, ammonia, nitrite,
      nitrate, phosphate, gh, kh, tds, salinity, calcium, magnesium, alkalinity, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const result = stmt.run(
    req.params.aquariumId, record_date,
    temperature || null, ph || null, ammonia || null, nitrite || null,
    nitrate || null, phosphate || null, gh || null, kh || null,
    tds || null, salinity || null, calcium || null, magnesium || null,
    alkalinity || null, notes || null
  );

  const record = db.prepare('SELECT * FROM water_parameters WHERE id = ?').get(result.lastInsertRowid);
  const aquarium = db.prepare('SELECT type FROM aquariums WHERE id = ?').get(req.params.aquariumId);
  record.warnings = checkParameterWarnings(record, aquarium.type);

  res.status(201).json(record);
});

router.put('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM water_parameters WHERE id = ?').get(req.params.id);
  if (!existing) {
    return res.status(404).json({ error: 'Record not found' });
  }

  const { record_date, temperature, ph, ammonia, nitrite, nitrate, phosphate,
    gh, kh, tds, salinity, calcium, magnesium, alkalinity, notes } = req.body;

  const stmt = db.prepare(`
    UPDATE water_parameters SET
      record_date = ?, temperature = ?, ph = ?, ammonia = ?, nitrite = ?,
      nitrate = ?, phosphate = ?, gh = ?, kh = ?, tds = ?,
      salinity = ?, calcium = ?, magnesium = ?, alkalinity = ?, notes = ?
    WHERE id = ?
  `);

  stmt.run(
    record_date || existing.record_date,
    temperature !== undefined ? temperature : existing.temperature,
    ph !== undefined ? ph : existing.ph,
    ammonia !== undefined ? ammonia : existing.ammonia,
    nitrite !== undefined ? nitrite : existing.nitrite,
    nitrate !== undefined ? nitrate : existing.nitrate,
    phosphate !== undefined ? phosphate : existing.phosphate,
    gh !== undefined ? gh : existing.gh,
    kh !== undefined ? kh : existing.kh,
    tds !== undefined ? tds : existing.tds,
    salinity !== undefined ? salinity : existing.salinity,
    calcium !== undefined ? calcium : existing.calcium,
    magnesium !== undefined ? magnesium : existing.magnesium,
    alkalinity !== undefined ? alkalinity : existing.alkalinity,
    notes !== undefined ? notes : existing.notes,
    req.params.id
  );

  const record = db.prepare('SELECT * FROM water_parameters WHERE id = ?').get(req.params.id);
  const aquarium = db.prepare('SELECT type FROM aquariums WHERE id = ?').get(record.aquarium_id);
  record.warnings = checkParameterWarnings(record, aquarium.type);

  res.json(record);
});

router.delete('/:id', (req, res) => {
  const result = db.prepare('DELETE FROM water_parameters WHERE id = ?').run(req.params.id);
  if (result.changes === 0) {
    return res.status(404).json({ error: 'Record not found' });
  }
  res.json({ message: 'Record deleted' });
});

module.exports = router;
