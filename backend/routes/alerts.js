const express = require('express');
const router = express.Router();
const db = require('../db');
const { auth, adminOnly } = require('../middleware/authMiddleware');

router.get('/', auth, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT an.*, s.device_name
       FROM alert_notification an
       JOIN sensors s ON an.sensor_id = s.sensor_id
       ORDER BY an.sent_at DESC LIMIT 100`
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin only — acknowledge
router.patch('/:id/acknowledge', auth, adminOnly, async (req, res) => {
  try {
    await db.query(
      'UPDATE alert_notification SET status = ? WHERE alert_id = ?',
      ['acknowledged', req.params.id]
    );
    res.json({ message: 'Alert acknowledged' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin only — resolve
router.patch('/:id/resolve', auth, adminOnly, async (req, res) => {
  try {
    await db.query(
      'UPDATE alert_notification SET status = ? WHERE alert_id = ?',
      ['resolved', req.params.id]
    );
    res.json({ message: 'Alert resolved' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;