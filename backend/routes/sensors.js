const express = require('express');
const router = express.Router();
const db = require('../db');
const { auth, adminOnly } = require('../middleware/authMiddleware');

router.get('/readings', auth, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT sm.*, s.device_name
       FROM soil_moisture sm
       JOIN sensors s ON sm.sensor_id = s.sensor_id
       ORDER BY sm.timestamp DESC LIMIT 50`
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/readings/latest', auth, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT sm.*, s.device_name
       FROM soil_moisture sm
       JOIN sensors s ON sm.sensor_id = s.sensor_id
       WHERE sm.reading_id IN (
         SELECT MAX(reading_id)
         FROM soil_moisture
         GROUP BY sensor_id
       )
       ORDER BY s.sensor_id`
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/sensors', auth, async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM sensors');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/threshold', auth, async (req, res) => {
  res.json({ threshold: parseFloat(process.env.MOISTURE_THRESHOLD) });
});

// Admin only — update threshold
router.post('/threshold', auth, adminOnly, async (req, res) => {
  const { threshold } = req.body;
  process.env.MOISTURE_THRESHOLD = threshold;
  res.json({ message: 'Threshold updated', threshold });
});

// Arduino direct POST endpoint — no JWT needed, uses x-api-key header
router.post('/data', async (req, res) => {
  const apiKey = req.headers['x-api-key'];
  if (apiKey !== process.env.JWT_SECRET) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const { moisture, temperature, humidity, sensor_id } = req.body;
  try {
    await db.query(
      'INSERT INTO soil_moisture (sensor_id, moisture_value, temperature, humidity) VALUES (?, ?, ?, ?)',
      [sensor_id, moisture, temperature || null, humidity || null]
    );

    const threshold = parseFloat(process.env.MOISTURE_THRESHOLD || 40);
    if (moisture < threshold) {
      const [sensor] = await db.query(
        'SELECT user_id FROM sensors WHERE sensor_id = ?',
        [sensor_id]
      );
      if (sensor.length > 0) {
        const alertType = moisture < 20 ? 'Critical Moisture Drop' : 'Low Moisture';
        const alertStatus = moisture < 20 ? 'critical' : 'pending';
        await db.query(
          `INSERT INTO alert_notification 
           (sensor_id, user_id, alert_type, moisture_value, status)
           VALUES (?, ?, ?, ?, ?)`,
          [sensor_id, sensor[0].user_id, alertType, moisture, alertStatus]
        );
        if (global.sendPushToAll) {
          await global.sendPushToAll({
            title: 'PalayGuard Alert 🌾',
            body: `Moisture is at ${moisture}%. Time to irrigate!`,
          });
        }
      }
    }
    res.json({ message: 'Data saved', moisture });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;