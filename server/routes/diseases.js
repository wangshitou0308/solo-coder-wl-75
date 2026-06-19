const express = require('express');
const router = express.Router();
const db = require('../database');

router.get('/:aquariumId', (req, res) => {
  const diseases = db.prepare(`
    SELECT d.*, c.name as creature_name
    FROM diseases d
    LEFT JOIN creatures c ON d.creature_id = c.id
    WHERE d.aquarium_id = ?
    ORDER BY d.start_date DESC
  `).all(req.params.aquariumId);
  res.json(diseases);
});

router.post('/:aquariumId', (req, res) => {
  const { creature_id, start_date, end_date, diagnosis, symptoms, medication, dosage, result, notes } = req.body;
  if (!start_date || !diagnosis) {
    return res.status(400).json({ error: 'Start date and diagnosis are required' });
  }
  const stmt = db.prepare(`
    INSERT INTO diseases (aquarium_id, creature_id, start_date, end_date, diagnosis, symptoms, medication, dosage, result, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const result_ = stmt.run(
    req.params.aquariumId,
    creature_id || null,
    start_date,
    end_date || null,
    diagnosis,
    symptoms || null,
    medication || null,
    dosage || null,
    result || null,
    notes || null
  );
  const disease = db.prepare('SELECT * FROM diseases WHERE id = ?').get(result_.lastInsertRowid);
  res.status(201).json(disease);
});

router.put('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM diseases WHERE id = ?').get(req.params.id);
  if (!existing) {
    return res.status(404).json({ error: 'Disease record not found' });
  }
  const { creature_id, start_date, end_date, diagnosis, symptoms, medication, dosage, result, notes } = req.body;
  const stmt = db.prepare(`
    UPDATE diseases SET creature_id = ?, start_date = ?, end_date = ?, diagnosis = ?,
      symptoms = ?, medication = ?, dosage = ?, result = ?, notes = ?
    WHERE id = ?
  `);
  stmt.run(
    creature_id !== undefined ? creature_id : existing.creature_id,
    start_date || existing.start_date,
    end_date !== undefined ? end_date : existing.end_date,
    diagnosis || existing.diagnosis,
    symptoms !== undefined ? symptoms : existing.symptoms,
    medication !== undefined ? medication : existing.medication,
    dosage !== undefined ? dosage : existing.dosage,
    result !== undefined ? result : existing.result,
    notes !== undefined ? notes : existing.notes,
    req.params.id
  );
  const disease = db.prepare('SELECT * FROM diseases WHERE id = ?').get(req.params.id);
  res.json(disease);
});

router.delete('/:id', (req, res) => {
  const result = db.prepare('DELETE FROM diseases WHERE id = ?').run(req.params.id);
  if (result.changes === 0) {
    return res.status(404).json({ error: 'Disease record not found' });
  }
  res.json({ message: 'Disease record deleted' });
});

module.exports = router;
