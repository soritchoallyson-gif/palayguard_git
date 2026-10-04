SELECT COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_NAME = 'soil_moisture' AND TABLE_SCHEMA = 'palayguard';


ALTER TABLE soil_moisture 
ADD COLUMN IF NOT EXISTS temperature FLOAT,
ADD COLUMN IF NOT EXISTS humidity FLOAT;


CREATE INDEX IF NOT EXISTS idx_sensor_timestamp 
ON soil_moisture(sensor_id, timestamp DESC);

-- Verify changes
SELECT COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_NAME = 'soil_moisture' AND TABLE_SCHEMA = 'palayguard';

-- Verify indexes
SHOW INDEX FROM soil_moisture;

-- Test query (should work without errors now)
SELECT sm.*, s.device_name
FROM soil_moisture sm
JOIN sensors s ON sm.sensor_id = s.sensor_id
ORDER BY sm.timestamp DESC LIMIT 10;

-- Success message
SELECT 'Migration completed successfully!' as status;
