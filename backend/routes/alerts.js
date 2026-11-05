const express = require('express');
const router = express.Router();
const db = require('../db');
const { auth, adminOnly } = require('../middleware/authMiddleware');
const { sensorScope } = require('../utils/tenant');

router.get('/', auth, async (req, res) => {
  try {
    const scope = sensorScope(req);
    const [rows] = await db.query(
      `SELECT an.*, s.device_name, u.full_name AS owner_name
       FROM alert_notification an
       JOIN sensors s ON an.sensor_id = s.sensor_id
       LEFT JOIN users u ON s.user_id = u.user_id
       WHERE ${scope.clause}
       ORDER BY an.sent_at DESC LIMIT 100`,
      scope.params
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/:id/acknowledge', auth, adminOnly, async (req, res) => {
  try {
    await db.query('UPDATE alert_notification SET status = ? WHERE alert_id = ?', ['acknowledged', req.params.id]);
    res.json({ message: 'Alert acknowledged' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/:id/resolve', auth, adminOnly, async (req, res) => {
  try {
    await db.query('UPDATE alert_notification SET status = ? WHERE alert_id = ?', ['resolved', req.params.id]);
    res.json({ message: 'Alert resolved' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;