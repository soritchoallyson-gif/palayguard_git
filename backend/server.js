const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

app.use(cors());
app.use(express.json());

const authRoutes = require('./routes/auth');
const sensorRoutes = require('./routes/sensors');
const alertRoutes = require('./routes/alerts');
const pushRoutes = require('./routes/push');


app.use('/api/auth', authRoutes);
app.use('/api/sensors', sensorRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/push', pushRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'PalayGuard backend is running' });
});

const PORT = process.env.PORT || 3001;
const server = app.listen(PORT, () => {
  console.log(`PalayGuard backend running on port ${PORT}`);
});
server.on('close', () => console.log('Server closed event'));
server.on('error', (err) => console.error('Server error event', err));
process.on('exit', (code) => console.log('Process exit with code', code));