const bcrypt = require('bcryptjs');
const db = require('./db');

async function seed() {
  try {
    const farmerPass = await bcrypt.hash('farmer123', 10);
    const adminPass = await bcrypt.hash('admin123', 10);

    await db.query(
      'UPDATE users SET password = ? WHERE username = ?',
      [farmerPass, 'farmer1']
    );
    await db.query(
      'UPDATE users SET password = ? WHERE username = ?',
      [adminPass, 'admin']
    );

    console.log('Passwords hashed and saved successfully');
    console.log('farmer1 password: farmer123');
    console.log('admin password: admin123');
    process.exit();
  } catch (err) {
    console.error('Seed error:', err.message);
    process.exit(1);
  }
}

seed();