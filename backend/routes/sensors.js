const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/authMiddleware');

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

router.post('/threshold', auth, async (req, res) => {
  const { threshold } = req.body;
  process.env.MOISTURE_THRESHOLD = threshold;
  res.json({ message: 'Threshold updated', threshold });
});

module.exports = router;