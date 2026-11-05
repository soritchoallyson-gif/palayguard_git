const express = require('express');
const router = express.Router();
const db = require('../db');
const { auth, adminOnly } = require('../middleware/authMiddleware');
const {
  sensorScope, canAccessSensor, generateDeviceKey, hashKey, safeEqualHex,
  defaultThreshold, thresholdFor, cooldownActive,
} = require('../utils/tenant');

// ───── READ DATA (every query limited to the caller's own sensors) ─────

router.get('/readings', auth, async (req, res) => {
  try {
    const scope = sensorScope(req);
    const params = [...scope.params];
    let extra = '';
    const sensorId = parseInt(req.query.sensor_id, 10);
    if (!isNaN(sensorId)) {
      extra = ' AND s.sensor_id = ?';
      params.push(sensorId);
    }
    const [rows] = await db.query(
      `SELECT sm.*, s.device_name
       FROM soil_moisture sm
       JOIN sensors s ON sm.sensor_id = s.sensor_id
       WHERE ${scope.clause}${extra}
       ORDER BY sm.timestamp DESC LIMIT 50`,
      params
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/readings/latest', auth, async (req, res) => {
  try {
    const scope = sensorScope(req);
    const [rows] = await db.query(
      `SELECT sm.*, s.device_name
       FROM soil_moisture sm
       JOIN sensors s ON sm.sensor_id = s.sensor_id
       WHERE sm.reading_id IN (SELECT MAX(reading_id) FROM soil_moisture GROUP BY sensor_id)
         AND ${scope.clause}
       ORDER BY s.sensor_id`,
      scope.params
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/sensors', auth, async (req, res) => {
  try {
    const scope = sensorScope(req);
    const [rows] = await db.query(
      `SELECT s.sensor_id, s.user_id, s.device_name, s.location_description, s.status,
              (s.api_key_hash IS NOT NULL) AS has_key,
              u.full_name AS owner_name, u.username AS owner_username,
              (SELECT MAX(sm.timestamp) FROM soil_moisture sm WHERE sm.sensor_id = s.sensor_id) AS last_reading
       FROM sensors s
       LEFT JOIN users u ON u.user_id = s.user_id
       WHERE ${scope.clause}
       ORDER BY s.sensor_id`,
      scope.params
    );
    res.json(rows.map((r) => ({ ...r, has_key: !!r.has_key })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ───── THRESHOLD (per farmer, with a system default) ─────

router.get('/threshold', auth, async (req, res) => {
  try {
    if (req.user.role === 'admin') {
      const wanted = parseInt(req.query.user_id, 10);
      if (isNaN(wanted)) return res.json({ threshold: await defaultThreshold(), custom: false });
      const t = await thresholdFor(wanted);
      return res.json({ threshold: t.value, custom: t.custom });
    }
    const t = await thresholdFor(req.user.user_id);
    res.json({ threshold: t.value, custom: t.custom });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/threshold', auth, adminOnly, async (req, res) => {
  const { threshold, user_id } = req.body;
  try {
    const hasUser = user_id !== undefined && user_id !== null && user_id !== '';
    if (hasUser) {
      const uid = parseInt(user_id, 10);
      if (isNaN(uid)) return res.status(400).json({ message: 'Invalid user_id' });
      let value = null;
      if (threshold !== null && threshold !== undefined) {
        value = parseFloat(threshold);
        if (isNaN(value) || value < 0 || value > 100) {
          return res.status(400).json({ message: 'Threshold must be between 0 and 100' });
        }
      }
      const [result] = await db.query('UPDATE users SET moisture_threshold = ? WHERE user_id = ?', [value, uid]);
      if (result.affectedRows === 0) return res.status(404).json({ message: 'User not found' });
      return res.json({ message: 'Farmer threshold updated', threshold: value });
    }

    const value = parseFloat(threshold);
    if (isNaN(value) || value < 0 || value > 100) {
      return res.status(400).json({ message: 'Threshold must be between 0 and 100' });
    }
    await db.query(
      `INSERT INTO system_settings (setting_key, setting_value) VALUES ('moisture_threshold', ?)
       ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), updated_at = NOW()`,
      [String(value)]
    );
    res.json({ message: 'Default threshold updated', threshold: value });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ───── ADMIN: manage sensors ─────

router.post('/sensors', auth, adminOnly, async (req, res) => {
  const { user_id, device_name, location_description } = req.body;
  try {
    const ownerId = parseInt(user_id, 10);
    if (isNaN(ownerId)) return res.status(400).json({ message: 'Choose which farmer owns this sensor' });
    if (!device_name || !String(device_name).trim()) {
      return res.status(400).json({ message: 'Device name is required' });
    }
    const [owner] = await db.query('SELECT user_id FROM users WHERE user_id = ?', [ownerId]);
    if (owner.length === 0) return res.status(400).json({ message: 'Owner not found' });

    const key = generateDeviceKey();
    const [result] = await db.query(
      `INSERT INTO sensors (user_id, device_name, location_description, status, api_key_hash)
       VALUES (?, ?, ?, 'active', ?)`,
      [ownerId, String(device_name).trim(), location_description || null, hashKey(key)]
    );
    res.status(201).json({ message: 'Sensor created', sensor_id: result.insertId, api_key: key });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/sensors/:id', auth, adminOnly, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ message: 'Invalid sensor id' });

    const sets = [];
    const params = [];

    if ('user_id' in req.body) {
      if (req.body.user_id === null || req.body.user_id === '') {
        sets.push('user_id = NULL');
      } else {
        const uid = parseInt(req.body.user_id, 10);
        const [owner] = await db.query('SELECT user_id FROM users WHERE user_id = ?', [uid]);
        if (isNaN(uid) || owner.length === 0) return res.status(400).json({ message: 'Owner not found' });
        sets.push('user_id = ?');
        params.push(uid);
      }
    }
    if ('device_name' in req.body) {
      if (!String(req.body.device_name || '').trim()) {
        return res.status(400).json({ message: 'Device name cannot be empty' });
      }
      sets.push('device_name = ?');
      params.push(String(req.body.device_name).trim());
    }
    if ('location_description' in req.body) {
      sets.push('location_description = ?');
      params.push(req.body.location_description || null);
    }
    if ('status' in req.body) {
      if (!['active', 'inactive'].includes(req.body.status)) {
        return res.status(400).json({ message: "Status must be 'active' or 'inactive'" });
      }
      sets.push('status = ?');
      params.push(req.body.status);
    }
    if (sets.length === 0) return res.status(400).json({ message: 'Nothing to update' });

    const [result] = await db.query(`UPDATE sensors SET ${sets.join(', ')} WHERE sensor_id = ?`, [...params, id]);
    if (result.affectedRows === 0) return res.status(404).json({ message: 'Sensor not found' });
    res.json({ message: 'Sensor updated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/sensors/:id/regenerate-key', auth, adminOnly, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ message: 'Invalid sensor id' });
    const key = generateDeviceKey();
    const [result] = await db.query('UPDATE sensors SET api_key_hash = ? WHERE sensor_id = ?', [hashKey(key), id]);
    if (result.affectedRows === 0) return res.status(404).json({ message: 'Sensor not found' });
    res.json({ message: 'New key generated. The old key no longer works.', sensor_id: id, api_key: key });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/sensors/:id', auth, adminOnly, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ message: 'Invalid sensor id' });
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query('DELETE FROM soil_moisture WHERE sensor_id = ?', [id]);
    await conn.query('DELETE FROM alert_notification WHERE sensor_id = ?', [id]);
    const [result] = await conn.query('DELETE FROM sensors WHERE sensor_id = ?', [id]);
    await conn.commit();
    if (result.affectedRows === 0) return res.status(404).json({ message: 'Sensor not found' });
    res.json({ message: 'Sensor and its readings deleted' });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ error: err.message });
  } finally {
    conn.release();
  }
});

// ───── RAIN ALERT (called by the dashboard) ─────

router.post('/rain-alert', auth, async (req, res) => {
  try {
    const sensorId = parseInt(req.body.sensor_id, 10);
    const rainProb = parseFloat(req.body.rain_probability);
    if (isNaN(sensorId) || isNaN(rainProb)) {
      return res.status(400).json({ message: 'sensor_id and rain_probability are required' });
    }

    const [sensors] = await db.query('SELECT sensor_id, user_id FROM sensors WHERE sensor_id = ?', [sensorId]);
    if (sensors.length === 0 || !canAccessSensor(req, sensors[0])) {
      return res.status(404).json({ message: 'Sensor not found' });
    }

    const [latest] = await db.query(
      'SELECT moisture_value FROM soil_moisture WHERE sensor_id = ? ORDER BY timestamp DESC LIMIT 1',
      [sensorId]
    );
    if (latest.length === 0) return res.json({ message: 'No readings yet for this sensor' });
    const moisture = latest[0].moisture_value;

    let alertType = null;
    if (moisture >= 70 && rainProb >= 70) alertType = 'Overwatering Risk — Open Drainage';
    else if (moisture >= 60 && rainProb >= 70) alertType = 'Overwatering Risk — Prepare Drainage';

    if (alertType && !(await cooldownActive(sensorId, alertType))) {
      await db.query(
        'INSERT INTO alert_notification (sensor_id, user_id, alert_type, moisture_value, status, sent_at) VALUES (?, ?, ?, ?, ?, ?)',
        [sensorId, sensors[0].user_id, alertType, moisture, 'pending', new Date()]
      );
      return res.json({ message: 'Rain alert created', alertType });
    }
    res.json({ message: 'No rain alert needed or cooldown active' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ───── DEVICE ENDPOINT (the Arduino posts here) ─────

router.post('/data', async (req, res) => {
  const apiKey = req.headers['x-api-key'];
  if (!apiKey) return res.status(401).json({ message: 'Unauthorized' });

  const { moisture, temperature, humidity, sensor_id } = req.body;

  if (!sensor_id || moisture === undefined) {
    return res.status(400).json({
      message: 'Missing required fields: sensor_id, moisture',
      received: { sensor_id, moisture },
    });
  }
  const sensorIdNum = parseInt(sensor_id, 10);
  if (isNaN(sensorIdNum)) return res.status(400).json({ message: 'sensor_id must be a number' });

  const moistureNum = parseFloat(moisture);
  if (isNaN(moistureNum) || moistureNum < 0 || moistureNum > 100) {
    return res.status(400).json({ message: 'Moisture value must be between 0 and 100', received: moisture });
  }

  let tempNum = null;
  if (temperature !== undefined && temperature !== null) {
    tempNum = parseFloat(temperature);
    if (isNaN(tempNum) || tempNum < -50 || tempNum > 60) {
      return res.status(400).json({ message: 'Temperature value must be between -50 and 60C', received: temperature });
    }
  }

  let humidityNum = null;
  if (humidity !== undefined && humidity !== null) {
    humidityNum = parseFloat(humidity);
    if (isNaN(humidityNum) || humidityNum < 0 || humidityNum > 100) {
      return res.status(400).json({ message: 'Humidity value must be between 0 and 100', received: humidity });
    }
  }

  try {
    const [rows] = await db.query(
      'SELECT sensor_id, user_id, status, api_key_hash FROM sensors WHERE sensor_id = ?',
      [sensorIdNum]
    );
    const sensor = rows[0];

    // A sensor with its own key must use it. A sensor without one still accepts the
    // old shared ARDUINO_API_KEY (set ALLOW_LEGACY_DEVICE_KEY=false to turn that off).
    const legacyOk =
      process.env.ALLOW_LEGACY_DEVICE_KEY !== 'false' &&
      !!process.env.ARDUINO_API_KEY &&
      apiKey === process.env.ARDUINO_API_KEY;

    let authorized;
    if (sensor && sensor.api_key_hash) authorized = safeEqualHex(sensor.api_key_hash, hashKey(apiKey));
    else authorized = legacyOk;

    if (!authorized) return res.status(401).json({ message: 'Unauthorized' });
    if (!sensor) return res.status(404).json({ message: 'Sensor not found' });
    if (sensor.status === 'inactive') return res.status(403).json({ message: 'Sensor is disabled' });

    const timestamp = new Date();
    await db.query(
      'INSERT INTO soil_moisture (sensor_id, moisture_value, temperature, humidity, timestamp) VALUES (?, ?, ?, ?, ?)',
      [sensor.sensor_id, moistureNum, tempNum, humidityNum, timestamp]
    );

    try {
      const threshold = (await thresholdFor(sensor.user_id)).value;

      let alertType = null;
      let alertStatus = null;
      if (moistureNum > 95) {
        alertType = 'Overwatering Detected';
        alertStatus = 'pending';
      } else if (moistureNum < 40) {
        alertType = 'Critical Moisture Drop';
        alertStatus = 'critical';
      } else if (moistureNum < threshold) {
        alertType = 'Low Moisture';
        alertStatus = 'pending';
      }

      if (alertType && !(await cooldownActive(sensor.sensor_id, alertType))) {
        await db.query(
          'INSERT INTO alert_notification (sensor_id, user_id, alert_type, moisture_value, status, sent_at) VALUES (?, ?, ?, ?, ?, ?)',
          [sensor.sensor_id, sensor.user_id, alertType, moistureNum, alertStatus, timestamp]
        );
      }
    } catch (alertErr) {
      console.error('Alert creation failed (reading was saved):', alertErr.message);
    }

    res.json({
      message: 'Data saved successfully',
      data: {
        sensor_id: sensor.sensor_id,
        moisture: moistureNum,
        temperature: tempNum,
        humidity: humidityNum,
        timestamp: timestamp.toISOString(),
      },
    });
  } catch (err) {
    console.error('Database error:', err.message);
    res.status(500).json({ message: 'Server error', error: err.message, hint: 'Check backend logs for details' });
  }
});

module.exports = router;