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
  console.log('\n--- Incoming Arduino Data ---');
  console.log('Body:', req.body);
  console.log('API Key received:', req.headers['x-api-key']);

  const apiKey = req.headers['x-api-key'];
  if (apiKey !== process.env.ARDUINO_API_KEY) {
    console.log('❌ Unauthorized API Key');
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const { moisture, temperature, humidity, sensor_id } = req.body;

  // ===== VALIDATION =====
  // Validate required fields
  if (!sensor_id || moisture === undefined) {
    return res.status(400).json({ 
      message: 'Missing required fields: sensor_id, moisture',
      received: { sensor_id, moisture }
    });
  }

  // Validate sensor_id is a number
  if (isNaN(parseInt(sensor_id))) {
    return res.status(400).json({ message: 'sensor_id must be a number' });
  }

  // Validate moisture value is realistic (0-100%)
  const moistureNum = parseFloat(moisture);
  if (isNaN(moistureNum) || moistureNum < 0 || moistureNum > 100) {
    console.log('❌ Invalid moisture value:', moisture);
    return res.status(400).json({ 
      message: 'Moisture value must be between 0 and 100',
      received: moisture
    });
  }

  // Validate temperature if provided
  let tempNum = null;
  if (temperature !== undefined && temperature !== null) {
    tempNum = parseFloat(temperature);
    if (isNaN(tempNum) || tempNum < -50 || tempNum > 60) {
      console.log('❌ Invalid temperature:', temperature);
      return res.status(400).json({ 
        message: 'Temperature value must be between -50 and 60°C',
        received: temperature
      });
    }
  }

  // Validate humidity if provided
  let humidityNum = null;
  if (humidity !== undefined && humidity !== null) {
    humidityNum = parseFloat(humidity);
    if (isNaN(humidityNum) || humidityNum < 0 || humidityNum > 100) {
      console.log('❌ Invalid humidity:', humidity);
      return res.status(400).json({ 
        message: 'Humidity value must be between 0 and 100',
        received: humidity
      });
    }
  }

  try {
    // Check if sensor exists
    const [sensorCheck] = await db.query(
      'SELECT sensor_id FROM sensors WHERE sensor_id = ?',
      [sensor_id]
    );
    if (sensorCheck.length === 0) {
      console.log('❌ Sensor not found:', sensor_id);
      return res.status(404).json({ message: 'Sensor not found' });
    }

    await db.query(
      'INSERT INTO soil_moisture (sensor_id, moisture_value, temperature, humidity) VALUES (?, ?, ?, ?)',
      [sensor_id, moistureNum, tempNum, humidityNum]
    );
    console.log('✅ Data saved successfully');

    const threshold = parseFloat(process.env.MOISTURE_THRESHOLD || 40);
    if (moistureNum < threshold) {
      const [sensorData] = await db.query(
        'SELECT user_id FROM sensors WHERE sensor_id = ?',
        [sensor_id]
      );
      if (sensorData.length > 0) {
        const alertType = moistureNum < 20 ? 'Critical Moisture Drop' : 'Low Moisture';
        const alertStatus = moistureNum < 20 ? 'critical' : 'pending';
        await db.query(
          `INSERT INTO alert_notification 
           (sensor_id, user_id, alert_type, moisture_value, status)
           VALUES (?, ?, ?, ?, ?)`,
          [sensor_id, sensorData[0].user_id, alertType, moistureNum, alertStatus]
        );
        if (global.sendPushToAll) {
          await global.sendPushToAll({
            title: 'PalayGuard Alert 🌾',
            body: `Sensor ${sensor_id}: Moisture at ${moistureNum}%. Time to irrigate!`,
          });
        }
      }
    }
    res.json({ 
      message: 'Data saved successfully',
      data: {
        sensor_id,
        moisture: moistureNum,
        temperature: tempNum,
        humidity: humidityNum,
        timestamp: new Date().toISOString()
      }
    });
  } catch (err) {
    console.error('❌ Database error:', err.message);
    res.status(500).json({ 
      message: 'Server error',
      error: err.message,
      hint: 'Check backend logs for details'
    });
  }
});

module.exports = router;