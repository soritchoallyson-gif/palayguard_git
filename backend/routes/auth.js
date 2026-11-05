const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const { auth, adminOnly } = require('../middleware/authMiddleware');
require('dotenv').config();

router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const [rows] = await db.query(
      'SELECT * FROM users WHERE username = ?',
      [username]
    );
    if (rows.length === 0)
      return res.status(401).json({ message: 'Invalid credentials' });

    const user = rows[0];
    const match = await bcrypt.compare(password, user.password);
    if (!match)
      return res.status(401).json({ message: 'Invalid credentials' });

    const token = jwt.sign(
      { id: user.user_id, username: user.username, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );
    res.json({ token, role: user.role, full_name: user.full_name, user_id: user.user_id });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

router.get('/users', auth, adminOnly, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT u.user_id, u.username, u.full_name, u.role, u.contact_number, u.location,
              u.created_at, u.moisture_threshold,
              (SELECT COUNT(*) FROM sensors s WHERE s.user_id = u.user_id) AS sensor_count
       FROM users u
       ORDER BY u.created_at, u.user_id`
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/register', auth, adminOnly, async (req, res) => {
  const { username, password, full_name, role, contact_number, location } = req.body;
  try {
    const hashed = await bcrypt.hash(password, 10);
    await db.query(
      'INSERT INTO users (username, password, full_name, role, contact_number, location) VALUES (?, ?, ?, ?, ?, ?)',
      [username, hashed, full_name, role || 'farmer', contact_number, location]
    );
    res.json({ message: 'User created successfully' });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ message: 'Username already exists' });
    }
    res.status(500).json({ error: err.message });
  }
});

router.delete('/users/:id', auth, adminOnly, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ message: 'Invalid user id' });
    if (id === Number(req.user.user_id)) {
      return res.status(400).json({ message: 'You cannot delete your own account' });
    }
    const [owned] = await db.query('SELECT COUNT(*) AS c FROM sensors WHERE user_id = ?', [id]);
    if (owned[0].c > 0) {
      return res.status(400).json({
        message: `This user still owns ${owned[0].c} sensor(s). Reassign or delete those sensors first.`,
      });
    }
    await db.query('DELETE FROM push_subscriptions WHERE user_id = ?', [id]);
    await db.query('UPDATE alert_notification SET user_id = NULL WHERE user_id = ?', [id]);
    await db.query('DELETE FROM users WHERE user_id = ?', [id]);
    res.json({ message: 'User deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;