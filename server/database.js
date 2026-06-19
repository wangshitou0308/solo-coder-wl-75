const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'aquarium.db');
const db = new Database(dbPath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS aquariums (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      size TEXT,
      volume REAL,
      setup_date TEXT,
      substrate TEXT,
      filter_system TEXT,
      lighting_system TEXT,
      co2_system TEXT,
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS water_parameters (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      aquarium_id INTEGER NOT NULL,
      record_date TEXT NOT NULL,
      temperature REAL,
      ph REAL,
      ammonia REAL,
      nitrite REAL,
      nitrate REAL,
      phosphate REAL,
      gh REAL,
      kh REAL,
      tds REAL,
      salinity REAL,
      calcium REAL,
      magnesium REAL,
      alkalinity REAL,
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (aquarium_id) REFERENCES aquariums(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS water_changes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      aquarium_id INTEGER NOT NULL,
      change_date TEXT NOT NULL,
      volume REAL NOT NULL,
      water_type TEXT,
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (aquarium_id) REFERENCES aquariums(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS creatures (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      aquarium_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      species TEXT,
      category TEXT NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 1,
      add_date TEXT,
      is_high_value INTEGER DEFAULT 0,
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (aquarium_id) REFERENCES aquariums(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS creature_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      creature_id INTEGER NOT NULL,
      record_type TEXT NOT NULL,
      record_date TEXT NOT NULL,
      quantity INTEGER DEFAULT 1,
      length REAL,
      description TEXT,
      photo_url TEXT,
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (creature_id) REFERENCES creatures(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS feedings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      aquarium_id INTEGER NOT NULL,
      feed_date TEXT NOT NULL,
      food_type TEXT NOT NULL,
      amount REAL,
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (aquarium_id) REFERENCES aquariums(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS diseases (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      aquarium_id INTEGER NOT NULL,
      creature_id INTEGER,
      start_date TEXT NOT NULL,
      end_date TEXT,
      diagnosis TEXT NOT NULL,
      symptoms TEXT,
      medication TEXT,
      dosage TEXT,
      result TEXT,
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (aquarium_id) REFERENCES aquariums(id) ON DELETE CASCADE,
      FOREIGN KEY (creature_id) REFERENCES creatures(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS maintenances (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      aquarium_id INTEGER NOT NULL,
      maintenance_type TEXT NOT NULL,
      maintenance_date TEXT NOT NULL,
      description TEXT,
      reminder_days INTEGER,
      next_maintenance_date TEXT,
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (aquarium_id) REFERENCES aquariums(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS parameter_ranges (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      aquarium_type TEXT NOT NULL,
      parameter_name TEXT NOT NULL,
      min_value REAL,
      max_value REAL,
      unit TEXT,
      UNIQUE(aquarium_type, parameter_name)
    );
  `);

  const ranges = [
    { type: 'freshwater_planted', param: 'temperature', min: 22, max: 28, unit: '°C' },
    { type: 'freshwater_planted', param: 'ph', min: 6.0, max: 7.5, unit: '' },
    { type: 'freshwater_planted', param: 'ammonia', min: 0, max: 0.25, unit: 'mg/L' },
    { type: 'freshwater_planted', param: 'nitrite', min: 0, max: 0.5, unit: 'mg/L' },
    { type: 'freshwater_planted', param: 'nitrate', min: 5, max: 40, unit: 'mg/L' },
    { type: 'freshwater_planted', param: 'phosphate', min: 0.1, max: 1.0, unit: 'mg/L' },
    { type: 'freshwater_planted', param: 'gh', min: 4, max: 12, unit: 'dGH' },
    { type: 'freshwater_planted', param: 'kh', min: 2, max: 8, unit: 'dKH' },
    { type: 'freshwater_planted', param: 'tds', min: 100, max: 500, unit: 'ppm' },
    { type: 'saltwater_reef', param: 'temperature', min: 24, max: 27, unit: '°C' },
    { type: 'saltwater_reef', param: 'ph', min: 8.0, max: 8.4, unit: '' },
    { type: 'saltwater_reef', param: 'ammonia', min: 0, max: 0.1, unit: 'mg/L' },
    { type: 'saltwater_reef', param: 'nitrite', min: 0, max: 0.2, unit: 'mg/L' },
    { type: 'saltwater_reef', param: 'nitrate', min: 0.1, max: 10, unit: 'mg/L' },
    { type: 'saltwater_reef', param: 'phosphate', min: 0.01, max: 0.1, unit: 'mg/L' },
    { type: 'saltwater_reef', param: 'salinity', min: 1.023, max: 1.026, unit: 'sg' },
    { type: 'saltwater_reef', param: 'calcium', min: 380, max: 450, unit: 'mg/L' },
    { type: 'saltwater_reef', param: 'magnesium', min: 1200, max: 1400, unit: 'mg/L' },
    { type: 'saltwater_reef', param: 'alkalinity', min: 7, max: 11, unit: 'dKH' },
  ];

  const insertRange = db.prepare(`
    INSERT OR IGNORE INTO parameter_ranges (aquarium_type, parameter_name, min_value, max_value, unit)
    VALUES (?, ?, ?, ?, ?)
  `);

  const insertMany = db.transaction((items) => {
    for (const item of items) {
      insertRange.run(item.type, item.param, item.min, item.max, item.unit);
    }
  });

  insertMany(ranges);
}

initDatabase();

module.exports = db;
