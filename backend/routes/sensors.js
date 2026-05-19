const express = require('express');
const router = express.Router();
const db = require('../db');
const { auth, adminOnly } = require('../middleware/authMiddleware');

const lastAlertTime = {
  'Low Moisture': null,
  'Critical Moisture Drop': null,
  'Overwatering Detected': null,
  'Overwatering Risk — Open Drainage': null,
  'Overwatering Risk — Prepare Drainage': null,
};

const ALERT_COOLDOWN = {
  'Low Moisture': 30 * 60 * 1000,
  'Critical Moisture Drop': 30 * 60 * 1000,
  'Overwatering Detected': 5 * 60 * 1000,
  'Overwatering Risk — Open Drainage': 60 * 60 * 1000,
  'Overwatering Risk — Prepare Drainage': 60 * 60 * 1000,
};

function shouldSendAlert(alertType) {
  const now = Date.now();
  const last = lastAlertTime[alertType];
  const cooldown = ALERT_COOLDOWN[alertType];
  if (!last || (now - last) >= cooldown) {
    lastAlertTime[alertType] = now;
    return true;
  }
  const remaining = Math.round((cooldown - (now - last)) / 60000);
  console.log('Alert cooldown active for ' + alertType + ' -- ' + remaining + ' min remaining');
  return false;
}

router.get('/readings', auth, async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT sm.*, s.device_name FROM soil_moisture sm JOIN sensors s ON sm.sensor_id = s.sensor_id ORDER BY sm.timestamp DESC LIMIT 50'
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/readings/latest', auth, async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT sm.*, s.device_name FROM soil_moisture sm JOIN sensors s ON sm.sensor_id = s.sensor_id WHERE sm.reading_id IN (SELECT MAX(reading_id) FROM soil_moisture GROUP BY sensor_id) ORDER BY s.sensor_id'
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
  try {
    const [rows] = await db.query(
      'SELECT setting_value FROM system_settings WHERE setting_key = ?',
      ['moisture_threshold']
    );
    const threshold = rows.length > 0 ? parseFloat(rows[0].setting_value) : 70;
    res.json({ threshold });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/threshold', auth, adminOnly, async (req, res) => {
  const { threshold } = req.body;
  try {
    await db.query(
      'INSERT INTO system_settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = ?, updated_at = NOW()',
      [threshold, threshold, threshold]
    );
    res.json({ message: 'Threshold updated', threshold });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Rain prediction alert endpoint
router.post('/rain-alert', auth, async (req, res) => {
  const { sensor_id, moisture, rain_probability } = req.body;
  try {
    const [sensorData] = await db.query(
      'SELECT user_id FROM sensors WHERE sensor_id = ?',
      [sensor_id]
    );
    if (sensorData.length === 0) {
      return res.status(404).json({ message: 'Sensor not found' });
    }

    let alertType = null;
    if (moisture >= 70 && rain_probability >= 70) {
      alertType = 'Overwatering Risk — Open Drainage';
    } else if (moisture >= 60 && rain_probability >= 70) {
      alertType = 'Overwatering Risk — Prepare Drainage';
    }

    if (alertType && shouldSendAlert(alertType)) {
      const timestamp = new Date();
      await db.query(
        'INSERT INTO alert_notification (sensor_id, user_id, alert_type, moisture_value, status, sent_at) VALUES (?, ?, ?, ?, ?, ?)',
        [sensor_id, sensorData[0].user_id, alertType, moisture, 'pending', timestamp]
      );
      console.log('RAIN ALERT created -- ' + alertType);
      return res.json({ message: 'Rain alert created', alertType });
    }

    res.json({ message: 'No rain alert needed or cooldown active' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/data', async (req, res) => {
  console.log('\n--- Incoming Arduino Data ---');
  console.log('Body:', req.body);
  console.log('API Key received:', req.headers['x-api-key']);

  const apiKey = req.headers['x-api-key'];
  if (apiKey !== process.env.ARDUINO_API_KEY) {
    console.log('Unauthorized API Key');
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const { moisture, temperature, humidity, sensor_id } = req.body;

  if (!sensor_id || moisture === undefined) {
    return res.status(400).json({
      message: 'Missing required fields: sensor_id, moisture',
      received: { sensor_id, moisture }
    });
  }

  if (isNaN(parseInt(sensor_id))) {
    return res.status(400).json({ message: 'sensor_id must be a number' });
  }

  const moistureNum = parseFloat(moisture);
  if (isNaN(moistureNum) || moistureNum < 0 || moistureNum > 100) {
    console.log('Invalid moisture value:', moisture);
    return res.status(400).json({
      message: 'Moisture value must be between 0 and 100',
      received: moisture
    });
  }

  let tempNum = null;
  if (temperature !== undefined && temperature !== null) {
    tempNum = parseFloat(temperature);
    if (isNaN(tempNum) || tempNum < -50 || tempNum > 60) {
      console.log('Invalid temperature:', temperature);
      return res.status(400).json({
        message: 'Temperature value must be between -50 and 60C',
        received: temperature
      });
    }
  }

  let humidityNum = null;
  if (humidity !== undefined && humidity !== null) {
    humidityNum = parseFloat(humidity);
    if (isNaN(humidityNum) || humidityNum < 0 || humidityNum > 100) {
      console.log('Invalid humidity:', humidity);
      return res.status(400).json({
        message: 'Humidity value must be between 0 and 100',
        received: humidity
      });
    }
  }

  try {
    const [sensorCheck] = await db.query(
      'SELECT sensor_id FROM sensors WHERE sensor_id = ?',
      [sensor_id]
    );
    if (sensorCheck.length === 0) {
      console.log('Sensor not found:', sensor_id);
      return res.status(404).json({ message: 'Sensor not found' });
    }

    const timestamp = new Date();

    await db.query(
      'INSERT INTO soil_moisture (sensor_id, moisture_value, temperature, humidity, timestamp) VALUES (?, ?, ?, ?, ?)',
      [sensor_id, moistureNum, tempNum, humidityNum, timestamp]
    );
    console.log('Data saved successfully');

    const [thresholdRow] = await db.query(
      'SELECT setting_value FROM system_settings WHERE setting_key = ?',
      ['moisture_threshold']
    );
    const threshold = thresholdRow.length > 0
      ? parseFloat(thresholdRow[0].setting_value)
      : 70;

    let alertType = null;
    let alertStatus = null;

    if (moistureNum > 95) {
      alertType = 'Overwatering Detected';
      alertStatus = 'warning';
    } else if (moistureNum >= 70 && moistureNum <= 95) {
      console.log('Moisture normal at ' + moistureNum + '% -- no alert needed');
    } else if (moistureNum < 40) {
      alertType = 'Critical Moisture Drop';
      alertStatus = 'critical';
    } else if (moistureNum < threshold) {
      alertType = 'Low Moisture';
      alertStatus = 'pending';
    }

    if (alertType && shouldSendAlert(alertType)) {
      const [sensorData] = await db.query(
        'SELECT user_id FROM sensors WHERE sensor_id = ?',
        [sensor_id]
      );
      if (sensorData.length > 0) {
        await db.query(
          'INSERT INTO alert_notification (sensor_id, user_id, alert_type, moisture_value, status, sent_at) VALUES (?, ?, ?, ?, ?, ?)',
          [sensor_id, sensorData[0].user_id, alertType, moistureNum, alertStatus, timestamp]
        );
        console.log('ALERT created -- ' + alertType + ' at ' + moistureNum + '%');
      }
    }

    res.json({
      message: 'Data saved successfully',
      data: {
        sensor_id,
        moisture: moistureNum,
        temperature: tempNum,
        humidity: humidityNum,
        timestamp: timestamp.toISOString()
      }
    });
  } catch (err) {
    console.error('Database error:', err.message);
    res.status(500).json({
      message: 'Server error',
      error: err.message,
      hint: 'Check backend logs for details'
    });
  }
});

module.exports = router;