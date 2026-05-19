#include <SoftwareSerial.h>

// WiFi Settings
String ssid = "HUAWEI-5q7E";
String password = "AUG92004";
String apiKey = "TAB3RCJIA70DJQJU"; 

// Calibration Values
int dryValue = 786;
int wetValue = 545;

SoftwareSerial wifi(2, 3);

void setup() {
  Serial.begin(9600);
  wifi.begin(9600); // Using the baud rate that worked!
  
  Serial.println("System Booting...");
  sendCommand("AT+RST", 2000);
  sendCommand("AT+CWMODE=1", 1000);
  sendCommand("AT+CWJAP=\"" + ssid + "\",\"" + password + "\"", 5000);
}

void loop() {
  // 1. Read Sensor
  int rawValue = analogRead(A0);
  
  // 2. Map to Percentage (0 to 100)
  // We swap wet/dry in the map function because lower value = wetter
  int moisturePercent = map(rawValue, dryValue, wetValue, 0, 100);
  
  // Constrain to 0-100 to avoid negative numbers or >100%
  moisturePercent = constrain(moisturePercent, 0, 100);

  Serial.print("Moisture: ");
  Serial.print(moisturePercent);
  Serial.println("%");

  // 3. Send to ThingSpeak
  sendToThingSpeak(moisturePercent);
  
  // ThingSpeak free tier needs a 15-20 second delay between updates
  delay(20000); 
}

void sendToThingSpeak(int value) {
  String url = "AT+CIPSTART=\"TCP\",\"api.thingspeak.com\",80";
  sendCommand(url, 2000);
  
  String getData = "GET /update?api_key=" + apiKey + "&field1=" + String(value) + "\r\n";
  
  sendCommand("AT+CIPSEND=" + String(getData.length()), 1000);
  wifi.print(getData);
  delay(1000);
  sendCommand("AT+CIPCLOSE", 500);
}

void sendCommand(String cmd, int timeout) {
  wifi.println(cmd);
  long int time = millis();
  while ((time + timeout) > millis()) {
    while (wifi.available()) {
      Serial.write(wifi.read());
    }
  }
}
