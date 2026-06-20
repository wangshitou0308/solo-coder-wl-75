const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

require('./database');

app.use(cors());
app.use(morgan('dev'));
app.use(express.json());

const aquariumRoutes = require('./routes/aquariums');
const waterParamRoutes = require('./routes/waterParams');
const waterChangeRoutes = require('./routes/waterChanges');
const creatureRoutes = require('./routes/creatures');
const feedingRoutes = require('./routes/feedings');
const diseaseRoutes = require('./routes/diseases');
const maintenanceRoutes = require('./routes/maintenances');
const statsRoutes = require('./routes/stats');
const careTaskRoutes = require('./routes/careTasks');
const inventoryRoutes = require('./routes/inventory');

app.use('/api/aquariums', aquariumRoutes);
app.use('/api/water-params', waterParamRoutes);
app.use('/api/water-changes', waterChangeRoutes);
app.use('/api/creatures', creatureRoutes);
app.use('/api/feedings', feedingRoutes);
app.use('/api/diseases', diseaseRoutes);
app.use('/api/maintenances', maintenanceRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/care-tasks', careTaskRoutes);
app.use('/api/inventory', inventoryRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Aquarium Management API is running' });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

module.exports = app;
