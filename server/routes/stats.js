const express = require('express');
const router = express.Router();
const db = require('../database');

function calculateHealthScore(aquariumId, aquariumType, latestParams) {
  if (!latestParams) {
    return {
      score: 0,
      level: 'high_risk',
      levelLabel: '高风险',
      isDataExpired: true,
      warnings: [],
      causes: [],
      suggestions: ['请尽快进行水质检测以获取健康评分']
    };
  }

  const today = new Date();
  const lastRecordDate = new Date(latestParams.record_date);
  const daysSinceLastTest = Math.floor((today - lastRecordDate) / (1000 * 60 * 60 * 24));
  const isDataExpired = daysSinceLastTest > 7;

  const ranges = db.prepare('SELECT * FROM parameter_ranges WHERE aquarium_type = ?').all(aquariumType);
  const rangeMap = {};
  ranges.forEach(r => { rangeMap[r.parameter_name] = r; });

  const paramNames = ['temperature', 'ph', 'ammonia', 'nitrite', 'nitrate', 'phosphate',
    'gh', 'kh', 'tds', 'salinity', 'calcium', 'magnesium', 'alkalinity'];

  let totalParams = 0;
  let warningParams = [];
  let severeParams = [];

  paramNames.forEach(param => {
    if (latestParams[param] !== null && latestParams[param] !== undefined && rangeMap[param]) {
      totalParams++;
      const range = rangeMap[param];
      if (latestParams[param] < range.min_value || latestParams[param] > range.max_value) {
        const deviation = latestParams[param] < range.min_value
          ? (range.min_value - latestParams[param]) / (range.max_value - range.min_value || 1)
          : (latestParams[param] - range.max_value) / (range.max_value - range.min_value || 1);
        const isSevere = deviation > 0.5;
        warningParams.push({
          parameter: param,
          value: latestParams[param],
          min: range.min_value,
          max: range.max_value,
          unit: range.unit,
          status: latestParams[param] < range.min_value ? 'too_low' : 'too_high',
          deviation: Math.round(deviation * 100) / 100,
          severe: isSevere
        });
        if (isSevere) severeParams.push(param);
      }
    }
  });

  let score = 100;
  warningParams.forEach(w => {
    if (w.severe) {
      score -= 20;
    } else {
      score -= 10;
    }
  });

  if (isDataExpired) {
    const expiryPenalty = Math.min(20, Math.floor(daysSinceLastTest / 3) * 2);
    score -= expiryPenalty;
  }
  score = Math.max(0, Math.min(100, score));

  let level, levelLabel;
  if (score >= 85) { level = 'excellent'; levelLabel = '优秀'; }
  else if (score >= 60) { level = 'stable'; levelLabel = '稳定'; }
  else if (score >= 40) { level = 'needs_attention'; levelLabel = '需关注'; }
  else { level = 'high_risk'; levelLabel = '高风险'; }

  const causes = [];
  const suggestions = [];

  const paramNameLabels = {
    temperature: '温度', ph: 'pH', ammonia: '氨氮', nitrite: '亚硝酸盐',
    nitrate: '硝酸盐', phosphate: '磷酸盐', gh: 'GH', kh: 'KH',
    tds: 'TDS', salinity: '盐度', calcium: '钙', magnesium: '镁', alkalinity: '碱度'
  };

  warningParams.forEach(w => {
    const label = paramNameLabels[w.parameter] || w.parameter;
    if (w.status === 'too_low') {
      causes.push(`${label}偏低 (${w.value}${w.unit}，安全范围${w.min}-${w.max})`);
    } else {
      causes.push(`${label}超标 (${w.value}${w.unit}，安全范围${w.min}-${w.max})`);
    }
  });

  if (isDataExpired) {
    causes.push(`数据已过期${daysSinceLastTest}天，最近检测: ${latestParams.record_date}`);
    suggestions.push('请尽快进行水质检测以更新数据');
  }

  const lowParams = warningParams.filter(w => w.status === 'too_low').map(w => w.parameter);
  const highParams = warningParams.filter(w => w.status === 'too_high').map(w => w.parameter);

  if (highParams.includes('ammonia')) {
    suggestions.push('氨氮超标，建议立即换水并检查过滤系统');
  }
  if (highParams.includes('nitrite')) {
    suggestions.push('亚硝酸盐超标，建议换水并减少喂食');
  }
  if (highParams.includes('nitrate')) {
    suggestions.push('硝酸盐偏高，建议换水并增加水草吸收');
  }
  if (lowParams.includes('ph')) {
    suggestions.push('pH偏低，建议检查CO2供给量并适当换水');
  }
  if (highParams.includes('ph')) {
    suggestions.push('pH偏高，建议检查底床和装饰物是否释放碱性物质');
  }
  if (lowParams.includes('temperature')) {
    suggestions.push('温度偏低，建议检查加热棒是否正常工作');
  }
  if (highParams.includes('temperature')) {
    suggestions.push('温度偏高，建议检查降温设备并避免光照直射');
  }
  if (highParams.includes('phosphate')) {
    suggestions.push('磷酸盐偏高，建议减少喂食并加强换水');
  }

  if (suggestions.length === 0 && warningParams.length > 0) {
    suggestions.push('建议换水并持续观察水质变化');
  }
  if (suggestions.length === 0 && !isDataExpired) {
    suggestions.push('水质状况良好，继续保持当前养护节奏');
  }

  return {
    score,
    level,
    levelLabel,
    isDataExpired,
    daysSinceLastTest,
    warnings: warningParams,
    causes,
    suggestions,
    lastTestDate: latestParams.record_date
  };
}

router.get('/health-score/:aquariumId', (req, res) => {
  const aquarium = db.prepare('SELECT * FROM aquariums WHERE id = ?').get(req.params.aquariumId);
  if (!aquarium) {
    return res.status(404).json({ error: 'Aquarium not found' });
  }
  const latestParams = db.prepare(`
    SELECT * FROM water_parameters
    WHERE aquarium_id = ?
    ORDER BY record_date DESC
    LIMIT 1
  `).get(req.params.aquariumId);

  const healthScore = calculateHealthScore(req.params.aquariumId, aquarium.type, latestParams);
  res.json({
    aquariumId: aquarium.id,
    aquariumName: aquarium.name,
    aquariumType: aquarium.type,
    ...healthScore
  });
});

router.get('/health-ranking', (req, res) => {
  const aquariums = db.prepare('SELECT id, name, type FROM aquariums ORDER BY name').all();
  const ranking = aquariums.map(aq => {
    const latestParams = db.prepare(`
      SELECT * FROM water_parameters
      WHERE aquarium_id = ?
      ORDER BY record_date DESC
      LIMIT 1
    `).get(aq.id);
    const healthScore = calculateHealthScore(aq.id, aq.type, latestParams);
    return {
      id: aq.id,
      name: aq.name,
      type: aq.type,
      ...healthScore
    };
  });
  ranking.sort((a, b) => b.score - a.score);
  res.json(ranking);
});

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

    const healthScore = calculateHealthScore(aq.id, aq.type, latestParams);

    return {
      id: aq.id,
      name: aq.name,
      type: aq.type,
      latestParams: latestParams || null,
      creatureCount,
      lastWaterChange: lastWaterChange || null,
      healthScore
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
