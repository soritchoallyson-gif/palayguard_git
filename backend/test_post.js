const axios = require('axios');
require('dotenv').config();

async function testPost() {
  try {
    const res = await axios.post('http://localhost:3001/api/sensors/data', {
      sensor_id: 1,
      moisture: 75.5,
      temperature: 30.1,
      humidity: 80.2
    }, {
      headers: {
        'x-api-key': process.env.JWT_SECRET
      }
    });
    console.log('Success:', res.data);
  } catch (err) {
    console.error('Error:', err.response ? err.response.data : err.message);
  }
}
testPost();
