const db = require('./db');

async function migrate() {
  try {
    console.log('Adding temperature and humidity to soil_moisture...');
    try {
      await db.query('ALTER TABLE soil_moisture ADD COLUMN temperature FLOAT');
      await db.query('ALTER TABLE soil_moisture ADD COLUMN humidity FLOAT');
    } catch (err) {
      if (err.code === 'ER_DUP_FIELDNAME') {
        console.log('Columns already exist.');
      } else {
        throw err;
      }
    }

    console.log('Clearing old mock data...');
    // We use DELETE instead of TRUNCATE in case of foreign key constraints
    await db.query('DELETE FROM alert_notification');
    await db.query('DELETE FROM soil_moisture');

    console.log('Migration and cleanup complete!');
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    process.exit();
  }
}

migrate();
