const db = require('./db');

async function check() {
  try {
    const [rows] = await db.query('SELECT * FROM soil_moisture ORDER BY timestamp DESC LIMIT 5');
    console.log('Recent soil_moisture rows:', rows);
    
    const [sensors] = await db.query('SELECT * FROM sensors');
    console.log('Sensors:', sensors);

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
check();
